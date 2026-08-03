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
