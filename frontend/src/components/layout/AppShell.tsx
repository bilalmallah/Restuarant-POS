import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { FiLogOut, FiMenu, FiX, FiHelpCircle, FiPlus, FiClock } from "react-icons/fi";

import brand, { brandInitials } from "../../app/brand";
import { SHORTCUTS } from "../../app/shortcuts";
import { useAppDispatch, useAuth } from "../../hooks/useStore";
import useHotkeys from "../../hooks/useHotkeys";
import { logout } from "../../features/auth/authSlice";
import { useGetFloorQuery } from "../../features/posApi";
import baseApi from "../../app/baseApi";
import { Badge, Button } from "../ui/primitives";
import { sectionForPath, visibleItems, visibleSections } from "./navigation";

/* ------------------------------------------------------------------ */
/* CLOCK — service runs by the clock, so it is always on screen         */
/* ------------------------------------------------------------------ */

const Clock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hidden text-right lg:block">
      <p className="tabular text-sm leading-tight font-bold text-ink-800">
        {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </p>
      <p className="text-[11px] leading-tight text-ink-500">
        {now.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SHELL                                                               */
/* ------------------------------------------------------------------ */

export const AppShell = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const role = user?.role ?? null;
  const sections = visibleSections(role);
  const activeSection = sectionForPath(location.pathname);
  const items = visibleItems(activeSection, role);

  // Busy-table count on the POS chip, so the owner can see the floor from
  // anywhere in the app without navigating to it.
  const { data: floor } = useGetFloorQuery(undefined, { pollingInterval: 30_000 });
  const busyTables = floor?.tables.filter((table) => table.order).length ?? 0;

  useEffect(() => setMobileNavOpen(false), [location.pathname]);

  const signOut = () => {
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
    navigate("/login", { replace: true });
  };

  useHotkeys([
    { combo: SHORTCUTS.goFloor.combo, handler: () => navigate("/pos") },
    { combo: SHORTCUTS.goOrders.combo, handler: () => navigate("/orders") },
    { combo: SHORTCUTS.goCredit.combo, handler: () => navigate("/credit") },
    { combo: SHORTCUTS.goKitchen.combo, handler: () => navigate("/kitchen/closing") },
    { combo: SHORTCUTS.goReports.combo, handler: () => navigate("/reports/sales") },
    { combo: SHORTCUTS.help.combo, handler: () => navigate("/shortcuts") },
    { combo: SHORTCUTS.newOrder.combo, handler: () => navigate("/pos?new=1") },
    /*
     * Backspace walks back a screen. useHotkeys skips it whenever the cursor is
     * in a field, so it still deletes characters where you would expect it to -
     * the browser bug this normally causes is exactly what that guard prevents.
     */
    { combo: SHORTCUTS.goBack.combo, handler: () => navigate(-1) },
  ]);

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-ink-100">
      {/* ---------------- Sidebar ---------------- */}
      <aside
        className={clsx(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-200 bg-white transition-transform lg:static lg:translate-x-0",
          mobileNavOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <Link
          to="/dashboard"
          className="flex items-center gap-3 border-b border-ink-200 px-4 py-4 transition-colors hover:bg-ink-50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-base font-black text-white">
            {brandInitials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm leading-tight font-extrabold text-ink-900">
              {brand.name}
            </span>
            <span className="block truncate text-[11px] text-ink-500">{brand.tagline}</span>
          </span>
        </Link>

        {/*
          Section switcher. Picking "Kitchen" swaps the whole list below to the
          kitchen pages, which keeps each role looking at four or five items
          instead of twenty.
        */}
        <nav className="grid grid-cols-3 gap-1 border-b border-ink-200 p-2">
          {sections.map((section) => {
            const isActive = section.key === activeSection.key;
            const Icon = section.icon;

            return (
              <button
                key={section.key}
                type="button"
                title={section.blurb}
                onClick={() => navigate(visibleItems(section, role)[0].to)}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-bold transition-colors",
                  isActive
                    ? "bg-brand-600 text-white shadow-sm"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                )}
              >
                <Icon className="size-4" />
                {section.label}
              </button>
            );
          })}
        </nav>

        <div className="border-b border-ink-200 px-4 py-2.5">
          <p className="text-[11px] font-bold tracking-wider text-ink-400 uppercase">
            {activeSection.label}
          </p>
          <p className="text-xs text-ink-500">{activeSection.blurb}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/pos" || item.to === "/credit"}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  )
                }
              >
                <Icon className="size-[18px] shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.to === "/pos" && busyTables > 0 && (
                  <Badge tone="warning">{busyTables}</Badge>
                )}
                {item.hint && (
                  <kbd className="hidden text-[10px] font-bold text-ink-400 xl:inline">
                    {item.hint}
                  </kbd>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-ink-200 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-ink-50 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-700 text-xs font-bold text-white">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm leading-tight font-bold text-ink-800">
                {user?.name}
              </span>
              <span className="block text-[11px] text-ink-500 capitalize">{user?.role}</span>
            </span>
          </div>

          <Button variant="ghost" size="sm" block icon={<FiLogOut />} onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div
          className="no-print fixed inset-0 z-30 bg-ink-900/40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* ---------------- Main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b border-ink-200 bg-white px-4">
          <button
            type="button"
            onClick={() => setMobileNavOpen((open) => !open)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <FiX className="size-5" /> : <FiMenu className="size-5" />}
          </button>

          <Button
            size="sm"
            variant="accent"
            icon={<FiPlus />}
            hint="F2"
            onClick={() => navigate("/pos?new=1")}
          >
            New Order
          </Button>

          {busyTables > 0 && (
            <Link to="/pos" className="hidden sm:block">
              <Badge tone="warning">
                <FiClock className="size-3" />
                {busyTables} table{busyTables === 1 ? "" : "s"} running
              </Badge>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-3">
            <Clock />
            <Link
              to="/shortcuts"
              title="Keyboard shortcuts (F1)"
              className="rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
            >
              <FiHelpCircle className="size-5" />
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
