# De-duplication Audit (#8) — keep / delete / merge map

Status: **audit only** (per decision). Do NOT delete yet — each "delete" needs a
final importer grep right before removal, and should land after Phases 1–3 so we
aren't refactoring under moving code.

Routes live only under `app/`. Anything under `components/` is reachable **only**
if something in the live tree imports it. That's the test used below.

---

## 1. `components/contracts/**`  vs  `app/(root)/contracts/**`

The route tree is `app/(root)/contracts/` (imported by `app/(root)/contracts/page.js`
and reused by `ContractsReview&Statement`, `InvoicesReview&Statement`, etc.).

**External imports into `components/contracts/` (whole repo):** exactly one —
`app/(root)/contracts/modals/tabs/tabs.js` imports `@components/contracts/modals/CertChecker`.

| File | Verdict | Action |
|------|---------|--------|
| `components/contracts/modals/CertChecker.js` | **LIVE** (only used file in this tree) | **Move** → `app/(root)/contracts/modals/CertChecker.js` (or a shared `components/ai/`); update the one import in `tabs.js`. |
| Everything else in `components/contracts/**` (`page.js`, `newTable.js`, `excel.js`, all `modals/*`, `modals/tabs/*`, `modals/pdf/*`) | **DEAD duplicate** of `app/(root)/contracts/**` | **Delete** after a per-file importer grep confirms zero external importers. |

⚠ Before deleting any file here, confirm the live counterpart in `app/(root)/contracts/`
is the newer one (diff them) so we don't drop a fix that only exists in the `components/` copy.

---

## 2. `components/Dashboard/**`  vs  `components/ui/**`

`components/Dashboard/` mixes two things: (a) real dashboard widgets, and (b) a
second copy of the shadcn primitives that already exist in `components/ui/`.

**External imports into `components/Dashboard/`:** only `app/(root)/dashboard/page.js`
(imports `MarketsTicker` + `AIAlertsBar`). `MarketsTicker` imports `HeadlineTicker`.

| File(s) | Verdict | Action |
|---------|---------|--------|
| `AIAlertsBar.js`, `MarketsTicker.js`, `HeadlineTicker.js` | **LIVE** | Keep. |
| `CurrencyWidget.js`, `MetalPricesWidget.js` | **VERIFY** | Grep importers; keep if used by a live widget, else delete. |
| The shadcn `*.jsx` set (`card, table, dialog, select, tabs, toast, sonner, sheet, drawer, dropdown-menu, context-menu, command, calendar, chart, breadcrumb, button-group, avatar, alert, alert-dialog, accordion, menubar, kbd, item, input, input-group, form, field, empty, textarea, toggle`) + `Header.jsx`, `sidebar.jsx` | **DEAD duplicate** of `components/ui/*` | **Delete** after importer grep. Consolidate any stray usage onto `components/ui/*`. |

---

## Safe execution procedure (when #8 is greenlit)
1. For each candidate file: `grep -rn "<filename without ext>" --glob '!<the file itself>'` across the repo.
2. Zero external importers → safe to delete. One+ → move/merge instead.
3. Move `CertChecker` first (it's the only cross-tree dependency); update `tabs.js`.
4. Delete dead files in small commits, running `next lint` + a dev boot after each batch.
5. Re-run this audit grep to confirm nothing new points at deleted paths.
