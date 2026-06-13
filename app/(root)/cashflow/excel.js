// Excel export for the Cashflow page. The page renders each section as a div-based
// accordion list (not <table>), so we export from the section state arrays the page
// already holds. Each section becomes its own worksheet: Name | Currency | Amount,
// with a bold Total row — mirroring the on-screen per-section totals.
// exceljs is imported dynamically so it stays off the first-load bundle (same pattern
// as stocks/excel.js).
import { saveAs } from 'file-saver';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0366AE' } };

// Excel worksheet names: max 31 chars, no : \ / ? * [ ] — sanitize defensively.
const safeSheetName = (name, used) => {
    let base = String(name || 'Sheet').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let n = base;
    let i = 2;
    while (used.has(n)) {
        const suffix = ` (${i++})`;
        n = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(n);
    return n;
};

/**
 * @param {Object}   opts
 * @param {Array}    opts.sections  [{ name, rows: [{ name, currency, amount }] }]
 * @param {string}   opts.fileName
 */
export const exportCashflowToExcel = async ({ sections = [], fileName = 'cashflow.xlsx' }) => {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'IMS';
    wb.created = new Date();

    const used = new Set();
    const withRows = sections.filter(s => Array.isArray(s.rows) && s.rows.length > 0);

    if (!withRows.length) {
        const sheet = wb.addWorksheet(safeSheetName('Cashflow', used));
        sheet.addRow(['No data to export for the selected period.']);
    }

    withRows.forEach(({ name, rows }) => {
        const sheet = wb.addWorksheet(safeSheetName(name, used));
        sheet.columns = [
            { key: 'name', header: 'Name', width: 38 },
            { key: 'currency', header: 'Currency', width: 12 },
            { key: 'amount', header: 'Amount', width: 18, style: { numFmt: '#,##0.00' } },
        ];

        rows.forEach(r => sheet.addRow({
            name: r.name || '',
            currency: r.currency || '',
            amount: Number.isFinite(parseFloat(r.amount)) ? parseFloat(r.amount) : 0,
        }));

        const total = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const totalRow = sheet.addRow({ name: 'Total', currency: '', amount: total });
        totalRow.font = { bold: true };
        totalRow.getCell('amount').numFmt = '#,##0.00';

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.fill = HEADER_FILL;
            cell.font = { bold: true, color: { argb: 'FFFFFF' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        fileName
    );
};
