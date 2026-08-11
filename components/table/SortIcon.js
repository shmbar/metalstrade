'use client';
import { TbSortAscending, TbSortDescending } from 'react-icons/tb';
import { ArrowUpDown } from 'lucide-react';

/**
 * The sort indicator for a TanStack column header.
 *
 * First slice of the shared table shell. Before this, the same icon was written
 * out at ~20 call sites in six variants: three colours (--endeavour, --brand,
 * and on one table --chathams-blue, which rendered the arrow near-black instead
 * of violet) and three sizes (--fs-title, scale-125, scale-110). Two files also
 * used a different icon family entirely (lucide ArrowUpNarrowWide /
 * ArrowDownWideNarrow) so their arrows were a different shape from every other
 * table's.
 *
 * --brand and --endeavour are the same value (#6D5CE0), so that half of the
 * colour fork was invisible; --chathams-blue was not.
 *
 * Pass `idle` to render the low-contrast affordance that appears on hover for a
 * sortable-but-unsorted column. It requires `group/th` on the <th>, because the
 * reveal is `group-hover/th:` — without that class the arrow stays at opacity 0
 * and only takes up space, so it is opt-in rather than the default.
 */
/**
 * Takes EITHER a TanStack `column`, or a plain `direction` for the two tables
 * that roll their own sort state (cashflow/funcs and shipment/page sort with
 * their own sortCol/sortDir rather than through TanStack). Supporting both is
 * the point: if the shared component only spoke TanStack, those two would have
 * stayed hand-written and drifted again, which is the whole problem being fixed.
 */
export default function SortIcon({ column, direction, idle = false }) {
    const usingColumn = column !== undefined;
    if (usingColumn && !column?.getCanSort?.()) return null;

    const sorted = usingColumn ? column.getIsSorted() : direction;
    const active = { fontSize: 'var(--fs-title)', color: 'var(--brand)' };

    if (sorted === 'asc') return <TbSortAscending className="shrink-0" style={active} />;
    if (sorted === 'desc') return <TbSortDescending className="shrink-0" style={active} />;

    if (!idle) return null;
    return (
        <ArrowUpDown
            size={11}
            className="shrink-0 opacity-0 group-hover/th:opacity-50 transition-opacity"
            style={{ color: 'var(--ink-muted)' }}
        />
    );
}
