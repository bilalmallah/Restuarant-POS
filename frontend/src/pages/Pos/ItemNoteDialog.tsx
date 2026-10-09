import { useEffect, useState } from "react";
import clsx from "clsx";
import { FiPlus } from "react-icons/fi";

import { money } from "../../utils/format";
import { Modal } from "../../components/ui/Modal";
import { Badge, Button, Input } from "../../components/ui/primitives";
import type { MenuProduct } from "../../types";

/**
 * The note that rides along with an item to the kitchen.
 *
 * The chips are there because these are the same six requests every night, and
 * typing "no chilli" on a touchscreen mid-rush is slower than it sounds. They
 * add to the note rather than replace it, so "no chilli + extra raita" is two
 * taps.
 */
const COMMON_NOTES = [
  "No chilli",
  "Extra spicy",
  "No onion",
  "Well done",
  "Less oil",
  "Extra cheese",
  "No garlic",
  "Serve last",
];

export const ItemNoteDialog = ({
  open,
  product,
  onClose,
  onAdd,
}: {
  open: boolean;
  product: MenuProduct | null;
  onClose: () => void;
  onAdd: (note: string | null, quantity: number) => void;
}) => {
  const [note, setNote] = useState("");
  const [quantity, setQuantity] = useState("1");

  useEffect(() => {
    if (!open) return;
    setNote("");
    setQuantity("1");
  }, [open, product]);

  if (!product) return null;

  /**
   * Functional update, not `note` from the closure: two chips tapped quickly
   * land in the same React batch, and reading the rendered value there loses
   * the first one - "no chilli, extra cheese" arrived at the kitchen as just
   * "extra cheese".
   */
  const toggleChip = (chip: string) =>
    setNote((current) => {
      const parts = current
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      const next = parts.includes(chip)
        ? parts.filter((part) => part !== chip)
        : [...parts, chip];

      return next.join(", ");
    });

  const chosen = note
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const submit = () => {
    onAdd(note.trim() || null, Number(quantity) || 1);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Note for the kitchen"
      subtitle={
        product.variantLabel ? `${product.name} (${product.variantLabel})` : product.name
      }
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button icon={<FiPlus />} onClick={submit}>
            Add {quantity} &middot; {money(Number(product.price) * (Number(quantity) || 1))}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!product.printToKitchen && (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
            This item does not print a kitchen token, so the note will only appear on the
            bill.
          </p>
        )}

        <div>
          <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-600 uppercase">
            Common requests
          </span>

          <div className="flex flex-wrap gap-1.5">
            {COMMON_NOTES.map((chip) => {
              const active = chosen.includes(chip);

              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={clsx(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors",
                    active
                      ? "border-brand-500 bg-brand-600 text-white"
                      : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50"
                  )}
                >
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Anything the cook needs to know"
          autoFocus
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />

        <Input
          label="Quantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          wrapperClassName="w-32"
        />

        {note.trim() && (
          <p className="rounded-lg bg-ink-50 px-3 py-2 text-sm ring-1 ring-ink-200">
            The token will read{" "}
            <Badge tone="warning" className="font-mono">
              ** {note.trim()} **
            </Badge>
          </p>
        )}
      </div>
    </Modal>
  );
};

export default ItemNoteDialog;
