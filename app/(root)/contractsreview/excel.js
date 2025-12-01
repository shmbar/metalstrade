import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import { SiMicrosoftexcel } from 'react-icons/si';
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';


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
        case 'us':
            return '$';
        case 'eu':
            return '€';
        // Add more cases for other currencies as needed
        default:
            return ''; // Default to empty string
    }
}

//{ font: { bold: true }
export const EXD = (dataTable, settings, name, ln, valCur) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'date', header: 'Date', width: 15, style: styles },
            { key: 'order', header: 'PO#', width: 15, style: styles },
            { key: 'supplier', header: 'Supplier', width: 16, style: styles },
            { key: 'conValue', header: 'Purchase Value', width: 15, style: styles },
            { key: 'totalInvoices', header: 'Inv Value Sales', width: 15, style: styles },
            { key: 'deviation', header: 'Deviation', width: 15, style: styles },
            { key: 'prepaidPer', header: 'Prepaid %', width: 12, style: styles },
            { key: 'totalPrepayment1', header: 'Prepaid Amount', width: 15, style: styles },
            { key: 'inDebt', header: 'Initial Debt', width: 15, style: styles },
            { key: 'payments', header: 'Actual Payment', width: 15, style: styles },
            { key: 'debtaftr', header: 'Debt After Prepayment', width: 15, style: styles },
            { key: 'debtBlnc', header: 'Debt Balance', width: 15, style: styles },
            { key: 'expenses1', header: 'Expenses', width: 15, style: styles },
            { key: 'profit', header: 'Profit', width: 15, style: styles },
        ];

        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '800080' }
            }
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };  // Font color to white
        });


        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                date: dateFormat(item.dateRange.startDate, 'dd-mmm-yy'),
                order: item.order,
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                conValue: valCur.cur === 'us' ? item.conValue : item.conValue / item.euroToUSD,
                totalInvoices: valCur.cur === 'us' ? item.totalInvoices : item.totalInvoices / item.euroToUSD,
                deviation: valCur.cur === 'us' ? item.deviation : item.deviation / item.euroToUSD,
                prepaidPer: item.prepaidPer,
                totalPrepayment1: valCur.cur === 'us' ? item.totalPrepayment1 : item.totalPrepayment1 / item.euroToUSD,
                inDebt: valCur.cur === 'us' ? item.inDebt : item.inDebt / item.euroToUSD,
                payments: valCur.cur === 'us' ? item.payments : item.payments / item.euroToUSD,
                debtaftr: valCur.cur === 'us' ? item.debtaftr : item.debtaftr / item.euroToUSD,
                debtBlnc: valCur.cur === 'us' ? item.debtBlnc : item.debtBlnc / item.euroToUSD,
                expenses1: valCur.cur === 'us' ? item.expenses1 : item.expenses1 / item.euroToUSD,
                profit: valCur.cur === 'us' ? item.profit : item.profit / item.euroToUSD,
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value || cell.value === '' || cell.value === 0) {
                    row.getCell(colNumber).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }

                let cArr = [4, 5, 6, 8, 9, 10, 11, 12, 13, 14]
                if (cArr.includes(colNumber) && rowNumber > 1) {
                    let sym = getNumFmtForCurrency(valCur.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]-$#,##0.00`
                }
            });
        });

        //in Case I want to merge
        //     sheet.mergeCells('A5:A6');
        //     sheet.getCell('A5').style.alignment = { horizontal: 'center', vertical: 'middle' }

        // const cols = sheet.columns.map(z => z.key)

        // for (let z in cols) {
        //     const firstColumn = sheet.getColumn(cols[z]); // Assuming 'A' is the key for the first column
        //     const maxLength = firstColumn.values.reduce((max, value) => Math.max(max, value ? value.toString().length : 0), 0);
        //     firstColumn.width = Math.min(12, Math.max(40, maxLength * 1.2)); // Adjust the multiplier for better results
        // }


        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `${name}.xlsx`)
    }



    return (
        <div>
            <Tltip direction='bottom' tltpText={getTtl('Excel', ln)}>
                <div onClick={() => exportExcel()}
                    className="hover:bg-slate-200 text-slate-700 justify-center w-10 h-10 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none"
                >
                    <SiMicrosoftexcel className="scale-[1.4] text-gray-500" />
                </div>
            </Tltip>
        </div>
    );
}
