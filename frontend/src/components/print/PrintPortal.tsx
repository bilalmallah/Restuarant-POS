import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a printable document at the very end of <body>, outside the app shell.
 *
 * This has to be a portal. Printing hides `.app-shell` with `display: none`, and
 * `display: none` hides every descendant no matter what their own display value
 * says - so a `.print-only` container left inside the page tree is hidden along
 * with everything else and the printer spits out a blank sheet.
 */
export const PrintPortal = ({ children }: { children: ReactNode }) => {
  if (typeof document === "undefined") return null;

  return createPortal(<div className="print-only">{children}</div>, document.body);
};

export default PrintPortal;
