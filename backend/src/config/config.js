import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

/**
 * Every setting for the whole stack lives in ONE file at the project root.
 * `npm run dev` already injects it through dotenv-cli, but loading it again
 * here (without overriding) means `node src/index.js` works on its own too.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env"), override: false });

/**
 * FRONTEND_ORIGIN is pasted by hand, so it arrives with a trailing slash often
 * enough to break things: a trailing slash turns every built link into
 * "origin//path", which no SPA route matches. Normalize once, here.
 */
const normalizeOrigin = (value) => {
  if (!value) return value;
  return value.trim().replace(/\/+$/, "");
};

const config = {
  /* ---------- Branding (single source of truth for the product name) ---------- */
  appName: process.env.APP_NAME || "Easy Restaurant",
  appTagline: process.env.APP_TAGLINE || "Restaurant Point of Sale",
  currency: process.env.APP_CURRENCY || "Rs",
  appPhone: process.env.APP_PHONE || "",
  appAddress: process.env.APP_ADDRESS || "",
  appFooterNote: process.env.APP_FOOTER_NOTE || "",

  /* ---------- Server ---------- */
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "development",
  frontendOrigin: normalizeOrigin(process.env.FRONTEND_ORIGIN),

  /* ---------- Database ---------- */
  databaseName: process.env.DATABASE_NAME,
  databaseUser: process.env.DATABASE_USER,
  databasePassword: process.env.DATABASE_PASSWORD,
  databaseHost: process.env.DATABASE_HOST,
  databasePort: process.env.DATABASE_PORT,

  /* ---------- Auth ---------- */
  authJwtSecretKey: process.env.AUTH_JWT_SECRET_KEY,
  authJwtExpiresIn: process.env.AUTH_JWT_EXPIRES_IN || "30d",

  /* ---------- Backups ---------- */
  enableBackups: process.env.ENABLE_BACKUPS !== "false",
  backupDir: process.env.BACKUP_DIR || "",
  backupIntervalDays: Number(process.env.BACKUP_INTERVAL_DAYS) || 7,
  backupKeep: Number(process.env.BACKUP_KEEP) || 8,
  /** Windows installs of Postgres do not put pg_dump on PATH. */
  pgDumpPath: process.env.PG_DUMP_PATH || "",

  /* ---------- Seed defaults ---------- */
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || "admin@easyrestaurant.com",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
};

export default Object.freeze(config);
