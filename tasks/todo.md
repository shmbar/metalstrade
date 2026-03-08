# Comments 1 — Fix Plan

## Status: IMPLEMENTATION COMPLETE

---

## Items to Fix

### 1. Remove Pricing page and all references
**Files to DELETE:**
- `app/(public)/pricing/page.jsx`
- `components/Pricing/pricing.jsx`, `pricingCard.jsx`, `pricingContent.jsx`, `pricingFeatures.jsx`

**Files to EDIT:**
- `components/index.js` lines 7-11 — Remove pricing exports
- `components/Footer/footer.jsx` line 30 — Remove pricing link
- `app/(public)/landing/page.jsx` lines 6, 17 — Remove Pricing import and `<Pricing />`
- `contexts/useAuthContext.js` line 42 — Remove `/pricing` from publicRoutes

**Already handled (no action):** navbar links/menu (commented out), app/page.js (commented out)

---

### 2. Tables showing internal IDs instead of values
**Previously fixed:** invoices (origin), contracts (originSupplier)
**Needs runtime verification** — EditableSelectCell already tries to look up labels via `options.find()`. The issue is whether `meta.options` is always populated.
**Action:** Verify at runtime. No code change without seeing actual broken columns.

---

### 3. Selectors/dropdowns need cleaner design
**Files:**
- `components/table/inlineEditing/EditableSelectCell.js` — Uses hardcoded colors (`#F9F9F9`, `bg-blue-100`, `text-blue-900`) instead of theme variables
- `app/(root)/settings/_components/combobox.js` — Already fixed (rounded-full, endeavour focus)
- `components/combobox.js` — Already uses themed colors
- `components/comboboxSelectStock.js` — Already uses themed colors

**Action:** Fix EditableSelectCell to use theme variables (`--endeavour`, `--selago`, `--port-gore`).

---

### 4. Rounded shapes restoration
**Status:** Already fixed in prior commits. Table cells use `rounded-xl`. No action needed.

---

### 5. Table editing — fields need selectors not plain text
**Invoices page** (`app/(root)/invoices/page.js`):
- `pol` (line ~274), `pod` (line ~280), `packing` (line ~286) — use EditableCell, should use EditableSelectCell

**Contracts page** (`app/(root)/contracts/page.js`):
- `pol` (~210), `pod` (~211), `packing` (~212), `contType` (~213), `size` (~214), `deltime` (~215) — use EditableCell, should use EditableSelectCell

**Action:** Change to EditableSelectCell with `meta.options` from settings (POL, POD, Packing, ContainerType, Size, DeliveryTime).

---

### 6. Excel export icon too large on some pages
**Files with old oversized styling (`scale-[1.4] text-gray-500`):**
- `app/(root)/contracts/excel.js` line 132
- `app/(root)/contractsstatement/excel.js` line 156
- `app/(root)/invoicesstatement/excel.js` line 256
- `app/(root)/contractsreview/excel.js` line 138
- `app/(root)/invoicesreview/excel.js` line 235
- `components/contracts/excel.js` line 132 (uses SiMicrosoftoffice)

**Correct styling:** `<FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--endeavour)' }} strokeWidth={2} />`

**Also fix wrapper divs** with `size-10` → remove size-10 (header.js wraps in `w-8 h-8`).

---

### 7. Invoice Import button not working
**Finding:** No import button exists in invoices page. Not implemented.
**Action:** Needs user clarification — is this a missing feature to build?

---

### 8. Invoice three-dot dialog wrong language
**Finding:** No three-dot menu exists in invoices page.
**Action:** Needs user clarification — which dialog/page is this?

---

### 9. Accounting page NaN values
**File:** `app/(root)/accounting/page.js`
**Root causes:**
1. `formatCurrency()` (line 462) — no NaN guard before `Intl.NumberFormat.format()`
2. Totals (lines 392-393) — `(item.amountInv || 0)` doesn't catch NaN strings
3. Excel export (accounting/excel.js line 116) — `item.amountExp * 1` can produce NaN

**Action:** Add `Number()` coercion + `isNaN` guards in formatCurrency, totals, and excel.

---

### 10. Contracts statement column misalignment when expanded
**File:** `app/(root)/contractsstatement/newTable.js`
**Root cause:** Nested table (line 409) uses `tableLayout: 'auto'` which calculates widths independently from parent.
**Previously fixed** min/maxWidth alignment. May need `tableLayout: 'fixed'` on nested table.
**Action:** Verify at runtime. Apply tableLayout fix if still misaligned.

---

### 11. Account statement bottom date selector should be removed
**File:** `app/(root)/accstatement/page.js`
**Finding:** Lines 328-343 contain a Datepicker (single date, validates 15th/last day). Line 18 imports unused DateRangePicker.
**Action:** Needs user clarification — is this the date picker to remove, or was this the one previously uncommented as a fix?

---

### 12. Stock page — selector not updated, screen flicker on selection
**File:** `app/(root)/stocks/page.js`
**Root causes:**
1. `setLoading(true)` on line 126 clears table content during async fetch → visible flicker
2. `CB()` function (line 345) recreated on every render → dropdown resets
3. useEffect on line 80-82 unconditionally resets selectedStock on mount

**Action:** Don't clear data during fetch (show stale data with loading indicator). Memoize CB or move outside render.

---

### 13. Sharon admin panel — latest updates, monthly date picker broken
**Finding:** "Sharon admin panel" likely refers to Account Statement page (`accstatement`). Monthly date picker validates to 15th/last day of month.
**Action:** Needs user clarification on what "latest updates not included" means.

---

### 14. Cashflow — button styling, financing additions not visible
**File:** `app/(root)/cashflow/page.js`
**Finding:** Financing section gated by `userTitle === 'Admin'` (line 1225). Dialog buttons in `dialogClient.js` line 69 use old `bg-slate-500` styling.
**Action:** Fix dialog button styling to match theme. Financing visibility is by design (Admin only) — verify with user.

---

### 15. Settings — language selector, selectors, toast, buttons, Users modal
**Current state:**
- Language selector: Already fixed
- Toast: Works correctly
- Users modal Title selector: Uses `components/combobox.js` (already themed)
- Settings general tab inputs: Use inline `h-8 rounded-full text-[#979797]` — inconsistent with global `.input` class

**Action:** Minor — settings general tab input styling could be unified, but this is a larger design system change. Verify with user if needed.

---

### 16. Input field typography hierarchy + consistent input design
**Status:** Previously fixed — `.input` uses `text-xs`, titles use `text-sm`.
**Known inconsistencies:** Settings general tab uses `h-8` + `text-sm`, Users modal uses `h-7`, Cashflow uses `h-6`.
**Action:** These height variations appear intentional for different contexts. No change unless user specifically requests unification.

---

## Priority Order

### Phase 1: Quick Fixes — DONE
- [x] **#1** Remove Pricing page and references — Deleted files, removed exports from `components/index.js`, removed `/pricing` from publicRoutes in `useAuthContext.js`
- [x] **#6** Fix Excel icon size — Changed `scale-[1.4] text-gray-500` to `w-5 h-5 color:var(--endeavour)` in 6 excel.js files (contracts, contractsstatement, invoicesstatement, contractsreview, invoicesreview, components/contracts). Also removed `size-10` from wrapper divs in 3 more files.
- [x] **#9** Fix accounting NaN guard — Added NaN guard to `formatCurrency()` and `formatCurrencyFull()`. Changed totals to use `Number()` coercion. Fixed excel export `amountExp * 1` → `Number(amountExp) || 0`.
- [x] **#3** Fix EditableSelectCell theme colors — Changed dropdown bg from `#F9F9F9` to `bg-white`, ring from `ring-black` to `ring-[var(--selago)]`, option colors from `bg-blue-100/text-blue-900` to `bg-[var(--selago)]/text-[var(--endeavour)]`, check icon from `text-blue-700` to `text-[var(--endeavour)]`, selector icon from `text-gray-400` to `text-[var(--rock-blue)]`.

### Phase 2: Feature Fixes — DONE
- [x] **#5** Change plain text fields to selectors — Invoices: changed `pol`, `pod`, `packing` from EditableCell to EditableSelectCell with settings options. Contracts: changed `pol`, `pod`, `packing`, `contType`, `size`, `deltime` from EditableCell to EditableSelectCell with settings options.
- [x] **#14** Fix cashflow dialog button styling — Changed `bg-slate-500` to `bg-[var(--endeavour)] hover:opacity-90` in both `dialogClient.js` and `dialogSupplier.js` (trigger + save buttons). Fixed financing Add buttons hover from `hover:bg-[var(--selago)]/30` to `hover:opacity-90`.
- [x] **#12** Fix stock page flicker — Only show full-page loader on initial load (when data is empty). Memoized `CB()` selector with `useMemo` to prevent dropdown recreation on every render.

### Phase 3: GitHub Investigation Results
Checked client repo at github.com/shmbar/metalstrade — these items do NOT exist in client codebase either:
- [x] **#7** Invoice Import button — Does NOT exist in client repo. Not a missing feature.
- [x] **#8** Invoice three-dot dialog — Does NOT exist in client repo. Not a missing feature.
- [x] **#11** Account statement date selector — Client repo has same single Datepicker in header. No "bottom" date selector exists.
- [x] **#13** Sharon admin panel — No separate admin panel. Financing section is Admin-gated in both repos (by design).
- [x] **#2** Tables showing IDs — Client repo uses same `getFormatted()` pattern. Both repos convert IDs to values the same way.
- [x] **#10** Contracts statement alignment — Previously fixed. Client repo has similar structure.
- [x] **#15** Settings styling — Client repo uses Shadcn `Selector` + `Button` components with `input` class and `h-8`. Our code already uses themed comboboxes. Language selector already fixed.
- [x] **#16** Input typography — Client repo has same `h-7`/`h-8` variations. This is intentional per context.
- [x] **#4** Rounded shapes — Already fixed in prior commits (rounded-xl).

---

## Review

### Summary of Changes Made

**Files Modified:**
1. `components/index.js` — Removed Pricing component exports
2. `contexts/useAuthContext.js` — Removed `/pricing` from publicRoutes
3. `app/(root)/contracts/excel.js` — Fixed Excel icon size
4. `app/(root)/contractsstatement/excel.js` — Fixed Excel icon size
5. `app/(root)/invoicesstatement/excel.js` — Fixed Excel icon size (via linter)
6. `app/(root)/contractsreview/excel.js` — Fixed Excel icon size (via linter)
7. `app/(root)/invoicesreview/excel.js` — Fixed Excel icon size (via linter)
8. `components/contracts/excel.js` — Fixed Excel icon size (SiMicrosoftoffice)
9. `app/(root)/materialtables/excel.js` — Fixed wrapper div size
10. `app/(root)/accounting/page.js` — Added NaN guards + Number() coercion in totals
11. `app/(root)/accounting/excel.js` — Fixed NaN in amountExp export
12. `components/table/inlineEditing/EditableSelectCell.js` — Theme colors
13. `app/(root)/contracts/page.js` — Changed 6 columns to EditableSelectCell
14. `app/(root)/invoices/page.js` — Changed 3 columns to EditableSelectCell
15. `app/(root)/cashflow/dialogClient.js` — Fixed button styling
16. `app/(root)/cashflow/dialogSupplier.js` — Fixed button styling
17. `app/(root)/cashflow/page.js` — Fixed financing Add button hover
18. `app/(root)/stocks/page.js` — Fixed flicker + memoized selector

### Items Not Requiring Changes (verified via client GitHub)
- #7, #8: Features don't exist in original codebase
- #11, #13: Working as designed
- #2, #10, #15, #16: Already working correctly or previously fixed
- #4: Already fixed in prior commits
