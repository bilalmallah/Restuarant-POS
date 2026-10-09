/**
 * The keyboard map for the whole app, in one place.
 *
 * It is both the source of truth for what the screens register AND what the
 * Shortcuts help page renders - so a key can never be documented but dead, or
 * live but undocumented.
 */

export type ShortcutDef = {
  combo: string;
  /** How the key is drawn on the help page and on button chips. */
  display: string;
  description: string;
};

export type ShortcutGroup = {
  title: string;
  note?: string;
  shortcuts: ShortcutDef[];
};

export const SHORTCUTS = {
  /* Global */
  help: { combo: "f1|shift+?", display: "F1", description: "Open this shortcuts guide" },
  search: { combo: "ctrl+k", display: "Ctrl + K", description: "Jump to search on the current screen" },
  newOrder: { combo: "f2", display: "F2", description: "Start a new order" },
  goFloor: { combo: "ctrl+1", display: "Ctrl + 1", description: "Go to the floor plan" },
  goOrders: { combo: "ctrl+2", display: "Ctrl + 2", description: "Go to sales history" },
  goCredit: { combo: "ctrl+3", display: "Ctrl + 3", description: "Go to the credit book" },
  goKitchen: { combo: "ctrl+4", display: "Ctrl + 4", description: "Go to the closing checklist" },
  goReports: { combo: "ctrl+5", display: "Ctrl + 5", description: "Go to reports" },
  close: { combo: "escape", display: "Esc", description: "Close the dialog, or clear the search box" },
  goBack: { combo: "backspace", display: "Backspace", description: "Go back to the screen you came from" },

  /* Order screen */
  printToken: { combo: "f3", display: "F3", description: "Send to the kitchen - new items are ticked, tick more to reprint" },
  printBill: { combo: "f4|enter", display: "F4", description: "Print the customer bill" },
  payCash: { combo: "f6", display: "F6", description: "Settle the bill with cash" },
  sendCredit: { combo: "f7", display: "F7", description: "Put the bill on someone's khata" },
  discount: { combo: "f8", display: "F8", description: "Apply a discount to the bill" },
  focusMenuSearch: { combo: "ctrl+f", display: "Ctrl + F", description: "Search the menu" },
  undo: { combo: "ctrl+z", display: "Ctrl + Z", description: "Undo the last change to the order" },
  redo: { combo: "ctrl+y|ctrl+shift+z", display: "Ctrl + Y", description: "Redo the change you just undid" },
  removeLine: { combo: "delete", display: "Del", description: "Remove the selected line from the order" },
  plusOne: { combo: "+|=", display: "+", description: "One more of the selected item" },
  minusOne: { combo: "-", display: "-", description: "One less of the selected item (zero removes it)" },
  lineUp: { combo: "arrowup", display: "Up", description: "Select the line above" },
  lineDown: { combo: "arrowdown", display: "Down", description: "Select the line below" },

  /* Forms and lists */
  save: { combo: "ctrl+s", display: "Ctrl + S", description: "Save the form that is open" },
  addNew: { combo: "ctrl+n", display: "Ctrl + N", description: "Add a new row on the current screen" },
  print: { combo: "ctrl+p", display: "Ctrl + P", description: "Print the report or statement on screen" },
  refresh: { combo: "f5", display: "F5", description: "Reload the screen" },
} as const satisfies Record<string, ShortcutDef>;

export type ShortcutName = keyof typeof SHORTCUTS;

/** Grouped for the help page, in the order a new member of staff learns them. */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Everywhere",
    note: "These work on every screen in the app.",
    shortcuts: [
      SHORTCUTS.help,
      SHORTCUTS.newOrder,
      SHORTCUTS.search,
      SHORTCUTS.goBack,
      SHORTCUTS.close,
      SHORTCUTS.print,
      SHORTCUTS.refresh,
    ],
  },
  {
    title: "Jump between sections",
    shortcuts: [
      SHORTCUTS.goFloor,
      SHORTCUTS.goOrders,
      SHORTCUTS.goCredit,
      SHORTCUTS.goKitchen,
      SHORTCUTS.goReports,
    ],
  },
  {
    title: "Taking an order",
    note: "The keys you use most during service. Enter prints the bill.",
    shortcuts: [
      SHORTCUTS.focusMenuSearch,
      SHORTCUTS.lineUp,
      SHORTCUTS.lineDown,
      SHORTCUTS.plusOne,
      SHORTCUTS.minusOne,
      SHORTCUTS.removeLine,
      SHORTCUTS.undo,
      SHORTCUTS.redo,
    ],
  },
  {
    title: "Closing a bill",
    shortcuts: [
      SHORTCUTS.printToken,
      SHORTCUTS.printBill,
      SHORTCUTS.discount,
      SHORTCUTS.payCash,
      SHORTCUTS.sendCredit,
    ],
  },
  {
    title: "Setup screens",
    shortcuts: [SHORTCUTS.addNew, SHORTCUTS.save],
  },
];

/**
 * Mouse actions worth documenting - the price override in particular is
 * impossible to discover on your own.
 */
export const MOUSE_TIPS = [
  { action: "Double-click a price on the order", result: "Type a new price for that line only" },
  { action: "Double-click a quantity on the order", result: "Type an exact quantity" },
  { action: "Click a free table", result: "Start a new order on it" },
  { action: "Click a busy table", result: "Open the running order" },
  { action: "Hold (or right-click) a menu item", result: "Add it with a note for the kitchen, and a quantity" },
];
