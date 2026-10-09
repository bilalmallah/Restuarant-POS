import { useRef } from "react";

import { money } from "../../utils/format";
import type { MenuProduct } from "../../types";

/**
 * A menu button that does two things.
 *
 * A tap adds the item. A long press - or a right-click, for whoever is on a
 * mouse - opens the note box instead, so "no chilli" reaches the kitchen
 * without leaving the menu or retyping the dish as a custom item.
 *
 * The press has to be held rather than tapped, because during service the
 * normal action must stay a single quick tap with no delay on it.
 */
const LONG_PRESS_MS = 450;

export const MenuTile = ({
  product,
  disabled,
  onAdd,
  onAddWithNote,
}: {
  product: MenuProduct;
  disabled: boolean;
  onAdd: (product: MenuProduct) => void;
  onAddWithNote: (product: MenuProduct) => void;
}) => {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const cancel = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const openNotes = () => {
    longPressed.current = true;
    cancel();
    onAddWithNote(product);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      // Hovering a tile answers "what is in the Sicilian?" without anyone
      // walking to the kitchen.
      title={product.description ?? product.name}
      onPointerDown={(event) => {
        // Ignore right/middle buttons; the context menu handler covers those.
        if (event.pointerType === "mouse" && event.button !== 0) return;

        longPressed.current = false;
        cancel();
        timer.current = window.setTimeout(openNotes, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => {
        event.preventDefault();
        openNotes();
      }}
      onClick={() => {
        // A long press still ends in a click - swallow that one so the item is
        // not added twice, once plain and once with the note.
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }

        onAdd(product);
      }}
      className="group relative flex h-24 touch-none flex-col justify-between rounded-lg border border-ink-200 bg-white p-2.5 text-left transition-all select-none hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      <span className="line-clamp-2 text-sm leading-tight font-bold text-ink-800">
        {product.name}
      </span>

      {product.variantLabel && (
        <span className="-mt-0.5 block text-[11px] font-bold tracking-wide text-accent-600 uppercase">
          {product.variantLabel}
        </span>
      )}

      <span className="flex w-full items-end justify-between">
        <span className="tabular text-base font-extrabold text-brand-700">
          {money(product.price)}
        </span>
        {!product.printToKitchen && (
          <span className="rounded bg-sky-100 px-1 text-[9px] font-bold text-sky-700">
            NO TOKEN
          </span>
        )}
      </span>

      {/* Otherwise nobody would ever discover the long press. */}
      <span className="pointer-events-none absolute top-1.5 right-1.5 rounded bg-ink-900/80 px-1 py-0.5 text-[9px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
        hold for note
      </span>
    </button>
  );
};

export default MenuTile;
