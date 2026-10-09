import { useMemo } from "react";
import { FiFileText, FiEye } from "react-icons/fi";
import clsx from "clsx";

import { ReceiptDocument } from "../../components/print/Receipt";
import { Card, CardHeader, Input, Select, Switch, Textarea } from "../../components/ui/primitives";
import { receiptOptionsFrom, type ReceiptOptions } from "../../utils/receiptOptions";
import type { Order } from "../../types";

/**
 * Receipt layout, with the receipt itself next to the controls.
 *
 * Every toggle here changes something you can only otherwise judge by walking
 * to the printer and using up a roll, so the preview is not decoration - it is
 * the whole point. It renders the same component the printer gets, driven by
 * the same options object, so it cannot drift from the real thing.
 */

/** A believable bill: two sizes, a discount and a note, to exercise the layout. */
const SAMPLE_ORDER = {
  id: 0,
  orderNumber: "0042",
  businessDate: "2026-09-16",
  tableId: 4,
  waiterId: 1,
  orderType: "dine-in",
  status: "paid",
  guests: 4,
  customerName: null,
  customerPhone: null,
  subtotal: 3947,
  discountType: "percent",
  discountValue: 10,
  discountAmount: 394.7,
  taxPercent: 5,
  taxAmount: 177.62,
  serviceCharge: 0,
  deliveryCharge: 0,
  total: 3729.92,
  paidAmount: 3729.92,
  tenderedAmount: 4000,
  paymentMethod: "cash",
  creditPersonId: null,
  creditAccountId: null,
  commissionPercent: 3,
  commissionAmount: 106,
  note: null,
  voidReason: null,
  billPrintCount: 1,
  openedAt: new Date().toISOString(),
  closedAt: null,
  table: { id: 4, name: "T04", area: "Main Hall" },
  waiter: { id: 1, name: "Asif Ali" },
  items: [
    {
      id: 1, orderId: 0, productId: 1, name: "Afghani Pizza", variantLabel: "Large",
      categoryName: "Pizza (Large)", unitPrice: 1599, originalPrice: 1599, quantity: 1,
      lineTotal: 1599, printedQuantity: 1, printToKitchen: true, note: null, isReturned: false,
    },
    {
      id: 2, orderId: 0, productId: 2, name: "Margarita Pizza", variantLabel: "Medium",
      categoryName: "Pizza (Medium)", unitPrice: 899, originalPrice: 899, quantity: 1,
      lineTotal: 899, printedQuantity: 1, printToKitchen: true, note: "extra cheese", isReturned: false,
    },
    {
      id: 3, orderId: 0, productId: 3, name: "Chicken Malai Boti", variantLabel: null,
      categoryName: "BBQ", unitPrice: 890, originalPrice: 890, quantity: 1,
      lineTotal: 890, printedQuantity: 1, printToKitchen: true, note: null, isReturned: false,
    },
    {
      id: 4, orderId: 0, productId: 4, name: "Cold Drinks Can", variantLabel: null,
      categoryName: "Beverages", unitPrice: 200, originalPrice: 200, quantity: 2,
      lineTotal: 400, printedQuantity: 0, printToKitchen: false, note: null, isReturned: false,
    },
  ],
} as unknown as Order;

type FormShape = {
  receiptWidth: string;
  receiptHeaderText: string;
  receiptFooter: string;
  showAddressOnReceipt: boolean;
  showPhoneOnReceipt: boolean;
  showWaiterOnReceipt: boolean;
  showGuestsOnReceipt: boolean;
  showRateColumn: boolean;
  showTaxOnReceipt: boolean;
  showFooterNote: boolean;
  showPrintedAt: boolean;
  receiptFontScale: string;
  receiptCopies: string;
  receiptFeedLines: string;
};

const TOGGLES: { key: keyof FormShape; label: string; hint: string }[] = [
  { key: "showAddressOnReceipt", label: "Address", hint: "Under the restaurant name" },
  { key: "showPhoneOnReceipt", label: "Phone number", hint: "Under the address" },
  { key: "showWaiterOnReceipt", label: "Waiter name", hint: "Who served the table" },
  { key: "showGuestsOnReceipt", label: "Guest count", hint: "How many people ate" },
  { key: "showRateColumn", label: "Rate column", hint: "Turn off for a shorter, narrower slip" },
  { key: "showTaxOnReceipt", label: "Tax line", hint: "Turn off if your prices already include tax" },
  { key: "showFooterNote", label: "Thank-you note", hint: "The line set in the .env file" },
  { key: "showPrintedAt", label: "Printed date and time", hint: "At the very bottom" },
];

export const ReceiptLayout = ({
  form,
  onChange,
}: {
  form: FormShape;
  onChange: (next: Partial<FormShape>) => void;
}) => {
  // Same conversion the printer uses, so the preview cannot lie.
  const options: ReceiptOptions = useMemo(
    () =>
      receiptOptionsFrom({
        receiptWidth: form.receiptWidth,
        receiptHeaderText: form.receiptHeaderText,
        receiptFooter: form.receiptFooter,
        showAddressOnReceipt: String(form.showAddressOnReceipt),
        showPhoneOnReceipt: String(form.showPhoneOnReceipt),
        showWaiterOnReceipt: String(form.showWaiterOnReceipt),
        showGuestsOnReceipt: String(form.showGuestsOnReceipt),
        showRateColumn: String(form.showRateColumn),
        showTaxOnReceipt: String(form.showTaxOnReceipt),
        showFooterNote: String(form.showFooterNote),
        showPrintedAt: String(form.showPrintedAt),
        receiptFontScale: form.receiptFontScale,
        receiptCopies: form.receiptCopies,
        receiptFeedLines: form.receiptFeedLines,
      }),
    [form]
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <FiFileText className="size-4" /> Receipt layout
          </span>
        }
        subtitle="What goes on the printed bill, and how it is arranged"
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        {/* ---------------- Controls ---------------- */}
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Paper width"
              value={form.receiptWidth}
              onChange={(event) => onChange({ receiptWidth: event.target.value })}
              hint="Match your printer's roll"
            >
              <option value="58mm">58mm roll</option>
              <option value="80mm">80mm roll</option>
              <option value="A4">A4 sheet</option>
            </Select>

            <Select
              label="Text size"
              value={form.receiptFontScale}
              onChange={(event) => onChange({ receiptFontScale: event.target.value })}
              hint="Smaller fits more per roll"
            >
              <option value="compact">Compact</option>
              <option value="normal">Normal</option>
              <option value="large">Large</option>
            </Select>

            <Select
              label="Copies"
              value={form.receiptCopies}
              onChange={(event) => onChange({ receiptCopies: event.target.value })}
              hint="Two prints customer + file"
            >
              <option value="1">1 copy</option>
              <option value="2">2 copies</option>
              <option value="3">3 copies</option>
            </Select>
          </div>

          <Textarea
            label="Extra header lines"
            value={form.receiptHeaderText}
            onChange={(event) => onChange({ receiptHeaderText: event.target.value })}
            placeholder={"NTN: 1234567-8\nBranch: Tariq Road"}
            hint="Printed under the restaurant name. One line each."
          />

          <Textarea
            label="Footer lines"
            value={form.receiptFooter}
            onChange={(event) => onChange({ receiptFooter: event.target.value })}
            placeholder={"Wifi: YBF-Guest\nNo refund without this receipt"}
            hint="Printed above the thank-you note. One line each."
          />

          <div>
            <span className="mb-2 block text-xs font-semibold tracking-wide text-ink-600 uppercase">
              Show on the receipt
            </span>

            <div className="grid gap-2 sm:grid-cols-2">
              {TOGGLES.map((toggle) => (
                <Switch
                  key={toggle.key}
                  label={toggle.label}
                  hint={toggle.hint}
                  checked={Boolean(form[toggle.key])}
                  onChange={(value) => onChange({ [toggle.key]: value } as Partial<FormShape>)}
                />
              ))}
            </div>
          </div>

          <Input
            label="Blank lines at the end"
            type="number"
            min={0}
            max={10}
            value={form.receiptFeedLines}
            onChange={(event) => onChange({ receiptFeedLines: event.target.value })}
            hint="Feeds the paper clear of the cutter. Raise it if the last line gets sliced."
            wrapperClassName="sm:w-56"
          />
        </div>

        {/* ---------------- Live preview ---------------- */}
        <div className="lg:w-[340px]">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-500 uppercase">
            <FiEye className="size-3.5" /> Live preview
          </p>

          <div
            className={clsx(
              "max-h-[560px] overflow-y-auto rounded-lg border border-ink-200 bg-ink-100 p-3",
              "shadow-inner"
            )}
          >
            <div className="mx-auto bg-white p-2 shadow-sm">
              <ReceiptDocument order={SAMPLE_ORDER} options={options} />
            </div>
          </div>

          <p className="mt-2 text-xs text-ink-500">
            A sample bill, drawn by the same code the printer uses. Save to apply.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ReceiptLayout;
