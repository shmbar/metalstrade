'use client'
import { jsPDF } from 'jspdf';
import { getD } from '@utils/utils.js';
import autoTable from 'jspdf-autotable'
import dateFormat from "dateformat";

const TableDoc = (doc, startY, arrTable, valueCon, settings) => {

    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;
    console.error = () => { };

    return autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin },
        startY: startY,
        headStyles: { fillColor: [217, 225, 242], textColor: [32, 55, 100], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Poppins', textColor: [32, 55, 100] },
        head: [['#', 'Description', 'Quantity', 'Unit Price'],
        ['', '', `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`
        ]],
        body: arrTable,
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 100, halign: 'left' },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 35, halign: 'center' }
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
        }
    });
}

const showRemarks = (doc, startRemarksRow, valueCon, settings) => {
    if (valueCon.remarks.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks:', 10, startRemarksRow);

        doc.setFont('Poppins', 'normal');
        for (let i = 0; i < valueCon.remarks.length; i++) {
            doc.text(getD(settings.Remarks.Remarks, valueCon.remarks[i], 'rmrk'),
                10, startRemarksRow + 5 + i * 4)


            //  valueCon.remarks[i].rmrk, 10, startRemarksRow + 5 + i * 4);
        }
    }
}

const showPriceRemarks = (doc, startRemarkPricesRow, valueCon) => {
    if (valueCon.priceRemarks.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Price remarks:', 10, startRemarkPricesRow);

        doc.setFont('Poppins', 'normal');
        for (let i = 0; i < valueCon.priceRemarks.length; i++) {
            doc.text(valueCon.priceRemarks[i].rmrk, 10, startRemarkPricesRow + 5 + i * 4);
        }
    }
}

const Signatiure = (doc) => {
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(7);
    doc.text('Please make sure to put IMS Shipping - shipping@ims-stainless.com in copy of all e-mails regarding Inquires/Purchase orders/Settlements and etc.', 12, 234)

    doc.setFont('Poppins', 'normal');
    doc.text('With kind regards,', 12, 242);

    doc.addImage("/logo/imsSignature.png", "PNG", 5, 240, 50, 35);
}

export const Pdf = async (valueCon, arrTable, settings, compData) => {


    const sups = settings.Supplier.Supplier;
    const supp = sups.find(z => z.id === valueCon.supplier);

    var doc = new jsPDF();
    doc.addFont("/fonts/Poppins.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Poppins-bold.ttf", "PoppinsB", "bold");

    //   doc.addFont("/fonts/Anon.ttf", "Anon", "normal");
    // doc.addFont("/fonts/Anon-bold.ttf", "AnonB", "bold");

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
        doc.text('Any Radio Active materials detected within your load will be isolated and safely impounded and disposed of as per the regulations of the day laid down by the Government and all', 10, 267);
        doc.text(' costs relating to its safe disposal shall be borne by the Supplier', 70, 270);
        //Footer
        doc.setDrawColor(220, 220, 220);
        doc.line(10, 272, 200, 272);
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(9);
        doc.text(compData.name, 82, 277)
        doc.setFontSize(8);
        doc.setFont('Poppins', 'normal');
        doc.text(compData.street + ' - ' + compData.city + ' ' + compData.zip +
            ' - ' + compData.country, 78, 282);
        doc.text('Reg No. ' + compData.reg + ' - Vat No. ' + compData.vat +
            ' - EORI No. ' + compData.eori, 64, 287);
        doc.setFontSize(8);
        doc.text(compData.email + ' - ' + compData.website, 65, 292);
    }
    header()
    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Supplier:', 10, 50);
    doc.setDrawColor(0, 0, 0); // draw red lines
    doc.line(10, 51, 23, 51); // horizontal line

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text(valueCon.supplier === '' ? '' :
        getD(sups, valueCon, 'supplier'), 10, 55);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    if (valueCon.supplier !== '') {
        doc.text(supp.street, 10, 59);
        doc.text(supp.city, 10, 63);
        doc.text(supp.country, 10, 67);
        doc.text(supp.other1, 10, 71);
    }

    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Purchase Order No:', 130, 50);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(valueCon.order, 168, 50);
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text('Date:', 130, 58);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(valueCon.date === '' || valueCon.date.startDate === null ? '' :
        dateFormat(valueCon.date.startDate, 'dd-mmm-yyyy'), 168, 58);

    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text('We confirm having purchased from you the following material subject to our Conditions of Purchase stated below:', 23, 84);

    doc.setFont('PoppinsB', 'bold');
    doc.text('Shipment:', 10, 92);
    doc.setFont('Poppins', 'normal');
    doc.text(getD(settings.Shipment.Shipment, valueCon, 'shpType'), 35, 92);

    if (valueCon.origin !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Origin:', 10, 98);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.Origin.Origin, valueCon, 'origin'), 35, 98);
    }

    doc.setFont('PoppinsB', 'bold');
    doc.text('Delivery Terms:', 10, 104);
    doc.setFont('Poppins', 'normal');
    doc.text(getD(settings['Delivery Terms']['Delivery Terms'], valueCon, 'delTerm'), 35, 104);

    if (valueCon.pol !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POL:', 77, 92);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.POL.POL, valueCon, 'pol'), 92, 92);
    }

    if (valueCon.pod !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POD:', 77, 98);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.POD.POD, valueCon, 'pod'), 92, 98);
    }

    if (valueCon.packing !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Packing:', 77, 104);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.Packing.Packing, valueCon, 'packing'), 92, 104);
    }

    doc.setFont('PoppinsB', 'bold');
    doc.text('Container Type:', 130, 92);
    doc.setFont('Poppins', 'normal');
    doc.text(getD(settings['Container Type']['Container Type'], valueCon, 'contType'), 155, 92);

    doc.setFont('PoppinsB', 'bold');
    doc.text('Size:', 130, 98);
    doc.setFont('Poppins', 'normal');
    doc.text(getD(settings.Size.Size, valueCon, 'size'), 155, 98);

    doc.setFont('PoppinsB', 'bold');
    doc.text('Delivery Time:', 130, 104);
    doc.setFont('Poppins', 'normal');
    valueCon.isDeltimeText ?
        doc.text(valueCon.deltime, 155, 104) :
        doc.text(getD(settings['Delivery Time']['Delivery Time'], valueCon, 'deltime'), 155, 104);

    doc.setFont('PoppinsB', 'bold');
    doc.text('Payment Terms:', 10, 115);
    doc.setFont('Poppins', 'normal');
    const tmp1 = doc.splitTextToSize(getD(settings['Payment Terms']['Payment Terms'], valueCon, 'termPmnt'), 155, {})
    doc.text(tmp1, 37, 115);


    let end_of_table_head = 133.5;
    let startRemarksRow = null;
    let startRemarkPricesRow = null;

    let setNextPage = false
    //4 => header, 5=> gap between the header and remarks
    const RemarksBlock = valueCon.remarks.length > 0 ? 5 + (valueCon.remarks.length - 1) * 4 : 0;
    const PriceRemarksBlock = valueCon.priceRemarks.length > 0 ? 5 + (valueCon.priceRemarks.length - 1) * 4 : 0;



    //14 lines till the signature / 19 lines of table in the first page till footer
    if (arrTable.length <= 14) { // table in one page
        TableDoc(doc, 125, arrTable, valueCon, settings)
        footer();
        startRemarksRow = end_of_table_head + arrTable.length * 6.77 + 10;
        startRemarkPricesRow = RemarksBlock !== 0 ? startRemarksRow + RemarksBlock + 10 : startRemarksRow;

        if (RemarksBlock !== 0) {
            if (startRemarksRow + RemarksBlock + 5 < 234) {
                showRemarks(doc, startRemarksRow, valueCon, settings)
            } else if (startRemarksRow + RemarksBlock + 5 <= 267) {
                showRemarks(doc, startRemarksRow, valueCon, settings)
            } else if ((startRemarksRow + RemarksBlock + 5 > 267) && RemarksBlock !== 0) {
                setNextPage = true
                doc.addPage('a4', '1')
                header();
                startRemarksRow = 50;
                showRemarks(doc, startRemarksRow, valueCon, settings)
                startRemarkPricesRow = RemarksBlock !== 0 ? startRemarksRow + RemarksBlock + 10 : startRemarksRow;
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                Signatiure(doc)
                footer();
            }
        }

        if (!setNextPage) {
            if (PriceRemarksBlock === 0 && (startRemarksRow + RemarksBlock < 234)) {
                Signatiure(doc)
            } else if (PriceRemarksBlock === 0 && (startRemarksRow + RemarksBlock < 267)) {
                doc.addPage('a4', '1')
                header();
                Signatiure(doc)
                footer();
            } else if (startRemarkPricesRow + PriceRemarksBlock + 5 < 234) {
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                Signatiure(doc)
            } else if (startRemarkPricesRow + PriceRemarksBlock + 5 <= 267) {
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                doc.addPage('a4', '1')
                header();
                Signatiure(doc)
                footer();
            } else if (startRemarkPricesRow + PriceRemarksBlock + 5 > 267) {
                doc.addPage('a4', '1')
                header();
                startRemarkPricesRow = 50;
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                Signatiure(doc)
                footer();
            }
        }

    } else if (arrTable.length <= 19) { //beyond the signature
        TableDoc(doc, 125, arrTable, valueCon, settings)

        footer();
        startRemarksRow = end_of_table_head + arrTable.length * 6.77 + 10;
        startRemarkPricesRow = RemarksBlock !== 0 ? startRemarksRow + RemarksBlock + 10 : startRemarksRow;

        if (RemarksBlock !== 0) {
            if (startRemarksRow + RemarksBlock + 5 <= 267) {
                showRemarks(doc, startRemarksRow, valueCon, settings)
            } else if ((startRemarksRow + RemarksBlock + 5 > 267) && RemarksBlock !== 0) {
                setNextPage = true
                doc.addPage('a4', '1')
                header();
                startRemarksRow = 50;
                showRemarks(doc, startRemarksRow, valueCon, settings)
                startRemarkPricesRow = RemarksBlock !== 0 ? startRemarksRow + RemarksBlock + 10 : startRemarksRow;
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                Signatiure(doc)
                footer();
            }
        }

        if (!setNextPage) {
            if (PriceRemarksBlock === 0 && (startRemarksRow + RemarksBlock < 267)) {
                doc.addPage('a4', '1')
                header();
                Signatiure(doc)
                footer();
            } else if (startRemarkPricesRow + PriceRemarksBlock + 5 <= 267) {
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                doc.addPage('a4', '1')
                header();
                Signatiure(doc)
                footer();
            } else if (startRemarkPricesRow + PriceRemarksBlock + 5 > 267) {
                doc.addPage('a4', '1')
                header();
                startRemarkPricesRow = 50;
                showPriceRemarks(doc, startRemarkPricesRow, valueCon)
                Signatiure(doc)
                footer();
            }
        }



    } else if (arrTable.length > 19) {
        TableDoc(doc, 125, arrTable.slice(0, 19), valueCon, settings)
        footer();

        doc.addPage('a4', '1')
        header();

        TableDoc(doc, 45, arrTable.slice(19, arrTable.length), valueCon, settings)
        end_of_table_head = 53.5;
        startRemarksRow = end_of_table_head + arrTable.slice(19, arrTable.length).length * 6.77 + 10;
        startRemarkPricesRow = RemarksBlock !== 0 ? startRemarksRow + RemarksBlock + 10 : startRemarksRow;

        showRemarks(doc, startRemarksRow, valueCon, settings)
        showPriceRemarks(doc, startRemarkPricesRow, valueCon)
        Signatiure(doc)
        footer();
    }

    doc.save(getD(sups, valueCon, 'supplier') + "_" + valueCon.order + ".pdf"); // will save the file in the current working directory

};