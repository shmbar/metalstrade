# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

To clear the build cache and restart cleanly:
```bash
rm -rf .next && npm run dev
```

If port 3000 is in use:
```bash
netstat -ano | grep ":3000"   # find PID
taskkill //F //PID <PID>       # kill it
```

## Architecture Overview

**Next.js 15 App Router** with all pages under `app/(root)/`. The app is an Inventory Management System for metals/alloys trading.

### Page Structure (`app/(root)/`)
| Page | Purpose |
|------|---------|
| `contracts/` | Purchase orders / contracts with suppliers |
| `cashflow/` | Cash flow tracking — stocks, clients, suppliers, expenses |
| `margins/` | Margin analysis per contract |
| `materialtables/` | Material element composition tables (Ni, Cr, Mo, etc.) |
| `invoices/` | Client sales invoices |
| `expenses/` | Supplier-linked expenses |
| `companyexpenses/` | Company-level expenses |
| `stocks/` | Stock/inventory tracking |
| `dashboard/` | Overview dashboard |
| `formulas/` | Pricing formula calculations |
| `shipment/` | Shipment tracking |
| `settings/` | App settings (suppliers, clients, etc.) |
| `analysis/` | Data analysis views |
| `accounting/` | Accounting-only restricted view |

### Data Layer — Firebase
- **Firestore** for all data (`utils/firebase.js` exports `db`, `auth`, `storage`)
- All Firestore reads/writes go through `utils/utils.js` (loadData, saveData, etc.)
- Data is namespaced per user via `uidCollection` from `useAuthContext`
- Firebase config comes entirely from `.env` (`NEXT_PUBLIC_*` vars)

### Context / State Architecture
All global state lives in `app/providers.js` which wraps the app in this order:
```
SettingsProvider → AuthContextProvider → ContractsProvider → InvoiceProvider → ExpensesProvider
```

- **SettingsContext** (`contexts/useSettingsContext.js` + `hooks/useSettingsState.js`) — holds `settings` (suppliers, clients, app config), `compData` (language), `dateSelect`, `loading`, `toast`
- **AuthContext** (`contexts/useAuthContext.js`) — `user`, `uidCollection`, `userTitle`, `loadingPage`
- **ContractsContext** — contract modal state (`setValueCon`, `setIsOpenCon`)
- **InvoiceContext** — invoice modal state (`blankInvoice`)
- **ExpensesContext** — expense modal state (`setValueExp`, `setIsOpen`)

The `settings` object contains nested objects loaded from Firestore: `settings.Supplier.Supplier[]`, `settings.Client.Client[]`, etc.

### Routing & Auth
- Auth guard is in `app/(root)/layout.js` — unauthenticated users are redirected to `/signin`
- `userTitle === 'accounting'` restricts users to `/accounting` only
- After sign-in, users land on `/contracts`

### Cashflow Page Pattern
`app/(root)/cashflow/` is the most complex page:
- `page.js` — main page with all section rows and accordion layout
- `funcs.js` — all expanded detail table render functions (`stoclToolTip`, `stocksUnSold`, `supplierDetails`, `clientDetails`, `expensesToolTip`)
- `accordion.js` — `MyAccordion` wrapper around Radix accordion
- `dialogSupplier.js` / `dialogClient.js` — partial payment modals
- Detail tables use the global CSS class `cashflow-detail-table` (defined in `globals.css`)

### Styling Conventions

**Everything routes through tokens.** No raw hex, no `text-xs`/`text-sm`, no
`text-[13px]`, no inline `fontSize`. If a value you need doesn't exist, add it to the
ladder in `app/globals.css` — don't hardcode it at the call site. `npm run design:check`
enforces this over every file; the pre-commit hook runs it on staged files.

- **Font**: Plus Jakarta Sans — **the only family in the app**. There is no Inter and no
  Poppins; `--font-mono` is the single documented exception, for IDs/hashes via `.mono`.
  - **Weight carries one meaning**: `600` = label or header. `500` = figure. `400` = body.
  - `font-bold` is remapped to **600** in `tailwind.config.js`, so nothing renders at 700
    except the marketing hero (`font-extrabold`).
  - Numeric content is `500` + `tabular-nums`, applied by `.numeric` / `.tnum` /
    `[data-numeric]`. Inside a `<th>` it lifts back to 600 — there the number is the label.
- **Colour tokens** (CSS variables in `globals.css`; `utils/themes.js` derives every
  dark/preset value from them):
  - `var(--brand)` / `var(--endeavour)` = `#6D5CE0` (primary violet)
  - `var(--ink)`, `var(--ink-secondary)`, `var(--ink-muted)` = text
  - `var(--bg-page)`, `var(--bg-card)`, `var(--bg-subtle)`, `var(--bg-sunken)` = surfaces
  - `var(--line)`, `var(--line-strong)` = borders
  - Status families: `--ok-*` (positive), `--warn-*` (caution), `--danger-*` (negative),
    `--violet-*` (brand/info), `--pink-*` (a 6th hue for avatars — **not** a status)
  - All five families are deliberately **muted** (client revision 2026-08-08). There is no
    bright pink, orange, emerald or rose anywhere: Tailwind's `orange`/`emerald`/`rose`
    utilities are mapped onto `warn`/`ok`/`danger` in `tailwind.config.js`, so a call site
    cannot reintroduce one.
- **Status colour lives in `components/statusUtils.js`** — `TONES`, `statusTone(label)`,
  `toneChipStyle(tone)`, `statusChipStyle(label)`, `amountToneClass(n)`, `MOVEMENT`.
  Build chips from there rather than hand-rolling bg/text/border triples.
  Signed amounts colour **negatives only**; a positive is the normal case in a ledger.
- **Type ladder** (`--fs-*` in `globals.css`, re-declared at 1280/1536/1920):
  `--fs-caption` `--fs-table` `--fs-body` `--fs-input` `--fs-title` `--fs-page` `--fs-stat`.
  Reachable as classes (`.responsiveText`, `.responsiveTextTable`, `.responsiveTextTitle`,
  `.responsiveTextInput`, `.responsiveTextStat`, …) or as `fontSize: 'var(--fs-body)'`.
  App chrome (`.text-display` `.text-title` `.text-stat` `.text-caption` `.text-micro`) is
  deliberately **fixed**, not on the ladder — page furniture shouldn't grow with the monitor.
- **Density**: Tailwind's spacing scale is rescaled ~-12.5% in `tailwind.config.js` (steps
  1.5–10 only; 11+ are layout widths and are left alone). Control band is **h-7 24px /
  h-8 28px / h-9 32px**. Compact the token layer, never page-by-page.
- **One radius**: `--radius-card` = `--radius-panel` = `--radius-control` = **10px**, and
  `rounded-lg`/`rounded-2xl`/`rounded-3xl` all resolve to it. `rounded-full` is for
  pills/avatars only.
- **Tables** read as a grid: zero-specificity `:where()` rules in `globals.css` give every
  table header/body/footer its borders and a 3px/6px cell floor. Any explicit class on the
  same property overrides them, so existing per-table styling still wins.
- **Button classes**: `.blackButton` (primary), `.whiteButton`, `.supplierButton`,
  `.supplierAddButton` — all one band (h-8, `--radius-control`, 12px type).
- **Cards**: `border border-[var(--line)]` + `shadow-card`. A surface should not float
  without a border.

### Key Libraries
- **TanStack React Table v8** — table state management
- **NumericFormat** (react-number-format) — all currency/number display
- **Radix UI** — all interactive primitives (Select, Accordion, Dialog, etc.)
- **react-tailwindcss-datepicker v1.6.6** — date range picker (pin this version)
- **exceljs + file-saver** — Excel export
- **jsPDF + jspdf-autotable** — PDF export
- **dnd-kit** — drag-and-drop
- **Firebase v10** — auth + Firestore + Storage

### Margins Page
- `firstpart.js` — 5 stat boxes (Incoming, Outstanding shipment, Quantity, Profits, Shipped)
- `newTable.js` — main editable table with pill-style inputs
- `thirdpart.js` — Totals / Total GIS read-only tables
- `components/input.js` + `components/select.js` — shared pill-styled input components

### AI / Floating Chat
`components/FloatingChat.js` is mounted in the root layout for all authenticated pages. The app uses `openai` package (see `package.json`) for AI features.
