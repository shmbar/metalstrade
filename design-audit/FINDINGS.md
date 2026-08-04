# FINDINGS

Every issue found, whether fixed or not. Categories map to the client's words:

- **C1** fonts · **C2** uneven text sizes · **C3** uneven box sizes
- **C4** dark mode / opacity · **C5** modals & popups · **C6** vs the 4 reference links

Severity: **High** = client will see it immediately · **Med** = visible on inspection ·
**Low** = code hygiene, no visible symptom.

---

## Batch 1 — Foundation (globals.css, tailwind.config.js, root layout)

| ID | Cat | File:line | What's wrong | Correct value | Sev | Status |
|----|-----|-----------|--------------|---------------|-----|--------|
| 001 | C4 | `tailwind.config.js` (boxShadow absent) | All 348 `shadow-*` usages resolved to Tailwind defaults, which hardcode `rgba(0,0,0,…)`. On a dark surface a black shadow is invisible — cards lost all elevation in dark mode. | `boxShadow` re-pointed at `--shadow-sm/md/lg`, which use `--shadow-rgb` (blue-tinted light, pure black dark) | High | Fixed |
| 002 | C3 | `tailwind.config.js` (boxShadow absent) | 5 shadow steps in use (`sm` 122, `md` 66, `lg` 126, `xl` 27, `2xl` 17) — cards in the same grid had different elevation. | 3 steps; `xl` and `2xl` now resolve to `lg` | Med | Fixed |
| 003 | C5 | `app/globals.css` (no token) | No overlay token existed, so all 5 overlay treatments were invented per-component (see 010). | `--overlay` = `rgb(0 0 0 / .45)` light, `.60` dark | High | Fixed |
| 004 | C5 | `app/globals.css` (no token) | No z-index scale existed; 22 competing values from `z-10` to `z-[100000]`. | Closed ladder of 8: `--z-sticky` … `--z-command` | High | Fixed |
| 005 | C3 | `app/globals.css:180` | `.input` was `h-10` (40px), but 67 of its 71 call sites overrode it to `h-7`/`h-8`. 40px was a height nobody wanted; the overrides were the real spec. | `.input` is `h-7` (28px); overrides deleted | High | Fixed |
| 006 | C2 | `app/globals.css:180` | `.input` font pinned at `0.72rem` (11.52px) at every breakpoint while neighbouring text ramped to 14px. **This is the documented cause of the original cashflow complaint** ("top too large, bottom too small") — it was patched locally with `.cf-uniform` instead of fixed at source. | Ramps 11/12/13/14 in lockstep with `.responsiveText` | High | Fixed |
| 007 | C2 | `app/globals.css:197-208` | The 4 button classes used sizes `9 / 10.512 / 11.5 / 12px`. `0.657rem` and `0.71875rem` are rogue values that exist nowhere else in the app. | Ramps 9/10/11/12 (`--responsiveTextTableTitle` rung) | Med | Fixed |
| 008 | C3 | `app/globals.css:197-208` | 4 button classes, **3 different heights**: `py-1.5`, `h-7`, `py-1`, `py-1`. Buttons sitting in the same toolbar were different heights. | All `h-7` (28px), matching `.input` | High | Fixed |
| 009 | C2 | `app/globals.css:241` | `.responsiveTextTable1` defined byte-identical to `.responsiveTextTable`. Dead code — **zero** usages. | Deleted | Low | Fixed |
| 010 | C2 | `app/globals.css` (ladder incomplete) | Ladder had no rung for page titles or KPI figures, so every page invented its own (`text-2xl`, `text-4xl`, `text-[1.0625rem]`…). | Added `.responsiveTextPage` (16/17/18/20) and `.responsiveTextStat` (20/22/24/26) | Med | Fixed |
| 011 | C1 | `app/globals.css` (no token) | No mono token, so `stockAudit.js:201` inlined `fontFamily: 'monospace'`. | `--font-mono` + `.mono` utility | Low | Fixed |
| 012 | C2 | app-wide | Numeric columns used proportional figures, so digits changed width as values updated and columns visibly jittered. | `.numeric` utility (`tabular-nums`) | Med | Fixed |
| 013 | — | `app/globals.css` (no rule) | Several components set `focus:outline-none` with no replacement — keyboard focus was **invisible**, an accessibility defect. | Global `:focus-visible` ring using `--endeavour` | High | Fixed |

**Batch 1 result:** 13 findings, 13 fixed, 0 open. `npm run build` clean.

---

## Batch 2 — Shared UI primitives

| ID | Cat | File:line | What's wrong | Correct value | Sev | Status |
|----|-----|-----------|--------------|---------------|-----|--------|
| 014 | C4 | `components/ui/button.jsx:12` | `dark:bg-slate-50 dark:text-slate-900` on the primary button. `slate-50` **is** remapped (→`--surface-base`, dark); `slate-900` is **not** (stays near-black). Dark text on a dark background = **invisible button label in dark mode**, in 16 files. | Variable-based variants; every `dark:` removed (wrong mechanism for this app) | High | Fixed |
| 015 | C3 | `components/ui/button.tsx` (whole file) | A **second, divergent** `<Button>` — Replit scaffolding. All 7 of its tokens/classes (`--button-outline`, `--primary-border`, `--secondary-border`, `--destructive-border`, `hover-elevate`, `active-elevate-2`, `shadow-xs`) are defined in **zero** files. Not dead code: Next resolves `.tsx` before `.jsx`, so `import … from '@components/ui/button'` got this one while `…/button.jsx` got the other. **Verified in the build output — its marker class was bundled into 8 chunks (`/formulas`, `/margins`, `/settings`).** Two different-looking buttons live simultaneously. | Deleted; both import paths now resolve to one implementation | High | Fixed |
| 016 | C3 | `components/ui/button.jsx:23-27` | Button heights `h-10 / h-9 / h-11` — none matched the 28px used by `.blackButton` and `.input`. | `h-6 / h-7 / h-8` | High | Fixed |
| 017 | C5 | `components/modal.js:23` | Overlay `bg-black bg-opacity-25` (also deprecated Tailwind syntax) — the Headless-UI wrapper behind **30** files. | `bg-[var(--overlay)] backdrop-blur-[2px]` | High | Fixed |
| 018 | C5 | `components/ui/dialog.tsx:22` | Overlay `bg-black/40` — a different dim level from the 25% above, so two modals in the same app darkened the page differently. | Same `var(--overlay)` | High | Fixed |
| 019 | C5 | `components/idle.js:95` | Overlay `bg-black/25`, a third value. | Same `var(--overlay)` | High | Fixed |
| 020 | C5 | `components/modal.js:13`, `ui/dialog.tsx:22,39` | Modal z-index `z-[60]` vs `z-[210]`/`z-[220]` — arbitrary, mutually unaware. | `z-modal` / `calc(var(--z-modal)+1)` | High | Fixed |
| 021 | C5 | `components/ui/dialog.tsx:45` | Close button was a **red circle** top-right; `components/modal.js` used a **grey icon**. Same action, two designs. | Identical grey→blue 24px control in both | Med | Fixed |
| 022 | C2 | `components/modal.js:43` vs `ui/dialog.tsx:89` | Modal title `text-[0.85rem]` (13.6px, a size used nowhere else) vs `text-lg` (18px). Same element, 4.4px apart. | `.responsiveTextTitle` in both | High | Fixed |
| 023 | C3 | `components/ui/input.tsx:11` | `h-9` (36px), `rounded-md`, `text-base`/`md:text-sm`, `bg-transparent` — 8px taller than every other input, different radius, different type, unthemed surface. | Matches `.input` exactly | High | Fixed |
| 024 | C2 | `components/StatusBadge.js:10` | Badge type `0.55rem` / `0.65rem` (8.8px / 10.4px) — two more sizes found nowhere else. Written inline, so invisible to a class-based scan. | `var(--fs-caption)` / `var(--fs-table)` | Med | Fixed |
| 025 | C5 | `components/toast.js:33,44` | Toast at `z-[70]` — **below** the modal layer, so a toast fired from inside a modal appeared behind it. | `z-toast` (300) | High | Fixed |
| 026 | C4 | `components/toast.js:36` | Error toast `bg-[#dc2626] border-[#b91c1c]` hardcoded — frozen at light values. | `--danger-text` / `--danger-strong` | Med | Fixed |
| 027 | C5 | `components/ui/tooltip.tsx:23` | Tooltip `z-[9999]` — an arbitrary "win everything" value. | `z-tooltip` (400) | Med | Fixed |
| 028 | C5 | `components/ui/select.tsx:78` | Select menu `z-[9999]`, same as the tooltip — ties broken by DOM order, not intent. | `z-dropdown` (40) | Med | Fixed |
| 029 | C3 | `components/comboboxWH/PNL/Remarks/ProductSelect/StockAvailability.js` | Combobox shells `h-8` while `.input` beside them is `h-7`; inner `py-2 + leading-5` = 36px inside a 32px `overflow-hidden` box, so the text was already being clipped. | `h-7` + `py-1` (28px, exact fit) | High | Fixed |
| 030 | C2 | 7 combobox/select files | Dropdown panels `text-base` (16px fixed) — the largest body text in the app, inside a control. | `.responsiveTextInput` | Med | Fixed |
| 031 | C2 | app-wide | **533 inline `fontSize:` literals across 77 files, ~45 distinct values**, including 16 different sizes between 8.6px and 12.5px and 12 distinct `clamp()` expressions. **Missed entirely by the Phase-1 scans**, which only match Tailwind classes. | 507 sites → the 7 `--fs-*` ladder variables | High | Fixed |
| 032 | C2 | app-wide | 362 `text-xs` + 72 `text-sm` + 134 `text-xs sm:text-sm` pairs — fixed sizes that do not ramp, so they drifted up to 2px from neighbours on large screens. | `.responsiveTextInput` / `.responsiveTextTitle` | High | Fixed |
| 033 | C3 | app-wide | 229 `rounded-xl` + 70 `rounded-md` + 3 `rounded-sm` — five radii in play. | `rounded-2xl` (cards) / `rounded-lg` (controls) | High | Fixed |
| 034 | C4 | `app/(auth)/signin/login.js:91`, `components/idle.js:112` | `text-gray-800` / `text-gray-900` — neither shade is remapped in `tailwind.config.js`, so both stay near-black and go unreadable on dark surfaces. | `--port-gore` / `--chathams-blue` | High | Fixed |
| 035 | C1 | `app/(root)/stocks/stockAudit.js:201` | Inline `fontFamily: 'monospace'` — a second font family declared outside the one allowed place. | `var(--font-mono)` | Low | Fixed |
| 036 | C3 | `components/ui/table.tsx:76`, `ui/command.tsx:47` | Table header `h-10`, command input `h-10` — off the 24/28/32 control scale. | `h-8` | Med | Fixed |

**Batch 2 result:** 23 findings, 23 fixed, 0 open. `npm run build` clean.

---

## Batch 3 — Colour, size, geometry and stacking sweep (app-wide)

| ID | Cat | Where | What's wrong | Correct value | Sev | Status |
|----|-----|-------|--------------|---------------|-----|--------|
| 037 | C4 | 42 files | 62 hex literals that exactly duplicated an existing token (`#838ca7`, `#28264f`, `#ebf2fc`, `#103a7a`, …) — frozen at light values. | `var(--token)` | High | Fixed |
| 038 | C4 | 42 files | 97 literal `rgba()` — shadows, tints and scrims that could not follow the theme. | `rgba(var(--…-rgb), a)` | High | Fixed |
| 039 | C4 | 17 files | 44 colours arrived at from Tailwind's palette that are the twin of a token (`#f1f5f9`≡`--surface-muted`, `#cbd5e1`≡`--border-neutral-strong`, `#2563eb`≡`--primary-bright`, …). | matching token | Med | Fixed |
| 040 | C4 | 14 files | **20 white surfaces.** `background: '#fff'` in zebra-striped tables meant dark mode alternated a **white** row with a dark one. Also white pills and white hover-out resets. | `var(--surface-card)` | High | Fixed |
| 041 | C4 | `app/(root)/shipment/page.js:157,168` | `onMouseLeave` repainted the row literal white, so hovering any row in dark mode left it white. | `var(--surface-card)` | High | Fixed |
| 042 | C4 | 15 files | 34 whites used as *foreground* on brand surfaces. Correct in both modes, but indistinguishable from bug-whites to any scan. | New `--on-brand` token, so a literal `#fff` is now **always** a defect | Med | Fixed |
| 043 | C4 | `app/(root)/dashboard/page.js:637,711` | 8-digit alpha hex `#db27771A` / `#f59e0b1A` — a tint of a token, written as a frozen literal. | `color-mix(in srgb, var(--token) 10%, transparent)` | Med | Fixed |
| 044 | C2 | 70 files | **328 class-based arbitrary sizes / hand-rolled ramps** collapsed. 27 distinct patterns → 7 ladder classes. | `.responsiveText*` | High | Fixed |
| 045 | C5 | 27 files | 36 arbitrary `z-[N]` values across the app. | The 8-step ladder | High | Fixed |
| 046 | C3 | 31 files | 63 off-scale control heights (`h-[26px]`, `h-[28px]`, `h-[30px]`, `h-[1.84rem]`, `h-[1.86rem]`, `h-[32px]`). | `h-6` / `h-7` / `h-8` | High | Fixed |
| 047 | C2 | 13 export files | `text-sm` on the export buttons in every `excel.js`. Missed at first because the codemod scope wrongly treated those files as document-only — they render a real toolbar button. | `.responsiveTextTitle` | Med | Fixed |
| 048 | C4 | `components/CommentThread.js:20` | 6 avatar hues, 5 from tokens and 1 literal `#0e7490`. | New `--teal-text` token (light + dark) | Low | Fixed |
| 049 | C4 | `components/Dashboard/MarketsTicker.js:32` | Gold `#FFD700` euro icon. | `var(--warn-text)` | Low | Fixed |
| 050 | C4 | `app/(root)/dashboard/page.js:311,1101,1347` | Chart series colours scattered inline, making "themed or mistake?" unanswerable by a scan. | Centralised in `utils/chartTheme.js` as `RANKING_PALETTE` / `CHART_ACCENT`, **deliberately unthemed and documented** | Med | Fixed |

### Two process defects found in my own work — recorded because they affected the result

| ID | What happened | Consequence | Resolution |
|----|---------------|-------------|------------|
| P-1 | A codemod built its regexes with a hand-rolled escape that silently failed. `h-[1.84rem]` became the **unescaped** pattern `h-[1.84rem]` — a character class matching `h-1`, `h-8`, `h-4`. | Rewrote **icon sizes** (`h-4`→`h-7`) across 124 files. An earlier z-index pass had the same flaw (`z-[100]` matched `z-0`). | Both runs were **reverted** to the batch-2 commit and redone with `replace-map.js`, which escapes every metacharacter and **self-checks against that exact key at startup, refusing to run if escaping is broken**. Re-run counts matched the true scan counts exactly (36 z-index sites, not the 75 the broken run claimed). |
| P-2 | Three gates were wrong and flagged correct code: the font-family gate fired on the literal string `font-family` (86 correct `inherit` / `var(--font-poppins)` declarations); the hex gate matched HTML entities (`&#931;`, `&#8209;`); the control-height gate started at 15px and flagged **icon sizes**. | Would have produced a false "55 files failing" and, worse, invited pointless edits to correct code. | Gates rewritten line-based with explicit exclusions for commented-out code, `cssVar()` fallbacks and HTML entities; height gate narrowed to the 24–40px control band. |

**Batch 3 result:** 14 findings, 14 fixed, 0 open. Plus 2 process defects, both resolved.
`npm run build` clean; lint identical to baseline.

---

## Batch 4 — Modals, structurally (the half of C5 that no gate can prove)

Batch 2 made the two modal *wrappers* correct. Batch 3 made every modal's *tokens* correct.
Neither proved that a modal opened from screen A looks like one opened from screen B. That
needed reading the files.

| ID | Cat | Where | What's wrong | Correct value | Sev | Status |
|----|-----|-------|--------------|---------------|-----|--------|
| 051 | C3 | 13 files | **8 different modal widths** (`max-w-sm` … `max-w-7xl`). `Activity / History` and `Comments` open from the **same toolbar** at different widths — the clearest possible version of "uneven box sizes". | 4 spec steps; every modal rounds **up**, never down, so nothing can clip | High | Fixed |
| 052 | C5 | `DocumentImportOverlay.js`, `PdfPreview.js`, `ReminderModal.js` | Overlay scrim `rgba(var(--shadow-rgb), 0.5)`. That **is** a token, so it passed the colour gate — but `--shadow-rgb` is **blue** in light mode, so these three dimmed the page a *different colour* from every other modal. A gate proves "themed"; only reading proves "the same". | `var(--overlay)` + 2px blur | High | Fixed |
| 053 | C5 | `components/CommandPalette.js:98` | **No overlay scrim at all** — the palette floated over undimmed content. | `var(--overlay)` + 2px blur | High | Fixed |
| 054 | C5 | `SplitControl.js`, `ReminderModal.js` | Sitting in `z-command` (500), the full-screen-viewer layer. They are dialogs, so they outranked things that should cover them. | `z-modal` | Med | Fixed |
| 055 | C5 | `poInvModal.js:572`, `videoLoader.js:12` | Raw `z-50` on a modal overlay — outside the ladder. | `z-modal` / `z-command` | Med | Fixed |
| 056 | C3 | `poInvModal.js:574` | Panel pinned to `w-[560px] max-w-[94vw]` — an arbitrary width belonging to no scale. | `w-full max-w-2xl` | Med | Fixed |
| 057 | C4 | `components/modalCopyInvoice.js:20` | `text-white bg-slate-700`. `slate-700` is remapped to `--text-strong`, which is **near-white in dark mode** — white text on a white panel. **Unreadable notification.** | brand surface + `--on-brand` | High | Fixed |
| 058 | C5 | 12 files | Dropdown/listbox/menu panels on raw `z-50` while others used `z-dropdown` — two conventions for one layer. | `z-dropdown` | Med | Fixed |
| 059 | C5 | 18 files | Sticky table headers on raw `z-10`, below the dropdown layer — the classic "header shows through an open menu". | `z-sticky` | Med | Fixed |
| 060 | C5 | `productsTable.js`, `productsTableInvoice.js` | In-cell tooltips on `z-50`, below modals. | `z-tooltip` | Med | Fixed |
| 061 | — | `components/layout/Header.tsx` | Sticky header at `z-40`. **The file has zero consumers** — dead code. Fixed rather than deleted; deleting is outside a visual-only remit. | `z-sticky`, flagged as unused | Low | Fixed |

### A third defect in my own work

| ID | What happened | Consequence | Resolution |
|----|---------------|-------------|------------|
| P-3 | The batch-3 z-index sweep mapped `z-[100] → z-sticky` wholesale. But `z-[100]` had been used for **three different intents**: a fixed navbar (genuinely sticky), a dropdown panel, and the **command palette**. | The command palette was demoted from 100 to 20 — *below* dropdowns, popovers and modals. A blanket numeric map cannot infer intent. | Caught while reading the overlay files in this batch. All three reassigned by intent. The lesson is recorded in the report: numeric sweeps need a semantic pass afterwards, which is exactly what this batch was. |

**Batch 4 result:** 11 findings, 11 fixed, 0 open. Plus 1 process defect, resolved.
Modal widths 8 → 4. Overlay scrims 3 variants + 1 missing → **1**. Globally-positioned raw
z-index → **0**.

---

## Batch 5 — Chart/canvas regression + a pre-existing corruption

Reported by Zak: the dashboard crashed with
`Failed to execute 'addColorStop' on 'CanvasGradient': The value provided
('rgba(var(--primary-bright-rgb), 0.28)') could not be parsed as a color.`

| ID | Cat | Where | What's wrong | Correct value | Sev | Status |
|----|-----|-------|--------------|---------------|-----|--------|
| 062 | C4 | `app/(root)/dashboard/page.js:1086-1087` | **My regression.** The batch-3 colour sweep rewrote `rgba(37,99,235,0.28)` → `rgba(var(--primary-bright-rgb), 0.28)` inside a canvas gradient stop. **Canvas cannot parse `var()`** — the dashboard threw on render. | `cssVarRgba('--primary-bright-rgb', 0.28, '<literal>')` | **Critical** | Fixed |
| 063 | C4 | 3 files, 69 sites | **My regression.** The same sweep rewrote the *fallback* argument of `cssVar()`/`cssVarRgba()`, e.g. `cssVar('--ok-text', '#16a34a')` → `cssVar('--ok-text', 'var(--ok-text)')`. A fallback that is itself a `var()` is unparseable, so the fallback silently did nothing. Round 2 of the sweep had a `cssVar(` guard; **round 1 ran before that guard existed.** | literals recovered from the pre-audit commit | High | Fixed |
| 064 | C4 | `app/(root)/dashboard/page.js:1180-1181` | Donut dataset colours and border passed `var()` straight to canvas. | `cssVar(token, literal)` | High | Fixed |
| 065 | C3 | 8 files, 12 sites | **NOT mine — pre-existing.** `var(--surface-card)beb`, `…7ed`, `…3cd`. A `#fff` → `var(--surface-card)` replace with **no word boundary** met `#fffbeb` / `#fff7ed` / `#fff3cd` and ate the first three characters. The result is **invalid CSS**, so those alert panels rendered with **no background at all**. Introduced by commit `0f57b43` and shipped. | `var(--warn-soft)` / `var(--warn-bg)` | High | Fixed |

### New gates, so none of this can recur

| Gate | Catches |
|---|---|
| **11** | `var()` inside `addColorStop(...)`, and `var()` inside a `cssVar()`/`cssVarRgba()` fallback |
| **12** | truncated-token corruption — `var(--x)` immediately followed by stray hex characters |

Gate 11 was first written to also flag `backgroundColor: 'var(--x)'`. That produced **170
false positives**: the form is perfectly correct in a DOM style object, where CSS resolves
`var()` natively. Narrowed to the two unambiguous patterns. Chart dataset colours are left
to those plus the fact that chart.js throws loudly and immediately.

### Two further mistakes of mine, caught while fixing this

1. `skipLine()` in the gate runner tested `/cssVar\(/`, which does **not** match
   `cssVarRgba(`. That failed 9 correct lines on gate 5. Now `/cssVar(Rgba)?\(/`.
2. My repair script converted **DOM** `style` values to `cssVarRgba()` as well as canvas
   ones, inventing a black fallback where the original had legitimately used `var()`.
   Two sites; reverted to the plain CSS form.

**Batch 5 result:** 4 findings fixed (3 mine, 1 pre-existing), 2 gates added.
All 12 gates pass. Build clean.

---

## Batch 6 — The visual pass (184 screenshots, 23 routes × 2 themes × 4 widths)

Ran against a **production build** with Zak's account. Validated with
`npm run design:verify-shots` before any conclusion was drawn from it.

### What the design audit itself scored

| Check | Result |
|---|---|
| Horizontal overflow, all 184 checks | **0** |
| Pages stuck loading | **0** |
| Dark mode renders correctly (surfaces, text, no white rows) | **confirmed by eye** |
| Light/dark genuinely differ on every route | **confirmed** |

959 raw "issues" resolve to **957 harness noise** (aborted route prefetches, and a
Vercel Speed Insights script that 404s outside Vercel) and **2 real defects**, below.

### Real defects found

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 066 | — | `.env:13` + `components/exchangeApi.js` | **A placeholder FX API key is shipped.** `NEXT_PUBLIC_OPENEXCHANGERATES_APP_ID=PASTE_OPENEXCHANGERATES_APP_ID_HERE`, so every call returns **401** and `exchangeApi.js:9-11` falls through to `return 1` — a EUR↔USD rate of **1.0**. **Scope, verified:** this affects only `getCur()`, whose sole callers are `formulas/page.js` and `contracts/modals/productsTable.js` (historical, date-specific lookups). The dashboard rate strip and general displays are **fine** — they use different, key-less services (`utils/fxRates.js` → frankfurter.app, `hooks/useExchangeRates.js` → exchangerate-api.com). So the damage is confined to the two places above, but those are **pricing**. Not a design issue; found only because the visual pass watches the network. | **High** | **OPEN — needs a real API key from Zak** |
| 067 | C3 | `app/(root)/contractsstatement/`, `app/(root)/invoicesstatement/` | Both return a Next **404**. They have no `page.js` — they are component folders imported by `cashflow`, `shipment` and the two Review pages. **My Phase-0 characterisation of them as "routes not in the sidebar" was wrong.** No audit work was wasted (the files were covered as components) but the real route count is **23, not 25**. | Low | Fixed (docs corrected) |

### Not defects, recorded so they are not re-investigated

- `_vercel/speed-insights/script.js` 404s on a self-hosted `next start`. It resolves on
  Vercel. 270 of the 959 entries.
- 768 `net::ERR_ABORTED` — route prefetches the harness itself cancels by navigating away.
- One transient `identitytoolkit` 400 on `contracts`/dark that dropped the session; the
  harness re-authenticated, refused to save the login page, and the 4 shots were
  re-captured in a follow-up run.

### Three more defects in my own harness, all caught by verifying rather than counting

| ID | What happened | Resolution |
|----|---------------|------------|
| P-4 | Run 1 reported "200 screenshots, 10 issues" and looked complete. **100 were the login page** (session dropped mid-run, harness kept shooting) and 6 were a spinner. Only **2 of 25 routes** captured the app. | Re-auth-and-retry; refuse to save a screenshot while unauthenticated. |
| P-5 | Run 3 passed with 0 session drops — but **every 390px shot was a skeleton loader**. The content-wait matched the text "Loading…"; the skeleton is a `.skel` shimmer with **no text**. Resizing to mobile remounts tables into skeleton state. | Wait on `.skel` too, and re-wait after **every** resize, not just after navigation. |
| P-6 | The `requestfailed` handler filtered noise using the **URL**, but the "ERR_ABORTED" marker is in the *error text*, so the filter never matched. | Filter on both. |

The lesson is `design-audit/tools/verify-shots.mjs`: it checks the **images** — duplicate
byte-sizes across routes (the signature of a repeated login page), files too small to be a
real page, light/dark pairs that are identical. Runs 1 and 3 each failed it. Counting files
proved nothing, three times running.

| 068 | — | `utils/fxRates.js`, `hooks/useExchangeRates.js`, `components/exchangeApi.js` | **Three different FX providers** in one app (frankfurter.app, exchangerate-api.com, openexchangerates.org), so the same currency pair can be sourced three ways and disagree. Noticed while scoping 066. Consolidating is a logic change, so it is flagged rather than done. | Med | **OPEN — needs a decision** |

**Batch 6 result:** 3 real defects (2 open, 1 fixed), 3 harness defects fixed.
184/184 screenshots valid.

### Live re-verification on Zak's restarted server (2026-08-04)

`/dashboard`, production data, after login: **fully rendered, 9 charts, ZERO console errors.**
The crash reported at the start of batch 5 is confirmed fixed against the real app.
The account's theme was left in dark by the screenshot run and has been **restored to light**.

---

## Batch 7 — Dark-mode regressions and the marketing pages

Two reports from Zak: *"in dark theme everything looks blurry"* and *"also check
Home / About / Features / Blog / Sign In in dark mode"*.

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 069 | C5 | `components/videoLoader.js:12` | **My regression.** The batch-4 "one overlay everywhere" pass gave the **loading veil** the **modal scrim**. A loader is not a modal: it was correctly tinted with the surface (`rgba(var(--surface-card-rgb),.6)`). With the modal scrim it dimmed *and* blurred the whole app on every data refresh — in dark mode, black over an already-dark surface plus a 2px blur, i.e. **"everything looks blurry"**. | **High** | Fixed |
| 070 | C4 | 28 files (17 app, 11 marketing) | **Text tokens used to paint backgrounds.** `--chathams-blue`, `--port-gore`, `--bunting` are *ink* colours — the theme engine **inverts** them in dark mode. Painting a surface with one works in light and flips **light** in dark, while the white text on it stays white. This is why the marketing hero was unreadable, and it was doing the same to button hover states and table header bands **inside the app**. | **High** | Fixed |
| 071 | C4 | `components/Hero/hero.jsx:44,45,58,69,84` | The mirror image: **surface tokens used as text** on a brand surface. `--surface-header`/`--rock-blue` go dark in dark mode → dark text on the dark hero. | **High** | Fixed |
| 072 | C4 | 30 marketing files | The public pages ignored dark mode entirely: 39 × `bg-white` (Tailwind's `white` is not remapped, so it is a literal and cannot follow the theme) plus 44 hardcoded hex. `.dark` *was* applied to `<html>`, so the result was a **half-dark page** — a themed hero above a pure-white section. | **High** | Fixed |
| 073 | C5 | `components/Navbar/navbar.jsx:22` | Sticky nav `bg-white/95` → a white bar in dark mode; also `z-[10000]`, outside the ladder (marketing was never gated). | Med | Fixed |

### Two new tokens, because the existing ones could not express this

- `--brand-deep` — a deep brand surface that stays deep in **both** modes. Built with
  `color-mix` from `--endeavour`, which the engine keeps mid-tone (L 45 light / 48 dark), so
  it follows the user's chosen hue without inverting.
- `--on-brand-muted` — secondary text on a brand surface; the companion to `--on-brand`.

### Gate 13

`no text token used as a background (it inverts in dark mode)`.

This is the class my first twelve gates could not see: they check for **hardcoded** colours,
and every one of these 28 sites was using a **proper token** — just the wrong *role*. A token
being present is not the same as it being correct.

### Verified live, dark mode, production build

| Page | Large light surfaces before | After |
|---|---|---|
| Home | 21 | **0** |
| About | 15 | **0** |
| Features | 9 | **0** |
| Blog | 4 | **0** |
| Sign In | 5 | **0** |

Dashboard: 0 blur elements after load, 9 charts, no console errors.
The account's theme (violet) is untouched; its mode was left in **light**, as found.

**Batch 7 result:** 5 findings, 5 fixed. 1 new gate. Gates 1-13 all pass.

### Batch 7b — light mode re-verified, and the blur removed outright

Zak asked whether the marketing pages had been checked in **light** mode too. They had not:
the `--brand-deep` swap (28 files) and the hero text fix landed *after* the only light-mode
measurement, so light was unverified. Checked now, on a production build:

| Page | Light surfaces | Dark surfaces (hero/nav, intentional) | Page errors |
|---|---|---|---|
| Home | 21 | 1 | none |
| About | 15 | 1 | none |
| Features | 9 | 2 | none |
| Blog | 4 | 1 | none |
| Sign In | 19 | 0 | none |

Light mode is intact — nothing regressed.

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 074 | C5 | `components/videoLoader.js` | Checking light mode revealed the page is blurred **there too**. Fixing the scrim (069) removed the dark-mode murk but left the `backdrop-blur`, which was in the original code. That blur applies to content the user is actively reading, and the loader appears on **every** date-range change and data reload — so it is visible constantly, in both modes. That is the more literal reading of *"everything looks blurry"*. Blur removed; the translucent veil alone still signals "busy" and blocks interaction. Modals keep their blur, which is correct — a dialog *should* push the page back. | **High** | Fixed |

### Batch 7c — all 19 themes × both modes

Zak asked whether dark/light had been checked on **all** theme colours. It had not — only
his own (violet). There are **19 presets × 2 modes = 38 combinations**, and the two tokens
added in batch 7 (`--brand-deep`, `--on-brand-muted`) are *derived from* `--endeavour`, so
they change with every hue. Checking one proves nothing about the other 37.

Rather than eyeball them, `design-audit/tools/theme-contrast.mjs` (`npm run design:contrast`)
imports the real `deriveTokens()` from `utils/themes.js`, reproduces the `color-mix` and the
alpha compositing, and computes WCAG contrast for all 38:

```
38 combinations checked (19 presets x 2 modes)

pairing                              min    worst theme/mode
whiteOnDeep                           9.10  steel/dark   PASS (need 4.5)
mutedOnDeep                           6.24  ocean/dark   PASS (need 3)
whiteOnEndeavour                      4.51  stone/dark   PASS (need 4.5)

✓ every preset passes in both modes
```

`whiteOnEndeavour` at 4.51 is the theme engine's own AA fit working as designed — that row
is a regression check on `utils/themes.js`, not on this audit's tokens.

Visual sample of the extreme hues (yellow / green / near-neutral / magenta) in both modes:
mustard, moss, graphite and fuchsia all render coherently — themed surfaces, readable text,
status colours preserved.

### A mistake, and the account state

While automating the theme picker I used a **substring** selector, `[aria-label*="Theme"]`,
which matched the *first swatch* rather than a menu trigger and silently **changed the
account's theme from Violet to Ocean**. It was masked for a while because the production
server was serving a stale build, so the page never hydrated and every token read back as
the stylesheet default — making a real change look like a non-hydrated page.

Restored and verified: **theme `violet`, mode `dark`** — exactly as found.

Same lesson as P-1: a loose pattern that matches more than intended, and a reading taken
from an environment that was not actually working.

### Batch 7d — "did the audit hurt any functionality?"

Asked by Zak. Verified rather than asserted.

**Method:** classified every changed line in the 240 changed app files (`design-audit/` and
new tooling excluded). Of ~2,000 edits, **34** lines contain a logic keyword — and on
inspection every one is a *colour value sitting inside* an unchanged construct
(`if (!active) e.currentTarget.style.background = …`). No condition, handler, data flow,
query or write path was altered.

**Checks:** `npm run test` → **131 passed / 9 files**. `npm run build` clean.
`npm run lint` identical to the pre-audit baseline. Gates 1-13 pass.
Excel/PDF exports: **0** document-colour lines changed — only a toolbar button's class.

But two real regressions **were** introduced and are worth recording honestly:

| ID | What | Status |
|----|------|--------|
| 075 | `StatKpiCard` in `dashboard/page.js`: `accent` is used as `` `${accent}1A` `` (hex-alpha concatenation) **and** fed to a chart.js `borderColor`. Tokenising the last two literal accents meant `var(--primary-bright)1A` — invalid CSS, so the icon tint vanished — and `var()` on a canvas, which cannot parse it. | Fixed |
| — | Previously found and already fixed: the dashboard canvas crash (062), 69 self-referential `cssVar` fallbacks (063), and a codemod that resized icons across 124 files (P-1, reverted before it was ever committed). | Fixed |

**The same inspection found this bug was mostly pre-existing.** Six of the eight `accent`
call sites were **already** passing `var(--…)` tokens at `c9aed1a`, so the broken tint and
the unparseable chart colour shipped before this audit began. The audit added two more and
then fixed all eight, by resolving tokens to real colours (`solidColor()`) and replacing the
hex-alpha trick with `color-mix`, which works for tokens and literals alike.

**Not verified functionally** (no coverage, and not reachable from here): saving contracts
and invoices, drag-and-drop ordering, print stylesheets, and the generated Excel/PDF files
opened in Excel/a PDF reader. The code paths are untouched, but "untouched" is not "tested".

---

## Batch 8 — /margins regressions reported by Zak (with screenshot)

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 076 | C2 | `app/globals.css` ladder + every totals row | **Figures broke mid-number.** The `.responsiveText*` classes carry `break-words` (`overflow-wrap: break-word`), which breaks a long token at ANY character when the box is tight. Totals rendered `$5,159,250.` above `00`, and `305.00` above `0`. Prose may break; a figure may not. | **High** | Fixed |
| 077 | C3 | `app/(root)/margins/page.js` | `Add month` and `Save` used `px-3 py-1` + body-size text, making them visibly taller than every other button in the app. | Med | Fixed |
| 078 | C2 | `app/(root)/margins/newTable.js` | The same grid mixed **two rungs for the same kind of cell** — 5 × `responsiveTextTable` (10/11/12/13) beside `responsiveTextInput` (12/13/14/15) and `.input` pills at 11/12/13/14. That mix is why the values read small against their own headers. | Med | Fixed |

### Why 076 needed two passes

`tfoot td { white-space: nowrap }` fixed most cells but **not** the Qty total. The figure is
wrapped in an inner `<div>` carrying its own ladder class, and that element's
`whitespace-normal` beats a rule set on the cell. The rule now covers descendants
(`tfoot td *`). Verified with `Range.getClientRects()` — a genuinely wrapped figure occupies
more than one line box:

```
figures wrapped across lines: 0
buttons: Add month 28px, Save 28px   (the standard control height)
```

### The lesson

This is a direct consequence of a size utility also dictating **wrapping**. `break-words`
was in the original `.responsiveText*` definitions, so it was pre-existing — but the audit
made it bite by migrating numeric cells (which previously carried bare `text-[…]` classes
with no wrapping rules) onto the ladder, and by widening columns via the `.input` type bump.
A token that controls two unrelated things will eventually be right for one and wrong for
the other.

### Batch 8b — margins header alignment

Zak: *"in table header all align centre except Open Ship and Qty (MT) — why?"*

**Measured before assuming.** At 1730px every header was already exactly **0px off-centre**
on a single line, so alignment was never the fault. The real cause: `Qty (MT)` and
`Open Ship` are the **only two headers containing a space inside a narrow column**
(88px and 103px), so they were the only ones that could wrap onto two lines — which reads as
mis-alignment against ten single-line neighbours.

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 079 | C3 | `app/(root)/margins/newTable.js:388` | Header labels could wrap, and only two of twelve did. Headers now `whitespace-nowrap` — the table scrolls horizontally if a column truly cannot fit, rather than reflowing a single label. | Med | Fixed |

Verified at six widths — wrapped headers **0**, max off-centre **0px**, page overflow **0px**
at 1730 / 1440 / 1280 / 1024 / 768 / 390.

### Noted, not changed: the header ignores its column's alignment

`COLUMN_CONFIGS` gives every column an `align` (`left` / `center` / `right`) and the header
block reads it into `columnConfig` — then **never uses it**; the header div is hard-coded
`justify-center`. Two further oddities in the same area: the cell mapping turns
`align: 'right'` into `text-center`, so no column is actually right-aligned, and `cellWidth`
is computed from a `width` key that no config defines.

Left alone deliberately. Zak's message —*"all align centre except…"*— says the centred header
row is the **wanted** result, so making headers follow `align` would move Description,
Supplier and Client to the left, i.e. change what he likes. Recorded as dead configuration
worth tidying when someone next touches this table, not as a defect to fix mid-audit.

### Batch 8c — "table text font size — tell me?"

Measured on /margins rather than estimated:

| Element | Before | After |
|---|---|---|
| Header | 13 / 14 / 15px (ramps) | unchanged |
| Totals row | 13 / 14 / 15px (ramps) | unchanged |
| **Every data cell** | **9px, flat at every width** | **11 / 12 / 13px (ramps)** |

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 080 | C2 | `app/(root)/margins/newTable.js:364` | `.margins-data-table tbody td { font-size: 9px !important; }` — a hardcoded size that pinned every data cell at 9px at every width AND, being `!important`, overrode the class on the input pills themselves: they carried a 13px class and rendered 9px. Removed; cells now follow the ladder the `<Table>` and pills already declare. | **High** | Fixed |

**Pre-existing, and systemic.** The rule was present at `c9aed1a`, and the identical
`font-size: 9px !important` appears in **13 files** — every major data table in the CRM
(contracts, accounting, stocks, expenses, shipment, both Review pages, accstatement,
analysis, companyexpenses, specialinvoices, contractsstatement totals, margins).

The audit did not create it, but it **made it visible**: raising the header and totals rows
to 13-15px widened the gap against the frozen 9px data from about 2px to about 6px. That is
why the table suddenly read as "very small" when the individual sizes had barely moved.

Only `margins` is changed here — that is the page Zak reported. The other **12 tables are
left alone pending his decision**, because removing the override on all of them changes the
density of every data screen in the product, which is his call and not a defect fix.

---

## Batch 9 — Notification panel + CSS colour keywords

Zak: *"notification when open covers a lot — reduce its size and make it more advanced and attractive."*

### The panel

| | Before | After |
|---|---|---|
| Width | 360px | **330px** |
| Height cap | `60vh` (≈540px on a 900px screen) | **`min(56vh, 420px)`** |
| Row padding | `px-3 py-2.5` | **`px-2.5 py-1.5`** |
| Message | `--fs-input` (12-15px), unclamped | **`--fs-body` (11-14px), `line-clamp-2`** |
| Meta line | `--fs-table` | **`--fs-caption`** |
| Type icon | 26px circle / 3.5 icon | **22px / 3** |
| Left accent | 3px | **2px** |

The clamp matters as much as the size: one long message used to run to three lines and make
its row triple-height, so the list had no rhythm. Every row is now at most two lines.

### What resizing it uncovered

| ID | Cat | Where | What's wrong | Sev | Status |
|----|-----|-------|--------------|-----|--------|
| 081 | C5 | `components/NotificationBell.js` | Panel too large and rows unbounded (above). | Med | Fixed |
| 082 | C4 | 10 files | **CSS colour KEYWORDS.** Gate 4 only matches `#hex` and `rgba()`, so `background: 'white'` passed it — the same defect written differently. A read notification row rendered **white in dark mode**, and `CertChecker` zebra-stripes its table with a literal white, alternating a white row with a dark one. 7 surfaces + 15 foregrounds fixed. | **High** | Fixed |

### Gate 4b

`no CSS colour keywords as style values (white/black)`.

Third time a gate has been too narrow: gate 4 looked for `#hex`, gate 12 for truncated
tokens, gate 13 for inverted roles — and each time the same underlying mistake showed up in
a form the pattern did not cover. A colour can be written as hex, as `rgba()`, as a keyword,
as the *wrong token*, or as a *token in the wrong role*. Enumerating the ways something can
be wrong is harder than fixing any single instance of it.
