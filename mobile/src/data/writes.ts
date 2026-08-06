// Firestore write layer for contracts — a faithful port of the write paths in the
// web app's hooks/useContractsState.js + utils/utils.js. Preserves the exact
// behavior: year-bucketed doc id, `m`/`euroToUSD` stamping, poSupplier sync on
// linked invoices/expenses, and old-doc cleanup when a contract's year changes.

import {
  doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch,
  arrayUnion, increment, collection, query, where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { loadStockDataByIds } from './firestore';
import { splitNotifId } from '@shared/splitUtils';
import { priorityOf } from '@shared/notificationPriority';
import { Contract, Invoice, Payment } from './types';

// RN-safe id generator — mirrors utils.js newId() (crypto.randomUUID when present,
// else a timestamp+random fallback). Format parity isn't required, uniqueness is.
export const newId = (): string =>
  typeof globalThis.crypto !== 'undefined' && (globalThis.crypto as any).randomUUID
    ? (globalThis.crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Historical EUR→USD for a contract's date. Same endpoint + fallbacks as the web
// app's components/exchangeApi.js getCur(). The OpenExchangeRates app id is shared
// via EXPO_PUBLIC_OPENEXCHANGERATES_APP_ID; when unset the API 400s and we fall
// back to 1.05 (identical to web behavior with an unconfigured key).
export async function getCur(date: string | null | undefined): Promise<number> {
  if (!date) return 1;
  const appId = process.env.EXPO_PUBLIC_OPENEXCHANGERATES_APP_ID || '';
  const url = `https://openexchangerates.org/api/historical/${date}.json?app_id=${appId}`;
  try {
    const response = await fetch(url);
    if (response.status === 400) return 1.05;
    if (!response.ok) return 1;
    const data = await response.json();
    const eurRate = data?.rates?.EUR;
    if (!eurRate) return 1;
    return +(1 / eurRate).toFixed(4);
  } catch {
    return 1;
  }
}

// Client-only enrichment that must NEVER reach Firestore. `invoicesData` is the
// invoice index joined onto a contract for display (useContracts) and is an ARRAY
// OF ARRAYS — Firestore rejects nested arrays outright, so any contract with a
// linked sales invoice failed to save from mobile (edit, stock-in and final
// settlement all funnel through here). Web never puts it on the doc in the first
// place; stripping it at the write layer covers every current and future path.
const CLIENT_ONLY_CONTRACT_KEYS = ['invoicesData'] as const;

function stripClientOnly(obj: Contract): Contract {
  const clean = { ...obj } as Record<string, unknown>;
  CLIENT_ONLY_CONTRACT_KEYS.forEach((k) => delete clean[k]);
  return clean as Contract;
}

// Low-level contract write — mirrors utils.js saveData(): doc id in contracts_{YYYY}
// (year from dateRange.startDate), with `m` (month) stamped on the record.
async function writeContractDoc(uidCollection: string, obj: Contract): Promise<boolean> {
  const start = obj.dateRange?.startDate || obj.date || '';
  const m = start.substring(5, 7);
  const y = start.substring(0, 4);
  await setDoc(doc(db, uidCollection, 'data', `contracts_${y}`, obj.id), { ...stripClientOnly(obj), m });
  return true;
}

// Sync the poSupplier stamp onto a contract's linked sales invoices (utils.js
// updatePoSupplierInv). Each ref carries its own year (date) + id.
async function updatePoSupplierInv(uidCollection: string, con: Contract): Promise<void> {
  const invcs = con.invoices || [];
  if (!invcs.length) return;
  const batch = writeBatch(db);
  invcs.forEach((inv) => {
    const y = (inv.date || '').substring(0, 4);
    if (!y || !inv.id) return;
    const ref = doc(db, uidCollection, 'data', `invoices_${y}`, inv.id as string);
    batch.update(ref, { poSupplier: { id: con.id, order: con.order, date: con.dateRange?.startDate } });
  });
  await batch.commit();
}

// Sync the poSupplier stamp onto a contract's linked expenses (utils.js updatePoSupplierExp).
async function updatePoSupplierExp(uidCollection: string, con: Contract): Promise<void> {
  const exps = (con.expenses as { id?: string; date?: string }[]) || [];
  if (!exps.length) return;
  const batch = writeBatch(db);
  exps.forEach((exp) => {
    const y = (exp.date || '').substring(0, 4);
    if (!y || !exp.id) return;
    const ref = doc(db, uidCollection, 'data', `expenses_${y}`, exp.id);
    batch.update(ref, { poSupplier: { id: con.id, order: con.order, date: con.dateRange?.startDate } });
  });
  await batch.commit();
}

async function deleteContractDoc(uidCollection: string, id: string, dateYear: string): Promise<void> {
  await deleteDoc(doc(db, uidCollection, 'data', `contracts_${dateYear}`, id));
}

const nowStamp = () => {
  // "dd-mmm-yyyy, HH:MM" — same human format the web app stamps on lstSaved.
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${months[d.getMonth()]}-${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export interface SaveContractResult {
  ok: boolean;
  contract: Contract;
  isNew: boolean;
}

// Faithful port of useContractsState.saveData() — validation is enforced by the
// caller (form) so this assumes a valid value. Handles new vs update, euroToUSD
// stamping, poSupplier sync, and year-change cleanup.
export async function saveContract(
  uidCollection: string,
  value: Contract,
  existing: Contract | undefined
): Promise<SaveContractResult> {
  const startDate = value.dateRange?.startDate || value.date || '';
  const euroToUSD = await getCur(startDate);
  const isNew = !value.id;

  let tmp: Contract;
  if (!isNew && existing) {
    tmp = { ...value, lstSaved: nowStamp(), euroToUSD };
    // Keep linked invoices/expenses pointing at this contract.
    await updatePoSupplierInv(uidCollection, value);
    await updatePoSupplierExp(uidCollection, value);
    // If the contract's year changed, remove the stale doc in the old bucket.
    const prevYear = (existing.dateRange?.startDate || existing.date || '').substring(0, 4);
    const newYear = startDate.substring(0, 4);
    if (prevYear && newYear && prevYear !== newYear && existing.id) {
      await deleteContractDoc(uidCollection, existing.id, prevYear);
    }
  } else {
    tmp = { ...value, id: newId(), lstSaved: nowStamp(), euroToUSD };
  }

  const ok = await writeContractDoc(uidCollection, tmp);
  return { ok, contract: tmp, isNew };
}

// ── invoice creation ─────────────────────────────────────────────────────────
// Next sales-invoice number (current counter + 1). Counter lives at {uid}/invoiceNum.
export async function nextInvoiceNumber(uidCollection: string): Promise<number> {
  const snap = await getDoc(doc(db, uidCollection, 'invoiceNum'));
  const num = snap.exists() ? Number((snap.data() as any).num) : 0;
  return (Number.isFinite(num) ? num : 0) + 1;
}

// Increment the invoice-number counter — port of utils.js setNewInvoiceNum.
export async function bumpInvoiceNumber(uidCollection: string): Promise<void> {
  await updateDoc(doc(db, uidCollection, 'invoiceNum'), { num: increment(1) });
}

// Write a year-bucketed invoice doc (m stamped) — same shape as utils.js saveData('invoices').
async function writeInvoiceDoc(uidCollection: string, obj: Invoice): Promise<void> {
  const start = obj.dateRange?.startDate || obj.date || '';
  const y = start.substring(0, 4);
  const m = start.substring(5, 7);
  await setDoc(doc(db, uidCollection, 'data', `invoices_${y}`, obj.id), { ...obj, m });
}

// Faithful core of useInvoiceState.saveData_InvoiceInContracts: assigns the invoice
// number, links it onto the parent contract, writes the invoice doc, bumps the
// counter, and records a stock `out` movement per (non-service) material line.
// Returns the saved invoice.
export async function createInvoiceForContract(
  uidCollection: string,
  contract: Contract,
  invoice: Invoice,
  clientName: string
): Promise<Invoice> {
  const invNum = await nextInvoiceNumber(uidCollection);
  const startDate = invoice.dateRange?.startDate || invoice.date || '';

  const saved: Invoice = {
    ...invoice,
    id: newId(),
    invoice: invNum,
    date: startDate,
    invType: '1111',
    poSupplier: { id: contract.id, order: contract.order, date: contract.dateRange?.startDate || undefined },
    lstSaved: nowStamp(),
    totalAmount: (invoice.productsDataInvoice || []).reduce((s, p: any) => s + num(p.total), 0),
  };

  // Link onto the parent contract's invoices[] and re-save (patch only that field).
  const newInvoices = [
    ...(contract.invoices || []),
    { id: saved.id, invoice: invNum, date: startDate, invType: '1111' },
  ];
  const conYear = (contract.dateRange?.startDate || contract.date || '').substring(0, 4);
  await updateDoc(doc(db, uidCollection, 'data', `contracts_${conYear}`, contract.id), { invoices: newInvoices });

  await writeInvoiceDoc(uidCollection, saved);
  await bumpInvoiceNumber(uidCollection);

  // Stock `out` movements — one per non-service line (qnty !== 's'). Mirrors the
  // web save: each becomes a stock doc keyed by the line id.
  const outs = (saved.productsDataInvoice || [])
    .filter((p: any) => p.qnty !== 's')
    .map((p: any) => ({
      ...p,
      invoice: invNum,
      invType: '1111',
      date: startDate,
      type: 'out',
      productsData: contract.productsData,
      client: clientName,
      cur: contract.cur,
    }));
  if (outs.length) await saveStockIn(uidCollection, outs);

  return saved;
}

const num = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// ── invoice payments ─────────────────────────────────────────────────────────
// Record client payments against an invoice — writes only the `payments` array
// (self-contained; does not touch the parent contract or stock). `year` is the
// doc's known source bucket (from loadInvoicesTagged), avoiding date-string parse.
// Mirrors the Cashflow / invoice payments save, which feeds receivable balances.
export async function saveInvoicePayments(
  uidCollection: string,
  invoiceId: string,
  year: string,
  payments: Payment[]
): Promise<void> {
  if (!invoiceId || !year) throw new Error('Invoice is missing id/year.');
  await updateDoc(doc(db, uidCollection, 'data', `invoices_${year}`, invoiceId), { payments });
}

// Patch arbitrary fields on an invoice doc (full edit of header/materials).
export async function updateInvoiceDoc(
  uidCollection: string,
  invoiceId: string,
  year: string,
  patch: Record<string, unknown>
): Promise<void> {
  if (!invoiceId || !year) throw new Error('Invoice is missing id/year.');
  await updateDoc(doc(db, uidCollection, 'data', `invoices_${year}`, invoiceId), patch);
}

// Mark one notification read for a user — port of utils.js markNotificationRead
// (records who read it + when, first-read-wins via arrayUnion). Best-effort.
export async function markNotificationRead(
  uidCollection: string,
  id: string,
  uid: string,
  name: string
): Promise<void> {
  try {
    await updateDoc(doc(db, uidCollection, 'data', 'notifications', id), {
      readBy: arrayUnion(uid),
      [`readReceipts.${uid}`]: { name: name || 'Unknown', at: new Date().toISOString() },
    });
  } catch {
    /* non-fatal */
  }
}

// Mark many notifications read in one batch — port of utils.js markAllNotificationsRead.
export async function markAllNotificationsRead(
  uidCollection: string,
  ids: string[],
  uid: string,
  name: string
): Promise<void> {
  if (!ids?.length) return;
  try {
    const at = new Date().toISOString();
    const batch = writeBatch(db);
    ids.forEach((id) =>
      batch.update(doc(db, uidCollection, 'data', 'notifications', id), {
        readBy: arrayUnion(uid),
        [`readReceipts.${uid}`]: { name: name || 'Unknown', at },
      })
    );
    await batch.commit();
  } catch {
    /* non-fatal */
  }
}

// ── activity log ─────────────────────────────────────────────────────────────
// Fire-and-forget event logger — port of utils.js logEvent. Appends to the
// append-only activity feed and, when notify is set, ALSO creates the mutable
// notification (same id links the two) so teammates see the change in their bell.
// Never throws; never blocks the caller's save. Mobile previously wrote NOTHING to
// the activity feed, so actions taken on the phone were invisible on web.
export interface ActivityEvent {
  id?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  action?: string;
  message?: string;
  actorUid?: string;
  actorName?: string;
  notify?: boolean;
  audience?: string | string[];
  severity?: string;
  priority?: string;
  meta?: Record<string, unknown>;
}

export async function logEvent(uidCollection: string, evt: ActivityEvent = {}): Promise<any> {
  if (!uidCollection) return null;
  try {
    const id = evt.id || newId();
    const now = new Date();
    const record = {
      id,
      type: evt.type || 'activity',
      entityType: evt.entityType || '',
      entityId: evt.entityId || '',
      entityLabel: evt.entityLabel || '',
      action: evt.action || '',
      message: evt.message || '',
      actorUid: evt.actorUid || '',
      actorName: evt.actorName || 'Unknown',
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
      notify: !!evt.notify,
      audience: evt.audience || 'all',
      meta: evt.meta || {},
    };
    await setDoc(doc(db, uidCollection, 'data', 'activity', id), record);
    if (evt.notify) {
      await setDoc(doc(db, uidCollection, 'data', 'notifications', id), {
        ...record,
        severity: evt.severity || 'info',
        priority: evt.priority || priorityOf(record),
        readBy: [],
        readReceipts: {},
        snoozedBy: {},
      });
    }
    return record;
  } catch {
    return null; // non-fatal, exactly like web
  }
}

// ── IMS/GIS expense split ────────────────────────────────────────────────────
// "Put an invoice under control" workflow. A pending split raises a standing,
// IDEMPOTENT notification (stable id, create-if-absent so read/snooze state
// survives a rescan); calculating the split clears it. Ports of utils.js
// ensureNotification / ensureSplitNotification / clearSplitNotification.
export async function ensureNotification(
  uidCollection: string,
  id: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  if (!uidCollection || !id) return;
  try {
    const ref = doc(db, uidCollection, 'data', 'notifications', id);
    const snap = await getDoc(ref);
    if (snap.exists()) return; // already raised — don't reset readBy/snoozedBy
    const now = new Date();
    await setDoc(ref, {
      id,
      createdAt: now.toISOString(),
      createdAtMs: now.getTime(),
      actorUid: 'system',
      actorName: 'System',
      audience: 'all',
      readBy: [],
      readReceipts: {},
      snoozedBy: {},
      severity: 'info',
      notify: true,
      priority: priorityOf(payload),
      ...payload,
    });
  } catch {
    /* non-fatal */
  }
}

export async function deleteNotification(uidCollection: string, id: string): Promise<void> {
  if (!uidCollection || !id) return;
  try {
    await deleteDoc(doc(db, uidCollection, 'data', 'notifications', id));
  } catch {
    /* non-fatal */
  }
}

export interface SplitEvent {
  entityType?: 'expense' | 'companyexpense' | 'invoice';
  entityId: string;
  entityLabel?: string;
  amount?: number | null;
  currency?: string;
  actorUid?: string;
  actorName?: string;
}

export async function ensureSplitNotification(uidCollection: string, evt: SplitEvent): Promise<void> {
  const { entityType = 'expense', entityId, entityLabel, amount, currency, actorUid, actorName } = evt;
  if (!uidCollection || !entityId) return;
  const noun = entityType === 'invoice' ? 'Invoice' : 'Expense';
  await ensureNotification(uidCollection, splitNotifId(entityType, entityId), {
    type: `${entityType}.splitPending`,
    entityType,
    entityId,
    entityLabel: entityLabel || '',
    action: 'splitPending',
    severity: 'warning',
    notify: true,
    actorUid: actorUid || 'system',
    actorName: actorName || 'System',
    message: `${entityLabel || noun} — awaiting IMS/GIS split`,
    meta: { amount: amount ?? null, currency: currency || '' },
  });
}

export async function clearSplitNotification(
  uidCollection: string,
  entityType: string,
  entityId: string
): Promise<void> {
  if (!uidCollection || !entityId) return;
  await deleteNotification(uidCollection, splitNotifId(entityType, entityId));
}

// Persist the `split` object on a row. Each collection keeps its own write path,
// exactly like the three web pages do (expenses_{year} / companyExpenses / invoices_{year}).
export async function saveSplit(
  uidCollection: string,
  target: { kind: 'expense' | 'companyexpense' | 'invoice'; id: string; date?: string; year?: string },
  split: Record<string, unknown> | null
): Promise<void> {
  const patch = { split: split ?? null };
  if (target.kind === 'companyexpense') {
    await updateDoc(doc(db, uidCollection, 'data', 'companyExpenses', target.id), patch);
    return;
  }
  const y = target.year || (target.date || '').substring(0, 4);
  if (!y) throw new Error('Missing year for split write.');
  const path = target.kind === 'invoice' ? `invoices_${y}` : `expenses_${y}`;
  await updateDoc(doc(db, uidCollection, 'data', path, target.id), patch);
}

// Snooze one notification for a user until `untilMs` — port of utils.js
// snoozeNotification. The reader hides it while snoozedBy[uid] is in the future.
export async function snoozeNotification(
  uidCollection: string,
  id: string,
  uid: string,
  untilMs: number
): Promise<void> {
  if (!uidCollection || !id || !uid) return;
  try {
    await updateDoc(doc(db, uidCollection, 'data', 'notifications', id), {
      [`snoozedBy.${uid}`]: untilMs,
    });
  } catch {
    /* non-fatal */
  }
}

// Mark expenses paid (paid='111') — port of utils.js updateExpPayments. Supplier
// expenses live in expenses_{year}; company expenses in the flat companyExpenses.
export async function markExpensesPaid(uidCollection: string, items: any[]): Promise<void> {
  if (!items?.length) return;
  const batch = writeBatch(db);
  items.forEach((e) => {
    if (e.poSupplier) {
      const y = (e.date || '').substring(0, 4);
      batch.update(doc(db, uidCollection, 'data', `expenses_${y}`, e.id), { paid: '111' });
    } else {
      batch.update(doc(db, uidCollection, 'data', 'companyExpenses', e.id), { paid: '111' });
    }
  });
  await batch.commit();
}

// Mark one contract purchase invoice (poInvoice) fully paid — mirrors the Cashflow
// supplier "save payment" (pmnt = invValue, blnc = 0, payment appended). Loads the
// contract, patches its poInvoices array.
export async function markPoInvoicePaid(
  uidCollection: string,
  ref: { contractId: string; contractDate: string; poInvoiceId: string }
): Promise<void> {
  const y = ref.contractDate.substring(0, 4);
  const cRef = doc(db, uidCollection, 'data', `contracts_${y}`, ref.contractId);
  const snap = await getDoc(cRef);
  if (!snap.exists()) throw new Error('Contract not found.');
  const con = snap.data() as Contract;
  const dt = new Date().toISOString().slice(0, 10);
  const poInvoices = (con.poInvoices || []).map((x: any) => {
    if (x.id !== ref.poInvoiceId) return x;
    const prior = x.payments ? x.payments : num(x.pmnt) > 0
      ? [{ pmntId: newId(), pmntDate: null, pmntPerc: ((num(x.pmnt) / num(x.invValue)) * 100).toFixed(1), pmnt: x.pmnt }]
      : [];
    return {
      ...x,
      pmnt: x.invValue,
      blnc: 0,
      payments: [
        ...prior,
        { pmntId: newId(), pmntDate: { startDate: dt, endDate: dt }, pmntPerc: parseFloat(((num(x.blnc) * 100) / num(x.invValue)).toFixed(1)), pmnt: x.blnc },
      ],
    };
  });
  await updateDoc(cRef, { poInvoices });
  // Web parity: every supplier-payment save fans out to the stock-lot snapshot and
  // the Misc Invoices paid flags.
  const updated = { ...con, poInvoices } as any;
  await syncStockPoInvoices(uidCollection, [updated]);
  await syncSpecialInvoicesPaidStatus(uidCollection, updated);
}

// Record a partial payment on a contract purchase invoice — port of the Cashflow
// supplierPartialPayment: pmnt += amount, blnc -= amount, payment appended (cumulative).
export async function partialPayPoInvoice(
  uidCollection: string,
  ref: { contractId: string; contractDate: string; poInvoiceId: string },
  amount: number,
  perc: number | string,
  dateIso: string
): Promise<void> {
  const y = ref.contractDate.substring(0, 4);
  const cRef = doc(db, uidCollection, 'data', `contracts_${y}`, ref.contractId);
  const snap = await getDoc(cRef);
  if (!snap.exists()) throw new Error('Contract not found.');
  const con = snap.data() as Contract;
  const poInvoices = (con.poInvoices || []).map((x: any) => {
    if (x.id !== ref.poInvoiceId) return x;
    const prior = x.payments ? x.payments : num(x.pmnt) > 0
      ? [{ pmntId: newId(), pmntDate: null, pmntPerc: ((num(x.pmnt) / num(x.invValue)) * 100).toFixed(1), pmnt: x.pmnt }]
      : [];
    return {
      ...x,
      pmnt: num(x.pmnt) + amount,
      blnc: num(x.blnc) - amount,
      payments: [...prior, { pmntId: newId(), pmntDate: { startDate: dateIso, endDate: dateIso }, pmntPerc: perc, pmnt: amount }],
    };
  });
  await updateDoc(cRef, { poInvoices });
  const updated = { ...con, poInvoices } as any;
  await syncStockPoInvoices(uidCollection, [updated]);
  await syncSpecialInvoicesPaidStatus(uidCollection, updated);
}

// ── post-payment fan-out (web parity) ────────────────────────────────────────
// After ANY supplier-payment write, web runs two syncs. Skipping them is what left
// a mobile-paid PO's lots stuck under "Stocks - UnPaid" on web forever, and its
// Misc Invoices rows showing "Not Paid".

// Refresh the poInvoices snapshot cached on every stock lot of a contract —
// port of cashflow/page.js syncStockPoInvoices. Best-effort, like web.
export async function syncStockPoInvoices(uidCollection: string, contracts: Contract[]): Promise<void> {
  await Promise.all(
    (contracts || []).map(async (c: any) => {
      if (!Array.isArray(c?.stock) || c.stock.length === 0) return;
      try {
        const lots = await loadStockDataByIds(uidCollection, c.stock);
        if (lots.length) await saveStockIn(uidCollection, lots.map((l: any) => ({ ...l, poInvoices: c.poInvoices })));
      } catch {
        /* non-fatal */
      }
    })
  );
}

// Re-derive paidNotPaid / invoice on the contract's specialInvoices rows —
// port of utils.js syncSpecialInvoicesPaidStatus (same canonical match order:
// doc id → stock.poInvoice → contract.poInvoices.id, then the legacy inv fallback).
export async function syncSpecialInvoicesPaidStatus(
  uidCollection: string,
  contract: any
): Promise<void> {
  if (!contract?.order || !Array.isArray(contract?.poInvoices)) return;
  try {
    const snap = await getDocs(
      query(collection(db, uidCollection, 'data', 'specialInvoices'), where('order', '==', contract.order))
    );
    if (snap.empty) return;

    const stockIds = Array.isArray(contract.stock) ? contract.stock : [];
    const stockItems = stockIds.length > 0 ? await loadStockDataByIds(uidCollection, stockIds) : [];
    const poInvoiceByStockId = new Map<string, string>();
    stockItems.forEach((s: any) => {
      if (s?.id && s?.poInvoice) poInvoiceByStockId.set(s.id, s.poInvoice);
    });

    const batch = writeBatch(db);
    let hasUpdate = false;

    snap.docs.forEach((d) => {
      const data = d.data() as any;
      let p: any = null;
      const poInvId = poInvoiceByStockId.get(d.id);
      if (poInvId) p = contract.poInvoices.find((x: any) => x.id === poInvId);
      if (!p && data.invoice) p = contract.poInvoices.find((x: any) => x.inv === data.invoice);
      if (!p) return;

      const invValue = parseFloat(p.invValue);
      const ratio = invValue > 0 ? parseFloat(p.pmnt) / invValue : 0;
      const paidNotPaid = ratio > 0.95 ? 'Paid' : 'Not Paid';

      const update: Record<string, any> = {};
      if (data.paidNotPaid !== paidNotPaid) update.paidNotPaid = paidNotPaid;
      if ((data.invoice ?? '') !== (p.inv ?? '')) update.invoice = p.inv ?? '';
      if (Object.keys(update).length > 0) {
        batch.update(d.ref, update);
        hasUpdate = true;
      }
    });

    if (hasUpdate) await batch.commit();
  } catch {
    /* non-fatal */
  }
}

// Patch fields on a contract doc — port of utils.js updateContractField. Year from
// the contract's date. Used for shipment status / ETD / ETA edits.
export async function updateContractField(
  uidCollection: string,
  contractId: string,
  contractDate: string,
  patch: Record<string, unknown>
): Promise<void> {
  const year = contractDate.substring(0, 4);
  await updateDoc(doc(db, uidCollection, 'data', `contracts_${year}`, contractId), patch);
}

// Set fields on a Misc (special) invoice — port of utils.js updateSpecialInvoiceField.
// Merge so the manual category tag doesn't clobber derived fields.
export async function updateSpecialInvoiceField(
  uidCollection: string,
  id: string,
  fields: Record<string, unknown>
): Promise<void> {
  await setDoc(doc(db, uidCollection, 'data', 'specialInvoices', id), fields, { merge: true });
}

// ── stock lots ───────────────────────────────────────────────────────────────
// Batch-set stock lot docs — port of utils.js saveStockIn.
export async function saveStockIn(uidCollection: string, stockArr: any[]): Promise<boolean> {
  const batch = writeBatch(db);
  stockArr.forEach((s) => batch.set(doc(db, uidCollection, 'data', 'stocks', s.id), s));
  await batch.commit();
  return true;
}

// Shared Stock (IMS + GIS) writes — the joint pool lives in its own fixed
// namespace both accounts read/write. Ports of utils.js saveSharedStock /
// deleteSharedStock.
export const SHARED_STOCK_UID = 'SHARED_STOCK';
export const saveSharedStock = (stockArr: any[]) => saveStockIn(SHARED_STOCK_UID, stockArr);
export async function deleteSharedStock(id: string): Promise<void> {
  if (!id) return;
  try {
    await deleteDoc(doc(db, SHARED_STOCK_UID, 'data', 'stocks', id));
  } catch {
    /* non-fatal — web logs and continues too */
  }
}

// Batch-delete stock lot docs by id — port of utils.js delStock.
export async function delStock(uidCollection: string, ids: string[]): Promise<void> {
  if (!ids?.length) return;
  const batch = writeBatch(db);
  ids.forEach((id) => batch.delete(doc(db, uidCollection, 'data', 'stocks', id)));
  await batch.commit();
}

// Merge-write Misc (special) invoice rows — port of utils.js speciaInvoices. Merge
// keeps the manual category tag set on the Misc Invoices page.
export async function speciaInvoices(uidCollection: string, data: any[]): Promise<boolean> {
  if (!data.length) return true;
  const batch = writeBatch(db);
  data.forEach((row) => batch.set(doc(db, uidCollection, 'data', 'specialInvoices', row.id), row, { merge: true }));
  await batch.commit();
  return true;
}

// Faithful port of useContractsState.saveData_stocks — used by Final Settlement (and,
// later, the warehouse-in modal). Writes the stock lots (re-stamped from the contract),
// re-saves the contract with the lot id list, then regenerates the Misc-invoice rows for
// lots flagged spInv. Returns the updated contract so the caller can refresh state.
export async function saveContractStocks(
  uidCollection: string,
  valueCon: Contract,
  data: any[]
): Promise<Contract> {
  if (data.length === 0 && (valueCon.stock?.length || 0) === 0) return valueCon;

  // Remove lots that are no longer part of the contract.
  const keepIds = data.map((x) => x.id);
  const delItems = (valueCon.stock || []).filter((id) => !keepIds.includes(id));
  if (delItems.length > 0) await delStock(uidCollection, delItems);

  // Re-stamp each lot from the contract (type 'in'), preserving the lot's own fields
  // (final values + fsDraft flags survive via the leading spread).
  const tmpdata = data.map((x) => ({
    ...x,
    supplier: valueCon.supplier,
    productsData: valueCon.productsData,
    order: valueCon.order,
    cur: valueCon.cur,
    poInvoices: valueCon.poInvoices,
    qTypeTable: valueCon.qTypeTable,
    contractData: { id: valueCon.id, date: valueCon.dateRange?.startDate },
    type: 'in',
    originSupplier: (valueCon as any).originSupplier || null,
  }));

  await saveStockIn(uidCollection, tmpdata);

  const tmp: Contract = { ...valueCon, stock: keepIds };
  await writeContractDoc(uidCollection, tmp);

  // Regenerate Misc-invoice rows for lots flagged for special invoicing.
  const newData = tmpdata
    .filter((q) => q.spInv)
    .map((z) => {
      const aa = (z.poInvoices || []).find((a: any) => a.id === z.poInvoice);
      const bb = (z.productsData || []).find((a: any) => a.id === z.description);
      return {
        compName: z.compName,
        date: z.indDate?.startDate ?? null,
        supplier: z.supplier,
        order: z.order,
        invoice: aa?.inv,
        id: z.id,
        salesInvoice: aa?.invRef?.[0] || '',
        description: bb?.description,
        cur: valueCon.cur,
        qnty: z.qnty,
        unitPrc: z.unitPrc,
        total: z.total,
        paidNotPaid: (Number(aa?.pmnt) / Number(aa?.invValue)) > 0.95 ? 'Paid' : 'Not Paid',
        originSupplier: (valueCon as any).originSupplier,
      };
    });
  await speciaInvoices(uidCollection, newData);

  return tmp;
}

// Save a settings-style doc ({uid}/{docId}) — port of utils.js saveDataSettings.
export async function saveDataSettings(uidCollection: string, docId: string, obj: any): Promise<boolean> {
  await setDoc(doc(db, uidCollection, docId), obj);
  return true;
}

// ── storage tagging ──────────────────────────────────────────────────────────
// Patch a field on an expense doc — port of utils.js updateExpenseField. Used to
// tag a storage invoice to a warehouse + month (self-contained write).
export async function updateExpenseField(
  uidCollection: string,
  expenseId: string,
  expenseDate: string,
  patch: Record<string, unknown>
): Promise<void> {
  const year = expenseDate.substring(0, 4);
  await updateDoc(doc(db, uidCollection, 'data', `expenses_${year}`, expenseId), patch);
}

// Delete a contract — guarded by the same rules as the web app (no linked
// invoices / stock / poInvoices). Returns a reason string when blocked.
export async function deleteContract(
  uidCollection: string,
  value: Contract
): Promise<{ ok: boolean; reason?: string }> {
  if ((value.invoices?.length || 0) > 0) return { ok: false, reason: 'Contract has linked invoices.' };
  if ((value.stock?.length || 0) > 0) return { ok: false, reason: 'Contract has stock entries.' };
  if ((value.poInvoices?.length || 0) > 0) return { ok: false, reason: 'Contract has purchase invoices.' };
  const y = (value.dateRange?.startDate || value.date || '').substring(0, 4);
  if (!y || !value.id) return { ok: false, reason: 'Invalid contract.' };
  await deleteContractDoc(uidCollection, value.id, y);
  return { ok: true };
}
