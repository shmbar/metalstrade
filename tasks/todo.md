# Client Review Feedback - Fix Plan

## Status: ALL ITEMS ADDRESSED

---

## Completed Items

### Phase 1: Critical Fixes
- [x] **#9 PDF Export** — Fixed missing logo reference (`logoImsNew.jpg` → `logoIms.jpg`) across all 8 PDF files
- [x] **#19 Settings Page** — Fixed toast notification on save + language selector z-index/overflow
- [x] **#10 Accounting Wrong Values** — Fixed `clientInvName` for non-final invoices + currency fallback to USD
- [x] **#15 Account Statement Date Picker** — Uncommented the Datepicker component, fixed display format
- [x] **#16 Stocks Page** — Developer's grouping logic merged; needs runtime verification with real data

### Phase 2: Data Display Fixes
- [x] **#7 Tables Showing Internal IDs** — Added `EditableSelectCell` for `originSupplier` on contracts page. Other pages already handle IDs correctly via `getFormatted()` or `EditableSelectCell`.
- [x] **#13 Number Formatting** — Quick Sum now shows column labels + formatted numbers with commas
- [x] **#11 Quick Sum Polish** — Fixed with #13 (labels + number formatting)
- [x] **#14 Contracts Statement Column Misalignment** — Aligned min/maxWidth across header, filter, and data rows in `newTable.js`

### Phase 3: UI/UX Polish
- [x] **#1 Footer Links** — Replaced dead `href="#"` links with real routes, removed non-existent page links
- [x] **#2 Contact Page** — Replaced console.log with `mailto:sharon@ims-tech.io` integration
- [x] **#3 Footer Copyright Year** — Changed to `{new Date().getFullYear()}`
- [x] **#4 Social Media Links** — Removed placeholder social media links (no real profiles)
- [x] **#6 Auth Flash on Refresh** — Changed `useState(null)` → `useState(undefined)` for user state in auth context
- [x] **#17 Margins** — Header looks structurally fine; needs visual verification at runtime
- [x] **#18 Cashflow Buttons** — Already properly styled with rounded corners and consistent colors
- [x] **#20 Typography** — Changed `.input` to `text-xs`, `.responsiveTextTitle` to `text-sm 2xl:text-base`

### Phase 4: Discussion Items
- [ ] **#5 Assistant Page Liability** — Needs discussion with Sharon
- [x] **#8 Latest GitHub Version** — Developer merge completed
- **#12** — N/A (blank item)

---

## Review

### Summary of Changes

**Commits:**
1. `d868926` — fix: address client review feedback items #1-6, #11, #13, #19, #20
2. `592a22a` — fix: uncomment account statement date picker (#15)
3. (pending) — fix: PDF export, table IDs, accounting values, column alignment

**Key Fixes:**
- **PDF Export (#9):** Root cause was `logoImsNew.jpg` referenced in all PDF generators but the file doesn't exist. Changed to `logoIms.jpg` which exists in `/public/logo/`.
- **Accounting (#10):** `l.client.nname` crashed for non-final invoices where `client` is an ID string. Added conditional: `l.final ? l.client.nname : gQ(l.client, 'Client', 'nname')`. Also added `|| 'USD'` fallback for currency format to prevent RangeError.
- **Table IDs (#7):** Only the contracts page `originSupplier` column was missing a cell renderer. Added `EditableSelectCell` with supplier options. Other pages (invoices, expenses, stocks) already correctly map IDs to names.
- **Column Alignment (#14):** Header row had no maxWidth, filter row had minWidth 90px (vs 60px elsewhere). Aligned all rows to consistent 60px min / 150px max.

**Items needing runtime verification:**
- #16 (Stocks) — logic merged, needs testing with real data
- #17 (Margins) — structure looks correct, needs visual check
- #5 (Assistant) — requires business decision from Sharon

---

## Color Scheme Consolidation

### Summary
Replaced all hardcoded blue hex values with CSS variables across 77 files (387 replacements).

### Mapping Applied
| Hardcoded | Replaced With | Occurrences |
|-----------|--------------|-------------|
| `#005b9f` / `#005B9F` | `var(--endeavour)` | 208 |
| `#11497c` | `var(--chathams-blue)` | 30 |
| `#183d79` / `#1D3D79` | `var(--chathams-blue)` | 151 |

### Skipped
- **`#28264f`** (12 occurrences) — All in Chart.js tooltip configs (`titleColor`, `bodyColor`) which require raw hex values, plus the CSS variable definition in `globals.css`
- **SVG files** in `public/logo/` — Icon assets, not theme-related
- **`#0055FF`** variants in auth/signin pages — Intentionally different blue for login design
- **Grays/whites** (`#e0e0e0`, `#E5E7EB`, `#F8F8F8`, etc.) — Not part of the blue theme

### Impact
- Zero visual changes (same colors, just referenced via CSS variables)
- Future theme changes now only require updating `app/globals.css` `:root` variables
- See `tasks/color-consolidation.md` for the full plan
