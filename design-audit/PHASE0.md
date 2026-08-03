# PHASE 0 — Answers & open questions

Status: **answers 2, 3, 4 resolved from the codebase. Question 1 (the 4 reference links) is blocked on Zak.**

---

## Q1 — The 4 reference links

**BLOCKED.** No reference links appear anywhere in this repo, in `CLAUDE.md`, in the git log,
or in `DESIGN_AUDIT_TASK.md` itself. They were shared in a channel this session cannot see.

Needed from Zak: the 4 URLs (or screenshots). Without them **category C6 cannot be audited**
— everything else (C1–C5) is fully derivable from the codebase and proceeds regardless.

---

## Q2 — The canonical font

### Web app
**One family only: Poppins.** Correctly loaded once, the right way:

- `app/layout.js:7-11` — `next/font/google`, weights 300/400/500/600/700, `variable: '--font-poppins'`
- Applied at `app/layout.js:34` via `poppins.className` on `<body>`
- `app/globals.css:118` — `html, body, :root { font-family: var(--font-poppins), 'Poppins', sans-serif }`

No FOUT risk (next/font self-hosts + preloads). **C1 is not a multi-font problem on web.**

Every other family found in the web tree:

| Family | Files | Verdict |
|---|---|---|
| `var(--font-poppins)` re-declared | 57 | Redundant noise — all resolve to Poppins. Harmless, but 57 places to forget. |
| `'inherit'` | 53 sites | Correct (inputs inheriting body font). |
| `'Plus Jakarta Sans'` fallback | `app/(root)/tableStyles.css:28` | **Stray.** Never loaded, so it silently falls through to `sans-serif`. |
| `'monospace'` | `app/(root)/stocks/stockAudit.js:201` | Deliberate (document IDs). Should become a real mono token. |
| `-apple-system, …` | `app/api/ai/send-reminder/route.js:30` | Correct — that's HTML email, not app UI. Out of scope. |

### Mobile app
**Inter** (`mobile/src/theme/tokens.ts:139-147`, Expo `Inter_400Regular` … `Inter_700Bold`).

**So the real C1 finding is: web = Poppins, mobile = Inter.** Two products, two typefaces.

### Font weights — 8 distinct, mixed notation

```
676  font-medium      93  fontWeight 500
214  font-semibold    38  fontWeight 600
213  font-normal      30  fontWeight 400
 74  font-bold        24  fontWeight 700
  4  font-light
  1  font-extrabold
```

`font-medium` and `fontWeight: 500` are the same thing written two ways; same for
semibold/600, normal/400, bold/700. Real distinct weights in use: **300, 400, 500, 600, 700, 800**.

### Recommendation
Keep **Poppins** for web (it is already correct, single-source, and the client has never
complained about the typeface itself). Add **one mono token** for numeric/ID columns.
Retire `font-light` (4 uses) and `font-extrabold` (1 use) — leaves 400/500/600/700.
Delete the stray `'Plus Jakarta Sans'`. Leave mobile on Inter unless Zak wants Poppins there.

---

## Q3 — Existing design token layer

**Yes — and it is real, sophisticated, and already load-bearing. This is not a greenfield job.**

| Layer | File | Status |
|---|---|---|
| Brand CSS variables (12 tokens + RGB triplets) | `app/globals.css:3-29` | **Used heavily** — 1,015 `text-[var(--…)]` sites alone |
| Neutral surface/border/text tokens (8) | `app/globals.css:33-42` | Used |
| Status colour system (25 tokens: ok/danger/warn/violet/pink) | `app/globals.css:45-70` | Used |
| shadcn/Radix HSL tokens | `app/globals.css:78-101` | Used by `components/ui/*` |
| Tailwind palette **re-pointed** at those tokens | `tailwind.config.js:31-44` | Clever — makes `bg-gray-50`, `text-red-600` etc. theme-aware automatically |
| Runtime theme engine — 19 hues × light/dark, WCAG-AA-fitted | `utils/themes.js` | Used; `applyTheme()` writes vars onto `<html>` |
| Typography role classes | `app/globals.css:221-267` (`@layer app`) | Used, but **incomplete** — see below |

### The critical architectural fact

**Dark mode here is CSS-variable swapping, not Tailwind `dark:` variants.**
`utils/themes.js → applyTheme()` rewrites the variable *values* on `<html>` and toggles `.dark`.

```
files using a dark: variant at all: 2   (components/ui/button.jsx, mobile ThemeProvider)
```

So the audit task's proposed C4 test — *"find components with NO `dark:` variant"* — would
flag all 504 files and is **the wrong test for this codebase**. The correct C4 test is:

> **Does this file use `var(--token)`, or does it hardcode a hex / literal `rgba()`?**

Anything hardcoded is frozen at its light-mode value and breaks in dark. That is precisely
the client's *"in dark mode, some places with opacity, some without"*.

### Where the token layer is bypassed — measured

| Bypass | Count | Files |
|---|---|---|
| Hardcoded hex literals | **594** | 97 |
| Literal-channel `rgba(…)` (e.g. `rgba(0,0,0,0.06)`, `rgba(255,255,255,0.95)`) | **139** | ~60 |
| Arbitrary font sizes `text-[0.72rem]` etc. | **425** occurrences, **26 distinct sizes** | 164 |

Not all 594 hex are violations — `globals.css` (48) and `utils/themes.js` (11) are where they
*belong*, and `mobile/src/theme/tokens.ts` (54) is the mobile token file. Export/PDF/Excel
colour is also legitimately unthemed. Triage happens in Phase 3.

---

## Q4 — Routes

### In-app routes wired into the sidebar (`components/const.js`) — **live, in scope**

`dashboard` · `apps/Assistant` · `contracts` · `salescontracts` · `shipment` · `invoices` ·
`expenses` · `accounting` · `ContractsReview&Statement` · `InvoicesReview&Statement` ·
`accstatement` · `stocks` · `storagecosts` · `specialinvoices` · `companyexpenses` ·
`materialtables` · `incoterms` · `activity` · `margins` (role-gated) · `cashflow` ·
`formulas` (role-gated) · `settings`

### In `app/(root)/` but NOT in the sidebar — need Zak to confirm

`analysis` · `contractsstatement` · `invoicesstatement`
(reachable as drill-downs / direct URL, or dead code)

### Auth — live, in scope
`(auth)/signin` · `(auth)/signup` · `(auth)/passes`

### Public marketing site — **needs a scope decision**
`/` (root landing) · `(public)/landing` · `(public)/about` · `(public)/features` ·
`(public)/blog` · `(public)/blog/[slug]` · `(public)/contact` · `(public)/signin`

This is a separate marketing design language (Hero, Testimonials, CTA, Footer, Navbar —
~25 files). It shares no tokens with the app and the client's complaints are all about the
IMS product screens.

### Mobile — **needs a scope decision**
150 files, Expo + NativeWind, its own token file (`mobile/src/theme/tokens.ts`), its own
typeface (Inter). Consistent *within itself* but divergent from web.

### API routes — out of scope (no UI), except `send-reminder` which emits HTML email.
