# IMS Mobile (React Native) — Audit & Migration Plan

Source: `metalstrade` web CRM (Next.js 14/15 App Router, Firebase). Audit date 2026-06-22.
Goal: production React Native (Expo) app for iOS + Android with **100% feature parity**.

---

## PHASE 1 — PROJECT AUDIT (what exists)

### Stack (web)
- **Next.js App Router**, React 19, Tailwind, Radix UI, TanStack Table v8.
- **Firebase Web SDK** used directly from the client: Auth, Firestore, Storage.
- **Server-side Next API routes** (`app/api/*`) for AI (OpenAI) + email (Resend) + metal prices. These hold secrets and are a **real backend** — not just client code.
- 449 tracked files, 24 in-app routes, ~30 contract modal files (the core of the app).

### Auth & multi-tenancy (critical)
- Firebase email/password sign-in (`contexts/useAuthContext.js`).
- **Custom claims** carry tenancy + role: `claims.uidCollection` (per-account Firestore namespace) and `claims.title` (`'Admin'` | `'accounting'` | other). Read client-side via `getIdTokenResult()`.
- `userTitle === 'accounting'` → restricted to `/accounting`. `userTitle === 'Admin'` → unlocks Margins (Sharon/Gis Admin) + Formulas.
- `gisAccount` = a specific uidCollection constant → swaps "Sharon Admin" ↔ "Gis Admin".
- Idle auto-logout (`react-idle-timer`), session in `sessionStorage`.
- **Implication for mobile:** same Firebase project, same claims → **no auth backend rewrite needed**. RN reads the same `uidCollection`/`title` via `getIdTokenResult()`.

### Database dependency map (Firestore)
All data namespaced under the account doc `{uidCollection}`:
- **Year-bucketed** (doc id = record id; keyed by `date.substring(0,4)`):
  `data/contracts_{YYYY}`, `data/invoices_{YYYY}`, `data/expenses_{YYYY}`
- **Flat collections:** `data/stocks`, `data/companyExpenses`, `data/materialtables`, `data/specialInvoices` (Misc Invoices), `data/activity`, `data/notifications`, `data/comments`
- **Singletons / subcollections:** `margins/{year}/{month}`, `cashflow` (doc), `settings` (doc), `cmpnyData` (doc), `invoiceNum` (counter doc), `actStatements/{year}/{client}/{date}`
- Firestore `in` queries chunked at 30; multi-year reads fan out one query per year (see `loadData`, `getInvoicesBatched`, `buildInvoiceIndex`).
- **All reads/writes go through `utils/utils.js`** (~1300 lines, ~60 exported fns). This is the single data-access layer to port.

### API dependency map (server routes — must remain a backend)
- `api/assistant` — OpenAI chat assistant with **data tools** (overdue invoices, client debt ranking, revenue summary, etc.). Holds `OPENAI_API_KEY`.
- `api/ai/*` — cash-forecast, categorize-expense, cert-checker, document-reader, email-status, generate-reminder, margin-alert, send-reminder.
- `api/metal-prices` — external metal price feed.
- Email send via **Resend** (`generate-reminder` / `send-reminder`).
- **Implication:** mobile app calls these HTTPS endpoints. Keep the Next.js deployment as the API backend (recommended) — do **not** ship `OPENAI_API_KEY`/Resend keys in the app bundle.

### State / context architecture
`SettingsProvider → AuthContextProvider → NotificationProvider → ContractsProvider → SalesContractsProvider → InvoiceProvider → ExpensesProvider`
- Contexts: settings, auth, notification, contracts(modal), salesContracts(modal), invoice(modal), expenses(modal), globalSearch.
- State hooks: `useContractsState`, `useSalesContractsState`, `useInvoiceState`, `useExpensesState`, `useSettingsState`, `useExchangeRates`, `useMetalPrices`, `useInlineEdit`, `use-mobile`, `use-toast`.

### Pure business logic (port verbatim — already unit-tested)
- `utils/pureHelpers.js` — `resolveDueDate`, `resolveInvoiceDate`, `groupInvoicesByNumber`.
- `utils/finance.js`, `utils/fxRates.js`, `utils/splitUtils.js` (IMS/GIS split). Tests in `utils/__tests__/`.
- `utils/languages.js` — i18n (`getTtl`), multi-language.
- **These are platform-agnostic JS — copy as-is into a shared package.**

---

## PHASE 2 — FEATURE INVENTORY (screen map)

Navigation source of truth: `components/const.js → sideBar(userTitle, gisAccount)`.

| # | Section | Screen (route) | Core capability | Role |
|---|---------|----------------|-----------------|------|
| 1 | Main | Dashboard (`dashboard`) | KPI cards, charts (chart.js), summaries | all |
| 2 | Main | Assistant (`apps/Assistant`) | AI chat over data (OpenAI tools) | all |
| 3 | Shipments | **Contracts** (`contracts`) | Purchase orders + ~30 modals (details, final settlement w/ draft, payments, expenses, invoices, PnL, inventory, PDFs, ISF, AnnexVII, cert checker) | all |
| 4 | Shipments | Sales Contracts (`salescontracts`) | Sell-side contracts + modals | all |
| 5 | Shipments | Shipments Tracking (`shipment`) | Shipment status | all |
| 6 | Shipments | Invoices (`invoices`) | Client sales invoices + PDF | all |
| 7 | Shipments | Expenses (`expenses`) | Supplier-linked expenses + totals | all |
| 8 | Shipments | Accounting (`accounting`) | Restricted accounting view | accounting/all |
| 9 | Shipments | Contracts Review (`ContractsReview&Statement`) | Review + statement | all |
| 10 | Shipments | Invoices Review (`InvoicesReview&Statement`) | Review + statement | all |
| 11 | Statements | Account Statement (`accstatement`) | Per-client statement | all |
| 12 | Statements | Stocks (`stocks`) | Inventory, sum tables, unsold | all |
| 13 | Statements | Storage Costs (`storagecosts`) | Storage spend, per-MT, per-warehouse | all |
| 14 | Misc | Misc Invoices (`specialinvoices`) | Special invoices + category tags | all |
| 15 | Misc | Company Expenses (`companyexpenses`) | Company-level expenses + totals | all |
| 16 | Misc | Material Tables (`materialtables`) | Element composition (Ni, Cr, Mo…) | all |
| 17 | Misc | Incoterms (`incoterms`) | 11-term reference, search, filter | all |
| 18 | Misc | Activity Log (`activity`) | Event feed | all |
| 19 | Summary | Margins (`margins`) | Margin/profit per contract+month | **Admin** |
| 20 | Summary | Cashflow (`cashflow`) | Cash flow: stocks/clients/suppliers/expenses, partial-pay modals | all |
| 21 | Summary | Formulas Calc (`formulas`) | Pricing formula calc (mathjs) | **Admin** |
| 22 | Summary | Settings (`settings`) | 11 tabs: general, suppliers, clients, users, bankAccounts, documents, emailSetup, logos, setup, stocks, tables | all |
| — | Auth | signin / signup / passes | Firebase auth + idle logout | public |

Cross-cutting features: global search, notifications center (read/snooze/receipts), activity logging, file upload/download (Storage), PDF export (jsPDF), Excel export (exceljs), multi-currency + FX, metal prices, i18n, drag-and-drop ordering (dnd-kit).

---

## PHASE 3 — MOBILE ARCHITECTURE

Monorepo so business logic is shared, not re-derived:

```
/ (existing web stays as the API backend for AI/email/prices)
/mobile                      ← new Expo app
  app/                       ← expo-router (file-based, mirrors web routes)
  src/
    features/<feature>/      ← screen + components + hooks per feature
    components/ui/           ← design-system primitives (RN)
    data/                    ← port of utils/utils.js (Firestore access)
    lib/firebase.ts          ← Firebase JS SDK init (RN persistence)
    store/                   ← Zustand stores (mirror web contexts)
    query/                   ← TanStack Query clients + keys
    theme/                   ← design tokens, light/dark
/shared (or mobile/src/shared) ← VERBATIM copies: pureHelpers, finance, fxRates,
                                 splitUtils, languages + their tests
```

- **Firebase:** reuse `firebase` JS SDK in RN (Auth w/ AsyncStorage/MMKV persistence, Firestore, Storage). Same project, same claims, same security rules → zero backend change for core data.
- **AI/email:** call the existing Next.js `/api/*` over HTTPS with the Firebase ID token.
- **Data layer:** port `utils/utils.js` to `src/data/` (TypeScript). Pure helpers are copied unchanged.
- **State:** Zustand (replaces React Context) + TanStack Query (server cache, optimistic updates, offline).
- **Forms:** React Hook Form + Zod (every web field preserved).

### Library replacement map
| Web | Mobile |
|-----|--------|
| Radix UI | RN primitives + `@gorhom/bottom-sheet`, react-native-reanimated |
| TanStack Table v8 | TanStack Table v8 (headless, works in RN) → rendered as cards/expandable rows |
| react-number-format | `react-native-currency-input` / custom formatter (reuse same format logic) |
| chart.js / react-chartjs-2 | `victory-native` (Skia) or `react-native-gifted-charts` |
| jsPDF / jspdf-autotable | `expo-print` + HTML templates → PDF; `expo-sharing` |
| exceljs / file-saver | server-side export endpoint **or** `xlsx` + `expo-file-system`/`expo-sharing` |
| dnd-kit | react-native-reanimated + gesture-handler / `react-native-draggable-flatlist` |
| react-tailwindcss-datepicker | `react-native-ui-datepicker` (keep app-styled picker) |
| Tailwind | NativeWind |
| next-themes | NativeWind dark mode + theme store |
| Firebase Storage (file picker) | `expo-document-picker` / `expo-image-picker` + Storage |

---

## PHASE 4 — DESIGN SYSTEM
Premium SaaS (Linear/Stripe/Mercury feel). Tokens derived from existing brand:
- Colors: endeavour `#0366ae`, chathams-blue `#103a7a`, port-gore `#28264f`, surfaces `#dbeeff`/`#f8fbff`, borders `#d8e8f5`/`#b8ddf8`. Full light + **dark** palettes.
- Type scale (Poppins → bundled font), spacing (4pt grid), radius (lg/2xl/full), elevation, motion.
- Primitives: Button, Input/Pill, Select, Card, StatBox, Table→Card, Sheet, Tabs, Toast, Badge, KPI card, Chart wrappers. All themed, all responsive (phone/tablet/iPad).

## PHASE 5 — NAVIGATION
Bottom tabs (Dashboard · Contracts · Invoices · Cashflow · More) + nested stacks, role-aware (Admin tabs, accounting-only mode), floating quick-action (new contract/invoice/expense), global search modal, notification center. Mirrors `sideBar()` grouping.

## PHASES 6–12 (execution order)
6. Core infra: Firebase init + persistence, data layer port, Zustand+Query, theme, error/offline.
7. Auth: sign-in, claims (uidCollection/title), biometric (expo-local-authentication), secure-store token, idle logout.
8. Dashboard: KPI cards + premium charts + activity feed.
9. **Feature-by-feature migration** of all 22 screens (each: web behavior → RN screen → fields/calcs preserved → tests). Contracts + its ~30 modals is the largest slice.
10. Testing: port unit tests (finance/fx/split/pure), add screen tests, E2E (Maestro/Detox).
11. Performance: FlashList, memoization, query caching, 60fps.
12. Production: EAS build, push notifications, store config, parity checklist (every row above = ✅).

---

## HONEST SCOPE NOTE
This is a 449-file financial CRM with ~24 screens, ~30 contract sub-modals, a real AI/email backend, multi-currency math, PDF/Excel generation, role-based multi-tenancy, and offline needs. Achieving the stated bar — **every feature, no placeholders, no TODOs** — is a multi-week engineering program, not a one-shot generation. The credible path is to build it as **vertical slices** (auth → dashboard → contracts → …), each fully working and reviewable, tracked against the Phase-2 inventory until the parity checklist is 100% ✅.

**Recommended first slice:** scaffold the Expo monorepo + design system + Firebase/auth + Dashboard + Contracts list/detail (read path), proving the architecture end-to-end against live data before expanding to writes and the remaining screens.
