import { describe, it, expect } from 'vitest';
import { duplicateLineTrap, contractLedger, onHandByLine } from '../utils/stockGuards.js';

// a purchase lot as the ledger holds it: names its line in `description`, its contract in contractData
const lot = (line, qnty, stock, con) => ({ type: 'in', description: line, qnty, stock, contractData: { id: con } });
// a sale: names its line in `descriptionId` and its contract only through the invoice number
const sale = (line, qnty, stock, invoice, invType = '1111') => ({ type: 'out', descriptionId: line, qnty, stock, invoice, invType });
const rowsOf = (rows) => async () => rows;

/* GIS PO 2808-26 as it stood on 11 Sep 2026. Two lines for one material: the PO's
   own "58Ni 20Cr 8Mo 3.54Nb Turnings" (9c815f14) and "625 AM Turnings" (c14a819b),
   which arrived by copy/autofill. The 5.202 MT was received under c14a819b; sales
   invoice 46 was written against 9c815f14. The out never met the in, and the row sat
   in Stocks - UnPaid for weeks. This is the moment the guard has to fire. */
const WH = 'e1da03ec';
const CON = 'po-2808-26';
const LINES = [
    { id: '9c815f14', description: '58Ni  20Cr  8Mo 3.54Nb Turnings' },
    { id: 'bad1d959', description: '46Ni  16Cr  3.9Mo  3Ti  2.2Co 2.24Nb Turnings' },
    { id: '1c13d219', description: '59Ni 14Cr 3Mo 6Co 2Nb 1.5Ti Turnings' },
    { id: 'c14a819b', description: '625  AM Turnings' },
];
const PO2808 = { id: CON, productsData: LINES, invoices: [] };
// what the warehouse held before invoice 46 was saved
const LEDGER = { '9c815f14': 0, 'bad1d959': 4.328, '1c13d219': 5.44, 'c14a819b': 5.202 };
const ledger = (overrides = {}) => rowsOf(Object.entries({ ...LEDGER, ...overrides })
    .filter(([, q]) => q > 0).map(([line, q]) => lot(line, q, WH, CON)));
const invoice46 = (lineId, extra = {}) => ({
    draft: false, invoice: '', ...extra,
    productsDataInvoice: [
        { descriptionId: 'bad1d959', qnty: '4.328', stock: WH },
        { descriptionId: lineId, qnty: '5.202', stock: WH },       // the 625 AM line
        { descriptionId: '1c13d219', qnty: '5.440', stock: WH },
    ],
});

describe('duplicateLineTrap — the same material on two lines', () => {
    it('blocks invoice 46 as it was actually written, and names the line that has the stock', async () => {
        const msg = await duplicateLineTrap(invoice46('9c815f14'), PO2808, ledger());
        expect(msg).toBeTruthy();
        expect(msg).toContain('58Ni');                 // what was picked
        expect(msg).toContain('625  AM Turnings');     // where the stock is
        expect(msg).toContain('5.202');
    });

    it('lets invoice 46 through once it points at the line the stock is under', async () => {
        expect(await duplicateLineTrap(invoice46('c14a819b'), PO2808, ledger())).toBeNull();
    });

    it('does not block invoicing before receipt — nothing on ANY line is allowed', async () => {
        // the whole PO not yet received: negative stock until the lots arrive is normal
        const empty = { '9c815f14': 0, 'bad1d959': 0, '1c13d219': 0, 'c14a819b': 0 };
        expect(await duplicateLineTrap(invoice46('9c815f14'), PO2808, ledger(empty))).toBeNull();
    });

    it('does not fire when the sibling has stock but not ENOUGH for this line', async () => {
        // 2.0 under the other line cannot be what a 5.202 sale meant
        expect(await duplicateLineTrap(invoice46('9c815f14'), PO2808, ledger({ c14a819b: 2.0 }))).toBeNull();
    });

    it('never fires on a draft — drafts move no stock', async () => {
        expect(await duplicateLineTrap(invoice46('9c815f14', { draft: true }), PO2808, ledger())).toBeNull();
    });

    it('never fires on a single-line contract — nothing to confuse it with', async () => {
        const one = { ...PO2808, productsData: [LINES[0]] };
        expect(await duplicateLineTrap(invoice46('9c815f14'), one, ledger())).toBeNull();
    });

    it('ignores service lines and lines with no warehouse yet', async () => {
        const inv = { draft: false, productsDataInvoice: [
            { descriptionId: '9c815f14', qnty: 's', stock: WH },   // service line
            { descriptionId: '9c815f14', qnty: '5.202', stock: '' }, // no warehouse picked
        ] };
        expect(await duplicateLineTrap(inv, PO2808, ledger())).toBeNull();
    });
});

/* IMS PO 220526 (ELG Utica US) as it stood on 23 Sep 2026. It was assembled from lines
   of PO 050626 and PO 120526-1, and the copies kept those lines' ids — so the ledger
   under 220526's 31Ni BalTi line holds 050626's two lots (35.683 MT). The only lot
   220526 owns is 15.498 MT of REN88 (14CR), all of it sold to Oryx on invoice 1448
   (the original 1111 and its final 3333; the loader has already dropped the 1111).
   Re-saving 1448 was blocked: REN88 "has nothing", 31Ni BalTi "has 35.683". Both
   halves of that message were wrong. */
const SH_BELL = 'sh-bell';
const P220526 = '007f78c8', P050626 = 'c0f7a912', P120526 = 'efb70bc9';
const REN88_CR = 'a2943aed', R43NI = '065d0243', BALTI = '157dcdb6', R88_OFF = 'ec679548',
    IN100 = '614c3c32', REN88_Cr = '7aac9472', ME16 = '15ba15e5', OFF718 = '6dc62ab2';
const PO220526 = {
    id: P220526,
    invoices: [{ invoice: 1448, invType: '1111' }, { invoice: 1448, invType: '3333' }],
    productsData: [
        { id: REN88_CR, description: 'REN88 Turnings (56Ni 14CR 13Co 4Mo 4W)' },
        { id: R43NI, description: '43Ni Refinery Turnings (42Ni 12Cr 6Co 2.5Nb 8Ti)' },
        { id: BALTI, description: '31Ni BalTi Refinery Turnings' },
        { id: OFF718, description: '718 Turnings off grade' },
        { id: R88_OFF, description: 'R88 Turnings off grade (56Ni 14Cr 13Co 4Mo 4W)' },
        { id: IN100, description: 'IN100 modified Turnings (51Ni 18Co 12Cr 3.5Mo)' },
        { id: REN88_Cr, description: 'REN88 Turnings (56Ni 14Cr 13Co 4Mo 4W)' },
        { id: ME16, description: 'ME 16 Turnings' },
    ],
};
const LEDGER_220526 = [
    lot(REN88_CR, 15.498, SH_BELL, P220526),
    lot(BALTI, 17.331785, SH_BELL, P050626), lot(BALTI, 18.35146, SH_BELL, P050626),
    lot(R43NI, 18.326514, SH_BELL, P050626), lot(R43NI, 15.646688, SH_BELL, P050626),
    lot(R88_OFF, 11.565, SH_BELL, P050626), lot(IN100, 18.338, SH_BELL, P050626),
    lot(REN88_Cr, 7.566, SH_BELL, P120526), lot(ME16, 5.432, SH_BELL, P120526),
    sale(REN88_CR, 15.498, SH_BELL, 1448, '3333'), sale(REN88_Cr, 7.566, SH_BELL, 1448, '3333'),
    sale(IN100, 18.338, SH_BELL, 1448, '3333'), sale(R88_OFF, 11.565, SH_BELL, 1448, '3333'),
    sale(R43NI, 18.326, SH_BELL, 1447, '3333'), sale(R43NI, 15.647, SH_BELL, 1447, '3333'),
    sale(ME16, 5.463073, SH_BELL, 1442, '3333'),
];
const invoice1448 = (extra = {}) => ({
    draft: false, invoice: 1448, invType: '3333', ...extra,
    productsDataInvoice: [
        { descriptionId: REN88_CR, qnty: '15.498', stock: SH_BELL },
        { descriptionId: REN88_Cr, qnty: '7.566', stock: SH_BELL },
        { descriptionId: IN100, qnty: '18.338', stock: SH_BELL },
        { descriptionId: R88_OFF, qnty: '11.565', stock: SH_BELL },
    ],
});

describe('duplicateLineTrap — only the contract\'s own ledger counts', () => {
    it('re-saving Oryx invoice 1448 goes through — its own sale is not counted against it', async () => {
        expect(await duplicateLineTrap(invoice1448(), PO220526, rowsOf(LEDGER_220526))).toBeNull();
        expect(await duplicateLineTrap(invoice1448({ invType: '1111' }), PO220526, rowsOf(LEDGER_220526))).toBeNull();
    });

    it('another PO\'s lots on a shared line id are not a sibling with stock', async () => {
        // a new sale of the sold-out REN88: PO 220526 holds nothing on ANY line, so it is let through
        const inv = { draft: false, invoice: '', productsDataInvoice: [{ descriptionId: REN88_CR, qnty: '5', stock: SH_BELL }] };
        expect(await duplicateLineTrap(inv, PO220526, rowsOf(LEDGER_220526))).toBeNull();
        // control: were those 31Ni lots 220526's own, the trap would fire as it was built to
        const owned = LEDGER_220526.map(r => (r.description === BALTI ? { ...r, contractData: { id: P220526 } } : r));
        expect(await duplicateLineTrap(inv, PO220526, rowsOf(owned))).toContain('31Ni BalTi');
    });
});

describe('contractLedger', () => {
    it('keeps the contract\'s lots and its listed sales, and nothing from the PO it was copied from', () => {
        const onHand = onHandByLine(contractLedger(LEDGER_220526, PO220526, ''), PO220526.productsData.map(p => p.id));
        expect(onHand[REN88_CR]).toBeCloseTo(0, 6);       // 15.498 in, 15.498 sold on 1448
        expect(onHand[BALTI]).toBe(0);                     // 050626's lots
        expect(onHand[R43NI]).toBe(0);                     // 050626's lots, sold on 050626's 1447
        expect(onHand[IN100]).toBeCloseTo(-18.338, 6);     // 1448 sold it; the lot is 050626's
    });

    it('leaves out the invoice being saved, whichever of its documents is open', () => {
        const onHand = onHandByLine(contractLedger(LEDGER_220526, PO220526, 1448), [REN88_CR]);
        expect(onHand[REN88_CR]).toBeCloseTo(15.498, 6);
    });

    it('a warehouse transfer follows its arriving half — and another PO\'s transfer on the same line does not', () => {
        const A = 'wh-a', B = 'wh-b', DAY = '01-Sep-2026';
        const rows = [
            lot('L1', 10, A, 'mine'),
            { type: 'out', moveType: 'out', descriptionId: 'L1', qnty: 4, stock: A, newStock: B, date: DAY },
            { ...lot('L1', '4', B, 'mine'), moveType: 'in', oldStock: A, date: DAY },
            // the other PO moved 3 of its own on the same shared line id
            lot('L1', 3, A, 'other'),
            { type: 'out', moveType: 'out', descriptionId: 'L1', qnty: 3, stock: A, newStock: B, date: DAY },
            { ...lot('L1', '3', B, 'other'), moveType: 'in', oldStock: A, date: DAY },
        ];
        const scoped = contractLedger(rows, { id: 'mine', invoices: [] }, '');
        expect(onHandByLine(scoped.filter(r => r.stock === A), ['L1']).L1).toBe(6);
        expect(onHandByLine(scoped.filter(r => r.stock === B), ['L1']).L1).toBe(4);
    });
});
