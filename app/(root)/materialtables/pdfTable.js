'use client'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DEFAULT_ELEMENTS } from './constants'

export const TPdfTable = async (arrTable, elements, unitLabel = 'Kgs') => {
    const elems = elements || DEFAULT_ELEMENTS

    const doc = new jsPDF()
    doc.addFont('/fonts/Calibri.ttf', 'Poppins', 'normal')
    doc.addFont('/fonts/Calibri-bold.ttf', 'PoppinsB', 'bold')
    console.error = () => {}

    const pageWidth = doc.internal.pageSize.width
    const wantedWidth = 190
    const margin = (pageWidth - wantedWidth) / 2

    const headers = ['Material', unitLabel, ...elems.map(e => e.label)]

    // Dynamic column widths: material 60, weight 18, each element 12
    const elemWidth = Math.min(12, Math.floor((wantedWidth - 60 - 18) / elems.length))
    const columnStyles = {
        0: { cellWidth: 60, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
    }
    elems.forEach((_, i) => { columnStyles[i + 2] = { cellWidth: elemWidth, halign: 'center' } })

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
        didParseCell(data) {
            if (data.row.section !== 'body') return
            // Material + weight columns: blue
            if (data.column.index === 0 || data.column.index === 1) {
                data.cell.styles.fillColor = [9, 110, 182]
                data.cell.styles.textColor = [255, 255, 255]
            }
            // Last row (totals): material cell white
            if (data.row.index === arrTable.length - 1 && data.column.index === 0) {
                data.cell.styles.fillColor = [255, 255, 255]
                data.cell.styles.textColor = [32, 55, 100]
            }
            // Last row element cells: light orange
            if (data.row.index === arrTable.length - 1 && data.column.index > 1) {
                data.cell.styles.fillColor = [247, 199, 172]
            }
        },
        willDrawCell(data) {
            if (data.column.index > 0 && data.row.section === 'body' && data.row.index === arrTable.length - 1) {
                doc.setLineWidth(0.5)
                doc.setDrawColor(0, 0, 0)
                doc.line(data.cell.x, data.cell.y, data.cell.x + data.column.width, data.cell.y)
            }
        },
    })

    doc.save('Materials Table.pdf')
}
