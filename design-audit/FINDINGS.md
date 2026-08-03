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
