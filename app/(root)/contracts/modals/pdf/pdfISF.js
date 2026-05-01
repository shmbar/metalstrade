'use client'
import { jsPDF } from 'jspdf';
import dateFormat from 'dateformat';

export const PdfISF = async (valueInv, compData, settings, _valueCon) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.addFont('/fonts/Calibri.ttf', 'Cal', 'normal');
    doc.addFont('/fonts/Calibri-bold.ttf', 'CalB', 'bold');

    const isf = valueInv.isf ?? {};
    const clts = settings.Client?.Client ?? [];
    const origins = settings.Origin?.Origin ?? [];

    const shipTo = clts.find(c => c.id === (isf.shipTo || valueInv.client));
    const originLabel = origins.find(o => o.id === valueInv.origin)?.origin || '';

    const etdDate = valueInv.dateRange?.startDate
        ? dateFormat(new Date(valueInv.dateRange.startDate), 'dd mmm yyyy')
        : '';

    const L = 15;
    const W = 180;
    const R = L + W;
    const HW = W / 2;

    doc.setDrawColor(0);
    doc.setTextColor(0);
    doc.setLineWidth(0.2);

    const B = (sz = 8) => { doc.setFont('CalB', 'bold'); doc.setFontSize(sz); };
    const N = (sz = 8) => { doc.setFont('Cal', 'normal'); doc.setFontSize(sz); };
    const t = (text, x, y, opts) => doc.text(String(text ?? ''), x, y, opts || {});
    const r = (x, y, w, h, style) => doc.rect(x, y, w, h, style);

    // Checkbox: small square, filled if checked
    const cb = (x, y, checked = false) => {
        doc.setLineWidth(0.3);
        r(x, y, 3.3, 3.3);
        doc.setLineWidth(0.2);
        if (checked) {
            doc.setFillColor(30, 30, 30);
            r(x + 0.6, y + 0.6, 2.1, 2.1, 'F');
            doc.setFillColor(255, 255, 255);
        }
    };

    // Shaded part header bar
    const partHeader = (label, y) => {
        doc.setFillColor(190, 215, 240);
        r(L, y, W, 5.5, 'FD');
        B(8); doc.setTextColor(20, 20, 80);
        t(label, L + 2, y + 4);
        doc.setTextColor(0);
        return y + 5.5;
    };

    // ── HEADER ────────────────────────────────────────────────────────────────
    const gisAccount = compData.logolink?.includes('gis');

    B(13); doc.setTextColor(20, 20, 80);
    t('Declaration for IMPORTER SECURITY FILING (ISF)', L + W / 2, 12, { align: 'center' });
    N(8); doc.setTextColor(60);
    t('U.S. Customs and Border Protection — CBP', L + W / 2, 18, { align: 'center' });
    doc.setTextColor(0);

    // ISF Importer Company row
    doc.setFillColor(225, 240, 255);
    r(L, 21, W, 8, 'F');
    r(L, 21, W, 8);
    B(7); t('ISF Importer Company Name:', L + 2, 26);
    N(8.5); t(shipTo?.nname || '', L + 58, 26);
    B(7); t('Invoice #:', R - 48, 26);
    N(8.5); t(String(valueInv.invoice || ''), R - 28, 26);

    let y = 29;

    // ── PART I — ISF DATA ─────────────────────────────────────────────────────
    y = partHeader('PART I — ISF DATA', y);

    // Shipment Type + Container
    const rH1 = 9;
    r(L, y, W * 0.62, rH1);
    r(L + W * 0.62, y, W * 0.38, rH1);
    B(6.5); t('1. Shipment Type:', L + 1, y + 4);
    N(7.5);
    const st = isf.shipmentType || '';
    cb(L + 32, y + 2.7, st === 'FCL'); t('FCL', L + 36, y + 5.8);
    cb(L + 47, y + 2.7, st === 'LCL'); t('LCL', L + 51, y + 5.8);
    cb(L + 62, y + 2.7, st === 'BULK'); t('BULK', L + 66, y + 5.8);
    cb(L + 80, y + 2.7, st === 'CONSOL'); t('CONSOL', L + 84, y + 5.8);
    const cx = L + W * 0.62 + 2;
    B(6.5); t('2. Container:', cx, y + 4);
    N(7.5);
    cb(cx + 20, y + 2.7, true); t('Yes', cx + 24.2, y + 5.8);
    cb(cx + 35, y + 2.7, false); t('No', cx + 39.2, y + 5.8);
    y += rH1;

    // Filing Type
    const rH2 = 8;
    r(L, y, W, rH2);
    B(6.5); t('3. Filing Type:', L + 1, y + 3.5);
    N(7.5);
    cb(L + 27, y + 2.2, true); t('10+2 ISF', L + 31.2, y + 5.5);
    cb(L + 54, y + 2.2, false); t('5+2 ISF', L + 58.2, y + 5.5);
    y += rH2;

    // POL | POD
    const rH3 = 8;
    r(L, y, HW, rH3); r(L + HW, y, HW, rH3);
    B(6.5); t('4. Place of Loading (POL):', L + 1, y + 3.2);
    N(8); t(String(valueInv.pol || ''), L + 1, y + rH3 - 1.2);
    B(6.5); t('5. 1st Port of Call / Port of Discharge:', L + HW + 1, y + 3.2);
    N(8); t(String(isf.pod || ''), L + HW + 1, y + rH3 - 1.2);
    y += rH3;

    // ETD | ETA
    r(L, y, HW, rH3); r(L + HW, y, HW, rH3);
    B(6.5); t('6. ETD (Estimated Time of Departure):', L + 1, y + 3.2);
    N(8); t(etdDate, L + 1, y + rH3 - 1.2);
    B(6.5); t('7. ETA (Estimated Time of Arrival):', L + HW + 1, y + 3.2);
    N(8); t(String(isf.eta || ''), L + HW + 1, y + rH3 - 1.2);
    y += rH3;

    // Importer Ref # | Carnet #
    r(L, y, HW, rH3); r(L + HW, y, HW, rH3);
    B(6.5); t('8. Importer Reference #:', L + 1, y + 3.2);
    N(8); t(String(isf.importerRecordNum || ''), L + 1, y + rH3 - 1.2);
    B(6.5); t('9. Carnet #:', L + HW + 1, y + 3.2);
    N(8); t(String(isf.carnetNum || ''), L + HW + 1, y + rH3 - 1.2);
    y += rH3;

    // ── PART II — B/L DATA ────────────────────────────────────────────────────
    y = partHeader('PART II — B/L DATA', y);

    // SCAC | BL Number
    r(L, y, HW, rH3); r(L + HW, y, HW, rH3);
    B(6.5); t('10. SCAC Code:', L + 1, y + 3.2);
    N(8); t(String(isf.blScac || ''), L + 1, y + rH3 - 1.2);
    B(6.5); t('Bill of Lading Number:', L + HW + 1, y + 3.2);
    N(8); t(String(isf.blNum || ''), L + HW + 1, y + rH3 - 1.2);
    y += rH3;

    // BL Type checkboxes
    r(L, y, W, rH1);
    B(6.5); t('11. B/L Type:', L + 1, y + 4);
    N(7.5);
    const blt = isf.blType || '';
    cb(L + 25, y + 2.7, blt === 'House'); t('House B/L', L + 29.2, y + 5.8);
    cb(L + 58, y + 2.7, blt === 'Straight'); t('Straight B/L', L + 62.2, y + 5.8);
    cb(L + 93, y + 2.7, blt === 'Telex'); t('Telex Release', L + 97.2, y + 5.8);
    cb(L + 130, y + 2.7, blt === 'Waybill'); t('Sea Waybill', L + 134.2, y + 5.8);
    y += rH1;

    // ── PART III — PARTY DATA ─────────────────────────────────────────────────
    y = partHeader('PART III — PARTY DATA', y);

    // IDs row (3 equal columns)
    const TW = W / 3;
    r(L, y, TW, rH3); r(L + TW, y, TW, rH3); r(L + 2 * TW, y, TW, rH3);
    B(6.5); t('12. ISF Importer ID:', L + 1, y + 3.2);
    N(8); t(String(isf.isfImporterId || ''), L + 1, y + rH3 - 1.2);
    B(6.5); t('13. Consignee ID:', L + TW + 1, y + 3.2);
    N(8); t(String(isf.consigneeNum || ''), L + TW + 1, y + rH3 - 1.2);
    B(6.5); t('14. IOR ID:', L + 2 * TW + 1, y + 3.2);
    N(8); t(String(isf.iorId || ''), L + 2 * TW + 1, y + rH3 - 1.2);
    y += rH3;

    // Address block helper (2-column grid)
    const BH = 27;
    const BW = HW;

    const compAddr1 = compData.street || '';
    const compAddr2 = [compData.city, compData.zip].filter(Boolean).join(', ');
    const shipAddr1 = shipTo?.street || '';
    const shipAddr2 = [shipTo?.city, shipTo?.zip].filter(Boolean).join(', ');

    const addrBlock = (num, label, name, a1, a2, country, sameAs, bx, by) => {
        r(bx, by, BW, BH);
        doc.setFillColor(230, 242, 253);
        r(bx, by, BW, 5.5, 'F');
        B(6.5); doc.setTextColor(20, 20, 80);
        t(`${num}. ${label}`, bx + 1.5, by + 4);
        doc.setTextColor(0);
        if (sameAs) {
            cb(bx + BW - 34, by + 1.1, true);
            N(6.2); doc.setTextColor(50);
            t(`Same as ${sameAs}`, bx + BW - 30, by + 4);
            doc.setTextColor(0);
        }
        N(7.5);
        t(String(name || ''), bx + 1.5, by + 10.5);
        t(String(a1 || ''), bx + 1.5, by + 15.5);
        t(String(a2 || ''), bx + 1.5, by + 20);
        N(7); doc.setTextColor(70);
        t(String(country || ''), bx + 1.5, by + 25);
        doc.setTextColor(0);
    };

    // Row 1: 16 Seller (our company) | 17 Buyer (client)
    addrBlock(16, 'Seller', compData.name, compAddr1, compAddr2, compData.country, null, L, y);
    addrBlock(17, 'Buyer', shipTo?.nname, shipAddr1, shipAddr2, shipTo?.country, null, L + HW, y);
    y += BH;

    // Row 2: 18 Consolidator (Same as Seller) | 19 Container Stuffing (Same as Consolidator)
    addrBlock(18, 'Consolidator', '', '', '', '', 'Seller', L, y);
    addrBlock(19, 'Container Stuffing Location', '', '', '', '', 'Consolidator', L + HW, y);
    y += BH;

    // Row 3: 20 Manufacturer (Same as Seller) | 21 Ship To (client)
    addrBlock(20, 'Manufacturer / Supplier', '', '', '', '', 'Seller', L, y);
    addrBlock(21, 'Ship To', shipTo?.nname, shipAddr1, shipAddr2, shipTo?.country, null, L + HW, y);
    y += BH;

    // ── PART IV — COMMODITY DATA ──────────────────────────────────────────────
    y = partHeader('PART IV — INVOICE / COMMODITY DATA', y);

    // Table columns: # | Item Description | HTS Tariff Code | Qty | Unit | Country of Origin
    const cols = [8, 64, 36, 20, 15, 37];
    const colX = cols.reduce((acc, w, i) => {
        acc.push(i === 0 ? L : acc[i - 1] + cols[i - 1]);
        return acc;
    }, []);

    // Table header
    doc.setFillColor(210, 230, 248);
    r(L, y, W, 7, 'FD');
    B(6.5); doc.setTextColor(20, 20, 80);
    const hdrs = ['#', 'Item Description', 'HTS Tariff Code (10)', 'Qty', 'Unit', 'Country of Origin'];
    hdrs.forEach((h, i) => t(h, colX[i] + 1, y + 5));
    doc.setTextColor(0);
    y += 7;

    // Table row 1
    const rowH = 11;
    r(L, y, W, rowH);
    cols.forEach((_w, i) => { if (i > 0) doc.line(colX[i], y, colX[i], y + rowH); });
    N(8);
    const products = valueInv.productsDataInvoice?.filter(p => p.qnty !== 's') ?? [];
    const totalQty = products.reduce((s, p) => s + (parseFloat(p.qnty) || 0), 0);
    t('1', colX[0] + 2, y + 7);
    // Item description may be long — truncate if needed
    const descText = String(isf.itemDescription || '');
    const descLines = doc.splitTextToSize(descText, cols[1] - 3);
    N(7.5);
    descLines.slice(0, 2).forEach((line, i) => t(line, colX[1] + 1, y + 4.5 + i * 3.8));
    N(8);
    t(String(isf.htsCommodityCode || ''), colX[2] + 1, y + 7);
    t(totalQty > 0 ? totalQty.toFixed(3) : '', colX[3] + 1, y + 7);
    t('MT', colX[4] + 1, y + 7);
    t(originLabel, colX[5] + 1, y + 7);
    y += rowH;

    // ── PART V — NOTIFICATION & CERTIFICATION ─────────────────────────────────
    y = partHeader('PART V — NOTIFICATION EMAILS & CERTIFICATION', y);

    // Email row
    r(L, y, HW, rH3); r(L + HW, y, HW, rH3);
    B(6.5); t('Email Address 1:', L + 1, y + 3.2);
    N(8); t(String(isf.email1 || ''), L + 1, y + rH3 - 1.2);
    B(6.5); t('Email Address 2:', L + HW + 1, y + 3.2);
    N(8); t(String(isf.email2 || ''), L + HW + 1, y + rH3 - 1.2);
    y += rH3;

    // Certification
    const certText = 'I certify that the information provided in this Importer Security Filing declaration is accurate and complete to the best of my knowledge and belief, and that all information required to be provided has been provided to the best of my ability.';
    doc.setFillColor(248, 252, 255);
    r(L, y, W, 15, 'FD');
    N(7);
    const certLines = doc.splitTextToSize(certText, W - 4);
    certLines.forEach((line, i) => t(line, L + 2, y + 5 + i * 3.7));
    y += 15;

    // Signature row — 3 columns: Name | Date | Authorized Signature
    const sigH = 16;
    r(L, y, W, sigH);
    // vertical dividers
    doc.line(L + W * 0.35, y, L + W * 0.35, y + sigH);
    doc.line(L + W * 0.65, y, L + W * 0.65, y + sigH);

    // Name column
    B(6.5); t('Name:', L + 2, y + 4.5);
    N(8); t(compData.contact || '', L + 2, y + 10);
    B(6.5); t('Company:', L + 2, y + 14.5);

    // Date column
    B(6.5); t('Date:', L + W * 0.35 + 2, y + 4.5);
    N(8); t(etdDate, L + W * 0.35 + 2, y + 10);

    // Authorized Signature column
    B(6.5); t('Authorized Signature:', L + W * 0.65 + 2, y + 4.5);
    try {
        gisAccount
            ? doc.addImage('logo/gisSignature.jpg', 'JPEG', L + W * 0.65 + 2, y + 5.5, 50, 9)
            : doc.addImage('logo/imsSignatureNew.jpg', 'JPEG', L + W * 0.65 + 2, y + 5.5, 50, 9);
    } catch (_) {
        N(8); t('________________________________', L + W * 0.65 + 2, y + 13);
    }

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.setFont('Cal', 'normal'); doc.setFontSize(6); doc.setTextColor(110);
    t('Official ISF must be filed electronically via a licensed ABI filer at least 24 hours before laden vessel departure.',
        L + W / 2, 289, { align: 'center' });

    doc.save('ISF_Declaration.pdf');
};
