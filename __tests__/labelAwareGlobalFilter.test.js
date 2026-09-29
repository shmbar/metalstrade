import { describe, it, expect } from 'vitest';
import { labelAwareGlobalFilter } from '../components/table/filters/labelAwareGlobalFilter.js';

// A table row as TanStack hands it to the filter: its cells, and its sub-rows.
const makeRow = (values, { subRows = [], original = values } = {}) => {
    const cells = Object.keys(values).map((id) => ({
        column: { id, accessorFn: (r) => r[id], columnDef: {} },
    }));
    return { getAllCells: () => cells, getValue: (id) => values[id], subRows, original };
};
const keeps = (row, q) => labelAwareGlobalFilter(row, 'any', labelAwareGlobalFilter.resolveFilterValue(q));

/* Stocks → By grade, 2026-09-29: the grade rows read "CHP", "Silmet"… and the lines inside
   them read "Ta Bars". Typing "Ta Bars" found every line on Lines and nothing on By grade. */
describe('labelAwareGlobalFilter — a row that stands for others is searched by what it holds', () => {
    const line = (po, spec) => makeRow({ order: po, supplier: 'Shalex', descriptionName: 'Ta Bars', spec });

    it('a grade row is found by a word that is only on its lines', () => {
        const grade = makeRow({ order: '120826-1-TIM, 050626-TIM', descriptionName: 'CHP' },
            { subRows: [line('120826-1-TIM', 'CHP'), line('050626-TIM', 'UMZ')] });
        expect(keeps(grade, 'ta bars')).toBe(true);
        expect(keeps(grade, 'ta bars umz')).toBe(true);      // words from different lines
        expect(keeps(grade, 'ta bars ingots')).toBe(false);  // every word must be somewhere
    });

    it('a single-line grade (no sub-rows) is found through the _searchText its builder gives it', () => {
        const values = { order: '060826-1 +3', descriptionName: 'Silmet' };
        const grade = makeRow(values, { original: { ...values, _searchText: '270326-TIM Shalex Ta Bars 070526' } });
        expect(keeps(grade, 'ta bars')).toBe(true);
        expect(keeps(grade, '070526')).toBe(true);           // the PO hidden behind "+3"
        expect(keeps(grade, 'thormet')).toBe(false);
    });

    it('a row is found by what its cells SHOW: dates, amounts, status words, drawn numbers', () => {
        const values = { date: '2026-01-30', total: 144131.4, completed: false, final: true, invoice: 1354 };
        const row = makeRow(values);
        // the invoice column draws "1354FN" (invoices/page.js meta.searchText)
        row.getAllCells().find(c => c.column.id === 'invoice').column.columnDef.meta = {
            searchText: (v, r) => `${v}${r.final ? 'FN' : ''}`,
        };
        expect(keeps(row, '30.01.26')).toBe(true);
        expect(keeps(row, '$144,131.40')).toBe(true);
        expect(keeps(row, 'incompleted')).toBe(true);        // completed: false
        expect(keeps(row, 'yes')).toBe(true);                // any other flag: yes / no
        expect(keeps(row, '1354FN')).toBe(true);
        expect(keeps(row, 'completed 31.01.26')).toBe(false);
    });

    it('a flag never set reads as its false word, and a column hook sees blank cells too', () => {
        const row = makeRow({ order: '310826', completed: undefined, fnlzing: '' });
        row.getAllCells().find(c => c.column.id === 'fnlzing').column.columnDef.meta = {
            searchText: (v) => (v === '4568' ? 'Yes' : 'No'),
        };
        expect(keeps(row, 'incompleted 310826')).toBe(true);   // the contract nobody has completed yet
        expect(keeps(row, 'no')).toBe(true);                    // Finalizing: No
        expect(keeps(makeRow({ order: '1' }), 'incompleted')).toBe(false);   // no such column: nothing added
    });

    it('a plain row still matches only its own cells', () => {
        const row = makeRow({ order: '110926', descriptionName: 'MoW Oxide' });
        expect(keeps(row, 'mow 110926')).toBe(true);
        expect(keeps(row, 'ta bars')).toBe(false);
    });
});
