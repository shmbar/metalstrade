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
            { key: 'date', header: 'Date', width: 15, style: styles },
            { key: 'order', header: 'PO#', width: 14, style: styles },
            { key: 'supplier', header: 'Supplier', width: 16, style: styles },
            { key: 'poWeight', header: 'PO Weight MT', width: 14, style: styles },
            { key: 'description', header: 'Material', width: 20, style: styles },
            { key: 'unitPrc', header: 'Purchase Price', width: 16, style: styles },
            { key: 'salesPrice', header: 'Sales Price', width: 10, style: styles },
            { key: 'shiipedWeight', header: 'Shipped Weight MT', width: 20, style: styles },
            { key: 'remaining', header: 'Remaining Weight MT', width: 16, style: styles },
            { key: 'client', header: 'Consignee', width: 16, style: styles },
            { key: 'totalPo', header: 'PO Client', width: 16, style: styles },
            { key: 'destination', header: 'Destination', width: 16, style: styles },
            { key: 'comments', header: 'Comments/Status', width: 30, style: styles },

        ];



        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: '3B66C5'
                }
            }
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };  // Font color to white
        });


        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                date: dateFormat(item.date, 'dd-mmm-yy'),
                order: item.order,
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                poWeight: item.poWeight * 1,
                description: item.description,
                unitPrc: isNaN(item.unitPrc * 1) ? item.unitPrc : item.unitPrc * 1,
                salesPrice: '',
                shiipedWeight: item.shiipedWeight,
                remaining: item.remaining,
                client: item.client.map(x => x).join('\n'),
                totalPo: item.totalPo.map(x => x).join('\n'),
                destination: item.destination.map(x => x).join('\n'),
                comments: item.comments,
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

                let cArr3 = [4, 8, 9]
                if (cArr3.includes(colNumber) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    row.getCell(colNumber).numFmt = `#,##0.000;[Red]#,##0.00`
                }


                let cArr1 = [6]
                if (cArr1.includes(colNumber) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}#,##0.00`
                }

                let cArr2 = [11, 12, 17, 18, 19, 22, 23]
                if (cArr2.includes(colNumber) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}#,##0.00`
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
