import brand from "../../app/brand";
import { money, qty, formatDate, formatTime } from "../../utils/format";
import {
  receiptOptionsFrom,
  FONT_SCALE_CLASS,
  textLines,
  type ReceiptOptions,
} from "../../utils/receiptOptions";
import type { AppSettings, Order, KitchenToken, ShoppingList } from "../../types";

/* ------------------------------------------------------------------ */
/* SHARED SHELL                                                        */
/*                                                                     */
/* Thermal rolls are 80mm or 58mm of usable width and the printer       */
/* driver scales to fit, so the sheet is sized in mm and everything     */
/* inside is monospace - proportional digits wander out of their        */
/* columns once a total reaches five figures.                          */
/* ------------------------------------------------------------------ */

const Sheet = ({
  width = "80mm",
  fontScale = "normal",
  children,
}: {
  width?: string;
  fontScale?: ReceiptOptions["fontScale"];
  children: React.ReactNode;
}) => (
  <div
    className={`print-sheet mx-auto bg-white font-mono leading-tight text-black ${FONT_SCALE_CLASS[fontScale]}`}
    style={{ width, maxWidth: "100%" }}
  >
    {children}
  </div>
);

const Divider = ({ char = "-" }: { char?: string }) => (
  <div className="my-1 overflow-hidden text-[10px] whitespace-nowrap opacity-70">
    {char.repeat(60)}
  </div>
);

const Head = ({ title, options }: { title?: string; options: ReceiptOptions }) => (
  <header className="text-center">
    <h1 className="text-[15px] leading-tight font-black tracking-wide uppercase">{brand.name}</h1>

    {options.showAddress && brand.address && <p className="text-[10px]">{brand.address}</p>}
    {options.showPhone && brand.phone && <p className="text-[10px]">Ph: {brand.phone}</p>}

    {/* Free text for whatever this restaurant has to print: NTN, branch, licence. */}
    {textLines(options.headerText).map((line) => (
      <p key={line} className="text-[10px]">
        {line}
      </p>
    ))}

    {title && (
      <p className="mt-1 inline-block border border-black px-2 py-0.5 text-[11px] font-black uppercase">
        {title}
      </p>
    )}
  </header>
);

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className={`flex justify-between gap-2 ${bold ? "text-[13px] font-black" : ""}`}>
    <span>{label}</span>
    <span className="tabular">{value}</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* CUSTOMER BILL                                                       */
/* ------------------------------------------------------------------ */

export const ReceiptDocument = ({
  order,
  isReprint,
  settings,
  options: given,
}: {
  order: Order;
  isReprint?: boolean;
  /** Raw settings; converted to layout options here so callers stay simple. */
  settings?: Partial<AppSettings>;
  /** Pre-built options, used by the live preview in Settings. */
  options?: ReceiptOptions;
}) => {
  const options = given ?? receiptOptionsFrom(settings);
  const items = order.items ?? [];
  const discount = Number(order.discountAmount);
  const tax = Number(order.taxAmount);
  const service = Number(order.serviceCharge);
  const delivery = Number(order.deliveryCharge);
  const paid = Number(order.paidAmount);
  const total = Number(order.total);
  const change = Number(order.tenderedAmount) - total;
  const owing = total - paid;

  return (
    <Sheet width={options.width} fontScale={options.fontScale}>
      <Head title={isReprint ? "Duplicate Bill" : "Bill"} options={options} />

      <Divider char="=" />

      <div className="grid grid-cols-2 gap-x-2 text-[10px]">
        <span>Bill #{order.orderNumber}</span>
        <span className="text-right">{formatDate(order.openedAt)}</span>
        <span>{order.table ? `Table: ${order.table.name}` : order.orderType.toUpperCase()}</span>
        <span className="text-right">{formatTime(order.openedAt)}</span>
        {options.showWaiter && order.waiter && <span>Waiter: {order.waiter.name}</span>}
        {options.showGuests && order.guests > 0 && (
          <span className="text-right">Guests: {order.guests}</span>
        )}
        {order.customerName && <span className="col-span-2">Customer: {order.customerName}</span>}
        {order.customerPhone && <span className="col-span-2">Phone: {order.customerPhone}</span>}
      </div>

      <Divider char="=" />

      <table className="w-full">
        <thead>
          <tr className="border-b border-dashed border-black text-[10px]">
            <th className="w-full py-0.5 text-left font-bold">ITEM</th>
            <th className="py-0.5 pr-1 text-right font-bold">QTY</th>
            {options.showRate && <th className="py-0.5 pr-1 text-right font-bold">RATE</th>}
            <th className="py-0.5 text-right font-bold">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="print-row align-top">
              <td className="py-[3px] pr-1 leading-tight">
                {item.name}
                {item.variantLabel && <strong> ({item.variantLabel})</strong>}
                {item.note && <div className="text-[9px] italic opacity-75">({item.note})</div>}
              </td>
              <td className="tabular py-[3px] pr-1 text-right">{qty(item.quantity)}</td>
              {options.showRate && (
                <td className="tabular py-[3px] pr-1 text-right">{money(item.unitPrice, false)}</td>
              )}
              <td className="tabular py-[3px] text-right font-semibold">
                {money(Number(item.quantity) * Number(item.unitPrice), false)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Divider />

      <div className="space-y-0.5">
        <Row label="Subtotal" value={money(order.subtotal, false)} />
        {discount > 0 && (
          <Row
            label={`Discount${order.discountType === "percent" ? ` (${Number(order.discountValue)}%)` : ""}`}
            value={`-${money(discount, false)}`}
          />
        )}
        {service > 0 && <Row label="Service Charge" value={money(service, false)} />}
        {delivery > 0 && <Row label="Delivery" value={money(delivery, false)} />}
        {/*
          Honours the setting rather than just "is there tax": shops whose menu
          prices already include tax do not want the line broken out at all.
        */}
        {options.showTax && tax > 0 && (
          <Row label={`Tax (${Number(order.taxPercent)}%)`} value={money(tax, false)} />
        )}
      </div>

      <Divider char="=" />

      <Row label="TOTAL" value={money(total)} bold />

      <Divider char="=" />

      <div className="space-y-0.5">
        {order.status === "paid" && (
          <>
            <Row label={`Paid (${order.paymentMethod ?? "cash"})`} value={money(paid, false)} />
            {change > 0 && <Row label="Change" value={money(change, false)} />}
          </>
        )}

        {/*
          A credit bill is the one place the printed slip has to be
          unmistakable - the customer is walking out without paying in full,
          and both sides need the remaining figure in writing.
        */}
        {order.status === "credit" && (
          <>
            {paid > 0 && <Row label="Received now" value={money(paid, false)} />}
            <Row label="ON CREDIT" value={money(owing, false)} bold />
            {order.creditPerson && (
              <div className="mt-1 border border-black px-2 py-1 text-[10px]">
                <div className="font-bold">Account: {order.creditPerson.name}</div>
                {order.creditAccount && <div>Book: {order.creditAccount.name}</div>}
                <div className="mt-2 border-t border-dashed border-black pt-3 text-center">
                  Signature
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Divider />

      <footer className="mt-1 space-y-0.5 text-center text-[10px]">
        {textLines(options.footerText).map((line) => (
          <p key={line}>{line}</p>
        ))}
        {options.showFooterNote && brand.footerNote && <p>{brand.footerNote}</p>}
        {isReprint && <p className="font-bold">** REPRINT ** ({order.billPrintCount} prints)</p>}
        {options.showPrintedAt && (
          <p className="opacity-70">
            {formatDate(new Date())} {formatTime(new Date())}
          </p>
        )}
        {/* Blank lines so the roll feeds clear of the cutter. */}
        {options.feedLines > 0 && (
          <div aria-hidden style={{ height: `${options.feedLines * 1.2}em` }} />
        )}
      </footer>
    </Sheet>
  );
};

/* ------------------------------------------------------------------ */
/* KITCHEN TOKEN                                                       */
/*                                                                     */
/* No prices anywhere. The kitchen does not need them, and a token      */
/* that shows money invites it being handed to a customer by mistake.   */
/* Item names are printed large because this gets read across a hot,    */
/* steamy kitchen at arm's length.                                     */
/* ------------------------------------------------------------------ */

export const TokenDocument = ({
  token,
  settings,
}: {
  token: KitchenToken;
  settings?: Partial<AppSettings>;
}) => {
  const options = receiptOptionsFrom(settings);

  return (
  <Sheet width={options.width} fontScale={options.fontScale}>
    <header className="text-center">
      <h1 className="text-[13px] font-black tracking-wide uppercase">{brand.name}</h1>
      <p className="mt-1 border-2 border-black py-1 text-[16px] font-black uppercase">
        Kitchen Token
      </p>
    </header>

    <Divider char="=" />

    <div className="grid grid-cols-2 gap-x-2 text-[11px] font-bold">
      <span>#{token.orderNumber}</span>
      <span className="text-right">{formatTime(token.printedAt)}</span>
      <span>{token.tableName ? `TABLE ${token.tableName}` : token.orderType.toUpperCase()}</span>
      <span className="text-right">Guests: {token.guests}</span>
      {token.waiterName && <span className="col-span-2">Waiter: {token.waiterName}</span>}
    </div>

    <Divider char="=" />

    <table className="w-full">
      <tbody>
        {token.lines.map((line) => (
          <tr key={line.id} className="print-row border-b border-dashed border-black align-top">
            <td className="tabular w-10 py-1.5 pr-2 text-[18px] leading-none font-black">
              {qty(line.quantity)}
            </td>
            <td className="py-1.5 text-[14px] leading-tight font-bold uppercase">
              {line.name}
              {/*
                The size is the one thing the cook cannot guess, so it gets its
                own line in a box rather than trailing the name.
              */}
              {line.variantLabel && (
                <div className="mt-0.5 ml-1.5 inline-block border border-black px-1 text-[13px] font-black">
                  {line.variantLabel}
                </div>
              )}
              {line.note && (
                <div className="text-[11px] font-bold normal-case italic">** {line.note} **</div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    {token.note && (
      <>
        <Divider />
        <p className="text-[11px] font-bold">NOTE: {token.note}</p>
      </>
    )}

    <Divider char="=" />

    <p className="text-center text-[10px]">
      {token.lines.length} item{token.lines.length === 1 ? "" : "s"} &middot;{" "}
      {formatDate(token.printedAt)}
    </p>

    {options.feedLines > 0 && (
      <div aria-hidden style={{ height: `${options.feedLines * 1.2}em` }} />
    )}
  </Sheet>
  );
};

/* ------------------------------------------------------------------ */
/* KITCHEN SHOPPING LIST                                               */
/*                                                                     */
/* Printed on A4, not thermal paper: it goes to the market in someone's */
/* pocket and has a column to tick off and one to write the price in.   */
/* ------------------------------------------------------------------ */

export const ShoppingListDocument = ({ list }: { list: ShoppingList }) => (
  <div className="print-sheet mx-auto max-w-[190mm] bg-white p-4 text-black">
    <header className="mb-3 border-b-2 border-black pb-2 text-center">
      <h1 className="text-xl font-black tracking-wide uppercase">{brand.name}</h1>
      <p className="text-sm font-bold">Kitchen Purchase List</p>
      <p className="mt-0.5 text-xs">
        For {formatDate(list.businessDate)}
        {list.checkedByName ? ` · Checked by ${list.checkedByName}` : ""}
      </p>
    </header>

    <div className="mb-3 flex justify-around border border-black py-1.5 text-center text-xs">
      <span>
        <strong className="block text-base">{list.totalItems}</strong>Items checked
      </span>
      <span>
        <strong className="block text-base">{list.outOfStock}</strong>Finished
      </span>
      <span>
        <strong className="block text-base">{list.lowStock}</strong>Running low
      </span>
    </div>

    {list.groups.map((group) => (
      <section key={group.name} className="mb-3 break-inside-avoid">
        <h2 className="mb-1 bg-black px-2 py-0.5 text-xs font-black text-white uppercase">
          {group.name}
        </h2>

        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="w-6 py-1 text-left">#</th>
              <th className="py-1 text-left">Item</th>
              <th className="w-20 py-1 text-right">Need</th>
              <th className="w-16 py-1 text-center">Status</th>
              <th className="w-24 py-1 text-center">Rate</th>
              <th className="w-24 py-1 text-center">Amount</th>
            </tr>
          </thead>
          <tbody>
            {group.items.map((item, index) => (
              <tr key={item.id} className="print-row border-b border-dotted border-gray-500">
                <td className="py-1.5">{index + 1}</td>
                <td className="py-1.5 font-semibold">
                  {item.name}
                  {item.note && <span className="ml-1 text-[10px] italic">({item.note})</span>}
                </td>
                <td className="tabular py-1.5 text-right font-bold">
                  {item.demandQuantity > 0 ? `${qty(item.demandQuantity)} ${item.unit}` : `— ${item.unit}`}
                </td>
                <td className="py-1.5 text-center text-[10px] font-bold uppercase">
                  {item.status === "out" ? "FINISHED" : item.status === "low" ? "LOW" : "OK"}
                </td>
                {/* Left blank on purpose: filled in by hand at the market. */}
                <td className="py-1.5"></td>
                <td className="py-1.5"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    ))}

    {list.note && (
      <p className="mt-3 border border-black p-2 text-xs">
        <strong>Note:</strong> {list.note}
      </p>
    )}

    <footer className="mt-6 flex justify-between text-xs">
      <span className="border-t border-black pt-1">Prepared by</span>
      <span className="border-t border-black pt-1">Purchased by</span>
      <span className="border-t border-black pt-1">Approved by</span>
    </footer>
  </div>
);

export default ReceiptDocument;
