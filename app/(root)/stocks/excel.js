import React from 'react'
import { saveAs } from 'file-saver';
// exceljs is dynamically imported inside exportExcel to keep it off the first-load bundle.
import { getTtl } from '../../../utils/languages';
import Tltip from '../../../components/tlTip';
import { FileSpreadsheet } from 'lucide-react';
import { computeGradeSummary } from './sumtables/gradeTable';

const styles = { alignment: { horizontal: 'center', vertical: 'middle', wrapText: true } }
// wb / sheet are now created lazily inside exportExcel — see Edit 3.

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
    // _pre = a combined row: it holds display names already, because a grade can
    // span several suppliers and warehouses and has no single id left to look up.
    supplier:       { width: 20, isQty: false, isCurrency: false, getValue: (item, settings) => item._pre ? (item.supplier || '') : (settings.Supplier.Supplier.find(q => q.id === item.supplier)?.nname || '') },
    originSupplier: { width: 20, isQty: false, isCurrency: false, getValue: (item) => item.originSupplier || '' },
    stock:          { width: 20, isQty: false, isCurrency: false, getValue: (item, settings) => item._pre ? (item.stock || '') : (settings.Stocks.Stocks.find(q => q.id === item.stock)?.nname || '') },
    descriptionName:{ width: 40, isQty: false, isCurrency: false, getValue: (item) => item.descriptionName || '' },
    qnty:           { width: 14, isQty: true,  isCurrency: false, getValue: (item) => item.qnty * 1 },
    qTypeTable:     { width: 14, isQty: false, isCurrency: false, getValue: (item, settings) => item._pre ? (item.qTypeTable || '') : (settings.Quantity.Quantity.find(q => q.id === item.qTypeTable)?.qTypeTable || '') },
    unitPrc:        { width: 14, isQty: false, isCurrency: true,  getValue: (item) => isNaN(item.unitPrc) ? '' : item.unitPrc * 1 },
    total:          { width: 15, isQty: false, isCurrency: true,  getValue: (item) => isNaN(item.total) ? '' : (item?.total || '') },
    sType:          { width: 20, isQty: false, isCurrency: false, getValue: (item) => item.sType || '' },
};

export const EXD = (dataTable, settings, name, ln, sumData, columnVisibility = {}, allColumns = []) => {

    const exportExcel = async () => {

        const { Workbook } = await import('exceljs');
        const wb = new Workbook();
        wb.creator = 'IMS';
        wb.created = new Date();
        const sheet = wb.addWorksheet('Data', { properties: {} });
        sheet.views = [{ rightToLeft: false }];

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

        // ---- Grand total of the (filtered) stock ----
        // The per-warehouse summary alone left the report without a bottom line.
        // One bold "Total stock" row per currency, right under the summary.
        const stockIdx = visibleCols.findIndex(c => c.accessorKey === 'stock') + 1;
        const totalsByCur = {};
        sumData.forEach(it => {
            if (!it) return;
            const cur = it.cur || 'us';
            if (!totalsByCur[cur]) totalsByCur[cur] = { qnty: 0, total: 0 };
            totalsByCur[cur].qnty += it.qnty * 1 || 0;
            totalsByCur[cur].total += it.total * 1 || 0;
        });
        const curKeys = Object.keys(totalsByCur);
        curKeys.forEach((cur) => {
            const r = sheet.addRow({
                stock: curKeys.length > 1 ? `Total stock (${cur === 'eu' ? 'EUR' : 'USD'})` : 'Total stock',
                qnty: totalsByCur[cur].qnty,
                total: totalsByCur[cur].total,
            });
            r.font = { bold: true };
            [stockIdx, qntyIdx, totalIdx].forEach(ci => {
                if (ci > 0) r.getCell(ci).border = {
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' },
                };
            });
            if (qntyIdx > 0) r.getCell(qntyIdx).numFmt = `#,##0.000;[Red]#,##0.000`;
            if (totalIdx > 0) {
                const sym = getNumFmtForCurrency(cur);
                r.getCell(totalIdx).numFmt = `${sym}#,##0.00;[Red]$#,##0.00`;
            }
        });

        // ---- Avg Cost Price per Grade (separate sheet) ----
        // Total weight + weighted average cost per MT for each grade, based on the
        // same (filtered) rows shown in the table.
        const gradeRows = computeGradeSummary(dataTable, settings);
        if (gradeRows.length > 0) {
            const gSheet = wb.addWorksheet('Avg Cost per Grade');
            gSheet.views = [{ rightToLeft: false }];
            gSheet.columns = [
                { key: 'descriptionName', header: 'Description', width: 45, style: styles },
                { key: 'totalQnty', header: 'Total Weight (MT)', width: 18, style: styles },
                { key: 'avgPrice', header: 'Avg Cost /MT', width: 16, style: styles },
                { key: 'totalValue', header: 'Total Value', width: 18, style: styles },
                { key: 'cur', header: 'Currency', width: 10, style: styles },
            ];

            gSheet.getRow(1).eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '800080' } };
                cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
            });

            /* The lots behind each grade go in as an OUTLINE level, so the sheet
               opens folded exactly like the table and every grade expands with
               Excel's own +/- in the margin. summaryBelow:false puts the grade
               above the lots it totals, which is the order on screen. */
            gSheet.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

            // Currency is per row and rows are now nested, so the number formats
            // cannot be looked up by position in gradeRows any more.
            const meta = [null]; // index 0 unused; row 1 is the header
            // Typed descriptions carry stray double spaces. HTML collapses those, a
            // spreadsheet cell does not, so they have to come out here.
            const tidy = (s) => String(s || '').replace(/\s+/g, ' ').trim();
            gradeRows.forEach(r => {
                const sym = r.isoCode === 'EUR' ? '€' : '$';
                const lots = r.lots || [];
                gSheet.addRow({
                    // Says how many lots it holds even while the group is collapsed.
                    descriptionName: lots.length > 1
                        ? `${tidy(r.descriptionName)} (${lots.length} lots)`
                        : tidy(r.descriptionName),
                    totalQnty: r.totalQnty,
                    avgPrice: r.avgPrice,
                    totalValue: r.totalValue,
                    cur: sym,
                });
                meta.push({ sym, child: false });

                if (lots.length < 2) return; // nothing the grade row does not already say
                lots.forEach(l => {
                    const name = l.description && l.description !== r.descriptionName
                        ? `${tidy(l.description)} · ${l.supplier}`
                        : l.supplier;
                    const row = gSheet.addRow({
                        descriptionName: `    ${name}`,
                        totalQnty: l.qnty,
                        avgPrice: l.qnty > 0 ? l.value / l.qnty : 0,
                        totalValue: l.value,
                        cur: sym,
                    });
                    row.outlineLevel = 1;
                    meta.push({ sym, child: true });
                });
            });

            // One bold bottom line per currency, matching the card's total row.
            const gTotals = gradeRows.reduce((acc, r) => {
                const k = r.isoCode;
                if (!acc[k]) acc[k] = { isoCode: k, qnty: 0, value: 0 };
                acc[k].qnty += r.totalQnty;
                acc[k].value += r.totalValue;
                return acc;
            }, {});
            Object.values(gTotals).forEach(t => {
                const sym = t.isoCode === 'EUR' ? '€' : '$';
                const row = gSheet.addRow({
                    descriptionName: `Total ${sym}`,
                    totalQnty: t.qnty,
                    totalValue: t.value,
                });
                row.font = { bold: true };
                meta.push({ sym, child: false, total: true });
            });

            gSheet.eachRow((row, rowNumber) => {
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                    const m = meta[rowNumber - 1];
                    if (rowNumber > 1 && m) {
                        if (colNumber === 2) cell.numFmt = `#,##0.000;[Red]#,##0.000`;
                        // Total Value carried no format at all before, so the column
                        // that matters most read as a bare number.
                        if (colNumber === 3 || colNumber === 4) {
                            cell.numFmt = `${m.sym}#,##0.00;[Red]${m.sym}#,##0.00`;
                        }
                        if (m.child) cell.font = { color: { argb: '6E6B84' }, italic: true };
                    }
                });
            });
        }

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `${name}.xlsx`);
    };

    return (
        <div>
            <Tltip direction='bottom' tltpText={getTtl('Excel', ln)}>
                <div onClick={() => exportExcel()}
                    className="hover:bg-[var(--selago)] justify-center w-8 h-8 inline-flex
     items-center responsiveTextTitle rounded-full  hover:drop-shadow-md focus:outline-none"
                >
                    <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--endeavour)' }} strokeWidth={2} />
                </div>
            </Tltip>
        </div>
    );
};
