import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  FiPrinter,
  FiDollarSign,
  FiBookOpen,
  FiPercent,
  FiSearch,
  FiTrash2,
  FiPlus,
  FiMinus,
  FiRotateCcw,
  FiRotateCw,
  FiXCircle,
  FiEdit3,
  FiClipboard,
} from "react-icons/fi";

import {
  useGetOrderQuery,
  useGetMenuQuery,
  useAddOrderItemMutation,
  useUpdateOrderItemMutation,
  useRemoveOrderItemMutation,
  usePrintKitchenTokenMutation,
  usePrintBillMutation,
  useGetSettingsQuery,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import useFocusMode from "../../hooks/useFocusMode";
import usePrinter from "../../hooks/usePrinter";
import { money, qty as formatQty, elapsedSince } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Button, Loader, Badge, EmptyState } from "../../components/ui/primitives";
import { ReceiptDocument, TokenDocument } from "../../components/print/Receipt";
import PrintPortal from "../../components/print/PrintPortal";
import { SettleDialog, CreditDialog, DiscountDialog, VoidDialog, CustomItemDialog } from "./OrderDialogs";
import TokenDialog from "./TokenDialog";
import MenuTile from "./MenuTile";
import ItemNoteDialog from "./ItemNoteDialog";
import type { MenuProduct, OrderItem } from "../../types";

/* ------------------------------------------------------------------ */
/* UNDO STACK                                                          */
/*                                                                     */
/* The server owns the order, so undo is not a local state rewind - it  */
/* is a stack of compensating calls. Adding an item pushes "remove it"; */
/* changing a quantity pushes "set it back". That way Ctrl+Z works even */
/* though every change has already been written to the database.        */
/* ------------------------------------------------------------------ */

type UndoStep = { label: string; undo: () => Promise<unknown>; redo: () => Promise<unknown> };

const useUndoStack = () => {
  const [past, setPast] = useState<UndoStep[]>([]);
  const [future, setFuture] = useState<UndoStep[]>([]);

  const push = useCallback((step: UndoStep) => {
    setPast((stack) => [...stack.slice(-29), step]);
    setFuture([]);
  }, []);

  const undo = useCallback(async () => {
    const step = past.at(-1);
    if (!step) return null;

    setPast((stack) => stack.slice(0, -1));
    setFuture((stack) => [...stack, step]);
    await step.undo();

    return step.label;
  }, [past]);

  const redo = useCallback(async () => {
    const step = future.at(-1);
    if (!step) return null;

    setFuture((stack) => stack.slice(0, -1));
    setPast((stack) => [...stack, step]);
    await step.redo();

    return step.label;
  }, [future]);

  const reset = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return { push, undo, redo, reset, canUndo: past.length > 0, canRedo: future.length > 0 };
};

/* ------------------------------------------------------------------ */
/* INLINE EDIT CELL                                                    */
/*                                                                     */
/* Double-click a price or a quantity to type over it. This is how a    */
/* cashier gives "the usual" rate to a regular without touching the     */
/* menu, and it is the one interaction nobody discovers on their own -  */
/* so the cell is underlined and the shortcuts page documents it.       */
/* ------------------------------------------------------------------ */

const EditableCell = ({
  value,
  onCommit,
  className,
  format,
  title,
}: {
  value: number;
  onCommit: (next: number) => void;
  className?: string;
  format: (value: number) => string;
  title: string;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = Number(draft);
    setEditing(false);
    if (Number.isFinite(next) && next !== value) onCommit(next);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
          event.stopPropagation();
        }}
        className={clsx(
          "tabular w-20 rounded border-2 border-brand-500 px-1 py-0.5 text-right text-sm font-bold outline-none",
          className
        )}
      />
    );
  }

  return (
    <button
      type="button"
      title={title}
      onDoubleClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      className={clsx(
        "tabular cursor-text rounded px-1 py-0.5 text-right underline decoration-ink-300 decoration-dotted underline-offset-2 transition-colors hover:bg-brand-50 hover:decoration-brand-500",
        className
      )}
    >
      {format(value)}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* ORDER SCREEN                                                        */
/* ------------------------------------------------------------------ */

const OrderScreen = () => {
  const { id } = useParams();
  const orderId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const focus = useFocusMode();

  const { data: order, isLoading } = useGetOrderQuery(orderId, { skip: !orderId });
  const { data: menu = [] } = useGetMenuQuery();
  const { data: settings } = useGetSettingsQuery();

  const [addItem] = useAddOrderItemMutation();
  const [updateItem] = useUpdateOrderItemMutation();
  const [removeItem] = useRemoveOrderItemMutation();
  const [printToken, { isLoading: tokenPrinting }] = usePrintKitchenTokenMutation();
  const [printBill, { isLoading: billing }] = usePrintBillMutation();

  const undoStack = useUndoStack();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const [settleOpen, setSettleOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<MenuProduct | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const printer = usePrinter();

  const items = useMemo(() => order?.items ?? [], [order]);
  const isEditable = order?.status === "open" || order?.status === "billed";
  const isSettled = order?.status === "paid" || order?.status === "credit";

  /* ---------------- Menu filtering ---------------- */

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    const pool = term
      ? menu.flatMap((category) => category.products)
      : (menu.find((category) => category.id === categoryId) ?? menu[0])?.products ?? [];

    if (!term) return pool;

    return pool.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.code?.toLowerCase().includes(term) ||
        product.categoryName.toLowerCase().includes(term)
    );
  }, [menu, categoryId, search]);

  useEffect(() => {
    if (categoryId === null && menu.length) setCategoryId(menu[0].id);
  }, [menu, categoryId]);

  /** How many lines the kitchen has not been told about yet. */
  const pendingKitchenCount = useMemo(
    () =>
      items.reduce((count, item) => {
        if (!item.printToKitchen || item.isReturned) return count;
        return count + (Number(item.quantity) - Number(item.printedQuantity) > 0 ? 1 : 0);
      }, 0),
    [items]
  );

  /* ---------------- Actions ---------------- */

  const guard = () => {
    if (isEditable) return true;
    toast.warning(`This bill is ${order?.status} and can no longer be changed`);
    return false;
  };

  const addProduct = async (product: MenuProduct, note: string | null = null, quantity = 1) => {
    if (!guard()) return;

    try {
      const result = await addItem({
        id: orderId,
        body: {
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity,
          note,
        },
      }).unwrap();

      // Find the line the server merged this into, so undo targets it exactly.
      const line = result.data.items?.find(
        (item) => item.productId === product.id && Number(item.unitPrice) === product.price
      );
      setSelectedItemId(line?.id ?? null);

      if (line) {
        const previousQuantity = Number(line.quantity) - 1;

        undoStack.push({
          label: product.name,
          undo: () =>
            previousQuantity > 0
              ? updateItem({ id: orderId, itemId: line.id, body: { quantity: previousQuantity } }).unwrap()
              : removeItem({ id: orderId, itemId: line.id }).unwrap(),
          redo: () =>
            addItem({
              id: orderId,
              body: { productId: product.id, name: product.name, unitPrice: product.price, quantity: 1, note },
            }).unwrap(),
        });
      }
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not add that item"));
    }
  };

  const changeQuantity = async (item: OrderItem, nextQuantity: number) => {
    if (!guard()) return;

    const previous = Number(item.quantity);
    const quantity = Math.max(0, Number(nextQuantity.toFixed(2)));

    try {
      await updateItem({ id: orderId, itemId: item.id, body: { quantity } }).unwrap();

      undoStack.push({
        label: `${item.name} quantity`,
        undo: () =>
          quantity === 0
            ? addItem({
                id: orderId,
                body: {
                  productId: item.productId,
                  name: item.name,
                  unitPrice: Number(item.unitPrice),
                  quantity: previous,
                  note: item.note,
                },
              }).unwrap()
            : updateItem({ id: orderId, itemId: item.id, body: { quantity: previous } }).unwrap(),
        redo: () => updateItem({ id: orderId, itemId: item.id, body: { quantity } }).unwrap(),
      });
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not change the quantity"));
    }
  };

  const changePrice = async (item: OrderItem, unitPrice: number) => {
    if (!guard()) return;

    const previous = Number(item.unitPrice);

    try {
      await updateItem({ id: orderId, itemId: item.id, body: { unitPrice } }).unwrap();
      toast.info(`${item.name} priced at ${money(unitPrice)} on this bill only`);

      undoStack.push({
        label: `${item.name} price`,
        undo: () => updateItem({ id: orderId, itemId: item.id, body: { unitPrice: previous } }).unwrap(),
        redo: () => updateItem({ id: orderId, itemId: item.id, body: { unitPrice } }).unwrap(),
      });
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not change the price"));
    }
  };

  const deleteLine = async (item: OrderItem) => {
    if (!guard()) return;

    try {
      await removeItem({ id: orderId, itemId: item.id }).unwrap();
      setSelectedItemId(null);

      undoStack.push({
        label: item.name,
        undo: () =>
          addItem({
            id: orderId,
            body: {
              productId: item.productId,
              name: item.name,
              unitPrice: Number(item.unitPrice),
              quantity: Number(item.quantity),
              note: item.note,
            },
          }).unwrap(),
        redo: () => removeItem({ id: orderId, itemId: item.id }).unwrap(),
      });
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not remove that line"));
    }
  };

  /**
   * The button always opens the picker rather than refusing when nothing is
   * pending - "the kitchen already has everything" is a dead end when what you
   * actually wanted was to reprint a lost token.
   */
  const openTokenPicker = () => {
    const printable = items.filter((item) => item.printToKitchen && !item.isReturned);

    if (printable.length === 0) {
      toast.info("Nothing on this order goes to the kitchen");
      return;
    }

    setTokenOpen(true);
  };

  const sendToken = async (itemIds: number[] | null) => {
    try {
      const result = await printToken({ id: orderId, ...(itemIds ? { itemIds } : {}) }).unwrap();

      await printer.printToken(result);
      setTokenOpen(false);
      toast.success(
        `${result.isReprint ? "Reprinted" : "Sent to kitchen"}: ${result.lines.length} item${result.lines.length === 1 ? "" : "s"}`
      );
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not print the token"));
    }
  };

  const doPrintBill = async () => {
    if (!order) return;

    if (items.length === 0) {
      toast.warning("Add something to the order first");
      return;
    }

    try {
      const result = await printBill(orderId).unwrap();
      await printer.printReceipt(result.data, result.isReprint);
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not print the bill"));
    }
  };

  const runUndo = async () => {
    const label = await undoStack.undo();
    if (label) toast.info(`Undone: ${label}`);
  };

  const runRedo = async () => {
    const label = await undoStack.redo();
    if (label) toast.info(`Redone: ${label}`);
  };

  /* ---------------- Keyboard ---------------- */

  /**
   * While a dialog is open it owns the keyboard. Without this, Enter (bound to
   * "print the bill") fires behind the payment dialog, and F6/F7 stack a second
   * dialog on top of the first.
   */
  const dialogOpen =
    settleOpen || creditOpen || discountOpen || voidOpen || customOpen || tokenOpen || Boolean(noteFor);

  const selectedIndex = items.findIndex((item) => item.id === selectedItemId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;

  const moveSelection = (delta: number) => {
    if (!items.length) return;
    const next = selectedIndex < 0 ? 0 : Math.min(items.length - 1, Math.max(0, selectedIndex + delta));
    setSelectedItemId(items[next].id);
  };

  useHotkeys(
    [
      // Escape is left to the Modal itself, which closes the topmost dialog.
      { combo: SHORTCUTS.focusMenuSearch.combo, handler: () => searchRef.current?.focus(), allowInInput: true, enabled: !dialogOpen },
      { combo: SHORTCUTS.printToken.combo, handler: openTokenPicker , enabled: !dialogOpen },
      { combo: SHORTCUTS.printBill.combo, handler: doPrintBill , enabled: !dialogOpen },
      { combo: SHORTCUTS.payCash.combo, handler: () => isEditable && setSettleOpen(true) , enabled: !dialogOpen },
      { combo: SHORTCUTS.sendCredit.combo, handler: () => isEditable && setCreditOpen(true) , enabled: !dialogOpen },
      { combo: SHORTCUTS.discount.combo, handler: () => isEditable && setDiscountOpen(true) , enabled: !dialogOpen },
      { combo: SHORTCUTS.undo.combo, handler: runUndo, allowInInput: true , enabled: !dialogOpen },
      { combo: SHORTCUTS.redo.combo, handler: runRedo, allowInInput: true , enabled: !dialogOpen },
      { combo: SHORTCUTS.lineUp.combo, handler: () => moveSelection(-1) , enabled: !dialogOpen },
      { combo: SHORTCUTS.lineDown.combo, handler: () => moveSelection(1) , enabled: !dialogOpen },
      { combo: SHORTCUTS.plusOne.combo, handler: () => selected && changeQuantity(selected, Number(selected.quantity) + 1) , enabled: !dialogOpen },
      { combo: SHORTCUTS.minusOne.combo, handler: () => selected && changeQuantity(selected, Number(selected.quantity) - 1) , enabled: !dialogOpen },
      { combo: SHORTCUTS.removeLine.combo, handler: () => selected && deleteLine(selected) , enabled: !dialogOpen },
      { combo: SHORTCUTS.close.combo, handler: () => (search ? setSearch("") : navigate(`/pos${focus.suffix}`)), enabled: !dialogOpen },
    ],
    [order, items, selectedItemId, search, pendingKitchenCount, dialogOpen, undoStack.canUndo, undoStack.canRedo]
  );

  if (isLoading) return <Loader label="Opening the order" />;

  if (!order) {
    return (
      <div className="p-6">
        <EmptyState
          title="Order not found"
          message="It may have been deleted."
          action={<Button onClick={() => navigate(`/pos${focus.suffix}`)}>Back to the floor</Button>}
        />
      </div>
    );
  }

  const statusTone =
    order.status === "paid"
      ? "success"
      : order.status === "credit"
        ? "warning"
        : order.status === "void"
          ? "danger"
          : order.status === "billed"
            ? "info"
            : "brand";

  /*
   * Side by side on a wide screen: the shell is fixed and each column scrolls
   * internally. Stacked on a narrow one, h-full would squeeze both panels into
   * the viewport - on a 600px-tall window that left the menu about 90px high
   * with no products visible at all - so below lg the page simply scrolls.
   */
  return (
    <div className="flex min-h-0 flex-col lg:h-full lg:flex-row">
      {/* ================= MENU ================= */}
      {/*
        min-w-0 is load-bearing. A flex item defaults to min-width:auto, which
        means "never shrink below your content" - and the category tab strip
        below reports a min-content width of ~1250px because it lists every
        category. Without this the menu column refused to shrink and pushed the
        whole bill panel off the right of the screen on any display under 1920px.
      */}
      <section className="no-print flex min-h-[60vh] min-w-0 flex-1 flex-col border-r border-ink-200 bg-ink-50 lg:min-h-0">
        <div className="flex items-center gap-2 border-b border-ink-200 bg-white p-3">
          <div className="relative min-w-0 flex-1">
            <FiSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearch("");
                // Enter on a single match adds it - fastest possible entry.
                if (event.key === "Enter" && visibleProducts.length >= 1) {
                  event.preventDefault();
                  addProduct(visibleProducts[0]);
                  setSearch("");
                }
              }}
              placeholder="Search the menu, then press Enter  (Ctrl+F)"
              className="h-11 w-full rounded-lg border border-ink-300 bg-white pr-3 pl-9 text-sm font-medium outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
            />
          </div>

          <Button variant="secondary" icon={<FiEdit3 />} onClick={() => setCustomOpen(true)}>
            Custom
          </Button>
        </div>

        {!search && (
          <div className="flex min-w-0 gap-1.5 overflow-x-auto border-b border-ink-200 bg-white px-3 pb-2">
            {menu.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setCategoryId(category.id)}
                className={clsx(
                  "shrink-0 rounded-lg px-3 py-2 text-sm font-bold transition-colors",
                  categoryId === category.id
                    ? "text-white shadow-sm"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                )}
                style={
                  categoryId === category.id ? { backgroundColor: category.colour } : undefined
                }
              >
                {category.name}
                <span className="ml-1.5 text-[10px] opacity-70">{category.products.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {visibleProducts.length === 0 ? (
            <EmptyState
              title={search ? `Nothing matches "${search}"` : "No products in this category"}
              message="Add products under Menu > Products."
            />
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visibleProducts.map((product) => (
                <MenuTile
                  key={product.id}
                  product={product}
                  disabled={!isEditable}
                  onAdd={addProduct}
                  onAddWithNote={setNoteFor}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= BILL ================= */}
      {/*
        shrink-0 so the bill keeps its designed width instead of being squeezed
        to whatever is left. It steps down on narrower screens rather than
        clipping, and stacks underneath the menu below lg.
      */}
      <section className="no-print flex min-h-0 w-full shrink-0 flex-col bg-white lg:w-[340px] xl:w-[400px] 2xl:w-[460px]">
        <header className="border-b border-ink-200 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold text-ink-900">
                  {order.table?.name ?? order.orderType.toUpperCase()}
                </h1>
                <Badge tone={statusTone}>{order.status.toUpperCase()}</Badge>
                {order.billPrintCount > 1 && (
                  <Badge tone="warning">{order.billPrintCount} prints</Badge>
                )}
              </div>
              <p className="truncate text-xs text-ink-500">
                Bill #{order.orderNumber}
                {order.waiter ? ` · ${order.waiter.name}` : ""} · {order.guests} guest
                {order.guests === 1 ? "" : "s"} · {elapsedSince(order.openedAt)}
              </p>
            </div>

            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="ghost"
                icon={<FiRotateCcw />}
                title="Undo (Ctrl+Z)"
                disabled={!undoStack.canUndo}
                onClick={runUndo}
              />
              <Button
                size="sm"
                variant="ghost"
                icon={<FiRotateCw />}
                title="Redo (Ctrl+Y)"
                disabled={!undoStack.canRedo}
                onClick={runRedo}
              />
            </div>
          </div>
        </header>

        {/* ---------------- Lines ---------------- */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState
              title="Nothing on this bill yet"
              message="Tap items on the left, or search and press Enter."
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-ink-50 text-[10px] tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left font-bold">Item</th>
                  <th className="px-1 py-1.5 text-center font-bold">Qty</th>
                  <th className="px-1 py-1.5 text-right font-bold">Rate</th>
                  <th className="px-2 py-1.5 text-right font-bold">Total</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const unitPrice = Number(item.unitPrice);
                  const quantity = Number(item.quantity);
                  const changed = unitPrice !== Number(item.originalPrice);
                  const waiting = quantity - Number(item.printedQuantity) > 0 && item.printToKitchen;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemId(item.id)}
                      className={clsx(
                        "cursor-pointer border-b border-ink-100 transition-colors",
                        selectedItemId === item.id ? "bg-brand-50" : "hover:bg-ink-50"
                      )}
                    >
                      <td className="px-2 py-2">
                        <span className="block leading-tight font-semibold text-ink-800">
                          {item.name}
                          {item.variantLabel && (
                            <span className="ml-1.5 rounded bg-accent-500/15 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-accent-600 uppercase">
                              {item.variantLabel}
                            </span>
                          )}
                        </span>
                        <span className="flex flex-wrap items-center gap-1 text-[10px]">
                          {item.note && <span className="text-ink-500 italic">{item.note}</span>}
                          {changed && (
                            <span className="font-bold text-amber-700">
                              was {money(item.originalPrice)}
                            </span>
                          )}
                          {waiting && (
                            <span className="font-bold text-sky-700">not sent to kitchen</span>
                          )}
                        </span>
                      </td>

                      <td className="px-1 py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={(event) => {
                              event.stopPropagation();
                              changeQuantity(item, quantity - 1);
                            }}
                            className="grid size-6 place-items-center rounded bg-ink-100 text-ink-600 hover:bg-ink-200 disabled:opacity-40"
                          >
                            <FiMinus className="size-3" />
                          </button>

                          <EditableCell
                            value={quantity}
                            format={formatQty}
                            title="Double-click to type an exact quantity"
                            className="w-8 font-bold"
                            onCommit={(next) => changeQuantity(item, next)}
                          />

                          <button
                            type="button"
                            disabled={!isEditable}
                            onClick={(event) => {
                              event.stopPropagation();
                              changeQuantity(item, quantity + 1);
                            }}
                            className="grid size-6 place-items-center rounded bg-ink-100 text-ink-600 hover:bg-ink-200 disabled:opacity-40"
                          >
                            <FiPlus className="size-3" />
                          </button>
                        </div>
                      </td>

                      <td className="px-1 py-2 text-right">
                        <EditableCell
                          value={unitPrice}
                          format={(value) => money(value, false)}
                          title="Double-click to change the price on this bill only"
                          className={clsx("font-semibold", changed && "text-amber-700")}
                          onCommit={(next) => changePrice(item, next)}
                        />
                      </td>

                      <td className="tabular px-2 py-2 text-right font-bold text-ink-900">
                        {money(quantity * unitPrice, false)}
                      </td>

                      <td className="pr-1">
                        <button
                          type="button"
                          disabled={!isEditable}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteLine(item);
                          }}
                          className="rounded p-1 text-ink-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                          title="Remove this line"
                        >
                          <FiTrash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ---------------- Totals ---------------- */}
        <div className="border-t border-ink-200 bg-ink-50 px-3 py-2.5 text-sm">
          <div className="flex justify-between text-ink-600">
            <span>Subtotal</span>
            <span className="tabular font-semibold">{money(order.subtotal)}</span>
          </div>

          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>
                Discount
                {order.discountType === "percent" ? ` (${Number(order.discountValue)}%)` : ""}
              </span>
              <span className="tabular font-semibold">-{money(order.discountAmount)}</span>
            </div>
          )}

          {Number(order.serviceCharge) > 0 && (
            <div className="flex justify-between text-ink-600">
              <span>Service</span>
              <span className="tabular">{money(order.serviceCharge)}</span>
            </div>
          )}

          {Number(order.deliveryCharge) > 0 && (
            <div className="flex justify-between text-ink-600">
              <span>Delivery</span>
              <span className="tabular">{money(order.deliveryCharge)}</span>
            </div>
          )}

          {Number(order.taxAmount) > 0 && (
            <div className="flex justify-between text-ink-600">
              <span>Tax ({Number(order.taxPercent)}%)</span>
              <span className="tabular">{money(order.taxAmount)}</span>
            </div>
          )}

          <div className="mt-1.5 flex items-baseline justify-between border-t border-ink-300 pt-1.5">
            <span className="text-base font-extrabold text-ink-900">TOTAL</span>
            <span className="tabular text-2xl font-extrabold text-brand-700">
              {money(order.total)}
            </span>
          </div>

          {isSettled && (
            <p className="mt-1 text-xs font-semibold text-ink-600">
              {order.status === "paid"
                ? `Paid by ${order.paymentMethod}`
                : `${money(Number(order.total) - Number(order.paidAmount))} on ${order.creditPerson?.name}'s khata`}
            </p>
          )}
        </div>

        {/* ---------------- Actions ---------------- */}
        <div className="grid grid-cols-2 gap-2 border-t border-ink-200 p-3">
          <Button
            variant="secondary"
            size="lg"
            icon={<FiClipboard />}
            hint="F3"
            onClick={openTokenPicker}
            disabled={!isEditable}
            className="relative"
          >
            Token
            {pendingKitchenCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-sky-600 text-[10px] font-bold text-white">
                {pendingKitchenCount}
              </span>
            )}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            icon={<FiPercent />}
            hint="F8"
            onClick={() => setDiscountOpen(true)}
            disabled={!isEditable}
          >
            Discount
          </Button>

          <Button
            variant="primary"
            size="lg"
            icon={<FiPrinter />}
            hint="F4"
            loading={billing}
            onClick={doPrintBill}
            className="col-span-2"
          >
            Print Bill
          </Button>

          <Button
            variant="success"
            size="lg"
            icon={<FiDollarSign />}
            hint="F6"
            onClick={() => setSettleOpen(true)}
            disabled={!isEditable || items.length === 0}
          >
            Cash
          </Button>

          <Button
            variant="accent"
            size="lg"
            icon={<FiBookOpen />}
            hint="F7"
            onClick={() => setCreditOpen(true)}
            disabled={!isEditable || items.length === 0}
          >
            Credit
          </Button>

          {isSettled ? (
            <Button variant="ghost" size="sm" className="col-span-2" onClick={() => navigate(`/pos${focus.suffix}`)}>
              Done - back to the floor
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              icon={<FiXCircle />}
              className="col-span-2"
              onClick={() => setVoidOpen(true)}
            >
              Cancel this bill
            </Button>
          )}
        </div>
      </section>

      {/* ---------------- Dialogs ---------------- */}
      <SettleDialog
        open={settleOpen}
        order={order}
        onClose={() => setSettleOpen(false)}
        onSettled={(settled) => printer.printReceipt(settled)}
      />
      <CreditDialog
        open={creditOpen}
        order={order}
        onClose={() => setCreditOpen(false)}
        onSettled={(settled) => printer.printReceipt(settled)}
      />
      <DiscountDialog open={discountOpen} order={order} onClose={() => setDiscountOpen(false)} onSaved={() => undoStack.reset()} />
      <VoidDialog open={voidOpen} order={order} onClose={() => setVoidOpen(false)} onVoided={() => navigate(`/pos${focus.suffix}`)} />
      <ItemNoteDialog
        open={Boolean(noteFor)}
        product={noteFor}
        onClose={() => setNoteFor(null)}
        onAdd={(note, quantity) => {
          if (noteFor) void addProduct(noteFor, note, quantity);
        }}
      />
      <TokenDialog
        open={tokenOpen}
        items={items}
        printing={tokenPrinting}
        onClose={() => setTokenOpen(false)}
        onPrint={sendToken}
      />
      <CustomItemDialog
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onAdd={async (item) => {
          try {
            await addItem({ id: orderId, body: item }).unwrap();
            toast.success(`${item.name} added`);
          } catch (caught) {
            toast.error(errorMessage(caught, "Could not add that item"));
          }
        }}
      />

      {/* ---------------- Printable documents ---------------- */}
      <PrintPortal>
        {printer.receiptDocument && (
          <ReceiptDocument
            order={printer.receiptDocument.order}
            isReprint={printer.receiptDocument.isReprint}
            settings={settings?.settings}
          />
        )}
        {printer.tokenDocument && (
          <TokenDocument token={printer.tokenDocument} settings={settings?.settings} />
        )}
      </PrintPortal>
    </div>
  );
};

export default OrderScreen;
