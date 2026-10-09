import { useCallback, useEffect, useState } from "react";

/**
 * Printing without a popup window.
 *
 * The obvious approach - window.open() and write the receipt into it - is
 * blocked by popup blockers on exactly the machines this runs on, and loses the
 * stylesheet. Instead the document is rendered into a `.print-only` container
 * portalled onto <body> (see PrintPortal - it must not sit inside `.app-shell`,
 * which printing hides), the body is tagged so the print stylesheet reveals it,
 * and window.print() is called once React has committed the DOM.
 *
 * The tag is tied to the MOUNTED DOCUMENT, not to the window.print() call.
 * Removing it as soon as print() returns looks harmless - print() blocks while
 * the dialog is open - but any browser that returns early prints a blank sheet,
 * because the rule that reveals the receipt stops matching mid-print.
 */
export const usePrintDocument = <T,>() => {
  const [document_, setDocument] = useState<T | null>(null);

  const print = useCallback((payload: T) => setDocument(payload), []);
  const clear = useCallback(() => setDocument(null), []);

  useEffect(() => {
    if (!document_) return;

    document.body.setAttribute("data-printing", "document");

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      setDocument(null);
    };

    window.addEventListener("afterprint", finish);

    // Two frames: one for React to commit, one for the browser to lay the
    // printed sheet out. Calling print() any earlier prints a blank page.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.print();

        // afterprint is unreliable outside Chrome, so unmount on a timer too.
        // Either path ends up in the same place; `finished` stops a double run.
        window.setTimeout(finish, 1000);
      })
    );

    return () => {
      finished = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", finish);
      document.body.removeAttribute("data-printing");
    };
  }, [document_]);

  return { document: document_, print, clear };
};

/**
 * Print whatever is already on screen (a report, a statement).
 *
 * No body tag needed: the print stylesheet hides `.no-print` in every print
 * mode, which is all a report page needs stripped. Nothing is hidden wholesale,
 * so the page prints as laid out.
 */
export const usePrintPage = () =>
  useCallback(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }, []);

export default usePrintDocument;
