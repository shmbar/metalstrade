# IMS Mobile

React Native (Expo) app for the IMS metals-trading CRM. Targets iOS, Android, and
web from one codebase, against the **same Firebase project** as the web app.

Migration progress (see `../tasks/mobile-migration-plan.md`):
- **Slice 1** — architecture + Auth + Dashboard + Contracts (read path).
- **Slice 2** — Contracts **write path**: create / edit / delete with a faithful
  port of the web save flow (year-bucketed write, `euroToUSD` via getCur, poSupplier
  sync, year-change cleanup), settings-driven pickers, date picker, products editor.
- **Slice 3** — Invoices: list + detail (read) and **record-payment** write. Reads
  are deduped via the shared finance.js (an invoice + its credit/final note count
  once); payments re-read the exact year-bucketed doc before appending so grouped
  entries never double-count. Status filters + per-currency outstanding.
- **Slice 4** — Stocks tab: **Inventory** (faithful port of the web stocks netting —
  in − out per warehouse|description, final-invoice supersede, finalqnty adjust) and
  **Storage Costs** (per-warehouse $/MT via shared storageUtils, week/month/year
  toggle, real spend + MT-on-hand actuals) with a **tag-invoice** write (warehouse +
  month). New shared verbatim modules: storageUtils, soldStatus, shipmentStatus.
- **Slice 5** — **Final Settlement** (client feature #2) from the contract detail:
  per-lot Final Qty / Advised & Received price / remarks with the **Draft toggle**.
  Faithful port of the web `saveData_stocks` write path — re-stamps & saves the stock
  lots (draft stashes edits in each lot's `fsDraftData`, leaving live fields confirmed),
  re-saves the contract, and regenerates the Misc-invoice rows for `spInv` lots.
- **Slice 6** — **Cashflow** overview (from More → Cashflow): the four pillars —
  client **receivables**, supplier **payables** (USD basis, EUR×euroToUSD), unpaid
  **expenses** (paid==='222', EUR×1.08), and **unsold stock** — computed from the same
  canonical sources as the web (finance.js groupInvoices/balance, contract poInvoices,
  inventory netting). Top counterparties per pillar + incoming/outgoing/net summary.
- **Slice 7** — Reference & logs (from More): **Incoterms 2020** (static reference,
  search + mode filter), **Material Tables** (read-only composition tables + weighted-avg),
  **Activity Log** (the `activity` feed). Reads only.
- **Slice 8** — **Misc Invoices** (specialInvoices list, per-currency + per-category
  totals, with the **set-category** write `updateSpecialInvoiceField`) and a read-only
  **Settings** view (suppliers, clients, company rate/term, config counts).
- **Slice 9** — **Sales Contracts** (sell-side list with shipped-% from linked invoices)
  and **Shipments** (contract status + ETD/ETA, with a **set-status** write
  `updateContractField` using the shared shipmentStatus vocabulary).
- **Slice 10** — **Expenses** (supplier + company, segmented, per-currency all/unpaid
  totals) and **Notifications** (the `notifications` feed with per-user read state +
  mark-one / mark-all writes).
- **Slice 11** — **Account Statement** (per-client, mid/end-month period picker; reads the
  precomputed `actStatements/{year}/{client}/{date1}` doc with totals).
- **Slice 12** — **AI Assistant** — streaming chat against the web app's `POST /api/assistant`
  (same SSE contract, Firebase Bearer token, same `currentData` context). Uses **`expo/fetch`**
  for true token streaming. Requires `EXPO_PUBLIC_API_BASE_URL` (the deployed web URL).
- **Slice 13** — **Accounting** — faithful port of the sales-invoice ↔ purchase/expense
  merge (CN/FN handling, contract `poInvoices.invRef` linking, linked expenses), grouped per
  invoice with costs. New loaders: loadDocByIdDate / loadExpensesForAccounting / loadAdditionalCNFN.
- **Slice 14** — **Contracts Review** (Review + Statement tabs): per-contract contracted vs
  shipped weight (per-material, via invoices' productsDataInvoice + getInvArray de-dupe) with
  sold/shipment **status from the shared soldStatus** (computeLineSold/aggregateRollups/lineStatus),
  plus per-supplier statement totals.
- **Slice 15** — **Invoices Review** (Review + Statement tabs): deduped invoices with balances
  (tap → invoice detail), plus a per-currency **client receivables** + **supplier payables**
  statement.
- **Slice 16** — **Margins** (Admin) — monthly profit view: headline stats (profit, quantity,
  shipped = qty−open, outstanding) + per-month rows, from `loadMargins`. Admin-gated; GIS profit
  line on GIS accounts.
- **Slice 17** — **Warehouse Stock-In** (the `whModal` flow) from the contract detail: add/edit/
  delete stock lots (material → auto-priced from the contract, qty, PO invoice, warehouse, arrival
  date, status, consignee, special-invoice flag). Saves via the faithful `saveContractStocks` —
  writes the lots, re-saves the contract, and regenerates Misc-invoice rows for `spInv` lots. This
  is the stock-lot data-entry that feeds Inventory, Final Settlement and invoice creation.
- **Slice 20** — **Formulas Calc** (Admin, Beta): FeNiCr / Stainless / SuperAlloys pricing
  calculator. The arithmetic is **transcribed verbatim** from the web tabs (so results match by
  transcription), with live Cost/Sales outputs and Save to `formulasCalc`. Labeled Beta until
  verified number-for-number against the web with live inputs.
- **Slice 19** — **Cashflow per-row ledger**: each pillar drills into its counterparties; tap →
  a sheet listing the line items. Clients → their invoices (→ detail/payments); suppliers →
  **mark a purchase invoice paid** (`markPoInvoicePaid` patches the contract's poInvoices);
  expenses → **mark paid** (`markExpensesPaid` = updateExpPayments, paid='111').
- **Slice 18** — **Invoice creation** from a contract: header (client/shipment/date/delivery,
  currency inherited) + materials lines referencing the contract's products and a warehouse. The
  write (`createInvoiceForContract`) faithfully assigns the next **invoiceNum**, links the invoice
  onto the parent contract's `invoices[]`, writes the year-bucketed invoice doc, bumps the counter,
  and records a **stock `out`** per non-service line. (Advanced web extras — unit-price equations,
  live stock-availability — are intentionally simplified; the write path matches the web.)

## Stack
- Expo SDK 56 · React Native 0.85 · React 19 · TypeScript
- expo-router (file-based nav) · NativeWind 4 (Tailwind) · Reanimated 4
- Firebase JS SDK (Auth + Firestore + Storage) — same project/claims as web
- Zustand (state) · TanStack Query (server cache, offline-friendly)
- expo-secure-store + expo-local-authentication (biometric sign-in)

## Run
```bash
cd mobile
npm install --legacy-peer-deps   # legacy flag: expo-router pulls web-only peers under React 19
# .env is already populated from the web Firebase config (git-ignored).
npm run start        # then press i (iOS), a (Android), or w (web)
```
Open in **Expo Go** (scan the QR) or a dev build / simulator.

## Verify it works
```bash
npm run typecheck                       # tsc, clean
npx expo export --platform android      # full Metro bundle, succeeds
```
Sign in with any existing IMS account (custom claims `uidCollection` + `title`
resolve tenancy + role exactly like the web app). The Dashboard and Contracts read
live Firestore data.

## Build (EAS)
`eas.json` defines `development` / `preview` / `production` profiles.
```bash
npm i -g eas-cli && eas login
eas init                 # creates the EAS project + projectId
eas build -p android --profile preview   # internal APK
eas build -p ios --profile preview       # needs an Apple account
```
`EXPO_PUBLIC_*` vars are embedded at build time. Because `.env` is git-ignored, set them
for cloud builds via **EAS secrets** (`eas secret:create`) or an `env` block per profile in
`eas.json` (the Firebase config + `EXPO_PUBLIC_API_BASE_URL`).

## Architecture
```
app/                       expo-router routes
  _layout.tsx              providers (theme, query, safe-area, gesture) + auth init + fonts
  index.tsx                auth gate → app or sign-in
  sign-in.tsx              email/password + biometric quick-login
  (app)/
    _layout.tsx            bottom tabs (role-aware) + settings load
    index.tsx              Dashboard (KPIs, receivables, aging, top suppliers)
    contracts/             list + [id] detail (read)
    more.tsx               account, theme (light/dark/system), feature-map, sign out
src/
  shared/                  VERBATIM copies of the web app's pure logic
                           (finance, fxRates, splitUtils, pureHelpers, languages)
                           → financial math is provably identical to the CRM
  data/                    Firestore read layer (faithful port of utils/utils.js)
  store/                   Zustand: auth (claims), settings (suppliers/clients/rates)
  theme/                   design tokens + ThemeProvider (light/dark)
  components/ui/           design system primitives
  features/                dashboard + contracts feature modules
  lib/                     firebase init, secure store, biometric, formatters
```

### Why business logic is shared, not rewritten
`src/shared/*.js` are byte-for-byte copies of the web app's pure modules. The
receivables, aging, currency, and tonnage figures come straight from `finance.js`,
so the mobile numbers match the web CRM to the cent. When the web logic changes,
re-copy these files (a follow-up will hoist them into a shared workspace package).

## Backend for AI / email / metal prices
Those features live in the web app's `app/api/*` server routes (they hold the
OpenAI / Resend keys). Mobile will call them over HTTPS with the Firebase ID token —
set `EXPO_PUBLIC_API_BASE_URL` to the deployed web URL when those slices land.

## Status — feature-complete
All web CRM screens are in the app (20 slices) and **Cashflow now records partial _and_ full
supplier payments** (amount or quick 25/50/75/100%, cumulative — port of the web
`supplierPartialPayment`). `eas.json` is in place for cloud builds. The only refinement left is
**Formulas Calc** (shipped as **Beta** — verify a known result against the web before pricing).

The full parity checklist is in `../tasks/mobile-migration-plan.md` and surfaced in-app under
**More → feature map**.
