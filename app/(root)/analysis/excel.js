import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import { SiMicrosoftexcel } from 'react-icons/si';
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';
import Tltip from '@components/tlTip';
import { sortArr } from '@utils/utils';


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
            { key: 'order', header: 'PO', width: 30, style: styles },
        //    { key: 'supplier', header: 'Supplier', width: 30, style: styles },
            { key: 'cert', header: 'Cert', width: 30, style: styles },
            { key: 'ToNi', header: 'Ni', width: 30, style: styles },
            { key: 'ToCr', header: 'Cr', width: 30, style: styles },
            { key: 'ToMo', header: 'Mo', width: 30, style: styles },
            { key: 'Toqnty', header: 'Weight MT', width: 30, style: styles },
            { key: 'invoice', header: 'Delivery Terms', width: 30, style: styles },
            { key: 'BackNi', header: 'Ni', width: 30, style: styles },
            { key: 'BackCr', header: 'Cr', width: 30, style: styles },
            { key: 'BackMo', header: 'Mo', width: 30, style: styles },
            { key: 'Backqnty', header: 'Weight MT', width: 30, style: styles },
            { key: 'diffNi', header: 'Diff Ni', width: 30, style: styles },
            { key: 'diffCr', header: 'Diff Cr', width: 30, style: styles },
            { key: 'diffMo', header: 'Diff Mo', width: 30, style: styles },
            { key: 'diffqnty', header: 'Diff Weight', width: 30, style: styles }
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
            //    supplier: settings.Supplier.Supplier.find(q => q.id === item.supplier).nname,
                cert: item.cert,
                ToNi: item.ToNi ? item.ToNi * 1 : '',
                ToCr: item.ToCr ? item.ToCr * 1 : '',
                ToMo: item.ToMo ? item.ToMo * 1 : '',
                Toqnty: item.Toqnty * 1,
                invoice: item.invoice,
                BackNi: item.BackNi ? item.BackNi * 1 : '',
                BackCr: item.BackCr ? item.BackCr * 1 : '',
                BackMo: item.BackMo ? item.BackMo * 1 : '',
                Backqnty: item.Backqnty * 1,
                diffNi: item.diffNi ? item.diffNi * 1 : '',
                diffCr: item.diffCr ? item.diffCr * 1 : '',
                diffMo: item.diffMo ? item.diffMo * 1 : '',
                diffqnty: item.diffqnty * 1,
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

                if (dataTable[rowNumber - 2]?.cert === 'Average') {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: 'FFF2CC'

                        }
                    }
                }
            });
        });


        const groupedArrayOrder = (arrD) => {

            const groupedArray1 = arrD.reduce((result, obj) => {

                const group = result.find((group) => group[0]?.order === obj.order);
        
                if (group) {
                    group.push(obj);
                } else {
                    result.push([obj]);
                }
        
                return result;
            }, []); // Initialize result as an empty array

            return groupedArray1;
        };
    
        let groupedArr = groupedArrayOrder(sortArr(dataTable, 'date'))

        let k = 1;
        for (let i = 1; i <= groupedArr.length; i++) {
            sheet.mergeCells('A' + (i + k) + ':' + 'A' + (i + groupedArr[i - 1].length + k - 1)); // Start merging from the second row
            k = k + groupedArr[i - 1].length - 1;
            //   sheet.getCell('A5').style.alignment = { horizontal: 'center', vertical: 'middle' }
        }


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
