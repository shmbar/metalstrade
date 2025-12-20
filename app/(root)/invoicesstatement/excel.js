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

function getNumFmtForCurrency1(currency) {

    switch (currency) {
        case 'usd':
            return '$';
        case 'eur':
            return '€';
        // Add more cases for other currencies as needed
        default:
            return ''; // Default to empty string
    }
}

//{ font: { bold: true }
export const EXD = (dataTable, settings, name, ln, dtSumSupplers, dtSumClients) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'supplier', header: 'Supplier', width: 16, style: styles },
            { key: 'originSupplier', header: 'Original supplier', width: 16, style: styles },
            { key: 'supInvoices', header: 'Supplier inv', width: 16, style: styles },
            { key: 'expType', header: 'Invoice Type', width: 14, style: styles },
            { key: 'invAmount', header: 'Invoices amount', width: 14, style: styles },
            { key: 'pmntAmount', header: 'Prepayment', width: 14, style: styles },
            { key: 'blnc', header: 'Balance', width: 14, style: styles },

            { key: 'InvNum', header: 'Invoice #', width: 12, style: styles },
            { key: 'dateInv', header: 'Date', width: 16, style: styles },
            { key: 'client', header: 'Consignee', width: 16, style: styles },
            { key: 'totalInvoices', header: 'Amount', width: 15, style: styles },
            { key: 'prepaidPer', header: 'Prepaid %', width: 12, style: styles },
            { key: 'totalPrepayment1', header: 'Prepaid Amount', width: 15, style: styles },
            { key: 'inDebt', header: 'Initial Debt', width: 15, style: styles },
            { key: 'cmnts', header: 'Comments', width: 15, style: styles },

            { key: 'rcvd', header: 'Outturn', width: 13, style: styles },
            { key: 'fnlzing', header: 'Finalized', width: 13, style: styles },
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
            const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

            sheet.addRow({
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier)?.nname,
                originSupplier: settings.Supplier.Supplier.find(q => q.id === item.originSupplier)?.nname,
                supInvoices: Array.isArray(item.supInvoices) ? item.supInvoices.map(x => x).join('\n') : item.supInvoices,
                expType: item.expType !== 'Commercial' ? gQ(item.expType, 'Expenses', 'expType') : 'Commercial',
                invAmount: item.invAmount * 1,
                pmntAmount: item.pmntAmount,
                blnc: item.blnc,
                InvNum: item.InvNum,
                dateInv: item.dateInv === '' ? '' : dateFormat(item.dateInv, 'dd-mmm-yy'),
                client: item.client !== '' ? settings.Client.Client.find(q => q.id === item.client)?.nname : '',
                totalInvoices: item.totalInvoices,
                prepaidPer: item.prepaidPer,
                totalPrepayment1: item.totalPrepayment1,
                inDebt: item.inDebt,
                cmnts: item.cmnts,

                rcvd: item.rcvd === '' || item.rcvd == null ? '' : OutTurn.find(x => x.id === item.rcvd).rcvd,
                fnlzing: item.fnlzing === '' || item.fnlzing == null ? '' : Finalizing.find(x => x.id === item.fnlzing).fnlzing,
                status: item.status === '' || item.status == null ? '' : relStts.find(x => x.id === item.status).status,
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

                let cArr1 = [5, 6, 7, 11, 13, 14]
                if (cArr1.includes(colNumber) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = colNumber < 11 ? getNumFmtForCurrency(item.cur) : getNumFmtForCurrency(item.curInvoice)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}#,##0.00`
                }

                if (rowNumber !== 1) {
                    let obj = dataTable[rowNumber - 2]

                    if (((obj.type === 'exp' && obj.invData.paid === '111') ||
                        (obj.type === 'con' && obj.pmntAmount > 0)) && colNumber < 6
                    ) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: '92D050'
                            }
                        }
                    }

                    if (
                        obj.type === 'con' && obj.pmntAmount > 0 && obj.blnc === 0 && colNumber === 6
                    ) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: '92D050'
                            }
                        }
                    }


                    if (obj.type === 'con' && obj.totalPrepayment1 > 0 && colNumber < 14 && colNumber > 7) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: '92D050'
                            }
                        }
                    }

                    if (obj.type === 'con' && obj.totalInvoices > 0 && obj.inDebt === 0 && colNumber === 14) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: '92D050'
                            }
                        }
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


        let startSummary = dataTable.length + 3
        sheet.getCell('A' + startSummary).value = 'Summary';
        sheet.getCell('A' + startSummary).font = {
            size: 13,
            bold: true
        };

        const arrLength = dtSumSupplers.length > dtSumClients.length ? dtSumSupplers.length : dtSumClients.length;

        for (let i = 0; i < arrLength; i++) {
            let itemS = dtSumSupplers[i]
            let itemC = dtSumClients[i]

            sheet.addRow({
                supplier: itemS && settings.Supplier.Supplier.find(q => q.id === itemS.supplier)?.nname,
                invAmount: itemS && itemS.invAmount * 1,
                pmntAmount: itemS && itemS.pmntAmount,
                blnc: itemS && itemS.blnc,

                client: itemC && itemC.client !== '' ? settings.Client.Client.find(q => q.id === itemC.client)?.nname : '',
                totalInvoices: itemC && itemC.totalInvoices,
                totalPrepayment1: itemC && itemC.totalPrepayment1,
                inDebt: itemC && itemC.inDebt,
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {

                let cArr1 = [5, 6, 7, 11, 13, 14]
                if (cArr1.includes(colNumber) && rowNumber > startSummary) {
                    let item = colNumber <= 6 ? dtSumSupplers[rowNumber - startSummary - 1] : dtSumClients[rowNumber - startSummary - 1]
                    let sym = getNumFmtForCurrency1(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}#,##0.00`
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
