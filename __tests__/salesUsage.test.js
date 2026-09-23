import { describe, it, expect } from 'vitest';
import {
    salePrefix, isSaleMovement, saleLabel, groupSalesByLine, settledQty,
    allocateSalesToLots, lotSalesCellText, lotSalesTooltip,
} from '../utils/salesUsage.js';

// Shapes are real: an invoice writes its lines out as `out` movements carrying
// descriptionId, invoice, invType, client (hooks/useInvoiceState.js); a warehouse
// transfer writes an `out` with a moveType and no invoice (stocks/whModal.js).
const sale = (over = {}) => ({ type: 'out', descriptionId: 'L', invoice: 46, invType: '1111', qnty: 10, date: '2026-03-05', client: 'SJM', ...over });
const lot = (id, qnty, over = {}) => ({ id, description: 'L', qnty, indDate: { startDate: '2025-11-27' }, ...over });

describe('what counts as a sale', () => {
    it('prefixes an invoice number by its type', () => {
        expect(salePrefix('1111')).toBe('');
        expect(salePrefix('2222')).toBe('CN');
        expect(salePrefix('3333')).toBe('FN');
        expect(saleLabel(sale({ invType: '3333', invoice: 1390 }))).toBe('FN1390');
    });

    it('counts sales — not arrivals, not warehouse transfers', () => {
        expect(isSaleMovement(sale())).toBe(true);
        expect(isSaleMovement({ type: 'in', description: 'L', invoice: 46 })).toBe(false);
        expect(isSaleMovement({ type: 'out', descriptionId: 'L', invoice: '', moveType: 'out' })).toBe(false);
        expect(isSaleMovement(null)).toBe(false);
    });

    it('groups sales under the PO line they took material from', () => {
        const g = groupSalesByLine([sale(), sale({ descriptionId: 'M' }), { type: 'in', description: 'L' }]);
        expect(Object.keys(g).sort()).toEqual(['L', 'M']);
    });

    it('weighs a lot as settled once there is a final settlement', () => {
        expect(settledQty({ qnty: '22.426', finalqnty: 22.388 })).toBe(22.388);
        expect(settledQty({ qnty: '22.426' })).toBe(22.426);
    });
});

// The three lines of PO 191125-1 (Thormet Lana), as they are in the ledger. The team's
// own Sold / Unsold column on those lots is the check.
describe('allocating a line’s sales to its lots — PO 191125-1', () => {
    it('52Ni: one lot sold (weight match), two not — not all three', () => {
        const lots = [lot('a', 22.531, { indDate: { startDate: '2025-12-18' } }),
            lot('b', 22.519, { indDate: { startDate: '2025-12-18' } }),
            lot('c', 22.503, { indDate: { startDate: '2025-12-18' } }),
            lot('misc', 0, { spInv: true })];
        const r = allocateSalesToLots(lots, { L: [sale({ invoice: 1461, qnty: 22.531, client: 'Cronimet Corporation' })] });
        expect(['a', 'b', 'c', 'misc'].map(k => r[k].state)).toEqual(['full', 'none', 'none', 'none']);
        expect(lotSalesCellText(r.a)).toBe('1461');
    });

    it('matches by weight even when the sold lot is not the first to arrive', () => {
        const lots = [lot('a', 22.519), lot('b', 22.503), lot('c', 22.531)];
        const r = allocateSalesToLots(lots, { L: [sale({ qnty: 22.531 })] });
        expect(['a', 'b', 'c'].map(k => r[k].state)).toEqual(['none', 'none', 'full']);
    });

    it('40Ni: two invoice lines, two lots, each by weight', () => {
        const r = allocateSalesToLots([lot('a', 22.338), lot('b', 22.497)],
            { L: [sale({ invType: '3333', invoice: 1388, qnty: 22.497 }), sale({ invType: '3333', invoice: 1388, qnty: 22.338 })] });
        expect([r.a.state, r.b.state]).toEqual(['full', 'full']);
        expect(lotSalesCellText(r.b)).toBe('FN1388');
    });

    it('19Ni: a final invoice in odd pieces fills the settled lots first in, first out', () => {
        const lots = [lot('a', 22.426, { finalqnty: 22.388 }), lot('b', 22.482, { finalqnty: 22.482 }), lot('c', 22.353, { finalqnty: 22.353 })];
        const pieces = [4.360, 22.460, 18.030, 22.313, 0.040, 0.020];     // sums to 67.223
        const r = allocateSalesToLots(lots, { L: pieces.map(q => sale({ invType: '3333', invoice: 1390, qnty: q })) });
        expect(['a', 'b', 'c'].map(k => r[k].state)).toEqual(['full', 'full', 'full']);
        expect(r.a.allocated + r.b.allocated + r.c.allocated).toBeCloseTo(67.223, 9);
    });
});

describe('allocation edge cases', () => {
    it('a partly sold lot says so, and how much', () => {
        const r = allocateSalesToLots([lot('a', 20), lot('b', 20, { indDate: { startDate: '2025-12-01' } })],
            { L: [sale({ qnty: 25 })] });
        expect([r.a.state, r.b.state]).toEqual(['full', 'part']);
        expect(r.b.allocated).toBe(5);
        expect(lotSalesCellText(r.b)).toBe('46 · part');
        const tip = lotSalesTooltip(r.b).split('\n');
        expect(tip[0]).toBe('Part sold — 5.000 of 20.000 MT');
        expect(tip[1]).toBe('46 · 5.000 MT · 2026-03-05 · SJM');
    });

    it('never allocates more than a lot holds, even when a line is oversold', () => {
        const r = allocateSalesToLots([lot('a', 10)], { L: [sale({ qnty: 15 })] });
        expect(r.a).toMatchObject({ state: 'full', allocated: 10 });
    });

    it('lists several invoices on one lot, biggest first', () => {
        // 40 MT lot, 31 MT sold across three invoices: all three on the lot, still part sold
        const r = allocateSalesToLots([lot('a', 40)], { L: [sale({ qnty: 5 }), sale({ invoice: 51, qnty: 25 }), sale({ invoice: 60, qnty: 1 })] });
        expect(lotSalesCellText(r.a)).toBe('51, 46 +1 · part');
    });

    it('gives nothing to rows that hold no material, or lines never sold', () => {
        const r = allocateSalesToLots([lot('misc', 0, { spInv: true }), lot('x', 5, { description: 'Other' })], { L: [sale()] });
        expect(r.misc.state).toBe('none');
        expect(r.x.state).toBe('none');
        expect(lotSalesCellText(r.x)).toBe('');
        expect(lotSalesTooltip(r.x)).toBe('');
    });
});
