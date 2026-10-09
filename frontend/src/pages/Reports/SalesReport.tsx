import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FiTrendingUp } from "react-icons/fi";

import { useGetSalesReportQuery, useListWaitersQuery } from "../../features/posApi";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { money, formatDate, formatTime, presetRange, titleCase } from "../../utils/format";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Badge, Card, CardHeader, Loader, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { RangePicker, SelectFilter, PrintButton } from "../../components/layout/PageHeader";
import type { SalesReport as SalesReportData } from "../../types";

type OrderRow = SalesReportData["orders"][number];

const SalesReport = () => {
  const printPage = usePrintPage();
  const [range, setRange] = useState(() => presetRange("month"));
  const [waiterId, setWaiterId] = useState("");
  const [orderType, setOrderType] = useState("");

  const { data, isLoading } = useGetSalesReportQuery({
    from: range.from,
    to: range.to,
    waiterId,
    orderType,
  });
  const { data: waiters = [] } = useListWaitersQuery();

  useHotkeys([{ combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true }]);

  if (isLoading || !data) return <Loader label="Building the report" />;

  const { totals, byDay, byPaymentMethod, byOrderType, orders } = data;

  const chartData = byDay.map((day) => ({
    ...day,
    label: new Date(day.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
  }));

  const columns: Column<OrderRow>[] = [
    { key: "number", header: "Bill", render: (row) => <span className="font-bold">#{row.orderNumber}</span> },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="whitespace-nowrap">
          {formatDate(row.businessDate)}
          <span className="ml-1 text-xs text-ink-400">{formatTime(row.openedAt)}</span>
        </span>
      ),
    },
    { key: "table", header: "Table", render: (row) => row.tableName ?? titleCase(row.orderType) },
    { key: "waiter", header: "Waiter", hideOnMobile: true, render: (row) => row.waiterName ?? "-" },
    {
      key: "payment",
      header: "Paid by",
      hideOnMobile: true,
      render: (row) => (
        <Badge tone={row.status === "credit" ? "warning" : "success"}>
          {row.paymentMethod ?? row.status}
        </Badge>
      ),
    },
    {
      key: "subtotal",
      header: "Subtotal",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular">{money(row.subtotal)}</span>,
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      render: (row) => (
        <span className="tabular text-red-600">
          {row.discountAmount > 0 ? `-${money(row.discountAmount)}` : "-"}
        </span>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (row) => <span className="tabular font-bold">{money(row.total)}</span>,
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Sales Report"
        subtitle="Total sales between any two dates, with every bill that makes up the figure"
        actions={<PrintButton onClick={printPage} />}
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Sales Report</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker
        from={range.from}
        to={range.to}
        onChange={setRange}
        actions={
          <>
            <SelectFilter
              label="Waiter"
              value={waiterId}
              onChange={setWaiterId}
              allLabel="All waiters"
              options={waiters.map((waiter) => ({ value: String(waiter.id), label: waiter.name }))}
            />
            <SelectFilter
              label="Order type"
              value={orderType}
              onChange={setOrderType}
              allLabel="All types"
              options={[
                { value: "dine-in", label: "Dine in" },
                { value: "takeaway", label: "Takeaway" },
                { value: "delivery", label: "Delivery" },
              ]}
            />
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Net Sales"
          value={money(totals.netSales)}
          sub={`${totals.orderCount} bills`}
          tone="brand"
          icon={<FiTrendingUp />}
        />
        <StatTile label="Cash Received" value={money(totals.received)} tone="success" />
        <StatTile
          label="On Credit"
          value={money(totals.onCredit)}
          tone={totals.onCredit > 0 ? "warning" : "default"}
        />
        <StatTile
          label="Discount Given"
          value={money(totals.discount)}
          sub={
            totals.grossSales > 0
              ? `${((totals.discount / totals.grossSales) * 100).toFixed(1)}% of gross`
              : undefined
          }
          tone={totals.discount > 0 ? "danger" : "default"}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Gross Sales" value={money(totals.grossSales)} />
        <StatTile label="Average Bill" value={money(totals.averageBill)} />
        <StatTile label="Guests Served" value={totals.guests} sub={`${money(totals.averagePerGuest)} each`} />
        <StatTile
          label="Cancelled Bills"
          value={totals.voidedCount}
          tone={totals.voidedCount > 0 ? "warning" : "default"}
        />
      </div>

      {chartData.length > 1 && (
        <Card className="no-print mb-4">
          <CardHeader title="Sales by day" subtitle="Each bar is one business day" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => (value >= 1000 ? `${value / 1000}k` : String(value))}
                />
                <Tooltip
                  formatter={(value) => [money(Number(value ?? 0)), "Sales"]}
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="sales" fill="#108566" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="How customers paid" />
          {byPaymentMethod.length === 0 ? (
            <p className="text-sm text-ink-400">No settled bills in this period.</p>
          ) : (
            <div className="space-y-2">
              {byPaymentMethod.map((row) => {
                const share = (row.amount / (totals.netSales || 1)) * 100;

                return (
                  <div key={row.method} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-bold text-ink-600 capitalize">
                      {row.method}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-ink-100">
                      <div
                        className="h-full rounded bg-brand-500"
                        style={{ width: `${Math.max(share, 2)}%` }}
                      />
                    </div>
                    <span className="tabular w-28 shrink-0 text-right text-sm font-bold">
                      {money(row.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Where the orders came from" />
          {byOrderType.length === 0 ? (
            <p className="text-sm text-ink-400">No settled bills in this period.</p>
          ) : (
            <div className="space-y-2">
              {byOrderType.map((row) => {
                const share = (row.amount / (totals.netSales || 1)) * 100;

                return (
                  <div key={row.type} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-bold text-ink-600 capitalize">
                      {row.type}
                    </span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-ink-100">
                      <div
                        className="h-full rounded bg-accent-500"
                        style={{ width: `${Math.max(share, 2)}%` }}
                      />
                    </div>
                    <span className="tabular w-28 shrink-0 text-right text-sm font-bold">
                      {money(row.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card padded={false} className="print-sheet overflow-hidden">
        <DataTable
          rows={orders}
          columns={columns}
          rowKey={(row) => row.id}
          dense
          empty={
            <EmptyState
              title="No bills in this period"
              message="Try a wider date range or clear the filters."
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3" colSpan={5}>
                Totals — {orders.length} bills
              </td>
              <td className="tabular hidden px-3 py-3 text-right sm:table-cell">
                {money(totals.grossSales)}
              </td>
              <td className="tabular px-3 py-3 text-right text-red-600">
                -{money(totals.discount)}
              </td>
              <td className="tabular px-3 py-3 text-right text-base">{money(totals.netSales)}</td>
            </tr>
          }
        />
      </Card>
    </div>
  );
};

export default SalesReport;
