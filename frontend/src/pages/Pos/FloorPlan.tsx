import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { FiPlus, FiUsers, FiClock, FiShoppingBag } from "react-icons/fi";

import { useGetFloorQuery } from "../../features/posApi";
import { money, elapsedSince } from "../../utils/format";
import { Button, Loader, Badge, EmptyState, StatTile } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";
import StartOrderDialog from "./StartOrderDialog";
import useFocusMode from "../../hooks/useFocusMode";
import type { FloorTable } from "../../types";

/* ------------------------------------------------------------------ */
/* TABLE CARD                                                          */
/*                                                                     */
/* The colour and the word both carry the status - a free table is      */
/* white with "Free" on it, never green alone, because half the staff   */
/* will be reading this across a room at a glance.                      */
/* ------------------------------------------------------------------ */

const TableCard = ({ table, onOpen }: { table: FloorTable; onOpen: (table: FloorTable) => void }) => {
  const busy = Boolean(table.order);
  const billed = table.order?.status === "billed";

  return (
    <button
      type="button"
      onClick={() => onOpen(table)}
      className={clsx(
        "flex h-32 flex-col items-start justify-between rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
        billed
          ? "border-amber-400 bg-amber-50"
          : busy
            ? "border-brand-500 bg-brand-50"
            : "border-dashed border-ink-300 bg-white hover:border-brand-400"
      )}
    >
      <div className="flex w-full items-start justify-between gap-1">
        <span className="text-lg leading-none font-extrabold text-ink-900">{table.name}</span>
        <span
          className={clsx(
            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
            billed
              ? "bg-amber-500 text-white"
              : busy
                ? "bg-brand-600 text-white"
                : "bg-ink-100 text-ink-500"
          )}
        >
          {billed ? "Billed" : busy ? "Running" : "Free"}
        </span>
      </div>

      {table.order ? (
        <div className="w-full space-y-0.5">
          <p className="tabular text-xl leading-none font-extrabold text-brand-800">
            {money(table.order.total)}
          </p>
          <p className="truncate text-[11px] font-semibold text-ink-600">
            #{table.order.orderNumber}
            {table.order.waiterName ? ` · ${table.order.waiterName}` : ""}
          </p>
          <p className="flex items-center gap-1 text-[11px] text-ink-500">
            <FiClock className="size-3" />
            {elapsedSince(table.order.openedAt)}
            <FiUsers className="ml-1 size-3" />
            {table.order.guests}
          </p>
        </div>
      ) : (
        <div className="w-full">
          <p className="flex items-center gap-1 text-xs font-semibold text-ink-400">
            <FiUsers className="size-3" /> Seats {table.capacity}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-brand-600">
            <FiPlus className="size-3" /> Start order
          </p>
        </div>
      )}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* FLOOR PLAN                                                          */
/* ------------------------------------------------------------------ */

const FloorPlan = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Polled rather than pushed: a floor screen that is 15 seconds stale is fine,
  // and a websocket is one more thing to fail on restaurant wifi.
  const { data, isLoading } = useGetFloorQuery(undefined, { pollingInterval: 15_000 });

  const focus = useFocusMode();

  const [area, setArea] = useState("");
  const [dialogTable, setDialogTable] = useState<FloorTable | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // "table" came from tapping a tile, "new" from the New Order button.
  const [dialogMode, setDialogMode] = useState<"table" | "new">("new");

  // F2 / the "New Order" button land here with ?new=1 for a takeaway.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogTable(null);
      setDialogMode("new");
      setDialogOpen(true);

      // Drop only the "new" flag - focus mode has to survive.
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const tables = useMemo(
    () => (data?.tables ?? []).filter((table) => !area || table.area === area),
    [data, area]
  );

  const stats = useMemo(() => {
    const all = data?.tables ?? [];
    const running = all.filter((table) => table.order);

    return {
      total: all.length,
      running: running.length,
      free: all.length - running.length,
      openValue: running.reduce((sum, table) => sum + (table.order?.total ?? 0), 0),
      guests: running.reduce((sum, table) => sum + (table.order?.guests ?? 0), 0),
    };
  }, [data]);

  const openTable = (table: FloorTable) => {
    if (table.order) {
      navigate(`/pos/order/${table.order.id}${focus.suffix}`);
      return;
    }

    setDialogTable(table);
    setDialogMode("table");
    setDialogOpen(true);
  };

  if (isLoading) return <Loader label="Loading the floor" />;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Floor Plan"
        subtitle="Tap a free table to start an order, or a running table to open its bill"
        actions={
          <Button
            size="lg"
            variant="accent"
            icon={<FiShoppingBag />}
            onClick={() => {
              setDialogTable(null);
              setDialogMode("new");
              setDialogOpen(true);
            }}
          >
            New Order
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Tables Running" value={stats.running} sub={`${stats.free} free`} tone="brand" />
        <StatTile label="Open Bill Value" value={money(stats.openValue)} tone="warning" />
        <StatTile label="Guests Seated" value={stats.guests} />
        <StatTile label="Total Tables" value={stats.total} />
      </div>

      {(data?.areas.length ?? 0) > 1 && (
        <div className="no-print mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setArea("")}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
              !area ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-ink-100"
            )}
          >
            All areas
          </button>
          {data?.areas.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setArea(name)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
                area === name ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-ink-100"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {tables.length === 0 ? (
        <EmptyState
          title="No tables set up yet"
          message="Add your dining tables under Menu > Tables and they will appear here."
          action={<Button onClick={() => navigate("/menu/tables")}>Set up tables</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onOpen={openTable} />
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border-2 border-dashed border-ink-300 bg-white" /> Free
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border-2 border-brand-500 bg-brand-50" /> Order running
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded border-2 border-amber-400 bg-amber-50" /> Bill printed,
          awaiting payment
        </span>
        <Badge tone="info">Floor refreshes every 15 seconds</Badge>
      </div>

      <StartOrderDialog
        open={dialogOpen}
        mode={dialogMode}
        table={dialogTable}
        tables={data?.tables ?? []}
        focusSuffix={focus.suffix}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
};

export default FloorPlan;
