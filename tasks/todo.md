# MetalsTrade IMS — AI Features Implementation Plan

> **Legend:** `[ ]` = pending · `[~]` = in progress · `[x]` = completed
> Last updated: 2026-05-14 — All 6 phases complete ✅

---

## Smart Query Chat Assistant
> Already fully implemented — 14 tools, SSE streaming, floating widget + full-page UI.

- [x] `/api/assistant/route.js` — OpenAI GPT-4o-mini, 14 data tools, SSE streaming
- [x] `components/FloatingChat.js` — floating widget on all authenticated pages
- [x] `app/(root)/apps/Assistant/page.js` — full-page chat interface
- [x] `hooks/useMetalPrices.js` + `/api/metal-prices/route.js` — live LME prices widget

---

## Phase 1 — Auto Expense Categorization
> AI reads expense description → auto-selects the correct expense type category.
> **Status:** `[x]` Complete

### API
- [x] Create `app/api/ai/categorize-expense/route.js`
  - `POST { description: string, categories: [{ id, label }] }`
  - Returns `JSON { categoryId, confidence: "high"|"medium"|"low" }`
  - Model: `gpt-4o-mini` · temperature: 0 · max_tokens: 120 · JSON mode
  - Validates returned ID against known categories list

### Frontend
- [x] Edit `app/(root)/expenses/modals/expenses.js`
  - "AI Detect" pill button inline next to Expense Type label
  - Reads from Comments textarea as description input
  - Button disabled when Comments is empty (tooltip explains why)
  - States: idle (blue) → Loader2 spin "Detecting…" → green checkmark "Done" 3s → idle
  - Error state: red "Failed" for 3s then resets
  - Low confidence: yellow pill "Low confidence — please verify"
  - Auto-calls `handleChange(categoryId, 'expType')` on success

---

## Phase 2 — Margin Alerts
> Automatic alert when contract profitability drops below a user-defined threshold.
> **Status:** `[x]` Complete

### API
- [ ] Create `app/api/ai/margin-alert/route.js`
  - `POST { alertedRows, threshold, allMargins, allExpenses }`
  - SSE stream response (same pattern as `/api/assistant/route.js`)
  - Model: `gpt-4o-mini`
  - Prompt: explain per row why margin fell below threshold, max 2 sentences each

### Settings — Threshold Config
- [ ] Edit `app/(root)/settings/page.js`
  - Add "Margin Alert Threshold %" pill number input (same `.pill-input` style)
  - Save to Firestore: `settings/MarginAlert` doc with field `threshold`
- [ ] Edit `hooks/useSettingsState.js`
  - Load `marginAlertThreshold` from Firestore into the settings object

### Margins Page — Alert Banner
- [ ] Edit `app/(root)/margins/page.js`
  - After `loadMargins()`: compute `(totalMargin / incoming) * 100` per row
  - If any row < threshold: set `alertedRows` state array
  - Render alert banner above stat boxes (FirstPart):
    ```
    ⚠ N rows below X% threshold   [Explain with AI ▼]   [✕]
    ```
  - Banner: `bg-[#fff3cd] border border-[#ffc107] rounded-xl`
  - "Explain with AI" → calls API, streams text into expandable section below banner
  - Dismissible (✕ sets `alertDismissed` state)

---

## Phase 3 — Cash Forecasting (30 / 60 / 90 days)
> AI projects inflow vs outflow for the next 30, 60, and 90 days.
> **Status:** `[x]` Complete

### API
- [ ] Create `app/api/ai/cash-forecast/route.js`
  - `POST { horizon: 30|60|90, openInvoices[], openContracts[], unpaidExpenses[], historicalInflows[], today }`
  - Returns `JSON { projectedInflow, projectedOutflow, netPosition, confidence, keyAssumptions[], risks[] }`
  - Model: `gpt-4o-mini` · JSON mode (`response_format: { type: "json_object" }`)
  - In-memory cache: 15-minute TTL (same pattern as `/api/metal-prices/route.js`)
  - JS computes raw deterministic numbers; AI adds confidence + assumptions + risk text only

### New Component
- [ ] Create `app/(root)/cashflow/ForecastPanel.js`
  - Collapsible panel using `MyAccordion` wrapper — closed by default (lazy load)
  - Tab pills: `30d | 60d | 90d` (pill style, same as existing date tabs)
  - `BarChart` from recharts (already in package.json via dashboard)
    - Two bars per currency: Inflow `var(--endeavour)` blue / Outflow `#ef4444` red
  - Confidence badge: `high` = green · `medium` = yellow · `low` = red
  - Bullet list of Key Assumptions and Risks rendered below chart
  - "Refresh Forecast" button with `<RefreshCw />` icon (already imported in FloatingChat.js)

### Cashflow Page
- [ ] Edit `app/(root)/cashflow/page.js`
  - Import `<ForecastPanel />` and render as first section above existing accordion
  - Pass already-loaded: `invoicesData`, `contractsData`, `expensesData`
  - Only calls API when user opens the panel (accordion `onOpenChange`)

---

## Phase 4 — Material Certificate Checker
> Upload supplier certificate (PDF or image) → AI extracts element values → compare vs contract spec.
> **Status:** `[x]` Complete

### Package
- [x] `npm install pdf-parse`

### API
- [x] Create `app/api/ai/cert-checker/route.js`
  - `POST { fileBase64: string, mimeType: "image/jpeg"|"image/png"|"application/pdf", contractSpec: [{ element, min, max, unit }] }`
  - Returns `JSON { extractedElements[], results[{ element, spec, actual, pass }], certificateNumber, date, rawText }`
  - Model: `gpt-4o` (Vision required for image input)
  - PDF path: `pdf-parse` extracts text → send as text prompt to `gpt-4o`
  - Image path: base64 `data:image/jpeg;base64,...` → OpenAI image_url input
  - JSON mode response

### New Component
- [x] Create `components/contracts/modals/CertChecker.js`
  - Drag-and-drop upload zone (mirrors `filesModal.js` pattern)
  - Upload → progress bar → results table
  - Table columns: **Element** | **Spec** (min–max) | **Certificate Value** | **Status**
  - Pass: `bg-[#d1fae5] text-[#065f46]` · Fail: `bg-[#fee2e2] text-[#991b1b]`
  - "Export Results" → PDF via existing `jsPDF`
  - Accepts: `.pdf`, `.jpg`, `.jpeg`, `.png`

### Contracts Modal
- [x] Edit `app/(root)/contracts/modals/tabs/tabs.js`
  - Added "Certificate" tab (5th tab) → renders `<CertChecker />`

---

## Phase 5 — Document Reader (PDF → Auto-fill Forms)
> Upload supplier PDF → AI extracts all data → pre-fills the contract or invoice form.
> **Status:** `[x]` Complete

### Package
- [x] (reuses `pdf-parse` installed in Phase 4 — no new install)

### API
- [x] Create `app/api/ai/document-reader/route.js`
  - `POST { fileBase64, mimeType, documentType, suppliers[], clients[], currencies[] }`
  - Returns JSON matching form model + per-field confidence
  - Model: `gpt-4o-mini` (PDF text) · `gpt-4o` (image Vision)
  - Fuzzy entity matching for suppliers/clients/currencies

### New Component
- [x] Create `components/DocumentImportOverlay.js`
  - Full-screen overlay with drag-drop upload
  - Per-field `FieldRow` with confidence badge + toggle checkbox
  - High/medium pre-selected, low not pre-selected
  - "Apply Selected" → `onApply(fields)` merges into form state

### Contract Modal
- [x] Edit `app/(root)/contracts/modals/contractDetails.js`
  - Added "Import PDF" button → shows `<DocumentImportOverlay />`
  - `onApply` merges extracted fields into `setValueCon`

### Invoice Modal
- [x] Edit `app/(root)/invoices/modals/invoiceDetails.js`
  - Added "Import PDF" button (only when not finalized)
  - `onApply` merges extracted fields into `setValueInv`

---

## Phase 6 — Payment Reminder Emails
> AI generates professional reminder emails → user reviews → sends to client via Resend.
> **Status:** `[x]` Complete

### Packages & Environment
- [x] `npm install resend`
- [ ] Add `RESEND_API_KEY=re_xxx` to `.env.local` ← **manual step required**
- [ ] Add `RESEND_FROM_EMAIL=noreply@yourdomain.com` to `.env.local` ← **manual step required**

### API — Generate Email Draft
- [x] Create `app/api/ai/generate-reminder/route.js`
  - `POST { invoice, clientEmail, companyName, language }`
  - Returns `JSON { subject, body }` — plain text email
  - Model: `gpt-4o-mini` · temperature: 0.6 · max_tokens: 400
  - Multi-language support via `language` param

### API — Send Email
- [x] Create `app/api/ai/send-reminder/route.js`
  - `POST { invoiceId, to, subject, body, uidCollection, companyName }`
  - Sends via Resend SDK (`from: "CompanyName <RESEND_FROM_EMAIL>"`)
  - Logs to Firestore: `arrayUnion({ sentAt, to, subject, preview, messageId })`
  - Non-fatal Firestore logging (email success takes priority)

### New Component
- [x] Create `components/invoices/ReminderModal.js`
  - Full-screen overlay (not Radix — custom fixed overlay for simplicity)
  - Header with invoice #, client, balance due, payment status
  - Email input (pre-filled from client settings if available)
  - "Generate Reminder Email" → editable subject + textarea
  - "Regenerate" button on email body label
  - "Send Reminder" with loading state + success state
  - Shows last reminder date if `invoice.reminders` exists

### Invoices Table
- [x] Edit `app/(root)/invoices/page.js`
  - Added `reminder` column with `<Bell />` icon
  - Red bell if overdue, amber if unpaid — hidden if paid/canceled/draft
  - `reminderInvoice` state → renders `<ReminderModal>` overlay
  - Resolves `clientEmail` from `settings.Client.Client` by ID

---

## UI Speed & Quality Improvements
> Run alongside AI phases — makes the whole app feel faster and more advanced.
> **Status:** `[ ]` Not started

- [ ] Create `components/SkeletonTable.js` — animated skeleton rows replacing VideoLoader
  - Animated gray placeholder rows matching table column layout
  - Apply to: contracts, invoices, expenses, margins, stocks pages
- [ ] Optimistic UI on all inline edits (`hooks/useInlineEdit.js`)
  - Update local state instantly, revert on Firestore error
- [ ] Virtualized rows for large tables (> 200 rows)
  - `npm install @tanstack/react-virtual`
  - Enable in contracts and invoices table components
- [ ] AI route response caching
  - `/api/ai/cash-forecast`: 15-min in-memory cache (same as metal-prices pattern)
  - `/api/ai/categorize-expense`: Map cache keyed by description string

---

## Overall Progress

| # | Feature | Status |
|---|---------|--------|
| ✅ | Smart Query Chat (14 tools, SSE) | **Complete** |
| 1 | Auto Expense Categorization | `[x]` Complete |
| 2 | Margin Alerts | `[x]` Complete |
| 3 | Cash Forecasting 30/60/90d | `[x]` Complete |
| 4 | Material Certificate Checker | `[x]` Complete |
| 5 | Document Reader PDF → Form | `[x]` Complete |
| 6 | Payment Reminder Emails | `[x]` Complete |
| + | UI Speed & Skeleton Loaders | `[ ]` Pending |

---

## Technical Notes

### OpenAI Models Used
- `gpt-4o-mini` — categorization, forecasting, reminders, document reading (fast + cheap)
- `gpt-4o` — certificate checker only (Vision API required for image input)

### New npm Packages Required
| Phase | Package | Purpose |
|-------|---------|---------|
| 4 | `pdf-parse` | Extract text from supplier PDFs server-side |
| 6 | `resend` | Send transactional reminder emails |
| UI | `@tanstack/react-virtual` | Virtualized rows for large tables |

### API Route Pattern (all AI routes follow this)
```
app/api/ai/
  categorize-expense/route.js   ← Phase 1
  margin-alert/route.js         ← Phase 2
  cash-forecast/route.js        ← Phase 3
  cert-checker/route.js         ← Phase 4
  document-reader/route.js      ← Phase 5
  generate-reminder/route.js    ← Phase 6
  send-reminder/route.js        ← Phase 6
```

### Existing Infrastructure to Reuse
- `uploadFile()` / `getAllfiles()` in `utils/utils.js` — file uploads for Phase 4 & 5
- `MyAccordion` in `cashflow/accordion.js` — collapsible panel for Phase 3
- SSE pattern from `/api/assistant/route.js` — reuse for Phase 2 margin alert explain
- `jsPDF` already installed — export cert results in Phase 4
- `RefreshCw`, `Loader2`, `X` from lucide-react already imported — reuse in all phases
- Radix Dialog pattern from existing modals — reuse for Phase 6 reminder modal
- `.blackButton`, `.whiteButton` classes in `globals.css` — button styles
- `var(--endeavour)`, `var(--selago)`, `var(--port-gore)` CSS variables — all color work
