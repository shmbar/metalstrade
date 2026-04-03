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

**Next.js 14 App Router** with all pages under `app/(root)/`. The app is an Inventory Management System for metals/alloys trading.

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
- Firebase config comes entirely from `.env.local` (`NEXT_PUBLIC_*` vars)

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
- **Font**: Poppins (site-wide), weight 600 for UI labels
- **Theme colors** (CSS variables in `globals.css`):
  - `var(--endeavour)` = `#0366ae` (primary blue)
  - `var(--chathams-blue)` = `#103a7a` (dark blue)
  - `var(--port-gore)` = `#28264f` (dark text)
  - `#dbeeff` = header/section backgrounds
  - `#f8fbff` = input/pill backgrounds
  - `#d8e8f5` = cell borders
  - `#b8ddf8` = section divider borders
- **Responsive text classes** (`globals.css @layer app`): `.responsiveText`, `.responsiveTextTable`, `.responsiveTextTotal`, `.responsiveTextTitle`, `.responsiveTextInput`
- **Button classes**: `.blackButton` (primary), `.whiteButton`, `.supplierButton`, `.supplierAddButton`
- **Pill inputs** (Material Tables style): `rounded-lg bg-[#f8fbff] border border-[#d8e8f5] minHeight: 26px`
- Tables use `rounded-full` stat boxes, `rounded-2xl` cards, `rounded-lg` pills

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
