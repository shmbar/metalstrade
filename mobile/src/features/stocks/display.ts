// Pure display rules for the Stocks screens. Extracted out of the views so the
// parity suite can compare them against web's table/formatting behaviour without
// rendering anything (no React, no react-native imports here).
import { curSymbol, fmtMoney } from '@/lib/format';
import { matchesAllWords, searchWords } from '@shared/search';

/**
 * Every column the web Stocks table feeds its GLOBAL filter, in web's own column
 * order (app/(root)/stocks/page.js:91-129 propDefaults). TanStack runs the global
 * filter over every column whose value is a string or a number — including the two
 * that start hidden (`date`, `originSupplier`, page.js:307), because column
 * VISIBILITY does not remove a column from the filter model. The values compared
 * are the ones the table is fed, i.e. after page.js:312 getFormatted resolves ids
 * to names (newTable.js:109 globalFilterFn: labelAwareGlobalFilter).
 */
export const INVENTORY_FILTER_COLUMNS = [
  'order',
  'date',
  'supplier',
  'originSupplier',
  'stock',
  'descriptionName',
  'qnty',
  'qTypeTable',
  'unitPrc',
  'total',
  'sType',
] as const;

/**
 * The values a formatted mobile row exposes for each of those 11 columns, in the
 * same order. `qnty` is rendered by page.js:112 showWeight at 3 decimals, so the
 * searchable text is the rendered figure, not the raw one.
 */
export const inventoryFilterValues = (r: any): string[] => [
  r.order,
  r.date,
  r.supplierName,
  r.originSupplierName,
  r.warehouseName,
  r.descriptionName,
  Number(r.qnty).toFixed(3),
  r.qTypeLabel,
  String(r.unitPrc ?? ''),
  r.total === '-' ? '-' : String(r.total ?? ''),
  r.sType,
];

/**
 * Rows surviving the search box — web's labelAwareGlobalFilter, which now builds
 * ONE searchable text per row from every filterable column and keeps the row when
 * EVERY keyword appears somewhere in it (utils/search.js matchesAllWords; Zak,
 * 2026-09-12: "all search boxes in the entire software need to use each keyword").
 *
 * The earlier rule — any single column CONTAINS the whole query — meant a second
 * word matched nothing, because no one cell holds both a grade and a supplier.
 * The matcher is the web file itself, copied verbatim into @shared, so the two
 * apps cannot drift on folding, accents or the digits-without-separators rule.
 */
export const filterInventoryRows = <T,>(rows: T[], search: string): T[] => {
  const words = searchWords(search);
  if (!words.length) return rows;
  return rows.filter((r) => matchesAllWords(inventoryFilterValues(r), words));
};

/**
 * A Summary-Stocks total cell. Web's sumTable showAmount (sumtables/sumTable.js:8)
 * formats through Intl currency only when `Number(value)` is TRUTHY and otherwise
 * prints the raw value — so a warehouse whose net value is exactly 0 renders the
 * bare '0', never '$0.00'.
 */
export const warehouseTotalCell = (total: any, cur: any): string => {
  const n = Number(total);
  // Intl currency puts the minus BEFORE the symbol ('-$1,234.50'); building the
  // string as symbol + signed number produced '$-1,234.50' on mobile.
  return n ? `${n < 0 ? '-' : ''}${curSymbol(cur)}${fmtMoney(Math.abs(n))}` : String(total ?? '');
};

/**
 * The lot sheet's Price row. Web's whModal.js addComma (:52) groups the integer
 * part in threes and keeps AT MOST 3 decimals by TRUNCATION (`x2.substring(0, 4)`
 * on a string that still carries its leading '.'), never rounding and never
 * padding: 1234.5678 -> '1,234.567', 1200 -> '1,200'.
 */
export const fmtLotPrice = (v: any): string => {
  const [int = '', dec] = String(v ?? '').split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${grouped}.${dec.slice(0, 3)}` : grouped;
};
