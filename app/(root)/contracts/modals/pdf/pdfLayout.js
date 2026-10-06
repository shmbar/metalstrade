/* The grid the documents are drawn on. The PO, the invoice, the Final Settlement and the
   account statement all take their edges, columns and shared blocks from here, so a label,
   a figure or a table edge sits in the same place on every one of them.

   Client, 2026-10-06, after invoice 1480 was aligned: "same alignment on all other pdfs and
   docs, not only Inv — contract etc." Each generator had placed its text by eye at its own
   x, and few agreed even with themselves: a PO's table stopped at 195 mm under values that
   ran on to 200; a Final Settlement's PO number started at 185 while its invoice numbers
   ended at 200; footer lines meant to be centred sat up to 7 mm off the middle; and the GIS
   footer ran out to 206 mm, past the margin. The invoice's layout is the one the client
   approved, so it is the grid. */

export const LEFT = 10;                    // every left edge: blocks, tables, remarks, sign-off
export const RIGHT = 200;                  // every right edge: tables and right-aligned values
export const MIDDLE = 105;                 // the page's centre line: titles and footer lines
export const TABLE_WIDTH = RIGHT - LEFT;   // 190 — a table's columns add up to exactly this

const BLOCK_TOP = 92;   // the three blocks above a table start on one line…
const ROW = 4;          // …and step down together
const GAP = 2;          // the least room kept between a value and whatever is beside it

/* The three blocks above a table. Left and middle: label, then value at a set x, wrapped
   before the next block's labels. Right: labels in line with the company block, values
   ending at the margin, level with the table's edge. */
export const BLOCKS = {
    left: { label: LEFT, value: 35, room: 80 - 35 - GAP },
    middle: { label: 80, value: 95, room: 138 - 95 - GAP },
    right: { label: 138, value: RIGHT },
};

/* One block of label/value rows. It lists only the rows a document has, from the top down,
   so the three blocks line up row by row whatever is filled in — invoice 1480 printed
   Shipment on line 1, POD on line 2 and Delivery Terms on line 3 when it had no Origin or
   POL. A value too long for its room wraps onto the next line rather than run into what is
   beside it. Draws at the current font size; returns the y of the line below it. */
export const stack = (doc, rows, { label, value, room, top = BLOCK_TOP }) => {
    const rightAligned = value === RIGHT;
    let y = top;
    rows.filter(Boolean).forEach(([caption, text]) => {
        doc.setFont('PoppinsB', 'bold');
        doc.text(caption, label, y);
        const fits = rightAligned ? RIGHT - (label + doc.getTextWidth(caption) + GAP) : room;
        doc.setFont('Plus Jakarta Sans', 'normal');
        const lines = doc.splitTextToSize(String(text ?? ''), Math.max(fits, 10));
        lines.forEach((line, i) => doc.text(line, value, y + i * ROW, rightAligned ? { align: 'right' } : undefined));
        y += ROW * Math.max(1, lines.length);
    });
    return y;
};

/* Every table cell on the grid. For an autoTable didParseCell.
   · One horizontal inset, so a heading starts exactly above the values of its column: the
     header rows used 1 mm and the body 0.5, which put "Description" half a millimetre to the
     right of the descriptions under it. The vertical padding is what gives each band its
     height, and is as it was: 1 for the heading row, 0 for a units row under it, 0.5 for the
     body.
   · A heading cell takes its column's set width as well. autoTable applies columnStyles to
     the body only, so a table with no rows sized its columns by their headings instead —
     an account statement with nothing on it drew seven uneven columns over totals set
     under even ones. */
export const gridCell = (data) => {
    const padY = data.row.section === 'head' ? (data.row.index === 0 ? 1 : 0) : 0.5;
    data.cell.styles.cellPadding = { top: padY, bottom: padY, left: 1, right: 1 };
    const set = data.table.styles.columnStyles;
    const width = (set[data.column.dataKey] || set[data.column.index] || {}).cellWidth;
    if (typeof width === 'number') data.cell.styles.cellWidth = width;
};

// The logo, and the company's own block at the right-hand labels' x.
export const companyHeader = (doc, compData, gisAccount) => {
    gisAccount ?
        doc.addImage('/logo/gisLogo.jpg', "JPEG", 8, 10, 50, 25) :
        doc.addImage('/logo/logoIms.jpg', "JPEG", 10, 10, 50, 25);

    doc.setTextColor(32, 55, 100)
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(10);
    doc.text(compData.name, BLOCKS.right.label, 15)
    doc.setFontSize(9);
    doc.setFont('Plus Jakarta Sans', 'normal');
    doc.text(compData.street, BLOCKS.right.label, 21)
    doc.text(compData.city + ' ' + compData.zip, BLOCKS.right.label, 27)
    doc.text(compData.country, BLOCKS.right.label, 33)
};

/* The company band at the foot of a PO and a Final Settlement. IMS: four lines centred on
   the page — they were placed by eye at x = 82, 78, 64 and 70, which left them 1.5 to 7 mm
   off the middle and off each other. GIS: four lines right-aligned at the margin, where by
   eye they ended at 206 mm. */
export const companyBand = (doc, compData, gisAccount) => {
    if (gisAccount) {
        doc.addImage('/logo/gisFooter.jpg', "JPEG", 0, 272, 220, 26)
    } else {
        doc.setDrawColor(220, 220, 220);
        doc.line(LEFT, 272, RIGHT, 272);
        doc.setFillColor(9, 110, 182)
        doc.rect(0, 272, 220, 26, "F");
    }

    const address = compData.street + ' - ' + compData.city + ' ' + compData.zip + ' - ' + compData.country;
    doc.setTextColor(255, 255, 255)
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(9);
    if (gisAccount) {
        const at = { align: 'right' };
        doc.text(compData.name, RIGHT, 282, at)
        doc.setFont('Plus Jakarta Sans', 'normal');
        doc.text(address, RIGHT, 286, at);
        doc.text('Reg No. ' + compData.reg + ' - EORI No. ' + compData.eori, RIGHT, 290, at);
        doc.text(compData.website, RIGHT, 294, at);
    } else {
        const at = { align: 'center' };
        doc.text(compData.name, MIDDLE, 278, at)
        doc.setFontSize(8);
        doc.setFont('Plus Jakarta Sans', 'normal');
        doc.text(address, MIDDLE, 282, at);
        doc.text('Reg No. ' + compData.reg + ' - Vat No. ' + compData.vat + ' - EORI No. ' + compData.eori, MIDDLE, 286, at);
        doc.text(compData.email + ' - ' + compData.website, MIDDLE, 290, at);
    }
    doc.setTextColor(32, 55, 100)
};

/* The sign-off under a PO and a Final Settlement. Its two lines start at the left edge with
   everything else (they were at 12), and the radioactive-material clause is centred — its two
   lines had been placed by eye at 30 and 75, off the middle and off each other. */
export const signOff = (doc, compData, gisAccount) => {
    doc.setFont('Plus Jakarta Sans', 'normal');
    doc.setFontSize(7);
    doc.text(`Please make sure to put ${gisAccount ? 'GIS' : 'IMS'} Shipping - ${compData.email} in copy of all e-mails regarding Inquires/Purchase orders/Settlements and etc.`, LEFT, 236)
    doc.text('With kind regards,', LEFT, 242);

    gisAccount ? doc.addImage('logo/gisSignature.jpg', "JPEG", 10, 244, 40, 24)
        : doc.addImage('logo/imsSignatureNew.jpg', "JPEG", 10, 243, 33, 28);

    doc.setFontSize(6);
    doc.text('Any Radio Active materials detected within your load will be isolated and safely impounded and disposed of as per the regulations of the day laid down by the Government and all', MIDDLE, 267, { align: 'center' });
    doc.text('costs relating to its safe disposal shall be borne by the Supplier', MIDDLE, 270, { align: 'center' });
};
