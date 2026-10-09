import * as yup from "yup";

export const settingsSchema = yup.object({
  taxPercent: yup.number().min(0).max(100),
  serviceChargePercent: yup.number().min(0).max(100),
  defaultCommissionPercent: yup.number().min(0).max(100),
  printTokenOnSave: yup.boolean(),

  /* ---------- Receipt layout ---------- */
  receiptWidth: yup.string().oneOf(["58mm", "80mm", "A4"]),
  receiptHeaderText: yup.string().trim().nullable(),
  receiptFooter: yup.string().trim().nullable(),
  showAddressOnReceipt: yup.boolean(),
  showPhoneOnReceipt: yup.boolean(),
  showWaiterOnReceipt: yup.boolean(),
  showGuestsOnReceipt: yup.boolean(),
  showRateColumn: yup.boolean(),
  showTaxOnReceipt: yup.boolean(),
  showFooterNote: yup.boolean(),
  showPrintedAt: yup.boolean(),
  receiptFontScale: yup.string().oneOf(["compact", "normal", "large"]),
  receiptCopies: yup.number().integer().min(1).max(3),
  receiptFeedLines: yup.number().integer().min(0).max(10),
  silentPrint: yup.boolean(),
  receiptPrinterName: yup.string().trim().nullable(),
  kitchenPrinterName: yup.string().trim().nullable(),
});
