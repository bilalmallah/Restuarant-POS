import brand from "../app/brand";
import { money, qty, formatDate, formatTime } from "./format";
import {
  receiptOptionsFrom,
  charWidthFor,
  textLines,
  type ReceiptOptions,
} from "./receiptOptions";
import type { AppSettings, KitchenToken, Order, ShoppingList } from "../types";

/**
 * Plain-text receipts for silent printing.
 *
 * A thermal roll is a fixed-width character device, so the layout here is a
 * character grid rather than HTML. The on-screen receipt and this share the
 * same structure deliberately - what staff see in the preview is what comes
 * off the roll.
 */

const line = (width: number, char = "-") => char.repeat(width);

/** "Subtotal" on the left, "1,460" hard against the right margin. */
const pair = (left: string, right: string, width: number) => {
  const gap = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(gap) + right;
};

const centre = (text: string, width: number) => {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
};

/** Long dish names wrap rather than pushing the money column off the paper. */
const wrap = (text: string, width: number) => {
  const words = text.split(/\s+/);
  const rows: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current.length) current = word;
    else if (`${current} ${word}`.length <= width) current += ` ${word}`;
    else {
      rows.push(current);
      current = word;
    }
  }

  if (current.length) rows.push(current);
  return rows.length ? rows : [""];
};

const header = (width: number, options: ReceiptOptions, title?: string) => {
  const rows = [centre(brand.name.toUpperCase(), width)];

  if (options.showAddress && brand.address) rows.push(centre(brand.address, width));
  if (options.showPhone && brand.phone) rows.push(centre(`Ph: ${brand.phone}`, width));

  // Free text for whatever this restaurant has to print: NTN, branch, licence.
  for (const text of textLines(options.headerText)) rows.push(centre(text, width));

  if (title) rows.push("", centre(`*** ${title} ***`, width));

  return rows;
};

/* ------------------------------------------------------------------ */
/* CUSTOMER BILL                                                       */
/* ------------------------------------------------------------------ */

export const receiptToText = (
  order: Order,
  settings?: Partial<AppSettings>,
  { isReprint = false }: { isReprint?: boolean } = {}
) => {
  const options = receiptOptionsFrom(settings);
  const width = charWidthFor(options);
  const rows: string[] = [];

  const total = Number(order.total);
  const paid = Number(order.paidAmount);
  const change = Number(order.tenderedAmount) - total;
  const owing = total - paid;

  rows.push(...header(width, options, isReprint ? "DUPLICATE BILL" : "BILL"));
  rows.push(line(width, "="));

  rows.push(pair(`Bill #${order.orderNumber}`, formatDate(order.openedAt), width));
  rows.push(
    pair(
      order.table ? `Table: ${order.table.name}` : order.orderType.toUpperCase(),
      formatTime(order.openedAt),
      width
    )
  );
  if (options.showWaiter && order.waiter) {
    rows.push(
      pair(`Waiter: ${order.waiter.name}`, options.showGuests ? `Guests: ${order.guests}` : "", width)
    );
  } else if (options.showGuests && order.guests > 0) {
    rows.push(`Guests: ${order.guests}`);
  }
  if (order.customerName) rows.push(`Customer: ${order.customerName}`);
  if (order.customerPhone) rows.push(`Phone: ${order.customerPhone}`);

  rows.push(line(width, "="));

  // Money columns are fixed width; the name takes whatever is left.
  const qtyWidth = 4;
  const rateWidth = options.showRate ? 8 : 0;
  const amountWidth = 9;
  const nameWidth = width - qtyWidth - rateWidth - amountWidth;

  rows.push(
    "ITEM".padEnd(nameWidth) +
      "QTY".padStart(qtyWidth) +
      (options.showRate ? "RATE".padStart(rateWidth) : "") +
      "AMOUNT".padStart(amountWidth)
  );
  rows.push(line(width));

  for (const item of order.items ?? []) {
    const amount = Number(item.quantity) * Number(item.unitPrice);
    const label = item.variantLabel ? `${item.name} (${item.variantLabel})` : item.name;
    const [first, ...rest] = wrap(label, nameWidth - 1);

    rows.push(
      first.padEnd(nameWidth) +
        qty(item.quantity).padStart(qtyWidth) +
        (options.showRate ? money(item.unitPrice, false).padStart(rateWidth) : "") +
        money(amount, false).padStart(amountWidth)
    );

    for (const extra of rest) rows.push(`  ${extra}`);
    if (item.note) rows.push(`  (${item.note})`);
  }

  rows.push(line(width));
  rows.push(pair("Subtotal", money(order.subtotal, false), width));

  if (Number(order.discountAmount) > 0) {
    const label =
      order.discountType === "percent"
        ? `Discount (${Number(order.discountValue)}%)`
        : "Discount";
    rows.push(pair(label, `-${money(order.discountAmount, false)}`, width));
  }

  if (Number(order.serviceCharge) > 0)
    rows.push(pair("Service Charge", money(order.serviceCharge, false), width));
  if (Number(order.deliveryCharge) > 0)
    rows.push(pair("Delivery", money(order.deliveryCharge, false), width));
  if (options.showTax && Number(order.taxAmount) > 0)
    rows.push(pair(`Tax (${Number(order.taxPercent)}%)`, money(order.taxAmount, false), width));

  rows.push(line(width, "="));
  rows.push(pair("TOTAL", money(total), width));
  rows.push(line(width, "="));

  if (order.status === "paid") {
    rows.push(pair(`Paid (${order.paymentMethod ?? "cash"})`, money(paid, false), width));
    if (change > 0) rows.push(pair("Change", money(change, false), width));
  }

  // A credit bill is the one slip that has to be unmistakable: the customer is
  // walking out without paying in full and both sides need the figure on paper.
  if (order.status === "credit") {
    if (paid > 0) rows.push(pair("Received now", money(paid, false), width));
    rows.push(pair("ON CREDIT", money(owing), width));

    if (order.creditPerson) {
      rows.push("", `Account: ${order.creditPerson.name}`);
      if (order.creditAccount) rows.push(`Book: ${order.creditAccount.name}`);
      rows.push("", line(width), centre("Signature", width));
    }
  }

  rows.push(line(width));

  for (const text of textLines(options.footerText)) rows.push(centre(text, width));
  if (options.showFooterNote && brand.footerNote) rows.push(centre(brand.footerNote, width));

  if (isReprint) rows.push(centre(`** REPRINT ** (${order.billPrintCount} prints)`, width));

  if (options.showPrintedAt) {
    rows.push(centre(`${formatDate(new Date())} ${formatTime(new Date())}`, width));
  }

  // Blank lines so the roll feeds clear of the cutter.
  for (let i = 0; i < options.feedLines; i += 1) rows.push("");

  const sheet = rows.join("\n");

  // A second copy (one for the customer, one for the file) is a setting rather
  // than two presses of the print button.
  return Array.from({ length: options.copies }, () => sheet).join("\n\n");
};

/* ------------------------------------------------------------------ */
/* KITCHEN TOKEN                                                       */
/*                                                                     */
/* No prices anywhere - the kitchen does not need them, and a token     */
/* showing money invites being handed to a customer by mistake.         */
/* ------------------------------------------------------------------ */

export const tokenToText = (token: KitchenToken, settings?: Partial<AppSettings>) => {
  const options = receiptOptionsFrom(settings);
  const width = charWidthFor(options);
  const rows: string[] = [];

  rows.push(centre(brand.name.toUpperCase(), width));
  rows.push("", centre(token.isReprint ? "*** KITCHEN TOKEN (REPRINT) ***" : "*** KITCHEN TOKEN ***", width));
  rows.push(line(width, "="));

  rows.push(pair(`#${token.orderNumber}`, formatTime(token.printedAt), width));
  rows.push(
    pair(
      token.tableName ? `TABLE ${token.tableName}` : token.orderType.toUpperCase(),
      `Guests: ${token.guests}`,
      width
    )
  );
  if (token.waiterName) rows.push(`Waiter: ${token.waiterName}`);

  rows.push(line(width, "="));

  for (const item of token.lines) {
    rows.push(`${qty(item.quantity).padEnd(4)}${item.name.toUpperCase()}`);
    // Size on its own line: it is what the cook actually needs and it must not
    // get lost at the end of a long dish name.
    if (item.variantLabel) rows.push(`    >> ${item.variantLabel.toUpperCase()} <<`);
    if (item.note) rows.push(`    ** ${item.note} **`);
    rows.push(line(width));
  }

  if (token.note) rows.push(`NOTE: ${token.note}`);

  rows.push(line(width, "="));
  rows.push(
    centre(
      `${token.lines.length} item${token.lines.length === 1 ? "" : "s"} · ${formatDate(token.printedAt)}`,
      width
    )
  );

  return rows.join("\n");
};

/* ------------------------------------------------------------------ */
/* KITCHEN PURCHASE LIST                                               */
/* ------------------------------------------------------------------ */

export const shoppingListToText = (list: ShoppingList, settings?: Partial<AppSettings>) => {
  const options = receiptOptionsFrom(settings);
  const width = charWidthFor(options);
  const rows: string[] = [];

  rows.push(...header(width, options, "PURCHASE LIST"));
  rows.push(line(width, "="));
  rows.push(pair(`For ${formatDate(list.businessDate)}`, list.checkedByName ?? "", width));
  rows.push(line(width, "="));

  for (const group of list.groups) {
    rows.push("", group.name.toUpperCase(), line(width));

    for (const item of group.items) {
      const need =
        item.demandQuantity > 0 ? `${qty(item.demandQuantity)} ${item.unit}` : `- ${item.unit}`;
      rows.push(pair(`${item.name}${item.status === "out" ? " (finished)" : ""}`, need, width));
      if (item.note) rows.push(`   ${item.note}`);
    }
  }

  rows.push("", line(width, "="));
  rows.push(pair("Items needed", String(list.groups.reduce((sum, g) => sum + g.items.length, 0)), width));
  if (list.note) rows.push("", `Note: ${list.note}`);

  return rows.join("\n");
};
