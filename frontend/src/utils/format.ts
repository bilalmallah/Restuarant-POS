import brand from "../app/brand";

/**
 * Money is displayed with thousands separators and no decimals unless the
 * amount actually has paisa - a bill of "Rs 1,240" reads faster across a
 * counter than "Rs 1,240.00", but change of "Rs 12.50" must not be rounded.
 */
export const money = (value: number | string | null | undefined, withSymbol = true) => {
  const amount = Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  const hasPaisa = Math.round(safe * 100) % 100 !== 0;

  const text = safe.toLocaleString("en-PK", {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return withSymbol ? `${brand.currency} ${text}` : text;
};

/** Signed money for ledgers: +2,000 given, -500 paid back. */
export const signedMoney = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "-" : ""}${money(Math.abs(value))}`;

export const qty = (value: number | string | null | undefined) => {
  const amount = Number(value ?? 0);
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
};

/* ------------------------------------------------------------------ */
/* DATES                                                               */
/* ------------------------------------------------------------------ */

/**
 * Local YYYY-MM-DD. Never use toISOString() for this: at UTC+5 it reports
 * yesterday for anything before 5am, and a restaurant's busiest hour is 11pm.
 */
export const toDateInput = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
};

export const toMonthInput = (value: Date | string = new Date()) => toDateInput(value).slice(0, 7);

export const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatTime = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

export const formatDateTime = (value: string | Date | null | undefined) =>
  value ? `${formatDate(value)}  ${formatTime(value)}` : "-";

/** "22m" / "1h 40m" - how long a table has been sitting. */
export const elapsedSince = (value: string | Date) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;

  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
};

/* ------------------------------------------------------------------ */
/* RANGES                                                              */
/* ------------------------------------------------------------------ */

export type RangePreset = "today" | "yesterday" | "week" | "month" | "lastMonth" | "year";

/** The date shortcuts every report screen offers. */
export const presetRange = (preset: RangePreset): { from: string; to: string } => {
  const now = new Date();
  const shift = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);

  switch (preset) {
    case "today":
      return { from: toDateInput(now), to: toDateInput(now) };
    case "yesterday":
      return { from: toDateInput(shift(-1)), to: toDateInput(shift(-1)) };
    case "week":
      // Monday-to-today, the way a restaurant week is actually counted.
      return { from: toDateInput(shift(-((now.getDay() + 6) % 7))), to: toDateInput(now) };
    case "month":
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateInput(now),
      };
    case "lastMonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toDateInput(first), to: toDateInput(last) };
    }
    case "year":
      return { from: toDateInput(new Date(now.getFullYear(), 0, 1)), to: toDateInput(now) };
  }
};

export const titleCase = (value: string) =>
  value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
