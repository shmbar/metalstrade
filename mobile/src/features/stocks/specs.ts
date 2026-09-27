import { specBreakdown, SpecPart } from '@shared/grades';

/* The specs a Stocks row holds, and how much of each is left — port of web
   app/(root)/stocks/specs.js (c99657c4, 901910a5), which feeds web's Spec column and its
   Excel column. A grade is the trading category (40Ni Turnings); a spec is what the lots
   actually are: a typed spec ("UMZ", "99%"), else their chemistry ("43Ni 15Cr").

   A row is a stock line (warehouse × PO line) carrying its lots in `data` (aggregate.ts
   keeps them, as web does). Cached per row object; a reload builds new rows. */
const cache = new WeakMap<object, SpecPart[]>();

export const rowSpecs = (row: any): SpecPart[] => {
  if (!row || typeof row !== 'object') return [];
  const hit = cache.get(row);
  if (hit) return hit;
  const lines = row._all || [row];
  const parts = specBreakdown(
    lines.map((l: any) => ({
      qnty: parseFloat(l?.qnty) || 0,
      value: l?.total === '-' ? 0 : parseFloat(l?.total) || 0,
      lots: (l?.data || []).filter((x: any) => x && x.type === 'in'),
      description: l?.descriptionName || '',
    }))
  );
  cache.set(row, parts);
  return parts;
};

/* How one spec reads. Empty when there is nothing to add beside the description — a lot
   known only by its name is already named. (The original supplier is not a spec: shown as
   "ex Timur" it read as the producer of material Timur only sold on — web 901910a5.) */
export const specLabel = (part: SpecPart): string => (part.source !== 'name' ? part.label : '');

/** web specText — the Spec column's value and its Excel cell. */
export const specText = (row: any): string => rowSpecs(row).map(specLabel).filter(Boolean).join(' · ');

/** web SpecCell — one spec as is; several with what is left of each (≈ when estimated), two shown, "+N" after. */
export const specCellText = (row: any): string => {
  const named = rowSpecs(row).map((p) => ({ ...p, text: specLabel(p) }));
  if (!named.some((p) => p.text)) return '';
  if (named.length === 1) return named[0].text;
  const q = (n: number) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const line = (p: (typeof named)[number]) => `${p.text || p.label} ${p.estimated ? '≈' : ''}${q(p.qnty)}`;
  return named.slice(0, 2).map(line).join(' · ') + (named.length > 2 ? ` +${named.length - 2}` : '');
};
