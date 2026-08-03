# TOKENS.md — the one true scale

**Status: APPROVED by Zak. Phase 3 running against this document.**

Decisions taken at approval:
- **Q-A → migrate all 602** `text-xs`/`text-sm` onto the ladder. Zero fixed font sizes remain.
- **Q-B → `rounded-2xl` (16px)** is the single card radius; the 231 `rounded-xl` uses migrate.
- **Q-C → still open.** The 4 reference links were not supplied. **C6 is unaudited** and is
  logged in OPEN ITEMS. Everything in this document derives from the existing codebase only.

Derived from (a) the *de facto* standard already in the codebase — the most-used existing
values, so the fix needs the fewest edits — and (b) the reference links, **which I do not
have yet** (see OPEN, bottom).

Guiding rule for every decision below: **pick the value the codebase already uses most, then
close the set.** Nothing here is invented taste; it is the existing app made consistent.

---

## 0. The one architectural fact that drives everything

Dark mode in this app is **CSS-variable swapping**, not Tailwind `dark:` variants.
`utils/themes.js → applyTheme()` rewrites variable *values* on `<html>`. Only 2 files in
the repo use a `dark:` variant at all.

**Therefore:** a component is dark-mode-correct **iff every colour it renders comes from a
`var(--token)`.** Any hardcoded `#hex` or literal `rgba(…)` is frozen at its light value and
is a dark-mode bug by construction. This replaces the "does it have a `dark:` variant" test.

---

## 1. Typography

### 1.1 Family — **one**

| Role | Value | Where declared |
|---|---|---|
| UI (everything) | `Poppins` via `next/font/google` | `app/layout.js:7-11` → `--font-poppins` → `globals.css:118`. **This is the only place a family may be declared.** |
| Numerals | Poppins + `font-variant-numeric: tabular-nums` | new `.numeric` utility |
| Code / IDs | `--font-mono` = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | new token |

**No second webfont.** Numeric column alignment is solved with `tabular-nums`, not a mono
typeface — this keeps the answer to *"which font is the official one"* a single word.

Removals: the stray `'Plus Jakarta Sans'` in `tableStyles.css:28` (never loaded);
the inline `'monospace'` in `stockAudit.js:201` → `--font-mono`.
The 57 files that re-declare `var(--font-poppins)` are redundant; they resolve correctly,
so they are **low severity** — cleaned where touched, not chased.

### 1.2 Size — the ladder

**The existing `@layer app` classes already form a correct ladder** (each role +1px from
the one below, ramping across the same 4 breakpoints). They are used **1,016 times** and are
right. The problem is the **425 places that bypass them** with arbitrary sizes, and the
**602 places** using fixed `text-xs`/`text-sm` that do not ramp with their neighbours.

**Decision: keep the ladder exactly as-is** (zero regression on 1,016 correct usages), add the
two rungs that are missing, delete the one duplicate, and migrate everything else onto it.

| Class | base | ≥1280 | ≥1536 | ≥1920 | Weight | Role |
|---|---|---|---|---|---|---|
| `.responsiveTextTableTitle` | 9 | 10 | 11 | 12 | 500 | `caption` — chips, badges, footnotes |
| `.responsiveTextTable` | 10 | 11 | 12 | 13 | 400 | `table-cell` — dense table body |
| `.responsiveText` | 11 | 12 | 13 | 14 | 400 | `body` |
| `.responsiveTextTotal` | 11 | 12 | 13 | 14 | 500 | `table-header`, totals rows |
| `.responsiveTextInput` | 12 | 13 | 14 | 15 | 400 | `label`, `button`, all control text |
| `.responsiveTextTitle` | 13 | 14 | 15 | 16 | 600 | `card-title`, `section-title` |
| `.responsiveTextPage` **NEW** | 16 | 17 | 18 | 20 | 600 | `page-title` |
| `.responsiveTextStat` **NEW** | 20 | 22 | 24 | 26 | 600 | `stat-number` (KPI figures) |

- **Delete** `.responsiveTextTable1` — byte-identical to `.responsiveTextTable`, 1 usage.
- **Closed set: 8 classes. No other font size may appear anywhere.**

### 1.3 What gets migrated — the 23 rogue sizes

Currently **23 distinct pixel sizes between 9px and 17px**, nine of them between 9 and 11.5px.
That is the *"uneven spell sizes"* complaint, measured:

```
9  9.28  9.6  9.92  10  10.24  10.4  10.51  10.88  11  11.2  11.5  11.52
12  12.48  12.8  13  13.2  13.6  14  15  16  17
```

Mapping (by base px, so text lands on the nearest existing rung):

| Current | Count | → Becomes |
|---|---|---|
| `text-[0.5625rem]` `text-[0.58rem]` `text-[0.6rem]` `text-[0.62rem]` | 36 | `.responsiveTextTableTitle` |
| `text-[0.625rem]` `text-[10px]` `text-[0.64rem]` `text-[0.65rem]` `text-[0.657rem]` `text-[0.68rem]` | 59 | `.responsiveTextTable` |
| `text-[0.6875rem]` `text-[11px]` `text-[0.7rem]` `text-[0.71875rem]` `text-[0.72rem]` | 115 | `.responsiveText` |
| `text-[0.75rem]` `text-[12px]` `text-[0.78rem]` `text-[0.8rem]` | 195 | `.responsiveTextInput` |
| `text-[0.8125rem]` `text-[0.825rem]` `text-[0.85rem]` `text-[0.875rem]` `text-[14px]` `text-[0.9375rem]` `text-[15px]` | 64 | `.responsiveTextTitle` |
| `text-[16px]` `text-[1rem]` `text-[1.0625rem]` | 6 | `.responsiveTextPage` |

### 1.4 `text-xs` / `text-sm` — **decision needed, see OPEN Q-A**

368 × `text-xs` (fixed 12px) and 234 × `text-sm` (fixed 14px). These do **not** ramp, so at
1920px a `text-xs` label sits at 12px next to a `.responsiveText` value at 14px — a visible
2px mismatch. This is a genuine, if second-order, source of the complaint.

### 1.5 Weight — closed set of 4

`400` normal · `500` medium · `600` semibold · `700` bold.
Retire `font-light` (4 uses) and `font-extrabold` (1 use). Always write the **class**
(`font-medium`), never the numeric `fontWeight: 500` — currently split 676 / 93.

### 1.6 Line height & tracking
`leading-tight` (1.25) for titles and stat numbers; `leading-normal` (1.5) for body;
table cells `line-height: 1.3` (already set on `.cashflow-detail-table`, generalise).
Tracking: default everywhere; `tracking-tight` permitted on `.responsiveTextStat` only.

---

## 2. Spacing — one scale

Already ~99% compliant (only 6 arbitrary paddings in the whole in-scope tree).
**Formalise what exists:**

`2 · 4 · 6 · 8 · 12 · 16 · 20 · 24 · 32 · 48` px
= Tailwind `0.5 · 1 · 1.5 · 2 · 3 · 4 · 5 · 6 · 8 · 12`

Nothing outside it. The 6 arbitrary paddings (`pt-[2px]`, `py-[1px]`, `pt-[72px]`,
`pt-[44px]`, `pt-[12vh]`) get mapped or justified.

Gaps: `gap-1` (4) · `gap-1.5` (6) · `gap-2` (8) · `gap-3` (12) · `gap-4` (16) · `gap-6` (24).

---

## 3. Radius — exactly 3

Current spread is 7 named values plus ~20 inline pixel radii.

| Token | Value | Applies to | Migrated from |
|---|---|---|---|
| `rounded-full` | pill | buttons, chips, badges, stat boxes, avatars, **single-line inputs & selects** | — (already 388, unchanged) |
| `rounded-lg` | 8px | textareas, multi-line controls, in-cell table inputs, file drop zones | `rounded-md` (76), `rounded-sm` (3) |
| `rounded-2xl` | 16px | cards, panels, modals, popovers, dropdown menus | `rounded-xl` (231) |

**Correction made during Batch 1.** The first draft assigned `rounded-lg` to all inputs. That
was wrong: `.input` is `rounded-full` at all 71 call sites and the pill input is the app's
established signature — it also means an input and the button beside it share a shape, which
*helps* the row read as deliberate. Single-line controls stay pills. Still 3 values.

`rounded-none` (9 uses) stays only where a cell abuts a table edge.
All inline `borderRadius:` values map onto these three.

**Note:** merging `rounded-xl` → `rounded-2xl` moves card corners 12px → 16px in 231 places.
This is the single most visible change in the whole audit. Flagged in OPEN Q-B.

---

## 4. Control heights — one height per size

Measured today: **24, 26, 28, 29.44, 29.76, 30, 32, 40 px** — inputs and buttons of
different heights sitting side by side. The dominant value is 28px (`h-7`, 126 uses).

| Size | Height | Radius | Text | Use |
|---|---|---|---|---|
| `sm` | 24px (`h-6`) | `rounded-lg` | `.responsiveTextTable` | inline table controls only |
| **`md` (default)** | **28px (`h-7`)** | `rounded-lg` inputs / `rounded-full` buttons | `.responsiveTextInput` | **every** input, select, datepicker, search box, secondary button |
| `lg` | 32px (`h-8`) | `rounded-lg` / `rounded-full` | `.responsiveTextInput` | primary page actions, modal footer buttons |

Applies to **every** `<input>`, `<select>`, datepicker, combobox, search box and button.

- `.input` in `globals.css:180` is currently `h-10` (40px) but is overridden to `h-7`/`h-8`
  at nearly every call site. **Change `.input` to `h-7` and delete the overrides** — fewer
  edits, and it removes the 40px outlier that no one actually wanted.
- `h-[26px]` (28), `h-[28px]` (23 — *identical to `h-7`*), `h-[32px]` (6 — *identical to
  `h-8`*), `h-[1.86rem]`, `h-[1.84rem]` all collapse into the three sizes above.

---

## 5. Surfaces — light + dark, all as variables

These **already exist** in `globals.css` and are themed by `utils/themes.js`. Formalising the
contract so nothing new bypasses it:

| Role | Token | Light | Dark |
|---|---|---|---|
| `background` | `--surface-base` | `#fafafa` | derived (hue-tinted, L 8%) |
| `surface` | `--surface-card` | `#ffffff` | derived (L 11%) |
| `surface-raised` | `--surface-header` | `#dbeeff` | derived (L 17%) |
| `surface-sunken` | `--surface-pill` | `#f8fbff` | derived (L 13%) |
| `border` | `--border-cell` | `#d8e8f5` | derived (L 24%) |
| `border-strong` | `--border-divider` | `#b8ddf8` | derived (L 30%) |
| `text-primary` | `--port-gore` | `#28264f` | derived (L 88%) |
| `text-secondary` | `--chathams-blue` | `#103a7a` | derived (L 72%) |
| `text-muted` | `--regent-gray` | `#838ca7` | derived (L 64%) |
| `accent` | `--endeavour` | `#0366ae` | derived, AA-fitted vs white |
| **`overlay` — NEW** | `--overlay` | `rgb(0 0 0 / 0.45)` | `rgb(0 0 0 / 0.60)` |
| **`shadow-color` — NEW** | `--shadow-rgb` | `16, 58, 122` | `0, 0, 0` |

### 5.1 The overlay decision — **decided once, identical everywhere**

Today there are **five** different treatments, which is exactly *"in dark mode, some places
with opacity, some without"*:

| Found | Where |
|---|---|
| `bg-black bg-opacity-25` | `components/modal.js:23` (Headless UI — **30 consumer files**) |
| `bg-black/40` | `components/ui/dialog.tsx:22` (Radix — 3 files) |
| `bg-black/25` | `components/idle.js:95` |
| `bg-[rgba(var(--surface-card-rgb),0.6)] backdrop-blur-[2px]` | `components/videoLoader.js:12` |
| **none at all** | `poInvModal`, `CommandPalette`, `DocumentImportOverlay`, `PdfPreview`, `SplitControl`, `ReminderModal`, `storagecosts/page`, `EditableSelectCell` |

**THE spec — one value, no exceptions:**

```css
background: var(--overlay);        /* rgb(0 0 0 / .45) light · rgb(0 0 0 / .60) dark */
backdrop-filter: blur(2px);
```

### 5.2 Shadows — 3 steps, themed

126 `shadow-lg` + 122 `shadow-sm` + 66 `shadow-md` + 27 `shadow-xl` + 17 `shadow-2xl`, plus
~30 inline `boxShadow` strings with hardcoded `rgba(0,0,0,…)` — invisible in dark mode.

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgb(var(--shadow-rgb) / .06)` | pills, inputs, chips |
| `--shadow-md` | `0 4px 12px rgb(var(--shadow-rgb) / .10)` | cards, dropdowns, popovers |
| `--shadow-lg` | `0 12px 40px rgb(var(--shadow-rgb) / .16)` | modals, command palette |

---

## 6. Modal / popup spec

Three competing systems today. **Consolidate on one wrapper**: `components/modal.js`
(Headless UI, already 30 consumers). `components/ui/dialog.tsx` (Radix, 3 consumers) stays
**only** as the primitive behind `components/ui/command.tsx`, restyled to match this spec
exactly. Every hand-rolled `fixed inset-0` panel adopts the wrapper.

| Property | Value |
|---|---|
| **Widths** | `sm` 28rem (448) · `md` 40rem (640) · `me` 56rem (896) · `lg` 72rem (1152) · `full` `calc(100vw - 2rem)` |
| **Panel** | `rounded-2xl`, `bg-[var(--surface-card)]`, `border border-[var(--border-cell)]`, `--shadow-lg` |
| **Header** | 40px tall, `bg-[var(--surface-header)]`, `.responsiveTextTitle` 600, `px-4 py-2.5`, bottom border `--border-divider`, `rounded-t-2xl` |
| **Body** | `p-4`, `max-h-[calc(100vh-12rem)]`, `overflow-y-auto custom-scroll` |
| **Footer** | `px-4 py-3`, top border `--border-divider`, buttons right-aligned, `gap-2`, `lg` height (32px) |
| **Close button** | top-right of header, 24×24 hit area, `--regent-gray` → `--endeavour` on hover |
| **Overlay** | §5.1 — `var(--overlay)` + `blur(2px)`. **No exceptions.** |
| **Animation** | overlay `fade 200ms ease-out`; panel `fade-zoom-in 200ms` (already in `tailwind.config.js:127`) |
| **Body scroll** | locked while open (Headless UI does this; hand-rolled ones currently do not) |
| **ESC / backdrop** | both close, unless the modal has unsaved edits |
| **Mobile (<640px)** | full-screen: `w-screen h-screen rounded-none`, header sticky |

### 6.1 z-index — closed ladder of 8

Today: **22 distinct values**, from `z-10` to `z-[100000]`, with `z-[9990]`, `z-[9998]`,
`z-[9999]`, `z-[10000]`, `z-[20000]`, `z-[100000]` all fighting each other.

| Token | Value | Layer |
|---|---|---|
| `--z-sticky` | 20 | sticky table headers, sticky toolbars |
| `--z-dropdown` | 40 | select menus, comboboxes, column filters |
| `--z-popover` | 50 | datepicker popups, tooltips-on-click, quick-sum |
| `--z-modal` | 100 | modal overlay (panel 101) |
| `--z-modal-nested` | 200 | a modal opened *from* a modal (panel 201) |
| `--z-toast` | 300 | toasts, notification popups |
| `--z-tooltip` | 400 | hover tooltips (must clear modals) |
| `--z-command` | 500 | command palette, full-screen PDF/document viewers |

---

## 7. States — required on every interactive element

| State | Spec |
|---|---|
| hover | buttons `opacity-90`; rows `bg-[var(--surface-header)]`; links `text-[var(--endeavour)]` |
| focus | `outline: 2px solid var(--endeavour); outline-offset: 1px` — **visible in both modes** |
| active | `scale-[0.98]`, 100ms |
| disabled | `opacity-50 cursor-not-allowed`, no hover |
| loading | `.skel` shimmer (exists, `globals.css:272`) — never a bare spinner on a data table |
| empty | centred icon + `.responsiveText` muted line + optional action |
| error | `--danger-*` tokens, never raw red |

---

## 8. What "done" means — the corrected verification gates

The gates in `DESIGN_AUDIT_TASK.md` §Phase 4 need two corrections to be achievable and
meaningful on **this** codebase:

| Task file gate | Problem | Corrected gate |
|---|---|---|
| `rg "text-\[[^\]]+\]"` → 0 | Tailwind overloads `text-`. This also matches `text-[var(--endeavour)]`, which is 1,015 **correct, themed colour** usages. Zeroing it would mean deleting the theme. | `text-\[[0-9]` → 0 (arbitrary **sizes** only) |
| `rg "#hex\|rgba?\("` → 0 | `globals.css` and `utils/themes.js` are *where colours belong*; export/PDF/Excel colour is legitimately unthemed. | → 0 **outside** `globals.css`, `utils/themes.js`, `*/excel.js`, `*/pdf*.js`, `chartTheme.js` |
| "components with no `dark:` variant" | Wrong test — this app themes by variable swap, not `dark:`. Only 2 files use `dark:`. | → 0 hardcoded colours in in-scope render paths (same as above) |
| `rg "font-family\|fontFamily"` → 0 | `fontFamily: 'inherit'` on inputs is correct and needed. | → declared in **one** place; `'inherit'` allowed |

Unchanged and kept: `rounded-\[`, `p-\[`, `h-\[`, `gap-\[` → 0. `npm run build` clean.
`npm run lint` no new errors.

---

## OPEN — needs Zak before Phase 3 starts

**Q-A · `text-xs` / `text-sm` (602 uses).** They are fixed-size, so they drift from their
ramping neighbours by up to 2px at 1920px. Options: (1) migrate all 602 onto the ladder —
most correct, biggest diff; (2) redefine `text-xs`/`text-sm` in `@layer app` to ramp in
lockstep — one edit, fixes all 602, but silently changes two Tailwind built-ins; (3) leave
them, accept ≤2px drift on large screens only. **My recommendation: (1)**, done module by
module so each batch is reviewable.

**Q-B · `rounded-xl` → `rounded-2xl` (231 uses).** Card corners move 12px → 16px. It is the
most visible single change here. Confirm you want one card radius, or I keep `xl` for cards
and retire `2xl` instead (equally consistent, 264 edits instead of 231, slightly tighter look).

**Q-C · The 4 reference links.** Still not received. §C6 (density, spacing rhythm, shadow
depth, colour temperature vs the references) **cannot be audited** without them. Everything
in this document is derived from the existing codebase only. If the references imply a
different type scale or radius, this file changes and the Phase-3 sweep must be re-run —
so getting them **before** approval saves the most work.
