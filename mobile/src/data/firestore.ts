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
  setDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Contract, Invoice, Settings, CompanyData, DateSelect } from './types';
import { peekRows, readDocument, readMatching, readRange, readRows } from './collectionReads';
import { bucketYears, chunked, coversYear, inDateRange, matchingInChunks, mergeBuckets, Row } from './rangeReads';
import { invoiceRank, invoiceBookedOn, docsInForce } from '@shared/finance';

// ── settings / singletons ────────────────────────────────────────────────────
export async function loadDataSettings<T = any>(uidCollection: string, doc1: string): Promise<T | {}> {
  const snap = await getDoc(doc(db, uidCollection, doc1));
  return snap.exists() ? (snap.data() as T) : {};
}

export const loadSettings = (uid: string) => loadDataSettings<Settings>(uid, 'settings');
export const loadCompanyData = (uid: string) => loadDataSettings<CompanyData>(uid, 'cmpnyData');

/**
 * The same document as loadDataSettings, for a screen that only DISPLAYS it (Cashflow's
 * {uid}/cashflow): read off the listeners' stream (data/collectionReads.ts), so it is not
 * held up behind the stock ledger. The settings store keeps loadDataSettings — it can run
 * while the user's own edit to the document is still on its way to the server.
 */
export const loadDisplayDocument = <T = any>(uidCollection: string, doc1: string): Promise<T | Record<string, never>> =>
  readDocument<T>(uidCollection, doc1);

// ── year-bucketed range read (contracts / invoices / expenses) ───────────────
// The same RESULT as utils.js loadData — every record of the year buckets the range
// spans whose `date` falls inside it, in date order, one per document id — reached
// through the shared read layer (collectionReads.ts) instead of a query per screen:
//  - a bucket whose whole year is inside the range is read whole, once, and shared — the
//    Dashboard and Cashflow ask for the same years again and again in different ranges;
//  - a bucket already read whole (or being read) is cut down to the range here
//    (rangeReads.ts) instead of being asked for again;
//  - anything else is the same `date >= start && date <= end` query as before.
// Every path returns the records in the server's order, so nothing downstream can tell.
//
// A record re-dated across a year boundary can survive in TWO buckets under the same
// document id, so a multi-year window hands it back twice and every consumer counts
// two real rows — Cashflow's Supplier - Balances listed one purchase invoice on two
// lines and doubled it in the total. Web fixed this in utils.js loadData (1d51dce1);
// dedupeById is the shared helper both apps use, byte-identical (inside mergeBuckets).
function bucketInRange(uidCollection: string, path: string, yr: number, range: DateSelect): Promise<Row[]> {
  const segments = ['data', `${path}_${yr}`];
  const asked = () => readRange(uidCollection, range, ...segments);
  const whole = peekRows(uidCollection, ...segments) ?? (coversYear(range, yr) ? readRows(uidCollection, ...segments) : null);
  return whole ? whole.then((rows) => inDateRange(rows, range), asked) : asked();
}

async function rangeBuckets(uidCollection: string, path: string, range: DateSelect) {
  const years = bucketYears(range);
  if (!years) return null;
  return Promise.all(years.map(async (yr) => ({ yr, rows: await bucketInRange(uidCollection, path, yr, range) })));
}

export async function loadData<T = any>(
  uidCollection: string,
  path: string,
  dateSelect: DateSelect
): Promise<T[]> {
  const buckets = await rangeBuckets(uidCollection, path, dateSelect);
  return buckets ? mergeBuckets<T>(buckets) : [];
}

// Year-tagged invoice range read. Identical to loadData('invoices'), but stamps each
// doc with `__yr` (its source bucket) so a later write can target the exact collection
// without re-deriving the year from a (possibly non-ISO) date. Same year-bucket dedupe;
// the surviving copy keeps ITS bucket tag, so a payment written back lands on the
// record that won, not on the stale twin.
export async function loadInvoicesTagged(
  uidCollection: string,
  dateSelect: DateSelect
): Promise<(Invoice & { __yr: string })[]> {
  const buckets = await rangeBuckets(uidCollection, 'invoices', dateSelect);
  return buckets ? mergeBuckets<Invoice & { __yr: string }>(buckets, true) : [];
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
// Through the shared read layer: Dashboard and Cashflow both need the current year.
export async function loadMargins(uidCollection: string, year: number | string): Promise<any[]> {
  return (await readRows(uidCollection, 'margins', String(year))).map((r) => r.data);
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

// Notification center — {uid}/data/notifications. Web subscribes with
// orderBy('createdAtMs','desc').limit(100); we read the same window and sort
// client-side (no composite index needed, and legacy docs may lack the field).
// Priority ordering + audience/snooze filtering happen in the reader, exactly as
// useNotificationContext does on web.
// Through the shared read layer: the badge and the screen read it, at launch it no longer
// waits behind the stock ledger, and a mark-as-read (data/writes.ts) drops the shared copy.
export async function loadNotifications(uidCollection: string, max = 100): Promise<any[]> {
  return (await readRows(uidCollection, 'data', 'notifications'))
    .map((r) => r.data)
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    .slice(0, max);
}

// Material composition tables — flat {uid}/data/materialtables. Port of loadMaterials.
export async function loadMaterials(uidCollection: string): Promise<any[]> {
  const snap = await getDocs(collection(db, uidCollection, 'data', 'materialtables'));
  return snap.docs.map((d) => d.data());
}

// All stock lots — flat (non year-bucketed) `stocks` collection. Port of
// utils.js loadAllStockData. Only the Shared Stock pool is read this way now (the
// company's own ledger is a live listener, features/stocks/stockLedger.ts), and only to
// be displayed — on Cashflow among others — so it goes through the shared read layer.
export async function loadAllStockData(uidCollection: string): Promise<any[]> {
  return (await readRows(uidCollection, 'data', 'stocks')).map((r) => r.data);
}

// Contracts in a date range filtered by one entity field (e.g. supplier) — port of
// utils.js loadDataWeightAnalysis. Used by the Weight Analysis report, which is
// scoped to a single supplier.
export async function loadDataWeightAnalysis<T = any>(
  uidCollection: string,
  path: string,
  dateSelect: DateSelect,
  entity: string,
  name: string
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
          where('date', '<=', dateSelect.end),
          where(entity, '==', name)
        )
      )
    )
  );
  return snapshots.flatMap((snap) => snap.docs.map((d) => d.data() as T));
}

// Load a contract's invoices by { yr, arrInv } batches — port of utils.js
// getInvoices. Weight Analysis needs the RAW docs (original AND final note), not
// the deduped set, because it pairs 1111 against 3333.
export async function getInvoicesByNumbers<T = any>(
  uidCollection: string,
  path: string,
  batches: { yr: string; arrInv: any[] }[]
): Promise<T[]> {
  const CHUNK = 30;
  const entries: { yr: string; chunk: any[] }[] = [];
  (batches || []).forEach(({ yr, arrInv }) => {
    const uniq = [...new Set(arrInv)].filter((n) => n != null);
    for (let i = 0; i < uniq.length; i += CHUNK) {
      const chunk = uniq.slice(i, i + CHUNK);
      if (chunk.length) entries.push({ yr, chunk });
    }
  });
  const snaps = await Promise.all(
    entries.map((e) =>
      getDocs(query(collection(db, uidCollection, 'data', `${path}_${e.yr}`), where('invoice', 'in', e.chunk)))
    )
  );
  return snaps.flatMap((snap) => snap.docs.map((d) => d.data() as T));
}

// Shared Stock (IMS + GIS) — inventory jointly held by the two companies. IMS and
// GIS are separate account namespaces, so joint lots live in their own FIXED
// namespace that BOTH accounts read; each account still only sees (a) its own
// private stock and (b) this shared pool. Port of utils.js SHARED_STOCK_UID.
export const SHARED_STOCK_UID = 'SHARED_STOCK';
export const loadSharedStock = () => loadAllStockData(SHARED_STOCK_UID);

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

// Every stock lot of these material lines (chunked `in` at 30) — port of utils.js
// loadStockData('description', …): a shared lot's spec is read from its whole line.
export async function loadStockDataByDescription(uidCollection: string, lineIds: string[]): Promise<any[]> {
  const CHUNK = 30;
  const out: any[] = [];
  for (let i = 0; i < (lineIds?.length || 0); i += CHUNK) {
    const chunk = lineIds.slice(i, i + CHUNK);
    if (!chunk.length) continue;
    const snap = await getDocs(
      query(collection(db, uidCollection, 'data', 'stocks'), where('description', 'in', chunk))
    );
    snap.forEach((d) => out.push(d.data()));
  }
  return out;
}

/**
 * Which of these sales-invoice numbers still exist → Map of number (string) → the PO
 * number its invoice is on. Port of web utils.js existingSalesInvoiceNumbers (66b06dd7).
 * A purchase invoice keeps its link to a sales invoice as the bare number (invRef), so the
 * link outlives a deleted invoice — and a link to an invoice on ANOTHER PO is real
 * (material imported from one PO and sold on another). Every invoice year from 2015 to next
 * year, `in`-chunked at 30, the number tried both as string and as number.
 */
export async function existingSalesInvoiceNumbers(uidCollection: string, numbers: unknown[] = []): Promise<Map<string, string>> {
  const uniq = [...new Set(numbers.map((n) => String(n ?? '').trim()).filter(Boolean))];
  if (!uniq.length) return new Map();
  const forms: (string | number)[] = uniq.flatMap((n) => (Number.isFinite(Number(n)) ? [n, Number(n)] : [n]));
  const chunks: (string | number)[][] = [];
  for (let i = 0; i < forms.length; i += 30) chunks.push(forms.slice(i, i + 30));
  const years: number[] = [];
  for (let y = 2015; y <= new Date().getFullYear() + 1; y++) years.push(y);
  const snaps = await Promise.all(
    years.flatMap((y) =>
      chunks.map((c) => getDocs(query(collection(db, uidCollection, 'data', `invoices_${y}`), where('invoice', 'in', c))))
    )
  );
  const found = new Map<string, string>();
  snaps.forEach((s) =>
    s.docs.forEach((d) => {
      const inv: any = d.data();
      found.set(String(inv.invoice), found.get(String(inv.invoice)) || String(inv.poSupplier?.order || ''));
    })
  );
  return found;
}

/**
 * EVERY stock-ledger row naming one of these line ids — drafts, superseded rows and zero
 * totals included. A safety check, not a stock figure: before Stock-in folds a duplicate
 * hidden entry into its PO line (@shared/productEntries), anything at all still pointing at
 * that entry must be seen. Port of web utils.js loadLedgerRowsReferencing (8f7d81d2).
 */
export async function loadLedgerRowsReferencing(uidCollection: string, lineIds: string[] = []): Promise<any[]> {
  const ids = [...new Set(lineIds.filter(Boolean))];
  if (!ids.length) return [];
  const rows = new Map<string, any>();
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30);
    for (const field of ['description', 'descriptionId']) {
      const snap = await getDocs(query(collection(db, uidCollection, 'data', 'stocks'), where(field, 'in', chunk)));
      snap.docs.forEach((d) => rows.set(d.id, { id: d.id, ...d.data() }));
    }
  }
  return [...rows.values()];
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
  // The same query as before, off the listeners' stream and shared for an identical range
  // (collectionReads.ts) — the Dashboard and the Expenses screen ask for the same period.
  return (await readRange(uidCollection, dateSelect, 'data', path)).map((r) => r.data as T);
}

// ── batched invoice index (the N+1 killer from utils.js) ─────────────────────
function groupedArrayInvoice(arrD: Invoice[]): Invoice[][] {
  const sorted = [...arrD].sort((a, b) => (a.invoice ?? 0) - (b.invoice ?? 0));
  return sorted
    .reduce<Invoice[][]>((result, obj) => {
      const group = result.find((g) => g[0]?.invoice === obj.invoice);
      if (group) group.push(obj);
      else result.push([obj]);
      return result;
    }, [])
    // A draft note does not stand in for the invoice it would replace — web utils.js
    // groupedArrayInvoice (shared pureHelpers docsInForce, 2026-10-07).
    .map((g) => docsInForce(g) as Invoice[]);
}

/**
 * For one year bucket: what `where(field, 'in', chunk)` returns for each chunk in turn. Cut
 * from the bucket when the shared layer already holds it (or is reading it) — on the
 * Dashboard and Cashflow it always is, since both load those very invoice years — and
 * asked of Firestore, a chunk per request as before, when it does not.
 */
async function matchingInBucket(uidCollection: string, bucket: string, field: string, chunks: unknown[][]): Promise<Row[]> {
  const asked = async () =>
    (await Promise.all(chunks.map((chunk) => readMatching(uidCollection, field, chunk, 'data', bucket)))).flat();
  const whole = peekRows(uidCollection, 'data', bucket);
  return whole ? whole.then((rows) => matchingInChunks(rows, field, chunks), asked) : asked();
}

async function getInvoicesBatched(
  uidCollection: string,
  path: string,
  needByYear: Record<string, number[]>
): Promise<Record<string, Invoice[]>> {
  const years = Object.entries(needByYear || {})
    .map(([yr, numbers]) => ({ yr, chunks: chunked(numbers) }))
    .filter((y) => y.chunks.length);
  const found = await Promise.all(years.map((y) => matchingInBucket(uidCollection, `${path}_${y.yr}`, 'invoice', y.chunks)));
  const byYear: Record<string, Invoice[]> = {};
  years.forEach((y, i) => (byYear[y.yr] = found[i].map((r) => r.data as Invoice)));
  return byYear;
}

// Batched sibling of loadDocByIdDate: given { id, date } refs, load all referenced
// docs in one chunked pass (≤30-id `in` queries per year) → { [id]: data }.
// Port of utils.js loadDocsByIdBatched.
export async function loadDocsByIdBatched<T = any>(
  uidCollection: string,
  path: string,
  refs: { id?: string; date?: string }[]
): Promise<Record<string, T>> {
  const byYear: Record<string, Set<string>> = {};
  (refs || []).forEach((r) => {
    if (r?.id && r?.date) (byYear[r.date.substring(0, 4)] ||= new Set()).add(r.id);
  });
  const years = Object.entries(byYear).map(([yr, ids]) => ({ yr, chunks: chunked([...ids]) }));
  const found = await Promise.all(years.map((y) => matchingInBucket(uidCollection, `${path}_${y.yr}`, 'id', y.chunks)));
  // Year after year, chunk after chunk: a later copy of an id overwrites an earlier one,
  // exactly as the original's pass over its query results did.
  const index: Record<string, T> = {};
  found.flat().forEach((r) => {
    const data = r.data as any;
    if (data?.id) index[data.id] = data as T;
  });
  return index;
}

// year → invoiceNumber → docs[], plus __byId for legacy refs. Port of utils.js
// buildInvoiceIndex.
export type InvoiceIndex = Record<string, Record<number, Invoice[]>> & {
  __byId?: Record<string, Invoice>;
};

export async function buildInvoiceIndex(
  uidCollection: string,
  contracts: Contract[]
): Promise<InvoiceIndex> {
  const needByYear: Record<string, number[]> = {};
  // Legacy contract refs are just { id, date } (no invoice number). Number-keyed
  // batching silently dropped them, so every sale on such a contract vanished from
  // the contract's invoice set while id-based readers still counted it — a
  // five-figure-to-millions revenue mismatch on web before this was fixed.
  const legacyRefs: { id?: string; date?: string }[] = [];
  (contracts || []).forEach((con) =>
    (con.invoices || []).forEach((ref: any) => {
      if (!ref?.date) return;
      if (ref.invoice != null) (needByYear[ref.date.substring(0, 4)] ||= []).push(ref.invoice);
      else if (ref.id) legacyRefs.push(ref);
    })
  );
  // Both lookups at once (they used to run one after the other); each hands back its own
  // copies of the records, as two separate queries did.
  const [invByYear, byId] = await Promise.all([
    getInvoicesBatched(uidCollection, 'invoices', needByYear),
    legacyRefs.length ? loadDocsByIdBatched<Invoice>(uidCollection, 'invoices', legacyRefs) : Promise.resolve({}),
  ]);
  const index: InvoiceIndex = {};
  Object.entries(invByYear).forEach(([yr, docs]) => {
    const m = (index[yr] = {} as Record<number, Invoice[]>);
    docs.forEach((d) => ((m[d.invoice as number] ||= []).push(d)));
  });
  index.__byId = byId;
  return index;
}

export function contractInvoicesFromIndex(
  con: Contract,
  index: InvoiceIndex,
  grouped = true
): Invoice[] | Invoice[][] {
  const refs = con?.invoices || [];
  const collected: Invoice[] = [];
  const seen = new Set<string>();
  const push = (d?: Invoice) => {
    if (d && !seen.has(d.id)) {
      seen.add(d.id);
      collected.push({ ...d });
    }
  };
  // Guard every ref: a ref without a date must be skipped, not dereferenced —
  // one such contract used to throw a TypeError and kill the whole fetch.
  refs.forEach((ref: any) => {
    if (!ref?.date) return;
    if (ref.invoice != null) (index[ref.date.substring(0, 4)]?.[ref.invoice] || []).forEach(push);
    else if (ref.id) push(index.__byId?.[ref.id]); // legacy { id, date } ref
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

// The invoices of a period as an accountant books them — port of utils.js
// loadInvoicesBookedIn: every invoice whose ORIGINAL was issued in the period, with all
// of its documents (a note that settled it after the period included), and nothing of
// an invoice issued before it (shared finance.js invoiceBookedOn). Loading only what is
// dated in the period showed a note settling a 2025 invoice as a 2026 sale of $0.00
// with its payments as a credit (2026-10-06).
export async function loadInvoicesBookedIn(uidCollection: string, dateSelect: DateSelect): Promise<Invoice[]> {
  const dt = ((await loadData<Invoice>(uidCollection, 'invoices', dateSelect)) || []).filter(Boolean) as any[];
  const have = new Set(dt.map((d) => d.id));
  const later = dt
    .filter((d) => invoiceRank(d) === 1 && d.cnORfl?.id && typeof d.cnORfl?.date === 'string' && !have.has(d.cnORfl.id))
    .map((d) => d.cnORfl);
  const extra = later.length
    ? (await loadAdditionalCNFN(uidCollection, later)).filter((d: any) => d && d.id && !have.has(d.id))
    : [];
  const groups: Record<string, any[]> = {};
  [...dt, ...extra].forEach((d: any) => {
    const key = d.invoice !== undefined && d.invoice !== null && d.invoice !== '' ? `n:${d.invoice}` : `id:${d.id}`;
    (groups[key] ||= []).push(d);
  });
  const { start, end } = dateSelect || ({} as DateSelect);
  return Object.values(groups)
    .filter((g) => {
      const on = invoiceBookedOn(g);
      return !on || ((!start || on >= start) && (!end || on <= end));
    })
    .flat() as Invoice[];
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

// ── presence ─────────────────────────────────────────────────────────────────
// Verbatim port of utils/utils.js:361-390. Web has written these stamps for a
// while; MOBILE NEVER DID, so anyone using the app was permanently invisible on
// web's "Who's online" panel and their "last here" never moved. That made the
// panel quietly wrong for the web users reading it, not just incomplete here.
//
// Deliberately NOT a source of truth for anything but a green dot: an app that is
// killed stops beating without a chance to say so, which is why readers judge by
// how old the stamp is rather than trusting an `online: false` nobody may have
// written.

/** Write cadence while signed in. */
export const PRESENCE_HEARTBEAT_MS = 120_000;
/** A stamp older than this reads as away. */
export const PRESENCE_ONLINE_MS = 300_000;

export async function touchPresence(
  uidCollection: string,
  actor: { uid?: string; name?: string; email?: string } = {},
  extra: Record<string, any> = {}
): Promise<boolean> {
  if (!uidCollection || !actor?.uid) return false;
  try {
    await setDoc(
      doc(db, uidCollection, 'data', 'presence', actor.uid),
      {
        uid: actor.uid,
        name: actor.name || 'Unknown',
        email: actor.email || '',
        lastSeenMs: Date.now(),
        lastSeen: new Date().toISOString(),
        ...extra, // e.g. { loginAtMs } on a fresh sign-in
      },
      { merge: true }
    );
    return true;
  } catch {
    // Non-fatal by design: a missed heartbeat costs a green dot, never a screen.
    return false;
  }
}

export async function loadPresence(uidCollection: string): Promise<any[]> {
  if (!uidCollection) return [];
  try {
    const snap = await getDocs(collection(db, uidCollection, 'data', 'presence'));
    return snap.docs
      .map((d) => d.data())
      .sort((a: any, b: any) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0));
  } catch {
    return [];
  }
}

/**
 * Sign-out is the one moment a user tells us they are leaving, so record it —
 * a stale heartbeat would otherwise keep them "online" for the next five minutes.
 * splitPresence treats a zeroed stamp as away immediately (utils/utils.js:394).
 */
export async function endPresence(uidCollection: string, uid: string): Promise<boolean> {
  if (!uidCollection || !uid) return false;
  try {
    await setDoc(
      doc(db, uidCollection, 'data', 'presence', uid),
      { lastSeenMs: 0, lastSeen: new Date().toISOString(), signedOut: true },
      { merge: true }
    );
    return true;
  } catch {
    return false;
  }
}
