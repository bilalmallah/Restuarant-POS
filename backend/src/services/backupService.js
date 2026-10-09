import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";
import createError from "http-errors";

import config from "../config/config.js";
import { toDateOnly } from "../utils/helperFunctions.js";

const run = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Weekly database backups.
 *
 * A restaurant's POS database is the only record of what was sold, who owes
 * what and what the staff are due. There is no second copy anywhere - so this
 * writes a real pg_dump to disk on a schedule and keeps the last several.
 *
 * Deliberately dependency-free: a cron library plus a job store is a lot of
 * machinery for "once a week". Instead the server checks the clock every hour
 * and compares it against the timestamp of the newest file already on disk,
 * which means a machine that was switched off over the weekend still catches up
 * the moment it comes back, and two restarts in a day cannot produce two dumps.
 */

const BACKUP_DIR = config.backupDir
  ? path.resolve(config.backupDir)
  : path.resolve(__dirname, "../../../backups");

/**
 * pg_dump is not on PATH on a default Windows install of Postgres, so look in
 * the usual place and take the highest version installed - a newer pg_dump can
 * always dump an older server, not the other way round.
 */
const findPgDump = () => {
  if (config.pgDumpPath) return config.pgDumpPath;

  const roots = [
    "C:\\Program Files\\PostgreSQL",
    "C:\\Program Files (x86)\\PostgreSQL",
  ];

  for (const root of roots) {
    if (!fsSync.existsSync(root)) continue;

    const versions = fsSync
      .readdirSync(root)
      .filter((name) => /^\d+$/.test(name))
      .sort((a, b) => Number(b) - Number(a));

    for (const version of versions) {
      const candidate = path.join(root, version, "bin", "pg_dump.exe");
      if (fsSync.existsSync(candidate)) return candidate;
    }
  }

  // On Linux/macOS it is normally just on PATH.
  return "pg_dump";
};

const ensureDir = async () => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  return BACKUP_DIR;
};

/** Newest first, so [0] is the most recent backup. */
export const listBackups = async () => {
  await ensureDir();

  const names = await fs.readdir(BACKUP_DIR);
  const files = [];

  for (const name of names) {
    if (!name.endsWith(".dump")) continue;

    const stat = await fs.stat(path.join(BACKUP_DIR, name));
    files.push({
      name,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    });
  }

  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/**
 * Deletes the oldest files once there are more than `backupKeep`. Keeping every
 * dump forever fills the disk of the very machine the till runs on.
 */
const prune = async () => {
  const files = await listBackups();
  const doomed = files.slice(config.backupKeep);

  for (const file of doomed) {
    await fs.rm(path.join(BACKUP_DIR, file.name), { force: true });
  }

  return doomed.map((file) => file.name);
};

export const runBackup = async ({ reason = "manual" } = {}) => {
  const dir = await ensureDir();
  const stamp = `${toDateOnly()}-${String(Date.now()).slice(-6)}`;
  const file = path.join(dir, `${config.databaseName}-${stamp}.dump`);
  const pgDump = findPgDump();

  try {
    await run(
      pgDump,
      [
        "--host", String(config.databaseHost),
        "--port", String(config.databasePort),
        "--username", String(config.databaseUser),
        "--dbname", String(config.databaseName),
        // Custom format: compressed, and restorable with pg_restore.
        "--format", "custom",
        "--file", file,
        "--no-owner",
        "--no-privileges",
      ],
      {
        windowsHide: true,
        timeout: 10 * 60 * 1000,
        maxBuffer: 8 * 1024 * 1024,
        // pg_dump has no password flag; this is the supported way to pass one.
        env: { ...process.env, PGPASSWORD: config.databasePassword ?? "" },
      }
    );
  } catch (error) {
    // A half-written dump is worse than none - it would look like a good backup.
    await fs.rm(file, { force: true }).catch(() => {});

    const detail = (error.stderr || error.message || "").trim().split("\n")[0];
    throw createError(
      500,
      detail.includes("ENOENT")
        ? `Could not find pg_dump. Set PG_DUMP_PATH in .env to its full path.`
        : `Backup failed: ${detail}`
    );
  }

  const stat = await fs.stat(file);
  const pruned = await prune();

  console.log(`Backup written (${reason}): ${path.basename(file)} - ${Math.round(stat.size / 1024)} KB`);
  if (pruned.length) console.log(`  pruned ${pruned.length} old backup(s)`);

  return {
    name: path.basename(file),
    sizeBytes: stat.size,
    createdAt: stat.mtime.toISOString(),
    pruned,
  };
};

/**
 * Due when there is no backup yet, or the newest one is older than the interval.
 * Reading the answer off the files themselves means no state to keep in sync.
 */
export const backupStatus = async () => {
  const files = await listBackups();
  const latest = files[0] ?? null;
  const intervalMs = config.backupIntervalDays * 24 * 60 * 60 * 1000;

  const dueAt = latest
    ? new Date(new Date(latest.createdAt).getTime() + intervalMs).toISOString()
    : null;

  return {
    enabled: config.enableBackups,
    directory: BACKUP_DIR,
    intervalDays: config.backupIntervalDays,
    keep: config.backupKeep,
    pgDump: findPgDump(),
    latest,
    count: files.length,
    dueAt,
    overdue: !latest || Date.now() - new Date(latest.createdAt).getTime() >= intervalMs,
  };
};

export const startBackupScheduler = async () => {
  if (!config.enableBackups) {
    console.log("Automatic backups disabled (set ENABLE_BACKUPS=true to turn them on)");
    return;
  }

  const tick = async () => {
    try {
      const status = await backupStatus();
      if (status.overdue) await runBackup({ reason: "scheduled" });
    } catch (error) {
      // Never let a failed backup take the till down with it.
      console.error("Scheduled backup failed:", error.message);
    }
  };

  const status = await backupStatus();
  console.log(
    `Automatic backups on: every ${status.intervalDays} day(s), keeping ${status.keep}, in ${status.directory}`
  );

  // Check hourly rather than sleeping a week, so a machine that was switched
  // off catches up on its own as soon as it is turned back on.
  await tick();
  setInterval(tick, 60 * 60 * 1000);
};

export { BACKUP_DIR };
