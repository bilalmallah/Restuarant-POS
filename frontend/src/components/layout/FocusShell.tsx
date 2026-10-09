import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FiGrid, FiPlus, FiHelpCircle, FiLogOut, FiMinimize2 } from "react-icons/fi";

import brand, { brandInitials } from "../../app/brand";
import { useAuth } from "../../hooks/useStore";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import { Badge, Button } from "../ui/primitives";
import { useGetFloorQuery } from "../../features/posApi";

/**
 * The chrome for focus mode: one slim bar and nothing else.
 *
 * Everything on it leads deeper into taking an order - the floor, a new order,
 * the shortcut guide - or back out of the till view entirely. No section
 * switcher, no reports, no settings.
 */
export const FocusShell = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  const { data: floor } = useGetFloorQuery(undefined, { pollingInterval: 30_000 });
  const busy = floor?.tables.filter((table) => table.order).length ?? 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  /**
   * The global shortcuts live in AppShell, which this view replaces - without
   * re-registering them here, F2 and F1 were dead in the one place they matter
   * most. The section-jump keys are deliberately left out: those screens are
   * not reachable from the till view.
   */
  useHotkeys([
    { combo: SHORTCUTS.newOrder.combo, handler: () => navigate("/pos?focus=1&new=1") },
    { combo: SHORTCUTS.goFloor.combo, handler: () => navigate("/pos?focus=1") },
    { combo: SHORTCUTS.help.combo, handler: () => window.open("/shortcuts", "_blank") },
    // Skipped automatically while typing, so it still deletes characters there.
    { combo: SHORTCUTS.goBack.combo, handler: () => navigate(-1) },
  ]);

  /**
   * This view is normally its own tab. Closing it is the natural way out, but
   * window.close() only works on a tab that script opened - so fall back to
   * simply dropping the flag and showing the full app again.
   */
  const leave = () => {
    window.close();
    window.setTimeout(() => navigate("/dashboard"), 120);
  };

  return (
    <div className="app-shell flex h-screen flex-col overflow-hidden bg-ink-100">
      <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white">
          {brandInitials}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm leading-tight font-extrabold text-ink-900">
            {brand.name}
          </span>
          <span className="block text-[11px] leading-tight text-ink-500">Till view</span>
        </span>

        <Button
          size="sm"
          variant="secondary"
          icon={<FiGrid />}
          onClick={() => navigate("/pos?focus=1")}
        >
          Floor
          {busy > 0 && (
            <Badge tone="warning" className="ml-1">
              {busy}
            </Badge>
          )}
        </Button>

        <Button
          size="sm"
          variant="accent"
          icon={<FiPlus />}
          hint="F2"
          onClick={() => navigate("/pos?focus=1&new=1")}
        >
          New Order
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden text-right md:block">
            <p className="tabular text-sm leading-tight font-bold text-ink-800">
              {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[11px] leading-tight text-ink-500">{user?.name}</p>
          </div>

          <button
            type="button"
            title="Keyboard shortcuts (F1)"
            onClick={() => window.open("/shortcuts", "_blank")}
            className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          >
            <FiHelpCircle className="size-5" />
          </button>

          <Button
            size="sm"
            variant="ghost"
            icon={<FiMinimize2 />}
            onClick={leave}
            title="Leave the till view"
          >
            <span className="hidden sm:inline">Exit</span>
          </Button>

          <button
            type="button"
            title="Sign out"
            onClick={() => navigate("/login")}
            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <FiLogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
};

export default FocusShell;
