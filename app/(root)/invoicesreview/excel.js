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
export const EXD = (dataTable, settings, name, ln, totals) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'order', header: 'PO#', width: 14, style: styles },
            { key: 'supplier', header: 'Supplier', width: 16, style: styles },
            { key: 'supplierInv', header: 'Supplier inv', width: 16, style: styles },
            { key: 'supplierInvAmount', header: 'Sup Inv amount', width: 14, style: styles },
            { key: 'supplierPrepayment', header: 'Sup Prepayment', width: 14, style: styles },
            { key: 'supBlnc', header: 'Balance', width: 14, style: styles },

            { key: 'invoice', header: 'Sales Invoice', width: 12, style: styles },
            { key: 'client', header: 'Consignee', width: 16, style: styles },
            { key: 'totalInvoices', header: 'Inv Value Sales', width: 15, style: styles },
            { key: 'prepaidPer', header: 'Prepaid %', width: 12, style: styles },
            { key: 'totalPrepayment1', header: 'Prepaid Amount', width: 15, style: styles },
            { key: 'debtaftr', header: 'Debt After Prepayment', width: 15, style: styles },

            { key: 'status', header: 'Release Status', width: 15, style: styles },
            { key: 'etd', header: 'ETD', width: 14, style: styles },
            { key: 'eta', header: 'ETA', width: 14, style: styles },

            { key: 'rcvd', header: 'Outturn', width: 13, style: styles },
            { key: 'outtrnAmnt', header: 'Outturn Amount', width: 13, style: styles },
            { key: 'deviation', header: 'Deviation', width: 15, style: styles },
            { key: 'debtBlnc', header: 'Debt Balance', width: 15, style: styles },
            { key: 'cn', header: 'Credit/Final Note', width: 14, style: styles },
            { key: 'fnlzing', header: 'Finalized', width: 13, style: styles },



            { key: 'inDebt', header: 'Initial Debt', width: 15, style: styles },
            { key: 'payments', header: 'Actual Payment', width: 15, style: styles },


        ];



        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: colNumber <= 6 ? '30CA06' :
                        colNumber > 6 && colNumber <= 12 ? 'FFC000' :
                            colNumber > 12 && colNumber <= 15 ? '7030A0' :
                                colNumber > 15 && colNumber <= 21 ? '0070C0' : '808080'
                }
            }
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };  // Font color to white
        });


        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                order: item.order,
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                supplierInv: item.supplierInv.map(x => x).join('\n'),
                supplierInvAmount: item.supplierInvAmount.map(Number).reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                }, 0),
                supplierPrepayment: item.supplierPrepayment.map(Number).reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                }, 0),
                supBlnc: item.supBlnc.map(Number).reduce((accumulator, currentValue) => {
                    return accumulator + currentValue;
                }, 0),

                invoice: item.invoice,
                client: item.final ? item.client.nname : settings.Client.Client.find(q => q.id === item.client).nname,
                totalInvoices: item.totalAmount,
                prepaidPer: item.prepaidPer,
                totalPrepayment1: item.totalPrepayment1,
                debtaftr: item.debtaftr,

                status: item.status === '' ? '' : relStts.find(x => x.id === item.status).status,
                etd: item.etd === '' ? '' : dateFormat(item.etd, 'dd-mmm-yy'),
                eta: item.eta === '' ? '' : dateFormat(item.eta, 'dd-mmm-yy'),

                rcvd: item.rcvd === '' ? '' : OutTurn.find(x => x.id === item.rcvd).rcvd,
                outtrnAmnt: item.outrnamnt * 1,
                deviation: item.deviation,
                debtBlnc: item.debtBlnc,
                cn: item.cn,
                fnlzing: item.fnlzing === '' ? '' : Finalizing.find(x => x.id === item.fnlzing).fnlzing,

                inDebt: item.inDebt,
                payments: item.payments,
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

                let cArr1 = [4, 5, 6]
                if (cArr1.includes(colNumber) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = getNumFmtForCurrency(item.poCur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}#,##0.00`
                }

                let cArr2 = [9, 11, 12, 17, 18, 19, 22, 23]
                if (cArr2.includes(colNumber) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}#,##0.00`
                }
            });
        });

        const numRowsToInsert = 2;

        // Insert empty rows at the top
        sheet.spliceRows(1, 0, ...Array(numRowsToInsert).fill([]));

        // Now row 1 and 2 are empty, existing table is pushed down
        // You can now add your Totals/Sub Totals in row 1 & 2
        let us = totals[0].us
        let eu = totals[1].eu
        sheet.getRow(1).values = ["Total $:", '', '', us.supplierInvAmount, us.supplierPrepayment, us.supBlnc,
            '', '', us.totalAmount, us.prepaidPer, us.totalPrepayment1, us.debtaftr, '', '', '', '', '',
            us.deviation, us.debtBlnc, '', '', us.inDebt, us.payments
        ];
        sheet.getRow(2).values = ["Total €:", '', '', eu.supplierInvAmount, eu.supplierPrepayment, eu.supBlnc,
            '', '', eu.totalAmount, eu.prepaidPer, eu.totalPrepayment1, eu.debtaftr, '', '', '', '', '',
            eu.deviation, eu.debtBlnc, '', '', eu.inDebt, eu.payments];


        sheet.eachRow((row, rowNumber) => {
            if (rowNumber <= 2) {   // ✅ only totals & subtotals
                row.eachCell((cell, colNumber) => {
                    if (cell.value || cell.value === '' || cell.value === 0) {
                        row.getCell(colNumber).border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    }
                    cell.font = { bold: true };  // Font color to white
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'BFDBFE' } // ARGB: A=Alpha, R=Red, G=Green, B=Blue
                    };
                    // Apply numeric formatting if needed
                    let cArr1 = [4, 5, 6, 9, 11, 12, 18, 19, 22, 23];
                    if (cArr1.includes(colNumber)) {
                        const cur = rowNumber === 1 ? '$' : '€'
                        row.getCell(colNumber).numFmt = `${cur}#,##0.00;[Red]${cur}#,##0.00`;
                    }
                });
            }
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
