import { useState } from "react";
import clsx from "clsx";
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiBookOpen } from "react-icons/fi";

import { useGetDayBookQuery } from "../../features/posApi";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { money, formatDate, presetRange } from "../../utils/format";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Card, CardHeader, Loader, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { RangePicker, PrintButton } from "../../components/layout/PageHeader";
import type { DayBook as DayBookData } from "../../types";

type DayRow = DayBookData["byDay"][number];

/**
 * The owner's report: what came in, what went out, what is left.
 *
 * Two different "profit" numbers are shown deliberately, because they answer
 * two different questions and conflating them is how restaurants convince
 * themselves they are doing better than they are:
 *
 *   Cash in hand  - what should physically be in the drawer
 *   Net profit    - what was earned, counting credit sales as income
 */
const DayBook = () => {
  const printPage = usePrintPage();
  const [range, setRange] = useState(() => presetRange("month"));

  const { data, isLoading } = useGetDayBookQuery({ from: range.from, to: range.to });

  useHotkeys([{ combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true }]);

  if (isLoading || !data) return <Loader label="Adding it all up" />;

  const { totals, byDay, expensesByCategory } = data;

  const columns: Column<DayRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="font-bold whitespace-nowrap">{formatDate(row.date)}</span>,
    },
    {
      key: "sales",
      header: "Sales",
      align: "right",
      render: (row) => <span className="tabular font-semibold">{money(row.sales)}</span>,
    },
    {
      key: "cash",
      header: "Cash in",
      align: "right",
      render: (row) => <span className="tabular text-emerald-600">{money(row.cashReceived)}</span>,
    },
    {
      key: "creditGiven",
      header: "Credit given",
      align: "right",
      hideOnMobile: true,
      render: (row) => (
        <span className={clsx("tabular", row.creditGiven > 0 && "text-amber-700")}>
          {money(row.creditGiven)}
        </span>
      ),
    },
    {
      key: "creditBack",
      header: "Credit back",
      align: "right",
      hideOnMobile: true,
      render: (row) => (
        <span className={clsx("tabular", row.creditRecovered > 0 && "text-emerald-600")}>
          {money(row.creditRecovered)}
        </span>
      ),
    },
    {
      key: "expenses",
      header: "Expenses",
      align: "right",
      render: (row) => (
        <span className={clsx("tabular", row.expenses > 0 && "text-red-600")}>
          {money(row.expenses)}
        </span>
      ),
    },
    {
      key: "staff",
      header: "Staff paid",
      align: "right",
      hideOnMobile: true,
      render: (row) => (
        <span className={clsx("tabular", row.staffPaid > 0 && "text-red-600")}>
          {money(row.staffPaid)}
        </span>
      ),
    },
    {
      key: "net",
      header: "In hand",
      align: "right",
      render: (row) => {
        const net = row.cashReceived + row.creditRecovered - row.expenses - row.staffPaid;

        return (
          <span
            className={clsx(
              "tabular font-extrabold",
              net >= 0 ? "text-ink-900" : "text-red-600"
            )}
          >
            {money(net)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Day Book"
        subtitle="Money in, money out, and what should be left - for any date range"
        actions={<PrintButton onClick={printPage} />}
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Day Book</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader
            title={
              <span className="flex items-center gap-2 text-emerald-800">
                <FiTrendingUp className="size-4" /> Money in
              </span>
            }
          />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Cash from bills</dt>
              <dd className="tabular font-bold">{money(totals.cashReceived)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Credit recovered</dt>
              <dd className="tabular font-bold">{money(totals.creditRecovered)}</dd>
            </div>
            <div className="flex justify-between border-t border-emerald-200 pt-1.5 text-base">
              <dt className="font-extrabold text-emerald-800">Total in</dt>
              <dd className="tabular font-extrabold text-emerald-800">{money(totals.moneyIn)}</dd>
            </div>
          </dl>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader
            title={
              <span className="flex items-center gap-2 text-red-800">
                <FiTrendingDown className="size-4" /> Money out
              </span>
            }
          />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Expenses</dt>
              <dd className="tabular font-bold">{money(totals.expenses)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Paid to staff (salary and advances)</dt>
              <dd className="tabular font-bold">{money(totals.staffPaid)}</dd>
            </div>
            <div className="flex justify-between border-t border-red-200 pt-1.5 text-base">
              <dt className="font-extrabold text-red-800">Total out</dt>
              <dd className="tabular font-extrabold text-red-800">{money(totals.moneyOut)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total Sales"
          value={money(totals.sales)}
          sub={`${totals.orderCount} bills`}
          tone="brand"
        />
        <StatTile
          label="Credit Given Out"
          value={money(totals.creditGiven)}
          sub="earned but not yet collected"
          tone={totals.creditGiven > 0 ? "warning" : "default"}
          icon={<FiBookOpen />}
        />
        <StatTile
          label="Cash In Hand"
          value={money(totals.netInHand)}
          sub="what should be in the drawer"
          tone={totals.netInHand >= 0 ? "success" : "danger"}
          icon={<FiDollarSign />}
        />
        <StatTile
          label="Net Profit"
          value={money(totals.netProfit)}
          sub="sales less expenses and wages"
          tone={totals.netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      {expensesByCategory.length > 0 && (
        <Card className="mb-4">
          <CardHeader title="Expenses by category" />
          <div className="space-y-2">
            {expensesByCategory.map((row) => {
              const share = (row.amount / (totals.expenses || 1)) * 100;

              return (
                <div key={row.category} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-xs font-bold text-ink-600">
                    {row.category}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-ink-100">
                    <div
                      className="h-full rounded bg-red-400"
                      style={{ width: `${Math.max(share, 2)}%` }}
                    />
                  </div>
                  <span className="tabular w-28 shrink-0 text-right text-sm font-bold text-ink-900">
                    {money(row.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card padded={false} className="print-sheet overflow-hidden">
        <DataTable
          rows={byDay}
          columns={columns}
          rowKey={(row) => row.date}
          dense
          empty={
            <EmptyState
              title="Nothing recorded in this period"
              message="Sales, expenses and staff payments will appear here day by day."
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3">Totals</td>
              <td className="tabular px-3 py-3 text-right">{money(totals.sales)}</td>
              <td className="tabular px-3 py-3 text-right text-emerald-600">
                {money(totals.cashReceived)}
              </td>
              <td className="tabular hidden px-3 py-3 text-right sm:table-cell">
                {money(totals.creditGiven)}
              </td>
              <td className="tabular hidden px-3 py-3 text-right sm:table-cell">
                {money(totals.creditRecovered)}
              </td>
              <td className="tabular px-3 py-3 text-right text-red-600">{money(totals.expenses)}</td>
              <td className="tabular hidden px-3 py-3 text-right text-red-600 sm:table-cell">
                {money(totals.staffPaid)}
              </td>
              <td className="tabular px-3 py-3 text-right text-base">{money(totals.netInHand)}</td>
            </tr>
          }
        />
      </Card>
    </div>
  );
};

export default DayBook;
