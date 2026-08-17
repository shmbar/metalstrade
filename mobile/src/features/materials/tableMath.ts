// Material-table display + cost maths, ported verbatim from the web page so the two
// apps print the same footer, the same cost columns and the same cross-table total.
// Pure — no React, no Firestore. Covered by __tests__/parity/margins-materials-formulas.test.ts.
//
// Web sources:
//   app/(root)/materialtables/newTable.js  — fmt (:175), footerVal (:197),
//                                            hasPrices (:93), niMult (:98),
//                                            costPmt/costTotal columns (:101-144)
//   app/(root)/materialtables/page.js      — cross-table grand totals (:321-344)

import { DEFAULT_ELEMENTS, UNIT_TO_MT } from './constants';

export interface Element {
  key: string;
  label: string;
}

// ── formatting ───────────────────────────────────────────────────────────────

/**
 * Element/percentage cell — newTable.js:175-186.
 * A value web cannot parse renders BLANK; it never echoes the raw text back.
 */
export const fmtCell = (v: any): string => {
  if (v == null || v === '') return '';
  const n = parseFloat(v);
  if (isNaN(n)) return '';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

/**
 * Weight cell — newTable.js:180-184 / :212-215.
 * Weights follow the TABLE's unit: MT keeps 3 decimals, kgs/lbs round to whole units.
 */
export const fmtWeight = (v: any, unit: string): string => {
  const n = parseFloat(v);
  if (isNaN(n)) return '';
  return unit === 'mt'
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
};

export const money = (n: number): string =>
  '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ── footer ───────────────────────────────────────────────────────────────────

/**
 * Rows the footer counts — newTable.js:200-209.
 * A row is EXCLUDED only when its material is blank AND every element is
 * empty or zero, i.e. a placeholder row. A blank-material row that carries real
 * chemistry still counts (and so does its weight).
 */
export const footerRows = (allRows: any[], elements: Element[]): any[] =>
  (allRows || []).filter((r: any) => {
    if (r?.material && String(r.material).trim() !== '') return true;
    return (elements || []).some((el) => {
      const v = parseFloat(r?.[el.key]);
      return !isNaN(v) && v !== 0;
    });
  });

/** Footer weight total — newTable.js:211. */
export const totalWeight = (rows: any[]): number =>
  (rows || []).reduce((s: number, r: any) => s + (parseFloat(r?.kgs) || 0), 0);

/**
 * Weighted average of one element across the footer rows — newTable.js:244-249.
 * Web renders the cell EMPTY when the average is zero, so an element with no data
 * never reads as a measured 0 — see `fmtAvg`.
 */
export const weightedAvg = (rows: any[], key: string, totalW: number): number => {
  if (!(totalW > 0)) return 0;
  const wSum = (rows || []).reduce(
    (s: number, r: any) => s + (parseFloat(r?.kgs) || 0) * (parseFloat(r?.[key]) || 0),
    0
  );
  return wSum / totalW;
};

/** Footer element cell: blank on a zero average — newTable.js:249. */
export const fmtAvg = (avg: number): string => (avg === 0 ? '' : fmtCell(avg));

// ── cost columns ─────────────────────────────────────────────────────────────

/**
 * Whether the table has any price entered — newTable.js:93-96.
 * Two web quirks that mobile must reproduce or the cost columns appear on the
 * wrong tables: an Fe price alone does NOT enable them, and a price of "0" DOES
 * (the gate tests for "not undefined and not empty string", not for a positive
 * number). The cost formula itself then skips every zero price but does include Fe.
 */
export const hasPrices = (elements: Element[], prices: Record<string, any>): boolean =>
  (elements || []).some(
    (el) => el.key !== 'fe' && prices?.[el.key] !== undefined && prices?.[el.key] !== ''
  );

/**
 * Ni payable multiplier — newTable.js:98.
 * Web is `(niPercent || 100) / 100`, so a blank or 0 percentage falls back to 100%
 * rather than zeroing out the Ni contribution.
 */
export const niMultiplier = (niPercent: any): number => (Number(niPercent) || 100) / 100;

/** Per-row $/MT — newTable.js:107-111. */
export const costPmt = (
  row: any,
  elements: Element[],
  prices: Record<string, any>,
  niMult: number
): number =>
  (elements || []).reduce((sum: number, el) => {
    const price = parseFloat(prices?.[el.key]) || 0;
    if (!price) return sum;
    const mult = el.key === 'ni' ? niMult : 1;
    return sum + ((parseFloat(row?.[el.key]) || 0) / 100) * price * mult;
  }, 0);

/**
 * Per-row cost total — newTable.js:122-131.
 * The stored weight is converted to METRIC TONS first: the price row is $/MT, so a
 * kgs table would be 1000x out without it.
 */
export const costTotal = (
  row: any,
  elements: Element[],
  prices: Record<string, any>,
  niMult: number,
  unit: string
): number => {
  // Weight is converted FIRST and the $/MT applied to it, exactly as web groups it
  // (`const wMT = …; return cPmt * wMT`). Multiplying in the other order is the same
  // number mathematically but not in the last floating-point bits, and these figures
  // are compared to the cent against the web page.
  const wMT = (parseFloat(row?.kgs) || 0) * (UNIT_TO_MT[unit] || 0.001);
  return costPmt(row, elements, prices, niMult) * wMT;
};

/**
 * Footer $/MT — newTable.js:216-229.
 * A WEIGHT-weighted mean of the per-row $/MT, not a plain average.
 */
export const footerCostPmt = (
  rows: any[],
  elements: Element[],
  prices: Record<string, any>,
  niMult: number,
  totalW: number
): number => {
  if (!(totalW > 0)) return 0;
  return (
    (rows || []).reduce(
      (s: number, r: any) => s + costPmt(r, elements, prices, niMult) * (parseFloat(r?.kgs) || 0),
      0
    ) / totalW
  );
};

/** Footer cost total — newTable.js:230-242. */
export const footerCostTotal = (
  rows: any[],
  elements: Element[],
  prices: Record<string, any>,
  niMult: number,
  unit: string
): number =>
  (rows || []).reduce((s: number, r: any) => s + costTotal(r, elements, prices, niMult, unit), 0);

// ── sales columns — the cost bar mirrored against a second price map ────────

/**
 * Sales price per MT — newTable.js:167-172 salesPerMT.
 *
 * Deliberately the SAME function as costPmt with a different price map and its own
 * Ni percentage, because that is exactly what web does: the sales bar mirrors the
 * cost bar. Kept as named aliases rather than a second implementation — two copies
 * of a money formula is how the apps drifted apart before, and a reader looking for
 * "why is the sale price wrong" should land on the same code either way.
 */
export const salesPerMT = costPmt;

/** Sales total — salesPerMT x the row weight in MT (newTable.js:187-191). */
export const salesTotal = costTotal;

/**
 * Whether the sales bar has anything worth showing — newTable.js:161-163.
 * Same rule as hasPrices: an Fe-only price does not count (Fe is the derived
 * remainder), but an explicit "0" does.
 */
export const hasSalesPrices = hasPrices;

/**
 * Footer cell for the two SALES columns — newTable.js:296-301.
 *
 * Deliberately NOT the cost-side maths. footerVal has explicit branches for
 * `costPmt` and `costTotal`, but none for `salesMt` / `salesTotal`, so those fall
 * through to the generic element branch: a WEIGHT-WEIGHTED AVERAGE of the column's
 * value, formatted with no '$' and blank when zero.
 *
 * For Sales MT that is the natural figure. For Sales Total it means the footer is
 * the weighted average of the per-row totals rather than their SUM — which reads
 * oddly next to Cost Total, which IS a sum. It looks like an oversight on the web
 * side, but it is what the web page prints, so reproducing it is the whole point;
 * a "corrected" mobile figure would just be a number that matches nothing. Recorded
 * here so the next reader does not quietly fix it.
 */
export const footerSalesCol = (rows: any[], valueOf: (r: any) => number, totalW: number): number => {
  if (!(totalW > 0)) return 0;
  const wSum = (rows || []).reduce(
    (s: number, r: any) => s + (parseFloat(r?.kgs) || 0) * (valueOf(r) || 0),
    0
  );
  return wSum / totalW;
};

// ── cross-table grand totals — page.js:321-344 ───────────────────────────────

/**
 * The bottom "Total" row spanning every table.
 *
 * Three web quirks are reproduced deliberately:
 *  1. The per-element figure is the UNWEIGHTED mean of each table's own weighted
 *     average — a two-row table counts as much as a two-hundred-row one.
 *  2. Only the nine DEFAULT_ELEMENTS are rolled up; a custom element added to one
 *     table never appears here.
 *  3. Unlike the per-table footer, this pass uses EVERY stored row — the
 *     blank-placeholder filter is a footer-only rule.
 *
 * Returns `null` when any value is unparseable, which is web's whole-row guard
 * (page.js:408) — the Total row is hidden rather than printing NaN.
 */
export function grandTotals(tables: any[]): Record<string, string> | null {
  if (!tables || tables.length === 0) return null;

  const per = tables.map((table: any) => {
    const elems: any[] = table?.elements || DEFAULT_ELEMENTS;
    const rows: any[] = table?.data || [];
    const totalKgs = rows.reduce((s: number, r: any) => s + Number(r?.kgs), 0);
    const obj: any = { kgs: totalKgs };
    elems.forEach((el: any) => {
      const ws = rows.reduce((s: number, r: any) => s + parseFloat(r?.[el.key] || 0) * Number(r?.kgs), 0);
      obj[el.key] = totalKgs > 0 ? (ws / totalKgs).toFixed(2) : '0.00';
    });
    return obj;
  });

  const totalKgs = per.reduce((s: number, t: any) => s + Number(t.kgs), 0);
  const result: Record<string, string> = { kgs: totalKgs.toFixed(2) };
  DEFAULT_ELEMENTS.forEach((el) => {
    const valid = per.filter((t: any) => !isNaN(parseFloat(t[el.key])));
    const sum = valid.reduce((acc: number, t: any) => acc + parseFloat(t[el.key] || 0), 0);
    result[el.key] = valid.length > 0 ? (sum / valid.length).toFixed(2) : '0.00';
  });

  if (Object.values(result).some((v: any) => isNaN(parseFloat(v)))) return null;
  return result;
}
