import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { FiCheckCircle, FiAlertTriangle, FiInfo, FiXCircle } from "react-icons/fi";

type ToastTone = "success" | "error" | "warning" | "info";

type Toast = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<ToastTone, { icon: ReactNode; className: string }> = {
  success: {
    icon: <FiCheckCircle className="size-5 shrink-0" />,
    className: "border-emerald-300 bg-emerald-50 text-emerald-900",
  },
  error: {
    icon: <FiXCircle className="size-5 shrink-0" />,
    className: "border-red-300 bg-red-50 text-red-900",
  },
  warning: {
    icon: <FiAlertTriangle className="size-5 shrink-0" />,
    className: "border-amber-300 bg-amber-50 text-amber-900",
  },
  info: {
    icon: <FiInfo className="size-5 shrink-0" />,
    className: "border-sky-300 bg-sky-50 text-sky-900",
  },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);

    // Errors stay up longer: they usually need reading, not just noticing.
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      tone === "error" ? 6000 : 3000
    );
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      warning: (message) => push("warning", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="no-print pointer-events-none fixed top-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={clsx(
                "animate-in pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg",
                TONES[toast.tone].className
              )}
            >
              {TONES[toast.tone].icon}
              <p className="text-sm leading-snug font-semibold">{toast.message}</p>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
};

export default ToastProvider;
