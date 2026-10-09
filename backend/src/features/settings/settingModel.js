import { DataTypes } from "sequelize";
import { sequelize } from "../../config/connectDb.js";

/**
 * A single-row key/value store for things the owner changes from inside the
 * app (tax rate, house commission, receipt footer). Branding such as the
 * restaurant name stays in the root .env so it can be changed in one place
 * before the app is ever started.
 */
const Setting = sequelize.define(
  "Setting",
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "settings", timestamps: true }
);

export const SETTING_DEFAULTS = {
  taxPercent: "0",
  serviceChargePercent: "0",
  defaultCommissionPercent: "0",
  printTokenOnSave: "true",

  /* ---------- Receipt layout ----------
   * Everything a restaurant tends to want different on its own slip. Stored as
   * strings like the rest of the settings table; the frontend turns them into a
   * typed options object in one place (utils/receiptOptions.ts).
   */
  receiptWidth: "80mm",
  receiptHeaderText: "",
  receiptFooter: "",
  showAddressOnReceipt: "true",
  showPhoneOnReceipt: "true",
  showWaiterOnReceipt: "true",
  showGuestsOnReceipt: "true",
  showRateColumn: "true",
  showTaxOnReceipt: "false",
  showFooterNote: "true",
  showPrintedAt: "true",
  receiptFontScale: "normal",
  receiptCopies: "1",
  receiptFeedLines: "3",

  /**
   * Silent printing. With this on, bills and tokens go straight from the API to
   * a named Windows printer and the browser dialog never opens. Off, the
   * browser prints as normal.
   */
  silentPrint: "false",
  receiptPrinterName: "",
  kitchenPrinterName: "",
};

export default Setting;
