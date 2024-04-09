'use client'
import { jsPDF } from 'jspdf';
import { getD } from '@utils/utils.js';
import autoTable from 'jspdf-autotable'
import dateFormat from "dateformat";



const showRemarks = (doc, startRemarksRow, valueCon, settings) => {
    if (valueCon.remarks.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks:', 10, startRemarksRow);

        doc.setFont('Poppins', 'normal');
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

        doc.setFont('Poppins', 'normal');
        for (let i = 0; i < valueCon.priceRemarks.length; i++) {
            doc.text(valueCon.priceRemarks[i].rmrk, 10, startRemarkPricesRow + 5 + i * 4);
        }
    }
}

const Signatiure = (doc) => {
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(7);
    doc.text('Please make sure to put IMS Shipping - shipping@ims-stainless.com in copy of all e-mails regarding Inquires/Purchase orders/Settlements and etc.', 12, 236)

    doc.setFont('Poppins', 'normal');
    doc.text('With kind regards,', 12, 242);

    doc.addImage("/logo/imsSignature.png", "PNG", 5, 240, 50, 35);
}

export const Pdf = async (valueCon, arrTable, settings, compData) => {


    const sups = settings.Supplier.Supplier;
    const supp = sups.find(z => z.id === valueCon.supplier);

    var doc = new jsPDF();
    doc.addFont("/fonts/Calibri.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Calibri-bold.ttf", "PoppinsB", "bold");

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
        doc.text('Any Radio Active materials detected within your load will be isolated and safely impounded and disposed of as per the regulations of the day laid down by the Government and all', 30, 267);
        doc.text(' costs relating to its safe disposal shall be borne by the Supplier', 75, 270);
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
    footer();

    doc.setFontSize(8);
    doc.setFont('PoppinsB', 'bold');
    doc.text('Supplier:', 10, 50);
    doc.setDrawColor(0, 0, 0); // draw red lines
    doc.line(10, 51, 20, 51); // horizontal line

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
    doc.text('Date:', 130, 54);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(valueCon.date === '' || valueCon.date.startDate === null ? '' :
        dateFormat(valueCon.date.startDate, 'dd-mmm-yy'), 168, 54);

    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text('We confirm having purchased from you the following material subject to our Conditions of Purchase stated below:', 35, 84);

    doc.setFont('PoppinsB', 'bold');
    doc.text('Shipment:', 10, 92);
    doc.setFont('Poppins', 'normal');
    doc.text(getD(settings.Shipment.Shipment, valueCon, 'shpType'), 35, 92);

    if (valueCon.origin !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Origin:', 10, 96);
        if (valueCon.origin !== 'empty') {
            doc.setFont('Poppins', 'normal');
            doc.text(getD(settings.Origin.Origin, valueCon, 'origin'), 35, 96);
        }
    }

    if (valueCon.delTerm !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Delivery Terms:', 10, 100);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings['Delivery Terms']['Delivery Terms'], valueCon, 'delTerm'), 35, 100);
    }

    if (valueCon.pol !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POL:', 77, 92);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.POL.POL, valueCon, 'pol'), 92, 92);
    }

    if (valueCon.pod !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('POD:', 77, 96);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.POD.POD, valueCon, 'pod'), 92, 96);
    }

    if (valueCon.packing !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Packing:', 77, 100);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.Packing.Packing, valueCon, 'packing'), 92, 100);
    }
    if (valueCon.contType !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Container Type:', 130, 92);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings['Container Type']['Container Type'], valueCon, 'contType'), 155, 92);
    }

    if (valueCon.size !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Size:', 130, 96);
        doc.setFont('Poppins', 'normal');
        doc.text(getD(settings.Size.Size, valueCon, 'size'), 155, 96);
    }

    if (valueCon.deltime !== '') {
        doc.setFont('PoppinsB', 'bold');
        doc.text('Delivery Time:', 130, 100);
        doc.setFont('Poppins', 'normal');
        valueCon.isDeltimeText ?
            doc.text(valueCon.deltime, 155, 100) :
            doc.text(getD(settings['Delivery Time']['Delivery Time'], valueCon, 'deltime'), 155, 100);
    }

    doc.setFont('PoppinsB', 'bold');
    doc.text('Payment Terms:', 10, 115);
    doc.setFont('Poppins', 'normal');
    const tmp1 = doc.splitTextToSize(getD(settings['Payment Terms']['Payment Terms'], valueCon, 'termPmnt'), 155, {})
    doc.text(tmp1, 37, 115);

    console.error = () => { };
    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 125,
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

            if (data.row.section === 'body') {
                data.cell.styles.cellPadding = 0.5
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

    Signatiure(doc)
   
    doc.save("PO_" + supp.nname + "_" + valueCon.order + ".pdf"); // will save the file in the current working directory

};