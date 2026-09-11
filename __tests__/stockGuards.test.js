import { describe, it, expect } from 'vitest';
import { duplicateLineTrap } from '../utils/stockGuards.js';

/* GIS PO 2808-26 as it stood on 11 Sep 2026. Two lines for one material: the PO's
   own "58Ni 20Cr 8Mo 3.54Nb Turnings" (9c815f14) and "625 AM Turnings" (c14a819b),
   which arrived by copy/autofill. The 5.202 MT was received under c14a819b; sales
   invoice 46 was written against 9c815f14. The out never met the in, and the row sat
   in Stocks - UnPaid for weeks. This is the moment the guard has to fire. */
const WH = 'e1da03ec';
const LINES = [
    { id: '9c815f14', description: '58Ni  20Cr  8Mo 3.54Nb Turnings' },
    { id: 'bad1d959', description: '46Ni  16Cr  3.9Mo  3Ti  2.2Co 2.24Nb Turnings' },
    { id: '1c13d219', description: '59Ni 14Cr 3Mo 6Co 2Nb 1.5Ti Turnings' },
    { id: 'c14a819b', description: '625  AM Turnings' },
];
// what the warehouse held before invoice 46 was saved
const LEDGER = { '9c815f14': 0, 'bad1d959': 4.328, '1c13d219': 5.44, 'c14a819b': 5.202 };
const ledger = (overrides = {}) => async (ids, wh) => {
    expect(wh).toBe(WH);
    const m = {}; ids.forEach(id => { m[id] = { ...LEDGER, ...overrides }[id] ?? 0; }); return m;
};
const invoice46 = (lineId, extra = {}) => ({
    draft: false, ...extra,
    productsDataInvoice: [
        { descriptionId: 'bad1d959', qnty: '4.328', stock: WH },
        { descriptionId: lineId, qnty: '5.202', stock: WH },       // the 625 AM line
        { descriptionId: '1c13d219', qnty: '5.440', stock: WH },
    ],
});

describe('duplicateLineTrap — the same material on two lines', () => {
    it('blocks invoice 46 as it was actually written, and names the line that has the stock', async () => {
        const msg = await duplicateLineTrap(invoice46('9c815f14'), LINES, ledger());
        expect(msg).toBeTruthy();
        expect(msg).toContain('58Ni');                 // what was picked
        expect(msg).toContain('625  AM Turnings');     // where the stock is
        expect(msg).toContain('5.202');
    });

    it('lets invoice 46 through once it points at the line the stock is under', async () => {
        expect(await duplicateLineTrap(invoice46('c14a819b'), LINES, ledger())).toBeNull();
    });

    it('does not block invoicing before receipt — nothing on ANY line is allowed', async () => {
        // the whole PO not yet received: negative stock until the lots arrive is normal
        const empty = { '9c815f14': 0, 'bad1d959': 0, '1c13d219': 0, 'c14a819b': 0 };
        expect(await duplicateLineTrap(invoice46('9c815f14'), LINES, ledger(empty))).toBeNull();
    });

    it('does not fire when the sibling has stock but not ENOUGH for this line', async () => {
        // 2.0 under the other line cannot be what a 5.202 sale meant
        expect(await duplicateLineTrap(invoice46('9c815f14'), LINES, ledger({ c14a819b: 2.0 }))).toBeNull();
    });

    it('never fires on a draft — drafts move no stock', async () => {
        expect(await duplicateLineTrap(invoice46('9c815f14', { draft: true }), LINES, ledger())).toBeNull();
    });

    it('never fires on a single-line contract — nothing to confuse it with', async () => {
        const one = [LINES[0]];
        expect(await duplicateLineTrap(invoice46('9c815f14'), one, ledger())).toBeNull();
    });

    it('ignores service lines and lines with no warehouse yet', async () => {
        const inv = { draft: false, productsDataInvoice: [
            { descriptionId: '9c815f14', qnty: 's', stock: WH },   // service line
            { descriptionId: '9c815f14', qnty: '5.202', stock: '' }, // no warehouse picked
        ] };
        expect(await duplicateLineTrap(inv, LINES, ledger())).toBeNull();
    });
});
