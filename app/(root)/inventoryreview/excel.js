import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import Tooltip from '@components/tooltip';
import { SiMicrosoftexcel } from 'react-icons/si';

const styles = { alignment: { horizontal: 'center', vertical: 'middle',  wrapText: true } }
const wb = new Workbook();
wb.creator = 'IMS';
wb.created = new Date();

let sheet = wb.addWorksheet('Data', { properties: {} },);
sheet.views = [
    { rightToLeft: false }
];

export const EXD = (dataTable, getD, settings, name) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { header: 'Supplier', key: 'supplier', width: 30, style: styles },
            { header: 'PO#', key: 'order', width: 20, style: styles },
            { header: 'PURCHASE QTY/MT', key: 'conQnty', width: 14, style: styles },
            { header: 'Invoices QTY/MT', key: 'shipped', width: 14, style: styles },
            { header: 'Remaining QTY / MT', key: 'remaining', width: 14, style: styles },
            { header: 'Stocks', key: 'stocks', width: 25, style: styles },
        ]

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
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                order: item.order,
                conQnty: { formula: item.conQnty, result: Number(item.conQnty) },
                shipped: { formula: item.shipped, result: Number(item.shipped) },
                remaining: { formula: item.remaining, result: Number(item.remaining) },
                stocks: item.stocks.map(element => {
                    const words = element.props.children.split(/\s+/);
                    return words.length > 1 ? words.join(' ') : element.props.children;
                }).join(', '),
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value) {
                    row.getCell(colNumber).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            });
        });

        const firstColumn = sheet.getColumn('supplier'); // Assuming 'A' is the key for the first column
        const maxLength = firstColumn.values.reduce((max, value) => Math.max(max, value ? value.toString().length : 0), 0);
        firstColumn.width = Math.min(30, Math.max(10, maxLength * 1.2)); // Adjust the multiplier for better results


        const lastColumn = sheet.getColumn('stocks'); // Assuming 'A' is the key for the first column
        const maxLength1 = lastColumn.values.reduce((max, value) => Math.max(max, value ? value.toString().length : 0), 0);
        lastColumn.width = Math.min(30, Math.max(10, maxLength1 * 1.2)); // Adjust the multiplier for better results

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `${name}.xlsx`)
    }



    return (
        <div>
            <button onClick={() => exportExcel()}
                className="group hover:bg-slate-200 text-slate-700 justify-center w-10 h-10 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none"
            >
                <SiMicrosoftexcel className="scale-[1.4] text-gray-500" />
                <Tooltip txt='Excel' />
            </button>
        </div>
    );
}
