import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { FiClipboard, FiCheck, FiRotateCcw } from "react-icons/fi";

import { qty as formatQty } from "../../utils/format";
import { Modal } from "../../components/ui/Modal";
import { Badge, Button, EmptyState } from "../../components/ui/primitives";
import type { OrderItem } from "../../types";

/**
 * Choosing what goes on a kitchen token.
 *
 * The default is still the useful one - only what the kitchen has not seen is
 * ticked, so the common case is open-and-print. But every printable line is
 * listed, including ones already sent, because tokens get lost, printers jam
 * and a cook does ask "what was on table 4 again?". Refusing to reprint only
 * means somebody walks over and shouts it instead.
 */
export const TokenDialog = ({
  open,
  items,
  onClose,
  onPrint,
  printing,
}: {
  open: boolean;
  items: OrderItem[];
  onClose: () => void;
  /** `null` means "send the pending items" - the server works out the delta. */
  onPrint: (itemIds: number[] | null) => void;
  printing?: boolean;
}) => {
  const printable = useMemo(
    () => items.filter((item) => item.printToKitchen && !item.isReturned),
    [items]
  );

  const pendingOf = (item: OrderItem) =>
    Number(item.quantity) - Number(item.printedQuantity);

  const pendingIds = useMemo(
    () => printable.filter((item) => pendingOf(item) > 0).map((item) => item.id),
    [printable]
  );

  const [selected, setSelected] = useState<number[]>([]);

  /**
   * Re-seed each time it opens: whatever the kitchen has not seen is ticked.
   * When nothing is pending, tick the whole order instead - opening this dialog
   * with everything already sent means you came here to reprint, and landing on
   * a disabled "Print 0 items" button helps nobody.
   */
  useEffect(() => {
    if (!open) return;
    setSelected(pendingIds.length ? pendingIds : printable.map((item) => item.id));
  }, [open, pendingIds, printable]);

  const toggle = (id: number) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  // Exactly the pending set and nothing else -> let the server compute the
  // delta, so a line whose quantity changed between opening and printing still
  // prints the right difference rather than a stale number.
  const isPlainPending =
    selected.length === pendingIds.length && selected.every((id) => pendingIds.includes(id));

  const isReprint = selected.some((id) => !pendingIds.includes(id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send to the kitchen"
      subtitle="New items are ticked already. Tick anything else to reprint it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={<FiClipboard />}
            loading={printing}
            disabled={selected.length === 0}
            onClick={() => onPrint(isPlainPending && pendingIds.length ? null : selected)}
          >
            Print {selected.length} item{selected.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      {printable.length === 0 ? (
        <EmptyState
          title="Nothing on this order goes to the kitchen"
          message="Cold drinks and other bought-in items never print a token."
        />
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSelected(pendingIds)}
              disabled={pendingIds.length === 0}
            >
              Only new ({pendingIds.length})
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<FiRotateCcw />}
              onClick={() => setSelected(printable.map((item) => item.id))}
            >
              Whole order ({printable.length})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>

          <ul className="divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200">
            {printable.map((item) => {
              const pending = pendingOf(item);
              const checked = selected.includes(item.id);

              return (
                <li key={item.id}>
                  <label
                    className={clsx(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors",
                      checked ? "bg-brand-50" : "hover:bg-ink-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(item.id)}
                      className="size-4 shrink-0 accent-[var(--color-brand-600)]"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink-800">{item.name}</span>
                      {item.note && (
                        <span className="block text-xs text-ink-500 italic">{item.note}</span>
                      )}
                    </span>

                    {pending > 0 ? (
                      <Badge tone="info">{formatQty(pending)} new</Badge>
                    ) : (
                      <Badge tone="default">
                        <FiCheck className="size-3" /> sent
                      </Badge>
                    )}

                    <span className="tabular w-16 shrink-0 text-right text-sm font-bold text-ink-900">
                      {formatQty(
                        checked && pending > 0 && !isReprint ? pending : Number(item.quantity)
                      )}
                      <span className="ml-0.5 text-[10px] font-normal text-ink-400">qty</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          {isReprint && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              This token includes items the kitchen already has. It will print the full quantity of
              everything ticked, marked as a reprint.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TokenDialog;
