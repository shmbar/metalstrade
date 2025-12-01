import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import { SiMicrosoftexcel } from 'react-icons/si';
import dateFormat from "dateformat";
import { OutTurn, Finalizing, relStts } from '@components/const'
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
export const EXD = (dataTable, settings, name, ln) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'invoice', header: 'Invoice', width: 14, style: styles },
            { key: 'date', header: 'Date', width: 16, style: styles },
            { key: 'amount', header: 'Amount', width: 16, style: styles },
            { key: 'cur', header: 'Currency', width: 15, style: styles },
            { key: 'due', header: 'Due Payment', width: 12, style: styles },
            { key: 'paid', header: 'Paid', width: 15, style: styles },
            { key: 'notPaid', header: 'Unpaid', width: 15, style: styles },
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
                invoice: item.invoice,
                date: dateFormat(item.date, 'dd-mm-yy'),
                amount: item.amount,
                cur: settings.Currency.Currency.find(q => q.id === item.cur)?.cur,
                due: dateFormat(item.due, 'dd-mm-yy'),
                paid: item.paid,
                notPaid: item.notPaid
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

                let cArr1 = [3, 6, 7]
                if (cArr1.includes(colNumber) && rowNumber > 1) {
                    row.getCell(colNumber).numFmt = `#,##0.00;-#,##0.00`
                }

                let cArr2 = [7]
                if (cArr2.includes(colNumber) && rowNumber > 1) {
                    const cell = row.getCell(colNumber);
                    if (cell.value > 5) {
                        cell.font = { bold: true, size: 12, color: { argb: 'FFFF0000' } };

                    }
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
