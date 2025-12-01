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
export const EXD = (dataTable) => {

    const exportExcel = async () => {

        while (sheet.rowCount > 1) {
            sheet.spliceRows(2, 1);
        }

        sheet.columns = [
            { key: 'material', header: 'Material', width: 50, style: styles },
            { key: 'kgs', header: 'KGS', width: 8, style: styles },
            { key: 'ni', header: 'Ni', width: 8, style: styles },
            { key: 'cr', header: 'Cr', width: 8, style: styles },
            { key: 'cu', header: 'Cu', width: 8, style: styles },
            { key: 'mo', header: 'Mo', width: 8, style: styles },
            { key: 'w', header: 'W', width: 8, style: styles },
            { key: 'co', header: 'Co', width: 8, style: styles },
            { key: 'nb', header: 'Nb', width: 8, style: styles },
            { key: 'fe', header: 'Fe', width: 8, style: styles },
            { key: 'ti', header: 'Ti', width: 8, style: styles },
        ];


        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: colNumber === 1 || colNumber === 2 ? { argb: 'A6C9EC' } : { argb: 'F7C7AC' }
            }
            cell.font = { bold: true, size: 12, color: { argb: '000000' } };  // Font color to white
        });

        // const showQTY = (x) => {

        //     return x.productsData.length !== 0 ? new Intl.NumberFormat('en-US', {
        //         minimumFractionDigits: 1
        //     }).format(x.productsData.reduce((sum, item) => sum + parseInt(item.qnty, 10), 0)) +
        //         ' ' + (x.qTypeTable ? settings.Quantity.Quantity.find(q => q.id === x.qTypeTable)?.qTypeTable : '')
        //         : '-'
        // }

        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                material: item.material,
                kgs: item.kgs * 1,
                ni: item.ni * 1,
                cr: item.cr * 1,
                cu: item.cu * 1,
                mo: item.mo * 1,
                w: item.w * 1,
                co: item.co * 1,
                nb: item.nb * 1,
                fe: item.fe * 1,
                ti: item.ti * 1,
            })
        }

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {

                row.getCell(colNumber).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                if (colNumber <= 2) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: 'A6C9EC'
                        }
                    }
                    cell.font = { bold: true }
                }

            });
        });

        //in Case I want to merge
        //     sheet.mergeCells('A5:A6');
        //     sheet.getCell('A5').style.alignment = { horizontal: 'center', vertical: 'middle' }


        const firstColumn = sheet.getColumn('material');
        firstColumn.width = 40; // Explicitly setting width

        // let startToital = dataTable.length + 2
        // sheet.getCell('B' + startToital).value = totals.kgs;
        // sheet.getCell('B' + startToital).font = {
        //     size: 13,
        //     bold: true
        // };

        const totalKgs = dataTable.reduce((sum, item) => sum + Number(item.kgs), 0);

        const totals = { kgs: totalKgs };
        const mtItems = ['ni', 'cr', 'cu', 'mo', 'w', 'co', 'nb', 'fe', 'ti']
        mtItems.forEach(key => {
            const weightedSum = dataTable.reduce((sum, row) => sum + (parseFloat(row[key] || 0) * row.kgs), 0);
            totals[key] = (weightedSum / totalKgs).toFixed(2);
        });
        totals.material = ''


        sheet.addRow({
            material: totals.material,
            kgs: totals.kgs * 1,
            ni: totals.ni * 1,
            cr: totals.cr * 1,
            cu: totals.cu * 1,
            mo: totals.mo * 1,
            w: totals.w * 1,
            co: totals.co * 1,
            nb: totals.nb * 1,
            fe: totals.fe * 1,
            ti: totals.ti * 1,
        })


        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {

                row.getCell(colNumber).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };

                if (colNumber === 2) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: {
                            argb: 'A6C9EC'
                        }
                    }
                    cell.font = { bold: true }
                }

                if (rowNumber === dataTable.length + 2) {
                    cell.font = { bold: true }
                    if (colNumber > 2) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: {
                                argb: 'F7C7AC'
                            }
                        }
                    }
                }
            });
        });

        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (colNumber >= 2) {
                    row.getCell(colNumber).numFmt = `#,##0.00;[Red]#,##0.00`
                }
            })
        })

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `Material_Table.xlsx`)
    }



    return (
        <div>
            <Tltip direction='bottom' tltpText='Excel'>
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
