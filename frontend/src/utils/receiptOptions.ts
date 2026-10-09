import type { AppSettings } from "../types";

/**
 * Receipt layout, in one typed shape.
 *
 * Settings come out of the database as strings ("true", "80mm", "2"), and both
 * receipt renderers - the on-screen HTML one and the plain-text one for thermal
 * printing - need the same answers. Parsing them in one place is what keeps the
 * preview in Settings honest: what it shows is what the printer gets.
 */
export type ReceiptOptions = {
  width: string;
  headerText: string;
  footerText: string;
  showAddress: boolean;
  showPhone: boolean;
  showWaiter: boolean;
  showGuests: boolean;
  showRate: boolean;
  showTax: boolean;
  showFooterNote: boolean;
  showPrintedAt: boolean;
  fontScale: "compact" | "normal" | "large";
  copies: number;
  feedLines: number;
};

const bool = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === "" ? fallback : value === "true";

const int = (value: string | undefined, fallback: number, min: number, max: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
};

export const DEFAULT_RECEIPT_OPTIONS: ReceiptOptions = {
  width: "80mm",
  headerText: "",
  footerText: "",
  showAddress: true,
  showPhone: true,
  showWaiter: true,
  showGuests: true,
  showRate: true,
  showTax: false,
  showFooterNote: true,
  showPrintedAt: true,
  fontScale: "normal",
  copies: 1,
  feedLines: 3,
};

export const receiptOptionsFrom = (settings?: Partial<AppSettings>): ReceiptOptions => {
  if (!settings) return DEFAULT_RECEIPT_OPTIONS;

  const scale = settings.receiptFontScale;

  return {
    width: settings.receiptWidth || DEFAULT_RECEIPT_OPTIONS.width,
    headerText: settings.receiptHeaderText ?? "",
    footerText: settings.receiptFooter ?? "",
    showAddress: bool(settings.showAddressOnReceipt, true),
    showPhone: bool(settings.showPhoneOnReceipt, true),
    showWaiter: bool(settings.showWaiterOnReceipt, true),
    showGuests: bool(settings.showGuestsOnReceipt, true),
    showRate: bool(settings.showRateColumn, true),
    showTax: bool(settings.showTaxOnReceipt, false),
    showFooterNote: bool(settings.showFooterNote, true),
    showPrintedAt: bool(settings.showPrintedAt, true),
    fontScale: scale === "compact" || scale === "large" ? scale : "normal",
    copies: int(settings.receiptCopies, 1, 1, 3),
    feedLines: int(settings.receiptFeedLines, 3, 0, 10),
  };
};

/** Base type size for the on-screen/HTML receipt. */
export const FONT_SCALE_CLASS: Record<ReceiptOptions["fontScale"], string> = {
  compact: "text-[10px]",
  normal: "text-[11px]",
  large: "text-[13px]",
};

/** Characters per line for the plain-text receipt, at each width and density. */
export const charWidthFor = (options: ReceiptOptions) => {
  const base = options.width === "58mm" ? 32 : options.width === "A4" ? 80 : 48;

  // A smaller font fits more characters across the same roll.
  if (options.fontScale === "compact") return Math.round(base * 1.2);
  if (options.fontScale === "large") return Math.round(base * 0.75);

  return base;
};

/** Free-text header/footer boxes are multi-line; blank lines are dropped. */
export const textLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
