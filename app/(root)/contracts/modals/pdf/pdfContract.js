'use client'
// jsPDF + autotable load on demand so they stay out of the page's first-load
// bundle (same pattern as the exceljs excel exporters).
let jsPDF, autoTable;
const ensurePdfLibs = async () => {
    if (jsPDF) return;
    const [jspdfMod, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    jsPDF = jspdfMod.jsPDF;
    autoTable = autoTableMod.default;
};
import { getD } from '@utils/utils.js';
import dateFormat from "dateformat";
import { registerPdfFonts } from './pdfFonts';
import { pdfText, pdfRows } from './pdfText';
import { LEFT, RIGHT, TABLE_WIDTH, BLOCKS, stack, gridCell, companyHeader, companyBand, signOff } from './pdfLayout';



const showRemarks = (doc, startRemarksRow, valueCon, settings) => {
    if (valueCon.remarks.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks:', 10, startRemarksRow);

        doc.setFont('Plus Jakarta Sans', 'normal');
        for (let i = 0; i < valueCon.remarks.length; i++) {
            {
                valueCon.remarks[i].isRmrkText ?
                    doc.text(valueCon.remarks[i].rmrk,
                        10, startRemarksRow + 5 + i * 4)
                    :
                    doc.text(getD(settings.Remarks.Remarks, valueCon.remarks[i], 'rmrk'),
                        10, startRemarksRow + 5 + i * 4)

            }
            //  valueCon.remarks[i].rmrk, 10, startRemarksRow + 5 + i * 4);
        }
    }
}

const showPriceRemarks = (doc, startRemarkPricesRow, valueCon) => {
    if (valueCon.priceRemarks.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Price remarks:', 10, startRemarkPricesRow);

        doc.setFont('Plus Jakarta Sans', 'normal');
        for (let i = 0; i < valueCon.priceRemarks.length; i++) {
            doc.text(valueCon.priceRemarks[i].rmrk, 10, startRemarkPricesRow + 5 + i * 4);
        }
    }
}

/* `view` carries the unit/currency the caller already expressed arrTable in, when the
   products table's "View in" overlay is active — { qtyLabel: 'MT', curLabel: 'USD' }.
   Omitted (the normal case) the header keeps reading the contract's own stored
   labels, so nothing changes for a PO that is being read in the unit it was keyed in. */
export const Pdf = async (valueCon, arrTable, settings, compData, gisAccount, mode = 'save', view = undefined) => {
    await ensurePdfLibs();


    const sups = settings.Supplier.Supplier;
    const supp = sups.find(z => z.id === valueCon.supplier);

    var doc = new jsPDF();
    await registerPdfFonts(doc);   // real fonts, so Polish characters survive
    {
        gisAccount ?
            doc.addImage('/logo/gisBlur.jpg', "JPG", 135, 200, 70, 65) :
            doc.addImage('/logo/imsblur1.jpeg', "JPG", 88, 225, 120, 45)
    }

    //   doc.addFont("/fonts/Anon.ttf", "Anon", "normal");
    // doc.addFont("/fonts/Anon-bold.ttf", "AnonB", "bold");

    // On the grid every document shares (pdfLayout.js).
    const header = () => companyHeader(doc, compData, gisAccount);
    const footer = () => companyBand(doc, compData, gisAccount);
    header()
    footer();

    doc.setTextColor(25, 25, 112)
    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Supplier:', 10, 50);
    doc.setDrawColor(0, 0, 0); // draw red lines
    doc.line(10, 51, 20, 51); // horizontal line

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text(valueCon.supplier === '' ? '' :
        getD(sups, valueCon, 'supplier'), 10, 55);
    doc.setFont('Plus Jakarta Sans', 'normal');
    doc.setFontSize(8);
    if (valueCon.supplier !== '') {
        doc.text(supp.street, 10, 59);
        doc.text(supp.city, 10, 63);
        doc.text(supp.country, 10, 67);
        doc.text(supp.other1, 10, 71);
    }

    // The order and its date end at the margin, level with the table — they were left-aligned
    // at 168, so the right edge fell wherever the text stopped.
    doc.setFontSize(8);
    stack(doc, [
        ['Purchase Order No:', valueCon.order],
        ['Date:', valueCon.date === '' || valueCon.dateRange.startDate === null ? '' :
            dateFormat(valueCon.dateRange.startDate, 'dd-mmm-yyyy')],
    ], { ...BLOCKS.right, top: 50 });

    // From the left edge like every other line of text (it started at 35).
    doc.setFont('Plus Jakarta Sans', 'normal');
    doc.text('We confirm having purchased from you the following material subject to our Conditions of Purchase stated below:', LEFT, 84);

    /* The three blocks list only the fields this PO has, from the top down, as the invoice's
       do (pdfLayout.js stack). Every field owned a fixed line, so a PO with no Origin printed
       Delivery Terms on line 3, beside Packing and Delivery Time. Which fields print is as
       before. */
    stack(doc, [
        ['Shipment:', getD(settings.Shipment.Shipment, valueCon, 'shpType')],
        // 'empty' is the option that prints the heading with nothing beside it
        valueCon.origin !== '' && ['Origin:', valueCon.origin !== 'empty' ? getD(settings.Origin.Origin, valueCon, 'origin') : ''],
        valueCon.delTerm !== '' && ['Delivery Terms:', getD(settings['Delivery Terms']['Delivery Terms'], valueCon, 'delTerm')],
    ], BLOCKS.left);

    stack(doc, [
        valueCon.pol !== '' && ['POL:', getD(settings.POL.POL, valueCon, 'pol')],
        valueCon.pod !== '' && ['POD:', getD(settings.POD.POD, valueCon, 'pod')],
        valueCon.packing !== '' && ['Packing:', getD(settings.Packing.Packing, valueCon, 'packing')],
    ], BLOCKS.middle);

    stack(doc, [
        valueCon.contType !== '' && ['Container Type:', getD(settings['Container Type']['Container Type'], valueCon, 'contType')],
        valueCon.size !== '' && ['Size:', getD(settings.Size.Size, valueCon, 'size')],
        valueCon.deltime !== '' && ['Delivery Time:', valueCon.isDeltimeText ? valueCon.deltime :
            getD(settings['Delivery Time']['Delivery Time'], valueCon, 'deltime')],
    ], BLOCKS.right);

    // The terms start in the left block's value column (they were at 37, 2 mm off it) and
    // wrap at the margin.
    doc.setFont('PoppinsB', 'bold');
    doc.text('Payment Terms:', LEFT, 115);
    doc.setFont('Plus Jakarta Sans', 'normal');
    const tmp1 = doc.splitTextToSize(valueCon.isTermPmntText ? (valueCon.termPmnt || '') : getD(settings['Payment Terms']['Payment Terms'], valueCon, 'termPmnt'), RIGHT - BLOCKS.left.value, {})
    doc.text(tmp1, BLOCKS.left.value, 115);

    console.error = () => { };
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - TABLE_WIDTH) / 2;

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 125,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB', borderRadius: '10px' },
        bodyStyles: { fontSize: 8, font: 'Plus Jakarta Sans', textColor: [32, 55, 100] },
        head: [['#', 'Description', 'Quantity', valueCon.priceMode === 'content' ? 'Price per content' : 'Unit Price'],
        ['', '', `${view?.qtyLabel || (valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable'))}`,
            `${view?.curLabel || (valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur'))}`
        ]],
        // Cleaned before it is measured, so a cell is placed by the text it will show (pdfText.js).
        body: pdfRows(arrTable),
        /* The columns add up to the 190 mm between the margins. They added up to 185, so the
           table stopped 5 mm short of the margin every value above it now ends on; the
           5 mm went to Description. */
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 105, halign: 'left' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 35, halign: 'center' }
        },
        didParseCell: function (data) {
            if (data.row.index === 0 && data.column.index === 1 && data.row.section === 'head') {
                data.cell.styles.halign = 'left'
            }
            gridCell(data);
        }

    });

    let finalY = doc.lastAutoTable.finalY;

    let pageCount = doc.internal.getNumberOfPages();
    if (pageCount !== 1) {
        header();
        footer();
    }

    let startRemarksRow = finalY + 10;
    let RemarksBlock = valueCon.remarks.length > 0 ? 5 + (valueCon.remarks.length - 1) * 4 : 0;
    const PriceRemarksBlock = valueCon.priceRemarks.length > 0 ? 5 + (valueCon.priceRemarks.length - 1) * 4 : 0;

    const SignatureStart = 236
    const FootereStart = 267


    if (RemarksBlock !== 0 && PriceRemarksBlock === 0) {
        if (startRemarksRow + RemarksBlock + 5 <= SignatureStart) {
            showRemarks(doc, startRemarksRow, valueCon, settings)
        } else {
            doc.addPage('a4', '1')
            header();
            startRemarksRow = 50;
            showRemarks(doc, startRemarksRow, valueCon, settings)
            footer();
        }
    }

    if (RemarksBlock === 0 && PriceRemarksBlock !== 0) {
        if (startRemarksRow + PriceRemarksBlock + 5 <= SignatureStart) {
            showPriceRemarks(doc, startRemarksRow, valueCon)
        } else {
            doc.addPage('a4', '1')
            header();
            startRemarksRow = 50;
            showPriceRemarks(doc, startRemarksRow, valueCon)
            footer();
        }
    }



    if (RemarksBlock !== 0 && PriceRemarksBlock !== 0) {

        if (startRemarksRow + RemarksBlock + 10 + PriceRemarksBlock + 5 <= SignatureStart) {
            showRemarks(doc, startRemarksRow, valueCon, settings)
            let startRemarkPricesRow = startRemarksRow + RemarksBlock + 10;
            showPriceRemarks(doc, startRemarkPricesRow, valueCon)
        } else if (startRemarksRow + RemarksBlock + 5 <= FootereStart) { // RemarksBlock on first page PriceRemarksBlock on second page
            showRemarks(doc, startRemarksRow, valueCon, settings)
            doc.addPage('a4', '1')
            header();
            let startRemarkPricesRow = 50;
            showPriceRemarks(doc, startRemarkPricesRow, valueCon)
            footer();
        } else { // RemarksBlock on second page PriceRemarksBlock on second page
            doc.addPage('a4', '1')
            header();
            startRemarksRow = 50;
            showRemarks(doc, startRemarksRow, valueCon, settings)
            let startRemarkPricesRow = startRemarksRow + RemarksBlock + 10;
            showPriceRemarks(doc, startRemarkPricesRow, valueCon)
            footer();
        }




    }

    signOff(doc, compData, gisAccount)

    // pdfText, as the invoice's: a name stored with a trailing space named the file "PO_DMT _…".
    const filename = "PO_" + pdfText(supp.nname) + "_" + pdfText(valueCon.order) + ".pdf";
    // 'preview' → hand the caller a Blob to render in an in-app viewer (no download).
    // Default 'save' keeps the original behavior (download to the working directory).
    if (mode === 'preview') {
        return { blob: doc.output('blob'), filename };
    }
    doc.save(filename);

};