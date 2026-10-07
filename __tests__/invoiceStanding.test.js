import { describe, it, expect } from 'vitest';
import * as webFinance from '../utils/finance.js';
import * as mobFinance from '../mobile/src/shared/finance.js';
import * as webLink from '../utils/salesLink.js';
import * as mobLink from '../mobile/src/shared/salesLink.js';
import * as webPure from '../utils/pureHelpers.js';
import * as mobPure from '../mobile/src/shared/pureHelpers.js';

/* One invoice, one value (2026-10-06, the whole-app cross-check).

   An invoice and its Credit / Final notes share an invoice NUMBER, and a note in this data is
   the invoice issued AGAIN with its settled figures — IMS's 305 Final Notes come to a median
   0.995 of the invoice they settle, none negative. Pages that added a note to its invoice
   counted the sale twice: Accounting's 2026 Income read $92.80M for $69.03M of invoices;
   Sales Contracts shipped PCI / 3014 twice (45.606 MT of a 23 MT order); the Dashboard booked
   a deal finalised across a year end in both years ($969,843.78 of IMS's 2026).

   Every case runs through the web module and its byte-identical mobile copy. */
const both = (fn) => {
    const a = fn(webFinance, webLink, webPure);
    expect(fn(mobFinance, mobLink, mobPure)).toEqual(a);
    return a;
};

// Invoice documents shaped as Firestore holds them (drafts: dateRange.startDate, invType ids).
const doc = (invoice, invType, date, totalAmount, extra = {}) => ({
    id: `${invoice}-${invType}-${date}`, invoice, invType, totalAmount, cur: 'us',
    dateRange: { startDate: date, endDate: date }, final: false, ...extra,
});
const INV = (n, date, amt, extra) => doc(n, '1111', date, amt, extra);
const FN = (n, date, amt, origDate, extra) => doc(n, '3333', date, amt, { originalInvoice: { id: `${n}-1111-${origDate}`, date: origDate }, ...extra });
const CN = (n, date, amt, origDate, extra) => doc(n, '2222', date, amt, { originalInvoice: { id: `${n}-1111-${origDate}`, date: origDate }, ...extra });

describe('standingDocs — the invoice as it stands', () => {
    it('a Final Note replaces its invoice; a Credit Note replaces it too, and is replaced by a Final Note', () => {
        const pick = (g) => both((f) => f.standingDocs(g).map((d) => d.invType));
        expect(pick([INV(1374, '2026-01-25', 182943), FN(1374, '2026-05-05', 182200.5, '2026-01-25')])).toEqual(['3333']);
        expect(pick([INV(9, '2026-01-01', 100), CN(9, '2026-02-01', 90, '2026-01-01')])).toEqual(['2222']);
        expect(pick([INV(9, '2026-01-01', 100), CN(9, '2026-02-01', 90, '2026-01-01'), FN(9, '2026-03-01', 95, '2026-01-01')])).toEqual(['3333']);
        expect(pick([INV(10, '2026-01-01', 100)])).toEqual(['1111']);
    });

    it('two Final Notes that settle one invoice between them both stand — invoice 1298', () => {
        // INV $598,215.60 for three containers; one note per container group.
        const g = [
            INV(1298, '2025-08-01', 598215.6),
            FN(1298, '2025-08-01', 417387.25, '2025-08-01', { id: 'fn-a' }),
            FN(1298, '2025-10-14', 180080.2, '2025-08-01', { id: 'fn-b' }),
        ];
        const standing = both((f) => f.standingDocs(g).map((d) => d.totalAmount));
        expect(standing).toEqual([417387.25, 180080.2]);
        expect(standing.reduce((s, v) => s + v, 0)).toBeCloseTo(597467.45, 2);
    });

    it('a cancelled document does not stand; if the note was cancelled the invoice stands again', () => {
        const g = [INV(5, '2026-01-01', 100), FN(5, '2026-02-01', 98, '2026-01-01', { canceled: true })];
        expect(both((f) => f.standingDocs(g).map((d) => d.invType))).toEqual(['1111']);
        expect(both((f) => f.standingDocs([INV(6, '2026-01-01', 100, { canceled: true })]))).toEqual([]);
    });

    it('the rank reads both shapes of invType, and anything unknown is the invoice itself', () => {
        expect(both((f) => ['1111', 'Invoice', '2222', 'Credit Note', '3333', 'Final Note', 'Sales Invoice', undefined].map((t) => f.invoiceRank({ invType: t }))))
            .toEqual([1, 1, 2, 2, 3, 3, 1, 1]);
        expect(both((f) => [null, {}, { canceled: true }, { canceled: false }].map(f.isLiveDoc))).toEqual([false, true, false, true]);
    });
});

describe('salesBookedIn — an invoice belongs to the period of its ORIGINAL, at its final value', () => {
    // The real IMS pairs behind the Dashboard's double count: issued in 2025, finalised in 2026.
    const window = [
        INV(1327, '2025-08-20', 121208.41), FN(1327, '2026-01-23', 118072.8, '2025-08-20'),
        INV(1367, '2025-12-23', 245750.62), FN(1367, '2026-06-03', 237442.7, '2025-12-23'),
        // issued and finalised in 2026
        INV(1374, '2026-01-25', 182943), FN(1374, '2026-05-05', 182200.5, '2026-01-25'),
        // issued in 2026, not finalised yet
        INV(1480, '2026-09-30', 50000),
        // not sales: a draft and a cancelled invoice
        INV(1490, '2026-10-01', 7777, { draft: true }), INV(1491, '2026-10-02', 8888, { canceled: true }),
    ];
    const year = (y) => both((f) => f.salesBookedIn(window, { start: `${y}-01-01`, end: `${y}-12-31` })
        .map(({ doc: d, bookedOn }) => `${d.invoice}${d.invType === '3333' ? 'FN' : ''} ${bookedOn} ${d.totalAmount}`));

    it('a note settling last year\'s invoice is not a sale of this year', () => {
        expect(year(2026)).toEqual(['1374FN 2026-01-25 182200.5', '1480 2026-09-30 50000']);
    });

    it('…it is last year\'s invoice, at its final value', () => {
        expect(year(2025)).toEqual(['1327FN 2025-08-20 118072.8', '1367FN 2025-12-23 237442.7']);
    });

    it('each deal is counted once across the years — the old rule counted 1327 and 1367 in both', () => {
        const total = (y) => both((f) => f.salesBookedIn(window, { start: `${y}-01-01`, end: `${y}-12-31` }).reduce((s, e) => s + e.doc.totalAmount, 0));
        expect(total(2025) + total(2026)).toBeCloseTo(118072.8 + 237442.7 + 182200.5 + 50000, 2);
    });

    it('without the original loaded, the note\'s pointer keeps the invoice in its own year', () => {
        // The Dashboard loads four years; an invoice older than that is still not this year's.
        const onlyNote = [FN(1100, '2026-02-01', 1000, '2021-06-30')];
        expect(both((f) => f.salesBookedIn(onlyNote, { start: '2026-01-01', end: '2026-12-31' }))).toEqual([]);
        expect(both((f) => f.invoiceBookedOn(onlyNote))).toBe('2021-06-30');
        // A note with neither an original nor a pointer is booked on its own date.
        const bare = [doc(1031, '2222', '2023-11-09', 0)];
        expect(both((f) => f.invoiceBookedOn(bare))).toBe('2023-11-09');
        expect(both((f) => f.invoiceBookedOn([]))).toBe('');
    });

    it('the period is inclusive at both ends, and with no period every invoice is booked', () => {
        const g = [INV(1, '2026-01-01', 1), INV(2, '2026-12-31', 2), INV(3, '2027-01-01', 3)];
        expect(both((f) => f.salesBookedIn(g, { start: '2026-01-01', end: '2026-12-31' }).map((e) => e.doc.invoice))).toEqual([1, 2]);
        expect(both((f) => f.salesBookedIn(g).length)).toBe(3);
    });
});

describe('ledgerTotals — Accounting: each invoice once, each cost once, $ and € apart', () => {
    it('income counts the invoice as it stands, not the invoice and its note', () => {
        const t = both((f) => f.ledgerTotals({
            sales: [
                { invoice: 1374, invType: 'Sales Invoice', amount: 182943, cur: 'USD' },
                { invoice: 1374, invType: 'Final Note', amount: 182200.5, cur: 'USD' },
                { invoice: 1211, invType: 'Sales Invoice', amount: 144131.4, cur: 'EUR' },
            ],
        }));
        expect(t.income).toEqual({ us: 182200.5, eu: 144131.4 });
        expect(t.invoices).toBe(2);
    });

    it('a supplier invoice listed under two sales invoices is a cost once — PO 280426-1-TIM', () => {
        const t = both((f) => f.ledgerTotals({
            sales: [{ invoice: 1441, amount: 7000000, cur: 'USD' }, { invoice: 1436, amount: 600000, cur: 'USD' }],
            costs: [
                { key: 'po:280426-1-TIM:1SHX0526', amount: 6722430, cur: 'USD' },   // listed under 1441
                { key: 'po:280426-1-TIM:1SHX0526', amount: 6722430, cur: 'USD' },   // and under 1436
                { key: 'exp:freight-1', amount: '1250.50', cur: 'EUR' },
            ],
        }));
        expect(t.expense).toEqual({ us: 6722430, eu: 1250.5 });
        expect(t.balance).toEqual({ us: 7600000 - 6722430, eu: -1250.5 });
    });

    it('a cancelled invoice is not income; a cost line without a key still counts; junk never poisons a total', () => {
        const t = both((f) => f.ledgerTotals({
            sales: [{ invoice: 1, amount: 500, cur: 'us', canceled: true }, { invoice: 2, amount: 'n/a', cur: 'us' }, { invoice: '', amount: 9 }],
            costs: [{ amount: 10, cur: '$' }, { amount: 5 }, null],
        }));
        expect(t.income).toEqual({ us: 0, eu: 0 });
        expect(t.expense).toEqual({ us: 15, eu: 0 });
        expect(both((f) => f.ledgerTotals())).toEqual({ income: { us: 0, eu: 0 }, expense: { us: 0, eu: 0 }, balance: { us: 0, eu: 0 }, invoices: 0 });
    });
});

describe('settledInvoices — Sales Contracts: each shipment once, the note taking the invoice\'s link', () => {
    const line = (qnty, descriptionId, salesContractId) => ({ id: `l-${descriptionId}-${qnty}`, qnty, descriptionId, ...(salesContractId ? { salesContractId } : {}) });
    const shipped = (invs) => both((f, l) => {
        const out = {};
        l.settledInvoices(invs).forEach((inv) => Object.entries(l.invoiceQtyBySalesContract(inv)).forEach(([k, v]) => { out[k] = Math.round(((out[k] || 0) + v) * 1000) / 1000; }));
        return out;
    });

    it('an invoice and its Final Note, both linked, ship once at the final weights — PCI / 3014', () => {
        const inv = INV(1460, '2026-07-28', 219611.95, { salesContractId: 'pci', productsDataInvoice: [line('1', 'a'), line('11.779', 'b'), line('0.999', 'c'), line('0.980', 'd'), line('7.982', 'e')] });
        const fn = FN(1460, '2026-09-30', 220735.45, '2026-07-28', { salesContractId: 'pci', productsDataInvoice: [line('1', 'a'), line('11.620', 'b'), line('1.000', 'c'), line('0.978', 'd'), line('8.006', 'e'), line('0.262', 'f')] });
        expect(shipped([inv, fn])).toEqual({ pci: 22.866 });   // was 45.606 against an order of 23
    });

    it('a note issued without a link takes the invoice\'s, line by line — invoice 1448 split over two POs', () => {
        const inv = INV(1448, '2026-07-07', 445083.16, {
            productsDataInvoice: [line('15.498', 'm1', 'PB062971'), line('7.566', 'm2', 'PB062971'), line('18.338', 'm3', 'PB062972'), line('11.565', 'm4', 'PB062971')],
        });
        const fn = FN(1448, '2026-08-24', 445083.16, '2026-07-07', {
            productsDataInvoice: [line('15.498', 'm1'), line('7.566', 'm2'), line('18.338', 'm3'), line('11.565', 'm4')],
        });
        expect(shipped([inv, fn])).toEqual({ PB062971: 34.629, PB062972: 18.338 });
        // Before: the unlinked note counted for nothing, and the invoice's own lines were added on top.
        expect(shipped([inv])).toEqual({ PB062971: 34.629, PB062972: 18.338 });
    });

    it('a header-linked invoice passes its one contract to every line of an unlinked note — invoice 1409', () => {
        const inv = INV(1409, '2026-04-08', 513115.75, { salesContractId: '3001150', productsDataInvoice: [line('8.638', 'x'), line('9.459', 'y'), line('16.070', 'x'), line('3.877', 'z')] });
        const fn = FN(1409, '2026-06-30', 507369.81, '2026-04-08', { salesContractId: '', productsDataInvoice: [line('8.464', 'x'), line('9.459', 'y'), line('17.17808', 'x'), line('2.559', 'z'), line('0.5', 'new')] });
        // 8.464 + 9.459 + 17.17808 + 2.559 + 0.5 — the note's own weights, a new line included
        expect(shipped([inv, fn])).toEqual({ 3001150: 38.16 });
    });

    it('a link the note makes itself stands; an invoice with no note is untouched', () => {
        const inv = INV(7, '2026-01-01', 1, { productsDataInvoice: [line('5', 'a', 'old')] });
        const fn = FN(7, '2026-02-01', 1, '2026-01-01', { productsDataInvoice: [line('5', 'a', 'new')] });
        expect(shipped([inv, fn])).toEqual({ new: 5 });
        const lone = INV(8, '2026-01-01', 1, { salesContractId: 'sc', productsDataInvoice: [line('3', 'a')] });
        expect(both((f, l) => l.settledInvoices([lone]))).toEqual([lone]);
    });

    it('a cancelled note leaves the invoice standing; a cancelled invoice ships nothing', () => {
        const inv = INV(9, '2026-01-01', 1, { salesContractId: 'sc', productsDataInvoice: [line('4', 'a')] });
        const fn = FN(9, '2026-02-01', 1, '2026-01-01', { salesContractId: 'sc', canceled: true, productsDataInvoice: [line('3.9', 'a')] });
        expect(shipped([inv, fn])).toEqual({ sc: 4 });
        expect(shipped([{ ...inv, canceled: true }])).toEqual({});
    });

    it('an ambiguous material line — the same line sold to two POs — takes no guess', () => {
        const inv = INV(11, '2026-01-01', 1, { productsDataInvoice: [line('2', 'a', 'P1'), line('3', 'a', 'P2')] });
        const fn = FN(11, '2026-02-01', 1, '2026-01-01', { productsDataInvoice: [line('2', 'a'), line('3', 'a')] });
        expect(shipped([inv, fn])).toEqual({});
    });
});

describe('invoiceStatus — the Status word follows the invoice\'s own Draft box', () => {
    const word = (inv) => both((f) => f.invoiceStatus(inv));

    it('an invoice saved without the Draft box is Issued — `final` (never set) does not decide', () => {
        // As Firestore holds them: `final: false` on every document, `draft` absent or false.
        expect(word(INV(1472, '2026-09-20', 100))).toBe('Issued');
        expect(word(INV(1472, '2026-09-20', 100, { draft: false }))).toBe('Issued');
        expect(word(INV(1472, '2026-09-20', 100, { final: true }))).toBe('Issued');
    });

    it('the Draft box makes it a Draft — invoice 1478, and Final Note 1431FN beside its issued invoice', () => {
        expect(word(INV(1478, '2026-10-01', 100, { draft: true }))).toBe('Draft');
        expect(word(FN(1431, '2026-09-01', 100, '2026-06-01', { draft: true }))).toBe('Draft');
        expect(word(INV(1431, '2026-06-01', 100))).toBe('Issued');
        // only the box itself: a stray string is not a tick (isIssued draws the same line)
        expect(word(INV(1, '2026-01-01', 1, { draft: 'true' }))).toBe('Issued');
    });

    it('a cancelled invoice is Canceled, drafted or not', () => {
        expect(word(INV(2, '2026-01-01', 1, { canceled: true }))).toBe('Canceled');
        expect(word(INV(2, '2026-01-01', 1, { canceled: true, draft: true }))).toBe('Canceled');
    });

    it('says Issued exactly when isIssued does', () => {
        [{}, { draft: true }, { draft: false }, { canceled: true }, { canceled: true, draft: true }, { final: true }].forEach((x) => {
            const inv = INV(3, '2026-01-01', 1, x);
            expect(both((f) => f.invoiceStatus(inv) === 'Issued')).toBe(both((f) => f.isIssued(inv)));
        });
        expect(word(undefined)).toBe('Issued');
    });
});

/* A draft is held back (2026-10-07). Ticking Draft on an invoice or a note keeps it out of
   cashflow and stock until the box is unticked — so a draft does not stand in for a document
   that has been issued. It used to: the draft note took its invoice's place and was then
   dropped for being a draft, so the invoice's unpaid balance was in no receivable (GIS #40,
   $69,328.09 owed; IMS #1431, $15,467.45), and the review pages showed the draft's figure. */
describe('a draft is held back — it does not stand in for a document that has been issued', () => {
    // IMS #1431: issued 15 May at $309,349.00, $293,881.55 paid; its Final Note is still a draft.
    const i1431 = INV(1431, '2026-05-15', 309349, { payments: [{ pmnt: '293881.55' }] });
    const f1431 = FN(1431, '2026-07-08', 277016, '2026-05-15', { draft: true, payments: [] });
    // GIS #40: the draft note is a copy of the invoice; $1,317,233.71 of $1,386,561.80 paid.
    const i40 = INV(40, '2026-06-29', 1386561.8, { payments: [{ pmnt: '1317233.71' }] });
    const f40 = FN(40, '2026-09-08', 1386561.8, '2026-06-29', { draft: true, payments: [] });
    const draftInv = INV(1478, '2026-09-23', 210216.56, { draft: true });
    const ids = (docs) => docs.map((d) => d.id);

    it('docsInForce: an issued invoice sheds its draft note, whichever comes first', () => {
        expect(ids(both((f) => f.docsInForce([i1431, f1431])))).toEqual([i1431.id]);
        expect(ids(both((f) => f.docsInForce([f1431, i1431])))).toEqual([i1431.id]);
    });

    it('docsInForce: with nothing issued under the number, the group comes back as it is', () => {
        // a draft invoice on its own, and one with a draft note of its own
        expect(ids(both((f) => f.docsInForce([draftInv])))).toEqual([draftInv.id]);
        const itsNote = FN(1478, '2026-10-01', 200000, '2026-09-23', { draft: true });
        expect(ids(both((f) => f.docsInForce([draftInv, itsNote])))).toEqual([draftInv.id, itsNote.id]);
        // a cancelled invoice is not an issued one: its draft note is all there is
        const cancelled = INV(9, '2026-01-01', 100, { canceled: true });
        const note = FN(9, '2026-02-01', 90, '2026-01-01', { draft: true });
        expect(ids(both((f) => f.docsInForce([cancelled, note])))).toEqual([cancelled.id, note.id]);
        expect(both((f) => f.docsInForce(undefined))).toEqual([]);
        expect(both((f) => f.docsInForce([null, i40]).length)).toBe(1);
    });

    it('docsInForce: a note that HAS been issued is untouched — it still replaces its invoice', () => {
        const inv = INV(1374, '2026-01-25', 182943);
        const fn = FN(1374, '2026-05-05', 182200.5, '2026-01-25');
        expect(ids(both((f) => f.docsInForce([inv, fn])))).toEqual([inv.id, fn.id]);
        expect(both((f) => f.standingDocs([inv, fn]).map((d) => d.invType))).toEqual(['3333']);
        // `draft: false` is the box unticked, not a draft
        expect(ids(both((f) => f.docsInForce([inv, { ...fn, draft: false }])))).toEqual([inv.id, fn.id]);
    });

    it('heldDraftIds: the drafts set aside across a flat list — and only those', () => {
        const held = both((f) => [...f.heldDraftIds([i1431, f1431, i40, f40, draftInv])].sort());
        expect(held).toEqual([f1431.id, f40.id].sort());
        expect(both((f) => f.heldDraftIds(undefined).size)).toBe(0);
    });

    it('standingDocs: #1431 stands at the $309,349.00 it was issued for until its note is issued', () => {
        expect(both((f) => f.standingDocs([i1431, f1431]).map((d) => d.totalAmount))).toEqual([309349]);
        expect(both((f) => f.standingDocs([i1431, f1431], f.isIssued).map((d) => d.totalAmount))).toEqual([309349]);
        // the Draft box unticked: the note replaces the invoice, as every issued note does
        expect(both((f) => f.standingDocs([i1431, { ...f1431, draft: false }]).map((d) => d.totalAmount))).toEqual([277016]);
        // a draft invoice on its own: listed where drafts are listed, absent where only issued documents count
        expect(both((f) => f.standingDocs([draftInv]).length)).toBe(1);
        expect(both((f) => f.standingDocs([draftInv], f.isIssued).length)).toBe(0);
    });

    it('groupInvoices: the invoice keeps its own balance — GIS #40, $69,328.09 still owed', () => {
        const out = both((f) => f.groupInvoices([i40, f40]));
        expect(out).toHaveLength(1);
        expect(out[0].id).toBe(i40.id);
        expect(both((f) => f.isIssued(f.groupInvoices([i40, f40])[0]))).toBe(true);
        expect(both((f) => +f.invoiceBalance(f.groupInvoices([i40, f40])[0]).toFixed(2))).toBe(69328.09);
    });

    it('receivables and aging: an issued invoice with a draft note is owed, not missing', () => {
        const asOf = new Date('2026-10-07T00:00:00Z');
        const owed = (list) => both((f) => {
            const c = f.receivables(list, { asOf }).byCur.us;
            return c ? +(c.due + c.balance).toFixed(2) : 0;
        });
        expect(owed([i40, f40])).toBe(69328.09);
        expect(owed([i1431, f1431])).toBe(15467.45);
        // a draft invoice on its own is still not a receivable
        expect(owed([draftInv])).toBe(0);
    });

    it('ledgerTotals: Accounting counts the invoice at its issued value', () => {
        const sales = [
            { invoice: 1431, invType: '1111', amount: 309349, cur: 'us', canceled: false, draft: false },
            { invoice: 1431, invType: '3333', amount: 277016, cur: 'us', canceled: false, draft: true },
        ];
        expect(both((f) => f.ledgerTotals({ sales }).income.us)).toBe(309349);
        // …and at the note's once the note is issued
        const issued = [sales[0], { ...sales[1], draft: false }];
        expect(both((f) => f.ledgerTotals({ sales: issued }).income.us)).toBe(277016);
    });

    it('salesBookedIn: the Dashboard already read it this way — and still does', () => {
        const booked = both((f) => f.salesBookedIn([i1431, f1431, draftInv], { start: '2026-01-01', end: '2026-12-31' })
            .map(({ doc }) => [doc.invoice, doc.totalAmount]));
        expect(booked).toEqual([[1431, 309349]]);
    });

    it('settledInvoices: tonnage shipped is the issued invoice\'s — 9.979 MT, not the draft note\'s 8.936', () => {
        const row = (qnty, descriptionId) => ({ id: `l-${qnty}`, qnty, descriptionId, salesContractId: 'sc' });
        const inv = { ...i1431, productsDataInvoice: [row('3.996', 'a'), row('5.983', 'b')] };
        const fn = { ...f1431, productsDataInvoice: [row('3.971', 'a'), row('4.965', 'b')] };
        const shippedTo = (docs) => both((f, l) => {
            const t = {};
            l.settledInvoices(docs).forEach((d) => Object.entries(l.invoiceQtyBySalesContract(d)).forEach(([k, v]) => { t[k] = +(((t[k] || 0) + v).toFixed(3)); }));
            return t;
        });
        expect(shippedTo([inv, fn])).toEqual({ sc: 9.979 });
        expect(shippedTo([inv, { ...fn, draft: false }])).toEqual({ sc: 8.936 });
    });

    it('groupInvoicesByNumber: the assistant\'s receivables read the issued invoice too', () => {
        const out = both((f, l, p) => p.groupInvoicesByNumber([i40, f40]));
        expect(out).toHaveLength(1);
        expect(out[0].id).toBe(i40.id);
    });
});
