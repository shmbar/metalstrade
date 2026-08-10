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
import { DEFAULT_ELEMENTS } from './constants'

export const TPdfTable = async (arrTable, elements, unitLabel = 'Kgs') => {
    await ensurePdfLibs();
    const elems = elements || DEFAULT_ELEMENTS

    const doc = new jsPDF()
    doc.addFont('/fonts/Calibri.ttf', 'Plus Jakarta Sans', 'normal')
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
        bodyStyles: { fontSize: 8, font: 'Plus Jakarta Sans', textColor: [32, 55, 100] },
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
            /* Last row (totals) element cells. Was a light orange [247,199,172] —
               the one bright fill on a document the client sends to counterparties.
               Now the RGB of --warn-bg (#EFEADD), so the PDF reads in the same
               muted family as the screen. Written as a literal on purpose: jsPDF
               cannot resolve var(), which is why export colours are exempt from
               the theming gates — this is a value change, not a tokenisation. */
            if (data.row.index === arrTable.length - 1 && data.column.index > 1) {
                data.cell.styles.fillColor = [239, 234, 221]
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
