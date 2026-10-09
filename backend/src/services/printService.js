import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import createError from "http-errors";

const run = promisify(execFile);

/**
 * Silent printing.
 *
 * A browser cannot print without showing its dialog - that is a deliberate
 * security rule, not an oversight. But the API runs on the same Windows machine
 * as the till and its printers, so the receipt is sent from HERE instead: the
 * browser posts the already-formatted text, and the server hands it straight to
 * a named printer. No dialog, no popup blocker, and a real error when the
 * printer is off.
 *
 * Text, not PDF, on purpose: a thermal roll is a fixed-width character device,
 * the receipt is already laid out in a monospace grid, and rendering HTML to
 * PDF server-side would mean shipping a headless browser to every restaurant.
 */

const isWindows = process.platform === "win32";

const powershell = async (script) => {
  if (!isWindows) {
    throw createError(
      501,
      "Direct printing is only wired up for Windows. Turn silent printing off to use the browser print dialog."
    );
  }

  try {
    const { stdout } = await run(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, timeout: 20_000, maxBuffer: 1024 * 1024 }
    );

    return stdout;
  } catch (error) {
    // A non-zero exit from PowerShell is almost always a real printing problem
    // (no such printer, spooler stopped), so surface its message as-is.
    const message = (error.stderr || error.message || "").trim().split("\n")[0];
    throw createError(502, message || "The printer command failed");
  }
};

/**
 * States that mean "this printer can take a job right now". Anything else -
 * paper out, door open, offline - should stop a receipt being sent into the
 * void.
 *
 * Matched on the status NAME, not its number: Get-Printer's enum is not the WMI
 * one (here "Normal" is 0, while WMI calls 3 "Idle"), and comparing against the
 * wrong numbering reported every healthy printer as busy.
 */
const HEALTHY_STATUSES = new Set([
  "Normal",
  "Idle",
  "IOActive",
  "Printing",
  "Busy",
  "Waiting",
  "Processing",
  "WarmingUp",
  "PowerSave",
  "Paused",
]);

/** Every printer Windows knows about, with enough state to spot a dead one. */
export const listPrinters = async () => {
  const stdout = await powershell(
    "Get-Printer | Select-Object Name,DriverName,PortName,WorkOffline," +
      "@{n='Status';e={$_.PrinterStatus.ToString()}} | ConvertTo-Json -Compress"
  );

  const trimmed = stdout.trim();
  if (!trimmed) return [];

  const parsed = JSON.parse(trimmed);
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return rows.map((row) => {
    const healthy = HEALTHY_STATUSES.has(row.Status);
    const offline = Boolean(row.WorkOffline) || !healthy;

    return {
      name: row.Name,
      driver: row.DriverName ?? null,
      port: row.PortName ?? null,
      statusName: row.Status ?? "Unknown",
      status: offline ? "offline" : "ready",
      offline,
    };
  });
};

/**
 * Fails loudly rather than letting Windows silently queue a job for a printer
 * that is switched off - a receipt the customer never gets is worse than an
 * error on screen.
 */
const assertPrinterUsable = async (printerName) => {
  const printers = await listPrinters();
  const printer = printers.find((row) => row.name === printerName);

  if (!printer) {
    throw createError(
      404,
      `Printer "${printerName}" is not installed on this computer. Pick another one in Settings.`
    );
  }

  if (printer.offline) {
    throw createError(
      503,
      `Printer "${printerName}" is not ready (Windows reports "${printer.statusName}"). ` +
        "Check that it is switched on, has paper, and is connected."
    );
  }

  return printer;
};

/**
 * Sends plain text to a named printer.
 *
 * Out-Printer goes through the installed Windows driver, so an 80mm thermal
 * printer set up the normal way needs no extra configuration here.
 */
export const printText = async (printerName, text) => {
  if (!printerName) {
    throw createError(400, "No printer chosen. Pick one in Settings before printing.");
  }

  await assertPrinterUsable(printerName);

  const file = path.join(
    os.tmpdir(),
    `easy-restaurant-${crypto.randomBytes(6).toString("hex")}.txt`
  );

  // Trailing newlines push the cut line clear of the last row of text.
  await fs.writeFile(file, `${text}\n\n\n`, "utf8");

  try {
    await powershell(
      `Get-Content -Raw -LiteralPath '${file.replace(/'/g, "''")}' | ` +
        `Out-Printer -Name '${printerName.replace(/'/g, "''")}'`
    );
  } finally {
    await fs.rm(file, { force: true }).catch(() => {});
  }

  return { printer: printerName, characters: text.length };
};

export const printingSupported = () => isWindows;
