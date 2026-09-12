'use client';

import { useMemo } from 'react';
import { toNumber } from './numberUtils';
import { isMoneyColumn } from './columnKind';

/* Which currency a row trades in.
 *
 * Read from the row DATA, not from a `cur` column: Stocks carries a currency on
 * every row but never shows it as a column, so getValue('cur') came back empty and a
 * money column was totalled with no currency at all — the panel read
 * "Total 211,211.00". It also made TanStack log "Column with id 'cur' does not
 * exist" on every render. A visible column is still preferred where there is one,
 * since that is the value the user can see. */
const getCurrency = (row, table) => {
  let curRaw;
  try {
    // getAllColumns, not getColumn('cur'): getColumn itself logs
    // "Column with id 'cur' does not exist" when it misses, which is the very
    // noise this lookup is here to avoid.
    const hasCurColumn = table?.getAllColumns?.().some((c) => c.id === 'cur');
    curRaw = hasCurColumn ? row.getValue('cur') : undefined;
  } catch {}
  if (curRaw == null || curRaw === '') curRaw = row.original?.cur;
  if (!curRaw) return 'plain';
  const c = String(typeof curRaw === 'object' ? (curRaw.cur ?? curRaw.id ?? '') : curRaw).toLowerCase().trim();
  if (c === 'us' || c === 'usd' || c === '$') return 'USD';
  if (c === 'eu' || c === 'eur' || c === '€') return 'EUR';
  return 'plain';
};

/* Is this column money? Names decide it — see ./columnKind. A page can always
 * overrule with `meta: { money: false }` (a count or weight) or `money: true`.
 *
 * It used to be "money unless the page says otherwise", and exactly one page said
 * otherwise: every tonnage everywhere else — Stocks Quantity, the statement's PO
 * Weight / Shipped / Remaining, Analysis Weight MT — was totalled with a "$" in
 * front of it. The row's `cur` column says what currency the ROW trades in; it
 * says nothing about what a given COLUMN holds.
 */
const columnIsMoney = (table, colId) =>
  isMoneyColumn(table.getAllColumns().find(c => c.id === colId));

export const useQuickSum = ({
  table,
  enabled,
  selectedColumnIds,
}) => {
  const selectedRows = table.getSelectedRowModel().rows;

  const totals = useMemo(() => {
    if (!enabled) return [];
    if (!selectedRows.length) return [];

    return (selectedColumnIds || []).map((colId) => {
      const byCurrency = {};
      const money = columnIsMoney(table, colId);

      for (const r of selectedRows) {
        const n = toNumber(r.getValue(colId));
        if (!Number.isFinite(n)) continue;
        // A non-money column is one pool regardless of what currency the row
        // trades in — tonnes are tonnes whether the contract is priced in $ or €.
        const currency = money ? getCurrency(r, table) : 'plain';
        byCurrency[currency] = (byCurrency[currency] || 0) + n;
      }

      const keys = Object.keys(byCurrency);

      // No currency column — return single plain total (backward compat)
      if (keys.length === 0) return { id: colId, total: 0, byCurrency: {}, money };
      if (keys.length === 1 && keys[0] === 'plain') return { id: colId, total: byCurrency.plain, byCurrency: {}, money };

      // Multi-currency — return grouped totals
      return { id: colId, total: null, byCurrency, money };
    });
    // `table` is read for each column's meta.money. useReactTable returns a stable
    // instance, so listing it costs nothing and keeps the flags from going stale.
  }, [enabled, selectedRows, selectedColumnIds, table]);

  return {
    selectedCount: selectedRows.length,
    totals,
  };
};
