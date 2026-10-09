import { useState } from "react";
import { Link } from "react-router-dom";
import { FiPrinter, FiCreditCard } from "react-icons/fi";

import { useListCreditTransactionsQuery } from "../../features/posApi";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { money, formatDate, presetRange } from "../../utils/format";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Badge, Card, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { RangePicker, SelectFilter, PrintButton } from "../../components/layout/PageHeader";
import type { CreditEntry } from "../../types";

/**
 * Every movement across every khata in one list - the view that answers
 * "how much credit did we give out last month, and how much came back?"
 */
const CreditMovements = () => {
  const printPage = usePrintPage();
  const [range, setRange] = useState(() => presetRange("month"));
  const [type, setType] = useState("");

  const { data, isLoading } = useListCreditTransactionsQuery({
    from: range.from,
    to: range.to,
    type,
  });

  useHotkeys([{ combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true }]);

  const columns: Column<CreditEntry>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.entryDate)}</span>,
    },
    {
      key: "person",
      header: "Person",
      render: (row) => (
        <Link
          to={`/credit/${row.creditPersonId}`}
          className="font-bold text-ink-900 hover:text-brand-600 hover:underline"
        >
          {row.person?.name ?? "-"}
        </Link>
      ),
    },
    {
      key: "account",
      header: "Account",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-ink-500">{row.account?.name ?? "-"}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="text-ink-600">
          {row.description ?? (row.type === "payment" ? "Payment received" : "Credit given")}
          {row.order && (
            <Badge tone="info" className="ml-2">
              bill #{row.order.orderNumber}
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "credit",
      header: "Credit given",
      align: "right",
      render: (row) =>
        row.type === "payment" ? (
          <span className="text-ink-300">-</span>
        ) : (
          <span className="tabular font-bold text-red-600">{money(row.amount)}</span>
        ),
    },
    {
      key: "paid",
      header: "Received",
      align: "right",
      render: (row) =>
        row.type === "payment" ? (
          <span className="tabular font-bold text-emerald-600">{money(row.amount)}</span>
        ) : (
          <span className="text-ink-300">-</span>
        ),
    },
  ];

  const net = (data?.totals.given ?? 0) - (data?.totals.received ?? 0);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Credit Movements"
        subtitle="Everything given out and taken back across all khata accounts"
        actions={<PrintButton onClick={printPage} />}
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Credit Movements</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker
        from={range.from}
        to={range.to}
        onChange={setRange}
        actions={
          <SelectFilter
            label="Type"
            value={type}
            onChange={setType}
            allLabel="All movements"
            options={[
              { value: "credit", label: "Credit given" },
              { value: "payment", label: "Payments received" },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Entries" value={data?.rows.length ?? 0} icon={<FiCreditCard />} />
        <StatTile label="Credit Given" value={money(data?.totals.given ?? 0)} tone="warning" />
        <StatTile label="Payments Received" value={money(data?.totals.received ?? 0)} tone="success" />
        <StatTile
          label="Net Movement"
          value={money(Math.abs(net))}
          sub={net > 0 ? "more went out than came back" : "more came back than went out"}
          tone={net > 0 ? "danger" : "success"}
        />
      </div>

      <Card padded={false} className="print-sheet overflow-hidden">
        <DataTable
          rows={data?.rows ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={<FiPrinter />}
              title="No credit movements in this period"
              message="Bills sent to credit and payments received will show up here."
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3" colSpan={4}>
                Totals
              </td>
              <td className="tabular px-3 py-3 text-right text-red-600">
                {money(data?.totals.given ?? 0)}
              </td>
              <td className="tabular px-3 py-3 text-right text-emerald-600">
                {money(data?.totals.received ?? 0)}
              </td>
            </tr>
          }
        />
      </Card>
    </div>
  );
};

export default CreditMovements;
