import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import { SiMicrosoftexcel } from 'react-icons/si';
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';


const styles = { alignment: { horizontal: 'center', vertical: 'middle' } }
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

export const EXD = (dataTable, settings, name, ln) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'lstSaved', header: 'Last Saved', width: 30, style: styles },
            { key: 'supplier', header: 'Vendor', width: 30, style: styles },
            { key: 'date', header: 'Date', width: 30, style: styles },
            { key: 'invoice', header: 'Sales Invoice#', width: 35, style: styles },
            { key: 'order', header: 'Supplier PO#', width: 30, style: styles },
            { key: 'cur', header: 'Currency', width: 30, style: styles },
            { key: 'amount', header: 'Amount', width: 30, style: styles },
            { key: 'expense', header: 'Expense Invoice', width: 30, style: styles },
            { key: 'expType', header: 'Expense Type', width: 30, style: styles },
            { key: 'paid', header: 'Paid/Unpaid', width: 30, style: styles },
            { key: 'comments', header: 'Comments', width: 50, style: styles },

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
                lstSaved: dateFormat(item.lstSaved, 'dd-mmm-yy HH:MM'),
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                date: dateFormat(item.dateRange.startDate, 'dd-mmm-yy'),
                invoice: item.salesInv,
                order: item.poSupplierOrder,
                cur: settings.Currency.Currency.find(q => q.id === item.cur).cur,
                amount: item.amount * 1,
                expense: item.expense,
                expType: settings.Expenses.Expenses.find(q => q.id === item.expType).expType,
                paid: item.paid === '111' ? 'Paid' : item.paid === '222' ? 'Unpaid' : '',
                comments: item.comments
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value || cell.value === '') {
                    row.getCell(colNumber).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
                if ((colNumber === 7) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]-$#,##0.00`
                }
            });
        });



        const cols = sheet.columns.map(z => z.key)

        for (let z in cols) {
            const firstColumn = sheet.getColumn(cols[z]); // Assuming 'A' is the key for the first column
            const maxLength = firstColumn.values.reduce((max, value) => Math.max(max, value ? value.toString().length : 0), 0);
            firstColumn.width = Math.min(30, Math.max(10, maxLength * 1.2)); // Adjust the multiplier for better results
        }


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
