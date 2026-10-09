import { FiPrinter, FiMousePointer, FiZap, FiInfo } from "react-icons/fi";

import { SHORTCUT_GROUPS, MOUSE_TIPS } from "../../app/shortcuts";
import { usePrintPage } from "../../hooks/usePrint";
import useHotkeys from "../../hooks/useHotkeys";
import { SHORTCUTS } from "../../app/shortcuts";
import brand from "../../app/brand";
import { Button, Card, CardHeader, Kbd } from "../../components/ui/primitives";
import PageHeader from "../../components/layout/PageHeader";

/**
 * The reference card new staff get pointed at on day one.
 *
 * It is generated from the same SHORTCUTS map the screens register, so a key
 * listed here always works and a key that works is always listed.
 */
const Shortcuts = () => {
  const printPage = usePrintPage();

  useHotkeys([{ combo: SHORTCUTS.print.combo, handler: printPage, allowInInput: true }]);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Keyboard Shortcuts"
        subtitle="Learn five of these and you will never touch the mouse during service"
        actions={
          <Button variant="secondary" size="lg" icon={<FiPrinter />} onClick={printPage}>
            Print this page
          </Button>
        }
      />

      <div className="print-only mb-4 border-b-2 border-black pb-2 text-center">
        <h1 className="text-xl font-black uppercase">{brand.name}</h1>
        <p className="text-sm font-bold">Keyboard Shortcuts</p>
      </div>

      <Card className="no-print mb-5 border-brand-200 bg-brand-50">
        <div className="flex items-start gap-3">
          <FiZap className="mt-0.5 size-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-bold text-brand-900">Start with these three</p>
            <p className="mt-1 text-sm text-brand-800">
              <Kbd>F2</Kbd> start a new order &nbsp;·&nbsp; <Kbd>F4</Kbd> print the bill
              &nbsp;·&nbsp; <Kbd>F6</Kbd> take cash. Everything else can wait until those feel
              automatic.
            </p>
          </div>
        </div>
      </Card>

      <div className="print-sheet grid gap-4 lg:grid-cols-2">
        {SHORTCUT_GROUPS.map((group) => (
          <Card key={group.title} className="break-inside-avoid">
            <CardHeader title={group.title} subtitle={group.note} />

            <dl className="divide-y divide-ink-100">
              {group.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.combo}
                  className="print-row flex items-baseline justify-between gap-4 py-2"
                >
                  <dt className="text-sm text-ink-600">{shortcut.description}</dt>
                  <dd className="shrink-0">
                    <Kbd>{shortcut.display}</Kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}

        <Card className="break-inside-avoid">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FiMousePointer className="size-4" /> Mouse tricks
              </span>
            }
            subtitle="Things that are hard to discover on your own"
          />

          <dl className="divide-y divide-ink-100">
            {MOUSE_TIPS.map((tip) => (
              <div key={tip.action} className="print-row py-2">
                <dt className="text-sm font-semibold text-ink-800">{tip.action}</dt>
                <dd className="text-sm text-ink-500">{tip.result}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="mt-4 break-inside-avoid">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <FiInfo className="size-4" /> How the flow works
            </span>
          }
          subtitle="The path a normal order takes through the system"
        />

        <ol className="space-y-2.5">
          {[
            ["Pick a waiter and a free table", "Only staff marked as waiters appear, so commission lands on the right person."],
            ["Add the food", "Tap items, or search and press Enter. The same item tapped twice becomes one line with quantity 2."],
            ["Print the kitchen token (F3)", "Only items the kitchen has not seen appear on it - add one more paratha later and the next token shows just that paratha. Cold drinks never print."],
            ["Adjust as the meal goes", "Double-click a price to change it on this bill only. A returned cold drink is just the minus button."],
            ["Print the bill (F4)", "Prices, discount and the total, on thermal paper. Reprints are counted, not blocked."],
            ["Settle it", "F6 for cash - it works out the change. F7 to put it on someone's khata: pick the person, pick their account, and any part payment splits automatically."],
            ["Close the kitchen", "The closing checklist walks the store room and prints tomorrow's purchase list."],
          ].map(([title, detail], index) => (
            <li key={title} className="print-row flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-700">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-800">{title}</span>
                <span className="block text-sm text-ink-500">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <p className="no-print mt-4 text-center text-sm text-ink-400">
        Press <Kbd>F1</Kbd> from anywhere in {brand.name} to come back to this page.
      </p>
    </div>
  );
};

export default Shortcuts;
