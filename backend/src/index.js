/**
 * ---------- Imports ----------
 */
import config from "./config/config.js";
import app from "./app.js";
import { startBackupScheduler } from "./services/backupService.js";

/**
 * ---------- Connect database ----------
 */
import "./config/connectDb.js";

/**
 * ---------- Start server ----------
 */
const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`${config.appName} API listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);

  // Fires immediately if a backup is overdue, then checks hourly.
  startBackupScheduler();
});
