import { useState } from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import { FiPlus, FiPrinter, FiTrash2, FiDollarSign, FiTrendingDown, FiTrendingUp } from "react-icons/fi";

import {
  useGetEmployeeStatementQuery,
  useCreateLedgerEntryMutation,
  useDeleteLedgerEntryMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { usePrintPage } from "../../hooks/usePrint";
import brand from "../../app/brand";
import { money, formatDate, toDateInput, toMonthInput, presetRange, titleCase } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import {
  Badge,
  Button,
  Card,
  Input,
  MoneyInput,
  Select,
  Loader,
  EmptyState,
  StatTile,
} from "../../components/ui/primitives";
import PageHeader, { RangePicker } from "../../components/layout/PageHeader";
import type { LedgerEntry, LedgerType } from "../../types";

/**
 * Credits are what the restaurant owes; debits are what has already left its
 * hands. Labelling them in plain words rather than "Dr/Cr" matters - the person
 * this statement gets handed to is not an accountant.
 */
const ENTRY_TYPES: { value: LedgerType; label: string; credit: boolean; hint: string }[] = [
  { value: "salary", label: "Salary", credit: true, hint: "A month's salary becoming due" },
  { value: "wage", label: "Daily wage", credit: true, hint: "One day worked" },
  { value: "commission", label: "Commission", credit: true, hint: "Earned on sales" },
  { value: "bonus", label: "Bonus", credit: true, hint: "Eid money, tips, extra" },
  { value: "advance", label: "Advance taken", credit: false, hint: "Emergency cash, recovered from salary" },
  { value: "payment", label: "Paid out", credit: false, hint: "Money actually handed over" },
  { value: "deduction", label: "Deduction", credit: false, hint: "Fine, breakage, unpaid leave" },
];

const isCredit = (type: LedgerType) =>
  ENTRY_TYPES.find((entry) => entry.value === type)?.credit ?? false;

const EmployeeLedgerPage = () => {
  const { id } = useParams();
  const employeeId = Number(id);
  const toast = useToast();
  const printPage = usePrintPage();

  const [range, setRange] = useState(() => presetRange("month"));
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<LedgerEntry | null>(null);
  const [form, setForm] = useState({
    type: "payment" as LedgerType,
    amount: "",
    entryDate: toDateInput(),
    periodMonth: toMonthInput(),
    description: "",
  });

  const { data, isLoading } = useGetEmployeeStatementQuery({
    id: employeeId,
    from: range.from,
    to: range.to,
  });

  const [createEntry, { isLoading: saving }] = useCreateLedgerEntryMutation();
  const [deleteEntry, { isLoading: deletingNow }] = useDeleteLedgerEntryMutation();

  const openForm = (type: LedgerType) => {
    setForm({
      type,
      amount: "",
      entryDate: toDateInput(),
      periodMonth: toMonthInput(),
      description: "",
    });
    setFormOpen(true);
  };

  useHotkeys(
    [
      { combo: SHORTCUTS.addNew.combo, handler: () => openForm("payment") },
      { combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true },
    ],
    [data]
  );

  const save = async () => {
    try {
      await createEntry({
        employeeId,
        type: form.type,
        amount: Number(form.amount) || 0,
        entryDate: form.entryDate,
        periodMonth: form.type === "salary" ? form.periodMonth : null,
        description: form.description.trim() || null,
      }).unwrap();

      toast.success("Entry saved");
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the entry"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteEntry(deleting.id).unwrap();
      toast.success("Entry deleted");
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the entry"));
    }
  };

  if (isLoading || !data) return <Loader label="Loading the statement" />;

  const { employee, summary, entries, sales } = data;

  const payDescription =
    employee.payType === "monthly"
      ? `${money(employee.monthlySalary)} per month`
      : employee.payType === "daily"
        ? `${money(employee.dailyWage)} per day`
        : `${Number(employee.commissionPercent)}% commission`;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={employee.name}
        subtitle={`${titleCase(employee.role)} · ${payDescription}`}
        backTo="/staff"
        actions={
          <>
            <Button variant="secondary" size="lg" icon={<FiPrinter />} hint="Ctrl+P" onClick={printPage}>
              Print
            </Button>
            <Button
              size="lg"
              variant="secondary"
              icon={<FiTrendingDown />}
              onClick={() => openForm("advance")}
            >
              Advance
            </Button>
            <Button size="lg" variant="success" icon={<FiDollarSign />} onClick={() => openForm("payment")}>
              Pay Out
            </Button>
          </>
        }
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Salary Statement · {employee.name}</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)} · {payDescription}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total Earned"
          value={money(summary.earned)}
          sub="salary, wages, commission and bonus"
          tone="brand"
        />
        <StatTile label="Advances Taken" value={money(summary.advance)} tone="warning" />
        <StatTile label="Already Paid" value={money(summary.settled)} tone="success" />
        <StatTile
          label={summary.pending >= 0 ? "Still Pending" : "Over-drawn"}
          value={money(Math.abs(summary.pending))}
          sub={summary.pending >= 0 ? "you owe this" : "to recover from salary"}
          tone={summary.pending > 0 ? "danger" : summary.pending < 0 ? "warning" : "default"}
        />
      </div>

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      {/* ---------------- Quick actions ---------------- */}
      <div className="no-print mb-4 flex flex-wrap gap-2">
        {ENTRY_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => openForm(type.value)}
            title={type.hint}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
              type.credit
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            )}
          >
            <FiPlus className="size-3" />
            {type.label}
          </button>
        ))}
      </div>

      {/* ---------------- Ledger ---------------- */}
      <Card padded={false} className="print-sheet mb-4 overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            title="No entries in this period"
            message="Post a salary, record an advance, or widen the date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-[11px] tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">Date</th>
                  <th className="px-3 py-2.5 text-left font-bold">Entry</th>
                  <th className="px-3 py-2.5 text-left font-bold">Description</th>
                  <th className="px-3 py-2.5 text-right font-bold">Earned</th>
                  <th className="px-3 py-2.5 text-right font-bold">Taken / Paid</th>
                  <th className="px-3 py-2.5 text-right font-bold">Balance</th>
                  <th className="no-print w-10" />
                </tr>
              </thead>

              <tbody>
                {/*
                  Newest first, matching the credit statement. The running
                  balance is still worked out oldest-first, so each row shows the
                  balance as it stood on that date - only the order is flipped.
                */}
                {[...entries].reverse().map((entry) => {
                  const credit = isCredit(entry.type);

                  return (
                    <tr key={entry.id} className="print-row border-b border-ink-100 hover:bg-ink-50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-ink-600">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={credit ? "success" : "warning"} className="capitalize">
                          {entry.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-ink-600">
                        {entry.description ?? "-"}
                        {entry.periodMonth && (
                          <span className="ml-1 text-xs text-ink-400">({entry.periodMonth})</span>
                        )}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-emerald-600">
                        {credit ? money(entry.amount, false) : ""}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-amber-700">
                        {credit ? "" : money(entry.amount, false)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-bold text-ink-900">
                        {money(entry.runningBalance ?? 0, false)}
                      </td>
                      <td className="no-print px-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<FiTrash2 />}
                          className="text-red-400 hover:bg-red-50"
                          onClick={() => setDeleting(entry)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr className="font-extrabold">
                  <td className="px-3 py-3" colSpan={3}>
                    Pending balance
                  </td>
                  <td className="tabular px-3 py-3 text-right text-emerald-600">
                    {money(summary.earned, false)}
                  </td>
                  <td className="tabular px-3 py-3 text-right text-amber-700">
                    {money(summary.settled + summary.advance, false)}
                  </td>
                  <td className="tabular px-3 py-3 text-right text-base">
                    {money(summary.pending, false)}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* ---------------- Sales by this person ---------------- */}
      {employee.isWaiter && (
        <Card className="no-print">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-ink-800">
              <FiTrendingUp className="size-4" /> What {employee.name.split(" ")[0]} sold in this
              period
            </h2>
            <div className="flex gap-4 text-sm">
              <span className="text-ink-500">
                {sales.orderCount} bills ·{" "}
                <strong className="text-ink-800">{money(sales.totalSales)}</strong>
              </span>
              <span className="text-ink-500">
                commission earned{" "}
                <strong className="text-brand-700">{money(sales.totalCommission)}</strong>
              </span>
            </div>
          </div>

          {sales.orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-ink-400">No bills in this period.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {sales.orders.slice(0, 40).map((order) => (
                <span
                  key={order.id}
                  className="rounded-lg border border-ink-200 bg-ink-50 px-2 py-1 text-xs"
                  title={formatDate(order.businessDate)}
                >
                  #{order.orderNumber}{" "}
                  <strong className="tabular text-ink-800">{money(order.total)}</strong>
                </span>
              ))}
              {sales.orders.length > 40 && (
                <span className="px-2 py-1 text-xs text-ink-400">
                  +{sales.orders.length - 40} more
                </span>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="print-only mt-8 flex justify-between text-xs">
        <span className="border-t border-black pt-1">Received by ({employee.name})</span>
        <span className="border-t border-black pt-1">For {brand.name}</span>
      </div>

      {/* ---------------- Entry form ---------------- */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={`Add an entry for ${employee.name}`}
        subtitle={
          summary.pending >= 0
            ? `Currently pending: ${money(summary.pending)}`
            : `Currently over-drawn by ${money(Math.abs(summary.pending))}`
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={save} disabled={!form.amount}>
              Save entry
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Entry type"
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as LedgerType })}
            hint={ENTRY_TYPES.find((type) => type.value === form.type)?.hint}
          >
            {ENTRY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label} — {type.credit ? "increases what you owe" : "reduces what you owe"}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyInput
              label="Amount"
              required
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              autoFocus
            />
            <Input
              label="Date"
              type="date"
              value={form.entryDate}
              onChange={(event) => setForm({ ...form, entryDate: event.target.value })}
            />
          </div>

          {form.type === "salary" && (
            <Input
              label="For which month"
              type="month"
              value={form.periodMonth}
              onChange={(event) => setForm({ ...form, periodMonth: event.target.value })}
              hint="Stops the same month being posted twice by mistake"
            />
          )}

          {form.type === "payment" && summary.pending > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setForm({ ...form, amount: String(summary.pending) })}
                className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-200"
              >
                Settle in full — {money(summary.pending)}
              </button>
            </div>
          )}

          <Input
            label="Note"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Optional"
          />

          {form.amount && (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-200">
              After this entry the pending balance becomes{" "}
              <strong className="text-ink-900">
                {money(
                  summary.pending +
                    (isCredit(form.type) ? 1 : -1) * (Number(form.amount) || 0)
                )}
              </strong>
              .
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title="Delete this entry?"
        message="The pending balance will be recalculated without it."
      />
    </div>
  );
};

export default EmployeeLedgerPage;
