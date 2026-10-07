// Fe is marked autoCalc: true — computed as 100 − sum(all other elements)
export const DEFAULT_ELEMENTS = [
    { key: 'ni', label: 'Ni' },
    { key: 'cr', label: 'Cr' },
    { key: 'mo', label: 'Mo' },
    { key: 'co', label: 'Co' },
    { key: 'nb', label: 'Nb' },
    { key: 'w',  label: 'W'  },
    { key: 'cu', label: 'Cu' },
    { key: 'ti', label: 'Ti' },
    /* Fe is LAST on purpose: it is the remainder (100 - sum of everything else),
       so it can only be read once the columns it depends on have been read. It
       used to sit between Cu and Ti, which put the total before one of its own
       inputs. See moveFeLast() in page.js — the same ordering is applied to
       already-saved tables, which carry their own copy of this list. */
    { key: 'fe', label: 'Fe', autoCalc: true },
]

export const UNIT_LABELS = { mt: 'MT', kgs: 'Kgs', lbs: 'Lbs' }

// Multiply stored value by this to convert TO kgs
export const TO_KGS = { mt: 1000, kgs: 1, lbs: 0.453592 }

// Multiply stored kgs by this to convert FROM kgs
export const FROM_KGS = { mt: 0.001, kgs: 1, lbs: 2.20462 }

// Multiply stored value by this to get metric tons (for cost calculation)
export const UNIT_TO_MT = { mt: 1, kgs: 0.001, lbs: 0.000453592 }

/* Column widths, shared by every material table (newTable.js) and the "All tables"
   Totals under them (totals.js). Both tables are sized to their content, not stretched
   across the card, so when both use these widths each total sits under its own column
   (client, 2026-10-07: "the idea is to be compact"). They are min-widths: a column only
   grows past one when its content is wider, which these leave room for.
   Sized to the widest figure a cell holds, measured in the app's font. An element holds
   "100.00", which is 3.58em at either type step, plus 19px of cell padding and borders
   around an input. Kgs holds the Totals row's "250,000.00", 6.2em plus 12px of padding.
   In em because --fs-table steps from 11px to 12px on wide screens and the figures grow
   with it. Material is free text: 160px leaves its input 141px, about what it had before
   (when the input's own default width decided it). */
export const colFloor = (colId) =>
    colId === 'material' ? '160px'
        : colId === 'del' ? '26px'
            : colId === 'container' ? '88px'
                : colId === 'kgs' ? 'calc(6.2em + 12px)'
                    : colId === 'costPmt' || colId === 'costTotal' ? '70px'
                        : 'calc(3.6em + 21px)'
