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

export const EXD = (dataTable, settings, name, ln, sumData) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'order', header: 'PO#', width: 15, style: styles },
            { key: 'supplier', header: 'Supplier', width: 15, style: styles },
            { key: 'descriptionName', header: 'Description', width: 40, style: styles },
            { key: 'qTypeTable', header: 'Weight Type', width: 14, style: styles },
            { key: 'qnty', header: 'Quantity', width: 14, style: styles },
            { key: 'unitPrc', header: 'Price', width: 14, style: styles },
            { key: 'total', header: 'Final Value', width: 15, style: styles },
            { key: 'stock', header: 'Stock', width: 20, style: styles },
            { key: 'sType', header: 'Stock type', width: 20, style: styles },
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
                order: item.order === '' ? '' : item.order,
                supplier:  settings.Supplier.Supplier.find(q => q.id === item.supplier)?.nname,
                descriptionName: item.descriptionName === '' ? '' : item.descriptionName,
                qTypeTable: settings.Quantity.Quantity.find(q => q.id === item.qTypeTable)?.qTypeTable || '',
                qnty: item.qnty * 1,
                unitPrc: isNaN(item.unitPrc) ? '' : item.unitPrc * 1,
                total: isNaN(item.total) ? '' : (item?.total || ''),
                stock: settings.Stocks.Stocks.find(q => q.id === item.stock)?.nname,
                sType: item.sType
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value || cell.value === '' || cell.value == undefined || cell.value === 0
                    || cell.value === '-') {
                    row.getCell(colNumber).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }

                if ((colNumber === 6 || colNumber === 7) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]$#,##0.00`
                }
                if (colNumber === 5 && rowNumber > 1) {
                    row.getCell(colNumber).numFmt = `#,##0.000;[Red]#,##0.000`
                }
            });
        });

        //in Case I want to merge
        //     sheet.mergeCells('A5:A6');
        //     sheet.getCell('A5').style.alignment = { horizontal: 'center', vertical: 'middle' }


        let startSummary = dataTable.length + 3
        sheet.getCell('A' + startSummary).value = 'Summary';
        sheet.getCell('A' + startSummary).font = {
            size: 13,
            bold: true
        };

        const arrLength = sumData.length;

        for (let i = 0; i < arrLength; i++) {

            let item = sumData[i]

            sheet.addRow({
                stock: item && item.stock !== '' ? settings.Stocks.Stocks.find(q => q.id === item.stock)?.stock : '',
                qTypeTable: item && item.qTypeTable !== '' ? settings.Quantity.Quantity.find(q => q.id === item.qTypeTable).qTypeTable : '',
                qnty: item && item.qnty * 1,
                total: item && item.total * 1,
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (colNumber === 5 && rowNumber > startSummary) {
                    row.getCell(colNumber).numFmt = `#,##0.000;[Red]#,##0.000`
                }
                if ((colNumber === 7) && rowNumber > startSummary) {
                    let item = sumData[rowNumber - startSummary - 1]
                    let sym = getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]$#,##0.00`
                }

            })
        })


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
