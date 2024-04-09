'use client'
import { jsPDF } from 'jspdf';
import { getD } from '@utils/utils.js';
import autoTable from 'jspdf-autotable'
import dateFormat from "dateformat";

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
    return x.invType === '1111' ? '' : x.invType === '2222' ? 'CN' : 'FN'
}

export const Pdf = async (value, arrTable, settings, compData) => {

    const clts = settings.Client.Client;
    const clnt = clts.find(z => z.id === value.client);

    var doc = new jsPDF();
    doc.addFont("/fonts/Calibri.ttf", "Poppins", "normal"); //
    doc.addFont("/fonts/Calibri-bold.ttf", "PoppinsB", "bold");

    // doc.addFont("/fonts/Anon.ttf", "Anon", "normal");
    //   doc.addFont("/fonts/Anon-bold.ttf", "AnonB", "bold");

    /* if (!value.final) {
         doc.setTextColor(200);
         doc.setFontSize(120);
         doc.setFont('PoppinsB', 'bold');
         doc.text("DRAFT", 45, 90, null, 20);
     } */

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
        doc.text(compData.street, 10, 279)
        doc.text(compData.city + ' ' + compData.zip, 10, 282)
        doc.text(compData.country, 10, 285)
        doc.text('T: ' + compData.phone, 10, 288)

        doc.text('Vat No: ' + compData.vat, 82, 276);
        doc.text('Reg No: ' + compData.reg, 82, 279);
        doc.text('EORI No: ' + compData.eori, 82, 282);
        doc.text(compData.email, 82, 285);
        doc.text(compData.website, 82, 288);

        const banks = settings['Bank Account']['Bank Account'];
        const bank = banks.find(z => z.id === value.bankNname);

        doc.setFont('PoppinsB', 'bold');
        doc.text(bank.bankName, 145, 276);
        doc.text(bank.swiftCode, 145, 279);
        doc.text(bank.iban, 145, 282);
        doc.setFont('Poppins', 'normal');
        doc.text(bank.corrBank, 145, 285);
        doc.text(bank.corrBankSwift, 145, 288);
        doc.text(bank.other, 145, 291);
    }

    header()

    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Consignee:', 10, 50);
    doc.setDrawColor(0, 0, 0); // draw red lines
    doc.line(10, 51, 22, 51); // horizontal line

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text(value.client === '' ? '' :
        getD(clts, value, 'client'), 10, 55);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    if (value.client !== '') {
        doc.text(clnt.street, 10, 59);
        doc.text(clnt.city, 10, 63);
        doc.text(clnt.country, 10, 67);
        doc.text(clnt.other1, 10, 71);
    }
    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');

    doc.text(value.invType === '1111' ? 'Invoice No:' : value.invType === '2222' ?
        'Credit Note No:' : 'Final Note No:', 130, 50);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(value.invoice + getprefixInv(value), 160, 50);
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text('Date:', 130, 54);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(value.date.startDate === '' || value.date.startDate === null ? '' :
        dateFormat(value.date.startDate, 'dd-mmm-yy'), 160, 54);
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
    doc.text(getD(settings.Shipment.Shipment, value, 'shpType'), 35, 92);

    if (value.origin !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Origin:', 10, 96);
        if (value.origin !== 'empty') {
            doc.setFont('Poppins', 'normal');
            doc.text(getD(settings.Origin.Origin, value, 'origin'), 35, 96);
        }
    }

    if (value.delTerm !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Delivery Terms:', 10, 100);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings['Delivery Terms']['Delivery Terms'], value, 'delTerm'), 35, 100);
    }

    let empty = value.delDate.startDate === '' || value.delDate.startDate === null
    doc.setFont('PoppinsB', 'bold');
    { !empty && doc.text('Delivery Date:', 10, 104) }
    doc.setFont('Poppins', 'normal');
    doc.text(empty ? '' :
        dateFormat(value.delDate.startDate, 'dd-mmm-yyyy'), 35, 104);

    if (value.pol !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POL:', 77, 92);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.POL.POL, value, 'pol'), 92, 92);
    }

    if (value.pod !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POD:', 77, 96);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.POD.POD, value, 'pod'), 92, 96);
    }

    if (value.packing !== '') {
        doc.setFont('PoppinsB', 'bold');
        if (value.invType !== '2222' && value.invType !== '3333')
            doc.text('Packing:', 77, 100);
        doc.setFont('Poppins', 'normal');
        if (value.invType !== '2222' && value.invType !== '3333')
            doc.text(getD(settings.Packing.Packing, value, 'packing'), 92, 100);
    }

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

    let secondRule = value.packing === 'P6' || value.packing === 'P7'

    doc.setFont('PoppinsB', 'bold');
    if (!secondRule && value.invType !== '2222' && value.invType !== '3333')
        doc.text('Total Tarre WT Kgs:', 130, 96);
    doc.setFont('Poppins', 'normal');
    if (!secondRule && value.invType !== '2222' && value.invType !== '3333') doc.text(TotalTarre, 165, 96);

    let thirdRule = value.packing === 'P6'
    let fourthRule = value.packing === 'P7'

    doc.setFont('PoppinsB', 'bold');
    !fourthRule && doc.text(thirdRule ? 'QTY Ingots' : 'Total Gross WT Kgs:', 130, 100);
    doc.setFont('Poppins', 'normal');
    if (!fourthRule)
        doc.text((value.ttlGross * 1).toLocaleString(locale, options), 165, 100);

    if (value.ttlPackages !== '') {
        doc.setFont('PoppinsB', 'bold');
        if (!secondRule && value.invType !== '2222' && value.invType !== '3333')
            doc.text('Total Packages:', 130, 104);
        doc.setFont('Poppins', 'normal');

        if (!secondRule && value.invType !== '2222' && value.invType !== '3333')
            doc.text(value.ttlPackages, 165, 104);
    }

    if (value.hs1 !== '' || value.hs2 !== '') {
        doc.setFont('Poppins', 'normal');
        doc.text('HS CODE:', 10, 123);

        if (value.hs1 !== '') {

            doc.text(getD(settings.Hs.Hs.map(item => {
                const { hs, ...rest } = item;
                return { hs1: hs, ...rest };
            }), value, 'hs1').toString(), 30, 123);

            doc.text(getD(settings.Hs.Hs.map(item => {
                const { hs, ...rest } = item;
                return { hs2: hs, ...rest };
            }), value, 'hs2').toString(), 60, 123);
        } else {
            doc.text(getD(settings.Hs.Hs.map(item => {
                const { hs, ...rest } = item;
                return { hs2: hs, ...rest };
            }), value, 'hs2').toString(), 30, 123);
        }
    }

    footer();

    const ShipTitle = value.shpType === '323' ? 'Container No' :
        value.shpType === '434' ? 'Truck No' :
            value.shpType === '565' ? 'Container pls' : 'Flight No'

    const formattedNumber1 = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: value.cur !== '' ? getD(settings.Currency.Currency, value, 'cur') :
            'USD',
        minimumFractionDigits: 2
    }).format(value.totalAmount);

    const formattedNumber2 = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: value.cur !== '' ? getD(settings.Currency.Currency, value, 'cur') :
            'USD',
        minimumFractionDigits: 2
    }).format(value.totalPrepayment);

    const formattedNumber4 = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: value.cur !== '' ? getD(settings.Currency.Currency, value, 'cur') :
            'USD',
        minimumFractionDigits: 2
    }).format(value.balanceDue);

    const formattedNumber3 = value.percentage === '' ? '' : value.percentage + '%';

    const newRow1 = [, , , , 'Total Amount:', , formattedNumber1];
    const newRow2 = [, , , , 'Prepayment:', formattedNumber3, formattedNumber2];
    const newRow3 = [, , , , 'Prepaid Amount:', , formattedNumber2];
    const newRow4 = [, , , , 'Balance Due:', , formattedNumber4];


    arrTable.push(newRow1);
    value.invType === '1111' && arrTable.push(newRow2);
    (value.invType === '2222' || value.invType === '3333') && arrTable.push(newRow3);
    (value.invType === '2222' || value.invType === '3333') && arrTable.push(newRow4);

    console.error = () => { };
    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;

    autoTable(doc, {
        theme: 'plain',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 125,
        headStyles: { fillColor: [217, 225, 242], textColor: [32, 55, 100], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: {
            fontSize: 8, font: 'Poppins', textColor: [32, 55, 100], valign: "middle",

        },
        head: [['#', 'PO#', 'Description', ShipTitle, 'Quantity', 'Unit Price', 'Total'],
        ['', '', '', '', 'MT',
            `${value.cur && getD(settings.Currency.Currency, value, 'cur')}`,
            `${value.cur && getD(settings.Currency.Currency, value, 'cur')}`
        ]],
        body: arrTable,
        columnStyles: {
            0: { cellWidth: 7, halign: 'left' }, //#
            1: { cellWidth: 23, halign: 'center' },  //PO#
            2: { cellWidth: 66, halign: 'left' },  //Description
            3: { cellWidth: 22, halign: 'center' }, //Ship
            4: { cellWidth: 22, halign: 'center' }, //Quantity
            5: { cellWidth: 24, halign: 'center' },  //Unit Price
            6: { cellWidth: 24, halign: 'center' },  //Total
        },
        didParseCell: function (data) {

            if (data.row.index === 0 && (data.column.index === 0 || data.column.index === 1 || data.column.index === 2) && data.row.section === 'head') {
                data.cell.styles.halign = 'left'
            }

            if (data.column.index === 1 && data.row.section === 'body') {
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



        },
        willDrawCell: (data) => {
            const tmp1 = value.invType === '1111' ? 2 : 3
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
    
    doc.save(value.invoice + getprefixInv(value) + "_IMS_" + clnt.nname + ".pdf"); // will save the file in the current working directory

};