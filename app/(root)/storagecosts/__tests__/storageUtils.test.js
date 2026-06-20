import { describe, it, expect } from 'vitest';
import { toUsd, ym, arrivalStr, isStorageType, mtInWh, computeStorageMetric } from '../storageUtils.js';

describe('toUsd', () => {
    it('passes USD through (us / USD)', () => {
        expect(toUsd(100, 'us')).toBe(100);
        expect(toUsd(100, 'USD')).toBe(100);
    });
    it('converts EUR at 1.08', () => {
        expect(toUsd(100, 'eu')).toBeCloseTo(108);
        expect(toUsd(50, 'EUR')).toBeCloseTo(54);
    });
    it('treats bad EUR amounts as 0', () => {
        expect(toUsd(undefined, 'eu')).toBe(0);
        expect(toUsd('abc', 'eu')).toBe(0);
    });
});

describe('ym', () => {
    it('extracts YYYY-MM', () => expect(ym('2026-06-21')).toBe('2026-06'));
    it('is null-safe', () => {
        expect(ym(null)).toBe('');
        expect(ym(undefined)).toBe('');
        expect(ym('')).toBe('');
    });
});

describe('arrivalStr', () => {
    it('returns string indDate', () => expect(arrivalStr({ indDate: '2026-03-10' })).toBe('2026-03-10'));
    it('extracts startDate from object indDate', () => expect(arrivalStr({ indDate: { startDate: '2026-01-05' } })).toBe('2026-01-05'));
    it('falls back to endDate', () => expect(arrivalStr({ indDate: { endDate: '2026-02-02' } })).toBe('2026-02-02'));
    it('falls back to contractData.date when no indDate', () => expect(arrivalStr({ contractData: { date: '2026-04-01' } })).toBe('2026-04-01'));
    it('falls back to contractData.date when indDate object is empty', () =>
        expect(arrivalStr({ indDate: {}, contractData: { date: '2026-05-01' } })).toBe('2026-05-01'));
    it('returns empty string when nothing usable', () => expect(arrivalStr({})).toBe(''));
});

describe('isStorageType', () => {
    const types = [
        { id: 'S', expType: 'storage' },
        { id: 'W', expType: 'Warehouse' },        // case-insensitive
        { id: 'D', expType: 'demurrage' },
        { id: 'F', expType: 'freightStorageStuffing' },
        { id: 'SS', expType: 'storageStuffing' },
    ];
    it('matches storage and warehouse (case-insensitive)', () => {
        expect(isStorageType({ expType: 'S' }, types)).toBe(true);
        expect(isStorageType({ expType: 'W' }, types)).toBe(true);
    });
    it('excludes demurrage, stuffing and freight-storage', () => {
        expect(isStorageType({ expType: 'D' }, types)).toBe(false);
        expect(isStorageType({ expType: 'F' }, types)).toBe(false);
        expect(isStorageType({ expType: 'SS' }, types)).toBe(false);
    });
    it('is false for unknown id / missing type / empty settings', () => {
        expect(isStorageType({ expType: 'ZZ' }, types)).toBe(false);
        expect(isStorageType({}, types)).toBe(false);
        expect(isStorageType({ expType: 'S' }, [])).toBe(false);
    });
});

describe('mtInWh', () => {
    const lots = [
        { stock: 'WH1', type: 'in', qnty: 100, indDate: '2026-01-10' },                 // unsold, Jan
        { stock: 'WH1', type: 'in', qnty: 50, indDate: '2026-03-10' },                  // unsold, Mar
        { stock: 'WH1', type: 'in', qnty: 30, indDate: '2026-01-05', status: 'sold' },  // sold → excluded
        { stock: 'WH1', type: 'in', qnty: 20, indDate: '2026-01-05', client: 'C1' },    // allocated → sold → excluded
        { stock: 'WH2', type: 'in', qnty: 999, indDate: '2026-01-01' },                 // other warehouse
        { stock: 'WH1', type: 'out', qnty: 10, indDate: '2026-01-01' },                 // out record → excluded
        { stock: 'WH1', qnty: 5, indDate: '2026-01-01' },                               // no type → counts as in
    ];
    it('sums unsold inbound lots up to the given month', () =>
        expect(mtInWh(lots, 'WH1', '2026-01')).toBe(105));   // 100 + 5 (Mar lot not yet arrived)
    it('includes later arrivals as the month advances', () =>
        expect(mtInWh(lots, 'WH1', '2026-03')).toBe(155));   // 100 + 50 + 5
    it('isolates by warehouse and excludes out-records & sold lots', () =>
        expect(mtInWh(lots, 'WH2', '2026-12')).toBe(999));
    it('with no month, counts all unsold inbound regardless of arrival', () =>
        expect(mtInWh(lots, 'WH1', '')).toBe(155));
    it('returns 0 for empty lots', () => expect(mtInWh([], 'WH1', '2026-01')).toBe(0));
});

describe('computeStorageMetric', () => {
    const lots = [
        { stock: 'WH1', type: 'in', qnty: 100, indDate: '2026-01-10' },
        { stock: 'WH2', type: 'in', qnty: 200, indDate: '2026-01-10' },
    ];
    const whName = (id) => ({ WH1: 'Rotterdam', WH2: 'Antwerp' }[id] || '');

    it('computes per-warehouse and overall $/MT/month, sorted desc', () => {
        const tagged = [
            { storageWh: 'WH1', storageMonth: '2026-01', amount: 1000, cur: 'us' },
            { storageWh: 'WH2', storageMonth: '2026-01', amount: 1000, cur: 'us' },
        ];
        const m = computeStorageMetric({ tagged, lots, whName });
        expect(m.rows.find(r => r.wh === 'WH1').rate).toBe(10);   // 1000 / 100
        expect(m.rows.find(r => r.wh === 'WH2').rate).toBe(5);    // 1000 / 200
        expect(m.rows.find(r => r.wh === 'WH1').name).toBe('Rotterdam');
        expect(m.rows[0].wh).toBe('WH1');                          // sorted by rate desc
        expect(m.totalCost).toBe(2000);
        expect(m.totalMt).toBe(300);
        expect(m.overall).toBeCloseTo(2000 / 300);
    });

    it('converts EUR amounts to USD', () => {
        const tagged = [{ storageWh: 'WH1', storageMonth: '2026-01', amount: 100, cur: 'eu' }];
        const m = computeStorageMetric({ tagged, lots, whName });
        expect(m.totalCost).toBeCloseTo(108);
        expect(m.rows[0].rate).toBeCloseTo(1.08);                 // 108 / 100
    });

    it('counts MT once per month but sums cost across invoices in that month', () => {
        const tagged = [
            { storageWh: 'WH1', storageMonth: '2026-01', amount: 500, cur: 'us' },
            { storageWh: 'WH1', storageMonth: '2026-01', amount: 500, cur: 'us' },
        ];
        const m = computeStorageMetric({ tagged, lots, whName });
        expect(m.totalMt).toBe(100);                              // not double-counted
        expect(m.totalCost).toBe(1000);
        expect(m.rows[0].rate).toBe(10);
    });

    it('sums MT-months across distinct months', () => {
        const tagged = [
            { storageWh: 'WH1', storageMonth: '2026-01', amount: 300, cur: 'us' },
            { storageWh: 'WH1', storageMonth: '2026-02', amount: 300, cur: 'us' },
        ];
        const m = computeStorageMetric({ tagged, lots, whName });
        expect(m.totalMt).toBe(200);                              // 100 (Jan) + 100 (Feb)
        expect(m.rows[0].rate).toBe(3);                           // 600 / 200
    });

    it('gives a null rate when MT is zero (no matching lots)', () => {
        const tagged = [{ storageWh: 'WH3', storageMonth: '2026-01', amount: 500, cur: 'us' }];
        const m = computeStorageMetric({ tagged, lots, whName });
        expect(m.rows[0].mt).toBe(0);
        expect(m.rows[0].rate).toBeNull();
        expect(m.overall).toBeNull();
    });

    it('returns empty rows / null overall for no tagged invoices', () => {
        const m = computeStorageMetric({ tagged: [], lots, whName });
        expect(m.rows).toEqual([]);
        expect(m.overall).toBeNull();
        expect(m.totalCost).toBe(0);
    });

    it('ignores entries missing a warehouse or month', () => {
        const tagged = [
            { storageWh: 'WH1', storageMonth: '', amount: 500, cur: 'us' },
            { storageWh: '', storageMonth: '2026-01', amount: 500, cur: 'us' },
        ];
        expect(computeStorageMetric({ tagged, lots, whName }).rows).toEqual([]);
    });
});
