import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { FiPlus, FiUsers, FiShoppingBag, FiTruck, FiGrid } from "react-icons/fi";

import { useListWaitersQuery, useCreateOrderMutation } from "../../features/posApi";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Modal } from "../../components/ui/Modal";
import { Badge, Button, Input, Select } from "../../components/ui/primitives";
import type { FloorTable, OrderType } from "../../types";

/**
 * Starting an order, opened two different ways:
 *
 *   "table"  the cashier tapped a specific table on the floor. It is obviously
 *            dine-in, so the order-type switcher is not shown at all - offering
 *            "Takeaway" after someone has pointed at table 6 is just noise.
 *            The table dropdown is still there, pre-selected, because pointing
 *            at the wrong tile is the easiest mistake to make on a busy floor.
 *
 *   "new"    the New Order button (F2). Nothing is implied yet, so all three
 *            order types are offered, and choosing Dine In reveals the table
 *            list with occupied tables disabled.
 */
export const StartOrderDialog = ({
  open,
  mode,
  table,
  tables,
  onClose,
  focusSuffix = "",
}: {
  open: boolean;
  mode: "table" | "new";
  table: FloorTable | null;
  tables: FloorTable[];
  onClose: () => void;
  /** Carries focus mode across the navigation to the order screen. */
  focusSuffix?: string;
}) => {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: waiters = [] } = useListWaitersQuery();
  const [createOrder, { isLoading }] = useCreateOrderMutation();

  const [waiterId, setWaiterId] = useState("");
  const [tableId, setTableId] = useState("");
  const [guests, setGuests] = useState("2");
  const [orderType, setOrderType] = useState<OrderType>("dine-in");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const isBusy = (row: FloorTable) => Boolean(row.order);

  const freeCount = useMemo(() => tables.filter((row) => !isBusy(row)).length, [tables]);

  const selectedTable = useMemo(
    () => tables.find((row) => String(row.id) === tableId) ?? null,
    [tables, tableId]
  );

  // Reset each time the dialog opens; a stale waiter from the last table is
  // the sort of thing that quietly misattributes a night of commission.
  useEffect(() => {
    if (!open) return;

    setWaiterId(waiters[0]?.id ? String(waiters[0].id) : "");
    setOrderType(mode === "table" ? "dine-in" : "dine-in");
    setTableId(table ? String(table.id) : "");
    setGuests(table ? String(Math.min(table.capacity, 2)) : "2");
    setCustomerName("");
    setCustomerPhone("");
  }, [open, mode, table, waiters]);

  // Guests should follow the table you picked, not stay at the last one's size.
  useEffect(() => {
    if (selectedTable) setGuests(String(Math.min(selectedTable.capacity, 2)));
  }, [selectedTable]);

  const isDineIn = orderType === "dine-in";
  const needsTable = isDineIn;
  const canSubmit = !needsTable || Boolean(tableId);

  const submit = async () => {
    if (needsTable && !tableId) {
      toast.warning("Choose a table first");
      return;
    }

    try {
      const result = await createOrder({
        tableId: isDineIn && tableId ? Number(tableId) : null,
        waiterId: waiterId ? Number(waiterId) : null,
        guests: Number(guests) || 1,
        orderType,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      }).unwrap();

      toast.success(`Order #${result.data.orderNumber} started`);
      navigate(`/pos/order/${result.data.id}${focusSuffix}`);
      onClose();
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not start the order"));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === "table" && table ? `Start order on ${table.name}` : "New order"
      }
      subtitle="Pick the waiter first so their commission is recorded correctly"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="lg"
            loading={isLoading}
            onClick={submit}
            icon={<FiPlus />}
            disabled={!canSubmit}
          >
            Start &amp; add items
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/*
          Only the New Order route offers a choice of order type. Coming from a
          table tile, dine-in is already settled.
        */}
        {mode === "new" && (
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: "dine-in", label: "Dine In", icon: FiUsers },
                { value: "takeaway", label: "Takeaway", icon: FiShoppingBag },
                { value: "delivery", label: "Delivery", icon: FiTruck },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const active = orderType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOrderType(option.value)}
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
        )}

        {needsTable && (
          <Select
            label="Table"
            required
            value={tableId}
            onChange={(event) => setTableId(event.target.value)}
            hint={
              freeCount === 0
                ? "Every table is occupied - settle a bill to free one"
                : `${freeCount} of ${tables.length} tables free. Occupied ones cannot be chosen.`
            }
            autoFocus={mode === "new"}
          >
            <option value="">Choose a table</option>
            {tables.map((row) => {
              const busy = isBusy(row);
              // The table you tapped stays selectable even though the floor
              // may have marked it busy a second ago.
              const isCurrent = table?.id === row.id;

              return (
                <option key={row.id} value={row.id} disabled={busy && !isCurrent}>
                  {row.name} · {row.area} · seats {row.capacity}
                  {busy && !isCurrent ? "  — occupied" : ""}
                </option>
              );
            })}
          </Select>
        )}

        {needsTable && selectedTable && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 ring-1 ring-brand-200">
            <FiGrid className="size-4 text-brand-600" />
            <span className="text-sm font-bold text-brand-800">{selectedTable.name}</span>
            <span className="text-sm text-brand-700">in {selectedTable.area}</span>
            <Badge tone={selectedTable.order ? "warning" : "success"} className="ml-auto">
              {selectedTable.order ? "occupied" : "free"}
            </Badge>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Waiter"
            value={waiterId}
            onChange={(event) => setWaiterId(event.target.value)}
            hint="Only staff marked as waiters appear here"
          >
            <option value="">No waiter</option>
            {waiters.map((waiter) => (
              <option key={waiter.id} value={waiter.id}>
                {waiter.name}
                {Number(waiter.commissionPercent) > 0
                  ? ` (${Number(waiter.commissionPercent)}% commission)`
                  : ""}
              </option>
            ))}
          </Select>

          <Input
            label="Guests"
            type="number"
            min={1}
            value={guests}
            onChange={(event) => setGuests(event.target.value)}
          />
        </div>

        {!isDineIn && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Customer name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Optional"
            />
            <Input
              label="Phone"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="Optional"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default StartOrderDialog;
