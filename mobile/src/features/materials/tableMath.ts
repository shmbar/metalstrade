// Material-table display + cost maths, ported verbatim from the web page so the two
// apps print the same footer, the same cost columns and the same cross-table total.
// Pure — no React, no Firestore. Covered by __tests__/parity/margins-materials-formulas.test.ts.
//
// Web sources:
//   app/(root)/materialtables/newTable.js  — fmt (:175), footerVal (:197),
//                                            hasPrices (:93), niMult (:98),
//                                            costPmt/costTotal columns (:101-144)
//   app/(root)/materialtables/page.js      — cross-table grand totals (the totals effect)

import { DEFAULT_ELEMENTS, TO_KGS, UNIT_TO_MT } from './constants';
import { moneyFull } from '@/lib/format';

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

// Material tables are priced in USD (web materialtables). The shared format keeps the
// minus sign in front of the symbol — this used to print $-1,234.00.
export const money = (n: number): string => moneyFull('us', n);

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
 * Footer cells for the two SALES columns — newTable.js footerVal, the `salesMt` and
 * `salesTotal` branches.
 *
 * The cost pair's maths against the sales price map: Sales MT is the per-MT figure
 * averaged by weight, Sales Total is the SUM of the row totals. Aliases of the cost
 * helpers for the reason salesPerMT is one — web runs the same expressions.
 *
 * Until 2026-10-02 web had no branch for either column, so both fell through to its
 * generic element branch: a weighted average with no '$'. For Sales Total that
 * printed the weighted AVERAGE of the row totals where Cost Total beside it printed
 * a sum (6,900 and 10,350 read 9,487.50, not 17,250.00). Mobile reproduced that on
 * purpose, to match the page; web was corrected in the 14-inch / Material Tables
 * pass and this follows it. `footerSalesCol`, the helper that carried the old rule,
 * is gone.
 */
export const footerSalesPmt = footerCostPmt;
export const footerSalesTotal = footerCostTotal;

// ── cross-table grand totals — materialtables/page.js, the totals effect ─────

/**
 * The bottom "Total" row spanning every table — worked out the way each table's own
 * footer works out its rows, so the two can be checked against each other.
 *
 *  1. Every weight is converted to KGS first. A table can be kept in MT or lbs, and
 *     the row is headed "Kgs".
 *  2. Each element is averaged BY WEIGHT across the rows of the tables that carry it.
 *  3. The same rows as the footer: a line with no material and no analysis is a
 *     blank placeholder and is skipped (`footerRows`).
 *  4. Only the nine DEFAULT_ELEMENTS are rolled up; a custom element added to one
 *     table never appears here.
 *
 * Until 2026-10-02 web did none of 1–3: it added the raw weights as they stood
 * (20 MT + 20,000 kgs = "20,020 Kgs"), took the plain mean of the per-table
 * averages (a 10 kg sample counted as much as a 1,000 t lot) and counted
 * placeholder rows. Mobile mirrored those three on purpose; web was corrected and
 * this follows it.
 *
 * Returns `null` only for no tables at all. A weight or percentage that will not
 * parse counts as zero, as it does in the footer, so the row can no longer come out
 * NaN — the old whole-row NaN guard has nothing left to catch.
 */
export function grandTotals(tables: any[]): Record<string, string> | null {
  if (!tables || tables.length === 0) return null;

  let totalKgs = 0;
  const wSum: Record<string, number> = {};
  const wKgs: Record<string, number> = {};
  tables.forEach((table: any) => {
    const elems: any[] = table?.elements || DEFAULT_ELEMENTS;
    const toKgs = TO_KGS[table?.unit || 'kgs'] || 1;
    footerRows(table?.data || [], elems).forEach((row: any) => {
      const kgs = (parseFloat(row?.kgs) || 0) * toKgs;
      totalKgs += kgs;
      elems.forEach((el: any) => {
        wSum[el.key] = (wSum[el.key] || 0) + (parseFloat(row?.[el.key]) || 0) * kgs;
        wKgs[el.key] = (wKgs[el.key] || 0) + kgs;
      });
    });
  });

  const result: Record<string, string> = { kgs: totalKgs.toFixed(2) };
  DEFAULT_ELEMENTS.forEach((el) => {
    result[el.key] = wKgs[el.key] > 0 ? (wSum[el.key] / wKgs[el.key]).toFixed(2) : '0.00';
  });
  return result;
}
