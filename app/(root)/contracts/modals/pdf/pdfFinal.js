'use client'
import { jsPDF } from 'jspdf';
import { getD } from '@utils/utils.js';
import autoTable from 'jspdf-autotable'
import dateFormat from "dateformat";



const showFinalRemarks = (doc, startRemarksRow, valueCon) => {
    if (valueCon.finalSRemarks?.length > 0) {
        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(8);
        doc.text('Remarks:', 10, startRemarksRow);

        doc.setFont('Poppins', 'normal');
        for (let i = 0; i < valueCon.finalSRemarks.length; i++) {
            doc.text(valueCon.finalSRemarks[i]?.rmrk, 10, startRemarksRow + 5 + i * 4);
        }
    }
}

const Signatiure = (doc, compData, gisAccount) => {
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(7);
    doc.text(`Please make sure to put ${gisAccount ? 'GIS' : 'IMS'} Shipping - ${compData.email} in copy of all e-mails regarding Inquires/Purchase orders/Settlements and etc.`, 12, 236)

    doc.setFont('Poppins', 'normal');
    doc.text('With kind regards,', 12, 242);

    {
        gisAccount ? doc.addImage('logo/gisSignature.jpg', "JPEG", 10, 244, 40, 24)
            :
            doc.addImage('logo/imsSignatureNew.jpg', "JPEG", 10, 243, 33, 28);
    }

    doc.setFont('Poppins', 'normal');
    doc.setFontSize(6);
    doc.text('Any Radio Active materials detected within your load will be isolated and safely impounded and disposed of as per the regulations of the day laid down by the Government and all', 30, 267);
    doc.text(' costs relating to its safe disposal shall be borne by the Supplier', 75, 270);

}

export const Pdf = async (valueCon, arrTable, settings, compData, data, gisAccount) => {


    const sups = settings.Supplier.Supplier;
    const supp = sups.find(z => z.id === valueCon.supplier);

    var doc = new jsPDF();
    doc.addFont("/fonts/Calibri.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Calibri-bold.ttf", "PoppinsB", "bold");

    {
        gisAccount ?
            doc.addImage('/logo/gisBlur.jpg', "JPG", 135, 200, 70, 65) :
            doc.addImage('/logo/imsblur1.jpeg', "JPG", 88, 225, 120, 45)
    }

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

        //Footer
        if (!gisAccount) {
            doc.setDrawColor(220, 220, 220);
            doc.line(10, 272, 200, 272);
        }


        if (gisAccount) {
            doc.addImage('/logo/gisFooter.jpg', "JPEG", 0, 272, 220, 26)
        } else {
            doc.setFillColor(9, 110, 182)
            doc.rect(0, 272, 220, 26, "F");
        }



        doc.setFont('PoppinsB', 'bold');
        doc.setFontSize(9);

        // {
        //     compData.logolink === '/logo/logoNew.png' ?
        doc.setTextColor(255, 255, 255)
        //        : doc.setTextColor(32, 55, 100)        }


        if (gisAccount) {
            doc.text(compData.name, 187.5, 282)
            doc.setFontSize(9);
            doc.setFont('Poppins', 'normal');
            doc.text(compData.street + ' - ' + compData.city + ' ' + compData.zip +
                ' - ' + compData.country, 163, 286);
            doc.text('Reg No. ' + compData.reg +
                ' - EORI No. ' + compData.eori, 152, 290);
            doc.text(compData.website, 179, 294);
        } else {
            doc.text(compData.name, 82, 278)
            doc.setFontSize(8);
            doc.setFont('Poppins', 'normal');
            doc.text(compData.street + ' - ' + compData.city + ' ' + compData.zip +
                ' - ' + compData.country, 78, 282);
            doc.text('Reg No. ' + compData.reg + ' - Vat No. ' + compData.vat +
                ' - EORI No. ' + compData.eori, 64, 286);
            doc.setFontSize(8);
            doc.text(compData.email + ' - ' + compData.website, 70, 290);
            doc.setTextColor(32, 55, 100)
        }
    }
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
    doc.text(valueCon.order, 185, 50);
    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text('Date:', 130, 54);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    doc.text(valueCon.date === '' || valueCon.date.startDate === null ? '' :
        dateFormat(valueCon.date.startDate, 'dd-mmm-yy'), 185, 54);


    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(8);
    doc.text('Invoices:', 130, 58);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(8);
    const InvArr = [...new Set(data.flatMap(x =>
        x.poInvoices.filter(y => y.id === x.poInvoice).map(y => y.inv)
    ))];

    for (let i = 0; i < InvArr.length; i++) {
        doc.text(InvArr[i], 185, 58 + i * 4);
    }

    doc.setFont('PoppinsB', 'bold');
    doc.setFontSize(12);
    doc.text('Final Settlement', 90, 80);

    console.error = () => { };
    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;


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
    }

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 86, //125,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Poppins', textColor: [32, 55, 100] },
        head: [['#', 'Description', 'Remarks', 'Advised', 'Received', 'Received Price', 'Total'],
        ['', '', '', `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            `${valueCon.qTypeTable && getD(settings.Quantity.Quantity, valueCon, 'qTypeTable')}`,
            `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`,
            `${valueCon.cur && getD(settings.Currency.Currency, valueCon, 'cur')}`
        ]],
        body: arrTable,
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
            let arr = [1, 2, 3, 4, 5, 6]
            if (arr.includes(data.column.index) &&
                data.row.section === 'body' && data.row.index === arrTable.length - 5) {
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


    Signatiure(doc, compData, gisAccount)

    doc.save("FinalSettlement_" + supp.nname + "_" + valueCon.order + ".pdf"); // will save the file in the current working directory

};