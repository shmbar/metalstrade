import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import { getTtl } from '../../../utils/languages';
import Tltip from '../../../components/tlTip';
import { FileSpreadsheet } from 'lucide-react';

const styles = { alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } }
const wb = new Workbook();
wb.creator = 'IMS';
wb.created = new Date();

const sheet = wb.addWorksheet('Data', { properties: {} },);
sheet.views = [
    { rightToLeft: false }
];

function getNumFmtForCurrency(currency) {
    switch (currency) {
        case 'us': return '$';
        case 'eu': return '€';
        default: return '';
    }
}

// Per-column Excel metadata
const COL_META = {
    order:          { width: 15, isQty: false, isCurrency: false, getValue: (item) => item.order || '' },
    date:           { width: 15, isQty: false, isCurrency: false, getValue: (item) => item.date || '' },
    supplier:       { width: 20, isQty: false, isCurrency: false, getValue: (item, settings) => settings.Supplier.Supplier.find(q => q.id === item.supplier)?.nname || '' },
    originSupplier: { width: 20, isQty: false, isCurrency: false, getValue: (item) => item.originSupplier || '' },
    stock:          { width: 20, isQty: false, isCurrency: false, getValue: (item, settings) => settings.Stocks.Stocks.find(q => q.id === item.stock)?.nname || '' },
    descriptionName:{ width: 40, isQty: false, isCurrency: false, getValue: (item) => item.descriptionName || '' },
    qnty:           { width: 14, isQty: true,  isCurrency: false, getValue: (item) => item.qnty * 1 },
    qTypeTable:     { width: 14, isQty: false, isCurrency: false, getValue: (item, settings) => settings.Quantity.Quantity.find(q => q.id === item.qTypeTable)?.qTypeTable || '' },
    unitPrc:        { width: 14, isQty: false, isCurrency: true,  getValue: (item) => isNaN(item.unitPrc) ? '' : item.unitPrc * 1 },
    total:          { width: 15, isQty: false, isCurrency: true,  getValue: (item) => isNaN(item.total) ? '' : (item?.total || '') },
    sType:          { width: 20, isQty: false, isCurrency: false, getValue: (item) => item.sType || '' },
};

export const EXD = (dataTable, settings, name, ln, sumData, columnVisibility = {}, allColumns = []) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        // Build visible column list from propDefaults order, filtered by columnVisibility
        const visibleCols = (allColumns.length > 0 ? allColumns : Object.keys(COL_META).map(k => ({ accessorKey: k, header: k })))
            .filter(col => col.accessorKey && COL_META[col.accessorKey])
            .filter(col => columnVisibility[col.accessorKey] !== false)
            .map(col => ({
                accessorKey: col.accessorKey,
                header: typeof col.header === 'string' ? col.header : col.accessorKey,
                ...COL_META[col.accessorKey],
            }));

        sheet.columns = visibleCols.map(col => ({
            key: col.accessorKey,
            header: col.header,
            width: col.width,
            style: styles,
        }));

        sheet.getRow(1).eachCell((cell) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '800080' }
            };
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
        });

        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i];
            let row = {};
            visibleCols.forEach(col => {
                row[col.accessorKey] = col.getValue(item, settings);
            });
            sheet.addRow(row);
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value || cell.value === '' || cell.value == undefined || cell.value === 0 || cell.value === '-') {
                    row.getCell(colNumber).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
                const col = visibleCols[colNumber - 1];
                if (col && rowNumber > 1) {
                    if (col.isCurrency) {
                        let item = dataTable[rowNumber - 2];
                        let sym = getNumFmtForCurrency(item?.cur);
                        row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]$#,##0.00`;
                    }
                    if (col.isQty) {
                        row.getCell(colNumber).numFmt = `#,##0.000;[Red]#,##0.000`;
                    }
                }
            });
        });

        let startSummary = dataTable.length + 3;
        sheet.getCell('A' + startSummary).value = 'Summary';
        sheet.getCell('A' + startSummary).font = { size: 13, bold: true };

        const arrLength = sumData.length;
        for (let i = 0; i < arrLength; i++) {
            let item = sumData[i];
            sheet.addRow({
                stock: item && item.stock !== '' ? settings.Stocks.Stocks.find(q => q.id === item.stock)?.stock : '',
                qTypeTable: item && item.qTypeTable !== '' ? settings.Quantity.Quantity.find(q => q.id === item.qTypeTable)?.qTypeTable : '',
                qnty: item && item.qnty * 1,
                total: item && item.total * 1,
            });
        }

        // Find column indices for summary formatting
        const qntyIdx = visibleCols.findIndex(c => c.accessorKey === 'qnty') + 1;
        const totalIdx = visibleCols.findIndex(c => c.accessorKey === 'total') + 1;

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (rowNumber >= startSummary) {
                    if (cell.value || cell.value === '' || cell.value === 0) {
                        row.getCell(colNumber).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                }
                if (qntyIdx > 0 && colNumber === qntyIdx && rowNumber > startSummary) {
                    row.getCell(colNumber).numFmt = `#,##0.000;[Red]#,##0.000`;
                }
                if (totalIdx > 0 && colNumber === totalIdx && rowNumber > startSummary) {
                    let item = sumData[rowNumber - startSummary - 1];
                    let sym = getNumFmtForCurrency(item?.cur);
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]$#,##0.00`;
                }
            });
        });

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `${name}.xlsx`);
    };

    return (
        <div>
            <Tltip direction='bottom' tltpText={getTtl('Excel', ln)}>
                <div onClick={() => exportExcel()}
                    className="hover:bg-[var(--selago)] justify-center w-8 h-8 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none"
                >
                    <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--endeavour)' }} strokeWidth={2} />
                </div>
            </Tltip>
        </div>
    );
};
