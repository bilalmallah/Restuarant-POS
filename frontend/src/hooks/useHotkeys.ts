import { useEffect, useRef } from "react";

export type Hotkey = {
  /** "f4", "ctrl+z", "shift+?", "escape", "ctrl+shift+p" */
  combo: string;
  handler: (event: KeyboardEvent) => void;
  /**
   * By default a shortcut is ignored while the cursor is in a text box, so
   * typing "Chicken 2" into a search field cannot fire anything. Function keys
   * and Escape opt out of that, because those are exactly the keys a cashier
   * reaches for without leaving the field.
   */
  allowInInput?: boolean;
  enabled?: boolean;
  description?: string;
};

const normalise = (event: KeyboardEvent) => {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push("ctrl");
  if (event.altKey) parts.push("alt");
  if (event.shiftKey) parts.push("shift");

  const key = event.key.toLowerCase();
  // Shift+/ produces "?" on most layouts; keep both spellings working.
  parts.push(key === " " ? "space" : key);

  return parts.join("+");
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
};

/** Keys that should work even while a field has focus. */
const ALWAYS_ALLOWED = /^(f\d{1,2}|escape)$/;

/**
 * Registers a set of keyboard shortcuts for as long as the component is mounted.
 *
 * The handlers are kept in a ref so a shortcut never goes stale between renders
 * - otherwise "F4 to print the bill" would print the bill as it looked when the
 * screen first loaded.
 */
export const useHotkeys = (hotkeys: Hotkey[], deps: unknown[] = []) => {
  const ref = useRef(hotkeys);

  useEffect(() => {
    ref.current = hotkeys;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotkeys, ...deps]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const pressed = normalise(event);
      const bareKey = event.key.toLowerCase();

      for (const hotkey of ref.current) {
        if (hotkey.enabled === false) continue;

        const combos = hotkey.combo.toLowerCase().split("|").map((value) => value.trim());
        if (!combos.includes(pressed)) continue;

        const allowed = hotkey.allowInInput ?? ALWAYS_ALLOWED.test(bareKey);
        if (!allowed && isTypingTarget(event.target)) continue;

        event.preventDefault();
        hotkey.handler(event);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};

export default useHotkeys;
