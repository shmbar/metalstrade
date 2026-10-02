import { saveAs } from 'file-saver';
// exceljs is dynamically imported inside exportExcel to keep it off the first-load bundle.
import Tltip from '../../../components/tlTip';
import { BtnIcon } from '../../../components/buttonIcons';
import { DEFAULT_ELEMENTS, UNIT_LABELS, UNIT_TO_MT } from './constants';

const styles = { alignment: { horizontal: 'center', vertical: 'middle' } }

/* What a row is worth per metric ton at a set of element prices — the same sum the
   screen's Cost PMT / Sales MT columns make (newTable.js): every priced element
   counts, Fe included, and Ni is scaled by the bar's own × % factor.
   This export used to make its own version of it: it skipped Fe and ignored the Ni
   %, so with a scrap price entered, or Ni bought at anything but 100 % of LME, the
   sheet's Cost PMT and Cost Total disagreed with the table it was exported from. */
const perMt = (row, elems, prices, niPct) => elems.reduce((sum, el) => {
    const price = parseFloat(prices[el.key]) || 0
    if (!price) return sum
    const mult = el.key === 'ni' ? (niPct || 100) / 100 : 1
    return sum + ((parseFloat(row[el.key]) || 0) / 100) * price * mult
}, 0)

const priced = (elems, prices) => elems.some(el => el.key !== 'fe' && prices[el.key] !== undefined && prices[el.key] !== '')

// Fills, by column group. Export colours stay literal — exceljs cannot read a CSS var.
const FILL = { mat: 'A6C9EC', elem: 'F7C7AC', cost: 'D5F5E3', sales: 'E4E0F7' }

export const EXD = (table) => {
    const exportExcel = async () => {
        const elems = table.elements || DEFAULT_ELEMENTS
        const unit = table.unit || 'kgs'
        const unitLabel = UNIT_LABELS[unit] || 'Kgs'
        const toMt = UNIT_TO_MT[unit] || 0.001
        const prices = table.prices || {}
        const salesPrices = table.salesPrices || {}
        const showContainer = table.showContainer || false
        /* The columns the screen shows, on the screen's conditions: the button on
           and something to compute from. Ni is seeded from LME on every table, so
           "a price exists" alone put Cost columns in every sheet — from an Ni-only
           price — even for a table whose cost row had never been opened. */
        const withCost = !!table.showCosts && priced(elems, prices)
        const withSales = !!table.showSales && priced(elems, salesPrices)
        const dataTable = table.data || []
        /* The rows the totals count: a line with no material and no analysis is a
           blank, and the footer on screen skips it (newTable.js footerVal). */
        const counted = dataTable.filter(r =>
            (r.material && String(r.material).trim() !== '')
            || elems.some(el => { const v = parseFloat(r[el.key]); return !isNaN(v) && v !== 0 }))

        const { Workbook } = await import('exceljs');
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
        if (withCost) {
            cols.push({ key: 'costPmt', header: 'Cost PMT', width: 12, style: styles })
            cols.push({ key: 'costTotal', header: 'Cost Total', width: 14, style: styles })
        }
        if (withSales) {
            cols.push({ key: 'salesMt', header: 'Sales MT', width: 12, style: styles })
            cols.push({ key: 'salesTotal', header: 'Sales Total', width: 14, style: styles })
        }
        sheet.columns = cols

        const matCols = showContainer ? 3 : 2
        const group = (cn) => {
            const key = cols[cn - 1]?.key
            if (cn <= matCols) return 'mat'
            if (key === 'costPmt' || key === 'costTotal') return 'cost'
            if (key === 'salesMt' || key === 'salesTotal') return 'sales'
            return 'elem'
        }

        // Header row styling
        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (!cell.value) return
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[group(colNumber)] } }
            cell.font = { bold: true, size: 11 }
        })

        // Data rows
        for (const item of dataTable) {
            const row = {}
            if (showContainer) row.container = item.container || ''
            row.material = item.material
            row.kgs = parseFloat(item.kgs) || 0
            elems.forEach(el => { row[el.key] = parseFloat(item[el.key]) || 0 })
            const wMT = (parseFloat(item.kgs) || 0) * toMt
            if (withCost) {
                const cPmt = perMt(item, elems, prices, table.niPercent)
                row.costPmt = parseFloat(cPmt.toFixed(2))
                row.costTotal = parseFloat((cPmt * wMT).toFixed(2))
            }
            if (withSales) {
                const sMt = perMt(item, elems, salesPrices, table.salesNiPercent)
                row.salesMt = parseFloat(sMt.toFixed(2))
                row.salesTotal = parseFloat((sMt * wMT).toFixed(2))
            }
            sheet.addRow(row)
        }

        // Totals row — weight-averaged analysis; per-MT figures averaged by weight and
        // totals summed, as the footer on screen does.
        const totalKgs = counted.reduce((s, r) => s + (parseFloat(r.kgs) || 0), 0)
        const totRow = {}
        if (showContainer) totRow.container = ''
        totRow.material = ''
        totRow.kgs = totalKgs
        elems.forEach(el => {
            const ws = counted.reduce((s, r) => s + (parseFloat(r[el.key]) || 0) * (parseFloat(r.kgs) || 0), 0)
            totRow[el.key] = totalKgs > 0 ? parseFloat((ws / totalKgs).toFixed(2)) : 0
        })
        const footer = (p, pct) => {
            const perMtSum = counted.reduce((s, r) => s + perMt(r, elems, p, pct) * (parseFloat(r.kgs) || 0), 0)
            const total = counted.reduce((s, r) => s + perMt(r, elems, p, pct) * (parseFloat(r.kgs) || 0) * toMt, 0)
            return [totalKgs > 0 ? parseFloat((perMtSum / totalKgs).toFixed(2)) : 0, parseFloat(total.toFixed(2))]
        }
        if (withCost) [totRow.costPmt, totRow.costTotal] = footer(prices, table.niPercent)
        if (withSales) [totRow.salesMt, totRow.salesTotal] = footer(salesPrices, table.salesNiPercent)
        sheet.addRow(totRow)

        // Cell styling
        const totRowNum = dataTable.length + 2
        sheet.eachRow((row, rn) => {
            row.eachCell((cell, cn) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
                if (cn <= matCols) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL.mat } }
                    cell.font = { bold: rn === 1 || rn === totRowNum }
                }
                if (rn === totRowNum && cn > matCols) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FILL[group(cn)] } }
                    cell.font = { bold: true }
                }
                if (cn > (showContainer ? 2 : 1)) {
                    cell.numFmt = '#,##0.00;[Red]#,##0.00'
                }
            })
        })

        /* The price rows the figures were built from, Fe included — it counts in the
           sum, so it belongs on the sheet. The Ni factor goes in the label when it is
           not 100 %, or the Ni price shown would not reproduce the columns above. */
        const priceRow = (label, p, pct) => {
            const r = {}
            if (showContainer) r.container = ''
            const n = parseFloat(pct) || 100 // 0 / blank count as 100 %, as in perMt
            r.material = n !== 100 ? `${label} $/MT (Ni × ${n}%)` : `${label} $/MT`
            elems.forEach(el => { if (parseFloat(p[el.key])) r[el.key] = parseFloat(p[el.key]) })
            const pr = sheet.addRow(r)
            pr.eachCell(cell => {
                cell.font = { bold: true, color: { argb: 'B45309' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } }
            })
        }
        if (withCost) priceRow(table.costLabel || 'Cost', prices, table.niPercent)
        if (withSales) priceRow(table.salesLabel || 'Sales', salesPrices, table.salesNiPercent)

        const buf = await wb.xlsx.writeBuffer()
        saveAs(new Blob([buf]), `Material_Table.xlsx`)
    }

    return (
        <div>
            <Tltip direction='bottom' tltpText='Export to Excel'>
                <div onClick={exportExcel} className="hover:bg-[var(--selago)] justify-center w-8 h-8 inline-flex items-center responsiveTextTitle rounded-full hover:drop-shadow-md focus:outline-none">
                    <BtnIcon action="excel" className="w-5 h-5" style={{ color: 'var(--endeavour)' }} />
                </div>
            </Tltip>
        </div>
    )
}
