# DESIGN_AUDIT_TASK.md

> **How to run this:** put this file in the project root, then in Claude Code type:
> `Read DESIGN_AUDIT_TASK.md and execute it from Phase 0. Do not skip phases.`
> If the session runs out of context, start a new one with:
> `Read DESIGN_AUDIT_TASK.md and design-audit/INVENTORY.md, then continue from the first unchecked file.`

---

## ROLE

You are the senior frontend engineer taking ownership of the **entire UI layer** of this Next.js project. A paying client has raised the same design complaints **multiple times over several weeks**. Each previous round was reported as "fixed" and the client still found problems. That pattern must not repeat.

Your job is not to make things look better in a few places. Your job is to make the UI **provably consistent across every single file**, and to produce evidence for it.

---

## RULE ZERO — NO PARTIAL WORK

These rules override everything else. Read them twice.

1. **No sampling.** Do not audit "representative" or "the main" components. Every file that produces UI gets opened and checked. If there are 300 files, the inventory has 300 rows.
2. **No claiming done without evidence.** A category is only closed when the verification command for it returns **zero results**, and you paste that command output into the report. "I checked and it looks fine" is not evidence.
3. **No silent skips.** If you cannot fix something (needs a design decision, needs an asset, would break logic), it goes in the **OPEN ITEMS** section with a reason. Never leave it out.
4. **Track progress in files, not in your head.** `design-audit/INVENTORY.md` is the source of truth for what has been audited. Update it after every batch so the work survives a context reset.
5. **Visual only.** Do not change business logic, data fetching, routing, or state. If a visual fix requires a logic change, flag it in OPEN ITEMS and ask first.
6. **Commit per batch** with a clear message (`design: normalize card padding in stocks module`). Never one giant commit.
7. **Report honest counts.** Every status update includes `X of Y files audited, N issues found, M fixed, K open`.

---

## PHASE 0 — QUESTIONS BEFORE YOU TOUCH ANYTHING

Stop and ask me these. Do not start until you have answers:

1. **The 4 reference links** I shared for the style direction — paste them back to me and confirm you can open them. If you cannot open them, ask me for screenshots.
2. **The canonical font** — which font family is the official one for this product? If unknown, list every font currently used in the codebase with the count of files using each, and recommend one.
3. **Existing tokens** — report whether this project has a real design token layer (`tailwind.config`, CSS variables in `globals.css`, shadcn theme) and whether it is actually used or bypassed.
4. **Scope of pages** — list every route in `app/` and confirm with me which ones are live/in-scope.

---

## PHASE 1 — FULL INVENTORY (evidence gathering, no fixes yet)

### 1.1 Enumerate every UI file

Include: `app/**`, `components/**`, `contexts/**`, `hooks/**`, `lib/**`, `mobile/**`, `utils/**`, `tasks/**`, plus `globals.css`, any `*.css`/`*.module.css`, `tailwind.config.*`, `components.json`, `next.config.mjs`, root `layout.js`.

Exclude only: `node_modules`, `.next`, `backups`, `tests`, `__tests__`.

Write **`design-audit/INVENTORY.md`** — one row per file:

```
| # | File path | Type (page/layout/component/modal/hook/style) | Audited | Issues found |
|---|-----------|----------------------------------------------|---------|--------------|
| 1 | app/(root)/stocks/whModal.js | modal | [ ] | - |
```

Print the total file count. That number is `Y`. Every later status update refers to it.

### 1.2 Extract the raw evidence

Run these and save the raw output to `design-audit/RAW_SCAN.md`. This is objective data — it removes all guessing about what is inconsistent.

```bash
# Every font size in use, with frequency
rg -o "text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl)\b" app components mobile -g '!node_modules' | sort | uniq -c | sort -rn

# Arbitrary/one-off font sizes — these are the "uneven sizes" the client sees
rg -n "text-\[[^\]]+\]" app components mobile -g '!node_modules'

# Hardcoded colors that bypass the theme — root cause of dark-mode inconsistency
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(" app components mobile -g '!node_modules' -g '!*.svg'

# Transparency/opacity backgrounds — some surfaces have it, some don't
rg -n "bg-(black|white|slate|gray|zinc|neutral)/[0-9]+|backdrop-blur|opacity-[0-9]+|/[0-9]{1,3}\]" app components mobile

# Font families declared ad hoc
rg -n "font-family|fontFamily|font-\[|next/font" app components mobile lib

# Box geometry: radius, padding, height, border, gap
rg -o "rounded-(none|sm|md|lg|xl|2xl|3xl|full)\b" app components mobile | sort | uniq -c | sort -rn
rg -n "rounded-\[|p-\[|px-\[|py-\[|h-\[|w-\[|gap-\[|min-h-\[|max-w-\[" app components mobile
rg -o "\bp-[0-9]+|\bpx-[0-9]+|\bpy-[0-9]+" app components mobile | sort | uniq -c | sort -rn

# z-index chaos (popups appearing behind/above wrongly)
rg -n "z-[0-9]+|z-\[" app components mobile

# Every modal / dialog / popup / drawer / toast in the project
rg -l -i "modal|dialog|popup|drawer|sheet|toast|tooltip|popover" app components mobile

# Dark mode usage — find components with NO dark: variant at all
rg -L "dark:" --files-with-matches=false app components mobile -g '*.js' -g '*.jsx' -g '*.tsx'
```

**Do not interpret yet.** Just collect. The frequency tables tell us what the *de facto* standard already is.

---

## PHASE 2 — DEFINE THE ONE TRUE SCALE

Write **`design-audit/TOKENS.md`**. Derive it from (a) the reference links I gave you, and (b) the most-used existing values from Phase 1 — so the fix requires the fewest edits.

Define exactly, with no "etc.":

- **Typography:** one font family (+ optional mono for numbers/tables). A closed set of roles → exact size/weight/line-height/tracking: `page-title`, `section-title`, `card-title`, `body`, `label`, `caption`, `table-header`, `table-cell`, `button`, `stat-number`.
- **Spacing:** one scale (e.g. 4/8/12/16/24/32/48). Nothing outside it.
- **Radius:** max 3 values (e.g. `sm` inputs, `md` cards, `full` pills). Nothing else.
- **Control heights:** one height for inputs, one for buttons per size, applied to *every* input, select, date picker, search box, button.
- **Surfaces (light + dark, as CSS variables):** `background`, `surface`, `surface-raised`, `border`, `text-primary`, `text-muted`, `overlay`. **Decide once** whether modal overlays use transparency, and the exact value (e.g. `overlay = rgb(0 0 0 / 0.55)` + blur or no blur) — this must be identical everywhere.
- **Modal/popup spec:** widths per size (sm/md/lg), padding, header/body/footer structure, close button position, overlay, z-index layer, scroll behavior, mobile behavior.

**Stop here and show me TOKENS.md for approval before mass edits.** One approval, then you run.

---

## PHASE 3 — AUDIT + FIX, IN BATCHES

Work in this order (dependencies first, so fixes cascade):

1. `globals.css` / `tailwind.config` / theme variables / font loading in root layout
2. Shared UI primitives (button, input, select, card, badge, table, modal wrapper)
3. Shared layout (sidebar, navbar, headers, footers)
4. Modals / popups / drawers / toasts — **all of them, one by one**
5. Feature modules, route by route (stocks, contracts, invoices, storage costs, dashboard, …)
6. Mobile views
7. Empty states, loading skeletons, error states, disabled states, hover/focus states

For **every file**: open it, check it against every category below, log findings, fix, tick the inventory box, move on.

### Audit categories — mapped to what the client actually said

| ID | Client's words | What to look for |
|----|----------------|------------------|
| **C1** | *"problems with fonts"* | More than one font family; missing/incorrect `next/font` loading causing flash; inconsistent weights for the same role; system-font fallback leaking; different fonts between web and mobile views |
| **C2** | *"uneven spell sizes"* (text sizes) | Same-role elements at different sizes (two card titles, two table headers, two labels); arbitrary `text-[13px]`; inconsistent line-height causing rows of different height; inconsistent letter case/truncation |
| **C3** | *"uneven box sizes"* | Cards in the same grid with different heights/padding/radius/border; inputs and buttons of different heights sitting side by side; inconsistent grid gaps; misaligned table columns; content overflowing containers; different max-widths for the same kind of page |
| **C4** | *"in dark mode, some places with opacity, some without"* | Hardcoded hex/rgb instead of theme variables; surfaces that are solid in one place and semi-transparent in another; borders invisible in dark; text/badges failing contrast; hover states that disappear; scrollbars, shadows and dividers not themed; **any component with no `dark:` handling at all** |
| **C5** | *"boxes popup"* (modals) | Every modal against the Phase-2 spec: width, padding, header/footer, close button, overlay opacity, blur, z-index stacking, body-scroll lock, ESC/backdrop close, mobile full-screen behavior, animation timing |
| **C6** | *"the 4 links of the style I want"* | Compare layout density, spacing rhythm, corner radius, shadow depth, color temperature and type scale against the references. List concrete gaps. |

Log every finding in **`design-audit/FINDINGS.md`**:

```
| ID | Category | File:line | What's wrong | Correct value | Severity | Status |
|----|----------|-----------|--------------|---------------|----------|--------|
| 001| C3 | app/(root)/stocks/whModal.js:42 | Modal uses max-w-[680px], others use max-w-2xl | modal-md (640px) | High | Fixed |
```

After each batch: update INVENTORY, run `npm run build` and `npm run lint`, confirm zero new errors, commit.

---

## PHASE 4 — VERIFICATION (this is the part that was skipped before)

Do not write the report until all of this passes. Paste the actual command output as proof.

**Automated gates — each must return zero results:**

```bash
rg -n "text-\[[^\]]+\]" app components mobile          # no arbitrary font sizes
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(" app components mobile -g '!*.svg'   # no hardcoded colors
rg -n "rounded-\[|p-\[|h-\[|gap-\[" app components mobile               # no arbitrary geometry
rg -n "font-family|fontFamily" app components mobile                     # font declared in one place only
```

Plus: `npm run build` clean, `npm run lint` clean, zero console errors on every route.

**Manual gates — checklist per route, in BOTH light and dark, at 1440px / 1024px / 768px / 390px:**

- [ ] Every heading of the same level is the same size and weight
- [ ] Every input, select and button in the same row has the same height and radius
- [ ] Cards in the same grid are the same height and padding
- [ ] Every modal opened and compared side by side — same overlay, same padding, same header, same close button
- [ ] Table headers and cells uniform; numbers aligned; no column jump on load
- [ ] Dark mode: no washed-out or fully-transparent surface, every border visible, all text readable
- [ ] Hover, focus, active, disabled, loading, empty and error states all styled
- [ ] No horizontal scroll, no clipped text, no overlapping elements at any breakpoint

Take screenshots of every route in both themes into `design-audit/screenshots/` if the environment allows.

---

## PHASE 5 — THE REPORT

Write **`design-audit/REPORT.md`** in plain language, addressed to a client (short sentences, no jargon):

1. **Complaint traceability table** — one row per complaint C1–C6: *what was wrong → how many places → what was changed → status*.
2. **Numbers:** files audited (X of Y), issues found, issues fixed, issues open.
3. **What changed structurally** — the token system, and why this stops the problem coming back.
4. **OPEN ITEMS** — anything not fixed, with the reason and what you need from me to close it. Be honest here; a short honest list is better than a false "100%".
5. **Verification evidence** — the passing command outputs and the screenshot list.

---

## FINAL INSTRUCTION

Before you tell me it's finished, ask yourself: *"If the client opens every page in dark mode and on a phone right now, will they find anything?"*

If the answer is anything other than a confident no, go back to Phase 3. **Do not report completion at 90%.**
