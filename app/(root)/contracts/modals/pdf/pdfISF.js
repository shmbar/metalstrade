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

    const client = clts.find(z => z.id === valueInv.client);
    const seller = sups.find(s => s.id === (isf.seller || valueCon?.supplier));
    const shipTo = clts.find(c => c.id === (isf.shipTo || valueInv.client));
    const originLabel = origins.find(o => o.id === valueInv.origin)?.origin || '';

    const shipDate = valueInv.dateRange?.startDate
        ? dateFormat(new Date(valueInv.dateRange.startDate), 'dd mmm yyyy')
        : '';

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

    B(13); t('IMPORTER SECURITY FILING (ISF 10+2)', L + W / 2, 16, { align: 'center' });
    N(9); t('U.S. Customs and Border Protection', L + W / 2, 22, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.setDrawColor(3, 102, 174);
    doc.line(L, 27, R, 27);
    doc.setLineWidth(0.2);
    doc.setDrawColor(0);

    // ── FILING INFO BAR ───────────────────────────────────────────────────────
    doc.setFillColor(240, 248, 255);
    doc.rect(L, 30, W, 8, 'F');
    doc.rect(L, 30, W, 8);
    B(8);
    t('Filing Date: ', L + 2, 35.5);
    N(8); t(shipDate, L + 28, 35.5);
    B(8); t('Invoice #:', L + 80, 35.5);
    N(8); t(String(valueInv.invoice || ''), L + 100, 35.5);
    B(8); t('Status: DRAFT', L + 130, 35.5);

    // ── SECTION HELPER ────────────────────────────────────────────────────────
    let y = 44;
    const rowH = 10;

    const drawRow = (num, label, value, x = L, w = W) => {
        doc.setLineWidth(0.2);
        doc.rect(x, y, w, rowH);
        // Field number pill
        doc.setFillColor(3, 102, 174);
        doc.roundedRect(x + 2, y + 1.5, 7, 6, 1.5, 1.5, 'F');
        doc.setFont('CalB', 'bold'); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
        t(String(num), x + 5.5, y + 5.8, { align: 'center' });

        doc.setTextColor(0);
        B(7.5); t(label, x + 11, y + 4);
        N(8.5); t(String(value || '—'), x + 11, y + 8.5);
        y += rowH;
    };

    const drawHalfRow = (num1, label1, val1, num2, label2, val2) => {
        const hw = W / 2;
        drawRow(num1, label1, val1, L, hw);
        y -= rowH;
        drawRow(num2, label2, val2, L + hw, hw);
    };

    // ── IMPORTER-PROVIDED DATA ELEMENTS (fields 1-10) ─────────────────────────
    B(9); t('Importer-Provided Data Elements', L, y);
    y += 5;

    drawRow(1, 'Seller', seller?.nname || '');
    drawRow(2, 'Buyer (Importer)', compData.name || '');
    drawHalfRow(3, 'Importer of Record Number', isf.importerRecordNum, 4, 'Consignee Number', isf.consigneeNum);
    drawRow(5, 'Manufacturer / Supplier', seller?.nname || '');
    drawRow(6, 'Ship To Party', shipTo?.nname || '');
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
