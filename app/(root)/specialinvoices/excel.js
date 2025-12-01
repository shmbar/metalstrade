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

//{ font: { bold: true }
export const EXD = (dataTable, settings, name, ln) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'compName', header: 'Company Name', width: 30, style: styles },
            { key: 'date', header: 'Date', width: 30, style: styles },
            { key: 'supplier', header: 'Supplier', width: 30, style: styles },
            { key: 'order', header: 'PO#', width: 30, style: styles },
            { key: 'salesInvoice', header: 'Sales Invoice', width: 30, style: styles },
            { key: 'invoice', header: 'Invoice', width: 30, style: styles },
            { key: 'description', header: 'Description', width: 30, style: styles },
            { key: 'qnty', header: 'Weight', width: 30, style: styles },
            { key: 'unitPrc', header: 'Unit Price', width: 30, style: styles },
            { key: 'total', header: 'Total', width: 30, style: styles },
            { key: 'paidNotPaid', header: 'Paid Not Paid', width: 30, style: styles },
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

                compName: item.compName,
                date: dateFormat(item.date, 'dd-mmm-yy'),
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier)?.nname || '-',
                order: item.order,
                salesInvoice: item.salesInvoice,
                invoice: item.invoice,
                description: item.description,
                qnty: item.qnty * 1 || '-',
                unitPrc: item.unitPrc * 1,
                total: item.total,
                paidNotPaid: item.paidNotPaid
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
                if ((colNumber === 10 || colNumber === 9) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    row.getCell(colNumber).numFmt = `#,##0.00;#,##0.00`;
                }

                  if ((colNumber === 8) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    row.getCell(colNumber).numFmt = `#,##0.00`;
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
                    className="hover:bg-slate-200 text-slate-700 justify-center size-10 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none"
                >
                    <SiMicrosoftexcel className="scale-[1.4] text-gray-500" />
                </div>
            </Tltip>
        </div>
    );
}
