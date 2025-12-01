'use client'
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'

const showRemarks = (doc, startRemarksRow, valueCon) => {
    if (valueCon.remarks.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks:', 10, startRemarksRow);

        doc.setFont('Poppins', 'normal');
        for (let i = 0; i < valueCon.remarks.length; i++) {
            doc.text(valueCon.remarks[i].rmrk, 10, startRemarksRow + 5 + i * 4);
        }
    }
}

const getprefixInv = (x) => {
    return x.invType === 'Invoice' ? '' : x.invType === 'Credit Note' ? 'CN' : 'FN'
}

export const PdfFnlCncl = async (value, arrTable, settings, compData) => {

    var doc = new jsPDF();
    doc.addFont("/fonts/Poppins.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Poppins-bold.ttf", "PoppinsB", "bold");

    if (value.final && value.canceled) {
        doc.setTextColor(200);
        doc.setFontSize(100);
        doc.setFont('PoppinsB', 'bold');
        doc.text("CANCELED", 20, 100, null, 20);
    }

    const header = () => {
        doc.addImage("/logo/imsLogo.png", "PNG", 10, 10, 50, 25);

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
        doc.text('This document was issued electronically and is therefore valid without signature', 70, 265);
        doc.text('These goods remain property of the seller until payment in full has been received by us', 66, 268);

        //Footer
        doc.setDrawColor(220, 220, 220);
        doc.line(10, 270, 200, 270);
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(7);
        doc.text(compData.name, 10, 276)
        doc.setFontSize(7);
        doc.setFont('Poppins', 'normal');
        doc.text(compData.street, 10, 280)
        doc.text(compData.city + ' ' + compData.zip, 10, 284)
        doc.text(compData.country, 10, 288)
        doc.text('T: ' + compData.phone, 10, 292)

        doc.text('Vat No: ' + compData.vat, 82, 276);
        doc.text('Reg No: ' + compData.reg, 82, 280);
        doc.text('EORI No: ' + compData.eori, 82, 284);
        doc.text(compData.email, 82, 288);
        doc.text(compData.website, 82, 292);

       /* doc.setFont('PoppinsB', 'bold');
        doc.text(value.bankName.bankName, 145, 276);
        doc.text('SWIFT code: ' + value.bankName.swiftCode, 145, 280);
        doc.text('IBAN: ' + value.bankName.iban, 145, 284);
        doc.setFont('Poppins', 'normal');
        doc.text('Correspondent Bank: ' + value.bankName.corrBank, 145, 288);
        doc.text('Correspondent Bank SWIFT: ' + value.bankName.corrBankSwift, 145, 292); */

        doc.setFont('PoppinsB', 'bold');
        doc.text(value.bankName.bankName, 145, 276);
        doc.text(value.bankName.swiftCode, 145, 280);
        doc.text(value.bankName.iban, 145, 284);
        doc.setFont('Poppins', 'normal');
        doc.text(value.bankName.corrBank, 145, 288);
        doc.text(value.bankName.corrBankSwift, 145, 292);
    }

    header()

    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Consignee:', 10, 50);
    doc.setDrawColor(0, 0, 0); // draw red lines
    doc.line(10, 51, 27, 51); // horizontal line

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text(value.client.client, 10, 55);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);

    doc.text(value.client.street, 10, 59);
    doc.text(value.client.city, 10, 63);
    doc.text(value.client.country, 10, 67);
    doc.text(value.client.other1, 10, 71);

    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text(value.invType === 'Invoice' ? 'Invoice No:' : value.invType === 'Credit Note' ?
        'Credit Note No:' : 'Final Note No:', 130, 50);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(value.invoice.toString() + getprefixInv(value), 160, 50);
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text('Date:', 130, 54);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(value.date, 160, 54);
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text('PO#:', 130, 58);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);

    let poArr = [...new Set(value.productsDataInvoice.map(x => x.po).filter(x => x !== ''))]

    for (let i = 0; i < poArr.length; i++) {
        doc.text(poArr[i], 160, 58 + i * 4);
    }

    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Shipment:', 10, 92);
    doc.setFont('Poppins', 'normal');
    doc.text(value.shpType, 35, 92);

    if (value.origin !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Origin:', 10, 98);
        doc.setFont('Poppins', 'normal');
        doc.text(value.origin, 35, 98);
    }

    if (value.delTerm !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Delivery Terms:', 10, 104);
        doc.setFont('Poppins', 'normal');
        doc.text(value.delTerm, 35, 104);
    }

    let empty = value.delDate === ''
    doc.setFont('PoppinsB', 'bold');
    { !empty && doc.text('Delivery Date:', 10, 110) }
    doc.setFont('Poppins', 'normal');
    doc.text(value.delDate, 35, 110);

    if (value.pol !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POL:', 77, 92);
        doc.setFont('Poppins', 'normal');
        doc.text(value.pol, 92, 92);
    }

    if (value.pod !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POD:', 77, 98);
        doc.setFont('Poppins', 'normal');
        doc.text(value.pod, 92, 98);
    }

    doc.setFont('PoppinsB', 'bold');
    if (value.invType !== 'Credit Note' && value.invType !== 'Final Note')
        doc.text('Packing:', 77, 104);
    doc.setFont('Poppins', 'normal');
    if (value.invType !== 'Credit Note' && value.invType !== 'Final Note')
        doc.text(value.packing, 92, 104);


    //Total Net WT Kgs:
    const options = { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 2 };
    const locale = 'en-US';
    const NetWTKgsTmp = (value.productsDataInvoice.map(x => x.qnty)
        .reduce((accumulator, currentValue) => accumulator + currentValue * 1, 0) * 1000);
    const NetWTKgs = NetWTKgsTmp.toLocaleString(locale, options);

    doc.setFont('PoppinsB', 'bold');
    doc.text('Total Net WT Kgs:', 130, 92);
    doc.setFont('Poppins', 'normal');
    doc.text(NetWTKgs, 165, 92);

    //Total Tarre WT Kgs:
    const TotalTarre = (value.ttlGross - NetWTKgsTmp).toLocaleString(locale, options);

    let secondRule = value.packing === 'P6' || value.packing === 'P7' || value.packing === 'Ingots'
        || value.packing === 'Loose'

    doc.setFont('PoppinsB', 'bold');
    if (!secondRule && value.invType !== 'Credit Note' && value.invType !== 'Final Note') doc.text('Total Tarre WT Kgs:', 130, 98);
    doc.setFont('Poppins', 'normal');
    if (!secondRule && value.invType !== 'Credit Note' && value.invType !== 'Final Note') doc.text(TotalTarre, 165, 98);

    let thirdRule = value.packing === 'P6' || value.packing === 'Ingots'
    let fourthRule = value.packing === 'P7' || value.packing === 'Loose'

    doc.setFont('PoppinsB', 'bold');
    !fourthRule && doc.text(thirdRule ? 'QTY Ingots' : 'Total Gross WT Kgs:', 130, 104);
    doc.setFont('Poppins', 'normal');
    if (!fourthRule)
        doc.text((value.ttlGross * 1).toLocaleString(locale, options), 165, 104);

    doc.setFont('PoppinsB', 'bold');
    if (!secondRule && value.invType !== 'Credit Note' && value.invType !== 'Final Note')
        doc.text('Total Packages:', 130, 110);
    doc.setFont('Poppins', 'normal');

    if (!secondRule && value.invType !== 'Credit Note' && value.invType !== 'Final Note')
        doc.text((value.ttlPackages * 1).toLocaleString(locale, options), 165, 110);

    footer();

    if (value.hs1 !== '' || value.hs2 !== '') {
        doc.setFont('Poppins', 'normal');
        doc.text('HS CODE:', 10, 123);

        if (value.hs1 !== '') {
            doc.text(value.hs1.toString(), 30, 123);

            doc.text(value.hs2.toString(), 60, 123);
        } else {
            doc.text(value.hs2.toString(), 30, 123);
        }
    }



    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;

    const formattedNumber1 = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: value.cur.cur,
        minimumFractionDigits: 2
    }).format(value.totalAmount);

    const formattedNumber2 = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: value.cur.cur,
        minimumFractionDigits: 2
    }).format(value.totalPrepayment);

    const formattedNumber4 = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: value.cur.cur,
        minimumFractionDigits: 2
    }).format(value.balanceDue);

    const formattedNumber3 = value.percentage === '' ? '' : value.percentage + '%';
    const newRow1 = [, , , , 'Total Amount:', , formattedNumber1];
    const newRow2 = [, , , , 'Prepayment:', formattedNumber3, formattedNumber2];
    const newRow3 = [, , , , 'Prepaid Amount:', , formattedNumber2];
    const newRow4 = [, , , , 'Balance Due:', , formattedNumber4];

    arrTable.push(newRow1);
    value.invType === 'Invoice' && arrTable.push(newRow2);
    (value.invType === 'Credit Note' || value.invType === 'Final Note') && arrTable.push(newRow3);
    (value.invType === 'Credit Note' || value.invType === 'Final Note') && arrTable.push(newRow4);

    console.error = () => { };
    autoTable(doc, {
        theme: 'plain',
        margin: { left: margin, right: margin, bottom: 30, top: 45 },
        startY: 125,
        headStyles: { fillColor: [217, 225, 242], textColor: [32, 55, 100], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Poppins', textColor: [32, 55, 100] },
        head: [['#', 'PO#', 'Description', value.shpType, 'Quantity', 'Unit Price', 'Total'],
        ['', '', '', '', 'MT', value.cur.cur, value.cur.cur]],
        body: arrTable,
        columnStyles: {
            0: { cellWidth: 7, halign: 'center' }, //#
            1: { cellWidth: 20, halign: 'left' },  //PO#
            2: { cellWidth: 64, halign: 'left' },  //Description
            3: { cellWidth: 22, halign: 'center' }, //Ship
            4: { cellWidth: 27, halign: 'center' }, //Quantity
            5: { cellWidth: 25, halign: 'center' },  //Unit Price
            6: { cellWidth: 25, halign: 'center' },  //Total
        },
        didParseCell: function (data) {
            if (data.row.index === 0 && (data.column.index === 1 || data.column.index === 2) && data.row.section === 'head') {
                data.cell.styles.halign = 'left'
            }

            if (data.row.index === 0 && data.row.section === 'head') {
                data.cell.styles.cellPadding = 1
            }

            if (data.row.index === 1 && data.row.section === 'head') {
                data.cell.styles.cellPadding = 0
            }

            if ((data.column.index === 0 || data.column.index === 1 || data.column.index === 2) &&
                data.row.section === 'body') {
                data.cell.styles.cellPadding = 1.5
            }
        },
        willDrawCell: (data) => {
            const tmp1 = value.invType === 'Invoice' ? 2 : 3
            if ((data.column.index === 4 || data.column.index === 5 || data.column.index === 6) &&
                data.row.section === 'body' && data.row.index === arrTable.length - tmp1) {
                doc.setLineWidth(0.1)
                doc.setDrawColor(0, 0, 0); // draw red lines
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.column.width, data.cell.y);
            }
        }
    });


    let finalY = doc.lastAutoTable.finalY;
    let pageCount = doc.internal.getNumberOfPages();
    if (pageCount !== 1) {
        header();
        footer();
    }
    let startRemarksRow = finalY + 10;
    let RemarksBlock = value.remarks.length > 0 ? 5 + (value.remarks.length - 1) * 4 : 0;

    if (RemarksBlock !== 0) {
        if (startRemarksRow + RemarksBlock + 5 <= 265) {
            showRemarks(doc, startRemarksRow, value)
        } else if ((startRemarksRow + RemarksBlock + 5 > 265) && pageCount === 1) {
            doc.addPage('a4', '1')
            header();
            startRemarksRow = 50;
            showRemarks(doc, startRemarksRow, value)
            footer();
        }
    }


    doc.save(value.client.client + "_" + value.invoice + ".pdf"); // will save the file in the current working directory

};