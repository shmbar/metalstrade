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
            { key: 'opDate', header: 'Operation Time', width: 30, style: styles },
            { key: 'lstSaved', header: 'Last Saved', width: 30, style: styles },
            { key: 'order', header: 'PO#', width: 30, style: styles },
            { key: 'date', header: 'Date', width: 30, style: styles },
            { key: 'supplier', header: 'Supplier', width: 30, style: styles },
            { key: 'originSupplier', header: 'Original Supplier', width: 30, style: styles },
            { key: 'shpType', header: 'Shipment', width: 30, style: styles },
            { key: 'origin', header: 'Origin', width: 30, style: styles },
            { key: 'delTerm', header: 'Delivery Terms', width: 30, style: styles },
            { key: 'pol', header: 'POL', width: 30, style: styles },
            { key: 'pod', header: 'POD', width: 30, style: styles },
            { key: 'packing', header: 'Packing', width: 30, style: styles },
            { key: 'contType', header: 'Container Type', width: 30, style: styles },
            { key: 'size', header: 'Size', width: 30, style: styles },
            { key: 'deltime', header: 'Delivery Time', width: 30, style: styles },
            { key: 'cur', header: 'Currency', width: 30, style: styles },
            { key: 'qTypeTable', header: 'QTY', width: 30, style: styles },
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

        const showQTY = (x) => {

            return x.productsData.length !== 0 ? new Intl.NumberFormat('en-US', {
                minimumFractionDigits: 1
            }).format(x.productsData.reduce((sum, item) => sum + parseInt(item.qnty, 10), 0)) +
                ' ' + (x.qTypeTable ? settings.Quantity.Quantity.find(q => q.id === x.qTypeTable)?.qTypeTable : '')
                : '-'
        }

        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                opDate: dateFormat(item.opDate, 'dd-mmm-yy HH:MM'),
                lstSaved: dateFormat(item.lstSaved, 'dd-mmm-yy HH:MM'),
                order: item.order,
                date: dateFormat(item.dateRange.startDate, 'dd-mmm-yy'),
                supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                originSupplier: settings.Supplier.Supplier.find(q => q.id === item.originSupplier)?.nname ?? '-',
                shpType: item.shpType && settings.Shipment.Shipment.find(q => q.id === item.shpType)?.shpType,
                origin: item.origin && settings.Origin.Origin.find(q => q.id === item.origin)?.origin,
                delTerm: item.delTerm && settings['Delivery Terms']['Delivery Terms'].find(q => q.id === item.delTerm).delTerm,
                pol: item.pol && settings.POL.POL.find(q => q.id === item.pol)?.pol,
                pod: item.pod && settings.POD.POD.find(q => q.id === item.pod)?.pod,
                packing: item.packing && settings.Packing.Packing.find(q => q.id === item.packing)?.packing,
                contType: item.contType && settings['Container Type']['Container Type'].find(q => q.id === item.contType)?.contType,
                size: item.size && settings.Size.Size.find(q => q.id === item.size).size,
                deltime: item?.deltime && settings['Delivery Time']['Delivery Time'].find(q => q.id === item.deltime)?.deltime,
                cur: settings.Currency.Currency.find(q => q.id === item.cur).cur,
                qTypeTable: showQTY(item),
                completed: item.completed ?? false
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
