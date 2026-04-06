'use client'
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'
import { DEFAULT_ELEMENTS } from './constants';

export const TPdfTable = async (arrTable, elements, unitLabel = 'Kgs') => {
    const elems = elements || DEFAULT_ELEMENTS

    var doc = new jsPDF();
    doc.addFont("/fonts/Calibri.ttf", "Poppins", "normal");
    doc.addFont("/fonts/Calibri-bold.ttf", "PoppinsB", "bold");

    console.error = () => { };
    let wantedTableWidth = 190;
    let pageWidth = doc.internal.pageSize.width;
    let margin = (pageWidth - wantedTableWidth) / 2;

    // Dynamic headers
    const headers = ['Material', unitLabel, ...elems.map(e => e.label)]

    // Dynamic column styles — material gets 60px, weight gets 18px, each element gets ~12px
    const columnStyles = {
        0: { cellWidth: 60, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
    }
    elems.forEach((_, i) => {
        columnStyles[i + 2] = { cellWidth: 12, halign: 'center' }
    })

    autoTable(doc, {
        theme: 'plain',
        pageBreak: 'auto',
        rowPageBreak: 'avoid',
        margin: { left: margin, right: margin, bottom: 35, top: 45 },
        startY: 20,
        headStyles: { fillColor: [9, 110, 182], textColor: [255, 255, 255], fontSize: 8, halign: 'center', font: 'PoppinsB' },
        bodyStyles: { fontSize: 8, font: 'Poppins', textColor: [32, 55, 100] },
        head: [headers],
        body: arrTable,
        columnStyles,
        didParseCell: function (data) {
            // Highlight Material and Weight columns in body rows (blue)
            if (data.row.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
                data.cell.styles.fillColor = [9, 110, 182]
                data.cell.styles.textColor = [255, 255, 255]
            }
            // Last row (totals): material cell stays white
            if (data.row.section === 'body' && data.column.index === 0 && data.row.index === arrTable.length - 1) {
                data.cell.styles.fillColor = [255, 255, 255]
            }
            // Last row element cells: light orange
            if (data.row.section === 'body' && data.column.index > 1 && data.row.index === arrTable.length - 1) {
                data.cell.styles.fillColor = [247, 199, 172]
            }
        },
        willDrawCell: (data) => {
            if (data.column.index > 0 && data.row.section === 'body' && data.row.index === arrTable.length - 1) {
                doc.setLineWidth(0.5)
                doc.setDrawColor(0, 0, 0);
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.column.width, data.cell.y);
            }
        }
    });

    doc.save("Materials Table.pdf");
};
