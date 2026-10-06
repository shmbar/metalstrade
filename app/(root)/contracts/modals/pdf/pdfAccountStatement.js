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
import { LEFT, RIGHT, MIDDLE, TABLE_WIDTH, gridCell, companyHeader } from './pdfLayout';


let showAmountInv = (x) => {

    return x === 0 ? '0' : new Intl.NumberFormat('en-US', {
        //   style: 'currency',
        //    currency: x.row?.original?.final ? x.row.original?.cur?.cur || 'USD' : x.row?.original?.cur,
        minimumFractionDigits: 2
    }).format(x)
}

export const PdfAccountStatement = async (arrTable, settings, compData, client, totals, gisAccount) => {
    await ensurePdfLibs();


    const clts = settings.Client.Client;
    const clnt = clts.find(z => z.id === client);


    var doc = new jsPDF();
    await registerPdfFonts(doc);   // real fonts, so Polish characters survive

    //   doc.addFont("/fonts/Anon.ttf", "Anon", "normal");
    // doc.addFont("/fonts/Anon-bold.ttf", "AnonB", "bold");

    // On the grid every document shares (pdfLayout.js).
    const header = () => companyHeader(doc, compData, gisAccount);

    // Centred on the page — the lines had been placed by eye at x = 82, 78, 64 and 70.
    const footer = () => {
        doc.setDrawColor(220, 220, 220);
        doc.line(LEFT, 272, RIGHT, 272);
        const at = { align: 'center' };
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(9);
        doc.text(compData.name, MIDDLE, 276, at)
        doc.setFontSize(8);
        doc.setFont('Plus Jakarta Sans', 'normal');
        doc.text(compData.street + ' - ' + compData.city + ' ' + compData.zip +
            ' - ' + compData.country, MIDDLE, 280, at);
        doc.text('Reg No. ' + compData.reg + ' - Vat No. ' + compData.vat +
            ' - EORI No. ' + compData.eori, MIDDLE, 284, at);
        doc.text(compData.email + ' - ' + compData.website, MIDDLE, 288, at);
    }
    header()
    // footer();

    doc.setFontSize(10);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Debtor:', 10, 50);
    //  doc.setDrawColor(0, 0, 0); // draw red lines
    //  doc.line(10, 51, 20, 51); // horizontal line
    if (clnt) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text(clnt?.client, 25, 50);
        doc.setFont('Plus Jakarta Sans', 'normal');
        doc.setFontSize(8);

        doc.text(clnt?.street, 25, 55);
        doc.text(clnt?.city, 25, 60);
        doc.text(clnt?.country, 25, 65);
        doc.text(clnt?.other1, 25, 70);
    }


    // One title, centred on the page — the words and the date were placed by eye at 70 and
    // 112, which left the pair 5 mm left of the middle.
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text(`ACCOUNT STATEMENT ${dateFormat(new Date(), "dd-mmm-yy")}`, MIDDLE, 80, { align: 'center' });

    console.error = () => { };
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - TABLE_WIDTH) / 2;
    // Seven equal columns across the full 190 mm. They were 27 mm each, 189 in all, so the
    // table stopped 1 mm short of the rule drawn under it.
    const colW = TABLE_WIDTH / 7;

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 83,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Plus Jakarta Sans', textColor: [32, 55, 100] },
        head: [['Invoice', 'Date', 'Amount', 'Currency', 'Due Payment', 'Paid', 'Unpaid'],
            // ['', '', `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            //     `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`
            // ]
        ],
        // Cleaned before it is measured, so a cell is placed by the text it will show (pdfText.js).
        body: pdfRows(arrTable),
        columnStyles: {
            0: { cellWidth: colW, halign: 'center' },
            1: { cellWidth: colW, halign: 'left' },
            2: { cellWidth: colW, halign: 'center' },
            3: { cellWidth: colW, halign: 'center' },
            4: { cellWidth: colW, halign: 'center' },
            5: { cellWidth: colW, halign: 'center' },
            6: { cellWidth: colW, halign: 'center' }

        },
        didParseCell: function (data) {
            if (data.row.index === 0 && data.column.index === 1 && data.row.section === 'head') {
                data.cell.styles.halign = 'left'
            }
            gridCell(data);
        }

    });

    let finalY = doc.lastAutoTable.finalY;
    let line = finalY + 2
    doc.setDrawColor(50, 50, 50);
    doc.line(LEFT, line, RIGHT, line);


    let totalLine = line + 6

    /* Each total sits centred under the column it totals, the currencies under Currency.
       They were at x = 80, 110 and 140, which put Paid under Due Payment and Unpaid under
       Currency and Due Payment. */
    const under = (col) => LEFT + colW * (col + 0.5);
    const at = { align: 'center' };
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', LEFT, totalLine + 5);
    doc.text('USD', under(3), totalLine + 5, at);
    doc.text('EUR', under(3), totalLine + 10, at);
    [['Amount', 2, 'amount'], ['Paid', 5, 'paid'], ['Unpaid', 6, 'notPaid']].forEach(([caption, col, key]) => {
        doc.text(caption, under(col), totalLine, at);
        doc.text(showAmountInv(totals[0].us[key]), under(col), totalLine + 5, at); //USD
        doc.text(showAmountInv(totals[1].eu[key]), under(col), totalLine + 10, at); //Eur
    });

    let pageCount = doc.internal.getNumberOfPages();
    if (pageCount !== 1) {
        header();
        footer();
    }




    //doc.save("PO_" + supp.nname + "_" + valueCon.order + ".pdf"); // will save the file in the current working directory
    doc.save("Debt_" + pdfText(clnt?.nname) + ".pdf"); // pdfText: "Solumet " named the file "Debt_Solumet .pdf"
};