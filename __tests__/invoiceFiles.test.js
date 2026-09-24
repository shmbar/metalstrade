import { describe, it, expect } from 'vitest';
import { invoiceKey, matchScore, pickInvoiceFile, nameForInvoice } from '../utils/invoiceFiles.js';

// PO 010926 (Thormet), exactly as its storage folder lists it — the folder the Cashflow
// preview showed invoice 146 from, whichever invoice was opened.
const folder = [
    { name: 'Invoice No. 146 dd. 08.09.2026 IMS Metals &  Alloy OU (1).pdf', url: 'u146', updated: '2026-09-10T12:48:27.798Z' },
    { name: 'Invoice No. 147 dd. 08.09.2026 IMS Metals &  Alloy OU (1)-2.pdf', url: 'u147new', updated: '2026-09-24T05:39:45.191Z' },
    { name: 'Invoice No. 147 dd. 08.09.2026 IMS Metals &  Alloy OU (1).pdf', url: 'u147old', updated: '2026-09-08T12:17:41.064Z' },
    { name: 'Rechnung Nr. 153 vom 17. September 2026 IMS.pdf', url: 'u153', updated: '2026-09-21T06:50:09.058Z' },
    { name: 'Rechnung Nr. 154 vom 17. September 2026 IMS.pdf', url: 'u154', updated: '2026-09-21T06:53:34.252Z' },
];

describe('which uploaded file is this supplier invoice — PO 010926', () => {
    it('opens each invoice’s own PDF, not the first in the folder', () => {
        expect(pickInvoiceFile(folder, '146').url).toBe('u146');
        expect(pickInvoiceFile(folder, '153').url).toBe('u153');
        expect(pickInvoiceFile(folder, '154').url).toBe('u154');
    });

    it('of two uploads of 147, the newer one — a re-upload is a correction', () => {
        expect(pickInvoiceFile(folder, '147').url).toBe('u147new');
    });

    it('shows nothing rather than another invoice’s PDF', () => {
        expect(pickInvoiceFile(folder, '148')).toBeNull();
        expect(pickInvoiceFile([], '147')).toBeNull();
    });
});

describe('reading an invoice number out of a file name', () => {
    it('takes the numbered part of the invoice reference', () => {
        expect(invoiceKey('496 ( Lobis)')).toBe('496');
        expect(invoiceKey('DSO2473 R88')).toBe('dso2473');
        expect(invoiceKey('0040 ')).toBe('40');
        expect(invoiceKey('')).toBe('');
    });

    it('does not read a date as an invoice number', () => {
        expect(matchScore('Invoice No. 146 dd. 08.09.2026.pdf', '2026')).toBe(0);
        expect(matchScore('Invoice No. 146 dd. 08.09.2026.pdf', '146')).toBe(2);
    });

    it('does not read a day of the month as a short invoice number', () => {
        // invoice 17 is not "…vom 17. September…"
        expect(matchScore('Rechnung Nr. 153 vom 17. September 2026 IMS.pdf', '17')).toBe(0);
        expect(matchScore('Invoice 71.pdf', '71')).toBe(2);
    });

    it('matches a number standing alone, and ignores leading zeros and case', () => {
        expect(matchScore('DSO2473 R88 Lobis.pdf', 'DSO2473 R88')).toBe(1);
        expect(matchScore('Invoice 40.pdf', '0040')).toBe(2);
        expect(matchScore('Invoice 1470.pdf', '147')).toBe(0);
    });

    it('names an upload so it finds its way back to its invoice', () => {
        expect(nameForInvoice('Invoice No. 147 dd. 08.09.2026.pdf', '147')).toBe('Invoice No. 147 dd. 08.09.2026.pdf');
        expect(nameForInvoice('scan_0001.pdf', '147')).toBe('Invoice 147 - scan_0001.pdf');
        expect(pickInvoiceFile([{ name: nameForInvoice('scan_0001.pdf', '147'), url: 'x' }], '147').url).toBe('x');
    });
});
