import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FiCreditCard, FiDollarSign, FiPercent, FiPlus, FiSmartphone, FiUser } from "react-icons/fi";

import {
  useListCreditPersonsQuery,
  useSettleOrderMutation,
  useSendOrderToCreditMutation,
  useUpdateOrderMutation,
  useVoidOrderMutation,
} from "../../features/posApi";
import { money } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { Button, Input, MoneyInput, Select, Textarea, Badge } from "../../components/ui/primitives";
import type { Order, PaymentMethod } from "../../types";

/* ------------------------------------------------------------------ */
/* SETTLE (CASH / CARD / ONLINE)                                       */
/* ------------------------------------------------------------------ */

/** Notes a cashier actually holds. Tapping one fills the tendered box. */
const QUICK_NOTES = [50, 100, 500, 1000, 5000];

const METHODS: { value: PaymentMethod; label: string; icon: typeof FiDollarSign }[] = [
  { value: "cash", label: "Cash", icon: FiDollarSign },
  { value: "card", label: "Card", icon: FiCreditCard },
  { value: "online", label: "Online", icon: FiSmartphone },
];

export const SettleDialog = ({
  open,
  order,
  onClose,
  onSettled,
}: {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSettled: (order: Order) => void;
}) => {
  const toast = useToast();
  const [settle, { isLoading }] = useSettleOrderMutation();

  const total = Number(order.total);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [tendered, setTendered] = useState(String(total));

  useEffect(() => {
    if (open) {
      setMethod("cash");
      setTendered(String(total));
    }
  }, [open, total]);

  const tenderedAmount = Number(tendered) || 0;
  const change = tenderedAmount - total;
  const short = change < 0;

  const submit = async () => {
    try {
      const result = await settle({
        id: order.id,
        body: {
          paymentMethod: method,
          // The bill is always settled in full here; anything less is a credit
          // sale and goes through the credit dialog instead.
          paidAmount: total,
          tenderedAmount: Math.max(tenderedAmount, total),
        },
      }).unwrap();

      toast.success(
        result.change > 0 ? `Paid. Return ${money(result.change)} change` : "Payment recorded"
      );
      onSettled(result.data);
      onClose();
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not record the payment"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Take payment"
      subtitle={`Bill #${order.orderNumber}${order.table ? ` · ${order.table.name}` : ""}`}
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" variant="success" loading={isLoading} onClick={submit}>
            Confirm {money(total)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-brand-50 p-4 text-center ring-1 ring-brand-200">
          <p className="text-xs font-bold tracking-wider text-brand-700 uppercase">Amount due</p>
          <p className="tabular text-4xl font-extrabold text-brand-800">{money(total)}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((option) => {
            const Icon = option.icon;
            const active = method === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMethod(option.value)}
                className={clsx(
                  "flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 text-sm font-bold transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-600 hover:border-ink-300"
                )}
              >
                <Icon className="size-5" />
                {option.label}
              </button>
            );
          })}
        </div>

        {method === "cash" && (
          <>
            <MoneyInput
              label="Cash received"
              value={tendered}
              onChange={(event) => setTendered(event.target.value)}
              autoFocus
            />

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTendered(String(total))}
                className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-200"
              >
                Exact
              </button>
              {QUICK_NOTES.filter((note) => note >= total).slice(0, 3).map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setTendered(String(note))}
                  className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-200"
                >
                  {money(note)}
                </button>
              ))}
              {QUICK_NOTES.map((note) => (
                <button
                  key={`add-${note}`}
                  type="button"
                  onClick={() => setTendered(String(tenderedAmount + note))}
                  className="rounded-lg border border-ink-300 px-3 py-1.5 text-xs font-bold text-ink-600 hover:bg-ink-100"
                >
                  +{note}
                </button>
              ))}
            </div>

            <div
              className={clsx(
                "flex items-center justify-between rounded-lg px-4 py-3",
                short ? "bg-red-50 ring-1 ring-red-200" : "bg-emerald-50 ring-1 ring-emerald-200"
              )}
            >
              <span
                className={clsx(
                  "text-sm font-bold",
                  short ? "text-red-700" : "text-emerald-700"
                )}
              >
                {short ? "Still short by" : "Change to return"}
              </span>
              <span
                className={clsx(
                  "tabular text-2xl font-extrabold",
                  short ? "text-red-700" : "text-emerald-700"
                )}
              >
                {money(Math.abs(change))}
              </span>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* SEND TO CREDIT (KHATA)                                              */
/* ------------------------------------------------------------------ */

/**
 * Only people already in the credit book can be chosen, and the account has to
 * be picked explicitly - a bill landing in the wrong book is a fight with a
 * customer three weeks later.
 */
export const CreditDialog = ({
  open,
  order,
  onClose,
  onSettled,
}: {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSettled: (order: Order) => void;
}) => {
  const toast = useToast();
  const { data: people } = useListCreditPersonsQuery({ isActive: "true" });
  const [sendToCredit, { isLoading }] = useSendOrderToCreditMutation();

  const total = Number(order.total);
  const [personId, setPersonId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paidNow, setPaidNow] = useState("0");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setPersonId("");
    setAccountId("");
    setPaidNow("0");
    setDescription("");
  }, [open]);

  const person = useMemo(
    () => people?.rows.find((row) => row.id === Number(personId)),
    [people, personId]
  );

  // Auto-select when there is only one book, so the common case is one tap.
  useEffect(() => {
    if (person?.accounts?.length === 1) setAccountId(String(person.accounts[0].id));
    else setAccountId("");
  }, [person]);

  const paid = Number(paidNow) || 0;
  const onCredit = total - paid;
  const projected = (person?.balance ?? 0) + onCredit;
  const overLimit = Number(person?.creditLimit) > 0 && projected > Number(person?.creditLimit);

  const submit = async () => {
    try {
      const result = await sendToCredit({
        id: order.id,
        body: {
          creditPersonId: Number(personId),
          creditAccountId: Number(accountId),
          paidAmount: paid,
          description: description || null,
        },
      }).unwrap();

      toast.success(result.message);
      onSettled(result.data);
      onClose();
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not put this bill on credit"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Put this bill on credit"
      subtitle={`Bill #${order.orderNumber} · ${money(total)}`}
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            loading={isLoading}
            onClick={submit}
            disabled={!personId || !accountId || onCredit <= 0}
          >
            Add {money(onCredit)} to khata
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select
          label="Credit person"
          required
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
          hint="Only people added to the credit book can take credit"
          autoFocus
        >
          <option value="">Choose who is taking this on credit</option>
          {people?.rows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
              {row.company ? ` (${row.company})` : ""} — owes {money(row.balance ?? 0)}
            </option>
          ))}
        </Select>

        {person && (
          <Select
            label="Account"
            required
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            hint="A person can keep more than one book with you"
          >
            <option value="">Choose the account</option>
            {person.accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        )}

        <MoneyInput
          label="Received now (optional)"
          value={paidNow}
          max={total}
          onChange={(event) => setPaidNow(event.target.value)}
          hint="Part payment: whatever is left goes into the credit book"
        />

        <Input
          label="Note"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={`Bill #${order.orderNumber}`}
        />

        <div className="space-y-1.5 rounded-lg bg-ink-50 p-3 text-sm ring-1 ring-ink-200">
          <div className="flex justify-between">
            <span className="text-ink-600">Bill total</span>
            <span className="tabular font-semibold">{money(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-600">Received now</span>
            <span className="tabular font-semibold">-{money(paid)}</span>
          </div>
          <div className="flex justify-between border-t border-ink-200 pt-1.5 text-base font-extrabold">
            <span>Going on credit</span>
            <span className="tabular text-brand-700">{money(onCredit)}</span>
          </div>

          {person && (
            <p className="border-t border-ink-200 pt-1.5 text-xs text-ink-500">
              {person.name} currently owes {money(person.balance ?? 0)}. After this bill their
              balance becomes <strong className="text-ink-700">{money(projected)}</strong>.
            </p>
          )}
        </div>

        {overLimit && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
            This takes {person?.name} past their {money(Number(person?.creditLimit))} credit limit.
            You can still continue.
          </p>
        )}
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* DISCOUNT & CHARGES                                                  */
/* ------------------------------------------------------------------ */

export const DiscountDialog = ({
  open,
  order,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: Order;
  onClose: () => void;
  onSaved: (order: Order) => void;
}) => {
  const toast = useToast();
  const [updateOrder, { isLoading }] = useUpdateOrderMutation();

  const subtotal = Number(order.subtotal);
  const [type, setType] = useState<"amount" | "percent">(order.discountType);
  const [value, setValue] = useState(String(Number(order.discountValue) || ""));
  const [service, setService] = useState(String(Number(order.serviceCharge) || ""));
  const [delivery, setDelivery] = useState(String(Number(order.deliveryCharge) || ""));

  useEffect(() => {
    if (!open) return;
    setType(order.discountType);
    setValue(String(Number(order.discountValue) || ""));
    setService(String(Number(order.serviceCharge) || ""));
    setDelivery(String(Number(order.deliveryCharge) || ""));
  }, [open, order]);

  const numeric = Number(value) || 0;
  const discount = type === "percent" ? (subtotal * numeric) / 100 : numeric;
  const capped = Math.min(discount, subtotal);
  const newTotal = subtotal - capped + (Number(service) || 0) + (Number(delivery) || 0);

  const submit = async () => {
    try {
      const result = await updateOrder({
        id: order.id,
        body: {
          discountType: type,
          discountValue: numeric,
          serviceCharge: Number(service) || 0,
          deliveryCharge: Number(delivery) || 0,
        },
      }).unwrap();

      toast.success("Bill updated");
      onSaved(result.data);
      onClose();
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not apply the discount"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Discount &amp; charges"
      subtitle={`Subtotal ${money(subtotal)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={isLoading} onClick={submit}>
            Apply
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "amount", label: "Flat amount", icon: FiDollarSign },
              { value: "percent", label: "Percent off", icon: FiPercent },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const active = type === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-bold transition-colors",
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-ink-200 text-ink-600 hover:border-ink-300"
                )}
              >
                <Icon className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        <MoneyInput
          label={type === "percent" ? "Discount percent" : "Discount amount"}
          value={value}
          max={type === "percent" ? 100 : subtotal}
          onChange={(event) => setValue(event.target.value)}
          autoFocus
        />

        {type === "percent" && (
          <div className="flex flex-wrap gap-1.5">
            {[5, 10, 15, 20, 25, 50].map((percent) => (
              <button
                key={percent}
                type="button"
                onClick={() => setValue(String(percent))}
                className="rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-200"
              >
                {percent}%
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            label="Service charge"
            value={service}
            onChange={(event) => setService(event.target.value)}
          />
          <MoneyInput
            label="Delivery charge"
            value={delivery}
            onChange={(event) => setDelivery(event.target.value)}
          />
        </div>

        <div className="space-y-1 rounded-lg bg-ink-50 p-3 text-sm ring-1 ring-ink-200">
          <div className="flex justify-between">
            <span className="text-ink-600">Subtotal</span>
            <span className="tabular">{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Discount</span>
            <span className="tabular">-{money(capped)}</span>
          </div>
          {capped < discount && (
            <p className="text-xs font-semibold text-amber-700">
              Capped at the bill total - a discount cannot exceed what is owed.
            </p>
          )}
          <div className="flex justify-between border-t border-ink-200 pt-1.5 text-base font-extrabold">
            <span>New total</span>
            <span className="tabular text-brand-700">{money(newTotal)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* VOID                                                                */
/* ------------------------------------------------------------------ */

export const VoidDialog = ({
  open,
  order,
  onClose,
  onVoided,
}: {
  open: boolean;
  order: Order;
  onClose: () => void;
  onVoided: () => void;
}) => {
  const toast = useToast();
  const [voidOrder, { isLoading }] = useVoidOrderMutation();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setPassword("");
  }, [open]);

  const submit = async () => {
    try {
      await voidOrder({ id: order.id, voidReason: reason, password }).unwrap();
      toast.success("Bill cancelled");
      onVoided();
      onClose();
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not cancel this bill"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel this bill"
      subtitle={`Bill #${order.orderNumber} · ${money(order.total)}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="danger"
            loading={isLoading}
            onClick={submit}
            disabled={!reason.trim() || !password}
          >
            Cancel bill
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-600">
          The bill stays in the records marked as cancelled, so the numbering never has a gap. Any
          commission or credit entry from this bill is reversed.
        </p>

        <Textarea
          label="Reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Customer left, wrong order, duplicate bill..."
          autoFocus
        />

        <Input
          label="Your password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Confirm it is you"
          hint="Checked against the account signed in at this till"
          onKeyDown={(event) => {
            if (event.key === "Enter" && reason.trim() && password) submit();
          }}
        />
      </div>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/* ADD A CUSTOM / OFF-MENU ITEM                                        */
/* ------------------------------------------------------------------ */

export const CustomItemDialog = ({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; unitPrice: number; quantity: number; note: string | null; printToKitchen: boolean }) => void;
}) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [toKitchen, setToKitchen] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName("");
    setPrice("");
    setQuantity("1");
    setNote("");
    setToKitchen(true);
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add an off-menu item"
      subtitle="For specials and one-off requests that are not on the menu"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={<FiPlus />}
            disabled={!name.trim() || !price}
            onClick={() => {
              onAdd({
                name: name.trim(),
                unitPrice: Number(price) || 0,
                quantity: Number(quantity) || 1,
                note: note.trim() || null,
                printToKitchen: toKitchen,
              });
              onClose();
            }}
          >
            Add to order
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input
          label="Item name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Special fish platter"
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="Price"
            required
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Input
            label="Quantity"
            type="number"
            min={0.01}
            step={0.5}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>

        <Input
          label="Note for the kitchen"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Extra spicy, no onion..."
        />

        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-ink-200 px-3 py-2.5">
          <input
            type="checkbox"
            checked={toKitchen}
            onChange={(event) => setToKitchen(event.target.checked)}
            className="size-4 accent-[var(--color-brand-600)]"
          />
          <span className="text-sm font-semibold text-ink-700">Print on the kitchen token</span>
          <Badge tone="default" className="ml-auto">
            <FiUser className="size-3" /> Uncheck for drinks
          </Badge>
        </label>
      </div>
    </Modal>
  );
};
