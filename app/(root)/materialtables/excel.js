import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import Tltip from '../../../components/tlTip';
import { FileSpreadsheet } from 'lucide-react';
import { DEFAULT_ELEMENTS, UNIT_LABELS } from './constants';

const styles = { alignment: { horizontal: 'center', vertical: 'middle' } }

export const EXD = (table) => {

    const exportExcel = async () => {
        const dataTable = table.data || []
        const elems = table.elements || DEFAULT_ELEMENTS
        const unit = table.unit || 'kgs'
        const unitLabel = UNIT_LABELS[unit] || 'Kgs'
        const prices = table.prices || {}

        const wb = new Workbook();
        wb.creator = 'IMS';
        wb.created = new Date();
        const sheet = wb.addWorksheet('Data', { properties: {} });
        sheet.views = [{ rightToLeft: false }];

        sheet.columns = [
            { key: 'material', header: 'Material', width: 40, style: styles },
            { key: 'kgs', header: unitLabel, width: 10, style: styles },
            ...elems.map(el => ({ key: el.key, header: el.label, width: 8, style: styles })),
        ];

        // Style header row
        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern', pattern: 'solid',
                fgColor: colNumber <= 2 ? { argb: 'A6C9EC' } : { argb: 'F7C7AC' }
            }
            cell.font = { bold: true, size: 12, color: { argb: '000000' } };
        });

        // Data rows
        for (let i = 0; i < dataTable.length; i++) {
            const item = dataTable[i]
            const row = { material: item.material, kgs: item.kgs * 1 }
            elems.forEach(el => { row[el.key] = parseFloat(item[el.key]) || 0 })
            sheet.addRow(row)
        }

        // Totals row
        const totalKgs = dataTable.reduce((sum, item) => sum + Number(item.kgs), 0)
        const totRow = { material: '', kgs: totalKgs }
        elems.forEach(el => {
            const weightedSum = dataTable.reduce((sum, row) => sum + (parseFloat(row[el.key] || 0) * Number(row.kgs)), 0)
            totRow[el.key] = totalKgs > 0 ? parseFloat((weightedSum / totalKgs).toFixed(2)) : 0
        })
        sheet.addRow(totRow)

        // Cell styling
        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                row.getCell(colNumber).border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                };
                if (colNumber <= 2) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'A6C9EC' } }
                    cell.font = { bold: rowNumber === 1 || rowNumber === dataTable.length + 2 }
                }
                if (rowNumber === dataTable.length + 2 && colNumber > 2) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F7C7AC' } }
                    cell.font = { bold: true }
                }
                if (colNumber >= 2) {
                    row.getCell(colNumber).numFmt = `#,##0.00;[Red]#,##0.00`
                }
            });
        });

        // Prices row (if any prices set)
        const hasPrices = elems.some(el => prices[el.key])
        if (hasPrices) {
            const priceRow = { material: '$/MT' }
            elems.forEach(el => { priceRow[el.key] = parseFloat(prices[el.key]) || 0 })
            const pr = sheet.addRow(priceRow)
            pr.eachCell((cell, colNumber) => {
                cell.font = { bold: true, color: { argb: 'B45309' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } }
                row => row.getCell(colNumber).border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' }
                }
            })
        }

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `Material_Table.xlsx`)
    }

    return (
        <div>
            <Tltip direction='bottom' tltpText='Excel'>
                <div onClick={() => exportExcel()}
                    className="hover:bg-[var(--selago)] justify-center w-8 h-8 inline-flex items-center text-sm rounded-full hover:drop-shadow-md focus:outline-none"
                >
                    <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--endeavour)' }} strokeWidth={2} />
                </div>
            </Tltip>
        </div>
    );
}
