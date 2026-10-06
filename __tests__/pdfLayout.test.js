import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { jsPDF } from 'jspdf';

/* Every document on one grid (app/(root)/contracts/modals/pdf/pdfLayout.js). Client,
   2026-10-06: "same alignment on all other pdfs and docs, not only Inv — contract etc."
   Each generator is run as the app runs it, and every word it draws is measured: where it
   starts, where it ends. The grid: content from 10 to 200 mm, every table exactly that
   wide, values on the right ending at 200, centred lines on 105. */

// utils/utils.js holds JSX and cannot be imported here; the generators use two helpers of it.
vi.mock('../utils/utils.js', () => ({
    getD: (array, value, item) => (array.filter((x) => x.id === value[item]).length ? array.find((x) => x.id === value[item])[item] : ''),
    fileToBase64: async (blob) => Buffer.from(await blob.arrayBuffer()).toString('base64'),
}));

// ── the browser's part: fonts and logos from public/, and a record of every text draw ──
const realFetch = globalThis.fetch;
const realAddImage = jsPDF.API.addImage;
let current = null;
beforeAll(() => {
    globalThis.fetch = async (url) => ({ ok: true, status: 200, blob: async () => new Blob([readFileSync('public' + url)]) });
    jsPDF.API.addImage = function (img, ...rest) {
        if (typeof img === 'string' && !img.startsWith('data:')) {
            img = 'data:image/jpeg;base64,' + readFileSync('public/' + img.replace(/^\//, '')).toString('base64');
        }
        return realAddImage.call(this, img, ...rest);
    };
    jsPDF.API.events.push(['initialized', function () {
        const doc = this;
        const rec = { draws: [], doc };
        current = rec;
        const text = doc.text;
        doc.text = function (t, x, y, opts, ...rest) {
            const align = (opts && opts.align) || 'left';
            const lh = doc.getFontSize() * doc.getLineHeightFactor() / doc.internal.scaleFactor;
            (Array.isArray(t) ? t : String(t ?? '').split('\n')).forEach((line, i) => {
                const w = doc.getTextWidth(String(line));
                const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
                rec.draws.push({ s: String(line), y: y + i * lh, left, right: left + w, page: doc.internal.getCurrentPageInfo().pageNumber });
            });
            return text.call(doc, t, x, y, opts, ...rest);
        };
        doc.save = () => { };
    }]);
});
afterAll(() => {
    globalThis.fetch = realFetch;
    jsPDF.API.addImage = realAddImage;
});

const draw = async (fn) => {
    current = null;
    await fn();
    const t = current.doc.lastAutoTable;
    const draws = current.draws.filter(d => d.page === 1 && d.s.trim());
    return {
        draws,
        table: t ? { left: t.settings.margin.left, right: t.settings.margin.left + t.columns.reduce((s, c) => s + c.width, 0), cols: t.columns.map(c => c.width) } : null,
        at: (s) => {
            const d = draws.find(x => x.s === s);
            if (!d) throw new Error(`"${s}" was not drawn`);
            return d;
        },
    };
};
const near = (a, b, what) => expect(Math.abs(a - b), `${what}: ${a.toFixed(3)} vs ${b}`).toBeLessThan(0.05);
const centre = (d) => (d.left + d.right) / 2;
const inFrame = (draws) => draws.filter(d => d.left < 10 - 0.05 || d.right > 200 + 0.05).map(d => `"${d.s.slice(0, 40)}" ${d.left.toFixed(1)}–${d.right.toFixed(1)}`);

// ── what the screens hand the generators ──────────────────────────────────────────────────
// A settings list as the app keeps it: settings.Shipment.Shipment = [{ id, shpType }, …].
const list = (name, key, rows) => ({ [name]: rows.map(([id, v]) => ({ id, [key]: v })) });
const SETTINGS = {
    Supplier: { Supplier: [{ id: 's1', supplier: 'Donald McArthy Trading Pte Ltd', nname: 'DMT', street: 'No. 8 Tuas Avenue 20, #02-01', city: 'Singapore', country: 'Singapore', other1: '638821' }] },
    Client: { Client: [{ id: 'c1', client: 'Solumet Metal and Powder Inc.', nname: 'Solumet', street: '38 Elizabeth', city: 'Beaconsfield, Quebec', country: 'Canada, H9W6C4', other1: '' }] },
    Shipment: list('Shipment', 'shpType', [['sh1', 'Ocean']]),
    Origin: list('Origin', 'origin', [['o1', 'Singapore']]),
    'Delivery Terms': list('Delivery Terms', 'delTerm', [['d1', 'CIF']]),
    POL: list('POL', 'pol', [['p1', 'Singapore']]),
    POD: list('POD', 'pod', [['p2', 'IWH Seagull B.V - NL']]),
    Packing: list('Packing', 'packing', [['k1', 'Bags/Drums']]),
    'Container Type': list('Container Type', 'contType', [['ct1', '40/20']]),
    Size: list('Size', 'size', [['z1', 'In size']]),
    'Delivery Time': list('Delivery Time', 'deltime', [['dt1', 'Within 30 Days from contract date']]),
    'Payment Terms': list('Payment Terms', 'termPmnt', [['pt1', '100% CAD within 5 banking days against emailed copy of the following documents: Non-Negotiable BL, Invoice & Packing list, Weight ticket, Loading photos.']]),
    Currency: { Currency: [{ id: 'us', cur: 'USD', symbol: '$' }] },
    Quantity: list('Quantity', 'qTypeTable', [['mt', 'MT']]),
    Remarks: list('Remarks', 'rmrk', [['r1', 'Material as per photos & specs provided']]),
    'Bank Account': { 'Bank Account': [{ id: 'b1', bankName: 'Community Federal Savings Bank', swiftCode: 'SWIFT: CMFGUS33', iban: 'Acc USD: 8488189489', corrBank: '', corrBankSwift: '', other: '' }] },
    Hs: { Hs: [] },
};
const COMP = { name: 'IMS Metals & Alloys OU', street: 'Jõe tn 4C', city: 'Tallinn, Harjumaa', zip: '10151', country: 'Estonia', reg: '17031890', vat: 'EE102810402', eori: 'EE17031890', email: 'office@ims-metals.com', website: 'www.ims-metals.com', phone: '+372 600 0000', contact: 'Sharon' };
const GIS_COMP = { ...COMP, name: 'GIS Metals OÜ', city: 'Tallinn', reg: '16143322', eori: 'EE16143322', website: 'www.gis-metals.com' };
const PO = {
    order: '250626', date: '2026-06-25', dateRange: { startDate: '2026-06-25' }, supplier: 's1', shpType: 'sh1', origin: 'o1', delTerm: 'd1',
    pol: 'p1', pod: 'p2', packing: 'k1', contType: 'ct1', size: 'z1', deltime: 'dt1', isDeltimeText: false, termPmnt: 'pt1', isTermPmntText: false,
    qTypeTable: 'mt', cur: 'us', priceMode: '', remarks: [{ rmrk: 'r1' }], priceRemarks: [],
    poInvoices: [{ id: 'pi1', inv: '20260810', pmnt: 5000 }, { id: 'pi2', inv: 'FVEH/00001/06/26/D', pmnt: 0 }],
};
const PO_ROWS = () => [[1, 'Ni Refinery', '10.000', '$11,000.00'], [2, 'Hast X engine parts', '0.198', '$10,000.00']];

const pdf = (file) => import(`../app/(root)/contracts/modals/pdf/${file}.js`);

describe('every document is drawn on one grid', () => {
    it('PO: the table spans 10–200 and the order, date and right-hand values end on its edge', async () => {
        const { Pdf } = await pdf('pdfContract');
        const r = await draw(() => Pdf(PO, PO_ROWS(), SETTINGS, COMP, false));
        near(r.table.left, 10, 'table left');
        near(r.table.right, 200, 'table right');
        for (const s of ['250626', '25-Jun-2026', '40/20', 'In size', 'Within 30 Days from contract date']) near(r.at(s).right, 200, s);
        // The company block and the right-hand labels share one x.
        near(r.at('IMS Metals & Alloys OU').left, 138, 'company block');
        near(r.at('Purchase Order No:').left, 138, 'right-hand labels');
        expect(inFrame(r.draws)).toEqual([]);
    });

    it('PO: text starts on the left edge or the value column — the intro, the terms, the sign-off', async () => {
        const { Pdf } = await pdf('pdfContract');
        const r = await draw(() => Pdf(PO, PO_ROWS(), SETTINGS, COMP, false));
        for (const s of ['Supplier:', 'Shipment:', 'Payment Terms:', 'Remarks:', 'With kind regards,']) near(r.at(s).left, 10, s);
        near(r.draws.find(d => d.s.startsWith('We confirm having purchased')).left, 10, 'intro');
        near(r.draws.find(d => d.s.startsWith('Please make sure to put')).left, 10, 'sign-off');
        near(r.draws.find(d => d.s.startsWith('100% CAD')).left, 35, 'payment terms value');
        near(r.at('Ocean').left, 35, 'left block value');
        near(r.at('POL:').left, 80, 'middle block label');
        near(r.draws.find(d => d.s === 'Singapore' && Math.abs(d.y - 96) < 0.01).left, 35, 'origin value');   // not the supplier's city
    });

    it('PO: the blocks list only what is there, from the top line down', async () => {
        const { Pdf } = await pdf('pdfContract');
        const sparse = { ...PO, origin: '', pol: '', contType: '' };
        const r = await draw(() => Pdf(sparse, PO_ROWS(), SETTINGS, COMP, false));
        for (const s of ['Shipment:', 'POD:', 'Size:']) near(r.at(s).y, 92, `${s} on the first line`);
        for (const s of ['Delivery Terms:', 'Packing:', 'Delivery Time:']) near(r.at(s).y, 96, `${s} on the second`);
        expect(r.draws.some(d => d.s === 'Origin:' || d.s === 'POL:' || d.s === 'Container Type:')).toBe(false);
    });

    it('PO: a long typed delivery time wraps beside its label and still ends at the margin', async () => {
        const { Pdf } = await pdf('pdfContract');
        const long = { ...PO, deltime: 'Within 45 days after receipt of the prepayment and the signed contract', isDeltimeText: true };
        const r = await draw(() => Pdf(long, PO_ROWS(), SETTINGS, COMP, false));
        const label = r.at('Delivery Time:');
        const lines = r.draws.filter(d => d.y >= label.y - 0.01 && d.y < label.y + 12 && d.left > label.right);
        expect(lines.length).toBeGreaterThan(1);
        for (const l of lines) {
            near(l.right, 200, `"${l.s}"`);
            expect(l.left).toBeGreaterThan(label.right + 1.9);
        }
    });

    it('PO footers: IMS lines centred on the page, GIS lines ending at the margin', async () => {
        const { Pdf } = await pdf('pdfContract');
        const ims = await draw(() => Pdf(PO, PO_ROWS(), SETTINGS, COMP, false));
        const band = ims.draws.filter(d => d.y > 262);
        expect(band.length).toBe(6);   // the two radioactive-material lines and the four company lines
        for (const d of band) near(centre(d), 105, `"${d.s.slice(0, 30)}"`);

        const gis = await draw(() => Pdf(PO, PO_ROWS(), SETTINGS, GIS_COMP, true));
        for (const d of gis.draws.filter(x => x.y > 275)) near(d.right, 200, `"${d.s.slice(0, 30)}"`);
        expect(inFrame(gis.draws)).toEqual([]);   // these ran out to 206 mm
    });

    it('Final Settlement: the order, the date and every invoice end at the margin; the title is centred', async () => {
        const { Pdf } = await pdf('pdfFinal');
        const data = [
            { id: 'l1', descriptionText: 'M-252 Blades', remark: '', qnty: 1.143, finalqnty: 1.143, unitPrcFinal: 9000, finaltotal: 10287, total: 10287, poInvoice: 'pi1', poInvoices: PO.poInvoices },
            { id: 'l2', descriptionText: 'Hast X engine parts', remark: '', qnty: 0.57, finalqnty: 0.57, unitPrcFinal: 10000, finaltotal: 5700, total: 5700, poInvoice: 'pi2', poInvoices: PO.poInvoices },
        ];
        const rows = data.map((d, i) => [i + 1, d.descriptionText, d.remark, String(d.qnty), String(d.finalqnty), '$9,000.00', '$10,287.00']);
        const r = await draw(() => Pdf(PO, rows, SETTINGS, COMP, data, false));
        near(r.table.left, 10, 'table left');
        near(r.table.right, 200, 'table right');
        for (const s of ['250626', '20260810', 'FVEH/00001/06/26/D']) near(r.at(s).right, 200, s);
        near(r.at('Invoices:').left, 138, 'Invoices label');
        near(centre(r.at('Final Settlement')), 105, 'title');
        expect(inFrame(r.draws)).toEqual([]);
    });

    it('Account statement: the table spans 10–200 and each total sits under the column it totals', async () => {
        const { PdfAccountStatement } = await pdf('pdfAccountStatement');
        const rows = [['1480', '15-Sep-26', '234,567.80', 'USD', '15-Oct-26', '100,000.00', '134,567.80']];
        const totals = [{ us: { amount: 1234567.8, paid: 1000000, notPaid: 234567.8 } }, { eu: { amount: 98765.43, paid: 0, notPaid: 98765.43 } }];
        const r = await draw(() => PdfAccountStatement(rows, SETTINGS, COMP, 'c1', totals, false));
        near(r.table.left, 10, 'table left');
        near(r.table.right, 200, 'table right');
        const col = (i) => 10 + (190 / 7) * (i + 0.5);
        // The totals are the last of each text drawn — the same figures can be in the rows above.
        const total = (s) => r.draws.filter(d => d.s === s).pop();
        near(centre(total('1,234,567.80')), col(2), 'Amount total');
        near(centre(total('1,000,000.00')), col(5), 'Paid total');
        near(centre(total('234,567.80')), col(6), 'Unpaid total');
        near(centre(total('USD')), col(3), 'currency');
        near(centre(r.draws.find(d => d.s.startsWith('ACCOUNT STATEMENT'))), 105, 'title');
    });

    it('a table with no rows keeps its columns — autoTable sized them by their headings', async () => {
        const { PdfAccountStatement } = await pdf('pdfAccountStatement');
        const totals = [{ us: { amount: 0, paid: 0, notPaid: 0 } }, { eu: { amount: 0, paid: 0, notPaid: 0 } }];
        const statement = await draw(() => PdfAccountStatement([], SETTINGS, COMP, 'c1', totals, false));
        statement.table.cols.forEach((w, i) => near(w, 190 / 7, `statement column ${i}`));

        const { Pdf } = await pdf('pdfContract');
        const po = await draw(() => Pdf(PO, [], SETTINGS, COMP, false));
        [15, 105, 35, 35].forEach((w, i) => near(po.table.cols[i], w, `PO column ${i}`));
    });

    it('Invoice: the table spans 10–200 and the number, date and weights end on its edge', async () => {
        const { Pdf } = await pdf('pdfInvoice');
        const inv = {
            invoice: 1480, invType: '1111', client: 'c1', dateRange: { startDate: '2026-10-05' }, shpType: 'sh1', origin: '', delTerm: 'd1',
            delDate: { startDate: null }, pol: '', pod: 'p2', packing: 'k1', ttlGross: '', ttlPackages: '', hs1: '', hs2: '', cur: 'us',
            bankNname: 'b1', percentage: 90, totalAmount: 94841.6, totalPrepayment: 85357.44, remarks: [],
            productsDataInvoice: [{ po: '26-4313', qnty: 16.357 }, { po: '', qnty: 16.347 }],
        };
        const rows = [[1, '26-4313', '30Ni 25Ti Turnings', '', '16.357', '$2,900.00', '$47,435.30'], [2, '', '30Ni 25Ti Turnings', '', '16.347', '$2,900.00', '$47,406.30']];
        const r = await draw(() => Pdf(inv, rows, SETTINGS, COMP, false));
        near(r.table.left, 10, 'table left');
        near(r.table.right, 200, 'table right');
        for (const s of ['1480', '05-Oct-2026', '26-4313', '32,704']) near(r.draws.find(d => d.s === s && d.y < 120).right, 200, s);
        near(r.at('Shipment:').y, 92, 'blocks start level');
        near(r.at('POD:').y, 92, 'blocks start level');
    });

    it('ISF: the form spans 10–200 and every word inside a box starts at one inset', async () => {
        const { PdfISF } = await pdf('pdfISF');
        const inv = {
            invoice: 1480, client: 'c1', origin: 'o1', pol: 'Singapore', dateRange: { startDate: '2026-10-05' },
            productsDataInvoice: [{ qnty: 16.357 }], isf: { shipmentType: 'FCL', blType: 'House', pod: 'Port of Houston', itemDescription: 'Nickel alloy scrap', htsCommodityCode: '7503.00.0000', email1: 'docs@client.com' },
        };
        const r = await draw(() => PdfISF(inv, COMP, SETTINGS, null));
        expect(inFrame(r.draws)).toEqual([]);
        const leftColumn = r.draws.filter(d => d.left < 18);   // left of the commodity table's 2nd column
        expect(leftColumn.length).toBeGreaterThan(20);
        expect([...new Set(leftColumn.map(d => d.left.toFixed(2)))]).toEqual(['11.50']);
    });

    it('Material tables: the table spans 10–200', async () => {
        const { TPdfTable } = await import('../app/(root)/materialtables/pdfTable.js');
        const { DEFAULT_ELEMENTS } = await import('../app/(root)/materialtables/constants.js');
        const row = (m, kg) => [m, kg, ...DEFAULT_ELEMENTS.map(() => '10.00')];
        for (const elems of [DEFAULT_ELEMENTS, DEFAULT_ELEMENTS.slice(0, 4)]) {
            const r = await draw(() => TPdfTable([row('Inconel 718 Turnings', '12,480'), row('', '12,480')], elems, 'Kgs'));
            near(r.table.left, 10, `${elems.length} elements: table left`);
            near(r.table.right, 200, `${elems.length} elements: table right`);
        }
    });
});
