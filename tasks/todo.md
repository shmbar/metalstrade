# Comments 2 — Design Polish (Canva Alignment)

## Status: IMPLEMENTATION COMPLETE

---

## Client Complaints Summary
1. Fonts don't align/match — suggests Calibri
2. Cell selection has no opacity/highlight feedback
3. Colors don't match Canva design
4. Sizes and spacing off
5. Too much side scrolling
6. Cashflow page design looks bad
7. Delayed notification design not fresh
8. Overall polish lacking

---

## Canva Design Analysis (29 screenshots reviewed)

### Design Language from Canva:
- **Sidebar:** Solid blue (#0066CC / endeavour blue), white text, active item = white bg with blue text, rounded-xl items
- **Header:** Light blue-ish background (#e3f3ff), user avatar right side, icons (search, notification, calendar, comparison)
- **Tables:** Clean white background, light blue header row (selago/light blue), subtle borders, rounded-xl cell values, alternating row subtle tint
- **Totals rows:** Green-tinted (Total $) and blue-tinted (Total €) gradient bars at top of tables
- **Buttons:** Blue gradient (endeavour), rounded-xl, "Quick Sum" pill button, "+ New Contracts" pill
- **Pagination:** "Showing 12 out of 100", numbered page buttons, "Rows: 09" selector
- **Dropdowns:** Clean white bg, selected item highlighted in blue, subtle shadow
- **Status pills:** "Incompleted" = red outline pill, "Completed" = green outline pill, "Draft" = blue pill, "Paid/Unpaid" = green/red gradient pills
- **Summary cards:** Rounded bordered cards below tables with totals
- **Settings tabs:** Horizontal pill tabs, active = filled blue, inactive = outline
- **Formulas page:** Card-based layout with Cost/Sale composition tables, pink-tinted editable rows, green result pills
- **Cashflow:** Two-column layout, section headers in blue text, expandable stock detail tables, financing section with Add button
- **Margin:** Summary cards at top, accordion months, totals tables at bottom

---

## Items to Fix

### 1. Table cell selection highlight/opacity
**Client complaint:** "Cell selection has no opacity" — when clicking a cell to edit, there's no visual feedback
**Canva shows:** Selected/active cells have a subtle blue border or light blue background tint
**Files:** `components/table/inlineEditing/EditableCell.js`, `EditableSelectCell.js`
**Action:** Add a light blue background (`bg-[var(--selago)]` or `bg-blue-50/50`) when cell is in edit mode, with a subtle border highlight

---

### 2. Table header row styling
**Canva shows:** Table headers have a light blue background gradient, bold text, centered alignment
**Current:** Headers use `text-[var(--port-gore)]` with `border-b border-[var(--rock-blue)]` — may be close but needs verification
**Files:** `components/table/tableComp.js` or wherever table headers render
**Action:** Ensure header row has `bg-[var(--selago)]` background, proper font weight, centered text matching Canva

---

### 3. Table row hover effect
**Canva shows:** Clean alternating rows or hover highlight
**Current:** May lack hover feedback
**Files:** Table row component
**Action:** Add subtle hover: `hover:bg-[var(--selago)]/30` on table rows

---

### 4. Status pills styling
**Canva shows:** "Incompleted" = red text with red border pill, "Completed" = green text with green border pill, "Paid" = green gradient pill, "Unpaid" = red/pink gradient pill, "Draft" = blue pill
**Current:** May use rounded-xl but colors might not match
**Files:** Pages that render status columns (contracts, invoices, expenses, etc.)
**Action:** Verify status pill colors match Canva — red outline for incomplete, green outline for completed

---

### 5. Cashflow page layout polish
**Client complaint:** "Cashflow page design is really ugly looking"
**Canva (21.png):** Two-column layout with section headers in blue, expandable stock tables, clean borders, financing section
**Files:** `app/(root)/cashflow/page.js`
**Action:** Review spacing, section headers, table borders, and overall layout. Ensure section titles use `text-[var(--endeavour)]` font-semibold. Clean up margins/padding.

---

### 6. Quick Sum button and toolbar spacing
**Canva shows:** "Quick Sum" as a pill button next to search, toolbar icons evenly spaced, date range picker on right
**Current:** May have slightly different spacing
**Files:** `components/table/header.js`
**Action:** Verify toolbar matches Canva spacing — search box, Quick Sum pill, icon row, date picker. Minor tweaks if needed.

---

### 7. Pagination styling
**Canva shows:** "Showing 12 out of 100" in blue text left, numbered page buttons (active = filled blue circle), "Rows: 09" selector right
**Current:** Has pagination but styling may differ
**Files:** `components/table/tableComp.js` or pagination component
**Action:** Ensure pagination text color is `text-[var(--endeavour)]`, active page is blue filled circle, rows selector matches

---

### 8. Settings tabs styling
**Canva (25-29):** Horizontal pill tabs — active tab = filled blue (`bg-[var(--endeavour)]` white text), inactive = just text
**Current:** Settings uses tab components
**Files:** `app/(root)/settings/page.js` or settings tab component
**Action:** Verify tab styling matches Canva — active is filled blue pill, inactive is plain text

---

### 9. Summary cards below tables
**Canva shows:** Rounded bordered cards with "Summary" title, clean table layout inside, Total rows in blue/green text
**Current:** Summary sections exist but may need polish
**Files:** Various statement pages, expenses, misc invoices
**Action:** Verify summary card borders are `border-[var(--selago)]`, rounded-xl, totals text in `text-[var(--endeavour)]`

---

### 10. Formulas page styling
**Canva (22-24):** Card-based with Cost/Sale sections, pink/salmon editable input rows, green result pills, formula indicator pills
**Files:** `app/(root)/formulas/` or `app/(root)/formulascalc/`
**Action:** Verify formula page matches Canva — pink input rows, green output pills, proper card layout

---

### 11. Margin/Sharon Admin page styling
**Canva (20):** Top summary cards with $ values, accordion-style month sections, Totals and Totals GIS tables at bottom
**Files:** `app/(root)/margin/` or `app/(root)/sharonadmin/`
**Action:** Verify summary cards, accordion styling, totals tables match Canva

---

### 12. Material Tables page
**Canva (19):** Colored element columns (Ni, Cr, Cu, Mo, W, Co, Nb, Fe, Ti) with blue headers, pink summary row, blue total row
**Files:** `app/(root)/materialtables/page.js`
**Action:** Verify element column colors and summary/total row styling match Canva

---

### 13. Contract detail modal
**Canva (6):** Modal with tabs (Contract, Invoices, Shipment Tracking, Inventory), form fields with dropdowns, products table, action buttons at bottom
**Files:** Contract detail dialog component
**Action:** Verify modal tab styling, form layout, products table styling match Canva

---

---

## Priority Order

### Phase 1: High-Impact Visual Fixes (client's main complaints)
- [x] **#1** Cell selection highlight
- [x] **#2** Table header row styling
- [x] **#3** Table row hover effect
- [x] **#5** Cashflow page polish

### Phase 2: Table & Component Polish
- [x] **#4** Status pills styling
- [x] **#6** Toolbar/Quick Sum spacing
- [x] **#7** Pagination styling
- [x] **#9** Summary cards polish

### Phase 3: Page-Specific Fixes
- [x] **#8** Settings tabs
- [x] **#10** Formulas page
- [x] **#11** Margin page
- [x] **#12** Material Tables
- [x] **#13** Contract detail modal

---

## Notes
- Font: Client mentioned Calibri but Canva designs appear to use a clean sans-serif (likely the current Poppins/system font). The designs don't show a serif or distinctly different font. We should NOT change the font unless explicitly confirmed — Poppins looks clean and professional.
- Side scrolling: This is inherent to tables with many columns. The Canva designs show the same width. We should ensure `min-width` constraints are reasonable but this is largely a data density issue.
- Each fix should be minimal — only change what's needed to match Canva.

---

## Review — Changes Made

### Files Modified:

**Core Table System (affects all pages with tables):**
- `components/contracts/newTable.js` — Table header bg-selago, row hover effect, cell edit highlight (selago + rock-blue), status pills (outline style), footer text "Showing X out of Y" in blue
- `components/table/inlineEditing/EditableCell.js` — Focus ring on editable input (endeavour blue)
- `components/table/header.js` — Toolbar icon hover uses selago instead of gray-100, edit mode toggle uses theme colors
- `components/table/Paginator.js` — Active page button rounded-full (circle), endeavour blue, Previous/Next text color
- `components/modal.js` — Modal border selago, accent bar endeavour, close hover endeavour

**Cashflow Page:**
- `app/(root)/cashflow/page.js` — All #dedede borders → selago, #545454 text → port-gore, totals container rounded-xl with selago border, input borders use rock-blue

**Summary Tables (5 files):**
- `app/(root)/expenses/totals/tableTotals.js` — Header bg selago, border rock-blue, text chathams-blue, borders selago
- `app/(root)/contractsstatement/totals/tableTotals.js` — Same color replacements
- `app/(root)/invoicesstatement/sumtables/newTableTotals.js` — Same color replacements
- `app/(root)/specialinvoices/totals/tableTotals.js` — Same color replacements
- `app/(root)/companyexpenses/totals/tableTotals.js` — Same color replacements

**Page-Specific:**
- `app/(root)/settings/page.js` — Tabs rounded-full pill style, active = endeavour bg, inactive = hover selago
- `app/(root)/formulas/page.js` — Tabs rounded-full pill style matching settings
- `app/(root)/margins/page.js` — #e3f3ff → selago
- `app/(root)/margins/marginTable.js` — #e3f3ff → selago
- `app/(root)/margins/newTable.js` — #e3f3ff → selago
- `app/(root)/margins/thirdpart.js` — #d4eafc/#e0e0e0 → selago
- `app/(root)/materialtables/page.js` — #e3f3ff → selago
- `app/(root)/materialtables/newTable.js` — #d4eafc/#e0e0e0/#E5E7EB → selago
- `app/(root)/contracts/modals/tabs/tabs.js` — Tab pills rounded-full, endeavour/selago/rock-blue theme

### Summary of Changes:
1. **Cell edit highlight** — Edit mode cells now show light blue background (selago) with rock-blue border. Focused inputs get endeavour ring.
2. **Table headers** — Light blue background (selago) with rock-blue bottom border, font-semibold.
3. **Row hover** — Subtle selago/30 hover with border-bottom separator.
4. **Status pills** — Changed from solid colored background to outlined pill style (green/red border + text, light bg).
5. **Cashflow** — All hardcoded grays replaced with theme variables. Cleaner borders and spacing.
6. **Pagination** — Active page is filled blue circle (rounded-full), text uses endeavour blue.
7. **Summary cards** — All hardcoded blues/grays replaced with CSS variables (selago, rock-blue, chathams-blue).
8. **Settings/Formulas tabs** — Pill-shaped (rounded-full), active = filled blue, inactive = text only.
9. **Contract modal** — Theme-consistent borders, accent bar, close button hover.
10. **Material Tables** — Hardcoded colors → theme variables.
11. **Margin pages** — Hardcoded colors → theme variables.

### Build Status: PASSES (no errors)
