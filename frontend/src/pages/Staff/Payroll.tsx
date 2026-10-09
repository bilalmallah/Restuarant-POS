import { useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { FiPrinter, FiCalendar, FiArrowRight, FiCheckCircle } from "react-icons/fi";

import { useGetPayrollSummaryQuery, usePostSalariesMutation } from "../../features/posApi";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { money, formatDate, toMonthInput, presetRange, titleCase } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import DataTable, { type Column } from "../../components/ui/DataTable";
import { Badge, Button, Card, Input, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader, { RangePicker, PrintButton } from "../../components/layout/PageHeader";
import type { PayrollRow } from "../../types";

const Payroll = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const printPage = usePrintPage();

  const [range, setRange] = useState(() => presetRange("month"));
  const [postOpen, setPostOpen] = useState(false);
  const [periodMonth, setPeriodMonth] = useState(() => toMonthInput());

  const { data, isLoading } = useGetPayrollSummaryQuery({ from: range.from, to: range.to });
  const [postSalaries, { isLoading: posting }] = usePostSalariesMutation();

  useHotkeys([{ combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true }]);

  /**
   * Nothing is owed until it is posted. That is what stops someone who joined
   * on the 20th from appearing to be owed a full month.
   */
  const runPosting = async () => {
    try {
      const result = await postSalaries({ periodMonth }).unwrap();

      toast.success(result.message);
      if (result.skipped.length) {
        toast.info(
          `Skipped ${result.skipped.length}: ${result.skipped.map((row) => row.name).join(", ")}`
        );
      }
      setPostOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not post salaries"));
    }
  };

  const payLabel = (row: PayrollRow) => {
    if (row.payType === "monthly") return `${money(row.monthlySalary)}/month`;
    if (row.payType === "daily") return `${money(row.dailyWage)}/day`;
    return `${row.commissionPercent}% commission`;
  };

  const columns: Column<PayrollRow>[] = [
    {
      key: "name",
      header: "Employee",
      render: (row) => (
        <div>
          <span className="font-bold text-ink-900">{row.name}</span>
          <span className="block text-xs text-ink-500">
            {titleCase(row.role)} · {payLabel(row)}
          </span>
        </div>
      ),
    },
    {
      key: "payType",
      header: "Pay type",
      hideOnMobile: true,
      render: (row) => (
        <Badge
          tone={row.payType === "monthly" ? "brand" : row.payType === "daily" ? "info" : "warning"}
        >
          {row.payType}
        </Badge>
      ),
    },
    {
      key: "earned",
      header: "Earned",
      align: "right",
      render: (row) => <span className="tabular font-semibold">{money(row.periodEarned)}</span>,
    },
    {
      key: "commission",
      header: "Commission",
      align: "right",
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular text-brand-700">{money(row.periodCommission)}</span>
      ),
    },
    {
      key: "advance",
      header: "Advances",
      align: "right",
      render: (row) => (
        <span className={clsx("tabular", row.periodAdvance > 0 && "text-amber-700")}>
          {money(row.periodAdvance)}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Paid out",
      align: "right",
      render: (row) => (
        <span className="tabular text-emerald-600">{money(row.periodPaid)}</span>
      ),
    },
    {
      key: "pending",
      header: "Pending now",
      align: "right",
      render: (row) => (
        <span
          className={clsx(
            "tabular text-base font-extrabold",
            row.pending > 0 ? "text-red-600" : row.pending < 0 ? "text-sky-700" : "text-ink-400"
          )}
        >
          {money(row.pending)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "60px",
      className: "no-print",
      render: (row) => (
        <Button
          size="sm"
          variant="ghost"
          icon={<FiArrowRight />}
          className="no-print"
          onClick={() => navigate(`/staff/${row.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Payroll"
        subtitle="What each person earned in this period, and what is still owed to them right now"
        actions={
          <>
            <PrintButton onClick={printPage} />
            <Button size="lg" icon={<FiCalendar />} onClick={() => setPostOpen(true)}>
              Post Salaries
            </Button>
          </>
        }
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Payroll Summary</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile label="Earned in period" value={money(data?.totals.earned ?? 0)} tone="brand" />
        <StatTile label="Commission" value={money(data?.totals.commission ?? 0)} />
        <StatTile label="Advances taken" value={money(data?.totals.advance ?? 0)} tone="warning" />
        <StatTile label="Paid out" value={money(data?.totals.paid ?? 0)} tone="success" />
        <StatTile
          label="Still pending"
          value={money(data?.totals.pending ?? 0)}
          sub="all time, not just this period"
          tone={(data?.totals.pending ?? 0) > 0 ? "danger" : "default"}
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
              title="No active employees"
              message="Add your staff first, then their pay appears here."
              action={<Button onClick={() => navigate("/staff")}>Go to Employees</Button>}
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3" colSpan={2}>
                Totals
              </td>
              <td className="tabular px-3 py-3 text-right">{money(data?.totals.earned ?? 0)}</td>
              <td className="tabular hidden px-3 py-3 text-right sm:table-cell">
                {money(data?.totals.commission ?? 0)}
              </td>
              <td className="tabular px-3 py-3 text-right">{money(data?.totals.advance ?? 0)}</td>
              <td className="tabular px-3 py-3 text-right">{money(data?.totals.paid ?? 0)}</td>
              <td className="tabular px-3 py-3 text-right text-base">
                {money(data?.totals.pending ?? 0)}
              </td>
              <td className="no-print" />
            </tr>
          }
        />
      </Card>

      <Modal
        open={postOpen}
        onClose={() => setPostOpen(false)}
        title="Post salaries for a month"
        subtitle="Adds one salary entry per monthly employee, and one wage entry per daily worker"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPostOpen(false)}>
              Cancel
            </Button>
            <Button loading={posting} onClick={runPosting} icon={<FiCheckCircle />}>
              Post salaries
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Month"
            type="month"
            value={periodMonth}
            onChange={(event) => setPeriodMonth(event.target.value)}
            autoFocus
          />

          <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-200">
            Anyone whose salary is already posted for {periodMonth} is skipped, so running this
            twice is safe. Advances already taken this month are automatically deducted from what is
            pending.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <FiPrinter className="mr-1 inline size-3.5" />
            Commission-only staff are not included - their commission posts automatically when each
            bill is settled.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Payroll;
