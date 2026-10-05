// The screens' bulk reads — over Firestore Lite, shared, and never queued behind a listener.
//
// WHY (measured on production data, 2026-10-05 — mobile/__tests__/perf/_load-path.smoke.ts)
// The full Firestore SDK runs every query AND every listener on one stream, and releases
// results only when everything asked for at that moment has arrived. So while the 5.3 MB
// stock ledger was loading (it starts at sign-in) the Dashboard's first request — 209 KB —
// took 9.3 s, and Cashflow's 1 KB settings document 8.9 s. Firestore Lite makes plain,
// separate HTTPS requests instead: the same Dashboard reads finished in 1.6 s WHILE the
// ledger was still loading on the main stream, and the ledger itself came down in 3.5 s
// instead of 9–12.
//
// So: reads that a screen only DISPLAYS go through here. Listeners stay on the full SDK
// (that is what it is for), and so does every read inside a save (data/writes.ts): a save
// must see the user's own writes that the server has not confirmed yet, which only the full
// SDK can show. A display read does not need that — every save is awaited until the server
// has it, and the screens refresh after that.
//
// Reads are shared (data/readCache.ts): a request already under way is joined, a result
// younger than READ_TTL_MS is reused. Each read is ONE request — paging the 5.3 MB ledger in
// sequential pages of 1,000 was measured at 6.2 s against 3.5 s in one go. If Lite fails for
// any reason the same read is made once more through the full SDK, so the worst case is the
// old behaviour.

import {
  collection as liteCollection,
  doc as liteDoc,
  getDoc as liteGetDoc,
  getDocs as liteGetDocs,
  getFirestore as liteFirestore,
  query as liteQuery,
  where as liteWhere,
} from 'firebase/firestore/lite';
import { collection, doc, getDoc, getDocs, query, where, type WhereFilterOp } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { createReadCache } from './readCache';
import type { DateRange, Row } from './rangeReads';

/** A stored document as either SDK hands it over: an id and a way to read its fields. */
interface Stored {
  id: string;
  data(): any;
}

/** One filter, in a form either SDK can build. */
type Filter = [field: string, op: WhereFilterOp, value: unknown];

/** Equal to the query client's staleTime (query/client.ts). */
export const READ_TTL_MS = 2 * 60_000;
/**
 * A Lite request that has not answered by then is given up and the read made through the
 * full SDK instead — a plain request has no reconnect of its own, and one that stalls
 * without failing would otherwise hold every screen joined to it. Far above any read's
 * normal time (a year of invoices: ~1 s; the 5.3 MB ledger: ~3.5 s on a laptop, longer
 * on a phone, hence its own limit).
 */
export const LITE_GIVE_UP_MS = 45_000;
export const LITE_GIVE_UP_LEDGER_MS = 180_000;

/** `promise`, or a rejection once `ms` have passed without an answer. */
function within<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no answer in ${ms} ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

const cache = createReadCache<Stored[]>({
  now: () => Date.now(),
  ttlMs: READ_TTL_MS,
  later: (fn, ms) => {
    setTimeout(fn, ms);
  },
});

/**
 * `{…segments}` over Firestore Lite, in one request: the documents matching `filters`, in
 * the server's order, or with no filters every document, in document-id order — exactly
 * what the full SDK returns for the same read. Any failure: the same read through the full SDK.
 */
async function fetchDocs(segments: string[], filters: Filter[] = [], giveUpMs = LITE_GIVE_UP_MS): Promise<Stored[]> {
  const [first, ...rest] = segments;
  try {
    const ref = liteCollection(liteFirestore(app), first, ...rest);
    return (await within(liteGetDocs(filters.length ? liteQuery(ref, ...filters.map(([f, op, v]) => liteWhere(f, op, v))) : ref), giveUpMs)).docs;
  } catch {
    // Lite unavailable, stalled, or the device offline: the read every screen made before.
    // Its own failure is the caller's to handle.
    const ref = collection(db, first, ...rest);
    const snap = await getDocs(filters.length ? query(ref, ...filters.map(([f, op, v]) => where(f, op, v))) : ref);
    return snap.docs;
  }
}

// Each call gets its OWN field objects, as a fresh query did, so one screen changing a
// record it holds cannot leak into another's.
const materialise = (stored: Stored[]): Row[] => stored.map((d) => ({ id: d.id, data: d.data() }));

/** Every document of `{uid}/…segments`, in document-id order. Shared for READ_TTL_MS. */
export async function readRows(uid: string, ...segments: string[]): Promise<Row[]> {
  const path = [uid, ...segments];
  return materialise(await cache.get(path.join('/'), () => fetchDocs(path)));
}

/** The shared whole read of `{uid}/…segments` if one is held or under way. Never starts one. */
export function peekRows(uid: string, ...segments: string[]): Promise<Row[]> | null {
  const held = cache.peek([uid, ...segments].join('/'));
  return held ? held.then(materialise) : null;
}

/**
 * The documents of `{uid}/…segments` whose `date` lies in the range, inclusive — the
 * server's own filter, in its own order (date, then document id). Shared per range.
 */
export async function readRange(uid: string, range: DateRange, ...segments: string[]): Promise<Row[]> {
  const path = [uid, ...segments];
  const key = `${path.join('/')}?date=${range.start}..${range.end}`;
  return materialise(
    await cache.get(key, () =>
      fetchDocs(path, [
        ['date', '>=', range.start],
        ['date', '<=', range.end],
      ])
    )
  );
}

/** `where(field, 'in', values)` — at most 30 values, Firestore's limit. One request, not shared. */
export async function readMatching(uid: string, field: string, values: unknown[], ...segments: string[]): Promise<Row[]> {
  return materialise(await fetchDocs([uid, ...segments], [[field, 'in', values]]));
}

/**
 * Every document of `{uid}/…segments`, read now and not kept — for a collection that a
 * listener holds from then on (the stock ledger).
 */
export async function readWholeOnce(uid: string, ...segments: string[]): Promise<Row[]> {
  return materialise(await fetchDocs([uid, ...segments], [], LITE_GIVE_UP_LEDGER_MS));
}

/** One document by path — not shared (it is small), but off the listeners' stream. */
export async function readDocument<T = any>(uid: string, ...segments: string[]): Promise<T | Record<string, never>> {
  try {
    const snap = await within(liteGetDoc(liteDoc(liteFirestore(app), uid, ...segments)), LITE_GIVE_UP_MS);
    return snap.exists() ? (snap.data() as T) : {};
  } catch {
    const snap = await getDoc(doc(db, uid, ...segments));
    return snap.exists() ? (snap.data() as T) : {};
  }
}

/** Forget every shared read now — a pull-to-refresh, a sign-out. */
export const clearCollectionReads = (): void => cache.clear();

/** Forget every shared read, once for a burst of events — any query invalidation. */
export const clearCollectionReadsOnChange = (): void => cache.clearOncePerTick();

/**
 * Wrap a write: shared reads are dropped when it starts and again when it settles, so a
 * read that began before the write is never served to a screen refreshing after it.
 */
export function aroundWrite<T>(write: Promise<T>): Promise<T> {
  cache.clear();
  const done = () => cache.clear();
  Promise.resolve(write).then(done, done);
  return write;
}
