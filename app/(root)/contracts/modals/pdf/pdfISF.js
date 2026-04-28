'use client'
import { jsPDF } from 'jspdf';
import dateFormat from 'dateformat';

export const PdfISF = async (valueInv, compData, settings, valueCon) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.addFont('/fonts/Calibri.ttf', 'Cal', 'normal');
    doc.addFont('/fonts/Calibri-bold.ttf', 'CalB', 'bold');

    const isf = valueInv.isf ?? {};
    const clts = settings.Client?.Client ?? [];
    const sups = settings.Supplier?.Supplier ?? [];
    const origins = settings.Origin?.Origin ?? [];

    const seller = sups.find(s => s.id === (isf.seller || valueCon?.supplier));
    const shipTo = clts.find(c => c.id === (isf.shipTo || valueInv.client));
    const originLabel = origins.find(o => o.id === valueInv.origin)?.origin || '';

    const shipDate = valueInv.dateRange?.startDate
        ? dateFormat(new Date(valueInv.dateRange.startDate), 'dd mmm yyyy')
        : '';

    const addr = (obj) => [obj?.street, obj?.city, obj?.country].filter(Boolean).join(', ');
    const sellerAddr = addr(seller);
    const buyerAddr = addr({ street: compData.street, city: compData.city, country: compData.country });
    const shipToAddr = addr(shipTo);

    const L = 15;
    const W = 180;
    const R = L + W;

    doc.setDrawColor(0);
    doc.setTextColor(0);

    const B = (sz = 9) => { doc.setFont('CalB', 'bold'); doc.setFontSize(sz); };
    const N = (sz = 9) => { doc.setFont('Cal', 'normal'); doc.setFontSize(sz); };
    const t = (text, x, y, opts) => doc.text(String(text ?? ''), x, y, opts || {});

    // ── HEADER ────────────────────────────────────────────────────────────────
    doc.addImage('/logo/logoIms.jpg', 'JPEG', L, 10, 45, 22);

    B(13); t('IMPORTER SECURITY FILING (ISF 10+2)', L + W / 2, 18, { align: 'center' });
    N(9); t('U.S. Customs and Border Protection', L + W / 2, 25, { align: 'center' });

    // Blue divider — starts below logo bottom (logo ends at y=32)
    doc.setLineWidth(0.5);
    doc.setDrawColor(3, 102, 174);
    doc.line(L, 34, R, 34);
    doc.setLineWidth(0.2);
    doc.setDrawColor(0);

    // ── FILING INFO BAR ───────────────────────────────────────────────────────
    doc.setFillColor(240, 248, 255);
    doc.rect(L, 37, W, 8, 'F');
    doc.rect(L, 37, W, 8);
    B(8); t('Filing Date:', L + 2, 42.5);
    N(8); t(shipDate, L + 25, 42.5);
    B(8); t('Invoice #:', L + 65, 42.5);
    N(8); t(String(valueInv.invoice || ''), L + 82, 42.5);
    B(8); t('POL:', L + 110, 42.5);
    N(8); t(String(valueInv.pol || '—'), L + 120, 42.5);
    B(8); t('Status: DRAFT', L + 145, 42.5);

    // ── ROW HELPERS ───────────────────────────────────────────────────────────
    let y = 51;
    const rowH = 10;
    const partyH = 15;

    const pill = (num, x, boxY, h) => {
        doc.setFillColor(3, 102, 174);
        doc.roundedRect(x + 2, boxY + (h - 7) / 2, 7, 7, 1.5, 1.5, 'F');
        doc.setFont('CalB', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
        t(String(num), x + 5.5, boxY + (h - 7) / 2 + 5, { align: 'center' });
        doc.setTextColor(0);
    };

    // Standard single-line row
    const drawRow = (num, label, value, x = L, w = W) => {
        doc.setLineWidth(0.2);
        doc.rect(x, y, w, rowH);
        pill(num, x, y, rowH);
        B(7.5); t(label, x + 11, y + 4);
        N(8.5); t(String(value || '—'), x + 11, y + 8.5);
        y += rowH;
    };

    // Two-column half-width row
    const drawHalfRow = (num1, label1, val1, num2, label2, val2) => {
        const hw = W / 2;
        drawRow(num1, label1, val1, L, hw);
        y -= rowH;
        drawRow(num2, label2, val2, L + hw, hw);
    };

    // Party row: name + address on second line
    const drawPartyRow = (num, label, name, address) => {
        doc.setLineWidth(0.2);
        doc.rect(L, y, W, partyH);
        pill(num, L, y, partyH);
        B(7.5); t(label, L + 11, y + 4.5);
        N(8.5); t(String(name || '—'), L + 11, y + 9.5);
        if (address) {
            N(7); doc.setTextColor(80);
            const addrLine = doc.splitTextToSize(address, W - 14)[0] || '';
            t(addrLine, L + 11, y + 13.5);
            doc.setTextColor(0);
        }
        y += partyH;
    };

    // ── IMPORTER-PROVIDED DATA ELEMENTS (fields 1-10) ─────────────────────────
    B(9); t('Importer-Provided Data Elements', L, y); y += 5;

    drawPartyRow(1, 'Seller', seller?.nname || '', sellerAddr);
    drawPartyRow(2, 'Buyer (Importer)', compData.name || '', buyerAddr);
    drawHalfRow(3, 'Importer of Record Number', isf.importerRecordNum, 4, 'Consignee Number', isf.consigneeNum);
    drawPartyRow(5, 'Manufacturer / Supplier', seller?.nname || '', sellerAddr);
    drawPartyRow(6, 'Ship To Party', shipTo?.nname || '', shipToAddr);
    drawRow(7, 'Country of Origin', originLabel);
    drawRow(8, 'HTS-6 Commodity Code', isf.htsCommodityCode);
    drawRow(9, 'Container Stuffing Location', isf.containerStuffingLocation);
    drawRow(10, 'Consolidator (Stuffer)', isf.consolidator);

    // ── CARRIER-PROVIDED (reference only) ────────────────────────────────────
    y += 4;
    B(9); t('Carrier-Provided Data Elements (for reference)', L, y); y += 5;
    drawRow(11, 'Vessel Stow Plan', '(provided by carrier)');
    drawRow(12, 'Container Status Messages', '(provided by carrier)');

    // ── CERTIFICATION ─────────────────────────────────────────────────────────
    y += 6;
    doc.setFillColor(248, 251, 255);
    doc.rect(L, y, W, 22, 'F');
    doc.rect(L, y, W, 22);
    B(8); t('Certification', L + 2, y + 5);
    N(7.5);
    const cert = 'I certify that the information provided in this Importer Security Filing is true, accurate, and complete to the best of my knowledge.';
    const certLines = doc.splitTextToSize(cert, W - 4);
    certLines.forEach((line, i) => t(line, L + 2, y + 10 + i * 4));
    y += 26;

    N(8);
    t('Authorized Signature: ___________________________', L + 2, y);
    t('Date: _______________', L + 130, y);
    y += 6;
    t('Name: ' + (compData.contact || ''), L + 2, y);
    t('Title: _______________', L + 130, y);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.setFont('Cal', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100);
    t('This document is an internal ISF draft reference. Official ISF must be filed electronically via a licensed ABI filer at least 24 hours before vessel departure.',
        L + W / 2, 282, { align: 'center' });

    doc.save('ISF_Filing.pdf');
};
