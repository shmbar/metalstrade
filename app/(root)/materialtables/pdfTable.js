'use client'
import { jsPDF } from 'jspdf';
import { getD } from '@utils/utils.js';
import autoTable from 'jspdf-autotable'
import dateFormat from "dateformat";



export const TPdfTable = async (arrTable) => {

    var doc = new jsPDF();
    doc.addFont("/fonts/Calibri.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Calibri-bold.ttf", "PoppinsB", "bold");


    //   doc.addFont("/fonts/Anon.ttf", "Anon", "normal");
    // doc.addFont("/fonts/Anon-bold.ttf", "AnonB", "bold");

    console.error = () => { };
    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 20,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB', borderRadius: '10px' },
        bodyStyles: { fontSize: 8, font: 'Poppins', textColor: [32, 55, 100] },
        head: [['Material', 'Kgs', 'Ni', 'Cr', 'Cu', 'Mo', 'W', 'Co', 'Nb', 'Fe', 'Ti'],
        ],
        body: arrTable,
        columnStyles: {
            0: { cellWidth: 65, halign: 'center' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 12, halign: 'center' },
            3: { cellWidth: 12, halign: 'center' },
            4: { cellWidth: 12, halign: 'center' },
            5: { cellWidth: 12, halign: 'center' },
            6: { cellWidth: 12, halign: 'center' },
            7: { cellWidth: 12, halign: 'center' },
            8: { cellWidth: 12, halign: 'center' },
            9: { cellWidth: 12, halign: 'center' },
            10: { cellWidth: 12, halign: 'center' },
            11: { cellWidth: 12, halign: 'center' },

        },
        didParseCell: function (data) {
            // if (data.row.index === 0 && data.column.index === 1 && data.row.section === 'head') {
            //     //  data.cell.styles.halign = 'left'
            // }

            if (data.row.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
                //   data.cell.styles.halign = 'center'
                //  data.cell.styles.cellPadding = 0.5
                data.cell.styles.fillColor = [9, 110, 182]
                data.cell.styles.textColor = [255, 255, 255]
            }

            if (data.row.section === 'body' && (data.column.index === 0 && data.row.index === arrTable.length - 1)) {
                data.cell.styles.fillColor = [255, 255, 255]
            }

            if (data.row.section === 'body' && (data.column.index > 1 && data.row.index === arrTable.length - 1)) {
                data.cell.styles.fillColor = [247, 199, 172]
            }
        },
        willDrawCell: (data) => {
            if (data.column.index > 0 && data.row.section === 'body' && data.row.index === arrTable.length - 1) {
                doc.setLineWidth(0.5)
                doc.setDrawColor(0, 0, 0); // draw red lines
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.column.width, data.cell.y);
            }
        }

    });



    doc.save("Materials Table.pdf"); // will save the file in the current working directory

};