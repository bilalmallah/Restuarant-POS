import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

/* ------------------------------------------------------------------ */
/* BUTTON                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  accent: "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-600 shadow-sm",
  secondary: "bg-white text-ink-700 border border-ink-300 hover:bg-ink-50 active:bg-ink-100",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-200/70 active:bg-ink-200",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm",
};

/** Sizes are generous on purpose: this gets tapped with a thumb, on a tablet. */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-5 text-base gap-2",
  xl: "h-14 px-6 text-lg gap-2.5",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  /** Renders the shortcut hint chip, e.g. F4, so staff learn the keys. */
  hint?: string;
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", loading, icon, hint, block, className, children, disabled, ...rest },
    ref
  ) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-semibold transition-colors select-none",
        "disabled:opacity-45 disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        block && "w-full",
        className
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
      {hint && (
        <kbd className="ml-1 rounded border border-current/25 bg-black/10 px-1.5 py-0.5 text-[10px] font-bold leading-none opacity-80">
          {hint}
        </kbd>
      )}
    </button>
  )
);

Button.displayName = "Button";

/* ------------------------------------------------------------------ */
/* SPINNER / LOADER                                                    */
/* ------------------------------------------------------------------ */

export const Spinner = ({ className }: { className?: string }) => (
  <svg className={clsx("animate-spin", className ?? "size-5")} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const Loader = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-ink-500">
    <Spinner className="size-8 text-brand-600" />
    <span className="text-sm font-medium">{label}...</span>
  </div>
);

/* ------------------------------------------------------------------ */
/* FIELDS                                                              */
/* ------------------------------------------------------------------ */

const fieldShell =
  "w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 " +
  "transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 focus:outline-none " +
  "disabled:bg-ink-100 disabled:text-ink-500";

type LabelledProps = { label?: string; hint?: string; error?: string; required?: boolean };

const Field = ({
  label,
  hint,
  error,
  required,
  children,
  className,
}: LabelledProps & { children: ReactNode; className?: string }) => (
  <label className={clsx("block", className)}>
    {label && (
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-600 uppercase">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
    )}
    {children}
    {error ? (
      <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>
    ) : hint ? (
      <span className="mt-1 block text-xs text-ink-500">{hint}</span>
    ) : null}
  </label>
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & LabelledProps & { wrapperClassName?: string }
>(({ label, hint, error, required, className, wrapperClassName, ...rest }, ref) => (
  <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
    <input
      ref={ref}
      className={clsx(fieldShell, "h-10", error && "border-red-400", className)}
      {...rest}
    />
  </Field>
));

Input.displayName = "Input";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & LabelledProps & { wrapperClassName?: string }
>(({ label, hint, error, required, className, wrapperClassName, children, ...rest }, ref) => (
  <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
    <select
      ref={ref}
      className={clsx(fieldShell, "h-10 pr-8", error && "border-red-400", className)}
      {...rest}
    >
      {children}
    </select>
  </Field>
));

Select.displayName = "Select";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & LabelledProps & { wrapperClassName?: string }
>(({ label, hint, error, required, className, wrapperClassName, ...rest }, ref) => (
  <Field label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
    <textarea
      ref={ref}
      rows={3}
      className={clsx(fieldShell, "py-2 leading-relaxed", error && "border-red-400", className)}
      {...rest}
    />
  </Field>
));

Textarea.displayName = "Textarea";

/** Money inputs select-all on focus, so typing over a value replaces it. */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & LabelledProps & { wrapperClassName?: string }
>((props, ref) => (
  <Input
    ref={ref}
    type="number"
    step="0.01"
    min="0"
    inputMode="decimal"
    onFocus={(event) => event.currentTarget.select()}
    {...props}
    className={clsx("tabular text-right font-semibold", props.className)}
  />
));

MoneyInput.displayName = "MoneyInput";

export const Switch = ({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-ink-300"
  >
    <span>
      <span className="block text-sm font-semibold text-ink-800">{label}</span>
      {hint && <span className="block text-xs text-ink-500">{hint}</span>}
    </span>
    <span
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-brand-600" : "bg-ink-300"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[22px]" : "left-0.5"
        )}
      />
    </span>
  </button>
);

/* ------------------------------------------------------------------ */
/* SURFACES                                                            */
/* ------------------------------------------------------------------ */

export const Card = ({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) => (
  <section
    className={clsx(
      "rounded-xl border border-ink-200 bg-white shadow-sm",
      padded && "p-4",
      className
    )}
  >
    {children}
  </section>
);

export const CardHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) => (
  <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="text-base font-bold text-ink-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/**
 * The number tiles across the top of every screen. `tone` is the only thing
 * carrying meaning, so it is always paired with a label - colour alone is not
 * legible to everyone, and definitely not on a sun-bleached counter screen.
 */
export const StatTile = ({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "brand" | "danger" | "warning" | "success";
  icon?: ReactNode;
}) => {
  const tones = {
    default: "border-ink-200 bg-white",
    brand: "border-brand-200 bg-brand-50",
    danger: "border-red-200 bg-red-50",
    warning: "border-amber-200 bg-amber-50",
    success: "border-emerald-200 bg-emerald-50",
  } as const;

  const valueTones = {
    default: "text-ink-900",
    brand: "text-brand-800",
    danger: "text-red-700",
    warning: "text-amber-800",
    success: "text-emerald-700",
  } as const;

  return (
    <div className={clsx("rounded-xl border p-4 shadow-sm", tones[tone])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">{label}</p>
        {icon && <span className="text-ink-400">{icon}</span>}
      </div>
      <p className={clsx("tabular mt-1.5 text-2xl font-extrabold", valueTones[tone])}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-500">{sub}</p>}
    </div>
  );
};

export const Badge = ({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "brand" | "danger" | "warning" | "success" | "info";
  className?: string;
}) => {
  const tones = {
    default: "bg-ink-100 text-ink-700 border-ink-200",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    danger: "bg-red-50 text-red-700 border-red-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  } as const;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

export const EmptyState = ({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    {icon && <div className="text-4xl text-ink-300">{icon}</div>}
    <div>
      <p className="text-base font-bold text-ink-700">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{message}</p>}
    </div>
    {action}
  </div>
);

/** A keycap, used in the shortcuts page and inline hints. */
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-ink-300 border-b-2 bg-ink-50 px-1.5 text-[11px] font-bold text-ink-700">
    {children}
  </kbd>
);
