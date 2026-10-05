import { describe, it, expect } from 'vitest';
import { createTable, getCoreRowModel, getFilteredRowModel } from '@tanstack/table-core';
import { groupByGrade } from '../byGrade.js';
import { labelAwareGlobalFilter } from '../../../../components/table/filters/labelAwareGlobalFilter.js';
import { keywordColumnFilter } from '../../../../components/table/filters/keywordColumnFilter.js';
import { oneOf } from '../../../../components/table/filters/oneOfFilter.js';

/* Stocks → By grade, "698 triart" (client, 2026-10-06): the 698 Turnings grade listed
   Thormet's two lines beside Triart's five, and its 60.121 MT counted all seven, because
   the search picked GRADES — any grade with one matching line came whole. It now picks
   LINES, as Lines does (newTable.js lineTable), and only those are folded. These are the
   live lines of that screenshot. */
const line = (id, order, supplier, stock, descriptionName, qnty, unitPrc) => ({
    id, order, supplier, stock, descriptionName, qnty: qnty.toFixed(3), unitPrc,
    total: qnty * unitPrc, cur: 'US', qTypeTable: 'MT', sType: 'Virtual',
});
const LINES = [
    line('l1', '010926', 'Thormet', 'Thormet', '698 Turnings', 13.548, 8620),
    line('l2', '280526', 'Triart', 'Triart', '698 Turnings', 20.364, 11180),
    line('l3', '280426-2', 'Triart', 'Seagull', '698 Turnings', 10.192, 12070),
    line('l4', '210426-1', 'Triart', 'Triart', '698 Turnings', 3.466, 10060),
    line('l5', '210426-1', 'Triart', 'Triart', '698 Turnings', 7.717, 10020),
    line('l6', '210426-1', 'Triart', 'Triart', '698 Turnings', 3.516, 10060),
    line('l7', '300126-1', 'Thormet', 'Thormet', '698 Turnings', 1.318, 12000),
    line('l8', '210426-1', 'Triart', 'Triart', '698 Solids', 8.539, 10675),
    line('l9', '060826', 'ELG Utica', 'SH Bell', '40Ni Refinery Turnings', 18.525, 3000),
];

// The lines the Stocks table keeps for a search and column filters: its lineTable's options.
const COLUMNS = [
    { accessorKey: 'order' },
    { accessorKey: 'supplier', filterFn: oneOf },
    { accessorKey: 'stock', filterFn: oneOf },
    { accessorKey: 'descriptionName' },
    { accessorKey: 'qnty', enableGlobalFilter: false },
    { accessorKey: 'total', enableGlobalFilter: false },
];
const kept = (search = '', columnFilters = []) => {
    const table = createTable({
        data: LINES, columns: COLUMNS,
        getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(),
        defaultColumn: { filterFn: keywordColumnFilter }, globalFilterFn: labelAwareGlobalFilter,
        state: {}, onStateChange: () => {}, renderFallbackValue: null,
    });
    table.setOptions((prev) => ({ ...prev, state: { ...table.initialState, globalFilter: search, columnFilters } }));
    return table.getFilteredRowModel().rows.map((r) => r.original);
};
const byGrade = (search, filters) => groupByGrade(kept(search, filters));
const ids = (grades) => grades.flatMap((g) => g._lineIds).sort();
const sum = (lines, k) => lines.reduce((s, l) => s + (parseFloat(l[k]) || 0), 0);

describe('Stocks By grade — the search picks lines, and a grade folds only those', () => {
    it('"698 triart" is Triart\'s 698 — no Thormet line, and a total that counts none', () => {
        const grades = byGrade('698 triart');
        expect(ids(grades)).toEqual(['l2', 'l3', 'l4', 'l5', 'l6', 'l8']);
        const turnings = grades.find((g) => g._lineIds.includes('l2'));
        expect(turnings._lineIds).toEqual(['l2', 'l3', 'l4', 'l5', 'l6']);
        expect(turnings.supplier).toBe('Triart');
        expect(turnings._lotCount).toBe(5);
        expect(turnings.qnty).toBeCloseTo(45.255, 3);
        // What opens under the grade is what it counts.
        expect(turnings._lines.map((l) => l.id)).toEqual(turnings._lineIds);
    });

    it('with no search a grade still holds every one of its lines', () => {
        const turnings = byGrade('').find((g) => g._lineIds.includes('l1'));
        expect(turnings._lineIds).toEqual(['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7']);
        expect(turnings.qnty).toBeCloseTo(60.121, 3);
        expect(turnings.supplier).toBe('Thormet, Triart');
    });

    it('By grade holds exactly the lines Lines shows, and each grade sums exactly its own', () => {
        for (const q of ['', '698', 'triart', 'thormet', '698 thormet', 'seagull', '210426', 'turnings', 'nothing-here']) {
            const lines = kept(q);
            const grades = groupByGrade(lines);
            expect(ids(grades), q).toEqual(lines.map((l) => l.id).sort());
            for (const g of grades) {
                expect(g.qnty, `${q} · ${g.descriptionName}`).toBeCloseTo(sum(g._all, 'qnty'), 6);
                expect(g.total, `${q} · ${g.descriptionName}`).toBeCloseTo(sum(g._all, 'total'), 6);
            }
        }
    });

    it('words that are on two different lines find nothing, as on Lines', () => {
        // Thormet is on one 698 line and Triart on another; no single line is both.
        expect(byGrade('698 thormet triart')).toEqual([]);
    });

    it('a ticked Supplier box narrows the lines the same way', () => {
        const grades = byGrade('', [{ id: 'supplier', value: ['Triart'] }]);
        expect(ids(grades)).toEqual(['l2', 'l3', 'l4', 'l5', 'l6', 'l8']);
        // The checklist reads a line's own name: the grade's joined "Thormet, Triart" is
        // no longer what it is matched against.
        expect(grades.every((g) => g.supplier === 'Triart')).toBe(true);
    });

    it('a grade left with one line has no fold to open, and still names its line', () => {
        const [g] = byGrade('300126');
        expect(g._lines).toBeUndefined();
        expect(g._all.map((l) => l.id)).toEqual(['l7']);
        expect(g._lineIds).toEqual(['l7']);
        expect(g.qnty).toBeCloseTo(1.318, 3);
    });
});
