# Financial Calculation Consolidation — Design Note

> Goal: compute every core financial figure **one way, in one tested place**, so the
> dashboard, cashflow, contracts, invoices, reviews, alerts and AI assistant can never
> disagree again. This is the root-cause fix for the recurring "numbers are wrong" reports.
>
> Status: **proposal — no code changes yet.** Agree the rules below before any screen is touched.

---

## 1. The problem (evidence)

The same figures are re-implemented independently, with **diverging rules**:

| Figure | Implemented in (non-exhaustive) | How they diverge |
|--------|--------------------------------|------------------|
| Invoice **revenue** (Σ totalAmount, deduped) | `dashboard/funcs.js` `Total`, `cashflow/funcs.js` `runInvoices`, `contracts/modals/tabs/pnl.js` `Total`, `pureHelpers.js` `groupInvoicesByNumber`, ContractsReview/InvoicesReview `Total`, `api/assistant` | **Group/supersede rule differs** (dashboard: "non-1111 when group>1"; pureHelpers: "max invType"), **draft handling differs** (dashboard now excludes `draft===true`; cashflow uses `draft===undefined\|\|false`; pnl/pureHelpers don't exclude), **FX differs** (some →USD, some →selected currency) |
| Invoice **balance / receivables** (`debtBlnc`) | `AIAlertsBar.js`, `dashboard/page.js`, `cashflow/funcs.js`, reviews | `debtBlnc ?? (total − paid)` vs recompute; **draft** `===true` vs `undefined\|\|false` vs none; **currency** mixed vs separate; **date scope** differs |
| **Paid** (Σ payments.pmnt) | reimplemented inline in ~10 files | mostly identical, but copy-pasted |
| **MT / quantity** | `inventory.js` `setNum` (converts KGS/1000, LB/2000), `dashboard/funcs.js` (now converts), others sum **raw** | unit conversion applied inconsistently |
| **FX** (`euroToUSD`) | `dashboard/funcs.js` (now NaN-safe), `pnl.js` (bidirectional 1/mult), cashflow, reviews | direction, base currency, and missing-rate handling all differ |
| **Due / overdue** | `resolveDueDate` (canonical) in AIAlertsBar; elsewhere raw `delDate` | fallback when `delDate` absent is undefined behaviour |
| **Finalized** | `shipData.fnlzing === '4568'` | consistent, but magic-string copy-pasted |
| **P&L** | dashboard (deal/cohort basis) | basis itself undecided (period vs deal) |

`pureHelpers.js` already started the right pattern (pure + unit-tested) but only covers dates/grouping, and its grouping rule **already differs** from the dashboard's — so the divergence exists even between "shared" and "local" code.

---

## 2. Canonical definitions (one rule each — these need sign-off)

Proposed single source of truth. **Bold = decision needed from the business.**

1. **`invoicePaid(inv)`** → Σ `payments[].pmnt` (numeric-coerced). No ambiguity.
2. **`invoiceBalance(inv)`** → `totalAmount − invoicePaid(inv)`, recomputed. **Decision:** trust the stored `debtBlnc` when present, or always recompute? (Recommend: always recompute; treat stored `debtBlnc` as a cache only.)
3. **`isIssued(inv)`** → `inv.draft !== true && !inv.canceled`. **Decision:** confirm "draft" means `draft === true` (vs any falsy/missing = issued).
4. **`isFinalized(inv)`** → `inv.shipData?.fnlzing === '4568'`. Replace the magic string with a named constant.
5. **`groupInvoices(list)`** → dedupe by invoice number; when a group has CN/FN, those **supersede** the original `1111`; payments combined. Pick **ONE** rule (recommend the `pureHelpers` max-invType rule) and delete the others.
6. **`invoiceRevenue(list, { base })`** → Σ `totalAmount` over `groupInvoices`, **issued only**, converted to `base`. Returns per-currency **and** a base-converted total.
7. **`resolveDueDate(inv)`** → already canonical. **Decision:** when `delDate` is absent, is the invoice "not yet due" (current) or should we derive a due date from payment terms / invoice date + N days?
8. **`toMT(qty, contract, settings)`** → `qty × {MT:1, KGS:0.001, LB:0.0005}[unit]` by `qTypeTable`. (Matches `inventory.js`.)
9. **`toBase(amount, cur, rate, base)`** → NaN-safe FX. **Decision:** base currency (USD?) and **rate source** — per-contract `euroToUSD` (today, blank-able) vs a central daily rate (`utils/fxRates.js`).
10. **`contractPurchaseValue(contract, { base })`** → Σ `poInvoices[].pmnt` converted to base.
11. **`pnl(...)`** → `revenue − purchase − expenses`. **Decision: period basis vs deal basis** (the open client question). Whichever is chosen is implemented once here.

---

## 3. Proposed module

`utils/finance.js` — pure (Firebase-free, JSX-free), re-exported through `utils.js`, fully unit-tested in `utils/__tests__/finance.test.js`. Suggested surface:

```
// constants
FINALIZED_FLAG, UNIT_TO_MT

// per-invoice
invoicePaid(inv) -> number
invoiceBalance(inv) -> number
isIssued(inv) -> boolean
isFinalized(inv) -> boolean
resolveDueDate(inv) -> 'YYYY-MM-DD' | null   // re-export existing
isOverdue(inv, asOf) -> boolean

// collections
groupInvoices(list) -> deduped list
invoiceRevenue(list, { base }) -> { byCur, base }
receivables(list, { base, asOf }) -> { byCur, due, balance, finalized, provisional }

// quantity / fx
toMT(qty, contract, settings) -> number
fx(amount, cur, rate, base) -> number

// contract / margin
contractPurchaseValue(contract, { base }) -> { byCur, base }
pnl({ invoices, contracts, expenses, basis, base }) -> { revenue, cost, expense, profit }
```

---

## 4. Migration plan (low-risk, no surprise number changes)

- **Phase 0 — Safety net.** Write `utils/finance.js` + tests that capture the **current** output of each screen as golden values, so any number that changes is intentional and visible in a diff.
- **Phase 1 — Aligned screens first.** Dashboard + AIAlertsBar already match most of the proposed rules (post this week's fixes) → swap them to the module; confirm numbers are identical.
- **Phase 2 — The rest.** Cashflow, Contracts PnL, Contracts/Invoices Review, the assistant tools → swap one screen at a time, comparing before/after.
- **Phase 3 — Cleanup.** Delete the now-dead local `Total`/balance helpers and the duplicate `components/**` copies (see `tasks/dedup-audit.md`).

Each phase is independently shippable and verifiable.

---

## 5. Decisions needed before coding (consolidated)

1. **P&L basis**: period vs deal (the open question).
2. **Draft semantics**: `draft === true` only?
3. **Balance source**: always recompute vs trust stored `debtBlnc`.
4. **Due-date fallback**: when `delDate` missing — not-due vs derive from terms.
5. **FX base + rate source**: USD base? per-contract rate vs central daily rate.
6. **Invoice supersede rule**: confirm CN/FN supersede `1111` (max-invType).

Once 1–6 are answered, the module is a few hundred lines + tests, and the screen swaps are mechanical and verifiable.
