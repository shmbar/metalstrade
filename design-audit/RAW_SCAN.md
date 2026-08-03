# RAW_SCAN — Phase 1.2 objective evidence

No interpretation. Frequency tables show the *de facto* standard.

**Scan set:** the 504 files in INVENTORY.md (`app/**`, `components/**`, `contexts/**`, `hooks/**`, `lib/**`, `utils/**`, `actions/**`, `mobile/**`).
**Excluded:** node_modules, .next, backups, tests, __tests__.

> Note: `rg` is not installed on this machine. Scans use GNU grep over the exact
> INVENTORY file list, which is equivalent and strictly more precise (no glob drift).

## 1. Named Tailwind font sizes — frequency
```
    387 text-xs
    268 text-sm
     31 text-lg
     19 text-base
     14 text-4xl
     13 text-3xl
      9 text-2xl
      5 text-xl
      3 text-5xl
```

## 2. Arbitrary font sizes / text colours `text-[...]` — frequency

NOTE: Tailwind overloads the `text-` prefix. `text-[var(--x)]` is a **colour** (correct, themed).
`text-[0.72rem]` is a **size** (a violation). Split below.

### 2a. SIZES (violations)
```
    168 text-[0.75rem]
     78 text-[0.72rem]
     28 text-[10px]
     25 text-[0.875rem]
     23 text-[0.8rem]
     21 text-[0.825rem]
     19 text-[0.68rem]
     16 text-[11px]
     15 text-[0.6rem]
     12 text-[0.8125rem]
     11 text-[0.5625rem]
     10 text-[0.71875rem]
     10 text-[0.657rem]
      8 text-[0.7rem]
      5 text-[0.6875rem]
      5 text-[0.62rem]
      5 text-[0.58rem]
      4 text-[1rem]
      3 text-[0.9375rem]
      3 text-[0.625rem]
      2 text-[14px]
      2 text-[12px]
      2 text-[0.78rem]
      1 text-[16px]
      1 text-[15px]
      1 text-[1.0625rem]
      1 text-[0.85rem]
      1 text-[0.65rem]
      1 text-[0.64rem]
```
### 2b. COLOURS via token (acceptable)
```
    439 text-[var(--chathams-blue)]
    263 text-[var(--port-gore)]
    258 text-[var(--endeavour)]
    206 text-[var(--regent-gray)]
     58 text-[var(--primary-bright)]
     36 text-[var(--danger-text)]
     10 text-[var(--text-faint)]
      3 text-[var(--rock-blue)]
      1 text-[var(--text-mid)]
      1 text-[var(--ok-strong)]
      1 text-[color:var(--endeavour)]
```
### 2c. COLOURS hardcoded hex (violations)
```
components/Hero/hero.jsx:41:text-[#9ed2ff]
components/Hero/hero.jsx:42:text-[#dbeeff]
components/Hero/hero.jsx:66:text-[#dbeeff]
components/Hero/hero.jsx:81:text-[#dbeeff]
components/Testimonial/testimonial-card.tsx:31:text-[#0056D2]
components/Testimonial/testimonial-card.tsx:41:text-[#0056D2]
components/Testimonial/testimonials.tsx:61:text-[#0056D2]
components/Testimonial/testimonials.tsx:64:text-[#0056D2]
components/Testimonial/testimonials.tsx:69:text-[#0056D2]
```
### 2d. Totals
```
all text-[...] occurrences : 1766
distinct values            : 43
files affected             : 164
distinct arbitrary SIZES   : 29
```

## 3. Hardcoded colours that bypass the theme

### 3a. Hex literals — by value
```
     52 #ffffff
     44 #fff
     22 #b8ddf8
     21 #dbeeff
     21 #28264f
     19 #0366ae
     18 #838ca7
     18 #103a7a
     13 #f1f5f9
     12 #2563eb
     11 #dc2626
     10 #ffc107
     10 #f8fbff
     10 #cbd5e1
     10 #0056d2
      8 #ebf2fc
      8 #9fb8d4
      8 #0d9488
      7 #fde68a
      7 #16a34a
      6 #d8e8f5
      5 #f59e0b
      5 #e3f3ff
      5 #555
      4 #dcfce7
      4 #db2777
      4 #999999
      4 #0f1b35
      4 #0b3b73
      3 #fffbeb
      3 #fee2e2
      3 #fca5a5
      3 #ede9fe
      3 #ddd6fe
      3 #92400e
      3 #6366f1
      3 #45afed
      3 #38bdf8
      3 #0a1322
      2 #ffb3ab
      2 #fef3c7
      2 #fce7f3
      2 #fbbf24
      2 #f87171
      2 #eff6ff
      2 #eef3f9
      2 #eef0f3
      2 #e7ecf3
      2 #e6eef8
      2 #d97706
      2 #bfdbfe
      2 #bbf7d0
      2 #9ed2ff
      2 #999
      2 #991b1b
      2 #97a3b8
      2 #86efac
      2 #7ce3a8
      2 #7c6fe0
      2 #4f46e5
      2 #4c1d95
      2 #22304d
      2 #1d4ed8
      2 #1477c0
      2 #14532d
      2 #0f1a30
      2 #0ea5e9
      2 #0a6fc2
      2 #0a5ea8
      2 #055a9c
      1 #ffd700
      1 #ffd479
      1 #ff5555
      1 #fef9c3
      1 #fef2f2
      1 #fdf2f8
      1 #fbcfe8
      1 #fafcff
      1 #fafafa
      1 #f9a8d4
      1 #f5f6f8
      1 #f5f5f5
      1 #f5f3ff
      1 #f4f9ff
      1 #f4f8fd
      1 #f4f6fb
      1 #f472b6
      1 #f43f5e
      1 #f0fdf4
      1 #f0f4ff
      1 #f0f1f4
      1 #eef5fc
      1 #eef4fb
      1 #eef3fd
      1 #eef2f8
      1 #eef2f6
      1 #eee
      1 #ea580c
      1 #e6e8ed
      1 #e5e7eb
      1 #e0f2fe
      1 #e08600
      1 #dff0ff
      1 #d5d9e0
      1 #d5d5d5
      1 #cccccc
      1 #c4b5fd
      1 #c084fc
      1 #bae6fd
      1 #b91c1c
      1 #a78bfa
      1 #a3b3d2
      1 #9d174d
      1 #9ca3af
      1 #9bb4cc
      1 #9aa4b5
      1 #98a1b2
      1 #931
      1 #8ec5f0
      1 #8e9aaf
      1 #8b7fe8
      1 #831843
      1 #818cf8
      1 #7dd3fc
      1 #7dd3f8
      1 #7d5c17
      1 #7cc3ff
      1 #7c8ca8
      1 #7c3aed
      1 #7a2e2e
      1 #78350f
      1 #777
      1 #6a7b9c
      1 #69b4f3
      1 #64748b
      1 #60a5fa
      1 #5b6472
      1 #5b21b6
      1 #5a6a85
      1 #56a8ee
      1 #56678a
      1 #4f9fdf
      1 #4ade80
      1 #4aa3e8
      1 #453781
      1 #3b191c
      1 #382c13
      1 #38182a
      1 #34d399
      1 #2f6fdb
      1 #2e1416
      1 #2dd4bf
      1 #2d3fb8
      1 #2c3c5e
      1 #2a2110
      1 #2a1520
      1 #282045
      1 #22b0f0
      1 #1f2c49
      1 #1f2937
      1 #1f1a30
      1 #1e5e34
      1 #1d2940
      1 #1c2942
      1 #1c134d
      1 #1b2a4a
      1 #178a4c
      1 #172441
      1 #16315f
      1 #15803d
      1 #14b8a6
      1 #143521
      1 #12291b
      1 #111827
      1 #111
      1 #101a2e
      1 #0f9d58
      1 #0f2342
      1 #0e7490
      1 #0b2f66
      1 #0b1220
      1 #080e1c
      1 #075985
      1 #04101f
      1 #000000
      1 #000
```
### 3b. Hex literals — by file
```
   58  app/(root)/dashboard/charts.js
   54  mobile/src/theme/tokens.ts
   48  app/globals.css
   30  app/(root)/dashboard/page.js
   18  mobile/tailwind.config.js
   12  mobile/src/lib/pdfTemplates.ts
   11  utils/themes.js
   11  mobile/src/lib/customsDocs.ts
   11  components/Hero/hero.jsx
    9  mobile/src/shared/shipmentStatus.js
    8  mobile/app/(app)/index.tsx
    8  app/api/ai/send-reminder/route.js
    8  app/(root)/shipment/page.js
    8  app/(root)/expenses/newTable.js
    7  mobile/src/features/stocks/AgingView.tsx
    7  mobile/src/components/ui/Button.tsx
    7  components/platform/platformCard1.jsx
    7  app/(root)/accounting/page.js
    6  mobile/src/features/dashboard/components.tsx
    6  mobile/app/sign-in.tsx
    6  mobile/app/(app)/formulas.tsx
    6  app/(root)/contractsstatement/newTable.js
    6  app/(root)/cashflow/invPopup.js
    5  app/(public)/signin/page.jsx
    4  mobile/src/features/stocks/aging.ts
    4  mobile/src/components/OfflineBanner.tsx
    4  components/Testimonial/testimonials.tsx
    4  components/PdfPagesView.js
    4  app/(root)/invoicesstatement/newTable.js
    3  mobile/src/features/stocks/StorageView.tsx
    3  components/platform/PlatformSection.jsx
    3  components/NotificationBell.js
    3  components/Features/features.jsx
    3  app/(root)/stocks/newTable.js
    3  app/(root)/materialtables/newTable.js
    3  app/(public)/about/page.jsx
    2  utils/notificationPriority.js
    2  mobile/src/components/ui/ProgressBar.tsx
    2  mobile/src/components/SwipeRow.tsx
    2  mobile/app/(app)/more.tsx
    2  mobile/app/(app)/accounting.tsx
    2  components/table/Paginator.js
    2  components/Testimonial/testimonial-card.tsx
    2  components/NotificationPopups.js
    2  components/Navbar/navbarMenu.jsx
    2  components/Navbar/navbarLinks.jsx
    2  components/Navbar/navbarContent.jsx
    2  components/Navbar/navbar.jsx
    2  components/Footer/footer.jsx
    2  components/Features/EfficientShipment.jsx
    2  components/DocumentImportOverlay.js
    2  components/ActivityLog.js
    2  app/(root)/stocks/stockAudit.js
    2  app/(root)/stocks/SharedStock.js
    2  app/(root)/specialinvoices/newTable.js
    2  app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js
    2  app/(root)/contracts/newTable.js
    2  app/(root)/contracts/modals/invoiceDetails.js
    2  app/(root)/cashflow/funcs.js
    2  app/(root)/accounting/newTable.js
    2  app/(root)/InvoicesReview&Statement/newTable.js
    2  app/(root)/ContractsReview&Statement/page.js
    2  app/(root)/ContractsReview&Statement/newTable.js
    2  app/(public)/blog/page.jsx
    1  mobile/src/components/ui/Skeleton.tsx
    1  mobile/src/components/ui/SegmentedControl.tsx
    1  mobile/src/components/ui/DateField.tsx
    1  mobile/src/components/ui/Badge.tsx
    1  mobile/src/components/PrivacyLock.tsx
    1  mobile/app/(app)/notifications.tsx
    1  mobile/app/(app)/invoices/index.tsx
    1  mobile/app/(app)/incoterms.tsx
    1  mobile/app/(app)/contracts/index.tsx
    1  components/toast.js
    1  components/statusUtils.js
    1  components/platform/platformCard3.jsx
    1  components/platform/platformCard2.jsx
    1  components/Features/feature-card.jsx
    1  components/Dashboard/MarketsTicker.js
    1  components/Dashboard/AIAlertsBar.js
    1  components/CommentThread.js
    1  components/CTA/cta.jsx
    1  app/(root)/stocks/sumtables/tablesFuncs.js
    1  app/(root)/stocks/shipmentsTable.js
    1  app/(root)/specialinvoices/totals/funcs.js
    1  app/(root)/settings/tabs/general.js
    1  app/(root)/settings/tabs/emailSetup.js
    1  app/(root)/margins/page.js
    1  app/(root)/margins/marginTable.js
    1  app/(root)/expenses/totals/funcs.js
    1  app/(root)/contractsstatement/totals/funcs.js
    1  app/(root)/companyexpenses/totals/funcs.js
    1  app/(root)/companyexpenses/page.js
    1  app/(root)/companyexpenses/newTable.js
    1  app/(root)/accstatement/page.js
    1  app/(root)/accstatement/newTable.js
    1  app/(root)/_components/SideBar.js
```
```
TOTAL hex occurrences: 594
TOTAL files with hex : 97
```

## 4. rgb()/rgba() usage

### 4a. By file (all forms, incl. themed `rgba(var(--x-rgb), a)`)
```
  18  app/(root)/settings/tabs/general.js
  17  app/(root)/dashboard/page.js
  11  app/(root)/dashboard/charts.js
  11  app/(root)/cashflow/sumBasket.js
  10  app/(root)/specialinvoices/newTable.js
   8  app/(root)/analysis/newTable.js
   7  app/(root)/invoicesstatement/newTable.js
   7  app/(root)/contractsstatement/newTable.js
   7  app/(root)/InvoicesReview&Statement/newTable.js
   6  app/(root)/stocks/newTable.js
   6  app/(root)/expenses/newTable.js
   6  app/(root)/accounting/page.js
   6  app/(root)/_components/SideBarMini.js
   5  mobile/app/(app)/index.tsx
   5  app/(root)/accstatement/newTable.js
   5  app/(root)/ContractsReview&Statement/newTable.js
   4  mobile/app/sign-in.tsx
   4  app/(root)/margins/thirdpart.js
   4  app/(root)/contractsstatement/totals/tableTotals.js
   4  app/(root)/cashflow/invPopup.js
   3  components/SplitControl.js
   3  components/NotificationPopups.js
   3  app/(root)/tableStyles.css
   3  app/(root)/storagecosts/page.js
   3  app/(root)/materialtables/newTable.js
   3  app/(root)/margins/firstpart.js
   3  app/(root)/companyexpenses/newTable.js
   3  app/(root)/accounting/newTable.js
   3  app/(root)/_components/SideBar.js
   2  utils/chartTheme.js
   2  mobile/app/(app)/invoices/[id].tsx
   2  mobile/app/(app)/cashflow.tsx
   2  components/NotificationBell.js
   2  components/Dashboard/HeadlineTicker.js
   2  app/styles/global-table.css
   2  app/globals.css
   2  app/(root)/specialinvoices/totals/tableTotals.js
   2  app/(root)/margins/marginTable.js
   2  app/(root)/contracts/style.css
   2  app/(root)/contracts/newTable.js
   1  mobile/src/features/stocks/StorageView.tsx
   1  mobile/src/components/ui/Select.tsx
   1  mobile/src/components/ui/DateField.tsx
   1  mobile/app/(app)/shipment.tsx
   1  mobile/app/(app)/settings.tsx
   1  mobile/app/(app)/settings-entity.tsx
   1  mobile/app/(app)/misc-invoices.tsx
   1  mobile/app/(app)/contracts/[id].tsx
   1  components/videoLoader.js
   1  components/platform/platformCard2.jsx
   1  components/invoices/ReminderModal.js
   1  components/dateRangePicker.js
   1  components/Testimonial/testimonial-card.tsx
   1  components/PdfPreview.js
   1  components/PdfPagesView.js
   1  components/DocumentImportOverlay.js
   1  app/(root)/stocks/sumtables/tablesFuncs.js
   1  app/(root)/stocks/sumtables/tableTotals.js
   1  app/(root)/stocks/sumtables/gradeTable.js
   1  app/(root)/stocks/shipmentsTable.js
   1  app/(root)/specialinvoices/totals/funcs.js
   1  app/(root)/shipment/page.js
   1  app/(root)/settings/tabs/logos.js
   1  app/(root)/settings/tabs/emailSetup.js
   1  app/(root)/margins/page.js
   1  app/(root)/margins/newTable.js
   1  app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js
   1  app/(root)/invoicesstatement/sumtables/newTableTotals.js
   1  app/(root)/invoices/style.css
   1  app/(root)/invoices/page.js
   1  app/(root)/invoices/modals/delayedResponse.js
   1  app/(root)/expenses/totals/tableTotals.js
   1  app/(root)/expenses/totals/funcs.js
   1  app/(root)/expenses/page.js
   1  app/(root)/contractsstatement/totals/funcs.js
   1  app/(root)/contracts/modals/poInvModal.js
   1  app/(root)/contracts/modals/delayedResponse.js
   1  app/(root)/companyexpenses/totals/tableTotals.js
   1  app/(root)/companyexpenses/totals/funcs.js
   1  app/(root)/companyexpenses/page.js
   1  app/(root)/apps/Assistant/page.js
   1  app/(root)/ContractsReview&Statement/page.js
```
### 4b. LITERAL numeric channels only — these are the theme bypasses
```
app/(root)/ContractsReview&Statement/newTable.js:532:rgba(0, 0, 0, 0.06)
app/(root)/ContractsReview&Statement/newTable.js:546:rgba(0, 0, 0, 0.2)
app/(root)/ContractsReview&Statement/page.js:842:rgba(0,0,0,0.10)
app/(root)/InvoicesReview&Statement/newTable.js:300:rgba(255, 255, 255, 0.2)
app/(root)/InvoicesReview&Statement/newTable.js:484:rgba(249, 115, 22, 0.2)
app/(root)/InvoicesReview&Statement/newTable.js:485:rgba(0, 0, 0, 0.06)
app/(root)/InvoicesReview&Statement/newTable.js:500:rgba(0, 0, 0, 0.2)
app/(root)/_components/SideBar.js:121:rgba(44, 130, 201, 0.18)
app/(root)/_components/SideBar.js:139:rgba(255,255,255,0.7)
app/(root)/_components/SideBar.js:450:rgba(44,130,201,0.10)
app/(root)/accounting/newTable.js:257:rgba(255, 255, 255, 0.2)
app/(root)/accounting/newTable.js:443:rgba(0, 0, 0, 0.06)
app/(root)/accounting/newTable.js:457:rgba(0, 0, 0, 0.2)
app/(root)/accounting/page.js:481:rgba(255,255,255,0.95)
app/(root)/accounting/page.js:496:rgba(159,184,212,0.2)
app/(root)/accounting/page.js:653:rgba(0,0,0,0.06)
app/(root)/accounting/page.js:677:rgba(0,0,0,0.06)
app/(root)/accounting/page.js:701:rgba(0,0,0,0.06)
app/(root)/accounting/page.js:725:rgba(0,0,0,0.06)
app/(root)/accstatement/newTable.js:232:rgba(255, 255, 255, 0.2)
app/(root)/accstatement/newTable.js:358:rgba(0, 0, 0, 0.2)
app/(root)/analysis/newTable.js:162:rgba(0, 0, 0, 0.08)
app/(root)/analysis/newTable.js:162:rgba(99, 102, 241, 0.1)
app/(root)/analysis/newTable.js:187:rgba(255, 255, 255, 0.2)
app/(root)/analysis/newTable.js:254:rgba(255, 255, 255, 0.2)
app/(root)/cashflow/invPopup.js:146:rgba(0,0,0,0.10)
app/(root)/cashflow/invPopup.js:409:rgba(0,0,0,0.10)
app/(root)/companyexpenses/newTable.js:483:rgba(249, 115, 22, 0.2)
app/(root)/companyexpenses/newTable.js:484:rgba(0, 0, 0, 0.06)
app/(root)/companyexpenses/newTable.js:497:rgba(0, 0, 0, 0.2)
app/(root)/companyexpenses/page.js:317:rgba(255,255,255,0.25)
app/(root)/companyexpenses/totals/tableTotals.js:60:rgba(0,0,0,0.08)
app/(root)/contracts/modals/poInvModal.js:572:rgba(16,42,74,0.35)
app/(root)/contracts/newTable.js:287:rgba(255, 255, 255, 0.2)
app/(root)/contracts/style.css:219:rgba(9,110,182,0.12)
app/(root)/contractsstatement/newTable.js:370:rgba(255, 255, 255, 0.2)
app/(root)/contractsstatement/newTable.js:671:rgba(0, 0, 0, 0.06)
app/(root)/contractsstatement/newTable.js:685:rgba(0, 0, 0, 0.2)
app/(root)/contractsstatement/totals/tableTotals.js:148:rgba(0, 0, 0, 0.06)
app/(root)/contractsstatement/totals/tableTotals.js:153:rgba(0, 0, 0, 0.2)
app/(root)/contractsstatement/totals/tableTotals.js:80:rgba(255,255,255,0.2)
app/(root)/dashboard/charts.js:102:rgba(159,184,212,0.3)
app/(root)/dashboard/charts.js:161:rgba(255,255,255,0.95)
app/(root)/dashboard/charts.js:195:rgba(159,184,212,0.3)
app/(root)/dashboard/charts.js:252:rgba(255,255,255,0.95)
app/(root)/dashboard/charts.js:319:rgba(255,255,255,0.95)
app/(root)/dashboard/charts.js:351:rgba(159,184,212,0.2)
app/(root)/dashboard/charts.js:411:rgba(255,255,255,0.95)
app/(root)/dashboard/charts.js:443:rgba(159,184,212,0.2)
app/(root)/dashboard/charts.js:514:rgba(255,255,255,0.95)
app/(root)/dashboard/charts.js:559:rgba(159,184,212,0.2)
app/(root)/dashboard/charts.js:64:rgba(255,255,255,0.95)
app/(root)/dashboard/page.js:1086:rgba(37,99,235,0.10)
app/(root)/dashboard/page.js:1088:rgba(37,99,235,0.28)
app/(root)/dashboard/page.js:1089:rgba(37,99,235,0.00)
app/(root)/dashboard/page.js:1139:rgba(255,255,255,0.97)
app/(root)/dashboard/page.js:1197:rgba(255,255,255,0.97)
app/(root)/dashboard/page.js:140:rgba(16,58,122,0.10)
app/(root)/dashboard/page.js:255:rgba(16,58,122,0.10)
app/(root)/dashboard/page.js:479:rgba(16,58,122,0.07)
app/(root)/dashboard/page.js:517:rgba(3,102,174,0.16)
app/(root)/dashboard/page.js:570:rgba(16,58,122,0.10)
app/(root)/dashboard/page.js:632:rgba(16,58,122,0.10)
app/(root)/dashboard/page.js:707:rgba(16,58,122,0.10)
app/(root)/dashboard/page.js:76:rgba(16,58,122,0.08)
app/(root)/expenses/newTable.js:1315:rgba(249,115,22,0.2)
app/(root)/expenses/newTable.js:1316:rgba(0,0,0,0.06)
app/(root)/expenses/newTable.js:570:rgba(249,115,22,0.2)
app/(root)/expenses/newTable.js:571:rgba(0,0,0,0.06)
app/(root)/expenses/page.js:420:rgba(255,255,255,0.25)
app/(root)/expenses/totals/tableTotals.js:44:rgba(0,0,0,0.06)
app/(root)/invoices/page.js:735:rgba(255,255,255,0.25)
app/(root)/invoicesstatement/newTable.js:247:rgba(255, 255, 255, 0.2)
app/(root)/invoicesstatement/newTable.js:430:rgba(249, 115, 22, 0.2)
app/(root)/invoicesstatement/newTable.js:431:rgba(0, 0, 0, 0.06)
app/(root)/invoicesstatement/newTable.js:446:rgba(0, 0, 0, 0.2)
app/(root)/invoicesstatement/sumtables/newTableTotals.js:48:rgba(0,0,0,0.08)
app/(root)/margins/firstpart.js:104:rgba(0, 0, 0, 0.1)
app/(root)/margins/firstpart.js:104:rgba(255, 255, 255, 0.2)
app/(root)/margins/firstpart.js:125:rgba(0, 0, 0, 0.1)
app/(root)/margins/firstpart.js:89:rgba(0, 0, 0, 0.15)
app/(root)/margins/marginTable.js:212:rgba(24, 61, 121, 0.3)
app/(root)/margins/marginTable.js:216:rgba(0, 0, 0, 0.1)
app/(root)/margins/thirdpart.js:469:rgba(0, 0, 0, 0.06)
app/(root)/margins/thirdpart.js:483:rgba(0, 0, 0, 0.2)
app/(root)/margins/thirdpart.js:57:rgba(0, 0, 0, 0.08)
app/(root)/margins/thirdpart.js:57:rgba(99, 102, 241, 0.1)
app/(root)/margins/thirdpart.js:594:rgba(24, 61, 121, 0.15)
app/(root)/materialtables/newTable.js:372:rgba(0,0,0,0.12)
app/(root)/materialtables/newTable.js:412:rgba(0,0,0,0.12)
app/(root)/shipment/page.js:1119:rgba(0,0,0,0.06)
app/(root)/specialinvoices/newTable.js:205:rgba(0,0,0,0.04)
app/(root)/specialinvoices/newTable.js:212:rgba(0,0,0,0.04)
app/(root)/specialinvoices/newTable.js:294:rgba(0,0,0,0.08)
app/(root)/specialinvoices/newTable.js:311:rgba(0,0,0,0.08)
app/(root)/specialinvoices/newTable.js:321:rgba(255, 255, 255, 0.2)
app/(root)/specialinvoices/newTable.js:513:rgba(0, 0, 0, 0.06)
app/(root)/specialinvoices/newTable.js:528:rgba(0, 0, 0, 0.2)
app/(root)/specialinvoices/totals/tableTotals.js:102:rgba(0,0,0,0.06)
app/(root)/specialinvoices/totals/tableTotals.js:84:rgba(0,0,0,0.08)
app/(root)/stocks/newTable.js:241:rgba(255, 255, 255, 0.2)
app/(root)/stocks/newTable.js:413:rgba(0, 0, 0, 0.06)
app/(root)/stocks/newTable.js:428:rgba(0, 0, 0, 0.2)
app/(root)/stocks/sumtables/gradeTable.js:90:rgba(0,0,0,0.08)
app/(root)/stocks/sumtables/tableTotals.js:87:rgba(0,0,0,0.08)
app/styles/global-table.css:18:rgba(0,0,0,.08)
app/styles/global-table.css:88:rgba(9,110,182,.12)
components/Dashboard/HeadlineTicker.js:205:rgba(0,0,0,0.10)
components/DocumentImportOverlay.js:401:rgba(0,0,0,0.5)
components/NotificationBell.js:70:rgba(255,255,255,0.25)
components/PdfPagesView.js:76:rgba(0,0,0,0.15)
components/PdfPreview.js:64:rgba(0,0,0,0.5)
components/SplitControl.js:170:rgba(16,33,61,0.45)
components/SplitControl.js:175:rgba(0,0,0,0.2)
components/Testimonial/testimonial-card.tsx:20:rgba(0,86,210,0.25)
components/invoices/ReminderModal.js:131:rgba(0,0,0,0.5)
components/platform/platformCard2.jsx:23:rgba(255,255,255,0.2)
mobile/app/(app)/cashflow.tsx:186:rgba(0,0,0,0.4)
mobile/app/(app)/cashflow.tsx:222:rgba(0,0,0,0.4)
mobile/app/(app)/contracts/[id].tsx:312:rgba(0,0,0,0.4)
mobile/app/(app)/index.tsx:67:rgba(255,255,255,0.7)
mobile/app/(app)/index.tsx:74:rgba(255,255,255,0.7)
mobile/app/(app)/index.tsx:79:rgba(255,255,255,0.16)
mobile/app/(app)/index.tsx:95:rgba(255,255,255,0.14)
mobile/app/(app)/index.tsx:95:rgba(255,255,255,0.18)
mobile/app/(app)/index.tsx:96:rgba(255,255,255,0.7)
mobile/app/(app)/invoices/[id].tsx:279:rgba(0,0,0,0.4)
mobile/app/(app)/invoices/[id].tsx:298:rgba(0,0,0,0.4)
mobile/app/(app)/misc-invoices.tsx:127:rgba(0,0,0,0.4)
mobile/app/(app)/settings-entity.tsx:188:rgba(0,0,0,0.4)
mobile/app/(app)/settings.tsx:171:rgba(0,0,0,0.4)
mobile/app/(app)/shipment.tsx:97:rgba(0,0,0,0.4)
mobile/app/sign-in.tsx:102:rgba(255,255,255,0.6)
mobile/app/sign-in.tsx:91:rgba(255,255,255,0.16)
mobile/app/sign-in.tsx:92:rgba(255,255,255,0.25)
mobile/app/sign-in.tsx:99:rgba(255,255,255,0.82)
mobile/src/components/ui/DateField.tsx:89:rgba(0,0,0,0.4)
mobile/src/components/ui/Select.tsx:98:rgba(0,0,0,0.4)
mobile/src/features/stocks/StorageView.tsx:190:rgba(0,0,0,0.4)
```
```
literal rgba() count: 139
```

## 5. Transparency / opacity utilities
```
     49 opacity-50
     38 opacity-100
     37 opacity-0
     24 opacity-90
     16 opacity-40
     13 opacity-70
      5 opacity-80
      4 opacity-60
      4 backdrop-blur-sm
      3 opacity-75
      3 bg-white/10
      2 bg-white/40
      2 bg-black/40
      2 backdrop-blur-md
      1 opacity-30
      1 opacity-25
      1 opacity-20
      1 opacity-10
      1 bg-white/95
      1 bg-white/90
      1 bg-white/30
      1 bg-opacity-25
      1 bg-black/25
      1 backdrop-blur-xl
      1 backdrop-blur
```

## 6. Font families declared
```
     44  'inherit' 
     29  'Inter_600SemiBold' 
     29  "var(--font-poppins)
     23  var(--font-poppins), 'Poppins', sans-serif
     13  'Inter_600SemiBold'
      8  'inherit'
      6  'Inter_500Medium' 
      4  'Inter_400Regular'
      2  'Inter_700Bold' 
      2  'Inter_500Medium'
      1 next/font/google
      1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif
      1  {
      1  var(--font-poppins), 'Poppins', sans-serif !important
      1  var(--font-poppins), 'Plus Jakarta Sans', sans-serif
      1  inherit
      1  Helvetica, Arial, sans-serif
      1  -apple-system, Helvetica, Arial, sans-serif
      1  'monospace'
      1  'Inter_700Bold'
      1  'Inter_400Regular' 
```
```
files declaring a font-family/fontFamily: 89
files loading a webfont (next/font)     : 1
```

## 7. Box geometry

### 7a. Border radius — named
```
    432 rounded-full
    278 rounded-2xl
    253 rounded-xl
    144 rounded-lg
     78 rounded-md
      9 rounded-none
      5 rounded-3xl
      3 rounded-sm
```
### 7b. Border radius — arbitrary class
```
app/(root)/cashflow/funcs.js:58:rounded-[4px]
components/platform/platformCard1.jsx:35:rounded-[2rem]
components/platform/platformCard2.jsx:61:rounded-[2rem]
```
### 7c. Border radius — inline JS `borderRadius:`
```
     24 radius.md
     14 '16px'
     13 10
     11 4
      9 radius.pill
      9 '12px'
      8 '999px'
      6 12
      6 '8px'
      4 radius.xl
      4 9999
      4 8
      4 3
      4 0 
      3 radius.lg
      3 2
      3 '6px'
      3 "12px"
      2 radius.sm
      2 999 
      2 999
      2 6
      2 20
      2 0
      2 '99px'
      2 '7px'
      2 '50%'
      2 '4px'
      2 '3px' 
      2 '24px'
      2 '20px'
      2 '10px'
      2 '0 9999px 9999px 0' 
      2 "50%"
      1 {
      1 radius['2xl']
      1 radius.lg 
      1 isCollapsed ? "10px" : "10px"
      1 `${isFirst ? '10px' : '0'
      1 5
      1 36
      1 28
      1 24
      1 22
      1 2 
      1 14
      1 1
      1 '3px'
      1 '24px' 
      1 '1rem'
      1 '10px' 
      1 '10px 10px 50px 50px' 
      1 '0 9999px 9999px 0'
      1 "999px"
      1 "16px"
```
### 7d. Padding scale
```
    436 py-1
    349 px-2
    310 py-2
    283 px-3
    159 px-4
    137 p-2
    134 py-0.5
    119 px-1
    108 py-1.5
    100 p-4
     84 p-3
     66 p-1
     59 pt-2
     55 pl-2
     54 pl-1
     52 py-3
     49 pl-4
     43 pt-1
     34 pl-3
     33 p-5
     31 px-2.5
     31 pb-2
     28 py-2.5
     27 pb-4
     25 px-0
     24 pt-0.5
     23 py-24
     21 px-6
     20 py-4
     20 pb-2.5
     19 pr-2
     19 pr-1
     18 px-5
     18 px-1.5
     17 pt-0
     17 p-2.5
     16 py-0
     16 pb-0
     16 p-0
     15 pt-3
     14 pt-4
     14 pr-10
     13 pr-4
     12 px-8
     12 p-1.5
     11 py-8
     11 p-6
     10 pt-6
     10 pb-1
      9 pl-10
      8 p-8
      7 py-6
      7 py-12
      7 pt-8
      7 pb-3
      6 py-20
      6 pr-8
      6 pr-5
      6 pr-3
      4 pt-15
      4 pr-6
      4 pr-24
      3 py-16
      3 py-10
      3 px-28
      3 px-24
      3 px-16
      3 px-12
      3 pt-5
      3 pt-1.5
      3 p-0.5
      2 pt-24
      2 pr-12
      2 pr-0
      2 pl-9
      2 pl-2.5
      2 pb-0.5
      2 p-12
      2 p-10
      1 py-5
      1 py-14
      1 px-3.5
      1 px-10
      1 pt-20
      1 pt-2.5
      1 pt-14
      1 pr-7
      1 pr-1.5
      1 pl-8
      1 pl-7
      1 pl-6
      1 pl-28
      1 pb-6
      1 pb-24
      1 pb-16
      1 pb-10
      1 p-16
```
### 7e. Padding — arbitrary
```
app/(root)/formulas/tabs/fenicr.js:227:pt-[44px]
app/(root)/shipment/page.js:1250:pt-[2px]
components/CommandPalette.js:98:pt-[12vh]
components/NotificationPopups.js:82:py-[1px]
components/modal.js:27:pt-[72px]
components/table/RowsIndicator.js:23:pt-[2px]
```
### 7f. Gap scale
```
    308 gap-2
    130 gap-1
    104 gap-1.5
     92 gap-4
     87 gap-3
     20 gap-0.5
     15 gap-6
     14 gap-x-2
     11 gap-5
      9 gap-x-6
      8 gap-x-3
      8 gap-8
      7 gap-0
      6 gap-y-4
      6 gap-2.5
      5 gap-y-2
      3 gap-y-0.5
      3 gap-y-0
      3 gap-x-4
      2 gap-y-1
      2 gap-12
      2 gap-10
      1 gap-y-2.5
      1 gap-20
      1 gap-16
```
### 7g. Control heights — named `h-N`
```
    127 h-7
    125 h-4
     97 h-8
     93 h-5
     92 h-3.5
     67 h-3
     36 h-6
     30 h-24
     27 h-2
     25 h-10
     24 h-2.5
     10 h-60
     10 h-12
     10 h-1.5
      9 h-80
      7 h-32
      5 h-9
      5 h-16
      5 h-11
      4 h-72
      4 h-20
      4 h-0
      3 h-14
      2 h-96
      2 h-56
      2 h-52
      2 h-48
      2 h-0.5
      1 h-4.5
```
### 7h. Control heights — arbitrary `h-[...]`
```
     28 h-[26px]
     23 h-[28px]
      6 h-[50rem]
      6 h-[32px]
      5 h-[30rem]
      4 h-[60vh]
      4 h-[17px]
      3 h-[260px]
      2 h-[1.86rem]
      1 h-[70vh]
      1 h-[60px]
      1 h-[540px]
      1 h-[520px]
      1 h-[50vh]
      1 h-[460px]
      1 h-[450px]
      1 h-[420px]
      1 h-[40%]
      1 h-[4.5rem]
      1 h-[3px]
      1 h-[30px]
      1 h-[300px]
      1 h-[24px]
      1 h-[20px]
      1 h-[18px]
      1 h-[15px]
      1 h-[140px]
      1 h-[120px]
      1 h-[1000px]
      1 h-[1.84rem]
      1 h-[--radix-select-content-available-height]
```
### 7i. `min-h-[...]` / `max-w-[...]` / `w-[...]` arbitrary
```
     26 min-w-[70px]
     25 max-w-[15rem]
     21 min-h-[28px]
     13 min-w-[120px]
     10 min-w-[400px]
      6 min-w-[100px]
      6 max-h-[50rem]
      5 min-w-[50px]
      5 max-w-[200px]
      5 max-h-[30rem]
      4 min-w-[80px]
      4 min-w-[105px]
      4 max-h-[60vh]
      3 min-w-[640px]
      3 min-h-[260px]
      3 max-w-[12rem]
      2 min-w-[var(--radix-select-trigger-width)]
      2 min-w-[900px]
      2 min-w-[650px]
      2 min-w-[40px]
      2 min-w-[300px]
      2 min-w-[2rem]
      2 min-w-[180px]
      2 min-w-[160px]
      2 min-h-[32px]
      2 max-w-[180px]
      2 max-w-[100px]
      1 min-w-[700px]
      1 min-w-[60px]
      1 min-w-[520px]
      1 min-w-[420px]
      1 min-w-[280px]
      1 min-w-[16rem]
      1 min-w-[15px]
      1 min-w-[122px]
      1 min-w-[10px]
      1 min-h-[60px]
      1 min-h-[20px]
      1 min-h-[140px]
      1 min-h-[120px]
      1 max-w-[94vw]
      1 max-w-[92vw]
      1 max-w-[80px]
      1 max-w-[80%]
      1 max-w-[780px]
      1 max-w-[75%]
      1 max-w-[540px]
      1 max-w-[28rem]
      1 max-w-[210px]
      1 max-w-[18rem]
      1 max-w-[1660px]
      1 max-w-[1540px]
      1 max-w-[120px]
      1 max-w-[10rem]
      1 max-h-[70vh]
      1 max-h-[50vh]
      1 max-h-[4.5rem]
      1 max-h-[300px]
      1 max-h-[1000px]
      1 max-h-[--radix-select-content-available-height]
```
### 7j. Shadow variance
```
    126 shadow-lg
    122 shadow-sm
     66 shadow-md
     27 shadow-xl
     17 shadow-2xl
     10 shadow-none
      6 shadow-[var(--endeavour)]
      3 shadow-[inset_0_0_0_1px_var(--border-neutral-strong)]
      2 shadow-[var(--selago)]
      1 shadow-inner
      1 shadow-[0_16px_50px_rgba(var(--endeavour-rgb),0.28)]
```

## 8. z-index
### 8a. Tailwind classes
```
     53 z-10
     28 z-50
     11 z-20
     10 z-[15]
      9 z-[9999]
      4 z-[9998]
      4 z-40
      4 z-0
      3 z-[100]
      3 z-[10000]
      3 z-[100000]
      2 z-[70]
      1 z-[9990]
      1 z-[60]
      1 z-[50]
      1 z-[25]
      1 z-[220]
      1 z-[210]
      1 z-[200]
      1 z-[20000]
      1 z-[101]
      1 z-30
```
### 8b. Inline / CSS `zIndex` — every distinct value
```
      4 0
     21 1
      2 5
      2 10
      1 15
      1 20
      2 50
      1 60
      1 999
      5 9999
      3 99999
      2 999998
      3 999999
```
### 8c. Every z-index site with file:line
```
app/(root)/ContractsReview&Statement/newTable.js:282:z-[15]
app/(root)/InvoicesReview&Statement/newTable.js:243:z-[15]
app/(root)/_components/MainNav.js:125:z-50
app/(root)/_components/MainNav.js:169:z-[9999]
app/(root)/_components/MainNav.js:251:z-[9999]
app/(root)/_components/MainNav.js:91:z-[100]
app/(root)/_components/SideBar.js:170:zIndex: 0
app/(root)/_components/SideBar.js:445:zIndex: 0
app/(root)/_components/SideBarMini.js:112:z-[100]
app/(root)/_components/SideBarMini.js:128:z-[101]
app/(root)/_components/SideBarMini.js:170:z-[20000]
app/(root)/accounting/newTable.js:216:z-[15]
app/(root)/accstatement/components/comboboxSelect.js:57:z-[9999]
app/(root)/accstatement/newTable.js:200:z-[15]
app/(root)/accstatement/newTable.js:289:zIndex: 1
app/(root)/cashflow/dialogClient.js:75:z-50
app/(root)/cashflow/dialogSupplier.js:92:z-50
app/(root)/cashflow/invPopup.js:157:zIndex: 0
app/(root)/cashflow/invPopup.js:160:zIndex: 1
app/(root)/cashflow/invPopup.js:420:zIndex: 0
app/(root)/cashflow/invPopup.js:423:zIndex: 1
app/(root)/cashflow/sumBasket.js:77:z-40
app/(root)/cashflow/yearSelect.js:29:z-50
app/(root)/companyexpenses/newTable.js:225:z-[15]
app/(root)/contracts/modals/poInvModal.js:572:z-50
app/(root)/contracts/modals/productsTable.js:371:z-50
app/(root)/contracts/modals/productsTable.js:378:z-50
app/(root)/contracts/modals/productsTableInvoice.js:511:z-50
app/(root)/contracts/modals/productsTableInvoice.js:530:z-50
app/(root)/contracts/modals/productsTableInvoice.js:558:z-50
app/(root)/contracts/newTable.js:246:z-[15]
app/(root)/contractsstatement/newTable.js:335:z-[15]
app/(root)/contractsstatement/totals/tableTotals.js:115:zIndex: 1
app/(root)/expenses/newTable.js:998:z-[15]
app/(root)/invoicesstatement/newTable.js:215:z-[15]
app/(root)/layout.js:45:z-30
app/(root)/margins/components/select.js:63:z-40
app/(root)/margins/newTable.js:84:zIndex: 1
app/(root)/margins/thirdpart.js:158:zIndex: 1
app/(root)/margins/thirdpart.js:174:zIndex: 1
app/(root)/margins/thirdpart.js:197:zIndex: 1
app/(root)/margins/thirdpart.js:239:zIndex: 1
app/(root)/margins/thirdpart.js:264:zIndex: 1
app/(root)/margins/thirdpart.js:312:zIndex: 1
app/(root)/margins/thirdpart.js:329:zIndex: 1
app/(root)/margins/thirdpart.js:352:zIndex: 1
app/(root)/margins/thirdpart.js:393:zIndex: 1
app/(root)/margins/thirdpart.js:418:zIndex: 1
app/(root)/materialtables/newTable.js:370:zIndex: 50
app/(root)/materialtables/newTable.js:410:zIndex: 60
app/(root)/settings/_components/combobox.js:42:z-50
app/(root)/settings/_components/stocksComb.js:48:z-50
app/(root)/shipment/page.js:1062:zIndex: 15
app/(root)/shipment/page.js:1254:z-50
app/(root)/shipment/page.js:151:z-[200]
app/(root)/shipment/page.js:222:zIndex: 99999
app/(root)/shipment/page.js:744:z-index: 20
app/(root)/shipment/page.js:753:zIndex: 99999
app/(root)/shipment/page.js:782:z-[25]
app/(root)/specialinvoices/newTable.js:248:z-[15]
app/(root)/stocks/newTable.js:319:zIndex: 1
app/(root)/stocks/stockAudit.js:315:zIndex: 1
app/(root)/stocks/stockAudit.js:365:zIndex: 1
app/(root)/stocks/stockAudit.js:399:zIndex: 1
app/(root)/stocks/stockAudit.js:433:zIndex: 1
app/(root)/stocks/stockAudit.js:461:zIndex: 1
app/(root)/stocks/sumtables/gradeTable.js:109:zIndex: 10
app/(root)/storagecosts/page.js:72:z-[9998]
app/(root)/storagecosts/page.js:73:z-[9999]
app/globals.css:500:z-index: 9999
app/styles/global-table.css:39:z-index: 5
components/AutosavePill.js:12:z-[9990]
components/CommandPalette.js:86:z-40
components/CommandPalette.js:98:z-[100]
components/Dashboard/HeadlineTicker.js:196:zIndex: 10
components/DocumentImportOverlay.js:400:z-[100000]
components/DocumentImportOverlay.js:589:z-[10000]
components/FloatingChat.js:603:zIndex: 99999
components/GlobalSearch.js:209:z-50
components/Navbar/navbar.jsx:22:z-[10000]
components/NotificationBell.js:255:z-[9999]
components/NotificationBell.js:383:zIndex: 5
components/NotificationPopups.js:139:z-[9998]
components/PdfPreview.js:63:z-[100000]
components/SplitControl.js:169:z-[10000]
components/combobox.js:116:z-50
components/comboboxSelectStock.js:29:zIndex: 9999
components/comboboxSelectStock.js:85:z-50
components/comboboxStockAvailability.js:112:z-50
components/comboboxStockAvailability.js:72:zIndex: 9999
components/dateRangePicker.js:211:z-[50]
components/dateRangePicker.js:77:z-index: 9999
components/invoicePrdSlct.js:50:zIndex: 9999
components/invoices/ReminderModal.js:130:z-[100000]
components/layout/Header.tsx:7:z-40
components/modal.js:13:z-[60]
components/modalCopyInvoice.js:19:z-50
components/modalCopyInvoice.js:20:z-50
components/modalCopyInvoice.js:25:z-50
components/selectors/selectShad.js:50:z-50
components/selectors/selectShad.js:58:z-[9999]
components/spinTable.js:5:z-50
components/spinner.js:7:z-50
components/table/ColumnsFilter.js:120:zIndex: 999998
components/table/ColumnsFilter.js:67:zIndex: 999999
components/table/ColumnsFilter.js:71:zIndex: 999999
components/table/RowsIndicator.js:40:z-50
components/table/inlineEditing/EditableSelectCell.js:154:z-[9999]
components/table/inlineEditing/EditableSelectCell.js:224:z-[9998]
components/table/inlineEditing/EditableSelectCell.js:238:z-[9998]
components/table/quicksum/QuickSumControl.js:134:zIndex: 999998
components/table/quicksum/QuickSumControl.js:60:zIndex: 999999
components/toast.js:33:z-[70]
components/toast.js:44:z-[70]
components/ui/dialog.tsx:22:z-[210]
components/ui/dialog.tsx:39:z-[220]
components/ui/popover.tsx:22:z-50
components/ui/select.tsx:78:z-[9999]
components/ui/tooltip.tsx:23:z-[9999]
components/videoLoader.js:12:z-50
components/yearSelect.js:12:z-50
mobile/src/components/OfflineBanner.tsx:23:zIndex: 50
mobile/src/components/PrivacyLock.tsx:65:zIndex: 999
utils/globalSearch/GlobalSearchBar.js:51:z-50
```

## 9. Modals / dialogs / popups / drawers / toasts / tooltips

### 9a. Files mentioning any of those words
```
count: 157
```
### 9b. Files that RENDER an overlay themselves
```
app/(root)/contracts/modals/poInvModal.js
app/(root)/storagecosts/page.js
components/CommandPalette.js
components/DocumentImportOverlay.js
components/PdfPreview.js
components/SplitControl.js
components/idle.js
components/invoices/ReminderModal.js
components/modal.js
components/table/inlineEditing/EditableSelectCell.js
components/ui/dialog.tsx
components/videoLoader.js
```
### 9c. Every overlay declaration, with its classes
```
app/(root)/contracts/modals/poInvModal.js:572:fixed inset-0 z-50 flex items-center justify-center
app/(root)/storagecosts/page.js:72:fixed inset-0 z-[9998]
components/CommandPalette.js:98:fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4
components/DocumentImportOverlay.js:400:fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4
components/PdfPreview.js:63:fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4
components/SplitControl.js:169:fixed inset-0 z-[10000] flex items-center justify-center p-4
components/idle.js:95:fixed inset-0 bg-black/25
components/idle.js:98:fixed inset-0 overflow-y-auto
components/invoices/ReminderModal.js:130:fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4
components/modal.js:23:fixed inset-0 bg-black bg-opacity-25
components/modal.js:26:fixed inset-0 overflow-y-auto
components/table/inlineEditing/EditableSelectCell.js:224:fixed inset-0 z-[9998]
components/table/inlineEditing/EditableSelectCell.js:238:fixed inset-0 z-[9998]
components/ui/dialog.tsx:22:fixed inset-0 z-[210] bg-black/40  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
components/videoLoader.js:12:fixed inset-0 flex items-center justify-center z-50 bg-[rgba(var(--surface-card-rgb),0.6)] backdrop-blur-[2px]
```
### 9d. Consumers of the Headless-UI wrapper `components/modal.js`
```
app/(root)/companyexpenses/modals/findInvoiceModal.js
app/(root)/contracts/modals/contractDetails.js
app/(root)/contracts/modals/invoiceDetails.js
app/(root)/invoices/page.js
app/(root)/settings/_components/dataModal.js
app/(root)/specialinvoices/page.js
app/(root)/stocks/SharedStock.js
components/findContract4Materials.js
```
### 9e. Consumers of the Radix wrapper `components/ui/dialog.tsx`
```
app/(root)/cashflow/invPopup.js
components/modalToProceed.js
components/ui/command.tsx
```
### 9f. `max-w-*` on panels (modal width spread)
```
     27 max-w-full
     25 max-w-[15rem]
     12 max-w-md
      9 max-w-2xl
      8 max-w-3xl
      7 max-w-lg
      6 max-w-xs
      6 max-w-7xl
      6 max-w-4xl
      5 max-w-sm
      5 max-w-[200px]
      5 max-w-5xl
      4 max-w-xl
      4 max-w-6xl
      3 max-w-[12rem]
      2 max-w-[180px]
      2 max-w-[100px]
      1 max-w-[94vw]
      1 max-w-[92vw]
      1 max-w-[80px]
      1 max-w-[80%]
      1 max-w-[780px]
      1 max-w-[75%]
      1 max-w-[540px]
      1 max-w-[28rem]
      1 max-w-[210px]
      1 max-w-[18rem]
      1 max-w-[1660px]
      1 max-w-[1540px]
      1 max-w-[120px]
      1 max-w-[10rem]
```

## 10. Dark-mode mechanism

This project does **not** use Tailwind `dark:` variants. Dark mode is implemented by
swapping CSS-variable *values* on `<html>` (`utils/themes.js` → `applyTheme()`), so
the correct dark-mode test is **"does this file use var() tokens or hardcoded colours"**,
not "does it have a dark: variant".
```
files using a dark: variant at all: 2
components/ui/button.jsx
mobile/src/theme/ThemeProvider.tsx
```
