import { useLocation } from "react-router-dom";

/**
 * Focus mode: the till view.
 *
 * Opened in its own browser tab from "Open the floor", it strips the sidebar
 * and every link that leads away from taking orders. During service the person
 * on the till should not be one stray tap away from the payroll screen, and a
 * second tab means the owner can keep reports open on the same machine.
 *
 * It is a URL flag rather than a stored setting so the two tabs can disagree -
 * that is the entire point.
 */
export const FOCUS_PARAM = "focus";

export const useFocusMode = () => {
  const { search } = useLocation();
  const isFocus = new URLSearchParams(search).get(FOCUS_PARAM) === "1";

  return {
    isFocus,
    /** Append to a path so navigation stays inside the till view. */
    suffix: isFocus ? `?${FOCUS_PARAM}=1` : "",
    /** Build a link that keeps (or drops) focus mode. */
    to: (path: string) => (isFocus ? `${path}?${FOCUS_PARAM}=1` : path),
  };
};

export default useFocusMode;
