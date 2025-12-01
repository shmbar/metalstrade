import React from 'react'
import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import Tooltip from '@components/tooltip';
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

//{ font: { bold: true }
export const EXD = (dataTable, settings, name, ln) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }


        sheet.columns = [
            { key: 'opDate', header: 'Operation Time', width: 30, style: styles },
            { key: 'lstSaved', header: 'Last Saved', width: 30, style: styles },
            { key: 'order', header: 'PO#', width: 30, style: styles },
            { key: 'invoice', header: 'Invoice', width: 30, style: styles },
            { key: 'date', header: 'Date', width: 30, style: styles },
            { key: 'invoiceStatus', header: 'Status', width: 30, style: styles },
            { key: 'client', header: 'Consignee', width: 30, style: styles },
            { key: 'shpType', header: 'Shipment', width: 30, style: styles },
            { key: 'origin', header: 'Origin', width: 30, style: styles },
            { key: 'delTerm', header: 'Delivery Terms', width: 30, style: styles },
            { key: 'pol', header: 'POL', width: 30, style: styles },
            { key: 'pod', header: 'POD', width: 30, style: styles },
            { key: 'packing', header: 'Packing', width: 30, style: styles },
            { key: 'cur', header: 'Currency', width: 30, style: styles },
            { key: 'invType', header: 'Invoice Type', width: 30, style: styles },
            { key: 'totalAmount', header: 'Total Amount', width: 30, style: styles },
            { key: 'percentage', header: 'Prepayment', width: 30, style: styles },
            { key: 'totalPrepayment', header: 'Prepaid Amount', width: 30, style: styles },
            { key: 'balanceDue', header: 'Balance', width: 30, style: styles },
            { key: 'container', header: 'Container', width: 30, style: styles },
            { key: 'etd', header: 'ETD', width: 30, style: styles },
            { key: 'eta', header: 'ETA', width: 30, style: styles },
            { key: 'completed', header: 'Completed', width: 30, style: styles }

        ];

        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '800080' }
            }
            cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };  // Font color to white
        });


        const getprefixInv = (x) => {
            return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
                (x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
        }

        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                opDate: dateFormat(item.opDate, 'dd-mmm-yy HH:MM'),
                lstSaved: dateFormat(item.lstSaved, 'dd-mmm-yy HH:MM'),
                order: item.poSupplier.order,
                invoice: item.invoice + getprefixInv(item),
                date: item.final ? dateFormat(item.date, 'dd-mmm-yy') : dateFormat(item.dateRange.startDate, 'dd-mmm-yy'),
                invoiceStatus: !item.final && !item.canceled ? 'Draft' : item.final && !item.canceled ? 'Final' :
                    'Canceled',
                client: item.final ? item.client.nname : settings.Client.Client.find(q => q.id === item.client)?.nname,
                shpType: item.final ? item.shpType : settings.Shipment.Shipment.find(q => q.id === item.shpType).shpType,
                origin: item.final ? item.origin : settings.Origin.Origin.find(q => q.id === item.origin)?.origin || '',
                delTerm: item.final ? item.delTerm : settings['Delivery Terms']['Delivery Terms'].find(q => q.id === item.delTerm)?.delTerm || '',
                pol: item.final ? item.pol : item.pol && settings.POL.POL.find(q => q.id === item.pol).pol,
                pod: item.final ? item.pod : item.pod && settings.POD.POD.find(q => q.id === item.pod).pod,
                packing: item.final ? item.packing : item.packing && settings.Packing.Packing.find(q => q.id === item.packing).packing,
                cur: item.final ? item.cur.cur : settings.Currency.Currency.find(q => q.id === item.cur).cur,
                invType: item.final ? item.invType : settings.InvTypes.InvTypes.find(q => q.id === item.invType).invType,
                totalAmount: item.totalAmount * 1,
                percentage: item.percentage + '%',
                totalPrepayment: item.totalPrepayment * 1,
                balanceDue: item.balanceDue * 1,
                container: item.container,
                etd: item.shipData?.etd?.startDate ? dateFormat(item.shipData?.etd?.startDate, 'dd-mmm-yy') : '',
                eta: item.shipData?.eta?.startDate ? dateFormat(item.shipData?.eta?.startDate, 'dd-mmm-yy') : '',
                completed: item.completed ?? false,

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
                if ((colNumber === 16 || colNumber === 18 || colNumber === 19) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = item.final ? item.cur.sym : getNumFmtForCurrency(item.cur)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]${sym}-#,##0.00`;
                }
            });
        });

        //in Case I want to merge
        //     sheet.mergeCells('A5:A6');
        //     sheet.getCell('A5').style.alignment = { horizontal: 'center', vertical: 'middle' }

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
