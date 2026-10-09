import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { FiArrowLeft } from "react-icons/fi";
import { Button, Input, Select } from "../ui/primitives";
import { presetRange, type RangePreset } from "../../utils/format";

export const PageHeader = ({
  title,
  subtitle,
  actions,
  backTo,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  children?: ReactNode;
}) => (
  <header className="no-print mb-5 flex flex-wrap items-start justify-between gap-4">
    <div className="flex min-w-0 items-start gap-3">
      {backTo && (
        <Link
          to={backTo}
          className="mt-1 rounded-lg border border-ink-300 bg-white p-2 text-ink-600 transition-colors hover:bg-ink-50"
          aria-label="Back"
        >
          <FiArrowLeft className="size-4" />
        </Link>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold text-ink-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
        {children}
      </div>
    </div>

    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/* ------------------------------------------------------------------ */
/* DATE RANGE PICKER                                                   */
/*                                                                     */
/* Every report answers "from this date to this date", so the control   */
/* is shared: presets for the common questions, two date inputs for     */
/* everything else.                                                    */
/* ------------------------------------------------------------------ */

const PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "year", label: "This Year" },
];

export const RangePicker = ({
  from,
  to,
  onChange,
  actions,
}: {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  actions?: ReactNode;
}) => {
  const activePreset = PRESETS.find((preset) => {
    const range = presetRange(preset.key);
    return range.from === from && range.to === to;
  })?.key;

  return (
    <div className="no-print mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-ink-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange(presetRange(preset.key))}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              activePreset === preset.key
                ? "bg-brand-600 text-white"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-wrap items-end gap-2">
        <Input
          type="date"
          label="From"
          value={from}
          max={to}
          onChange={(event) => onChange({ from: event.target.value, to })}
          wrapperClassName="w-40"
        />
        <Input
          type="date"
          label="To"
          value={to}
          min={from}
          onChange={(event) => onChange({ from, to: event.target.value })}
          wrapperClassName="w-40"
        />
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};

/** Search + optional filter selects, the header every list screen shares. */
export const FilterBar = ({
  search,
  onSearch,
  placeholder = "Search...",
  searchRef,
  children,
  actions,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  children?: ReactNode;
  actions?: ReactNode;
}) => (
  <div className="no-print mb-4 flex flex-wrap items-end gap-3">
    <Input
      ref={searchRef}
      value={search}
      onChange={(event) => onSearch(event.target.value)}
      placeholder={placeholder}
      wrapperClassName="min-w-56 flex-1"
      onKeyDown={(event) => {
        if (event.key === "Escape") onSearch("");
      }}
    />
    {children}
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const SelectFilter = ({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) => (
  <Select
    label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    wrapperClassName="w-44"
  >
    <option value="">{allLabel}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
);

export const PrintButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="secondary" onClick={onClick} hint="Ctrl+P">
    Print
  </Button>
);

export default PageHeader;
