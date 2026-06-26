// Storage-aging helpers — port of web app/(root)/stocks/agingUtils.js. Pure.
export const DAY = 86400000;
export const STALE_DAYS = 60; // sitting too long
export const DEMURRAGE_DAYS = 90; // possible storage / demurrage charges

export type Bucket = '0-30' | '31-60' | '61-90' | '90+' | 'unknown';

export const daysStored = (arrivalIso: string | null, now = Date.now()): number | null => {
  if (!arrivalIso) return null;
  const t = new Date(arrivalIso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((now - t) / DAY);
};

export const bucketOf = (days: number | null): Bucket => {
  if (days == null) return 'unknown';
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
};

export const BUCKET_COLOR: Record<string, string> = {
  '0-30': '#16a34a',
  '31-60': '#0366ae',
  '61-90': '#d97706',
  '90+': '#dc2626',
};

export interface TerminalAging {
  terminal: string;
  name: string;
  count: number;
  qty: number;
  oldest: number;
  buckets: Record<Bucket, number>;
}
export interface StaleRow {
  id: string;
  descriptionName: string;
  terminalName: string;
  qnty: number;
  days: number;
}

// Group on-hand rows by warehouse, compute age buckets + stale list. Mirrors
// storageAging.js byTerminal / staleRows.
export function computeAging(rows: any[], stockName: (id: string) => string, now = Date.now()) {
  const enriched = rows.map((r) => {
    const days = daysStored(r.arrivalIso ?? null, now);
    return { ...r, _days: days, _bucket: bucketOf(days) };
  });

  const groups: Record<string, TerminalAging> = {};
  enriched.forEach((r) => {
    const key = r.stock || '—';
    if (!groups[key]) {
      groups[key] = { terminal: key, name: stockName(r.stock), count: 0, qty: 0, oldest: 0, buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, unknown: 0 } };
    }
    const g = groups[key];
    g.count += 1;
    g.qty += Number(r.qnty) || 0;
    g.buckets[r._bucket as Bucket] += 1;
    if (r._days != null && r._days > g.oldest) g.oldest = r._days;
  });

  const staleRows: StaleRow[] = enriched
    .filter((r) => r._days != null && r._days >= STALE_DAYS)
    .sort((a, b) => (b._days || 0) - (a._days || 0))
    .map((r) => ({ id: r.id, descriptionName: r.descriptionName || 'Cargo', terminalName: stockName(r.stock), qnty: Number(r.qnty) || 0, days: r._days as number }));

  return { byTerminal: Object.values(groups).sort((a, b) => b.oldest - a.oldest), staleRows };
}
