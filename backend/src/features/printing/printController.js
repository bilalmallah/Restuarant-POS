import createError from "http-errors";
import { asyncHandler } from "../../utils/helperFunctions.js";
import { listPrinters, printText, printingSupported } from "../../services/printService.js";
import { getSettings } from "../../services/settingsService.js";

/**
 * The Settings screen needs to know what is actually attached to this machine,
 * and whether direct printing is possible at all.
 */
export const getPrinters = asyncHandler(async (_req, res) => {
  if (!printingSupported()) {
    return res.status(200).json({
      supported: false,
      reason: `Direct printing needs the API to run on Windows (this one is on ${process.platform}).`,
      printers: [],
    });
  }

  const printers = await listPrinters();
  res.status(200).json({ supported: true, reason: null, printers });
});

/**
 * Prints text the browser has already laid out. The browser owns the layout
 * because it owns the receipt design; this end owns the hardware.
 */
export const print = asyncHandler(async (req, res, next) => {
  const settings = await getSettings();
  const { target, printerName, text, label } = req.body;

  const configured =
    target === "kitchen" ? settings.kitchenPrinterName : settings.receiptPrinterName;

  const chosen = printerName || configured || "";

  if (!chosen) {
    return next(
      createError(
        400,
        target === "kitchen"
          ? "No kitchen printer chosen yet. Set one in Settings."
          : "No receipt printer chosen yet. Set one in Settings."
      )
    );
  }

  const result = await printText(chosen, text);

  res.status(200).json({
    message: `${label || "Document"} sent to ${result.printer}`,
    ...result,
  });
});
