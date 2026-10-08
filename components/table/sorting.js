'use client';
import { useState } from 'react';
import SortIcon from './SortIcon';

/**
 * Second slice of the shared table shell, next to SortIcon.
 *
 * Click-to-sort for the tables that don't run through TanStack. This was
 * written once in cashflow/funcs.js and used by its three detail tables; the
 * storage-costs tables needed the same behaviour, and a second copy is how the
 * fourteen `<style jsx global>` table blocks happened. One definition instead.
 *
 * `sortRows` is deliberately value-agnostic: it compares numerically when BOTH
 * sides parse as numbers and falls back to localeCompare otherwise, so a column
 * of amounts sorts as amounts and a column of names sorts as names without the
 * call site declaring which is which. Sort on a pre-resolved field (`_supplier`,
 * `_whName`) when the raw row holds an id rather than the text on screen.
 */
export const sortRows = (arr, key, dir) => {
    if (!key) return arr;
    return [...arr].sort((a, b) => {
        const av = a[key], bv = b[key];
        if (!isNaN(parseFloat(av)) && !isNaN(parseFloat(bv)))
            return dir === 'asc' ? parseFloat(av) - parseFloat(bv) : parseFloat(bv) - parseFloat(av);
        const as = String(av ?? ''), bs = String(bv ?? '');
        return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
};

/* `idle` shows the low-contrast up/down affordance on hover, so a sortable
   column advertises itself before you click it. It needs `group/th` on the
   <th>, which is why that class is set here rather than left to the caller.

   Takes EITHER the whole useSortState object as `sort` — the short form, for a
   table with several sortable headers — or the three pieces separately, which is
   how cashflow's tables already call it.

   `arrowFirst` puts the arrow BEFORE the label, in the flow, for a right-aligned
   figures column: the usual arrow takes no width and paints to the right of the
   label, which in a right-aligned header is past the cell's edge — under the next
   sticky header cell, or clipped with a scrollbar on the last column (Dashboard
   card pop-ups, 2026-10-08). */
export const SortTh = ({
    colKey, label, sort,
    sortKey = sort?.sortKey, sortDir = sort?.sortDir, onSort = sort?.handleSort,
    className = '', idle = false, style, arrowFirst = false,
}) => (
    <th className={`group/th cursor-pointer select-none ${className}`} style={style} onClick={() => onSort(colKey)}>
        <span className="inline-flex items-center gap-1">
            {arrowFirst && <SortIcon direction={sortKey === colKey ? sortDir : null} idle={idle} inline />}
            {label}
            {!arrowFirst && <SortIcon direction={sortKey === colKey ? sortDir : null} idle={idle} />}
        </span>
    </th>
);

export const useSortState = (initialKey = null, initialDir = 'asc') => {
    const [sortKey, setSortKey] = useState(initialKey);
    const [sortDir, setSortDir] = useState(initialDir);
    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
    };
    return { sortKey, sortDir, handleSort };
};
