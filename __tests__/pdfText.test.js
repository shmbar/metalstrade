import { describe, it, expect } from 'vitest';
import { pdfText, pdfRows } from '../app/(root)/contracts/modals/pdf/pdfText.js';

/* Invoice 1480 (client, 2026-10-05): the description was typed with extra spaces, which the
   browser hides and a PDF prints — and each line had been typed differently. */
describe('pdfText — what the screen shows is what prints', () => {
    it('the two lines of invoice 1480 print the same', () => {
        expect(pdfText('30Ni  25Ti  Turnings')).toBe('30Ni 25Ti Turnings');
        expect(pdfText('30Ni 25Ti   Turnings')).toBe('30Ni 25Ti Turnings');
    });

    it('stray spaces at the ends go — a client stored as "Solumet " named the file "…Solumet .pdf"', () => {
        expect(pdfText('Solumet ')).toBe('Solumet');
        expect(pdfText(' Ni55 Cr15 Mo4 Turnings')).toBe('Ni55 Cr15 Mo4 Turnings');
        expect(pdfText('19Ni 14.7Cr 1.15Mo 0.95W Ingots   ')).toBe('19Ni 14.7Cr 1.15Mo 0.95W Ingots');
    });

    it('tabs and no-break spaces pasted from a document are spaces too', () => {
        expect(pdfText('50Ni 17Cr\t2.8Mo Turnings')).toBe('50Ni 17Cr 2.8Mo Turnings');
        expect(pdfText('a   b')).toBe('a b');
    });

    it('line breaks stay: a remark or an address keeps its lines, each one tidied', () => {
        expect(pdfText('Line  one \n  Line   two')).toBe('Line one\nLine two');
        expect(pdfText('a\r\nb')).toBe('a\nb');
    });

    it('anything that is not text is left alone', () => {
        expect(pdfText(16.357)).toBe(16.357);
        expect(pdfText(null)).toBeNull();
        expect(pdfText(undefined)).toBeUndefined();
        expect(pdfText('')).toBe('');
    });
});

describe('pdfRows — a table body, cleaned cell by cell', () => {
    it('cleans every text cell and keeps numbers', () => {
        expect(pdfRows([[1, '26-4313', '30Ni  25Ti  Turnings', '', 16.357]])).toEqual([[1, '26-4313', '30Ni 25Ti Turnings', '', 16.357]]);
    });

    it('a totals row keeps the cells it leaves out', () => {
        // eslint-disable-next-line no-sparse-arrays
        const row = [, , , , 'Total  Amount:', , '$94,841.60'];
        const [out] = pdfRows([row]);
        expect(out.length).toBe(7);
        expect(0 in out).toBe(false);          // still a hole, not an "undefined" cell
        expect(out[4]).toBe('Total Amount:');
        expect(out[6]).toBe('$94,841.60');
    });

    it('does not touch the caller\'s rows, and passes anything else through', () => {
        const rows = [['a  b']];
        pdfRows(rows);
        expect(rows[0][0]).toBe('a  b');
        expect(pdfRows(undefined)).toBeUndefined();
        expect(pdfRows([{ content: 'x  y' }])).toEqual([{ content: 'x  y' }]);
    });
});
