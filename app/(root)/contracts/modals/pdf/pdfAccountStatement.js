'use client'
import { jsPDF } from 'jspdf';
import { getD } from '@utils/utils.js';
import autoTable from 'jspdf-autotable'
import dateFormat from "dateformat";


let showAmountInv = (x) => {

    return x === 0 ? '0' : new Intl.NumberFormat('en-US', {
        //   style: 'currency',
        //    currency: x.row?.original?.final ? x.row.original?.cur?.cur || 'USD' : x.row?.original?.cur,
        minimumFractionDigits: 2
    }).format(x)
}

export const PdfAccountStatement = async (arrTable, settings, compData, client, totals, gisAccount) => {


    const clts = settings.Client.Client;
    const clnt = clts.find(z => z.id === client);


    var doc = new jsPDF();
    doc.addFont("/fonts/Calibri.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Calibri-bold.ttf", "PoppinsB", "bold");

    //   doc.addFont("/fonts/Anon.ttf", "Anon", "normal");
    // doc.addFont("/fonts/Anon-bold.ttf", "AnonB", "bold");

    const header = () => {
         gisAccount ?
            doc.addImage('/logo/gisLogo.jpg', "JPEG", 8, 10, 50, 25) :
            doc.addImage('/logo/logoImsNew.jpg', "JPEG", 10, 10, 50, 25);

        doc.setTextColor(32, 55, 100)
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(10);
        doc.text(compData.name, 130, 15)
        doc.setFontSize(9);
        doc.setFont('Poppins', 'normal');
        doc.text(compData.street, 130, 21)
        doc.text(compData.city + ' ' + compData.zip, 130, 27)
        doc.text(compData.country, 130, 33)

        //    doc.setDrawColor(220, 220, 220); // draw red lines
        //    doc.line(10, 38, 200, 38); // horizontal line
    }

    const footer = () => {
        doc.setFont('Poppins', 'normal');
        doc.setFontSize(6);

        //Footer
        doc.setDrawColor(220, 220, 220);
        doc.line(10, 272, 200, 272);
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(9);
        doc.text(compData.name, 82, 276)
        doc.setFontSize(8);
        doc.setFont('Poppins', 'normal');
        doc.text(compData.street + ' - ' + compData.city + ' ' + compData.zip +
            ' - ' + compData.country, 78, 280);
        doc.text('Reg No. ' + compData.reg + ' - Vat No. ' + compData.vat +
            ' - EORI No. ' + compData.eori, 64, 284);
        doc.setFontSize(8);
        doc.text(compData.email + ' - ' + compData.website, 70, 288);
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
        doc.setFont('Poppins', 'normal');
        doc.setFontSize(8);

        doc.text(clnt?.street, 25, 55);
        doc.text(clnt?.city, 25, 60);
        doc.text(clnt?.country, 25, 65);
        doc.text(clnt?.other1, 25, 70);
    }


    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('ACCOUNT STATEMENT', 70, 80);
    doc.text(dateFormat(new Date(), "dd-mmm-yy"), 112, 80);



    console.error = () => { };
    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 83,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Poppins', textColor: [32, 55, 100] },
        head: [['Invoice', 'Date', 'Amount', 'Currency', 'Due Payment', 'Paid', 'Unpaid'],
            // ['', '', `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            //     `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`
            // ]
        ],
        body: arrTable,
        columnStyles: {
            0: { cellWidth: 27, halign: 'center' },
            1: { cellWidth: 27, halign: 'left' },
            2: { cellWidth: 27, halign: 'center' },
            3: { cellWidth: 27, halign: 'center' },
            4: { cellWidth: 27, halign: 'center' },
            5: { cellWidth: 27, halign: 'center' },
            6: { cellWidth: 27, halign: 'center' }

        },
        didParseCell: function (data) {
            if (data.row.index === 0 && data.column.index === 1 && data.row.section === 'head') {
                data.cell.styles.halign = 'left'
            }

            if (data.row.index === 0 && data.row.section === 'head') {
                data.cell.styles.cellPadding = 1
            }

            if (data.row.index === 1 && data.row.section === 'head') {
                data.cell.styles.cellPadding = 0
            }

            if (data.row.section === 'body') {
                data.cell.styles.cellPadding = 0.5
            }
        }

    });

    let finalY = doc.lastAutoTable.finalY;
    let line = finalY + 2
    doc.setDrawColor(50, 50, 50);
    doc.line(10, line, 200, line);


    let totalLine = line + 6

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 40, totalLine + 5); //USD

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('USD', 60, totalLine + 5); //USD
    doc.text('EUR', 60, totalLine + 10); //Eur

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Amount', 80, totalLine);
    doc.text(showAmountInv(totals[0].us.amount), 80, totalLine + 5); //USD
    doc.text(showAmountInv(totals[1].eu.amount), 80, totalLine + 10); //Eur

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Paid', 110, totalLine);
    doc.text(showAmountInv(totals[0].us.paid), 110, totalLine + 5); //USD
    doc.text(showAmountInv(totals[1].eu.paid), 110, totalLine + 10); //Eur

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Unpaid', 140, totalLine);
    doc.text(showAmountInv(totals[0].us.notPaid), 140, totalLine + 5); //USD
    doc.text(showAmountInv(totals[1].eu.notPaid), 140, totalLine + 10); //Eur

    let pageCount = doc.internal.getNumberOfPages();
    if (pageCount !== 1) {
        header();
        footer();
    }




    //doc.save("PO_" + supp.nname + "_" + valueCon.order + ".pdf"); // will save the file in the current working directory
    doc.save("Debt_" + clnt?.nname + ".pdf"); // will save the file in the current working directory
};