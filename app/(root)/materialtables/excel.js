import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import Tltip from '../../../components/tlTip';
import { FileSpreadsheet } from 'lucide-react';
import { DEFAULT_ELEMENTS, UNIT_LABELS, UNIT_TO_MT } from './constants';

const styles = { alignment: { horizontal: 'center', vertical: 'middle' } }

export const EXD = (table) => {
    const exportExcel = async () => {
        const dataTable = table.data || []
        const elems = table.elements || DEFAULT_ELEMENTS
        const unit = table.unit || 'kgs'
        const unitLabel = UNIT_LABELS[unit] || 'Kgs'
        const prices = table.prices || {}
        const showContainer = table.showContainer || false
        const hasPrices = elems.some(el => el.key !== 'fe' && prices[el.key])

        const wb = new Workbook()
        wb.creator = 'IMS'
        wb.created = new Date()
        const sheet = wb.addWorksheet('Data', { properties: {} })
        sheet.views = [{ rightToLeft: false }]

        // Build columns
        const cols = []
        if (showContainer) cols.push({ key: 'container', header: 'Container', width: 14, style: styles })
        cols.push({ key: 'material', header: 'Material', width: 40, style: styles })
        cols.push({ key: 'kgs', header: unitLabel, width: 10, style: styles })
        elems.forEach(el => cols.push({ key: el.key, header: el.label, width: 8, style: styles }))
        if (hasPrices) {
            cols.push({ key: 'costPmt', header: 'Cost PMT', width: 12, style: styles })
            cols.push({ key: 'costTotal', header: 'Cost Total', width: 14, style: styles })
        }
        sheet.columns = cols

        // Header row styling
        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (!cell.value) return
            const isMat = colNumber <= (showContainer ? 3 : 2)
            const isCost = hasPrices && colNumber > cols.length - 2
            cell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: isMat ? { argb: 'A6C9EC' } : isCost ? { argb: 'D5F5E3' } : { argb: 'F7C7AC' }
            }
            cell.font = { bold: true, size: 11 }
        })

        // Data rows
        for (const item of dataTable) {
            const row = {}
            if (showContainer) row.container = item.container || ''
            row.material = item.material
            row.kgs = parseFloat(item.kgs) || 0
            elems.forEach(el => { row[el.key] = parseFloat(item[el.key]) || 0 })
            if (hasPrices) {
                const cPmt = elems.reduce((s, el) => {
                    if (el.key === 'fe') return s
                    return s + ((parseFloat(item[el.key]) || 0) / 100) * (parseFloat(prices[el.key]) || 0)
                }, 0)
                const wMT = (parseFloat(item.kgs) || 0) * (UNIT_TO_MT[unit] || 0.001)
                row.costPmt = parseFloat(cPmt.toFixed(2))
                row.costTotal = parseFloat((cPmt * wMT).toFixed(2))
            }
            sheet.addRow(row)
        }

        // Totals row
        const totalKgs = dataTable.reduce((s, r) => s + (parseFloat(r.kgs) || 0), 0)
        const totRow = {}
        if (showContainer) totRow.container = ''
        totRow.material = ''
        totRow.kgs = totalKgs
        elems.forEach(el => {
            const ws = dataTable.reduce((s, r) => s + (parseFloat(r[el.key] || 0)) * (parseFloat(r.kgs) || 0), 0)
            totRow[el.key] = totalKgs > 0 ? parseFloat((ws / totalKgs).toFixed(2)) : 0
        })
        if (hasPrices) {
            const cPmt = elems.reduce((s, el) => {
                if (el.key === 'fe') return s
                return s + ((totRow[el.key] || 0) / 100) * (parseFloat(prices[el.key]) || 0)
            }, 0)
            const wMT = totalKgs * (UNIT_TO_MT[unit] || 0.001)
            totRow.costPmt = parseFloat(cPmt.toFixed(2))
            totRow.costTotal = parseFloat((cPmt * wMT).toFixed(2))
        }
        sheet.addRow(totRow)

        // Cell styling
        const matCols = showContainer ? 3 : 2
        const totRowNum = dataTable.length + 2
        sheet.eachRow((row, rn) => {
            row.eachCell((cell, cn) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
                if (cn <= matCols) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'A6C9EC' } }
                    cell.font = { bold: rn === 1 || rn === totRowNum }
                }
                if (rn === totRowNum && cn > matCols) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasPrices && cn > cols.length - 2 ? 'D5F5E3' : 'F7C7AC' } }
                    cell.font = { bold: true }
                }
                if (cn > (showContainer ? 2 : 1)) {
                    cell.numFmt = '#,##0.00;[Red]#,##0.00'
                }
            })
        })

        // Price bar row if prices set
        if (hasPrices) {
            const priceRow = {}
            if (showContainer) priceRow.container = ''
            priceRow.material = '$/MT'
            elems.filter(el => el.key !== 'fe').forEach(el => { priceRow[el.key] = parseFloat(prices[el.key]) || 0 })
            const pr = sheet.addRow(priceRow)
            pr.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'B45309' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } }
            })
        }

        const buf = await wb.xlsx.writeBuffer()
        saveAs(new Blob([buf]), `Material_Table.xlsx`)
    }

    return (
        <div>
            <Tltip direction='bottom' tltpText='Excel'>
                <div onClick={exportExcel} className="hover:bg-[var(--selago)] justify-center w-8 h-8 inline-flex items-center text-sm rounded-full hover:drop-shadow-md focus:outline-none">
                    <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--endeavour)' }} strokeWidth={2} />
                </div>
            </Tltip>
        </div>
    )
}
