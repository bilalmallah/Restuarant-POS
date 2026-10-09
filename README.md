# Easy Restaurant

A complete restaurant point-of-sale platform: table service, kitchen tokens, a credit
book (khata), staff payroll and commission, daily expenses, kitchen stock closing, and
printable reports for any date range.

Built with **Node + Express + PostgreSQL (Sequelize)** on the back and
**React 19 + TypeScript + Vite + Tailwind + Redux Toolkit Query** on the front.

---

## The one file you edit first

Everything about the restaurant's identity lives in **one `.env` at the project root**.
Change `APP_NAME` there and the login screen, sidebar, browser tab, every printed
receipt, every kitchen token and every report header all follow. Nothing else in the
codebase hardcodes the name.

```dotenv
APP_NAME="Sindhu Fish Point"
APP_CURRENCY="Rs"
APP_ADDRESS="Main Road, Karachi"
APP_PHONE="0300-0000000"
```

The backend reads this file directly; Vite reads it through `envDir` and compiles the
values in at build time (see `frontend/vite.config.ts`).

---

## Getting started

```bash
# 1. Install both halves
npm run install:all

# 2. Point .env at your Postgres, then create and seed the database
npm run init-db

# 3. Run it (two terminals)
npm run dev:backend      # API on http://localhost:5000
npm run dev:frontend     # UI  on http://localhost:5173
```

Sign in with **admin / admin123** (set by `DEFAULT_ADMIN_*` in `.env`).

For production, build the SPA once and let the API serve it from a single port:

```bash
npm run build
npm start                # http://localhost:5000 serves both API and UI
```

`npm run reset-db` drops and rebuilds every table, then re-seeds. Use it on a demo
install, never on a live restaurant.

### Changing the menu

The whole menu — categories, products, prices, descriptions and the order they appear in
— lives in **`backend/seed/menuData.js`**. Edit that file and run:

```bash
npm --prefix backend run import-menu
```

It is a **replace**, not a merge: every product and category is cleared and rebuilt from
the file, so the database always matches it exactly with nothing stale left behind. Bills
already taken are unaffected — every order line keeps its own copy of the name and price
it was sold at, so last month's reports survive a full menu change.

A fresh install seeds from the same file, so there is only ever one copy of the menu.

**Pizza sizes.** The ten standard pizzas share one price list (599 / 899 / 1599), so
rather than inventing a variant system they are expanded into three categories — *Pizza
(Small)*, *(Medium)*, *(Large)*. At the till that reads as "tap Large, tap Fajita", the
same way a customer orders, and the product report then splits sales by size for free.

The size itself is a field on the product (`variantLabel`), not just part of the category
name, because it has to travel: it is snapshotted onto the order line and printed on both
the kitchen token and the bill. A cook handed a slip reading only "AFGHANI PIZZA" cannot
know which size to make. Any product can carry a label — set it in the **Size / variant**
box on the Products screen, leave it blank for everything else.

---

## How the system fits together

### Taking an order

1. **Pick a waiter and a table.** Only staff flagged as waiters appear, so commission
   lands on the right person.

   Tapping a table on the floor already settles that it is dine-in, so the dialog skips
   the order-type buttons and pre-selects that table. Pressing **New Order** (F2) instead
   offers Dine In / Takeaway / Delivery, and choosing Dine In shows every table with the
   occupied ones greyed out.
2. **Add food.** Tap items, or search and press Enter. The same product tapped twice
   becomes one line with quantity 2 — unless its price was hand-edited, in which case it
   stays separate so the override is not silently overwritten.
3. **Print the kitchen token (F3).** A picker opens with the items the kitchen has *not
   already seen* ticked, so the usual case is open-and-print. Add one more paratha an hour
   later and the next token carries just that paratha. Tick anything else to reprint it —
   tokens get lost and printers jam, and refusing to reprint only means somebody walks to
   the kitchen and shouts instead. Items marked "no kitchen token" (cold drinks,
   bought-in goods) never appear at all.
4. **Send a special request.** Hold a menu tile for half a second — or right-click it —
   and the note box opens with the usual requests as one-tap chips ("no chilli", "extra
   spicy"). A plain tap still just adds the item, so nothing slows down during service.
   The note prints on the kitchen token between asterisks and stays on the bill.
5. **Adjust as the meal runs.** Double-click a price to change it *on this bill only*;
   the original stays recorded beside it. A returned cold drink is the minus button.
   Ctrl+Z undoes any of it.
6. **Print the bill (F4).** Reprints are counted, not blocked — thermal paper jams.
7. **Settle it.** F6 takes cash and works out the change. F7 puts it on a khata.

### The credit book (khata)

Only people recorded in the credit book can take credit, so nobody can invent a debtor
mid-service. Each person can hold several **accounts** (a company book and a personal
one, say); every person gets a "General" account automatically so the common case is one
tap.

Part payment is the normal case, not a special one:

| Event | Entry | Balance |
|---|---|---|
| Bill for 5,000 sent to credit | `credit 5,000` | 5,000 |
| Customer pays 3,500 | `payment 3,500` | **1,500 still pending** |

A bill can also be split at the till — hand over 500 of a 940 bill and 440 lands in the
book automatically, with the receipt printing the remaining figure and a signature line.

### Staff, salary and commission

One running ledger per employee. Everything the restaurant **owes** is a credit,
everything already **handed over** is a debit, and the balance answers the only question
that matters on salary day:

```
pending  =  salary + wages + commission + bonus  -  payments - advances - deductions
```

The worked example from the brief:

| Date | Entry | Running |
|---|---|---|
| 1 Sept | Salary posted for September — 50,000 | 50,000 |
| 14 Sept | Advance taken — 23,000 | **27,000 pending** |

Three pay structures coexist in one table — monthly salary, daily wage, or
commission-only — and only the field matching `payType` is used. Waiter commission posts
**automatically when a bill is settled**, at the rate frozen on that order, so changing
the house rate later cannot rewrite last week's payroll. The Daily Commission sheet lets
the house top that up at close of night.

### Kitchen

`Kitchen Items` is the store list (Meat, Vegetables, Spices…), deliberately separate from
menu categories — *Dairy is something you buy, not something you sell*.

The **Closing Checklist** walks that list each night: three big buttons per item (in
stock / low / finished) plus how much to buy tomorrow. Marking something finished
pre-fills its demand. Completing the sheet produces a printable **purchase list**,
grouped by category with blank rate and amount columns to fill in at the market.

Each sheet snapshots the item list when it is opened, so adding a new store item next
week never rewrites what last week's closing recorded.

### Receipt layout

**Settings → Receipt layout** controls what goes on the printed bill, with a live preview
of a sample receipt beside the controls. The preview is rendered by the same component
the printer uses, driven by the same options object, so it cannot drift from the real
thing — you are not guessing and burning a roll to find out.

| Option | Does |
|---|---|
| Paper width | 58mm / 80mm roll, or A4 |
| Text size | Compact, normal or large — smaller fits more per roll |
| Copies | Print the bill 1–3 times (customer + file) in one press |
| Extra header lines | Free text under the restaurant name: NTN, branch, licence |
| Footer lines | Free text above the thank-you note: wifi, refund policy |
| Show/hide | Address, phone, waiter, guest count, rate column, tax line, thank-you note, printed date |
| Blank lines at the end | Feeds the paper clear of the cutter |

Turning off the **rate column** gives a narrower slip showing only quantity and amount,
which is what most 58mm rolls want. The **tax line** toggle is for menus whose prices
already include tax.

### Printing without the dialog

By default the browser print dialog opens, because a web page cannot legally print
silently — that is a browser security rule, not an oversight.

To print straight to a printer with no dialog, turn on **Settings → Direct printing**,
pick a receipt printer and a kitchen printer, and press **Test print**. From then on
bills and tokens go from the API to the named Windows printer, and an unplugged printer
gives you an error on screen instead of a job stuck in a queue.

It works because the API runs on the same machine as the printers. The browser lays the
receipt out (it owns the design) and posts the finished text; the server owns the
hardware. Plain text rather than PDF is deliberate — a thermal roll is a fixed-width
character device, and rendering HTML to PDF would mean shipping a headless browser to
every restaurant.

Silent printing is Windows-only today; the Settings card says so if the API is running
anywhere else, and the browser dialog keeps working.

### The till view

**Open the floor** on the dashboard opens a second browser tab stripped down to just the
order screens — no sidebar, no reports, no settings. During service the person on the
till should not be one stray tap away from payroll, and a separate tab means the owner
can keep reports open on the same machine.

Anything under `?focus=1` renders this way, so the tab can be bookmarked.

### Reports

Every report answers "between this date and this date", with presets for today,
yesterday, this week, this month, last month and this year. All of them print.

| Report | Answers |
|---|---|
| **Sales Report** | Total sales in a range, with every bill behind the figure |
| **Product Report** | Which products sold, with quantity and value |
| **Day Book** | Money in, money out, cash in hand, and net profit |
| **Waiter Report** | Who sold what, and the commission each earned |

The Day Book deliberately shows two different "profit" numbers, because conflating them
is how restaurants convince themselves they are doing better than they are:

- **Cash in hand** — what should physically be in the drawer.
- **Net profit** — what was *earned*, counting credit sales as income.

---

## Backups

A `pg_dump` of the whole database runs **every 7 days**, keeping the 8 most recent, in
`backups/` next to the project. **Settings → Backups** shows when the last one ran, when
the next is due, and has a **Back up now** button — worth pressing once, because a backup
nobody has checked is a backup nobody knows is broken.

The server checks hourly against the newest file already on disk, so a machine that was
switched off over the weekend catches up as soon as it is turned on, and two restarts in
one day cannot produce two dumps. A failed backup is logged and never takes the till down
with it.

| `.env` | Default | |
|---|---|---|
| `ENABLE_BACKUPS` | `true` | Set `false` to turn the schedule off |
| `BACKUP_INTERVAL_DAYS` | `7` | |
| `BACKUP_KEEP` | `8` | Older files are pruned |
| `BACKUP_DIR` | `backups/` | **Point this at a synced folder or an external drive** |
| `PG_DUMP_PATH` | auto | Found automatically; set it for unusual installs |

`BACKUP_DIR` is the one worth changing on a live machine: a backup sitting on the same
disk as the database does not survive that disk failing.

Restore with `pg_restore --clean --dbname=easy_restaurant <file>`.

---

## Keyboard shortcuts

The app is built to run without a mouse. Press **F1** anywhere for the full guide — it is
generated from the same map the screens register from, so a documented key always works
and a working key is always documented.

| Key | Does |
|---|---|
| `F1` | Shortcuts guide |
| `F2` | New order |
| `F3` | Send to the kitchen (new items ticked, tick more to reprint) |
| `F4` / `Enter` | Print the bill |
| `F6` | Settle with cash |
| `F7` | Put the bill on a khata |
| `F8` | Discount |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo the last order change |
| `Ctrl+F` | Search the menu |
| `↑` `↓` `+` `-` `Del` | Move between lines and change quantity |
| `Ctrl+N` / `Ctrl+S` / `Ctrl+P` | Add / save / print on any screen |
| `Ctrl+1…5` | Jump to Floor, Sales, Credit, Kitchen, Reports |
| `Backspace` | Go back a screen (ignored while typing) |

Two mouse tricks worth knowing: **double-click a price or quantity** on the order to type
an exact value, and **hold (or right-click) a menu tile** to add it with a kitchen note.

The scroll wheel deliberately does **not** change number fields. A focused number input
normally increments on scroll, which in a POS means a cashier can nudge the wheel while
reading a bill and silently alter the amount that gets recorded.

---

## Roles

| Role | Can |
|---|---|
| **Cashier** | Take orders, print bills, settle payments, record expenses, run closing |
| **Manager** | All of the above, plus menu, tables, staff, payroll, credit and reports |
| **Admin** | Everything, plus user accounts and deleting records |

The server enforces these independently of the UI — hiding a button is not security.

---

## Project layout

```
.env                      ← single source of truth for the whole stack
backend/
  seed/                   createDatabase → createDatabaseTables → seedTables
  src/
    config/               config.js, connectDb.js, associations.js
    features/<name>/      <name>Model.js, <name>Controller.js,
                          <name>Router.js, <name>Validator.js
    middlewares/          auth, validate, errorHandler, serveFrontend
    services/             orderService, payrollService, creditService, settingsService
    utils/                helperFunctions.js, crudFactory.js
frontend/
  src/
    app/                  store.ts, baseApi.ts, brand.ts, shortcuts.ts
    features/             authSlice.ts, posApi.ts (all RTK Query endpoints)
    components/           ui/, layout/, print/
    hooks/                useStore, useHotkeys, usePrint
    pages/                Auth, Dashboard, Pos, Orders, Menu, Kitchen,
                          Credit, Expenses, Staff, Reports, Settings, Help
    types/                shared domain types
```

Models live inside their feature folder, but **every association is declared in one
place** (`config/associations.js`) — the relationships belong to no single feature, and
declaring them in the model files made the import graph circular the moment orders needed
products.

Six setup screens (tables, categories, products, employees, kitchen categories, kitchen
items) are the same CRUD screen with a different noun, so they share `utils/crudFactory.js`
rather than repeating six near-identical controllers. Anything with real behaviour —
orders, credit, payroll, closings, reports — is hand-written.

---

## Notes on the money

- Sequelize returns `DECIMAL` as a **string** to protect precision, so anything
  arithmetic passes through `toMoney()` first. `"100" + "50"` is `"10050"`, and that bug
  only shows up on a busy night.
- Discounts are applied **before** tax, and capped at the bill total — taxing first would
  overcharge the customer, and an uncapped discount would produce a refund nobody agreed
  to.
- Item name, price and category are **copied onto each bill line**. A bill printed in
  March keeps March's prices after the menu is re-priced, and retiring a dish never blanks
  out last month's report.
- Dates typed into forms are stored as the **local** calendar day. Never round-trip a
  date-only value through `toISOString()` — at UTC+5 that files every expense, salary and
  khata entry one day early, and a restaurant's busiest hour is 11pm.
- Cancelling a bill asks for the password of the account signed in at the till, checked
  on the server rather than in the dialog. A counter is normally left unlocked, and
  cancelling is how a sale disappears from the day's takings.
- Cancelled bills are **marked, never deleted**. A missing order number in the day sheet
  is what theft looks like, so the row stays with a reason on it and any commission or
  credit it created is reversed.
