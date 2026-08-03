# INVENTORY — every UI-producing file

Generated Phase 1.1, scoped Phase 0. **Source of truth for audit progress.**

- **Y (in scope) = 316** — every status update refers to this number.
- Total enumerated = 508. Out-of-scope rows are kept, never deleted (Rule Zero #3: no silent skips).
- Scope decided by Zak: **IMS app screens only**; public marketing site and mobile Expo app are out.
- Orphan routes (`analysis`, `contractsstatement`, `invoicesstatement`) are **IN** by decision.
- Excluded from enumeration entirely: `node_modules`, `.next`, `backups`, `tests`, `__tests__`.

| # | File path | Type | Audited | Issues |
|---|-----------|------|---------|--------|
| 1 | actions/pass.js | util | [ ] | - |
| 2 | actions/validations.js | util | [ ] | - |
| 3 | app/(auth)/passes/page.js | page | [ ] | - |
| 4 | app/(auth)/signin/login.js | component | [x] | 032,034 |
| 5 | app/(auth)/signup/page.js | page | [x] | 032 |
| 6 | app/(root)/ContractsReview&Statement/excel.js | export-doc | [ ] | - |
| 7 | app/(root)/ContractsReview&Statement/funcs.js | component | [ ] | - |
| 8 | app/(root)/ContractsReview&Statement/newTable.js | component | [ ] | - |
| 9 | app/(root)/ContractsReview&Statement/page.js | page | [ ] | - |
| 10 | app/(root)/InvoicesReview&Statement/excel.js | export-doc | [ ] | - |
| 11 | app/(root)/InvoicesReview&Statement/newTable.js | component | [ ] | - |
| 12 | app/(root)/InvoicesReview&Statement/page.js | page | [ ] | - |
| 13 | app/(root)/_components/MainNav.js | component | [ ] | - |
| 14 | app/(root)/_components/SideBar.js | component | [ ] | - |
| 15 | app/(root)/_components/SideBar.module.css | style | [ ] | - |
| 16 | app/(root)/_components/SideBarMini.js | component | [ ] | - |
| 17 | app/(root)/_components/companySelect.js | component | [ ] | - |
| 18 | app/(root)/accounting/LazyCharts.js | component | [ ] | - |
| 19 | app/(root)/accounting/excel.js | export-doc | [ ] | - |
| 20 | app/(root)/accounting/newTable.js | component | [ ] | - |
| 21 | app/(root)/accounting/page.js | page | [ ] | - |
| 22 | app/(root)/accstatement/components/comboboxSelect.js | component | [x] | 030 |
| 23 | app/(root)/accstatement/components/select.js | component | [ ] | - |
| 24 | app/(root)/accstatement/disabledDates.js | component | [ ] | - |
| 25 | app/(root)/accstatement/excel.js | export-doc | [ ] | - |
| 26 | app/(root)/accstatement/func.js | component | [ ] | - |
| 27 | app/(root)/accstatement/newTable.js | component | [ ] | - |
| 28 | app/(root)/accstatement/page.js | page | [ ] | - |
| 29 | app/(root)/activity/page.js | page | [ ] | - |
| 30 | app/(root)/analysis/excel.js | export-doc | [ ] | - |
| 31 | app/(root)/analysis/newTable.js | component | [ ] | - |
| 32 | app/(root)/analysis/page.js | page | [ ] | - |
| 33 | app/(root)/apps/Assistant/page.js | page | [ ] | - |
| 34 | app/(root)/cashflow/ForecastPanel.js | component | [ ] | - |
| 35 | app/(root)/cashflow/accordion.js | component | [ ] | - |
| 36 | app/(root)/cashflow/dialogClient.js | modal | [ ] | - |
| 37 | app/(root)/cashflow/dialogSupplier.js | modal | [ ] | - |
| 38 | app/(root)/cashflow/excel.js | export-doc | [ ] | - |
| 39 | app/(root)/cashflow/funcs.js | component | [ ] | - |
| 40 | app/(root)/cashflow/invPopup.js | modal | [ ] | - |
| 41 | app/(root)/cashflow/page.js | page | [ ] | - |
| 42 | app/(root)/cashflow/sumBasket.js | component | [ ] | - |
| 43 | app/(root)/cashflow/yearSelect.js | component | [ ] | - |
| 44 | app/(root)/companyexpenses/excel.js | export-doc | [ ] | - |
| 45 | app/(root)/companyexpenses/modals/dataModal.js | modal | [ ] | - |
| 46 | app/(root)/companyexpenses/modals/expenses.js | modal | [ ] | - |
| 47 | app/(root)/companyexpenses/modals/findInvoiceModal.js | modal | [ ] | - |
| 48 | app/(root)/companyexpenses/newTable.js | component | [ ] | - |
| 49 | app/(root)/companyexpenses/page.js | page | [ ] | - |
| 50 | app/(root)/companyexpenses/totals/funcs.js | component | [ ] | - |
| 51 | app/(root)/companyexpenses/totals/tableTotals.js | component | [ ] | - |
| 52 | app/(root)/contracts/excel.js | export-doc | [ ] | - |
| 53 | app/(root)/contracts/modals/CertChecker.js | modal | [ ] | - |
| 54 | app/(root)/contracts/modals/annexVII.js | modal | [ ] | - |
| 55 | app/(root)/contracts/modals/contractDetails.js | modal | [ ] | - |
| 56 | app/(root)/contracts/modals/dataModal.js | modal | [ ] | - |
| 57 | app/(root)/contracts/modals/delayedResponse.js | modal | [ ] | - |
| 58 | app/(root)/contracts/modals/expenses.js | modal | [ ] | - |
| 59 | app/(root)/contracts/modals/filesModal.js | modal | [ ] | - |
| 60 | app/(root)/contracts/modals/finalSettlmentModal.js | modal | [ ] | - |
| 61 | app/(root)/contracts/modals/finalSettlmentRemarks.js | modal | [ ] | - |
| 62 | app/(root)/contracts/modals/invoiceDetails.js | modal | [ ] | - |
| 63 | app/(root)/contracts/modals/invoiceType.js | modal | [ ] | - |
| 64 | app/(root)/contracts/modals/isf.js | modal | [ ] | - |
| 65 | app/(root)/contracts/modals/payments.js | modal | [ ] | - |
| 66 | app/(root)/contracts/modals/pdf/pdfAccountStatement.js | export-doc | [ ] | - |
| 67 | app/(root)/contracts/modals/pdf/pdfAnnexVII.js | export-doc | [ ] | - |
| 68 | app/(root)/contracts/modals/pdf/pdfContract.js | export-doc | [ ] | - |
| 69 | app/(root)/contracts/modals/pdf/pdfFinal.js | export-doc | [ ] | - |
| 70 | app/(root)/contracts/modals/pdf/pdfISF.js | export-doc | [ ] | - |
| 71 | app/(root)/contracts/modals/pdf/pdfInvoice.js | export-doc | [ ] | - |
| 72 | app/(root)/contracts/modals/pdfInvoiceFnlCncl.js | export-doc | [ ] | - |
| 73 | app/(root)/contracts/modals/poInvModal.js | modal | [ ] | - |
| 74 | app/(root)/contracts/modals/priceRemarks.js | modal | [ ] | - |
| 75 | app/(root)/contracts/modals/productsTable.js | modal | [ ] | - |
| 76 | app/(root)/contracts/modals/productsTableInvoice.js | modal | [ ] | - |
| 77 | app/(root)/contracts/modals/remarks.js | modal | [ ] | - |
| 78 | app/(root)/contracts/modals/remarksSelection.js | modal | [ ] | - |
| 79 | app/(root)/contracts/modals/tabs/inventory.js | modal | [ ] | - |
| 80 | app/(root)/contracts/modals/tabs/pnl.js | modal | [ ] | - |
| 81 | app/(root)/contracts/modals/tabs/pnlTables.js | modal | [ ] | - |
| 82 | app/(root)/contracts/modals/tabs/refPurchaseInvoices.js | modal | [ ] | - |
| 83 | app/(root)/contracts/modals/tabs/tabs.js | modal | [ ] | - |
| 84 | app/(root)/contracts/modals/tabs/totalPnlTable.js | modal | [ ] | - |
| 85 | app/(root)/contracts/modals/whModal.js | modal | [ ] | - |
| 86 | app/(root)/contracts/newTable.js | component | [ ] | - |
| 87 | app/(root)/contracts/page.js | page | [ ] | - |
| 88 | app/(root)/contracts/style.css | style | [ ] | - |
| 89 | app/(root)/contractsstatement/excel.js | export-doc | [ ] | - |
| 90 | app/(root)/contractsstatement/newTable.js | component | [ ] | - |
| 91 | app/(root)/contractsstatement/newTable1.js | component | [ ] | - |
| 92 | app/(root)/contractsstatement/shipmentStatus.js | component | [ ] | - |
| 93 | app/(root)/contractsstatement/soldStatus.js | component | [ ] | - |
| 94 | app/(root)/contractsstatement/totals/funcs.js | component | [ ] | - |
| 95 | app/(root)/contractsstatement/totals/tableTotals.js | component | [ ] | - |
| 96 | app/(root)/dashboard/LazyCharts.js | component | [ ] | - |
| 97 | app/(root)/dashboard/charts.js | component | [ ] | - |
| 98 | app/(root)/dashboard/funcs.js | component | [ ] | - |
| 99 | app/(root)/dashboard/page.js | page | [ ] | - |
| 100 | app/(root)/dashboard/pin.js | component | [ ] | - |
| 101 | app/(root)/expenses/excel.js | export-doc | [ ] | - |
| 102 | app/(root)/expenses/modals/dataModal.js | modal | [ ] | - |
| 103 | app/(root)/expenses/modals/expenses.js | modal | [ ] | - |
| 104 | app/(root)/expenses/modals/filesModal.js | modal | [ ] | - |
| 105 | app/(root)/expenses/newTable.js | component | [ ] | - |
| 106 | app/(root)/expenses/page.js | page | [ ] | - |
| 107 | app/(root)/expenses/totals/funcs.js | component | [ ] | - |
| 108 | app/(root)/expenses/totals/tableTotals.js | component | [ ] | - |
| 109 | app/(root)/formulas/page.js | page | [ ] | - |
| 110 | app/(root)/formulas/tabs/fenicr.js | component | [ ] | - |
| 111 | app/(root)/formulas/tabs/stainless.js | component | [ ] | - |
| 112 | app/(root)/formulas/tabs/supperalloys.js | component | [ ] | - |
| 113 | app/(root)/incoterms/page.js | page | [ ] | - |
| 114 | app/(root)/invoices/excel.js | export-doc | [ ] | - |
| 115 | app/(root)/invoices/modals/dataModal.js | modal | [ ] | - |
| 116 | app/(root)/invoices/modals/delayedResponse.js | modal | [ ] | - |
| 117 | app/(root)/invoices/modals/invoiceDetails.js | modal | [ ] | - |
| 118 | app/(root)/invoices/modals/invoiceType.js | modal | [ ] | - |
| 119 | app/(root)/invoices/page.js | page | [ ] | - |
| 120 | app/(root)/invoices/style.css | style | [ ] | - |
| 121 | app/(root)/invoicesstatement/excel.js | export-doc | [ ] | - |
| 122 | app/(root)/invoicesstatement/funcs.js | component | [ ] | - |
| 123 | app/(root)/invoicesstatement/newTable.js | component | [ ] | - |
| 124 | app/(root)/invoicesstatement/sumtables/newTableTotals.js | component | [ ] | - |
| 125 | app/(root)/invoicesstatement/sumtables/sumTablesClients.js | component | [ ] | - |
| 126 | app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js | component | [ ] | - |
| 127 | app/(root)/invoicesstatement/sumtables/sumTablesSuppliers.js | component | [ ] | - |
| 128 | app/(root)/layout.js | layout | [ ] | - |
| 129 | app/(root)/margins/components/dtpicker.js | component | [ ] | - |
| 130 | app/(root)/margins/components/input.js | component | [ ] | - |
| 131 | app/(root)/margins/components/select.js | component | [ ] | - |
| 132 | app/(root)/margins/firstpart.js | component | [ ] | - |
| 133 | app/(root)/margins/funcs.js | component | [ ] | - |
| 134 | app/(root)/margins/marginTable.js | component | [ ] | - |
| 135 | app/(root)/margins/newTable.js | component | [ ] | - |
| 136 | app/(root)/margins/page.js | page | [ ] | - |
| 137 | app/(root)/margins/thirdpart.js | component | [ ] | - |
| 138 | app/(root)/materialtables/constants.js | component | [ ] | - |
| 139 | app/(root)/materialtables/excel.js | export-doc | [ ] | - |
| 140 | app/(root)/materialtables/newTable.js | component | [ ] | - |
| 141 | app/(root)/materialtables/page.js | page | [ ] | - |
| 142 | app/(root)/materialtables/pdfTable.js | export-doc | [ ] | - |
| 143 | app/(root)/materialtables/totals.js | component | [ ] | - |
| 144 | app/(root)/salescontracts/components/productsTable.js | component | [ ] | - |
| 145 | app/(root)/salescontracts/modals/dataModal.js | modal | [ ] | - |
| 146 | app/(root)/salescontracts/modals/salesContractDetails.js | modal | [ ] | - |
| 147 | app/(root)/salescontracts/page.js | page | [ ] | - |
| 148 | app/(root)/settings/_components/combobox.js | component | [ ] | - |
| 149 | app/(root)/settings/_components/dataModal.js | modal | [ ] | - |
| 150 | app/(root)/settings/_components/stocksComb.js | component | [ ] | - |
| 151 | app/(root)/settings/_components/userData.js | component | [ ] | - |
| 152 | app/(root)/settings/page.js | page | [ ] | - |
| 153 | app/(root)/settings/tabs/bankAccounts.js | component | [ ] | - |
| 154 | app/(root)/settings/tabs/buttons.js | component | [ ] | - |
| 155 | app/(root)/settings/tabs/clients.js | component | [ ] | - |
| 156 | app/(root)/settings/tabs/documents.js | component | [ ] | - |
| 157 | app/(root)/settings/tabs/emailSetup.js | component | [ ] | - |
| 158 | app/(root)/settings/tabs/general.js | component | [ ] | - |
| 159 | app/(root)/settings/tabs/logos.js | component | [ ] | - |
| 160 | app/(root)/settings/tabs/setup.js | component | [ ] | - |
| 161 | app/(root)/settings/tabs/stocks.js | component | [ ] | - |
| 162 | app/(root)/settings/tabs/suppliers.js | component | [ ] | - |
| 163 | app/(root)/settings/tabs/tables/newTable.js | component | [ ] | - |
| 164 | app/(root)/settings/tabs/users.js | component | [ ] | - |
| 165 | app/(root)/shipment/page.js | page | [ ] | - |
| 166 | app/(root)/specialinvoices/excel.js | export-doc | [ ] | - |
| 167 | app/(root)/specialinvoices/newTable.js | component | [ ] | - |
| 168 | app/(root)/specialinvoices/page.js | page | [ ] | - |
| 169 | app/(root)/specialinvoices/totals/funcs.js | component | [ ] | - |
| 170 | app/(root)/specialinvoices/totals/tableTotals.js | component | [ ] | - |
| 171 | app/(root)/stocks/SharedStock.js | component | [ ] | - |
| 172 | app/(root)/stocks/agingUtils.js | component | [ ] | - |
| 173 | app/(root)/stocks/excel.js | export-doc | [ ] | - |
| 174 | app/(root)/stocks/newTable.js | component | [ ] | - |
| 175 | app/(root)/stocks/page.js | page | [ ] | - |
| 176 | app/(root)/stocks/shipmentsTable.js | component | [ ] | - |
| 177 | app/(root)/stocks/stockAudit.js | component | [ ] | - |
| 178 | app/(root)/stocks/storageAging.js | component | [ ] | - |
| 179 | app/(root)/stocks/sumtables/gradeTable.js | component | [ ] | - |
| 180 | app/(root)/stocks/sumtables/sumTable.js | component | [ ] | - |
| 181 | app/(root)/stocks/sumtables/tableTotals.js | component | [ ] | - |
| 182 | app/(root)/stocks/sumtables/tablesFuncs.js | component | [ ] | - |
| 183 | app/(root)/stocks/whModal.js | modal | [ ] | - |
| 184 | app/(root)/storagecosts/page.js | page | [ ] | - |
| 185 | app/(root)/storagecosts/storageUtils.js | component | [ ] | - |
| 186 | app/(root)/tableStyles.css | style | [ ] | - |
| 187 | app/dTable.js | component | [ ] | - |
| 188 | app/globals.css | style | [x] | 006-013 |
| 189 | app/layout.js | layout | [x] | none - font loading correct |
| 190 | app/providers.js | component | [ ] | - |
| 191 | app/styles/global-table.css | style | [ ] | - |
| 192 | components.json | config | [x] | none |
| 193 | components/ActivityLog.js | component | [ ] | - |
| 194 | components/AutosavePill.js | component | [ ] | - |
| 195 | components/CommandPalette.js | component | [ ] | - |
| 196 | components/CommentThread.js | component | [ ] | - |
| 197 | components/Dashboard/AIAlertsBar.js | component | [ ] | - |
| 198 | components/Dashboard/HeadlineTicker.js | component | [ ] | - |
| 199 | components/Dashboard/MarketsTicker.js | component | [ ] | - |
| 200 | components/DocumentImportOverlay.js | component | [ ] | - |
| 201 | components/FloatingChat.js | component | [ ] | - |
| 202 | components/GlobalSearch.js | component | [ ] | - |
| 203 | components/NotificationBell.js | component | [ ] | - |
| 204 | components/NotificationPopups.js | modal | [ ] | - |
| 205 | components/PdfPagesView.js | component | [ ] | - |
| 206 | components/PdfPreview.js | component | [ ] | - |
| 207 | components/SplitControl.js | component | [ ] | - |
| 208 | components/StatusBadge.js | component | [x] | 024 |
| 209 | components/backToLoginPage.js | component | [ ] | - |
| 210 | components/calculate.js | component | [ ] | - |
| 211 | components/checkbox.js | component | [x] | none |
| 212 | components/combobox.js | component | [x] | 030 |
| 213 | components/comboboxPNL.js | component | [x] | 029,030 |
| 214 | components/comboboxProductSelect.js | component | [x] | 029,030 |
| 215 | components/comboboxRemarks.js | component | [x] | 029,030 |
| 216 | components/comboboxSelectStock.js | component | [x] | 030 |
| 217 | components/comboboxStockAvailability.js | component | [x] | 029,030 |
| 218 | components/comboboxWH.js | component | [x] | 029,030 |
| 219 | components/const.js | component | [ ] | - |
| 220 | components/dateRangePicker.js | component | [ ] | - |
| 221 | components/exchangeApi.js | component | [ ] | - |
| 222 | components/findContract4Materials.js | component | [ ] | - |
| 223 | components/idle.js | component | [x] | 019,034 |
| 224 | components/index.js | component | [ ] | - |
| 225 | components/invoicePrdSlct.js | component | [ ] | - |
| 226 | components/invoices/ReminderModal.js | modal | [ ] | - |
| 227 | components/layout/Header.tsx | component | [ ] | - |
| 228 | components/list.js | component | [ ] | - |
| 229 | components/modal.js | modal | [x] | 017,020,022,033 |
| 230 | components/modalCopyInvoice.js | modal | [x] | 032 |
| 231 | components/modalToProceed.js | modal | [ ] | - |
| 232 | components/monthSelect.js | component | [ ] | - |
| 233 | components/selectWH.js | component | [ ] | - |
| 234 | components/selectors/selectShad.js | component | [ ] | - |
| 235 | components/selectors/selectWH.js | component | [ ] | - |
| 236 | components/signOut.js | component | [ ] | - |
| 237 | components/skeletons.js | component | [x] | 033 |
| 238 | components/spinTable.js | component | [ ] | - |
| 239 | components/spinner.js | component | [x] | 027 |
| 240 | components/statusUtils.js | component | [x] | none |
| 241 | components/switch.js | component | [x] | none |
| 242 | components/table/ColumnsFilter.js | component | [ ] | - |
| 243 | components/table/EditableCell.js | component | [ ] | - |
| 244 | components/table/Paginator.js | component | [ ] | - |
| 245 | components/table/RowsIndicator.js | component | [ ] | - |
| 246 | components/table/filters/date-between-filter.js | component | [ ] | - |
| 247 | components/table/filters/filterFunc.js | component | [ ] | - |
| 248 | components/table/filters/filters.js | component | [ ] | - |
| 249 | components/table/filters/labelAwareGlobalFilter.js | component | [ ] | - |
| 250 | components/table/filters/resetTabe.js | component | [ ] | - |
| 251 | components/table/header.js | component | [ ] | - |
| 252 | components/table/inlineEditing/EditableCell.js | component | [ ] | - |
| 253 | components/table/inlineEditing/EditableSelectCell.js | component | [ ] | - |
| 254 | components/table/quicksum/QuickSumControl.js | component | [ ] | - |
| 255 | components/table/quicksum/detectNumericCols.js | component | [ ] | - |
| 256 | components/table/quicksum/numberUtils.js | component | [ ] | - |
| 257 | components/table/quicksum/useQuickSum.js | hook | [ ] | - |
| 258 | components/tablePnl.js | component | [ ] | - |
| 259 | components/tlTip.js | component | [x] | none |
| 260 | components/toast.js | component | [x] | 025,026,033 |
| 261 | components/tooltip.js | component | [x] | 032 |
| 262 | components/ui/accordion.tsx | component | [x] | 032 |
| 263 | components/ui/avatar.tsx | component | [x] | none |
| 264 | components/ui/button.jsx | component | [x] | 014,016 |
| 265 | components/ui/button.tsx | component | [ ] | - |
| 266 | components/ui/command.tsx | component | [x] | 036,033 |
| 267 | components/ui/dialog.tsx | modal | [x] | 018,020,021,022,033 |
| 268 | components/ui/input.tsx | component | [x] | 023,033 |
| 269 | components/ui/popover.tsx | component | [x] | 033 |
| 270 | components/ui/select.tsx | component | [x] | 028,030,033 |
| 271 | components/ui/switch.tsx | component | [x] | none |
| 272 | components/ui/table.tsx | component | [x] | 036 |
| 273 | components/ui/tooltip.tsx | component | [x] | 027 |
| 274 | components/videoLoader.js | component | [ ] | - |
| 275 | components/yearSelect.js | component | [ ] | - |
| 276 | contexts/useAuthContext.js | context | [ ] | - |
| 277 | contexts/useContractsContext.js | context | [ ] | - |
| 278 | contexts/useExpensesContext.js | context | [ ] | - |
| 279 | contexts/useGlobalSearchContext.js | context | [ ] | - |
| 280 | contexts/useInvoiceContext.js | context | [ ] | - |
| 281 | contexts/useNotificationContext.js | context | [ ] | - |
| 282 | contexts/useSalesContractsContext.js | context | [ ] | - |
| 283 | contexts/useSettingsContext.js | context | [ ] | - |
| 284 | contexts/useThemeContext.js | context | [ ] | - |
| 285 | hooks/use-mobile.js | hook | [ ] | - |
| 286 | hooks/use-toast.js | hook | [ ] | - |
| 287 | hooks/useContractsState.js | hook | [ ] | - |
| 288 | hooks/useExchangeRates.js | hook | [ ] | - |
| 289 | hooks/useExpensesState.js | hook | [ ] | - |
| 290 | hooks/useInlineEdit.js | hook | [ ] | - |
| 291 | hooks/useInvoiceState.js | hook | [ ] | - |
| 292 | hooks/useMetalPrices.js | hook | [ ] | - |
| 293 | hooks/useSalesContractsState.js | hook | [ ] | - |
| 294 | hooks/useSettingsState.js | hook | [ ] | - |
| 295 | lib/utils.js | util | [ ] | - |
| 296 | next.config.mjs | config | [x] | none |
| 297 | postcss.config.mjs | config | [x] | none |
| 298 | tailwind.config.js | config | [x] | 001,002 |
| 299 | utils/aiClient.js | util | [ ] | - |
| 300 | utils/aiGuard.js | util | [ ] | - |
| 301 | utils/chartTheme.js | util | [ ] | - |
| 302 | utils/finance.js | util | [ ] | - |
| 303 | utils/firebase.js | util | [ ] | - |
| 304 | utils/fxRates.js | util | [ ] | - |
| 305 | utils/globalSearch/GlobalSearchBar.js | util | [ ] | - |
| 306 | utils/globalSearch/GlobalSearchLoader.js | util | [ ] | - |
| 307 | utils/languages.js | util | [ ] | - |
| 308 | utils/loadCache.js | util | [ ] | - |
| 309 | utils/notificationPriority.js | util | [ ] | - |
| 310 | utils/notificationRouting.js | util | [ ] | - |
| 311 | utils/pdfExtract.js | export-doc | [ ] | - |
| 312 | utils/pdfPolyfill.js | export-doc | [ ] | - |
| 313 | utils/pureHelpers.js | util | [ ] | - |
| 314 | utils/splitUtils.js | util | [ ] | - |
| 315 | utils/themes.js | util | [ ] | - |
| 316 | utils/utils.js | util | [ ] | - |

---

## Out of scope (enumerated, not audited)

| # | File path | Type | Reason |
|---|-----------|------|--------|
| 317 | app/(public)/about/page.jsx | page | marketing |
| 318 | app/(public)/blog/[slug]/page.jsx | page | marketing |
| 319 | app/(public)/blog/page.jsx | page | marketing |
| 320 | app/(public)/contact/page.jsx | page | marketing |
| 321 | app/(public)/features/page.jsx | page | marketing |
| 322 | app/(public)/landing/page.jsx | page | marketing |
| 323 | app/(public)/signin/page.jsx | page | marketing |
| 324 | app/api/ai/cash-forecast/route.js | api-route | no UI |
| 325 | app/api/ai/categorize-expense/route.js | api-route | no UI |
| 326 | app/api/ai/cert-checker/route.js | api-route | no UI |
| 327 | app/api/ai/daily-briefing/route.js | api-route | no UI |
| 328 | app/api/ai/document-reader/route.js | api-route | no UI |
| 329 | app/api/ai/email-status/route.js | api-route | no UI |
| 330 | app/api/ai/generate-reminder/route.js | api-route | no UI |
| 331 | app/api/ai/margin-alert/route.js | api-route | no UI |
| 332 | app/api/ai/send-reminder/route.js | api-route | no UI |
| 333 | app/api/assistant/route.js | api-route | no UI |
| 334 | app/api/metal-prices/route.js | api-route | no UI |
| 335 | app/api/push/daily/route.js | api-route | no UI |
| 336 | app/page.js | page | marketing |
| 337 | components/CTA/cta.jsx | component | marketing |
| 338 | components/Contact/ContactForm.jsx | component | marketing |
| 339 | components/Features/EfficientShipment.jsx | component | marketing |
| 340 | components/Features/feature-card.jsx | component | marketing |
| 341 | components/Features/features.jsx | component | marketing |
| 342 | components/Footer/footer.jsx | component | marketing |
| 343 | components/Hero/HeroSection.jsx | component | marketing |
| 344 | components/Hero/dashboard-preview.jsx | component | marketing |
| 345 | components/Hero/hero.jsx | component | marketing |
| 346 | components/Navbar/navbar.jsx | component | marketing |
| 347 | components/Navbar/navbarContent.jsx | component | marketing |
| 348 | components/Navbar/navbarLinks.jsx | component | marketing |
| 349 | components/Navbar/navbarMenu.jsx | component | marketing |
| 350 | components/Testimonial/testimonial-card.tsx | component | marketing |
| 351 | components/Testimonial/testimonials.tsx | component | marketing |
| 352 | components/platform/MiniCharts.jsx | component | marketing |
| 353 | components/platform/PlatformSection.jsx | component | marketing |
| 354 | components/platform/platformCard1.jsx | component | marketing |
| 355 | components/platform/platformCard2.jsx | component | marketing |
| 356 | components/platform/platformCard3.jsx | component | marketing |
| 357 | components/platform/platformContact.jsx | component | marketing |
| 358 | components/platform/section-header.jsx | component | marketing |
| 359 | mobile/app/(app)/_layout.tsx | layout | mobile |
| 360 | mobile/app/(app)/acc-statement.tsx | component | mobile |
| 361 | mobile/app/(app)/accounting.tsx | component | mobile |
| 362 | mobile/app/(app)/activity.tsx | component | mobile |
| 363 | mobile/app/(app)/analysis.tsx | component | mobile |
| 364 | mobile/app/(app)/assistant.tsx | component | mobile |
| 365 | mobile/app/(app)/cashflow.tsx | component | mobile |
| 366 | mobile/app/(app)/config-editor.tsx | component | mobile |
| 367 | mobile/app/(app)/contracts-review.tsx | component | mobile |
| 368 | mobile/app/(app)/contracts/[id].tsx | component | mobile |
| 369 | mobile/app/(app)/contracts/_layout.tsx | layout | mobile |
| 370 | mobile/app/(app)/contracts/cert-checker.tsx | component | mobile |
| 371 | mobile/app/(app)/contracts/edit.tsx | component | mobile |
| 372 | mobile/app/(app)/contracts/files.tsx | component | mobile |
| 373 | mobile/app/(app)/contracts/final-settlement.tsx | component | mobile |
| 374 | mobile/app/(app)/contracts/index.tsx | component | mobile |
| 375 | mobile/app/(app)/contracts/new-invoice.tsx | component | mobile |
| 376 | mobile/app/(app)/contracts/stock-in.tsx | component | mobile |
| 377 | mobile/app/(app)/expenses.tsx | component | mobile |
| 378 | mobile/app/(app)/formulas.tsx | component | mobile |
| 379 | mobile/app/(app)/incoterms.tsx | component | mobile |
| 380 | mobile/app/(app)/index.tsx | component | mobile |
| 381 | mobile/app/(app)/invoices-review.tsx | component | mobile |
| 382 | mobile/app/(app)/invoices/[id].tsx | component | mobile |
| 383 | mobile/app/(app)/invoices/_layout.tsx | layout | mobile |
| 384 | mobile/app/(app)/invoices/edit.tsx | component | mobile |
| 385 | mobile/app/(app)/invoices/index.tsx | component | mobile |
| 386 | mobile/app/(app)/margins.tsx | component | mobile |
| 387 | mobile/app/(app)/materials.tsx | component | mobile |
| 388 | mobile/app/(app)/misc-invoices.tsx | component | mobile |
| 389 | mobile/app/(app)/more.tsx | component | mobile |
| 390 | mobile/app/(app)/notifications.tsx | component | mobile |
| 391 | mobile/app/(app)/sales-contracts.tsx | component | mobile |
| 392 | mobile/app/(app)/settings-entity.tsx | component | mobile |
| 393 | mobile/app/(app)/settings.tsx | component | mobile |
| 394 | mobile/app/(app)/shipment.tsx | component | mobile |
| 395 | mobile/app/(app)/stock-audit.tsx | component | mobile |
| 396 | mobile/app/(app)/stocks/index.tsx | component | mobile |
| 397 | mobile/app/_layout.tsx | layout | mobile |
| 398 | mobile/app/index.tsx | component | mobile |
| 399 | mobile/app/sign-in.tsx | component | mobile |
| 400 | mobile/babel.config.js | config | mobile |
| 401 | mobile/declarations.d.ts | types | mobile |
| 402 | mobile/global.css | style | mobile |
| 403 | mobile/metro.config.js | config | mobile |
| 404 | mobile/nativewind-env.d.ts | types | mobile |
| 405 | mobile/src/components/AppErrorBoundary.tsx | component | mobile |
| 406 | mobile/src/components/OfflineBanner.tsx | component | mobile |
| 407 | mobile/src/components/PeriodSelector.tsx | component | mobile |
| 408 | mobile/src/components/PrivacyLock.tsx | component | mobile |
| 409 | mobile/src/components/ScreenHeader.tsx | component | mobile |
| 410 | mobile/src/components/SwipeRow.tsx | component | mobile |
| 411 | mobile/src/components/ui/AreaChart.tsx | component | mobile |
| 412 | mobile/src/components/ui/Badge.tsx | component | mobile |
| 413 | mobile/src/components/ui/BarChart.tsx | component | mobile |
| 414 | mobile/src/components/ui/Button.tsx | component | mobile |
| 415 | mobile/src/components/ui/Card.tsx | component | mobile |
| 416 | mobile/src/components/ui/DateField.tsx | component | mobile |
| 417 | mobile/src/components/ui/Motion.tsx | component | mobile |
| 418 | mobile/src/components/ui/ProgressBar.tsx | component | mobile |
| 419 | mobile/src/components/ui/Screen.tsx | component | mobile |
| 420 | mobile/src/components/ui/SectionHeader.tsx | component | mobile |
| 421 | mobile/src/components/ui/SegmentedControl.tsx | component | mobile |
| 422 | mobile/src/components/ui/Select.tsx | component | mobile |
| 423 | mobile/src/components/ui/Skeleton.tsx | component | mobile |
| 424 | mobile/src/components/ui/StatCard.tsx | component | mobile |
| 425 | mobile/src/components/ui/States.tsx | component | mobile |
| 426 | mobile/src/components/ui/Text.tsx | component | mobile |
| 427 | mobile/src/components/ui/TextField.tsx | component | mobile |
| 428 | mobile/src/components/ui/index.ts | component | mobile |
| 429 | mobile/src/data/firestore.ts | component | mobile |
| 430 | mobile/src/data/storage.ts | component | mobile |
| 431 | mobile/src/data/types.ts | component | mobile |
| 432 | mobile/src/data/writes.ts | component | mobile |
| 433 | mobile/src/features/accounting/useAccounting.ts | hook | mobile |
| 434 | mobile/src/features/accstatement/useAccStatement.ts | hook | mobile |
| 435 | mobile/src/features/analysis/useAnalysis.ts | hook | mobile |
| 436 | mobile/src/features/assistant/api.ts | component | mobile |
| 437 | mobile/src/features/assistant/useAssistantContext.ts | hook | mobile |
| 438 | mobile/src/features/briefing/BriefingCard.tsx | component | mobile |
| 439 | mobile/src/features/briefing/useBriefing.ts | hook | mobile |
| 440 | mobile/src/features/cashflow/ForecastCard.tsx | component | mobile |
| 441 | mobile/src/features/cashflow/useCashForecast.ts | hook | mobile |
| 442 | mobile/src/features/cashflow/useCashflow.ts | hook | mobile |
| 443 | mobile/src/features/cashflow/useCashflowActions.ts | hook | mobile |
| 444 | mobile/src/features/contracts/ContractCard.tsx | component | mobile |
| 445 | mobile/src/features/contracts/ProductsEditor.tsx | component | mobile |
| 446 | mobile/src/features/contracts/docImport.ts | component | mobile |
| 447 | mobile/src/features/contracts/form.ts | component | mobile |
| 448 | mobile/src/features/contracts/useContracts.ts | hook | mobile |
| 449 | mobile/src/features/contracts/useDuplicateContract.ts | hook | mobile |
| 450 | mobile/src/features/contracts/useSaveContract.ts | hook | mobile |
| 451 | mobile/src/features/dashboard/components.tsx | component | mobile |
| 452 | mobile/src/features/dashboard/useDashboard.ts | hook | mobile |
| 453 | mobile/src/features/expenses/useExpenses.ts | hook | mobile |
| 454 | mobile/src/features/formulas/calc.ts | component | mobile |
| 455 | mobile/src/features/incoterms/data.ts | component | mobile |
| 456 | mobile/src/features/invoices/InvoiceCard.tsx | component | mobile |
| 457 | mobile/src/features/invoices/useCreateInvoice.ts | hook | mobile |
| 458 | mobile/src/features/invoices/useEditInvoice.ts | hook | mobile |
| 459 | mobile/src/features/invoices/useInvoices.ts | hook | mobile |
| 460 | mobile/src/features/invoices/usePayments.ts | hook | mobile |
| 461 | mobile/src/features/invoices/useReminder.ts | hook | mobile |
| 462 | mobile/src/features/live/useLiveSync.ts | hook | mobile |
| 463 | mobile/src/features/margins/useMargins.ts | hook | mobile |
| 464 | mobile/src/features/materials/constants.ts | component | mobile |
| 465 | mobile/src/features/misc/useMiscInvoices.ts | hook | mobile |
| 466 | mobile/src/features/prices/MetalPricesStrip.tsx | component | mobile |
| 467 | mobile/src/features/prices/useMetalPrices.ts | hook | mobile |
| 468 | mobile/src/features/push/registerPush.ts | component | mobile |
| 469 | mobile/src/features/review/useContractsReview.ts | hook | mobile |
| 470 | mobile/src/features/review/useInvoicesReview.ts | hook | mobile |
| 471 | mobile/src/features/salescontracts/useSalesContracts.ts | hook | mobile |
| 472 | mobile/src/features/settings/useSettingsEdit.ts | hook | mobile |
| 473 | mobile/src/features/shipment/useShipment.ts | hook | mobile |
| 474 | mobile/src/features/stockin/useStockIn.ts | hook | mobile |
| 475 | mobile/src/features/stocks/AgingView.tsx | component | mobile |
| 476 | mobile/src/features/stocks/InventoryView.tsx | component | mobile |
| 477 | mobile/src/features/stocks/StorageView.tsx | component | mobile |
| 478 | mobile/src/features/stocks/aggregate.ts | component | mobile |
| 479 | mobile/src/features/stocks/aging.ts | component | mobile |
| 480 | mobile/src/features/stocks/audit.ts | component | mobile |
| 481 | mobile/src/features/stocks/useFinalSettlement.ts | hook | mobile |
| 482 | mobile/src/features/stocks/useStocks.ts | hook | mobile |
| 483 | mobile/src/features/stocks/useStorage.ts | hook | mobile |
| 484 | mobile/src/lib/api.ts | component | mobile |
| 485 | mobile/src/lib/biometric.ts | component | mobile |
| 486 | mobile/src/lib/customsDocs.ts | component | mobile |
| 487 | mobile/src/lib/export.ts | component | mobile |
| 488 | mobile/src/lib/firebase.ts | component | mobile |
| 489 | mobile/src/lib/format.ts | component | mobile |
| 490 | mobile/src/lib/guard.ts | component | mobile |
| 491 | mobile/src/lib/haptics.ts | component | mobile |
| 492 | mobile/src/lib/pdfTemplates.ts | export-doc | mobile |
| 493 | mobile/src/lib/secureStore.ts | component | mobile |
| 494 | mobile/src/query/client.ts | component | mobile |
| 495 | mobile/src/shared/finance.js | component | mobile |
| 496 | mobile/src/shared/fxRates.js | component | mobile |
| 497 | mobile/src/shared/languages.js | component | mobile |
| 498 | mobile/src/shared/pureHelpers.js | component | mobile |
| 499 | mobile/src/shared/shared.d.ts | types | mobile |
| 500 | mobile/src/shared/shipmentStatus.js | component | mobile |
| 501 | mobile/src/shared/soldStatus.js | component | mobile |
| 502 | mobile/src/shared/splitUtils.js | component | mobile |
| 503 | mobile/src/shared/storageUtils.js | component | mobile |
| 504 | mobile/src/store/auth.ts | component | mobile |
| 505 | mobile/src/store/settings.ts | component | mobile |
| 506 | mobile/src/theme/ThemeProvider.tsx | component | mobile |
| 507 | mobile/src/theme/tokens.ts | component | mobile |
| 508 | mobile/tailwind.config.js | config | mobile |
