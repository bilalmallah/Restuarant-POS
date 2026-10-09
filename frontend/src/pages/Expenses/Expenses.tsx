import { useRef, useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiDollarSign } from "react-icons/fi";

import {
  useListExpensesQuery,
  useListExpenseCategoriesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import { usePrintPage } from "../../hooks/usePrint";
import { useCan } from "../../hooks/useStore";
import brand from "../../app/brand";
import { money, formatDate, toDateInput, presetRange } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal, ConfirmDialog } from "../../components/ui/Modal";
import DataTable, { type Column } from "../../components/ui/DataTable";
import {
  Badge,
  Button,
  Card,
  Input,
  MoneyInput,
  Select,
  Textarea,
  EmptyState,
  StatTile,
} from "../../components/ui/primitives";
import PageHeader, { FilterBar, RangePicker, SelectFilter, PrintButton } from "../../components/layout/PageHeader";
import type { Expense } from "../../types";

const emptyForm = {
  entryDate: toDateInput(),
  category: "Kitchen Purchase",
  title: "",
  amount: "",
  paidTo: "",
  paymentMethod: "cash",
  billNumber: "",
  note: "",
};

const Expenses = () => {
  const toast = useToast();
  const { isManager } = useCan();
  const printPage = usePrintPage();

  const [range, setRange] = useState(() => presetRange("month"));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);

  const searchRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useListExpensesQuery({
    from: range.from,
    to: range.to,
    search,
    category,
  });
  const { data: categories = [] } = useListExpenseCategoriesQuery();

  const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
  const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
  const [deleteExpense, { isLoading: deletingNow }] = useDeleteExpenseMutation();

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, entryDate: toDateInput(), category: categories[0] ?? "Other" });
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      entryDate: expense.entryDate,
      category: expense.category,
      title: expense.title,
      amount: String(expense.amount),
      paidTo: expense.paidTo ?? "",
      paymentMethod: expense.paymentMethod,
      billNumber: expense.billNumber ?? "",
      note: expense.note ?? "",
    });
    setFormOpen(true);
  };

  useHotkeys([
    { combo: SHORTCUTS.addNew.combo, handler: openNew },
    { combo: SHORTCUTS.search.combo, handler: () => searchRef.current?.focus() },
    { combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true },
  ]);

  const save = async () => {
    const body = {
      entryDate: form.entryDate,
      category: form.category,
      title: form.title.trim(),
      amount: Number(form.amount) || 0,
      paidTo: form.paidTo.trim() || null,
      paymentMethod: form.paymentMethod,
      billNumber: form.billNumber.trim() || null,
      note: form.note.trim() || null,
    };

    try {
      if (editing) {
        await updateExpense({ id: editing.id, body }).unwrap();
        toast.success("Expense updated");
      } else {
        await createExpense(body).unwrap();
        toast.success(`${money(body.amount)} expense saved`);
      }
      setFormOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the expense"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteExpense(deleting.id).unwrap();
      toast.success("Expense deleted");
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the expense"));
    }
  };

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      render: (expense) => (
        <span className="whitespace-nowrap text-ink-600">{formatDate(expense.entryDate)}</span>
      ),
    },
    {
      key: "title",
      header: "Expense",
      render: (expense) => (
        <div>
          <span className="font-bold text-ink-900">{expense.title}</span>
          {expense.paidTo && <span className="block text-xs text-ink-500">to {expense.paidTo}</span>}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (expense) => <Badge tone="brand">{expense.category}</Badge>,
    },
    {
      key: "method",
      header: "Paid by",
      hideOnMobile: true,
      render: (expense) => <span className="text-ink-600 capitalize">{expense.paymentMethod}</span>,
    },
    {
      key: "bill",
      header: "Bill #",
      hideOnMobile: true,
      render: (expense) => expense.billNumber ?? <span className="text-ink-300">-</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (expense) => (
        <span className="tabular text-base font-extrabold text-ink-900">
          {money(expense.amount)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "90px",
      className: "no-print",
      render: (expense) => (
        <div className="no-print flex justify-end gap-1">
          <Button size="sm" variant="ghost" icon={<FiEdit2 />} onClick={() => openEdit(expense)} />
          {isManager && (
            <Button
              size="sm"
              variant="ghost"
              icon={<FiTrash2 />}
              className="text-red-500 hover:bg-red-50"
              onClick={() => setDeleting(expense)}
            />
          )}
        </div>
      ),
    },
  ];

  const biggest = data?.byCategory[0];

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Expenses"
        subtitle="Everything the restaurant spends, so the day book shows what is really left"
        actions={
          <>
            <PrintButton onClick={printPage} />
            <Button size="lg" icon={<FiPlus />} hint="Ctrl+N" onClick={openNew}>
              Add Expense
            </Button>
          </>
        }
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Expense Report</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker from={range.from} to={range.to} onChange={setRange} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Total Spent"
          value={money(data?.totals.amount ?? 0)}
          tone="danger"
          icon={<FiDollarSign />}
        />
        <StatTile label="Entries" value={data?.totals.count ?? 0} />
        <StatTile
          label="Biggest Category"
          value={biggest?.category ?? "-"}
          sub={biggest ? money(biggest.amount) : undefined}
          tone="warning"
        />
        <StatTile
          label="Daily Average"
          value={money(
            (data?.totals.amount ?? 0) /
              Math.max(
                1,
                Math.round(
                  (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86_400_000
                ) + 1
              )
          )}
        />
      </div>

      {(data?.byCategory.length ?? 0) > 0 && (
        <Card className="no-print mb-4">
          <p className="mb-2 text-sm font-bold text-ink-700">Where the money went</p>
          <div className="space-y-1.5">
            {data?.byCategory.slice(0, 6).map((row) => {
              const share = (row.amount / (data.totals.amount || 1)) * 100;

              return (
                <div key={row.category} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-xs font-semibold text-ink-600">
                    {row.category}
                  </span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-ink-100">
                    <div
                      className="h-full rounded bg-brand-500"
                      style={{ width: `${Math.max(share, 2)}%` }}
                    />
                  </div>
                  <span className="tabular w-24 shrink-0 text-right text-xs font-bold text-ink-800">
                    {money(row.amount)}
                  </span>
                  <span className="tabular w-12 shrink-0 text-right text-xs text-ink-400">
                    {share.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <FilterBar
        search={search}
        onSearch={setSearch}
        searchRef={searchRef}
        placeholder="Search expenses, suppliers or bill numbers  (Ctrl+K)"
      >
        <SelectFilter
          label="Category"
          value={category}
          onChange={setCategory}
          allLabel="All categories"
          options={categories.map((name) => ({ value: name, label: name }))}
        />
      </FilterBar>

      <Card padded={false} className="print-sheet overflow-hidden">
        <DataTable
          rows={data?.rows ?? []}
          columns={columns}
          rowKey={(expense) => expense.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={<FiDollarSign />}
              title="No expenses in this period"
              message="Record what you spend so the profit figure in the day book is real."
              action={<Button onClick={openNew}>Add the first expense</Button>}
            />
          }
          footer={
            <tr>
              <td className="px-3 py-3" colSpan={5}>
                Total
              </td>
              <td className="tabular px-3 py-3 text-right text-base">
                {money(data?.totals.amount ?? 0)}
              </td>
              <td className="no-print" />
            </tr>
          }
        />
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit expense" : "Add an expense"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={creating || updating}
              onClick={save}
              disabled={!form.title.trim() || !form.amount}
            >
              {editing ? "Save changes" : "Save expense"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="What was it for"
            required
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Vegetables from the market"
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyInput
              label="Amount"
              required
              value={form.amount}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
            />
            <Input
              label="Date"
              type="date"
              value={form.entryDate}
              onChange={(event) => setForm({ ...form, entryDate: event.target.value })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Category"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              list="expense-categories"
              hint="Pick one or type your own"
            />
            <datalist id="expense-categories">
              {categories.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>

            <Select
              label="Paid by"
              value={form.paymentMethod}
              onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="credit">On credit from supplier</option>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Paid to"
              value={form.paidTo}
              onChange={(event) => setForm({ ...form, paidTo: event.target.value })}
              placeholder="Supplier or person"
            />
            <Input
              label="Bill number"
              value={form.billNumber}
              onChange={(event) => setForm({ ...form, billNumber: event.target.value })}
              placeholder="Optional"
            />
          </div>

          <Textarea
            label="Note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title="Delete this expense?"
        message={`${deleting?.title} (${money(deleting?.amount ?? 0)}) will be removed from your records and reports.`}
      />
    </div>
  );
};

export default Expenses;
