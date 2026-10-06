import { describe, it, expect } from 'vitest';
import * as web from '../utils/sharedStock.js';
import * as mob from '../mobile/src/shared/sharedStock.js';

/* Stocks → Shared (IMS + GIS), client 2026-10-06: "it doesn't sync description/grade fully
   with IMS when amended". A shared lot kept a copy of the lot it was picked from; IMS renamed
   eight of the eleven Utica lots in its Materials Breakdown, gave them specs and moved them to
   SH Bell, and the pool still showed the old names, no spec and ELG Utica. Both apps run the
   same file (mobile/src/shared/sharedStock.js is a byte copy); every case runs through both. */
const both = (fn) => {
    const a = fn(web), b = fn(mob);
    expect(b).toEqual(a);
    return a;
};

// IMS lots as utils.js loadSharedStockLive reads them: the source lot and the lots on its line.
const line = (id, desc, stock, extra = {}) => ({
    id, type: 'in', description: desc, stock, supplier: 'sup-elg', order: '010726', qnty: '9.081',
    productsData: [{ id: 'p-old', description: '51Ni 18Co 12Cr 3.5Mo Turnings' }, { id: 'p-new', description: 'IN 100 off spec Turnings' }],
    ...extra,
});
const IMS_LOTS = [
    line('lot-1', 'p-new', 'wh-shbell', { spec: '51Ni 18Co 12Cr 3.5Mo' }),
    line('lot-2', 'p-new', 'wh-shbell', { spec: '49Ni 3Co 17Cr' }),                     // a second lot on the line
    line('lot-3', 'p-new', 'wh-seagull', { spec: 'moved, other warehouse' }),          // same material, other line
    { id: 'out-1', type: 'out', descriptionId: 'p-new', stock: 'wh-shbell', qnty: '1' },
];
const SHARED = {
    id: 'sh-1', shared: true, descriptionText: '51Ni 18Co 12Cr 3.5Mo Turnings', qnty: 9.0809, unitPrc: 6393.4, cur: 'us',
    stock: 'wh-utica', supplier: 'sup-elg', owners: ['IMS', 'GIS'], financedBy: 'IMS', status: 'Arrived',
    sourceId: 'lot-1', sourceAccount: 'IMS', sourcePo: '010726', sharedByAccount: 'IMS',
};

describe('a shared lot follows the lot it was picked from', () => {
    it('takes the name, spec, warehouse, supplier and PO the source has today', () => {
        const [lot] = both(m => m.followSources([SHARED], { IMS: IMS_LOTS }));
        expect(lot.link).toBe('live');
        expect(lot.descriptionText).toBe('IN 100 off spec Turnings');          // renamed in IMS
        expect(lot.stock).toBe('wh-shbell');                                   // moved from ELG Utica
        expect(lot.spec).toBe('51Ni 18Co 12Cr 3.5Mo · 49Ni 3Co 17Cr');         // both lots of its line, not the other warehouse's
    });

    it('keeps what the companies agreed: quantity, price, currency, owners, financing, status', () => {
        const [lot] = both(m => m.followSources([SHARED], { IMS: IMS_LOTS }));
        for (const k of ['qnty', 'unitPrc', 'cur', 'owners', 'financedBy', 'status', 'sharedByAccount']) expect(lot[k]).toEqual(SHARED[k]);
    });

    it('a source lot no longer there: the shared lot keeps what it last had, and says so', () => {
        const [lot] = both(m => m.followSources([{ ...SHARED, sourceId: 'deleted' }], { IMS: IMS_LOTS }));
        expect(lot.link).toBe('gone');
        expect(lot.descriptionText).toBe(SHARED.descriptionText);
        expect(lot.stock).toBe(SHARED.stock);
    });

    it('a workspace that could not be read, or a lot typed in, is left as stored', () => {
        const [unread] = both(m => m.followSources([SHARED], { GIS: [] }));
        expect(unread.link).toBe('');
        expect(unread.descriptionText).toBe(SHARED.descriptionText);
        const [typed] = both(m => m.followSources([{ ...SHARED, sourceId: '', sourceAccount: '' }], { IMS: IMS_LOTS }));
        expect(typed.link).toBe('');
        expect(typed.descriptionText).toBe(SHARED.descriptionText);
    });

    it('a lot with no typed spec reads its chemistry; one known only by name has none', () => {
        const analysed = [line('lot-9', 'p-new', 'wh-x', { analysis: '42.1Ni 12Cr 6.2Co 8Ti' })];
        const [a] = both(m => m.followSources([{ ...SHARED, sourceId: 'lot-9' }], { IMS: analysed }));
        expect(a.spec).toMatch(/42(\.1)?Ni/);
        const bare = [line('lot-8', 'p-new', 'wh-x')];
        const [b] = both(m => m.followSources([{ ...SHARED, sourceId: 'lot-8' }], { IMS: bare }));
        expect(b.spec).toBe('');
    });

    it('a loader reads each workspace once for all its source lots', () => {
        const ids = both(m => m.sourceIds([SHARED, { ...SHARED, id: 'sh-2' }, { ...SHARED, id: 'sh-3', sourceId: 'g-1', sourceAccount: 'GIS' }, { id: 'typed' }]));
        expect(ids).toEqual({ IMS: ['lot-1'], GIS: ['g-1'] });
    });
});

describe('a warehouse and a supplier are named from the workspace they belong to', () => {
    const SETTINGS = {
        IMS: {
            Stocks: { Stocks: [{ id: 'wh-utica', stock: 'ELG Utica Alloys', nname: 'ELG Utica' }, { id: 'wh-shbell', stock: 'SH Bell Co', nname: 'SH Bell' }] },
            Supplier: { Supplier: [{ id: 'sup-elg', nname: 'ELG Utica US' }] },
        },
        GIS: {
            Stocks: { Stocks: [{ id: 'wh-shbell', stock: 'SH Bell Co', nname: 'SH Bell' }, { id: 'wh-camco', stock: 'Camco', nname: 'Camco' }] },
            Supplier: { Supplier: [{ id: 'sup-camco', nname: 'CAMCO' }] },
        },
    };

    it('an IMS lot read from GIS still names IMS\'s warehouse and supplier (it showed "—")', () => {
        const names = both(m => m.sharedNames(SHARED, SETTINGS, 'GIS'));
        expect(names).toEqual({ stockName: 'ELG Utica Alloys', stockShort: 'ELG Utica', supplierName: 'ELG Utica US' });
    });

    it('an id the lot\'s own workspace lacks is looked up in the reader\'s, then reads "—"', () => {
        expect(both(m => m.sharedNames({ ...SHARED, stock: 'wh-camco', supplier: 'sup-camco' }, SETTINGS, 'GIS')))
            .toEqual({ stockName: 'Camco', stockShort: 'Camco', supplierName: 'CAMCO' });
        expect(both(m => m.sharedNames({ ...SHARED, stock: 'nowhere', supplier: '' }, SETTINGS, 'IMS')))
            .toEqual({ stockName: '—', stockShort: '—', supplierName: '—' });
    });
});
