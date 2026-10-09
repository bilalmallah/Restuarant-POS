import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiXCircle,
  FiSave,
  FiPrinter,
  FiFilter,
  FiUnlock,
} from "react-icons/fi";

import {
  useGetClosingByDateQuery,
  useOpenClosingMutation,
  useSaveClosingItemsMutation,
  useCompleteClosingMutation,
  useReopenClosingMutation,
  useGetShoppingListQuery,
} from "../../features/posApi";
import { SHORTCUTS } from "../../app/shortcuts";
import useHotkeys from "../../hooks/useHotkeys";
import usePrinter from "../../hooks/usePrinter";
import { useCan } from "../../hooks/useStore";
import { toDateInput, formatDate, qty as formatQty } from "../../utils/format";
import { errorMessage } from "../../utils/api";
import { useToast } from "../../components/ui/Toast";
import { Badge, Button, Card, Input, Loader, Textarea, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import { ShoppingListDocument } from "../../components/print/Receipt";
import PrintPortal from "../../components/print/PrintPortal";
import type { ClosingItem, StockStatus } from "../../types";

/* ------------------------------------------------------------------ */
/* ONE CHECKLIST ROW                                                   */
/*                                                                     */
/* Three big buttons rather than a dropdown: this is filled in at       */
/* midnight, standing in a store room, on a tablet, by someone who      */
/* wants to be going home.                                             */
/* ------------------------------------------------------------------ */

const STATUS_BUTTONS: { value: StockStatus; label: string; icon: typeof FiCheckCircle; active: string }[] = [
  { value: "available", label: "In stock", icon: FiCheckCircle, active: "bg-emerald-600 text-white border-emerald-600" },
  { value: "low", label: "Low", icon: FiAlertTriangle, active: "bg-amber-500 text-white border-amber-500" },
  { value: "out", label: "Finished", icon: FiXCircle, active: "bg-red-600 text-white border-red-600" },
];

type Draft = { status: StockStatus; demandQuantity: string; note: string };

const ChecklistRow = ({
  item,
  draft,
  onChange,
  disabled,
}: {
  item: ClosingItem;
  draft: Draft;
  onChange: (next: Partial<Draft>) => void;
  disabled: boolean;
}) => (
  <div
    className={clsx(
      "flex flex-wrap items-center gap-3 border-b border-ink-100 px-3 py-2.5 transition-colors last:border-0",
      draft.status === "out" && "bg-red-50/60",
      draft.status === "low" && "bg-amber-50/60"
    )}
  >
    <div className="min-w-40 flex-1">
      <p className="font-bold text-ink-900">{item.itemName}</p>
      <p className="text-xs text-ink-500">
        {item.categoryName} · measured in {item.unit}
      </p>
    </div>

    <div className="flex gap-1">
      {STATUS_BUTTONS.map((option) => {
        const Icon = option.icon;
        const isActive = draft.status === option.value;

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              // Marking something finished almost always means "buy it", so
              // the demand box pre-fills rather than being left at zero.
              const shouldPrefill =
                option.value !== "available" && Number(draft.demandQuantity) === 0;

              onChange({
                status: option.value,
                ...(shouldPrefill && {
                  demandQuantity: String(Number(item.demandQuantity) || Number(item.inStockQuantity) || 1),
                }),
              });
            }}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg border-2 px-2.5 py-2 text-xs font-bold transition-colors disabled:opacity-60",
              isActive ? option.active : "border-ink-200 bg-white text-ink-500 hover:border-ink-300"
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>

    <div className="flex items-center gap-1.5">
      <label className="text-[11px] font-bold tracking-wide text-ink-500 uppercase">Need</label>
      <input
        type="number"
        min={0}
        step={0.5}
        disabled={disabled}
        value={draft.demandQuantity}
        onChange={(event) => onChange({ demandQuantity: event.target.value })}
        onFocus={(event) => event.currentTarget.select()}
        className="tabular h-9 w-20 rounded-lg border border-ink-300 px-2 text-right text-sm font-bold outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:bg-ink-100"
      />
      <span className="w-12 text-xs text-ink-400">{item.unit}</span>
    </div>

    <input
      type="text"
      disabled={disabled}
      value={draft.note}
      onChange={(event) => onChange({ note: event.target.value })}
      placeholder="Note"
      className="h-9 w-36 rounded-lg border border-ink-300 px-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 disabled:bg-ink-100"
    />
  </div>
);

/* ------------------------------------------------------------------ */
/* CLOSING CHECKLIST                                                   */
/* ------------------------------------------------------------------ */

const ClosingChecklist = () => {
  const toast = useToast();
  const { isManager } = useCan();

  const [date, setDate] = useState(() => toDateInput());
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [note, setNote] = useState("");
  const [dirty, setDirty] = useState(false);

  const { data: closing, isLoading, isFetching } = useGetClosingByDateQuery(date);
  const [openClosing, { isLoading: opening }] = useOpenClosingMutation();
  const [saveItems, { isLoading: saving }] = useSaveClosingItemsMutation();
  const [completeClosing, { isLoading: completing }] = useCompleteClosingMutation();
  const [reopenClosing] = useReopenClosingMutation();

  const { data: shoppingList } = useGetShoppingListQuery(closing?.id ?? 0, { skip: !closing?.id });
  const printer = usePrinter();

  // Seed the local drafts whenever a different sheet loads. Edits are held
  // locally and saved in one request - the store room wifi is not to be trusted
  // with forty individual PATCHes.
  useEffect(() => {
    if (!closing?.items) {
      setDrafts({});
      return;
    }

    setDrafts(
      Object.fromEntries(
        closing.items.map((item) => [
          item.id,
          {
            status: item.status,
            demandQuantity: String(Number(item.demandQuantity) || 0),
            note: item.note ?? "",
          },
        ])
      )
    );
    setNote(closing.note ?? "");
    setDirty(false);
  }, [closing]);

  const locked = closing?.status === "completed";

  const visibleItems = useMemo(() => {
    const items = closing?.items ?? [];
    if (!issuesOnly) return items;

    return items.filter((item) => drafts[item.id]?.status !== "available");
  }, [closing, drafts, issuesOnly]);

  const stats = useMemo(() => {
    const items = closing?.items ?? [];
    const values = items.map((item) => drafts[item.id]?.status ?? item.status);

    return {
      total: items.length,
      available: values.filter((status) => status === "available").length,
      low: values.filter((status) => status === "low").length,
      out: values.filter((status) => status === "out").length,
      toBuy: items.filter((item) => Number(drafts[item.id]?.demandQuantity ?? 0) > 0).length,
    };
  }, [closing, drafts]);

  const updateDraft = (id: number, next: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...next } }));
    setDirty(true);
  };

  const save = async () => {
    if (!closing) return;

    try {
      await saveItems({
        id: closing.id,
        body: {
          note,
          items: Object.entries(drafts).map(([id, draft]) => ({
            id: Number(id),
            status: draft.status,
            demandQuantity: Number(draft.demandQuantity) || 0,
            note: draft.note || null,
          })),
        },
      }).unwrap();

      setDirty(false);
      toast.success("Closing sheet saved");
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not save the sheet"));
    }
  };

  const completeAndPrint = async () => {
    if (!closing) return;

    try {
      if (dirty) await save();
      await completeClosing({ id: closing.id, note }).unwrap();
      toast.success("Closing completed - printing the purchase list");
    } catch (caught) {
      toast.error(errorMessage(caught, "Could not complete the closing"));
    }
  };

  const printList = () => {
    if (!shoppingList) {
      toast.warning("Nothing to print yet");
      return;
    }
    void printer.printShoppingList(shoppingList);
  };

  useHotkeys(
    [
      { combo: SHORTCUTS.save.combo, handler: save, allowInInput: true },
      { combo: SHORTCUTS.print.combo, handler: printList, allowInInput: true },
    ],
    [closing, drafts, note, shoppingList]
  );

  if (isLoading) return <Loader label="Loading the closing sheet" />;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Closing Checklist"
        subtitle="Walk the store room, mark what is finished, and set what to buy tomorrow"
        actions={
          <>
            <Input
              type="date"
              value={date}
              max={toDateInput()}
              onChange={(event) => setDate(event.target.value)}
              wrapperClassName="w-44"
            />
            {closing && !locked && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<FiSave />}
                  hint="Ctrl+S"
                  loading={saving}
                  onClick={save}
                  disabled={!dirty}
                >
                  {dirty ? "Save" : "Saved"}
                </Button>
                <Button
                  size="lg"
                  variant="success"
                  icon={<FiCheckCircle />}
                  loading={completing}
                  onClick={completeAndPrint}
                >
                  Complete
                </Button>
              </>
            )}
            {closing && (
              <Button variant="secondary" size="lg" icon={<FiPrinter />} hint="Ctrl+P" onClick={printList}>
                Print List
              </Button>
            )}
          </>
        }
      />

      {!closing ? (
        <Card>
          <EmptyState
            icon={<FiCheckCircle />}
            title={`No closing sheet for ${formatDate(date)}`}
            message="Starting a sheet takes a snapshot of your kitchen items, so later changes to the store list never rewrite tonight's record."
            action={
              <Button
                size="lg"
                loading={opening}
                onClick={async () => {
                  try {
                    await openClosing({ businessDate: date }).unwrap();
                    toast.success("Closing sheet started");
                  } catch (caught) {
                    toast.error(errorMessage(caught, "Could not start the sheet"));
                  }
                }}
              >
                Start the closing for {formatDate(date)}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone={locked ? "success" : "warning"}>
              {locked ? "Completed" : "Draft - not finished"}
            </Badge>
            {closing.checkedByName && (
              <span className="text-sm text-ink-500">Checked by {closing.checkedByName}</span>
            )}
            {isFetching && <span className="text-xs text-ink-400">refreshing...</span>}
            {locked && isManager && (
              <Button
                size="sm"
                variant="ghost"
                icon={<FiUnlock />}
                onClick={async () => {
                  await reopenClosing(closing.id).unwrap();
                  toast.info("Sheet re-opened for editing");
                }}
              >
                Re-open
              </Button>
            )}
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Items checked" value={stats.total} />
            <StatTile label="In stock" value={stats.available} tone="success" />
            <StatTile label="Running low" value={stats.low} tone={stats.low ? "warning" : "default"} />
            <StatTile label="Finished" value={stats.out} tone={stats.out ? "danger" : "default"} />
          </div>

          <Card padded={false} className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-ink-50 px-3 py-2.5">
              <p className="text-sm font-bold text-ink-700">
                {visibleItems.length} of {stats.total} items
                {stats.toBuy > 0 && (
                  <span className="ml-2 font-normal text-brand-700">
                    · {stats.toBuy} to buy tomorrow
                  </span>
                )}
              </p>

              <Button
                size="sm"
                variant={issuesOnly ? "primary" : "secondary"}
                icon={<FiFilter />}
                onClick={() => setIssuesOnly((value) => !value)}
              >
                {issuesOnly ? "Showing issues only" : "Show issues only"}
              </Button>
            </div>

            {visibleItems.length === 0 ? (
              <EmptyState
                title={issuesOnly ? "Everything is in stock" : "This sheet has no items"}
                message={
                  issuesOnly
                    ? "Nothing is low or finished. Turn the filter off to see the full list."
                    : "Add items under Kitchen Items, then start a new sheet."
                }
              />
            ) : (
              visibleItems.map((item) => (
                <ChecklistRow
                  key={item.id}
                  item={item}
                  draft={
                    drafts[item.id] ?? {
                      status: item.status,
                      demandQuantity: String(Number(item.demandQuantity) || 0),
                      note: item.note ?? "",
                    }
                  }
                  onChange={(next) => updateDraft(item.id, next)}
                  disabled={locked}
                />
              ))
            )}
          </Card>

          <Card className="mt-4">
            <Textarea
              label="Note for tomorrow"
              value={note}
              disabled={locked}
              onChange={(event) => {
                setNote(event.target.value);
                setDirty(true);
              }}
              placeholder="Anything the morning shift should know - deliveries expected, gas cylinder low..."
            />
          </Card>

          {stats.toBuy > 0 && (
            <Card className="mt-4 border-brand-200 bg-brand-50">
              <p className="mb-2 text-sm font-bold text-brand-800">
                Tomorrow's purchase list ({stats.toBuy} items)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(closing.items ?? [])
                  .filter((item) => Number(drafts[item.id]?.demandQuantity ?? 0) > 0)
                  .map((item) => (
                    <span
                      key={item.id}
                      className="rounded-lg border border-brand-300 bg-white px-2.5 py-1 text-xs font-semibold text-brand-800"
                    >
                      {item.itemName}{" "}
                      <span className="tabular font-bold">
                        {formatQty(Number(drafts[item.id].demandQuantity))} {item.unit}
                      </span>
                    </span>
                  ))}
              </div>
            </Card>
          )}
        </>
      )}

      <PrintPortal>
        {printer.listDocument && <ShoppingListDocument list={printer.listDocument} />}
      </PrintPortal>
    </div>
  );
};

export default ClosingChecklist;
