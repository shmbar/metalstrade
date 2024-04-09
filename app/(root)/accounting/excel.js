import { saveAs } from 'file-saver';
import { Workbook } from 'exceljs';
import Tooltip from '@components/tooltip';
import { SiMicrosoftexcel } from 'react-icons/si';
import dateFormat from "dateformat";
import { getTtl } from '@utils/languages';

function isNumber(value) {
    return !isNaN(value);
}

const createOuterBorder = (worksheet, startRow, startCol, endRow, endCol) => {
    let borderWidth = 'medium'
    const borderStyle = {
        style: borderWidth,
        color: { argb: '000000' }
    };

    for (let i = startRow; i <= endRow; i++) {
        const leftBorderCell = worksheet.getCell(i, startCol);
        const rightBorderCell = worksheet.getCell(i, endCol);
        leftBorderCell.border = {
            ...leftBorderCell.border,
            left: borderStyle
        };
        rightBorderCell.border = {
            ...rightBorderCell.border,
            right: borderStyle
        };
    }

    for (let i = startCol; i <= endCol; i++) {
        const topBorderCell = worksheet.getCell(startRow, i);
        const bottomBorderCell = worksheet.getCell(endRow, i);
        topBorderCell.border = {
            ...topBorderCell.border,
            top: borderStyle
        };
        bottomBorderCell.border = {
            ...bottomBorderCell.border,
            bottom: borderStyle
        };
    }
};

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
        case 'USD':
            return '$';
        case 'EUR':
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
            //   { key: 'num', header: '#', width: 3, style: styles },
            { key: 'dateExp', header: 'Date', width: 30, style: styles },
            { key: 'expInvoice', header: 'Expense Invoice', width: 30, style: styles },
            { key: 'clientExp', header: 'Supplier', width: 30, style: styles },
            { key: 'amountExp', header: 'Amount', width: 30, style: styles },
            { key: 'expType', header: 'Expense Type', width: 30, style: styles },

            { key: 'dateInv', header: 'Date', width: 30, style: styles },
            { key: 'saleInvoice', header: 'Invoice', width: 30, style: styles },
            { key: 'clientInv', header: 'Consignee', width: 30, style: styles },
            { key: 'amountInv', header: 'Amount', width: 30, style: styles },
            { key: 'invType', header: 'Invoice Type', width: 30, style: styles },
        ];


        sheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {
                    argb: colNumber <= 5 ? 'FFF2CC' :
                        colNumber > 5 ? 'E2EFDA' : ''
                }
            }
            cell.font = { bold: false, size: 12, color: { argb: '000000' } };  // Font color to white
        });


        for (let i = 0; i < dataTable.length; i++) {
            let item = dataTable[i]

            sheet.addRow({
                //    num: item.num,
                dateExp: item.dateExp && dateFormat(item.dateExp, 'dd-mmm-yy'),
                expInvoice: item.expInvoice == null || item.expInvoice == '' ? '' : isNumber(item.expInvoice) ? item.expInvoice * 1 : item.expInvoice,
                clientExp: item.clientExp ? settings.Supplier.Supplier.find(q => q.id === item.clientExp)?.nname : '',
                amountExp: item.amountExp && item.amountExp * 1,
                expType: item.expType && settings.Expenses.Expenses.find(q => q.id === item.expType).expType,

                dateInv: item.dateInv == null ? '' : dateFormat(item.dateInv, 'dd-mmm-yy'),
                saleInvoice: item.saleInvoice == null ? '' : isNumber(item.saleInvoice) ? item.saleInvoice * 1 : item.saleInvoice,
                clientInv: item.clientInv == null ? '' : item.clientInv,
                amountInv: item.amountInv == null ? '' : item.amountInv,
                invType: item.invType == null ? '' : item.invType,
            })
        }


        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                if (cell.value || cell.value === '' || cell.value == null) {
                    row.getCell(colNumber).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                        color: { argb: 'cccccc' }
                    };

                }
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {
                        argb: colNumber <= 5 ? 'FFF2CC' :
                            colNumber > 5 ? 'E2EFDA' : ''
                    }
                }


                if ((colNumber === 4 || colNumber === 9) && rowNumber > 1) {
                    let item = dataTable[rowNumber - 2]
                    let sym = colNumber === 5 ? getNumFmtForCurrency(item.curEX) : getNumFmtForCurrency(item.curINV)
                    row.getCell(colNumber).numFmt = `${sym}#,##0.00;[Red]-$#,##0.00`
                }
            });
        });





        const cols = sheet.columns.map(z => z.key)

        for (let z in cols) {
            const firstColumn = sheet.getColumn(cols[z]); // Assuming 'A' is the key for the first column
            const maxLength = firstColumn.values.reduce((max, value) => Math.max(max, value ? value.toString().length : 0), 0);
            firstColumn.width = Math.min(30, Math.max(10, maxLength * 1.2)); // Adjust the multiplier for better results
        }


        /*
             sheet.insertRow(1, ['', 'Expenses', '', '', '', '', 'Invoices']);
             sheet.getCell('B1').fill = {
                 type: 'pattern',
                 pattern: 'solid',
                 fgColor: { argb: 'FFF2CC' },
             };
             sheet.getCell('G1').fill = {
                 type: 'pattern',
                 pattern: 'solid',
                 fgColor: { argb: 'E2EFDA' },
             };
          
             sheet.unMergeCells('B1:F1');
             sheet.mergeCells('B1:F1');
             sheet.unMergeCells('G1:K1');
             sheet.mergeCells('G1:K1');
     
        
             for (let i = 1; i <= dataTable.length; i++) {
                 if (dataTable[i - 1].span) {
                     sheet.mergeCells('A' + (i + 2) + ':' + 'A' + (i + 1 + dataTable[i - 1].span * 1));
                     //   sheet.getCell('A5').style.alignment = { horizontal: 'center', vertical: 'middle' }
                 }
             }
     
             sheet.eachRow((row, rowNumber) => {
                 row.eachCell((cell, colNumber) => {
     
                     if (colNumber === 1 || colNumber === 6) {
                         row.getCell(colNumber).border = {
                             right: { style: 'thin' },
                             color: { argb: '000000' }
                         }
                     };
     
                     if (rowNumber === 1) {
                         row.getCell(colNumber).border = {
                             bottom: { style: 'thin' },
                             color: { argb: '000000' }
                         }
                     };
                 })
             })
     
     
             sheet.getCell('A1').border = {
                 right: { style: 'thin' },
                 color: { argb: '000000' }
             }
             sheet.getCell('F1').border = {
                 right: { style: 'thin' },
                 bottom: { style: 'thin' },
                 color: { argb: '000000' }
             }
             sheet.getCell('K1').border = {
                 right: { style: 'thin' },
                 bottom: { style: 'thin' },
                 color: { argb: '000000' }
             }
             sheet.getCell('K2').border = {
                 right: { style: 'thin' },
                 color: { argb: '000000' }
             }
     
     */
        sheet.eachRow((row, rowNumber) => {
            if (dataTable[rowNumber - 1]?.span) {
                createOuterBorder(sheet, rowNumber + 1, 1, (rowNumber + dataTable[rowNumber - 1].span * 1), 10); //start(row,col) end(row, col)
            }
        });

        createOuterBorder(sheet, 1, 1, 1, 10); //start(row,col) end(row, col)

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
                <Tooltip txt={getTtl('Excel', ln)} />
            </button>
        </div>
    );
}
