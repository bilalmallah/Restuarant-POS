import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { FiPrinter, FiEye, FiRotateCcw } from "react-icons/fi";

import {
  useListOrdersQuery,
  useListWaitersQuery,
  useGetOrderQuery,
  usePrintBillMutation,
  useReopenOrderMutation,
  useGetSettingsQuery,
} from "../../features/posApi";
import { useCan } from "../../hooks/useStore";
import useHotkeys from "../../hooks/useHotkeys";
import usePrinter from "../../hooks/usePrinter";
import { SHORTCUTS } from "../../app/shortcuts";
import { money, formatTime, formatDate, presetRange, titleCase } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Card, Loader, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { FilterBar, RangePicker, SelectFilter } from "../../components/layout/PageHeader";
import { ReceiptDocument } from "../../components/print/Receipt";
import PrintPortal from "../../components/print/PrintPortal";
import type { Order, OrderStatus } from "../../types";

const STATUS_TONES: Record<OrderStatus, "success" | "warning" | "danger" | "info" | "brand"> = {
  paid: "success",
  credit: "warning",
  void: "danger",
  billed: "info",
  open: "brand",
};

const SalesHistory = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { isManager } = useCan();

  const [range, setRange] = useState(() => presetRange("today"));
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [waiterId, setWaiterId] = useState("");
  const [printingId, setPrintingId] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const { data: orders = [], isLoading } = useListOrdersQuery({
    from: range.from,
    to: range.to,
    search,
    status,
    waiterId,
  });
  const { data: waiters = [] } = useListWaitersQuery();
  const { data: settings } = useGetSettingsQuery();

  // Loaded lazily: the list does not carry line items, and the receipt needs them.
  const { data: fullOrder } = useGetOrderQuery(printingId!, { skip: !printingId });
  const [printBill] = usePrintBillMutation();
  const [reopenOrder] = useReopenOrderMutation();

  const printer = usePrinter();

  useHotkeys([{ combo: SHORTCUTS.search.combo, handler: () => searchRef.current?.focus() }]);

  const totals = useMemo(() => {
    const settled = orders.filter((order) => order.status === "paid" || order.status === "credit");

    return {
      count: settled.length,
      sales: settled.reduce((sum, order) => sum + Number(order.total), 0),
      received: settled.reduce((sum, order) => sum + Number(order.paidAmount), 0),
      voided: orders.filter((order) => order.status === "void").length,
    };
  }, [orders]);

  const reprint = async (order: Order) => {
    setPrintingId(order.id);

    try {
      const result = await printBill(order.id).unwrap();
      await printer.printReceipt(result.data, true);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not print that bill"));
    }
  };

  const reopen = async (order: Order) => {
    try {
      await reopenOrder(order.id).unwrap();
      toast.success(`Bill #${order.orderNumber} re-opened`);
      navigate(`/pos/order/${order.id}`);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not re-open that bill"));
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Sales History"
        subtitle="Every bill, with its full line detail and reprint"
      />

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Bills Settled" value={totals.count} tone="brand" />
        <StatTile label="Total Sales" value={money(totals.sales)} tone="success" />
        <StatTile label="Cash Received" value={money(totals.received)} />
        <StatTile
          label="On Credit"
          value={money(totals.sales - totals.received)}
          tone={totals.sales - totals.received > 0 ? "warning" : "default"}
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search by bill number, customer or phone  (Ctrl+K)"
      >
        <SelectFilter
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="All statuses"
          options={[
            { value: "paid", label: "Paid" },
            { value: "credit", label: "On credit" },
            { value: "open", label: "Running" },
            { value: "billed", label: "Billed" },
            { value: "void", label: "Cancelled" },
          ]}
        />
        <SelectFilter
          label="Waiter"
          value={waiterId}
          onChange={setWaiterId}
          allLabel="All waiters"
          options={waiters.map((waiter) => ({ value: String(waiter.id), label: waiter.name }))}
        />
      </FilterBar>

      <Card padded={false} className="overflow-hidden">
        {isLoading ? (
          <Loader />
        ) : orders.length === 0 ? (
          <EmptyState
            title="No bills in this period"
            message="Try a wider date range, or clear the filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-[11px] tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">Bill</th>
                  <th className="px-3 py-2.5 text-left font-bold">Date</th>
                  <th className="px-3 py-2.5 text-left font-bold">Table</th>
                  <th className="px-3 py-2.5 text-left font-bold">Waiter</th>
                  <th className="px-3 py-2.5 text-left font-bold">Status</th>
                  <th className="px-3 py-2.5 text-right font-bold">Discount</th>
                  <th className="px-3 py-2.5 text-right font-bold">Total</th>
                  <th className="px-3 py-2.5 text-right font-bold">Received</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const owing = Number(order.total) - Number(order.paidAmount);

                  return (
                    <tr
                      key={order.id}
                      className={clsx(
                        "border-b border-ink-100 transition-colors hover:bg-ink-50",
                        order.status === "void" && "opacity-60"
                      )}
                    >
                      <td className="px-3 py-2.5 font-bold text-ink-900">#{order.orderNumber}</td>
                      <td className="px-3 py-2.5 text-ink-600">
                        <span className="block">{formatDate(order.openedAt)}</span>
                        <span className="text-[11px] text-ink-400">{formatTime(order.openedAt)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-ink-700">
                        {order.table?.name ?? titleCase(order.orderType)}
                      </td>
                      <td className="px-3 py-2.5 text-ink-600">{order.waiter?.name ?? "-"}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={STATUS_TONES[order.status]}>{order.status}</Badge>
                        {order.status === "void" && order.voidReason && (
                          <span className="mt-0.5 block text-[10px] text-ink-400 italic">
                            {order.voidReason}
                          </span>
                        )}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-red-600">
                        {Number(order.discountAmount) > 0 ? `-${money(order.discountAmount)}` : "-"}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-bold text-ink-900">
                        {money(order.total)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right">
                        {money(order.paidAmount)}
                        {owing > 0 && order.status === "credit" && (
                          <span className="block text-[10px] font-bold text-amber-700">
                            {money(owing)} owing
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<FiEye />}
                            title="Open this bill"
                            onClick={() => navigate(`/pos/order/${order.id}`)}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<FiPrinter />}
                            title="Reprint"
                            onClick={() => reprint(order)}
                            disabled={order.status === "void"}
                          />
                          {isManager && (order.status === "paid" || order.status === "billed") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<FiRotateCcw />}
                              title="Re-open this bill"
                              onClick={() => reopen(order)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PrintPortal>
        {printer.receiptDocument && (
          <ReceiptDocument
            order={fullOrder ?? printer.receiptDocument.order}
            isReprint
            settings={settings?.settings}
          />
        )}
      </PrintPortal>
    </div>
  );
};

export default SalesHistory;
