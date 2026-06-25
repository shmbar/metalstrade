// Firestore read layer — a faithful TypeScript port of the relevant functions in
// the web app's utils/utils.js. Query shapes (year-bucketed collections keyed by
// date.substring(0,4), `in`-chunking at 30, multi-year fan-out) are preserved
// EXACTLY so results match the CRM. Writes are intentionally out of scope for the
// read-path slice and will be ported alongside the form screens.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Contract, Invoice, Settings, CompanyData, DateSelect } from './types';

// ── settings / singletons ────────────────────────────────────────────────────
export async function loadDataSettings<T = any>(uidCollection: string, doc1: string): Promise<T | {}> {
  const snap = await getDoc(doc(db, uidCollection, doc1));
  return snap.exists() ? (snap.data() as T) : {};
}

export const loadSettings = (uid: string) => loadDataSettings<Settings>(uid, 'settings');
export const loadCompanyData = (uid: string) => loadDataSettings<CompanyData>(uid, 'cmpnyData');

// ── year-bucketed range read (contracts / invoices / expenses) ───────────────
// Mirrors utils.js loadData: one query per year in the range, filtered on `date`.
export async function loadData<T = any>(
  uidCollection: string,
  path: string,
  dateSelect: DateSelect
): Promise<T[]> {
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

  return snapshots.flatMap((snap) => snap.docs.map((d) => d.data() as T));
}

// Year-tagged invoice range read. Identical query to loadData('invoices'), but
// stamps each doc with `__yr` (its source bucket) so a later write can target the
// exact collection without re-deriving the year from a (possibly non-ISO) date.
export async function loadInvoicesTagged(
  uidCollection: string,
  dateSelect: DateSelect
): Promise<(Invoice & { __yr: string })[]> {
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
  return snapshots.flatMap(({ yr, snap }) =>
    snap.docs.map((d) => ({ ...(d.data() as Invoice), __yr: String(yr) }))
  );
}

// Activity feed — append-only {uid}/data/activity, newest first. Port of
// utils.js loadActivity (sorted client-side, no composite index needed).
export async function loadActivity(
  uidCollection: string,
  opts: { entityType?: string; entityId?: string; max?: number } = {}
): Promise<any[]> {
  const { entityType, entityId, max = 200 } = opts;
  const snap = await getDocs(collection(db, uidCollection, 'data', 'activity'));
  let rows = snap.docs.map((d) => d.data());
  if (entityType) rows = rows.filter((r) => r.entityType === entityType);
  if (entityId) rows = rows.filter((r) => r.entityId === entityId);
  rows.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return rows.slice(0, max);
}

// Monthly margins for a year — port of utils.js loadMargins ({uid}/margins/{year}).
export async function loadMargins(uidCollection: string, year: number | string): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'margins', String(year)));
  return snap.docs.map((d) => d.data());
}

// Precomputed per-client account statement — port of utils.js loadAcntStatement.
// Path: {uid}/actStatements/{year}/{clientId}/{date1}/{date1}; returns the doc (with
// a `.data` rows array) or [] if absent. date1 is 'mid<Mon>' (15th) or full month name.
export async function loadAcntStatement(
  uidCollection: string,
  year: string,
  clientId: string,
  date1: string
): Promise<any> {
  const snap = await getDoc(doc(db, uidCollection, 'actStatements', year, clientId, date1, date1));
  return snap.exists() ? snap.data() : [];
}

// Notification center — {uid}/data/notifications, newest first (sorted client-side).
export async function loadNotifications(uidCollection: string, max = 100): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'data', 'notifications'));
  return snap.docs
    .map((d) => d.data())
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, max);
}

// Material composition tables — flat {uid}/data/materialtables. Port of loadMaterials.
export async function loadMaterials(uidCollection: string): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'data', 'materialtables'));
  return snap.docs.map((d) => d.data());
}

// All stock lots — flat (non year-bucketed) `stocks` collection. Port of
// utils.js loadAllStockData.
export async function loadAllStockData(uidCollection: string): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'data', 'stocks'));
  return snap.docs.map((d) => d.data());
}

// Stock lots by id (chunked `in` at 30) — port of utils.js loadStockData('id', …).
export async function loadStockDataByIds(uidCollection: string, ids: string[]): Promise<any[]> {
  const CHUNK = 30;
  const out: any[] = [];
  for (let i = 0; i < (ids?.length || 0); i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    if (!chunk.length) continue;
    const snap = await getDocs(
      query(collection(db, uidCollection, 'data', 'stocks'), where('id', 'in', chunk))
    );
    snap.forEach((d) => out.push(d.data()));
  }
  return out;
}

// Read one invoice doc from a known year bucket (no date-string parsing).
export async function loadInvoiceDocByYear(
  uidCollection: string,
  id: string,
  year: string
): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, uidCollection, 'data', `invoices_${year}`, id));
  return snap.exists() ? (snap.data() as Invoice) : null;
}

// Flat (non year-bucketed) range read — used for specialInvoices (Misc Invoices)
// and companyExpenses. Mirrors utils.js loadCompanyExpenses.
export async function loadFlatByDate<T = any>(
  uidCollection: string,
  path: string,
  dateSelect: DateSelect
): Promise<T[]> {
  const snap = await getDocs(
    query(
      collection(db, uidCollection, 'data', path),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end)
    )
  );
  return snap.docs.map((d) => d.data() as T);
}

// ── batched invoice index (the N+1 killer from utils.js) ─────────────────────
function groupedArrayInvoice(arrD: Invoice[]): Invoice[][] {
  const sorted = [...arrD].sort((a, b) => (a.invoice ?? 0) - (b.invoice ?? 0));
  return sorted.reduce<Invoice[][]>((result, obj) => {
    const group = result.find((g) => g[0]?.invoice === obj.invoice);
    if (group) group.push(obj);
    else result.push([obj]);
    return result;
  }, []);
}

async function getInvoicesBatched(
  uidCollection: string,
  path: string,
  needByYear: Record<string, number[]>
): Promise<Record<string, Invoice[]>> {
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
    entries.map((e) =>
      getDocs(query(collection(db, uidCollection, 'data', `${path}_${e.yr}`), where('invoice', 'in', e.chunk)))
    )
  );
  const byYear: Record<string, Invoice[]> = {};
  snaps.forEach((snap, idx) => {
    const yr = entries[idx].yr;
    byYear[yr] ||= [];
    snap.docs.forEach((d) => byYear[yr].push(d.data() as Invoice));
  });
  return byYear;
}

export async function buildInvoiceIndex(
  uidCollection: string,
  contracts: Contract[]
): Promise<Record<string, Record<number, Invoice[]>>> {
  const needByYear: Record<string, number[]> = {};
  (contracts || []).forEach((con) =>
    (con.invoices || []).forEach((ref) => {
      if (ref?.date && ref.invoice != null) (needByYear[ref.date.substring(0, 4)] ||= []).push(ref.invoice);
    })
  );
  const invByYear = await getInvoicesBatched(uidCollection, 'invoices', needByYear);
  const index: Record<string, Record<number, Invoice[]>> = {};
  Object.entries(invByYear).forEach(([yr, docs]) => {
    const m = (index[yr] = {} as Record<number, Invoice[]>);
    docs.forEach((d) => ((m[d.invoice as number] ||= []).push(d)));
  });
  return index;
}

export function contractInvoicesFromIndex(
  con: Contract,
  index: Record<string, Record<number, Invoice[]>>,
  grouped = true
): Invoice[] | Invoice[][] {
  const refs = con?.invoices || [];
  const yrs = [...new Set(refs.map((x) => x.date.substring(0, 4)))];
  const collected: Invoice[] = [];
  yrs.forEach((yr) => {
    const nums = [...new Set(refs.filter((x) => x.date.substring(0, 4) === yr).map((y) => y.invoice))];
    nums.forEach((n) => (index[yr]?.[n] || []).forEach((d) => collected.push({ ...d })));
  });
  return grouped ? groupedArrayInvoice(collected) : collected;
}

// Load one doc by id from a year-bucketed path (year from the ref's date) — port
// of utils.js loadInvoice(uidCollection, path, obj).
export async function loadDocByIdDate<T = any>(
  uidCollection: string,
  path: string,
  ref: { id: string; date?: string }
): Promise<T | {}> {
  const y = (ref.date || '').substring(0, 4);
  if (!y || !ref.id) return {};
  const snap = await getDoc(doc(db, uidCollection, 'data', `${path}_${y}`, ref.id));
  return snap.exists() ? (snap.data() as T) : {};
}

// Load expenses by id across years (chunked `in` 30) — port of utils.js
// loadExpensesForAccounting. `refs` carry { id, date }.
export async function loadExpensesForAccounting(
  uidCollection: string,
  refs: { id: string; date: string }[]
): Promise<any[]> {
  const yrs = [...new Set((refs || []).map((x) => x.date.substring(0, 4)))];
  let out: any[] = [];
  for (const yr of yrs) {
    const ids = refs.filter((x) => x.date.substring(0, 4) === yr).map((x) => x.id);
    for (let k = 0; k < ids.length; k += 30) {
      const chunk = ids.slice(k, k + 30);
      if (!chunk.length) continue;
      const snap = await getDocs(query(collection(db, uidCollection, 'data', `expenses_${yr}`), where('id', 'in', chunk)));
      out = [...out, ...snap.docs.map((d) => d.data())];
    }
  }
  return out;
}

// Load additional credit/final-note invoices by id across years — port of
// utils.js loadAdditionalCNFN. `refs` carry { id, date }.
export async function loadAdditionalCNFN(
  uidCollection: string,
  refs: { id: string; date: string }[]
): Promise<any[]> {
  const yrs = [...new Set((refs || []).map((x) => x.date.substring(0, 4)))];
  let out: any[] = [];
  for (const yr of yrs) {
    const ids = refs.filter((x) => x.date.substring(0, 4) === yr).map((x) => x.id);
    for (let k = 0; k < ids.length; k += 30) {
      const chunk = ids.slice(k, k + 30);
      if (!chunk.length) continue;
      const snap = await getDocs(query(collection(db, uidCollection, 'data', `invoices_${yr}`), where('id', 'in', chunk)));
      out = [...out, ...snap.docs.map((d) => d.data())];
    }
  }
  return out;
}

// One contract by order number — mirrors utils.js loadContract (year extracted
// from the order string's embedded yy).
export async function loadContractByOrder(uidCollection: string, orderNum: string): Promise<Contract[]> {
  const extractYear = (str: string): number | null => {
    if (!/^\d{4}-?\d{2}/.test(str)) return null;
    const yy = str[4] === '-' ? str.slice(5, 7) : str.slice(4, 6);
    return 2000 + Number(yy);
  };
  const year = extractYear(orderNum);
  if (!year) return [];
  const snap = await getDocs(
    query(collection(db, uidCollection, 'data', `contracts_${year}`), where('order', '==', orderNum))
  );
  return snap.docs.map((d) => d.data() as Contract);
}
