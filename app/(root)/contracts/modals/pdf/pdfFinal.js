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
import { RIGHT, MIDDLE, TABLE_WIDTH, BLOCKS, stack, gridCell, companyHeader, companyBand, signOff } from './pdfLayout';



const showFinalRemarks = (doc, startRemarksRow, valueCon) => {
    if (valueCon.finalSRemarks?.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks:', 10, startRemarksRow);

        doc.setFont('Plus Jakarta Sans', 'normal');
        for (let i = 0; i < valueCon.finalSRemarks.length; i++) {
            doc.text(valueCon.finalSRemarks[i]?.rmrk, 10, startRemarksRow + 5 + i * 4);
        }
    }
}

export const Pdf = async (valueCon, arrTable, settings, compData, data, gisAccount) => {
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
    companyHeader(doc, compData, gisAccount);
    companyBand(doc, compData, gisAccount);

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

    /* The order, its date and the supplier's invoices all end at the margin, level with the
       table. The order and the date were left-aligned at 185 while the invoice numbers under
       them ended at 200: three lines, three right edges. */
    doc.setFontSize(8);
    const below = stack(doc, [
        ['Purchase Order No:', valueCon.order],
        ['Date:', valueCon.date === '' || valueCon.date.startDate === null ? '' :
            dateFormat(valueCon.date.startDate, 'dd.mm.yy')],
    ], { ...BLOCKS.right, top: 50 });

    const InvArr = [...new Set(data.flatMap(x =>
        x.poInvoices.filter(y => y.id === x.poInvoice).map(y => y.inv)
    ))];

    // One invoice number to a line under one heading. A long one (FVEH/00001/06/26/D) wraps
    // within the room beside the heading rather than run into it.
    doc.setFont('PoppinsB', 'bold');
    doc.text('Invoices:', BLOCKS.right.label, below);
    const invRoom = RIGHT - (BLOCKS.right.label + doc.getTextWidth('Invoices:') + 2);
    doc.setFont('Plus Jakarta Sans', 'normal');
    let invY = below;
    for (let i = 0; i < InvArr.length; i++) {
        const lines = doc.splitTextToSize(String(InvArr[i] ?? ''), invRoom);
        for (const ln of lines) {
            doc.text(ln, RIGHT, invY, { align: 'right' });
            invY += 4;
        }
    }

    // Centred on the page (it was placed by eye at x = 90).
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Final Settlement', MIDDLE, 80, { align: 'center' });

    console.error = () => { };
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - TABLE_WIDTH) / 2;


    // Index of the first summary row (kept stable so the underlines below don't shift when
    // custom calculation lines are appended).
    const summaryStartIdx = arrTable.length;
    const fmtCur = (n) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') : 'USD',
        minimumFractionDigits: 2,
    }).format(Number(n) || 0);

    if (data.length > 0) {
        const formattedNumber1 = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3
        }).format(data.reduce((sum, item) => {
            // Parse qnty as a number and add to the sum
            return sum + Number(item.qnty);
        }, 0));

        const formattedNumber2 = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3
        }).format(data.reduce((sum, item) => {
            // Parse qnty as a number and add to the sum
            return sum + Number(item.finalqnty);
        }, 0));

        const formattedNumber3 = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                'USD',
            minimumFractionDigits: 2
        }).format(data.reduce((sum, item) => {
            // Parse qnty as a number and add to the sum
            return sum + Number(item.finaltotal);
        }, 0));

        const formattedNumber4 = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                'USD',
            minimumFractionDigits: 2
        }).format(data.reduce((sum, item) => {
            // Parse qnty as a number and add to the sum
            return sum + Number(item.total);
        }, 0));

        const formattedNumber5 = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                'USD',
            minimumFractionDigits: 2
        }).format(data.reduce((sum, item) => {
            return sum + Number(item.finaltotal);
        }, 0) - data.reduce((sum, item) => {
            return sum + Number(item.total);
        }, 0)
        );

        const formattedNumber6 = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3
        }).format(data.reduce((sum, item) => {
            return sum + Number(item.finalqnty);
        }, 0) - data.reduce((sum, item) => {
            return sum + Number(item.qnty);
        }, 0));



        // //    let ids = [...new Set(data.map(z => z.poInvoice))]
        //     let tmp = valueCon.poInvoices.reduce((sum, item) => {
        //         return sum + ids.includes(item.id) ? item.pmnt * 1 : 0;
        //     }, 0)


        let tmpArr = [...new Set(data.map(z => z.poInvoice))];

        let tmp = valueCon.poInvoices.filter(x => tmpArr.includes(x.id)).reduce((sum, item) => {
            return sum + item.pmnt * 1;
        }, 0)

        const formattedNumber7 = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                'USD',
            minimumFractionDigits: 2
        }).format(tmp);

        const formattedNumber8 = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: valueCon.cur !== '' ? getD(settings.Currency.Currency, valueCon, 'cur') :
                'USD',
            minimumFractionDigits: 2
        }).format(data.reduce((sum, item) => {
            // Parse qnty as a number and add to the sum
            return sum + Number(item.finaltotal);
        }, 0) - tmp);

        const newRow1 = [, 'Total Received:', , formattedNumber1, formattedNumber2, , formattedNumber3];
        const newRow2 = [, 'Total Advised:', , , , , formattedNumber4];
        const newRow3 = [, 'Difference:', , , formattedNumber6, , formattedNumber5];
        const newRow4 = [, 'Advance payment:', , , , , formattedNumber7];
        const newRow5 = [, 'Balance:', , , , , formattedNumber8];


        arrTable.push(newRow1);
        arrTable.push(newRow2);
        arrTable.push(newRow3);
        arrTable.push(newRow4);
        arrTable.push(newRow5);

        // Custom calculation lines (splits / adjustments) entered on the Final Settlement page.
        const calcLines = (valueCon.fsCalcs || []).filter(c => (c.label && c.label.trim()) || Number(c.amount));
        if (calcLines.length > 0) {
            const itemsTotal = data.reduce((sum, item) => sum + Number(item.finaltotal), 0);
            let calcsTotal = 0;
            calcLines.forEach(c => {
                const amt = Number(c.amount) || 0;
                calcsTotal += amt;
                arrTable.push([, c.label || 'Calculation', , , , , fmtCur(amt)]);
            });
            arrTable.push([, 'Settlement Total:', , , , , fmtCur(itemsTotal + calcsTotal)]);
        }
    }

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 86, //125,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Plus Jakarta Sans', textColor: [32, 55, 100] },
        head: [['#', 'Description', 'Remarks', 'Advised', 'Received', 'Received Price', 'Total'],
        ['', '', '', `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`,
            `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`
        ]],
        // Cleaned before it is measured, so a cell is placed by the text it will show (pdfText.js).
        body: pdfRows(arrTable),
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 50, halign: 'left' },
            2: { cellWidth: 50, halign: 'left' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 20, halign: 'center' },
            6: { cellWidth: 20, halign: 'center' }
        },
        didParseCell: function (data) {
            if (data.row.index === 0 && (data.column.index === 1 || data.column.index === 2) &&
                data.row.section === 'head') {
                data.cell.styles.halign = 'left'
            }
            gridCell(data);
        },
        willDrawCell: (data) => {
            let arr = [1, 2, 3, 4, 5, 6]
            if (arr.includes(data.column.index) &&
                data.row.section === 'body' && data.row.index === summaryStartIdx) {
                doc.setLineWidth(0.1)
                doc.setDrawColor(0, 0, 0); // draw red lines
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.column.width, data.cell.y);
            }

            if (arr.includes(data.column.index) &&
                data.row.section === 'body' && data.row.index === arrTable.length - 1) {
                doc.setLineWidth(0.5)
                doc.setDrawColor(0, 0, 0); // draw red lines
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.column.width, data.cell.y);
            }
        }

    });

    let finalY = doc.lastAutoTable.finalY;

    let startRemarksRow = finalY + 10;

    showFinalRemarks(doc, startRemarksRow, valueCon)


    signOff(doc, compData, gisAccount)

    doc.save("FinalSettlement_" + pdfText(supp.nname) + "_" + pdfText(valueCon.order) + ".pdf"); // pdfText: no stray spaces in the name

};