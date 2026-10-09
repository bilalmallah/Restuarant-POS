/**
 * ---------- Creating database ----------
 */
import "./createDatabase.js";

/**
 * ---------- Creating tables ----------
 */
await import("./createDatabaseTables.js");

/**
 * ---------- Seeding starter data ----------
 */
await import("./seedTables.js");

process.exit(0);
