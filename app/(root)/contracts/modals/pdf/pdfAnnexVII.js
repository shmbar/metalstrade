'use client'
import { jsPDF } from 'jspdf';
import dateFormat from 'dateformat';

export const PdfAnnexVII = async (valueInv, compData, settings) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.addFont('/fonts/Calibri.ttf', 'Cal', 'normal');
    doc.addFont('/fonts/Calibri-bold.ttf', 'CalB', 'bold');

    const clts = settings.Client?.Client ?? [];
    const client = clts.find(z => z.id === valueInv.client);
    const ax = valueInv.annexVII ?? {};

    // ── Layout constants ──────────────────────────────────────────────────────
    const L = 10;           // left margin
    const W = 190;          // content width
    const MID = L + W / 2; // 105  (left|right split)
    const T1 = L + W / 3;  // 73.33 (first third for carrier columns)
    const T2 = L + 2 * W / 3; // 136.67 (second third)
    const R = L + W;        // 200 (right edge)

    doc.setLineWidth(0.25);
    doc.setDrawColor(0);
    doc.setTextColor(0);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const B = (sz = 7) => { doc.setFont('CalB', 'bold'); doc.setFontSize(sz); };
    const N = (sz = 6.5) => { doc.setFont('Cal', 'normal'); doc.setFontSize(sz); };
    const t = (text, x, y, opts) => doc.text(String(text ?? ''), x, y, opts || {});
    const r = (x, y, w, h) => doc.rect(x, y, w, h);
    const ln = (x1, y1, x2, y2) => doc.line(x1, y1, x2, y2);

    // Wrap text and return next y
    const wrapN = (text, x, y, maxW, lh = 3.5) => {
        N();
        const lines = doc.splitTextToSize(String(text ?? ''), maxW);
        lines.forEach((l, i) => t(l, x, y + i * lh));
        return y + lines.length * lh;
    };

    // ── Y-axis breakpoints ────────────────────────────────────────────────────
    const Y = {
        title: 13,
        subtitle: 18,
        ci: 21,       // CONSIGNMENT INFO header
        s12: 26,      // Sections 1 & 2
        s34: 67,      // Sections 3 & 4
        s5: 77,       // Sections 5a/b/c
        cmplx: 114,   // Complex section start (6, 7, 8, 9, 10)
        s8r: 114,     // Section 8 (right col) — 11mm
        s9r: 125,     // Section 9 (right col) — 9mm
        s7r: 134,     // Section 7 (right col) — 24mm
        s10r: 158,    // Section 10 (right col) — 23mm
        ecmplx: 181,  // End of complex section
        s11: 181,     // Section 11 countries
        s12a: 198,    // Section 12 declaration
        s13: 216,     // Section 13 signature upon receipt
        tobe: 226,    // TO BE COMPLETED header
        s14: 231,     // Section 14
        fn: 242,      // Footnotes
    };

    const shipDate = valueInv.dateRange?.startDate
        ? dateFormat(new Date(valueInv.dateRange.startDate), 'dd.mm.yyyy')
        : '';

    // ── TITLE ─────────────────────────────────────────────────────────────────
    B(9.5);
    t('INFORMATION ACCOMPANYING SHIPMENTS OF WASTE', L + W / 2, Y.title, { align: 'center' });
    B(8.5);
    t('AS REFERRED TO IN ARTICLE 3(2) AND (4)', L + W / 2, Y.subtitle, { align: 'center' });

    // ── CONSIGNMENT INFO HEADER ───────────────────────────────────────────────
    r(L, Y.ci, W, 5);
    B(7.5);
    t('CONSIGNMENT INFORMATION (¹)', L + 1, Y.ci + 3.5);

    // ── SECTIONS 1 & 2 ───────────────────────────────────────────────────────
    const H12 = Y.s34 - Y.s12; // 41
    r(L, Y.s12, W / 2, H12);
    r(MID, Y.s12, W / 2, H12);

    // Section 1
    let ty = Y.s12 + 4;
    B(7); t('1. Person who arranges the shipment:', L + 1, ty);
    N(); ty += 4.5;
    t('Name: ' + (compData.name || ''), L + 1, ty); ty += 3.8;
    t('Adress: ' + (compData.street || ''), L + 1, ty); ty += 3.8;
    t('Contact person: ' + (compData.contact || ''), L + 1, ty); ty += 3.8;
    t('Tel.: ' + (compData.phone || '') + '    Fax: ' + (compData.fax || ''), L + 1, ty); ty += 3.8;
    t('E-Mail: ' + (compData.email || ''), L + 1, ty);

    // Section 2
    const clientCity = [client?.street, client?.city, client?.country].filter(Boolean).join(', ');
    ty = Y.s12 + 4;
    B(7); t('2. Importeur / Consignee:', MID + 1, ty);
    N(); ty += 4.5;
    t('Name: ' + (client?.nname || ''), MID + 1, ty); ty += 3.8;
    wrapN('Adress: ' + clientCity, MID + 1, ty, W / 2 - 3); ty += 7.6;
    t('Contact person: ' + (client?.poc || ''), MID + 1, ty); ty += 3.8;
    t('Tel.: ' + (client?.phone || '') + '    Fax: ' + (client?.fax || ''), MID + 1, ty); ty += 3.8;
    t('E-Mail: ' + (client?.email || ''), MID + 1, ty);

    // ── SECTIONS 3 & 4 ───────────────────────────────────────────────────────
    const H34 = Y.s5 - Y.s34; // 10
    r(L, Y.s34, W / 2, H34);
    r(MID, Y.s34, W / 2, H34);

    ty = Y.s34 + 4;
    B(7); t('3. Actual quantity:', L + 1, ty);
    N(); t('Tonnes (Mg): ' + (ax.quantityTonnes || ''), L + 1, ty + 4.5);
    t('m³: ' + (ax.quantityM3 || ''), L + 55, ty + 4.5);

    ty = Y.s34 + 4;
    B(7); t('4. Actual date of shipment: ' + shipDate, MID + 1, ty);

    // ── SECTIONS 5a / 5b / 5c ────────────────────────────────────────────────
    const H5 = Y.cmplx - Y.s5; // 37
    const cW = W / 3; // each carrier column width
    r(L, Y.s5, cW, H5);
    r(T1, Y.s5, cW, H5);
    r(T2, Y.s5, cW, H5);

    const drawCarrier = (label, cx, name, addr, contact, tel, fax, email, transport, trDate) => {
        const lh = 3;
        ty = Y.s5 + 4;
        B(7); t(label, cx + 1, ty);
        N(6.5); ty += 3.5;
        t('Name: ' + (name || ''), cx + 1, ty); ty += lh;
        // Address: single line only (columns are narrow — ~63 mm)
        const addrLine = doc.splitTextToSize('Adress: ' + (addr || ''), cW - 4)[0] || '';
        t(addrLine, cx + 1, ty); ty += lh;
        t('Contact person: ' + (contact || ''), cx + 1, ty); ty += lh;
        t('Tel.: ' + (tel || ''), cx + 1, ty); ty += lh;
        t('Fax: ' + (fax || ''), cx + 1, ty); ty += lh;
        t('E-Mail: ' + (email || ''), cx + 1, ty); ty += lh;
        t('Means of transport: ' + (transport || ''), cx + 1, ty); ty += lh;
        t('Date of transfer: ' + (trDate || ''), cx + 1, ty); ty += lh;
        t('Signature:', cx + 1, ty);
    };

    drawCarrier('5.(a) First Carrier (²)', L,
        ax.carrier1Name, ax.carrier1Address, ax.carrier1Contact,
        ax.carrier1Tel, ax.carrier1Fax, ax.carrier1Email,
        ax.carrier1Transport, ax.carrier1Date);

    drawCarrier('5.(b): Second Carrier', T1,
        ax.carrier2Name, ax.carrier2Address, ax.carrier2Contact,
        ax.carrier2Tel, ax.carrier2Fax, ax.carrier2Email,
        ax.carrier2Transport, ax.carrier2Date);

    drawCarrier('5.(c): 3. Third Carrier', T2, '', '', '', '', '', '', '', '');

    // ── COMPLEX SECTION: 6, 7, 8, 9, 10 ─────────────────────────────────────
    const Hcmplx = Y.ecmplx - Y.cmplx; // 67
    r(L, Y.cmplx, W / 2, Hcmplx); // Left col: section 6 full height

    // Right col internal horizontal dividers
    const rW = W / 2;
    r(MID, Y.s8r, rW, Y.s9r - Y.s8r);   // Section 8
    r(MID, Y.s9r, rW, Y.s7r - Y.s9r);   // Section 9
    r(MID, Y.s7r, rW, Y.s10r - Y.s7r);  // Section 7
    r(MID, Y.s10r, rW, Y.ecmplx - Y.s10r); // Section 10

    // Section 6: Waste generator (left col)
    ty = Y.cmplx + 4;
    B(7); t('6. Waste generator (³)', L + 1, ty);
    N(); ty += 3.5;
    t('Original producer(s), new producer(s) or collector:', L + 1, ty); ty += 4;
    t('Name: ' + (compData.name || ''), L + 1, ty); ty += 3.5;
    t('Adress: ' + (compData.street || ''), L + 1, ty); ty += 3.5;
    t('Fax: ' + (compData.fax || ''), L + 1, ty); ty += 3.5;
    t('Contact person: ' + (compData.contact || ''), L + 1, ty); ty += 3.5;
    t('Tel.: ' + (compData.phone || ''), L + 1, ty); ty += 3.5;
    t('E- Mail: ' + (compData.email || ''), L + 1, ty);

    // Section 8: Recovery operation (right col top)
    ty = Y.s8r + 3;
    B(6.5); t('8. Recovery operation (or if appropriate disposal operation in', MID + 1, ty);
    ty += 3.3; t('case of waste referred to in Article 3(4)):', MID + 1, ty);
    N(); ty += 3.3;
    t('R-code / D-code : ' + (ax.rDCode || ''), MID + 1, ty);

    // Section 9: Waste description (right col)
    ty = Y.s9r + 3.5;
    B(7); t('9. Usual description of the waste:', MID + 1, ty);
    N(); ty += 4;
    t(ax.wasteDescription || '', MID + 1, ty);

    // Section 7: Recovery facility (right col) — 24 mm, use 3 mm lh to fit
    ty = Y.s7r + 3;
    B(7); t('7. Recovery facility □    Laboratory □', MID + 1, ty);
    N(6.5); ty += 3.5;
    t('Name: ' + (client?.nname || ''), MID + 1, ty); ty += 3;
    // Address: max 2 lines
    const s7AddrLines = doc.splitTextToSize('Adress: ' + clientCity, rW - 4).slice(0, 2);
    s7AddrLines.forEach((l, i) => t(l, MID + 1, ty + i * 3));
    ty += s7AddrLines.length * 3;
    t('Contact person: ' + (client?.poc || ''), MID + 1, ty); ty += 3;
    t('Tel.: ' + (client?.phone || '') + '    Fax: ' + (client?.fax || ''), MID + 1, ty); ty += 3;
    t('E-Mail: ' + (client?.email || ''), MID + 1, ty);

    // Section 10: Waste identification codes (right col bottom) — 23 mm, use 6 pt + 2.5 mm lh
    ty = Y.s10r + 3;
    B(6.5); t('10. Waste identification (fill in relevant codes):', MID + 1, ty);
    N(6); ty += 3.5;
    const codes = [
        'i) Basel Annex IX :    ' + (ax.baselCode || ''),
        'ii) OECD (if different from (i)): ' + (ax.oecdCode || ''),
        'iii) Annex IIIA (⁴): ' + (ax.annexIIIACode || ''),
        'iv) Annex IIIB (⁵): ' + (ax.annexIIIBCode || ''),
        'v) EU list of wastes: ' + (ax.euCode || ''),
        'vi) National code: ' + (ax.nationalCode || ''),
        'vii) Other (please specify): ' + (ax.otherCode || ''),
    ];
    codes.forEach((c, i) => t(c, MID + 1, ty + i * 2.5));

    // ── SECTION 11: Countries ─────────────────────────────────────────────────
    const H11 = Y.s12a - Y.s11; // 17
    r(L, Y.s11, W, H11);
    // Sub-dividers: three columns for Export / Transit / Import
    ln(T1, Y.s11 + 7, T1, Y.s11 + H11);
    ln(T2, Y.s11 + 7, T2, Y.s11 + H11);
    ln(L, Y.s11 + 7, R, Y.s11 + 7);

    ty = Y.s11 + 4;
    B(7); t('11. Countries / State(s) concerned:', L + 1, ty);
    // Column headers drawn 3 mm below the horizontal divider (s11+7) to avoid the border line cutting through text
    N(); ty = Y.s11 + 11;
    t('Export / Dispatch', L + 1, ty);
    t('Transit', T1 + 1, ty);
    t('Import / Destination', T2 + 1, ty);
    ty += 4;
    t(ax.exportCountry || '', L + 1, ty);
    t(ax.transitCountry || '', T1 + 1, ty);
    t(ax.importCountry || '', T2 + 1, ty);

    // ── SECTION 12: Declaration ───────────────────────────────────────────────
    const H12a = Y.s13 - Y.s12a; // 18
    r(L, Y.s12a, W, H12a);

    ty = Y.s12a + 3.5;
    B(6.5);
    const decl = '12. Declaration of the person who arranges the shipment: I certify that the above information is complete and correct to my best';
    t(decl, L + 1, ty); ty += 3.5;
    const decl2 = 'knowledge. I also certify that legally-binding written contractual obligations have been entered into with the consignee (not required';
    t(decl2, L + 1, ty); ty += 3.5;
    t('in case of waste referred to in Article 3(4)):', L + 1, ty);
    N(); ty += 5;
    t('Name: ' + (compData.contact || ''), L + 1, ty);
    t('Date: ' + shipDate, L + 65, ty);
    t('Signature:', L + 130, ty);

    // ── SECTION 13: Signature upon receipt ───────────────────────────────────
    const H13 = Y.tobe - Y.s13; // 10
    r(L, Y.s13, W, H13);
    ty = Y.s13 + 4;
    B(7); t('13. Signature upon receipt of the waste by the consignee:', L + 1, ty);
    N(); ty += 4.5;
    t('Name:', L + 1, ty);
    t('Date:', L + 65, ty);
    t('Signature:', L + 130, ty);

    // ── TO BE COMPLETED HEADER ────────────────────────────────────────────────
    r(L, Y.tobe, W, 5);
    B(7.5);
    t('TO BE COMPLETED BY THE RECOVERY FACILITY OR BY THE LABORATORY:', L + W / 2, Y.tobe + 3.5, { align: 'center' });

    // ── SECTION 14 ────────────────────────────────────────────────────────────
    const H14 = Y.fn - Y.tobe - 5;
    r(L, Y.tobe + 5, W, H14);
    ln(MID, Y.tobe + 5, MID, Y.fn);

    ty = Y.tobe + 9;
    B(7);
    t('14. Shipment', L + 1, ty);
    N(6.5);
    t('received at recovery facility: □', L + 23, ty); ty += 4;
    t('or laboratory: □', L + 23, ty);

    ty = Y.tobe + 9;
    t('Quantity received: Tonnes (Mg):', MID + 1, ty); ty += 4;
    t('m³:', MID + 1, ty);

    ty = Y.fn - 3;
    t('Name:', L + 1, ty);
    t('Date:', L + 65, ty);
    t('Signature:', L + 130, ty);

    // ── FOOTNOTES ─────────────────────────────────────────────────────────────
    doc.setFont('Cal', 'normal');
    doc.setFontSize(5);
    const notes = [
        '(¹) Information accompanying shipments of green listed waste and destined for recovery of waste destined for laboratory analysis pursuant to Regulation (EC) No 1013/2006. For',
        '       completing this document, see also the corresponding specific instructions as contained in Annex IC of Regulation (EC) No 1013/2006.',
        '(²) If more than 3 carriers, attach information as required in blocks 5 (a), (b), (c).',
        '(³) When the person who arranges the shipment is not the producer or collector, information about the producer or collector shall be provided.',
        '(⁴) The relevant code(s) as indicated in Annex IIIA to Regulation (EC) No 1013/2006 are to be used, as appropriate in sequence.',
        '(⁵) The BEU codes listed in Annex IIIB to Regulation (EC) No 1013/2006 are to be used.',
    ];
    notes.forEach((note, i) => t(note, L, Y.fn + 2 + i * 3.5));

    doc.save('Annex_VII.pdf');
};
