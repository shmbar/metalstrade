# Screen sizes and text sizes across the CRM

Generated from the code, not from memory. Regenerate any time with
`npm run design:check` (enforcement) and the commands quoted at the bottom.

---

## 1. Screen sizes (breakpoints)

| Name | Applies from | Used for |
|---|---|---|
| `sm` | 640px | almost unused; a few marketing bits |
| `md` | 768px | **the desktop/mobile split** — sidebar vs. mini top bar |
| `lg` | 1024px | rarely used |
| `xl` | **1280px** | **type step 2** |
| `2xl` | **1536px** | **type step 3** |
| `3xl` | **1920px** | **type step 4** (custom, added in `tailwind.config.js`) |

**Text only changes at three of these: 1280, 1536 and 1920.** Below 1280px every screen
shows the same, smallest size. `md` (768) matters for layout, not type.

So there are four type bands: **<1280 · 1280–1535 · 1536–1919 · ≥1920**.

---

## 2. Text sizes — the ladder

Eight roles. Nothing outside this set is allowed; gate 1 fails the build otherwise.

| Class | <1280 | ≥1280 | ≥1536 | ≥1920 | Used for |
|---|---|---|---|---|---|
| `.responsiveTextTableTitle` | 9 | 10 | 11 | 12 | chips, badges, **buttons** |
| `.responsiveTextTable` | 10 | 11 | 12 | 13 | dense table cells |
| `.responsiveText` | 11 | 12 | 13 | 14 | body text, **`.input` pills** |
| `.responsiveTextTotal` | 11 | 12 | 13 | 14 | totals rows (bold, never wraps) |
| `.responsiveTextInput` | 12 | 13 | 14 | 15 | labels, controls, **table headers** |
| `.responsiveTextTitle` | 13 | 14 | 15 | 16 | card and section titles |
| `.responsiveTextPage` | 16 | 17 | 18 | 20 | page titles |
| `.responsiveTextStat` | 20 | 22 | 24 | 26 | KPI figures |

Each rung is **1px above the one below** at every band, so two adjacent elements are never
more than one step apart. The same ladder exists as CSS variables — `--fs-caption`,
`--fs-table`, `--fs-body`, `--fs-input`, `--fs-title`, `--fs-page`, `--fs-stat` — for
inline `style={{ fontSize }}`, which a class cannot reach.

**On a typical 1440px laptop you are in band 2:** buttons 10px, table cells 11px, body and
inputs 12px, headers 13px, section titles 14px.

---

## 3. What each page actually uses

Counts of each rung per route. Blank = not used.

| Route | 9px | 10px | 11px | 12px | 13px | 16px | 20px | 9px override |
|---|---|---|---|---|---|---|---|---|
| ContractsReview&Statement | | 13 | 2 | | 3 | | | **YES** |
| InvoicesReview&Statement | | 13 | 1 | | 2 | | | **YES** |
| accounting | | 17 | 23 | | 1 | | | **YES** |
| accstatement | | 5 | 9 | 2 | 2 | | | **YES** |
| activity | | | 1 | | 1 | | | |
| analysis | | 6 | 2 | | 2 | | | **YES** |
| apps/Assistant | | 6 | 3 | | 2 | | | |
| cashflow | | 29 | 44 | 11 | 2 | 2 | | |
| companyexpenses | 1 | 17 | 6 | 18 | 3 | | | **YES** |
| contracts | | 142 | 137 | 62 | 6 | | | **YES** |
| contractsstatement | 1 | 28 | 1 | | 1 | | | **YES** |
| dashboard | 4 | 28 | 5 | | 2 | | | |
| expenses | 1 | 42 | 6 | 4 | 10 | | | **YES** |
| formulas | | | | **270** | 17 | | | |
| incoterms | | 8 | 2 | | 1 | | | |
| invoices | | 2 | 60 | 19 | 2 | | | |
| invoicesstatement | | 37 | 1 | | 1 | | | |
| margins | 2 | 13 | 19 | 26 | 3 | | | fixed |
| materialtables | | 24 | | | 5 | | | |
| salescontracts | | 5 | 10 | 1 | 1 | | | |
| settings | | 7 | 51 | 58 | 24 | | | |
| shipment | 1 | 21 | 2 | 6 | 3 | | | **YES** |
| specialinvoices | 2 | 24 | | 1 | 2 | | | **YES** |
| stocks | | 41 | 6 | 12 | 3 | | | **YES** |
| storagecosts | | 9 | 2 | | 1 | | | |
| sidebar / nav | 2 | 7 | 21 | | | | | |

---

## 4. Two things this table shows

### 4.1 Twelve tables still force 9px on their data cells

`font-size: 9px !important` on `tbody td` appears in **13 files**. It overrides everything —
including a cell whose own class says 13px. **Margins is fixed; the other 12 are not**,
pending a decision, because removing it makes every data screen less dense.

Marked **YES** above. On those pages the data is **9px, flat at every screen size**, sitting
under headers that scale 13→15px.

### 4.2 The top two rungs are essentially unused

`.responsiveTextPage` (16-20px) and `.responsiveTextStat` (20-26px) appear only on sign-in,
sign-up and one cashflow figure. Every other **page title and KPI number is still sized ad
hoc** — that is why "Margins", "Dashboard" and the stat cards do not match each other.

Both rungs exist and are enforced; they are simply not adopted yet. Adopting them is a
small, mechanical pass — worth doing, and not urgent.

---

## 5. Regenerating this

```bash
npm run design:check      # enforce the ladder (13 gates)
npm run design:contrast   # WCAG contrast, all 19 themes x 2 modes

# the ladder itself
grep -A4 'responsiveText' app/globals.css

# which tables still force 9px
grep -rln 'font-size: *9px *!important' app --include=*.js
```
