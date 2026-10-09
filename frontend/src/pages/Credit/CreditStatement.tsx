import { useState } from "react";
import { useParams } from "react-router-dom";
import clsx from "clsx";
import { FiPlus, FiPrinter, FiTrash2, FiDollarSign, FiCreditCard, FiLayers } from "react-icons/fi";

import {
  useGetCreditStatementQuery,
  useCreateCreditTransactionMutation,
  useDeleteCreditTransactionMutation,
  useCreateCreditAccountMutation,
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
import type { CreditEntry } from "../../types";

const CreditStatement = () => {
  const { id } = useParams();
  const personId = Number(id);
  const toast = useToast();
  const { isManager } = useCan();
  const printPage = usePrintPage();

  const [range, setRange] = useState(() => presetRange("month"));
  const [accountId, setAccountId] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deleting, setDeleting] = useState<CreditEntry | null>(null);

  const [entry, setEntry] = useState({
    type: "payment" as "credit" | "payment",
    creditAccountId: "",
    amount: "",
    entryDate: toDateInput(),
    paymentMethod: "cash",
    description: "",
  });
  const [accountName, setAccountName] = useState("");

  const { data, isLoading } = useGetCreditStatementQuery({
    id: personId,
    from: range.from,
    to: range.to,
    ...(accountId ? { accountId: Number(accountId) } : {}),
  });

  const [createTransaction, { isLoading: saving }] = useCreateCreditTransactionMutation();
  const [deleteTransaction, { isLoading: deletingNow }] = useDeleteCreditTransactionMutation();
  const [createAccount, { isLoading: addingAccount }] = useCreateCreditAccountMutation();

  const openEntry = (type: "credit" | "payment") => {
    setEntry({
      type,
      creditAccountId: accountId || String(data?.accounts[0]?.id ?? ""),
      amount: "",
      entryDate: toDateInput(),
      paymentMethod: "cash",
      description: "",
    });
    setEntryOpen(true);
  };

  useHotkeys(
    [
      { combo: SHORTCUTS.addNew.combo, handler: () => openEntry("payment") },
      { combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true },
    ],
    [data, accountId]
  );

  const saveEntry = async () => {
    try {
      const result = await createTransaction({
        id: personId,
        body: {
          creditAccountId: Number(entry.creditAccountId),
          type: entry.type,
          amount: Number(entry.amount) || 0,
          entryDate: entry.entryDate,
          paymentMethod: entry.type === "payment" ? entry.paymentMethod : null,
          description: entry.description.trim() || null,
        },
      }).unwrap();

      toast.success(`${result.message}. Balance is now ${money(result.balance)}`);
      setEntryOpen(false);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the entry"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;

    try {
      await deleteTransaction({ id: personId, transactionId: deleting.id }).unwrap();
      toast.success("Entry deleted");
      setDeleting(null);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not delete the entry"));
    }
  };

  if (isLoading || !data) return <Loader label="Loading the statement" />;

  const { person, accounts, summary, entries } = data;
  const balance = summary.closingBalance;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title={person.name}
        subtitle={[person.company, person.phone].filter(Boolean).join(" · ") || "Credit account"}
        backTo="/credit"
        actions={
          <>
            <Button variant="secondary" size="lg" icon={<FiPrinter />} hint="Ctrl+P" onClick={printPage}>
              Print
            </Button>
            <Button
              size="lg"
              variant="accent"
              icon={<FiCreditCard />}
              onClick={() => openEntry("credit")}
            >
              Give Credit
            </Button>
            <Button size="lg" variant="success" icon={<FiDollarSign />} onClick={() => openEntry("payment")}>
              Receive Payment
            </Button>
          </>
        }
      />

      {/* Printed header - only appears on paper. */}
      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Credit Statement · {person.name}</p>
        <p className="text-xs">
          {formatDate(range.from)} to {formatDate(range.to)}
        </p>
      </div>

      <RangePicker
        from={range.from}
        to={range.to}
        onChange={setRange}
        actions={
          accounts.length > 1 && (
            <Select
              label="Account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              wrapperClassName="w-48"
            >
              <option value="">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          )
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Opening Balance" value={money(summary.openingBalance)} />
        <StatTile label="Credit Given" value={money(summary.totalCredit)} tone="warning" />
        <StatTile label="Payments Received" value={money(summary.totalPaid)} tone="success" />
        <StatTile
          label={balance > 0 ? "Still Owes" : balance < 0 ? "Advance Held" : "Settled"}
          value={money(Math.abs(balance))}
          tone={balance > 0 ? "danger" : balance < 0 ? "success" : "default"}
        />
      </div>

      {/* ---------------- Accounts ---------------- */}
      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-ink-800">
            <FiLayers className="size-4" /> Accounts
          </h2>
          {isManager && (
            <Button size="sm" variant="secondary" icon={<FiPlus />} onClick={() => setAccountOpen(true)}>
              Add account
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="min-w-40 rounded-lg border border-ink-200 bg-ink-50 px-3 py-2"
            >
              <p className="text-sm font-bold text-ink-800">{account.name}</p>
              <p
                className={clsx(
                  "tabular text-lg font-extrabold",
                  (account.balance ?? 0) > 0 ? "text-red-600" : "text-emerald-600"
                )}
              >
                {money(account.balance ?? 0)}
              </p>
              {Number(account.openingBalance) > 0 && (
                <p className="text-[10px] text-ink-400">
                  opened at {money(account.openingBalance)}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ---------------- Ledger ---------------- */}
      <Card padded={false} className="print-sheet overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            title="No entries in this period"
            message="Widen the date range, or record a credit or payment above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-[11px] tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold">Date</th>
                  <th className="px-3 py-2.5 text-left font-bold">Description</th>
                  <th className="px-3 py-2.5 text-left font-bold">Account</th>
                  <th className="px-3 py-2.5 text-right font-bold">Credit</th>
                  <th className="px-3 py-2.5 text-right font-bold">Paid</th>
                  <th className="px-3 py-2.5 text-right font-bold">Balance</th>
                  <th className="no-print w-10" />
                </tr>
              </thead>

              <tbody>
                {/*
                  Newest first, the way a bank statement reads: the entry you
                  just made is the one you want to see without scrolling.
                  The running balance is still calculated oldest-first on the
                  server, so each row shows the balance as it stood that day -
                  only the display order is flipped.
                */}
                {[...entries].reverse().map((row) => {
                  const isPayment = row.type === "payment";

                  return (
                    <tr key={row.id} className="print-row border-b border-ink-100 hover:bg-ink-50">
                      <td className="px-3 py-2.5 whitespace-nowrap text-ink-600">
                        {formatDate(row.entryDate)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-ink-800">
                          {row.description ?? (isPayment ? "Payment received" : "Credit given")}
                        </span>
                        {row.order && (
                          <Badge tone="info" className="ml-2">
                            bill #{row.order.orderNumber}
                          </Badge>
                        )}
                        {isPayment && row.paymentMethod && (
                          <span className="ml-2 text-xs text-ink-400">via {row.paymentMethod}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-ink-500">{row.account?.name ?? "-"}</td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-red-600">
                        {isPayment ? "" : money(row.amount, false)}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-semibold text-emerald-600">
                        {isPayment ? money(row.amount, false) : ""}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right font-bold text-ink-900">
                        {money(row.runningBalance ?? 0, false)}
                      </td>
                      <td className="no-print px-1">
                        {isManager && !row.orderId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<FiTrash2 />}
                            className="text-red-400 hover:bg-red-50"
                            onClick={() => setDeleting(row)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* The opening figure is the oldest line, so it sits last. */}
                <tr className="border-b border-ink-100 bg-ink-50/60 text-xs">
                  <td className="px-3 py-2 font-bold text-ink-500" colSpan={5}>
                    Brought forward
                  </td>
                  <td className="tabular px-3 py-2 text-right font-bold">
                    {money(summary.openingBalance)}
                  </td>
                  <td className="no-print" />
                </tr>
              </tbody>

              <tfoot className="border-t-2 border-ink-300 bg-ink-50">
                <tr className="font-extrabold">
                  <td className="px-3 py-3" colSpan={3}>
                    Closing balance
                  </td>
                  <td className="tabular px-3 py-3 text-right text-red-600">
                    {money(summary.totalCredit, false)}
                  </td>
                  <td className="tabular px-3 py-3 text-right text-emerald-600">
                    {money(summary.totalPaid, false)}
                  </td>
                  <td className="tabular px-3 py-3 text-right text-base">
                    {money(balance, false)}
                  </td>
                  <td className="no-print" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <div className="print-only mt-8 flex justify-between text-xs">
        <span className="border-t border-black pt-1">Customer signature</span>
        <span className="border-t border-black pt-1">For {brand.name}</span>
      </div>

      {/* ---------------- Entry dialog ---------------- */}
      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title={entry.type === "payment" ? "Receive a payment" : "Give credit"}
        subtitle={
          entry.type === "payment"
            ? `${person.name} currently owes ${money(balance)}`
            : "Record food given on account outside the till"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setEntryOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={entry.type === "payment" ? "success" : "accent"}
              loading={saving}
              onClick={saveEntry}
              disabled={!entry.amount || !entry.creditAccountId}
            >
              {entry.type === "payment" ? "Record payment" : "Add credit"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Account"
            required
            value={entry.creditAccountId}
            onChange={(event) => setEntry({ ...entry, creditAccountId: event.target.value })}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} — {money(account.balance ?? 0)}
              </option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyInput
              label="Amount"
              required
              value={entry.amount}
              onChange={(event) => setEntry({ ...entry, amount: event.target.value })}
              autoFocus
            />
            <Input
              label="Date"
              type="date"
              value={entry.entryDate}
              onChange={(event) => setEntry({ ...entry, entryDate: event.target.value })}
            />
          </div>

          {entry.type === "payment" && (
            <>
              <Select
                label="Received as"
                value={entry.paymentMethod}
                onChange={(event) => setEntry({ ...entry, paymentMethod: event.target.value })}
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="online">Online</option>
              </Select>

              {balance > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEntry({ ...entry, amount: String(balance) })}
                    className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-200"
                  >
                    Full {money(balance)}
                  </button>
                  {[0.5, 0.25].map((fraction) => (
                    <button
                      key={fraction}
                      type="button"
                      onClick={() =>
                        setEntry({ ...entry, amount: String(Math.round(balance * fraction)) })
                      }
                      className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-200"
                    >
                      {fraction * 100}% — {money(Math.round(balance * fraction))}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <Input
            label="Note"
            value={entry.description}
            onChange={(event) => setEntry({ ...entry, description: event.target.value })}
            placeholder={entry.type === "payment" ? "Part payment" : "Function catering"}
          />

          {entry.type === "payment" && Number(entry.amount) > 0 && (
            <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm text-ink-600 ring-1 ring-ink-200">
              After this payment {person.name} will owe{" "}
              <strong className="text-ink-900">{money(balance - Number(entry.amount))}</strong>.
            </p>
          )}
        </div>
      </Modal>

      {/* ---------------- Add account ---------------- */}
      <Modal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        title="Add another account"
        subtitle="Useful when one person keeps a company book and a personal one"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAccountOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={addingAccount}
              disabled={!accountName.trim()}
              onClick={async () => {
                try {
                  await createAccount({
                    id: personId,
                    body: { name: accountName.trim(), openingBalance: 0, isActive: true },
                  }).unwrap();
                  toast.success("Account added");
                  setAccountName("");
                  setAccountOpen(false);
                } catch (caught) {
                  toast.error(errorMessage(caught, "Could not add the account"));
                }
              }}
            >
              Add account
            </Button>
          </>
        }
      >
        <Input
          label="Account name"
          required
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          placeholder="Office lunches"
          autoFocus
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingNow}
        title="Delete this entry?"
        message="The balance will be recalculated. Entries created by settling a bill cannot be deleted here - cancel the bill instead."
      />
    </div>
  );
};

export default CreditStatement;
