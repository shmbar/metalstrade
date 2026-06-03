# IMS — Enhancement Roadmap

Decisions locked in (2026-06):
- **Mobile** = PWA / responsive web (no separate native app).
- **Delivery** = quick wins first, then build the notification/activity foundation.
- **#8 duplicate cleanup** = audit only for now (map keep/delete/merge; don't refactor yet).

Architecture rules:
- New state in Firestore, per-account path `{uidCollection}/data/{collection}/{docId}`.
- Real-time via Firestore `onSnapshot` (Firebase v10 already in use).
- One central `logEvent(uidCollection, currentUser, evt)` emitter called from the save layer in `utils/utils.js`.
- Actor identity from `useAuthContext` (logged-in user), not `uidCollection` (shared account).

---

## Phase 1 — Quick wins (existing engines)

- [x] **#1 Customer PO → invoice autofill.** Mounted `DocumentImportOverlay` (`documentType='invoice'`) in `app/(root)/contracts/modals/invoiceDetails.js`. Remaps AI products to the invoice row shape (`descriptionText` + `mtrlStatus:'edit'`), sets totalAmount, and does NOT overwrite our auto-generated invoice number. Field-level override via the overlay's checkboxes.
- [x] **#2 PDF preview (Contracts + IMS Review).** Reusable `components/PdfPreview.js` renders a jsPDF Blob in an iframe (looks identical to the sent PDF) with Download/Print, owns the object-URL lifecycle. `pdfContract.js` `Pdf()` now takes `mode='save'|'preview'` (preview returns `{blob,filename}`, save unchanged). Added a **Preview** button in the contract modal (`contractDetails.js`), which is reused by both Contracts and IMS Review (`ContractsReview&Statement` mounts the same `MyDetailsModal`). Shared `buildPoTable()` keeps Preview + Download in sync. _Next: the component is reusable — adopt it for invoice/final-settlement PDFs too._

## Done already (verified)
- [x] **#3 Purchase-invoice AI upload** — `documentType='expense'` overlay in contract-expenses + expenses, with PO auto-link + reconciliation + manual edit.

---

## Phase 0 — Foundation (unblocks 4, 5, 6, 9, 11)
- [x] **0.1** `currentUser {uid,name,email}` exposed from `useAuthContext` (falls back to email when displayName unset).
- [x] **0.2** Activity model + writer/reader in `utils/utils.js` (`logEvent`, `loadActivity` at `{uidCollection}/data/activity/{id}`, best-effort, client-sorted). `logActivity(evt)` convenience on `useAuthContext` auto-injects actor + account. **Wired so far:** contract save + invoice save (representative). _Remaining emit sites (PO shipped, ETA/ETD, payments, expenses, stock, settings, uploads, PDF) wired in Phase 2/3 — they're one `logActivity({...})` line each._
- [x] **0.3** De-dup audit written to `tasks/dedup-audit.md` (keep/delete/merge map + safe execution procedure). Headline: only `CertChecker` is live in `components/contracts/**`; only `AIAlertsBar`/`MarketsTicker`/`HeadlineTicker` are live in `components/Dashboard/**` — the rest are dead duplicates.

## Phase 2 — Activity Log (#9)
- [x] **Activity Log view** — reusable `components/ActivityLog.js` (scoped + global modes), global page at `app/(root)/activity/page.js` with search + type/actor filters, nav entry under Miscellaneous (`TbHistory`), and a per-record **History** button in the contract + invoice modals (opens `ActivityLog` scoped via `entityType`+`entityId`).
- [~] **Wire `logEvent()` into all mutation choke points** — done: contract save, invoice save. Remaining (one `logActivity({...})` line each): invoice finalize/cancel, payment recorded, expense save, stock save/movement, settings edits, document upload, PDF generated. _Do alongside Phase 3 so each event can also raise a notification._

## Phase 3 — Notification Center + events (#4, #5, snooze/sound)
- [x] `notifications` collection (written by `logEvent` when `notify:true`, carries `readBy`/`snoozedBy`/`severity`) + `NotificationProvider` (`contexts/useNotificationContext.js`) with live `onSnapshot`, per-user unread, audience + snooze filtering.
- [x] Bell + unread badge in `MainNav` (`components/NotificationBell.js`) — replaced the dead placeholder bell. Dropdown panel: read/unread styling, actor + relative time, severity dot, click-through to the entity (`?openId=`/`?focus=`), "mark all read", "view all activity".
- [x] Snooze / remind-me-later (1h / 4h / Tomorrow per-user via `snoozedBy`); WebAudio chime on new notifications (not self, not on first load) + persisted mute toggle.
- [~] **Event coverage** — wired (notify): **contract created** (`contractDetails` btnClck, new only), **payment recorded** (`payments.js` saveD), **shipment ETD/ETA/status updated** (`pnlTables.js` SaveData), **invoice finalized**, and **settlement overdue** (time-derived, raised idempotently from the dashboard scan in `AIAlertsBar` via `ensureNotification` — create-if-absent so it never duplicates or resets read/snooze). Remaining time-derived: "PO shipped" when status flips to Shipped, settlement paid when balance hits 0.
- [x] Retired the legacy `delayedResponse` auto-popup — delayed contracts (no purchase invoice 14+ days after delivery) now raise idempotent `contract.delayed` notifications in the bell (via `ensureNotification` in the contracts page load). Inline banner kept as page context; unused `Modal` import + `openAlert` state removed.
- [x] Added the bell to `SideBarMini` (mobile top nav).

## Phase 4 — Task communication (#6)
- [x] **Live comment threads** — `components/CommentThread.js` (live via `subscribeComments`, Enter-to-send composer) behind a **Comments** button in the contract + invoice modals. Posting **notifies teammates** (`comment.added`, notify) and logs to the activity feed. Backed by `addComment` + `subscribeComments` at `{uidCollection}/data/comments` (single-field `entityKey` query → no composite index).
- [x] **Mobile bell** — `NotificationBell` added to `SideBarMini`.
- [~] Follow-ups: assignee + "My tasks" filter; full PWA (installable manifest + web-push).

## Phase 5 — Warehouse / terminal monitoring (#11)
- [x] **Terminal + aging.** Terminal = the existing warehouse (`stock`) field. New `app/(root)/stocks/storageAging.js` groups in-stock cargo by terminal, derives **days-in-storage** from arrival dates (`indDate` of "in" records, falling back to contract date), buckets ages (0–30/31–60/61–90/90+), and shows per-terminal cards (oldest, bucket bar) + a stale-cargo list. Mounted on the stocks page.
- [x] **Demurrage / stale alerts.** Cargo ≥ `STALE_DAYS` (60) raises an idempotent **monthly** `stock.stale` notification via `ensureNotification` (severity escalates to warning at `DEMURRAGE_DAYS` 90 with a "possible demurrage/storage charges" note).
- [~] Thresholds are constants for now — **moving STALE_DAYS/DEMURRAGE_DAYS into Settings** is a follow-up. A **dashboard** monthly-summary card and **stock-scoped activity logging** (movement/status history; movement already shows in `shipmentsTable`) are also follow-ups.

## Phase 6 — Visual status + structural cleanup
- [~] **#7** Shared status→color system built — `components/StatusBadge.js` (`statusTone`, `amountToneClass`, `<StatusBadge>`): negatives/alerts red, warnings amber, done green, info blue. Applied to the **invoices status column** as the reference integration (toned pills replacing the one-background-for-all span). Rolling it across accounting/statements/cashflow/contracts/stocks (+ `amountToneClass` on P&L/balance numbers) is incremental follow-up using the same component.
- [ ] **#8** Execute the keep/delete/merge consolidation (after Phases 1–3).

---

## Recommended order
1.1 ✅ → 1.2 → 0 → 2 → 3 → 5 → 4 → 6

## QA hardening (pre-commit)
- **Fixed the Vitest runner** (was pre-broken for ALL suites): removed the incompatible `@vitejs/plugin-react` from `vitest.config.js` — Vitest 4's oxc transforms JSX-in-`.js` natively.
- **Extracted pure logic for testability**: `components/statusUtils.js` (`statusTone`, `amountToneClass`, `TONES`) and `app/(root)/stocks/agingUtils.js` (`dStr`, `arrivalOf`, `daysStored`, `bucketOf`); `StatusBadge.js`/`storageAging.js` now import them.
- **Added unit tests**: `components/__tests__/statusBadge.test.js`, `app/(root)/stocks/__tests__/agingUtils.test.js`.
- **Result**: `npm test` → **61 passed** (35 existing regression-confirm `utils.js`/fxRates untouched-behavior; 26 new). `npm run build` → 40/40 routes. Lint → 0 errors in changed files.
