/**
 * The Dashboard / Cashflow loading path as committed in 10695806 (2026-10-05), kept verbatim
 * so _load-path.smoke.ts can measure it against the current one and compare their results
 * record for record. Every read here goes through the full Firestore SDK, as it did then.
 * Not app code — nothing in mobile/src imports this.
 */
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dedupeById } from '@shared/pureHelpers';
import { contractInvoicesFromIndex } from '@/data/firestore';
import type { InvoiceIndex } from '@/data/firestore';
import { getCur } from '@/data/writes';
import type { Contract, DateSelect, Invoice } from '@/data/types';

export async function loadData<T = any>(uidCollection: string, path: string, dateSelect: DateSelect): Promise<T[]> {
  const startYr = parseInt(dateSelect.start?.substring(0, 4));
  const endYr = parseInt(dateSelect.end?.substring(0, 4));
  if (!startYr || !endYr) return [];
  const years: number[] = [];
  for (let i = startYr; i <= endYr; i++) years.push(i);
  const snapshots = await Promise.all(
    years.map((yr) =>
      getDocs(
        query(
          collection(db, uidCollection, 'data', `${path}_${yr}`),
          where('date', '>=', dateSelect.start),
          where('date', '<=', dateSelect.end)
        )
      )
    )
  );
  return dedupeById<T>(snapshots.flatMap((snap) => snap.docs.map((d) => ({ id: d.id, data: d.data() as T }))));
}

export async function loadInvoicesTagged(uidCollection: string, dateSelect: DateSelect): Promise<(Invoice & { __yr: string })[]> {
  const startYr = parseInt(dateSelect.start?.substring(0, 4));
  const endYr = parseInt(dateSelect.end?.substring(0, 4));
  if (!startYr || !endYr) return [];
  const years: number[] = [];
  for (let i = startYr; i <= endYr; i++) years.push(i);
  const snapshots = await Promise.all(
    years.map((yr) =>
      getDocs(
        query(
          collection(db, uidCollection, 'data', `invoices_${yr}`),
          where('date', '>=', dateSelect.start),
          where('date', '<=', dateSelect.end)
        )
      ).then((snap) => ({ yr, snap }))
    )
  );
  return dedupeById<Invoice & { __yr: string }>(
    snapshots.flatMap(({ yr, snap }) => snap.docs.map((d) => ({ id: d.id, data: { ...(d.data() as Invoice), __yr: String(yr) } })))
  );
}

export async function loadMargins(uidCollection: string, year: number | string): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'margins', String(year)));
  return snap.docs.map((d) => d.data());
}

export async function loadNotifications(uidCollection: string, max = 100): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'data', 'notifications'));
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, max);
}

export async function loadAllStockData(uidCollection: string): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'data', 'stocks'));
  return snap.docs.map((d) => d.data());
}

export async function loadFlatByDate<T = any>(uidCollection: string, path: string, dateSelect: DateSelect): Promise<T[]> {
  const snap = await getDocs(
    query(collection(db, uidCollection, 'data', path), where('date', '>=', dateSelect.start), where('date', '<=', dateSelect.end))
  );
  return snap.docs.map((d) => d.data() as T);
}

export async function loadDataSettings<T = any>(uidCollection: string, doc1: string): Promise<T | Record<string, never>> {
  const snap = await getDoc(doc(db, uidCollection, doc1));
  return snap.exists() ? (snap.data() as T) : {};
}

async function getInvoicesBatched(uidCollection: string, path: string, needByYear: Record<string, number[]>): Promise<Record<string, Invoice[]>> {
  const CHUNK = 30;
  const entries: { yr: string; chunk: number[] }[] = [];
  for (const [yr, numbers] of Object.entries(needByYear || {})) {
    const uniq = [...new Set(numbers)].filter((n) => n != null);
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const chunk = uniq.slice(i, i + CHUNK);
      if (chunk.length) entries.push({ yr, chunk });
    }
  }
  const snaps = await Promise.all(
    entries.map((e) => getDocs(query(collection(db, uidCollection, 'data', `${path}_${e.yr}`), where('invoice', 'in', e.chunk))))
  );
  const byYear: Record<string, Invoice[]> = {};
  snaps.forEach((snap, idx) => {
    const yr = entries[idx].yr;
    byYear[yr] ||= [];
    snap.docs.forEach((d) => byYear[yr].push(d.data() as Invoice));
  });
  return byYear;
}

async function loadDocsByIdBatched<T = any>(uidCollection: string, path: string, refs: { id?: string; date?: string }[]): Promise<Record<string, T>> {
  const CHUNK = 30;
  const byYear: Record<string, Set<string>> = {};
  (refs || []).forEach((r) => {
    if (r?.id && r?.date) (byYear[r.date.substring(0, 4)] ||= new Set()).add(r.id);
  });
  const entries: { yr: string; chunk: string[] }[] = [];
  for (const [yr, ids] of Object.entries(byYear)) {
    const list = [...ids];
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK);
      if (chunk.length) entries.push({ yr, chunk });
    }
  }
  const snaps = await Promise.all(
    entries.map((e) => getDocs(query(collection(db, uidCollection, 'data', `${path}_${e.yr}`), where('id', 'in', e.chunk))))
  );
  const index: Record<string, T> = {};
  snaps.forEach((snap) =>
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data?.id) index[data.id] = data as T;
    })
  );
  return index;
}

export async function buildInvoiceIndex(uidCollection: string, contracts: Contract[]): Promise<InvoiceIndex> {
  const needByYear: Record<string, number[]> = {};
  const legacyRefs: { id?: string; date?: string }[] = [];
  (contracts || []).forEach((con) =>
    (con.invoices || []).forEach((ref: any) => {
      if (!ref?.date) return;
      if (ref.invoice != null) (needByYear[ref.date.substring(0, 4)] ||= []).push(ref.invoice);
      else if (ref.id) legacyRefs.push(ref);
    })
  );
  const invByYear = await getInvoicesBatched(uidCollection, 'invoices', needByYear);
  const index: InvoiceIndex = {};
  Object.entries(invByYear).forEach(([yr, docs]) => {
    const m = (index[yr] = {} as Record<number, Invoice[]>);
    docs.forEach((d) => ((m[d.invoice as number] ||= []).push(d)));
  });
  index.__byId = legacyRefs.length ? await loadDocsByIdBatched<Invoice>(uidCollection, 'invoices', legacyRefs) : {};
  return index;
}

/** useDashboard's queryFn as committed: nine awaits, one after another. */
export async function dashboardInputs(uid: string, dateSelect: DateSelect) {
  const contracts = await loadData<Contract>(uid, 'contracts', dateSelect);
  const invIndex = await buildInvoiceIndex(uid, contracts);
  const enriched = contracts.map((c) => ({ ...c, invoicesData: contractInvoicesFromIndex(c, invIndex, true) as Invoice[][] }));
  const periodInvoices = await loadData<Invoice>(uid, 'invoices', dateSelect);
  const curYr = new Date().getFullYear();
  const recvInvoices = await loadData<Invoice>(uid, 'invoices', { start: `${curYr - 3}-01-01`, end: `${curYr}-12-31` });
  const misc = await loadFlatByDate<any>(uid, 'specialInvoices', dateSelect);
  const expenseRows = await loadData<any>(uid, 'expenses', dateSelect);
  const liveRate = await getCur(new Date().toISOString().slice(0, 10)).catch(() => 0);
  const margins = await loadMargins(uid, Number(dateSelect.start.substring(0, 4))).catch(() => []);
  const companyExpenses = await loadFlatByDate<any>(uid, 'companyExpenses', dateSelect).catch(() => []);
  return { enriched, periodInvoices, recvInvoices, misc: misc.filter(Boolean), expenseRows, liveRate, margins, companyExpenses };
}

/** useCashflow's queryFn as committed. */
export async function cashflowInputs(uid: string, curYr: number) {
  const range4y = { start: `${curYr - 3}-01-01`, end: `${curYr}-12-31` };
  const range2y = { start: `${curYr - 1}-01-01`, end: `${curYr}-12-31` };
  const [invoices, contracts4y, contracts2y, expenses, companyExpenses, margins, cashflowDoc] = await Promise.all([
    loadInvoicesTagged(uid, range4y),
    loadData<Contract>(uid, 'contracts', range4y),
    loadData<Contract>(uid, 'contracts', range2y),
    loadData<any>(uid, 'expenses', range2y),
    loadFlatByDate<any>(uid, 'companyExpenses', range2y),
    Promise.all([curYr - 1, curYr].map((y) => loadMargins(uid, y).catch(() => []))).then((a) => a.flat()),
    loadDataSettings<any>(uid, 'cashflow').catch(() => ({})),
  ]);
  return { invoices, contracts4y, contracts2y, expenses, companyExpenses, margins, cashflowDoc };
}

/** The stock ledger as the listener's first snapshot delivered it. */
export async function ledger(uid: string): Promise<any[]> {
  const snap = await getDocs(collection(db, uid, 'data', 'stocks'));
  return snap.docs.map((d) => d.data()).filter(Boolean);
}

/** A whole collection over the full SDK — what a listener's first snapshot downloads. */
export const whole = (uid: string, ...seg: string[]) => getDocs(collection(db, uid, ...seg)).catch(() => null);

/** What started at sign-in beside the first screen: the ledger, the six live-sync watchers' first reads, the notification badge. */
export function launchBackground(uid: string, year: number) {
  return Promise.all([
    whole(uid, 'data', 'stocks'),
    whole(uid, 'data', `invoices_${year}`),
    whole(uid, 'data', `contracts_${year}`),
    whole(uid, 'data', `expenses_${year}`),
    whole(uid, 'data', 'companyExpenses'),
    whole(uid, 'data', 'specialinvoices'),
    whole(uid, 'data', 'salescontracts'),
    loadNotifications(uid),
  ]);
}
