import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import Tooltip from '@components/tooltip';
import { SiMicrosoftexcel } from 'react-icons/si';
import dateFormat from "dateformat";
import { OutTurn, Finalizing, relStts } from '@components/const'

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
export const EXD = (dataTable, settings, name) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'order', header: 'PO#', width: 14, style: styles },
            { key: 'supplier', header: 'Supplier', width: 16, style: styles },
            { key: 'client', header: 'Consignee', width: 16, style: styles },
            { key: 'invoice', header: 'Invoice', width: 12, style: styles },
            { key: 'cn', header: 'Credit/Final Note', width: 14, style: styles },
            { key: 'totalInvoices', header: 'Inv Value Sales', width: 15, style: styles },
            { key: 'deviation', header: 'Deviation', width: 15, style: styles },
            { key: 'prepaidPer', header: 'Prepaid %', width: 12, style: styles },
            { key: 'totalPrepayment1', header: 'Prepaid Amount', width: 15, style: styles },
            { key: 'inDebt', header: 'Initial Debt', width: 15, style: styles },
            { key: 'payments', header: 'Actual Payment', width: 15, style: styles },
            { key: 'debtaftr', header: 'Debt After Prepayment', width: 15, style: styles },
            { key: 'debtBlnc', header: 'Debt Balance', width: 15, style: styles },

            { key: 'rcvd', header: 'Outturn', width: 13, style: styles },
            { key: 'fnlzing', header: 'Finalizing', width: 13, style: styles },
            { key: 'status', header: 'Release Status', width: 15, style: styles },
            { key: 'etd', header: 'ETD', width: 14, style: styles },
            { key: 'eta', header: 'ETA', width: 14, style: styles },
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
                order: item.order,
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                client: settings.Client.Client.find(q => q.id === item.client).nname,
                invoice: item.invoice,
                cn: item.cn,
                totalInvoices: item.totalAmount,
                deviation: item.deviation,
                prepaidPer: item.prepaidPer,
                totalPrepayment1: item.totalPrepayment1,
                inDebt: item.inDebt,
                payments: item.payments,
                debtaftr: item.debtaftr,
                debtBlnc: item.debtBlnc,

                rcvd: item.rcvd === '' ? '' : OutTurn.find(x => x.id === item.rcvd).rcvd,
                fnlzing: item.fnlzing === '' ? '' : Finalizing.find(x => x.id === item.fnlzing).fnlzing,
                status: item.status === '' ? '' : relStts.find(x => x.id === item.status).status,
                etd: item.etd === '' ? '' : dateFormat(item.etd, 'dd-mmm-yy'),
                eta: item.eta === '' ? '' : dateFormat(item.eta, 'dd-mmm-yy'),
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

                let cArr = [6, 7, 9, 10, 11, 12, 13, 14]
                if (cArr.includes(colNumber) && rowNumber > 1) {
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
