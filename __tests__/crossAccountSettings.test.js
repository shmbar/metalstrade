import { describe, it, expect } from 'vitest';
import { translateIdFields, entryLabel, normLabel } from '@utils/crossAccountSettings';

// Trimmed from the real IMS and GIS settings documents — the entries that actually
// matter for the bug this covers. The seed ids ('A4', 'P6', 'P8') are shared by both
// accounts because the two workspaces forked from one list; the uuids are not.
const GIS = {
    POL: {
        POL: [
            { id: 'A4', pol: 'Baltimore' },
            { id: '3ac2068a-3117-4af9-b6b1-880257fa76c7', pol: 'WH SH Bells', deleted: false },
            { id: 'd5c6e9e8-79c3-4faf-947f-261b5159e9ad', pol: 'WH SH Bell - Baltimore', deleted: false },
            { id: '603b539d-e400-42af-85d5-b91d6b7a1af8', pol: 'Gdansk', deleted: false },
            { id: '0d2bf518-a406-462c-9e3c-7f96a93d6617', pol: '_New POL', deleted: false },
        ],
    },
    POD: { POD: [{ id: 'cd868d80-ba52-4274-8a9e-0a5b1e97a237', pod: 'EU/UK Port at GIS option', deleted: false }] },
    'Payment Terms': { 'Payment Terms': [{ id: 'P8', termPmnt: '100% CAD within 5 banking days' }] },
    Packing: { Packing: [{ id: 'P6', packing: 'Ingots' }] },
    Origin: { Origin: [{ id: 'cfea19c0-1afa-43d6-a54f-f51e32c9111f', origin: 'Germany', deleted: false }] },
};

const IMS = {
    POL: {
        POL: [
            { id: 'A4', pol: 'Baltimore' },
            { id: '3ac2068a-3117-4af9-b6b1-880257fa76c7', pol: 'WH SH Bells', deleted: false },
            // no 'WH SH Bell - Baltimore', and Gdansk sits under a DIFFERENT id
            { id: '11111111-2222-3333-4444-555555555555', pol: 'Gdansk', deleted: false },
        ],
    },
    POD: { POD: [{ id: 'acc5fe53-1237-473e-a648-fc1853bbb89f', pod: 'EU/UK Port at IMS option', deleted: false }] },
    'Payment Terms': { 'Payment Terms': [{ id: 'P8', termPmnt: '100% CAD within 5 banking days' }] },
    Packing: { Packing: [{ id: 'P6', packing: 'Ingots' }] },
    Origin: { Origin: [{ id: 'cfea19c0-1afa-43d6-a54f-f51e32c9111f', origin: 'Germany', deleted: false }] },
};

describe('translateIdFields — GIS contract copied into IMS', () => {
    it('adds the missing port rather than leaving IMS holding a bare uuid (the reported bug)', () => {
        // This is IMS PO 090426 as it was actually stored: a GIS POL id, which the
        // contracts table printed verbatim as "d5c6e9e8-79c3-4faf-947f-261b5159e9ad".
        const con = { pol: 'd5c6e9e8-79c3-4faf-947f-261b5159e9ad', packing: 'P6', termPmnt: 'P8' };
        const { values, additions } = translateIdFields(con, GIS, IMS);

        expect(values.pol).toBeUndefined();          // id is kept
        expect(additions.POL).toEqual([
            { id: 'd5c6e9e8-79c3-4faf-947f-261b5159e9ad', pol: 'WH SH Bell - Baltimore', deleted: false },
        ]);
        // Ids both accounts already share are left completely alone.
        expect(additions.Packing).toBeUndefined();
        expect(additions['Payment Terms']).toBeUndefined();
    });

    it("repoints to the target's own id when it has the same name under a different one", () => {
        const { values, additions } = translateIdFields({ pol: '603b539d-e400-42af-85d5-b91d6b7a1af8' }, GIS, IMS);
        expect(values.pol).toBe('11111111-2222-3333-4444-555555555555');   // IMS's Gdansk
        expect(additions.POL).toBeUndefined();                              // nothing to add
    });

    it('does not copy an unrenamed "_New POL" placeholder into the other account', () => {
        const { values, additions } = translateIdFields({ pol: '0d2bf518-a406-462c-9e3c-7f96a93d6617' }, GIS, IMS);
        expect(values.pol).toBeUndefined();
        expect(additions.POL).toBeUndefined();
    });
});

describe('translateIdFields — IMS contract copied into GIS', () => {
    it('carries the IMS-worded POD across instead of blanking it on the PDF', () => {
        // GIS PO 280426--3 held this IMS id; "at IMS option" is the correct wording
        // on a GIS contract, so it is added rather than bent onto GIS's own entry.
        const { values, additions } = translateIdFields({ pod: 'acc5fe53-1237-473e-a648-fc1853bbb89f' }, IMS, GIS);
        expect(values.pod).toBeUndefined();
        expect(additions.POD).toEqual([
            { id: 'acc5fe53-1237-473e-a648-fc1853bbb89f', pod: 'EU/UK Port at IMS option', deleted: false },
        ]);
    });
});

describe('translateIdFields — values that must be left exactly as they are', () => {
    it("leaves the 'empty' origin sentinel alone (the PDF checks for it by name)", () => {
        const { values, additions } = translateIdFields({ origin: 'empty' }, IMS, GIS);
        expect(values).toEqual({});
        expect(additions).toEqual({});
    });

    it('does not treat free-typed payment terms as an id to look up', () => {
        const con = { isTermPmntText: true, termPmnt: '50% up front, balance on arrival' };
        const { values, additions } = translateIdFields(con, GIS, IMS);
        expect(values).toEqual({});
        expect(additions).toEqual({});
    });

    it('leaves a value neither account can explain untouched rather than guessing', () => {
        const { values, additions } = translateIdFields({ deltime: 'March 2026' }, GIS, IMS);
        expect(values).toEqual({});
        expect(additions).toEqual({});
    });

    it('ignores empty and non-string fields', () => {
        const { values, additions } = translateIdFields({ pol: '', pod: null, origin: undefined, size: 42 }, GIS, IMS);
        expect(values).toEqual({});
        expect(additions).toEqual({});
    });
});

describe('label reading', () => {
    it('reads the naming field positionally, whatever it is called', () => {
        expect(entryLabel({ id: 'A4', pol: 'Baltimore' })).toBe('Baltimore');
        expect(entryLabel({ deleted: false, id: 'x', delTerm: 'CFR' })).toBe('CFR');
        expect(entryLabel({ id: 'x', deleted: true })).toBeNull();
    });

    it('matches labels across incidental whitespace and case differences', () => {
        expect(normLabel('  WH  SH   Bells ')).toBe(normLabel('wh sh bells'));
    });
});
