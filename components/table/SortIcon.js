'use client';
import { Fragment } from 'react';
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
/**
 * The arrow takes NO layout width.
 *
 * Every centred header in the app is `inline-flex … justify-center gap-1` with
 * the label and this icon inside, so flexbox centred the PAIR, not the label —
 * the label sat half the arrow's width left of the cell's true centre. On the
 * `idle` tables (contracts, invoices, special invoices) that happened on every
 * column all the time, because the idle affordance is `opacity-0` until hover:
 * invisible, but still 11px of arrow plus a 4px gap pushing every column title
 * ~7px off centre. That is the "titles not in the centre of the cell" Zak
 * reported. Elsewhere the same shift appeared the moment a column was sorted.
 *
 * So the icon is rendered inside a zero-width anchor: `w-0` removes its width,
 * `-ml-1` cancels the parent's `gap-1` (both step 1, so they cancel exactly
 * whatever that step measures), and the arrow itself is absolutely positioned —
 * out of flow, so the gap does not apply to it either. Net layout contribution:
 * nothing. The label is centred on the cell in every sort state, and the arrow
 * still paints one gap to its right, exactly where it used to sit.
 *
 * `left-1` is that gap. `top-1/2 -translate-y-1/2` centres the arrow on the
 * anchor, which is a zero-height box already vertically centred by the parent's
 * `items-center`.
 */
const Anchored = ({ children }) => (
    <span className="relative inline-block w-0 -ml-1 self-center" aria-hidden>
        <span className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center">
            {children}
        </span>
    </span>
);

export default function SortIcon({ column, direction, idle = false, inline = false }) {
    const usingColumn = column !== undefined;
    if (usingColumn && !column?.getCanSort?.()) return null;

    const sorted = usingColumn ? column.getIsSorted() : direction;
    const active = { fontSize: 'var(--fs-title)', color: 'var(--brand)' };
    /* `inline` opts back into taking width, for a header that has something AFTER
       the arrow in the same flex row (materialtables' remove-column button). The
       out-of-flow arrow would paint on top of it. */
    const Slot = inline ? Fragment : Anchored;

    if (sorted === 'asc') return <Slot><TbSortAscending className="shrink-0" style={active} /></Slot>;
    if (sorted === 'desc') return <Slot><TbSortDescending className="shrink-0" style={active} /></Slot>;

    if (!idle) return null;
    return (
        <Slot>
            <ArrowUpDown
                size={11}
                className="shrink-0 opacity-0 group-hover/th:opacity-50 transition-opacity"
                style={{ color: 'var(--ink-muted)' }}
            />
        </Slot>
    );
}
