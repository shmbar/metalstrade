# Web ↔ Mobile parity suites

These suites exist to answer one question: **does the Expo app in `mobile/` still compute the
same numbers as the Next.js app at the repo root?**

They run under the repo-root vitest, which is configured with aliases for *both* apps, so a
single test file can import a web module and its mobile port side by side.

## How to run

```bash
npm run test:parity     # the six parity suites only  → 763 tests in 6 files
npm test                # everything, including the pre-existing suites outside parity
                        #                            → 894 tests in 15 files
npm run test:watch      # vitest in watch mode
npx vitest run __tests__/parity/stocks-and-storage.test.ts   # one domain
```

Every suite is self-contained: each of the six passes on its own as well as in the full run.
There is no shared mutable state between them — `scenario()` deep-clones, so a suite that
mutates its world cannot poison the next one. Keep it that way.

The parity suites are **not** the whole test story. `npm test` also runs
`app/(root)/stocks/__tests__/agingUtils.test.js` (the precedent suite these were modelled on)
and the other non-parity suites in the repo. **`npm test` must be green before you push**, not
just `npm run test:parity`.

## The six domains

| suite | tests | drift alarms | what it pins |
| --- | ---: | ---: | --- |
| `shared-modules.test.ts` | 214 | 21 | Tier 1 file identity for all 10 `mobile/src/shared/*` modules, plus behavioural goldens for `finance`, `pureHelpers`, `splitUtils`, `soldStatus`, `storageUtils`, `notificationPriority`, `notificationRouting`, `fxRates`; Tier 4 `shipmentStatus` colour divergence |
| `shipment-cashflow-formatters.test.ts` | 149 | 27 | shipment rows, urgency, legacy-status normalization, filtering, ordering and the status write target; cashflow running-balance windows and bottom line; display formatters (money, compact `$K`/`$M`, tonnage, initials, legacy dates); weight analysis end to end |
| `stocks-and-storage.test.ts` | 124 | 21 | inventory aggregation, Summary Stocks totals, id→label resolution, the search box, cashflow stock mode, avg cost per grade, storage aging by terminal, the stock audit, and the storage-cost metric + page wiring |
| `contracts-review-and-pnl.test.ts` | 115 | 21 | Contracts Review/Statement rows and totals, the Contract P&L tab, purchase-invoice modal editing, the dashboard sold-basis P&L chain, and `deriveContract`'s QTY label |
| `invoices-and-accounting.test.ts` | 88 | 13 | invoices-review amounts, rows, client receivables and supplier payables; the accounting merged-document row, labelling/linking/write targets and debit-vs-credit; per-currency account-statement totals; misc invoices |
| `margins-materials-formulas.test.ts` | 73 | 8 | margins input guards, editing model, collapsed month header and GIS decimal rules; material-table constants, footer, cost columns, grand totals and cell guard; the FeNiCr / Stainless / SuperAlloys pricing math |
| **total** | **763** | **111** | |

Counts are current as of this file's last edit. They are documentation, not assertions — no test
checks them, so a stale number here is a doc bug, not a red build. Re-read them off
`npm run test:parity` when you change the suites.

## Layout

```
__tests__/parity/
  README.md                              ← you are here
  _helpers/
    fixtures.ts                          ← deterministic data builders + named SCENARIOS
    webSource.ts                         ← the web drift alarm + file-identity primitives (read-only)
    stubs/nativeStub.ts                  ← react-native / expo stub, so mobile hook files can be imported
  shared-modules.test.ts
  shipment-cashflow-formatters.test.ts
  stocks-and-storage.test.ts
  contracts-review-and-pnl.test.ts
  invoices-and-accounting.test.ts
  margins-materials-formulas.test.ts
```

`_helpers/` is excluded from collection in `vitest.config.js`, and helper files must never be
named `*.test.ts` or vitest will try to run them as suites.

`fixtures.ts` is **shared by all six suites**. Do not change an existing builder's defaults to
suit one domain — you will silently move the goalposts for the other five. Add a new builder, or
pass an `over` override at the call site.

## What the root vitest config gives you

- **Aliases** — `@` → `mobile/src`, `@shared` → `mobile/src/shared`, and `@utils`, `@components`,
  `@lib`, `@hooks`, `@contexts`, `@public` → their root directories. Web modules are imported by
  relative path from `__tests__/parity/`, e.g. `'../../app/(root)/dashboard/funcs.js'`.
- **Native stubs** — `react-native`, `react-native-*`, `@react-native-async-storage/*` and `expo*`
  resolve to `_helpers/stubs/nativeStub.ts` **for the root test run only**. Without this, importing
  a mobile file that merely *sits next to* a hook (e.g. `deriveContract`, which is exported from
  `mobile/src/features/contracts/useContracts.ts`) fails to parse react-native's Flow-typed
  `index.js` and takes the whole test file down. The stub lets the module graph resolve; it
  guarantees nothing about behaviour. **Import pure symbols freely; never call a hook, a Firestore
  reader, or a device API.** If a native name is missing, add it to the stub's static export list.
- **Fake Firebase env** — both `EXPO_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_*` are set to offline
  dummies, because `mobile/src/lib/firebase.ts` and `utils/firebase.js` both call `initializeApp`
  at module scope. `initializeApp` does no network I/O. A parity test that reaches the network is
  broken by definition.

### Known limits

- **JSX inside a `.js` web file cannot be imported.** Vite's import analysis rejects it (this
  affects `app/(root)/formulas/tabs/fenicr.js` and `stainless.js`, whose only export is a React
  component anyway, and every `page.js`). Do **not** add `@vitejs/plugin-react` to fix it — it is
  incompatible with this vitest version and breaks config resolution for every suite. This is
  precisely what Tier 3 is for: `webFnSource` reads those files as *text*, which works fine
  (proven against `app/(root)/contracts/page.js` → `showQTY`).
- **`app/(root)/accstatement/func.js` calls `new Date()` at module scope.** If a suite's result
  depends on that, freeze the clock and `await import()` the module inside the test rather than
  importing it at the top of the file.

---

## The four tiers

Pick the **highest** tier the situation allows. Tier 1 is the strongest guarantee; Tier 3 is a
fallback for code that genuinely cannot be imported.

### Tier 1 — true parity (file identity)

`mobile/src/shared/*` are meant to be byte-identical copies of web modules. Assert **both**
file-content identity (after newline normalisation) **and** behaviour.

```ts
import { repoFileText } from './_helpers/webSource';
it('mobile shared/finance.js is byte-identical to utils/finance.js', () => {
  expect(repoFileText('mobile/src/shared/finance.js')).toBe(repoFileText('utils/finance.js'));
});
```

All nine true-copy pairs below are identical; `shipmentStatus.js` is the one deliberate exception
(Tier 4). The registry lives in `shared-modules.test.ts` as `IDENTICAL_PAIRS` / `DIVERGENT_PAIRS`,
and a meta test reads `mobile/src/shared/` off disk and fails if a `.js` file there is in neither
list — so dropping a tenth copied module into `shared/` cannot go unguarded.

| mobile | web |
| --- | --- |
| `mobile/src/shared/finance.js` | `utils/finance.js` |
| `mobile/src/shared/pureHelpers.js` | `utils/pureHelpers.js` |
| `mobile/src/shared/splitUtils.js` | `utils/splitUtils.js` |
| `mobile/src/shared/storageUtils.js` | `app/(root)/storagecosts/storageUtils.js` |
| `mobile/src/shared/soldStatus.js` | `app/(root)/contractsstatement/soldStatus.js` |
| `mobile/src/shared/notificationPriority.js` | `utils/notificationPriority.js` |
| `mobile/src/shared/notificationRouting.js` | `utils/notificationRouting.js` |
| `mobile/src/shared/fxRates.js` | `utils/fxRates.js` |
| `mobile/src/shared/languages.js` | `utils/languages.js` |
| `mobile/src/shared/shipmentStatus.js` | `app/(root)/contractsstatement/shipmentStatus.js` — **intentionally different**, see Tier 4 |

### Tier 2 — behavioural parity (import both, compare outputs)

Web exports a pure, importable module and mobile has a **port** (not a copy). Import both, feed
identical inputs from `_helpers/fixtures.ts`, assert equal outputs.

Web modules verified to import cleanly under this config, with their exact export lists:

| module | exports |
| --- | --- |
| `app/(root)/ContractsReview&Statement/funcs.js` | `ContractsValue, SumAllPayments, SumAllExp, SumValuesSupplier, Numcur` |
| `app/(root)/dashboard/funcs.js` | `setMonthsInvoices, calContracts, frmNum` |
| `app/(root)/dashboard/charts.js` | `LineChart, GroupedBarChart, LineChartSmall, BarChart, BarChartContracts, HorizontalBar, ExpCompare, RevenueCompare, PLCompare, ExpenseGroup, OccupPrcnt` |
| `app/(root)/invoicesstatement/funcs.js` | `ContractsValue, SumAllPayments, SumAllExp, Numcur` |
| `app/(root)/margins/funcs.js` | `dataIds, countDecimalDigits, removeNonNumeric` |
| `app/(root)/accstatement/func.js` | `groupedArrayInvoice, runAccountStatement` (module-scope `new Date()` — see Known limits) |
| `app/(root)/materialtables/constants.js` | `DEFAULT_ELEMENTS, UNIT_LABELS, TO_KGS, FROM_KGS, UNIT_TO_MT` |
| `app/(root)/stocks/agingUtils.js` | `DAY, dStr, arrivalOf, daysStored, bucketOf` |
| `app/(root)/contractsstatement/soldStatus.js` | `lotIsSold, rollupTone, computeLineSold, aggregateRollups, lineStatus` |
| `app/(root)/contractsstatement/shipmentStatus.js` | `SHIPMENT_STATUSES, normalizeStatus, SHIPMENT_STATUS_STYLES, hasShipmentStatus` |
| `app/(root)/storagecosts/storageUtils.js` | (see file) |
| `@utils/finance`, `@utils/pureHelpers`, `@utils/splitUtils`, `@utils/notificationPriority`, `@utils/notificationRouting`, `@utils/fxRates` | all import cleanly |

`app/(root)/formulas/tabs/fenicr.js` and `stainless.js` are **not** importable — they are JSX `.js`
React components (see Known limits). Their pricing math is Tier 3 territory.

### Tier 3 — mirror + drift alarm

For formulas locked inside a web page component (JSX, hooks, Firebase imports) that cannot be
imported. **Transcribe the formula verbatim** into the domain's test file, with an exact
`file:line` citation, assert `mobile === mirror`, **and** call the drift alarm so the suite fails
when web's own copy changes.

```ts
import { expectWebUnchanged, webFnLine } from './_helpers/webSource';
import { deriveContract } from '@/features/contracts/useContracts';
import { makeContract, makeSettings } from './_helpers/fixtures';

// Mirror of web's QTY column — app/(root)/contracts/page.js:154 showQTY.
// Transcribed verbatim; parseInt truncation and all.
const webShowQTY = (c: any, qLabel: string) => {
  const own = c.productsData.filter((p: any) => !p.import);
  return own.length !== 0
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 })
        .format(own.reduce((sum: number, item: any) => sum + parseInt(item.qnty, 10), 0)) + ' ' + qLabel
    : '-';
};

it("web's showQTY has not drifted", () => {
  expectWebUnchanged('app/(root)/contracts/page.js', 'showQTY', 'ce8934870ea0');
});

it('mobile mtLabel reproduces the mirrored web formula', () => {
  const c = makeContract({ productsData: [{ id: 'p', qnty: '12.5', description: 'x' }] });
  expect(deriveContract(c, makeSettings()).mtLabel).toBe(webShowQTY(c, 'MT'));
});
```

### Tier 4 — intentional divergence register

Where mobile deliberately differs from web, **assert the difference** and state the reason in the
test name plus a comment. These are the known ones:

1. **`shipmentStatus` colours** — CSS custom properties on web (`var(--warn-bg)`), RN hex on
   mobile. Assert the *structure* matches (same status keys, same style-object shape) and that
   only the colour values differ.
2. **`deriveContract` mtLabel** (`mobile/src/features/contracts/useContracts.ts`) deliberately
   reproduces web's `parseInt(qnty, 10)` truncation so the two screens agree, while `totalMT`
   stays accurate. Assert **both**: `mtLabel` truncates like web, `totalMT` does not.
3. **`num()` NaN-hardening** — mobile's shared `num()` has a finite guard; several web reducers do
   not. Where mobile returns a finite number and web returns `NaN`, assert exactly that.
4. **`pnlChain.sumInvProductsMT` traps** (`mobile/src/features/dashboard/pnlChain.ts`) deliberately
   reproduces two web bugs: it checks only `canceled` and not `draft`, and it sums invoice qty raw
   while contract qty is unit-converted. See `DASHBOARD_PNL_CAVEATS` in that file. Assert the traps
   are reproduced.
5. **Stocks row date** — web substitutes TODAY for a missing contract date; mobile renders blank.
   **Mobile is correct.** Assert the divergence.

---

## Hard rules

1. **Never modify anything under the web app** (`app/`, `utils/`, `lib/`, `components/`, `hooks/`,
   `contexts/`). *Adding an export to a web file counts as modifying web.* If a web symbol is not
   already exported, you cannot import it — use Tier 3.
2. **Never weaken an assertion to make a test green.** If mobile disagrees with web that is either
   (a) a real mobile bug → fix `mobile/` and say so, or (b) an intentional divergence → assert the
   difference explicitly with the reason in the test name and a citing comment. Silently loosening
   an assertion is the worst possible outcome.
3. **Tests must be deterministic.** No `Date.now()`, no `Math.random()`, no argless `new Date()` in
   fixtures or assertions. Freeze anything time-dependent:
   ```ts
   import { FIXED_NOW } from './_helpers/fixtures';
   beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW); });
   afterEach(() => { vi.useRealTimers(); });
   ```
4. **A test that merely re-states what mobile currently outputs is worse than no test.** Every
   assertion must encode *web's* rule, with a `file:line` citation in a comment, so it fails when
   mobile drifts away from web.

---

## Helper API reference

### `_helpers/fixtures.ts`

```
FIXED_NOW, FIXED_NOW_ISO, FIXED_TODAY, INV_TYPE, FINALIZED_FLAG, PAID
makeSettings(over?)          makeCompanyData(over?)      makeDateSelect(over?)
makeContract(over?)          makeProduct(over?)          makeImportProduct(over?)
makePoInvoice(over?)         makePoPayment(over?)        makeContractExpense(over?)
makeInvoice(over?)           makeFinalizedInvoice(over?) makeCreditNote(over?)
makeFinalNote(over?)         makeInvoiceProduct(over?)   makePayment(over?)
makeStockLot(over?)          makeStockOutLot(over?)      makeExpense(over?)
makeMarginItem(over?)        makeMarginMonth(over?)      makeMiscInvoice(over?)
makeMaterialTable(over?)     makeMaterialRow(over?)      makeStatementRow(over?)
makeFormulaValue(over?)
SCENARIOS, scenario(name), type ScenarioName, type Over
```

`over` is **shallow**-merged, so overriding a nested container replaces it wholesale.

Scenarios: `singleInvoice`, `invoicePlusCreditNote`, `invoicePlusCreditPlusFinal`,
`twoOriginalsSameNumber`, `eurContractUsdInvoice`, `overShipped`, `zeroQtyLot`,
`draftAndCanceled`, `kgsContractImportRows`. Each is
`{ note, settings, compData, companyRate, contracts, invoices?, stockLots? }`, with every contract
already carrying its **grouped** `invoicesData`. Prefer `scenario('name')` — it deep-clones, so a
suite that mutates its world cannot poison the next one.

### `_helpers/webSource.ts`

```ts
webFnSource(relPath: string, symbolName: string): string
webFnHash(relPath: string, symbolName: string): string          // 12 hex chars
expectWebUnchanged(relPath: string, symbolName: string, expectedHash: string): void
webFnLine(relPath: string, symbolName: string): number          // citations only, never hashed
repoFileText(relPath: string): string                           // CRLF-normalised, Tier 1
fileHash(relPath: string): string
webPath(relPath: string): string
REPO_ROOT: string
```

`relPath` is repo-root-relative with forward slashes. Declaration forms handled:
`function X(`, `export function X(`, `export async function X(`, `export default function X(`,
`const/let/var X =`, `export const X =` — including arrow bodies, object literals, one-liners, and
`const X = useCallback((…) => { … }, [deps])` inside a page component.

---

## Adding a new parity test

1. Create `__tests__/parity/<domain>.test.ts`.
2. Import mobile via the aliases, web via a relative path from the repo root:
   ```ts
   import { computePnl } from '@/features/dashboard/pnlChain';   // mobile/src/*
   import { num } from '@shared/finance';                        // mobile/src/shared/*
   import { calContracts } from '../../app/(root)/dashboard/funcs.js';
   ```
   Aliases available: `@` → `mobile/src`, `@shared` → `mobile/src/shared`, and `@utils`,
   `@components`, `@lib`, `@hooks`, `@contexts`, `@public` → their root directories.
3. Build inputs from `_helpers/fixtures.ts` — use `scenario('name')` for a shared world, or the
   `make*()` builders for a one-off. Do not invent a new data shape; if the shape you need is
   missing, **add** a builder to `fixtures.ts` so everyone gets it. Never edit an existing
   builder's defaults or rename one — all six suites share this file, and the other five will
   move under you.
4. Decide the tier, then write the assertion in that tier's style.
5. For Tier 3, record the hash: `console.log(webFnHash('<path>', '<symbol>'))`, paste the value in,
   and add the `expectWebUnchanged` assertion. Remove the `console.log`.
6. Run `npm run test:parity`, then `npm test` from the repo root. The whole suite must be green,
   including the pre-existing tests outside `__tests__/parity/`. Then run
   `cd mobile && npx tsc --noEmit` and `npx eslint .` — tsc must exit 0 and eslint must report
   **0 errors** (the repo carries ~45 pre-existing warnings; do not add errors).

---

## When the drift alarm fires

There are **111 drift alarms** across the six suites. Each one records a hash of a web function
that a Tier 3 mirror was transcribed from. They live in one `it.each` table per suite — search for
`expectWebUnchanged` (in `stocks-and-storage.test.ts` the hashes are collected in a `HASH` object
just above the table). The hash is computed on the symbol's own source with **comments stripped
and whitespace collapsed**, and line numbers are not part of it — so reformatting the file, moving
the function, or editing a comment cannot trip it. Only the function's own tokens can.

You changed (or pulled) something in the web app, and a parity suite now fails with:

```
════════════════════════ WEB DRIFT ALARM ════════════════════════
  file   : app/(root)/dashboard/funcs.js
  symbol : sumInvProductsMT  (declared at line 100)
  recorded hash : 91198da9b872
  current  hash : 4f2ab19c0d3e
```

**Do not just paste the new hash in.** The hash is the alarm, not the bug. Work through this:

1. `git log -p -- "app/(root)/dashboard/funcs.js"` — read what actually changed in that symbol.
   Formatting-only edits elsewhere in the file cannot trip this: the hash is computed on the
   symbol's own source with comments stripped and whitespace collapsed, and line numbers are not
   part of it. So something in the function body really did change.
2. Decide which it is:
   - **Mobile needs the same change** → fix `mobile/`, update the transcribed mirror in the parity
     suite, and note the fix in your summary.
   - **It is an intentional divergence** → keep the mirror, and convert the test to Tier 4: assert
     the *difference*, with the reason in the test name.
3. Only once mobile is confirmed correct, replace the recorded hash with the current one. Get the
   new value from the failure message's `current hash:` line — do not re-derive it by hand.

Never "fix" a drift alarm by deleting the row from the `it.each` table. That removes the alarm and
leaves the mirror it was guarding silently rotting.

If instead the alarm reports `symbol "X" not found`, web renamed or deleted the function. The
mobile port and the mirror are then almost certainly stale — treat it as case 2 above, not as a
broken helper.

### When a NON-drift parity test fails

That means mobile and web genuinely disagree *right now*. Same fork, one rule:

- **Real mobile bug** → fix `mobile/`. Say so in your summary. This is the normal outcome and it
  is the whole point of the suite. Worked example: the FeNiCr/Stainless/SuperAlloys Fe derivation
  in `mobile/src/features/formulas/calc.ts` summed the elements and subtracted once, where web
  writes `(100 - ni - cr - mo).toFixed(2)`. Identical in real arithmetic, one cent apart in
  IEEE-754 on a 3dp assay (72.98 vs web's 72.99), and that cent flowed into both the cost and the
  sales price. The test stayed as written; mobile was fixed to reduce with `-`.
- **Intentional divergence** → convert it to Tier 4: assert the *difference*, put the reason in
  the test name, cite the web file:line in a comment, and add it to the Tier 4 register above.

**Never** relax the assertion — no widening a `toBe` into `toBeCloseTo`, no deleting the awkward
case from the fixture, no `.skip`. A test that has been loosened until it passes is worse than no
test, because it now certifies a disagreement as parity.
