import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUser, FiAward, FiArrowRight } from "react-icons/fi";

import { useGetWaiterReportQuery } from "../../features/posApi";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { money, formatDate, presetRange, titleCase } from "../../utils/format";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Button, Card, Loader, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { RangePicker, PrintButton } from "../../components/layout/PageHeader";
import type { WaiterReport as WaiterReportData } from "../../types";

type WaiterRow = WaiterReportData["rows"][number];

const WaiterReport = () => {
  const navigate = useNavigate();
  const printPage = usePrintPage();
  const [range, setRange] = useState(() => presetRange("month"));

  const { data, isLoading } = useGetWaiterReportQuery({ from: range.from, to: range.to });

  useHotkeys([{ combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true }]);

  if (isLoading || !data) return <Loader label="Ranking the floor" />;

  const { rows, totals } = data;
  const top = rows[0];

  const columns: Column<WaiterRow>[] = [
    {
      key: "rank",
      header: "#",
      width: "44px",
      render: (_row, index) => (
        <span className={index === 0 ? "font-extrabold text-amber-600" : "tabular text-ink-400"}>
          {index + 1}
        </span>
      ),
    },
    {
      key: "name",
      header: "Waiter",
      render: (row) => (
        <div>
          <span className="font-bold text-ink-900">{row.name}</span>
          {row.role && <span className="block text-xs text-ink-500">{titleCase(row.role)}</span>}
        </div>
      ),
    },
    {
      key: "orders",
      header: "Bills",
      align: "right",
      render: (row) => <span className="tabular font-semibold">{row.orderCount}</span>,
    },
    {
      key: "guests",
      header: "Guests",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular text-ink-600">{row.guests}</span>,
    },
    {
      key: "average",
      header: "Average bill",
      align: "right",
      hideOnMobile: true,
      render: (row) => <span className="tabular text-ink-600">{money(row.averageBill)}</span>,
    },
    {
      key: "discount",
      header: "Discount given",
      align: "right",
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular text-red-600">
          {row.discount > 0 ? money(row.discount) : "-"}
        </span>
      ),
    },
    {
      key: "sales",
      header: "Total sold",
      align: "right",
      render: (row) => (
        <div>
          <span className="tabular text-base font-extrabold text-ink-900">{money(row.sales)}</span>
          <span className="block text-[10px] text-ink-400">
            {((row.sales / (totals.sales || 1)) * 100).toFixed(1)}% of sales
          </span>
        </div>
      ),
    },
    {
      key: "commission",
      header: "Commission",
      align: "right",
      render: (row) => (
        <span className="tabular font-bold text-brand-700">{money(row.commission)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "56px",
      className: "no-print",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<FiArrowRight />}
          title="Open this waiter's ledger"
          className="no-print"
          onClick={() => navigate(`/staff/${row.employeeId}`)}
        />
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Waiter Report"
        subtitle="Who sold what, and the commission each of them earned"
        actions={<PrintButton onClick={printPage} />}
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Waiter Performance</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Waiters with sales" value={rows.length} icon={<FiUser />} tone="brand" />
        <StatTile label="Bills Served" value={totals.orderCount} />
        <StatTile label="Total Sold" value={money(totals.sales)} tone="success" />
        <StatTile
          label="Top Seller"
          value={top?.name ?? "-"}
          sub={top ? money(top.sales) : undefined}
          tone="warning"
          icon={<FiAward />}
        />
      </div>

      <Card padded={false} className="print-sheet overflow-hidden">
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.employeeId}
          empty={
            <EmptyState
              icon={<FiUser />}
              title="No waiter sales in this period"
              message="Bills only count here when a waiter was selected as the order was started."
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3" colSpan={2}>
                Totals
              </td>
              <td className="tabular px-3 py-3 text-right">{totals.orderCount}</td>
              <td className="hidden sm:table-cell" />
              <td className="hidden sm:table-cell" />
              <td className="hidden sm:table-cell" />
              <td className="tabular px-3 py-3 text-right text-base">{money(totals.sales)}</td>
              <td className="tabular px-3 py-3 text-right text-base text-brand-700">
                {money(totals.commission)}
              </td>
              <td className="no-print" />
            </tr>
          }
        />
      </Card>
    </div>
  );
};

export default WaiterReport;
