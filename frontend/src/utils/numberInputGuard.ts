/**
 * Stops the mouse wheel from silently changing number fields.
 *
 * A focused <input type="number"> increments on scroll. In a POS that is a real
 * hazard: a cashier tabs into "Cash received", nudges the wheel to see the rest
 * of the bill, and the amount quietly changes under them. The number that gets
 * recorded is then not the number anyone typed.
 *
 * Done once at the document level rather than per field, so a number input
 * added later cannot miss the guard.
 *
 * Both halves matter:
 *   preventDefault  stops the value changing on this tick
 *   blur            hands the page back its scroll, so the next tick scrolls
 *                   normally instead of trapping the wheel over the field
 */
export const installNumberInputGuard = () => {
  const onWheel = (event: WheelEvent) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== "number") return;
    // Not focused means it is not going to change anyway - let the page scroll.
    if (document.activeElement !== target) return;

    event.preventDefault();
    target.blur();
  };

  // passive: false, or preventDefault is ignored on wheel events.
  document.addEventListener("wheel", onWheel, { passive: false });

  return () => document.removeEventListener("wheel", onWheel);
};

export default installNumberInputGuard;
