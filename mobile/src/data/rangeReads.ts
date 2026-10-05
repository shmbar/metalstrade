// What a Firestore query WOULD have returned, worked out from a whole-collection read.
// Pure — no SDK. Covered by __tests__/read-layer.test.ts, and checked record for record,
// in order, against the real queries by mobile/__tests__/perf/_load-path.smoke.ts.
//
// The loaders used to ask Firestore for `date >= start && date <= end` on every year
// bucket, once per screen and per range, so the same year was downloaded over and over:
// the Dashboard read this year's invoices three times in one load. Now a year bucket that a
// range covers whole is read whole, once (data/collectionReads.ts), and every range inside
// it is cut from that one read here. For that to change nothing, these have to reproduce
// the server's answer exactly:
//
//  - WHICH records: a range filter on a string field matches only records where that field
//    is a string inside the bounds — a missing date, a number, a map never match.
//  - WHAT ORDER: a range filter on `date` returns records by date, then by document id. A
//    whole-collection read comes back by document id alone, so it is re-sorted. Order
//    matters: dedupeById keeps the position of the first copy it meets, and sums of
//    floating-point amounts depend on the order they are added in.
//  - `in` lookups return records in document-id order within each chunk of 30, chunk after
//    chunk.
//
// Strings compare here by UTF-16 code unit; Firestore compares by UTF-8 bytes. The two
// agree for every string without surrogate pairs — dates and document ids are ASCII.

import { dedupeById } from '@shared/pureHelpers';

/** One stored document: its id and its fields. */
export interface Row {
  id: string;
  data: any;
}

export interface DateRange {
  start: string;
  end: string;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** `where('date','>=',start) & where('date','<=',end)` on one collection, in the server's order. */
export function inDateRange(rows: Row[], range: DateRange): Row[] {
  return (rows || [])
    .filter((r) => typeof r?.data?.date === 'string' && r.data.date >= range.start && r.data.date <= range.end)
    .sort((a, b) => cmp(a.data.date, b.data.date) || cmp(a.id, b.id));
}

/** The year buckets a range spans — utils.js loadData's own rule. Null when it has no usable years. */
export function bucketYears(range: DateRange): number[] | null {
  const startYr = parseInt(range.start?.substring(0, 4));
  const endYr = parseInt(range.end?.substring(0, 4));
  if (!startYr || !endYr) return null;
  const years: number[] = [];
  for (let i = startYr; i <= endYr; i++) years.push(i);
  return years;
}

/** Does the range take in the whole of `year`? Then reading that year's bucket whole costs nothing extra. */
export const coversYear = (range: DateRange, year: number): boolean =>
  range.start <= `${year}-01-01` && range.end >= `${year}-12-31`;

/**
 * loadData's result from its buckets' in-range records (oldest year first, each already in
 * the server's order): one record per document id — dedupeById, the copy saved last wins.
 * `tag` stamps each record with its source bucket, as loadInvoicesTagged does.
 */
export function mergeBuckets<T = any>(buckets: { yr: number; rows: Row[] }[], tag = false): T[] {
  return dedupeById<T>(
    buckets.flatMap(({ yr, rows }) => (tag ? rows.map((r) => ({ id: r.id, data: { ...r.data, __yr: String(yr) } })) : rows))
  );
}

/** Unique, non-null values in chunks of `size` — the batching every `in` lookup here uses. */
export function chunked<T>(values: T[], size = 30): T[][] {
  const uniq = [...new Set(values)].filter((v) => v != null);
  const out: T[][] = [];
  for (let i = 0; i < uniq.length; i += size) out.push(uniq.slice(i, i + size));
  return out;
}

/**
 * What `where(field, 'in', chunk)` returns for each chunk in turn, from a whole-collection
 * read (which is in document-id order, as each `in` result is).
 */
export function matchingInChunks(rows: Row[], field: string, chunks: unknown[][]): Row[] {
  const out: Row[] = [];
  for (const chunk of chunks) {
    const wanted = new Set(chunk);
    for (const r of rows) if (wanted.has(r.data?.[field])) out.push(r);
  }
  return out;
}
