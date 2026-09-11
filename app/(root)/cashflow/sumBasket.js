'use client';
import { useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { saveAs } from 'file-saver';
import { X } from 'lucide-react';
import SumPanel, { SumPanelAction, SumStat } from '../../../components/SumPanel';

const kindLabel = { client: 'Client', supplier: 'Supplier', expense: 'Expense', stock: 'Stock' };

// Where the user last dragged the panel. Position is a preference, not data —
// localStorage keeps it per browser and nothing else needs to know about it.
const POS_KEY = 'ims:sumBasketPos';

// Which figure to total. 'auto' uses each row's contextual default (autoMetric).
const METRICS = ['auto', 'balance', 'paid', 'amount'];
const metricLabel = { auto: 'Auto', balance: 'Balance', paid: 'Paid', amount: 'Amount' };

const fmt = (v, cur) => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: cur === 'us' ? 'USD' : 'EUR', minimumFractionDigits: 2,
}).format(v || 0);

const isNum = (v) => typeof v === 'number' && !isNaN(v);

// Floating "selection basket" — a scratch tally of any rows the user ticks across
// the cashflow sections. Collapsible, with a metric switcher. Never persisted.
// The card itself — position, drag, header, stat pills — is components/SumPanel,
// the same shell the tables' Quick Sum renders, so the two cannot drift apart.
export default function SumBasket({ items = [], onRemove, onClear }) {
    const [collapsed, setCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [metric, setMetric] = useState('auto');
    const [exporting, setExporting] = useState(false);
    const [exportErr, setExportErr] = useState(false);

    if (!items.length) return null;

    // Resolve the value each row contributes under the active metric (null = N/A).
    const valOf = (it) => {
        const m = metric === 'auto' ? (it.autoMetric || 'amount') : metric;
        return isNum(it[m]) ? it[m] : null;
    };
    const rows = items.map(it => ({ ...it, v: valOf(it) }));

    const usd = rows.filter(r => r.cur === 'us' && r.v != null).reduce((s, r) => s + r.v, 0);
    const eur = rows.filter(r => r.cur !== 'us' && r.v != null).reduce((s, r) => s + r.v, 0);
    const hasUsd = rows.some(r => r.cur === 'us' && r.v != null);
    const hasEur = rows.some(r => r.cur !== 'us' && r.v != null);
    const naCount = rows.filter(r => r.v == null).length;

    // The same tally as the clipboard copy, as a spreadsheet: one row per selection
    // with its own currency, then the per-currency subtotals at the bottom. Amounts
    // go in as NUMBERS with a currency format, so the recipient can re-total them —
    // a pasted text block cannot be added up.
    //
    // $ and € stay on separate subtotal lines for the same reason they do on screen:
    // adding them together would produce a figure in no currency at all.
    const exportExcel = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            // Same shape as every other exporter here: file-saver imported at the
            // top (it is CJS, so a dynamic `import(...).saveAs` comes back undefined
            // and the click did nothing but log), exceljs pulled in on demand so it
            // stays out of the first-load bundle.
            const { Workbook } = await import('exceljs');

            const wb = new Workbook();
            wb.created = new Date();
            const ws = wb.addWorksheet('Selection');
            ws.columns = [
                { header: 'Type', key: 'kind', width: 12 },
                { header: 'Name', key: 'label', width: 28 },
                { header: 'Reference', key: 'sub', width: 22 },
                { header: 'Currency', key: 'cur', width: 10 },
                { header: metricLabel[metric], key: 'v', width: 16 },
            ];
            // Same dressing as every other export in the app: the header band is the
            // purple fill with white bold 12pt (stocks / invoices / contracts / expenses),
            // and the subtotal lines get the light-blue totals fill with borders
            // (InvoicesReview&Statement). A sheet from here should be indistinguishable
            // from one saved off any other page.
            const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: '800080' } };
            const TOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BFDBFE' } };
            const THIN_BORDER = {
                top: { style: 'thin' }, left: { style: 'thin' },
                bottom: { style: 'thin' }, right: { style: 'thin' },
            };
            // Fills a whole row across the five columns — addRow only touches the cells
            // it was given values for, so an unfilled 'kind'/'sub' cell would leave a
            // white gap through the middle of the total band.
            const dressTotalRow = (row) => {
                for (let c = 1; c <= ws.columns.length; c++) {
                    const cell = row.getCell(c);
                    cell.fill = TOTAL_FILL;
                    cell.font = { bold: true };
                    cell.border = THIN_BORDER;
                }
            };

            ws.getRow(1).eachCell((cell) => {
                cell.fill = HEADER_FILL;
                cell.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            rows.forEach(r => {
                const row = ws.addRow({
                    kind: kindLabel[r.kind] || r.kind || '',
                    label: r.label || '',
                    sub: r.sub || '',
                    cur: r.cur === 'us' ? 'USD' : 'EUR',
                    // n/a stays blank rather than 0 — a row that has no figure under
                    // this metric must not read as a zero that was counted.
                    v: r.v == null ? '' : r.v,
                });
                row.getCell('v').numFmt = r.cur === 'us' ? '"$"#,##0.00' : '"€"#,##0.00';
            });

            ws.addRow({});
            if (hasUsd) {
                const t = ws.addRow({ label: 'Subtotal USD', v: usd });
                dressTotalRow(t);
                t.getCell('v').numFmt = '"$"#,##0.00';
            }
            if (hasEur) {
                const t = ws.addRow({ label: 'Subtotal EUR', v: eur });
                dressTotalRow(t);
                t.getCell('v').numFmt = '"€"#,##0.00';
            }
            if (naCount) ws.addRow({ label: `${naCount} row(s) with no ${metricLabel[metric]} figure` });

            const buf = await wb.xlsx.writeBuffer();
            saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
                `cashflow-selection-${metric}-${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (e) {
            // A silent catch is how this failed unnoticed the first time: the click
            // logged to the console and the button looked idle. Say so on the button.
            console.error('Selection export failed', e);
            setExportErr(true);
            setTimeout(() => setExportErr(false), 2500);
        } finally {
            setExporting(false);
        }
    };

    const copySummary = () => {
        const lines = rows.map(r => `${r.label || kindLabel[r.kind]}${r.sub ? ` (${r.sub})` : ''}\t${r.v == null ? 'n/a' : fmt(r.v, r.cur)}`);
        let out = `Selected (${items.length}) — total by ${metricLabel[metric]}\n${lines.join('\n')}\n`;
        if (hasUsd) out += `\nSubtotal $: ${fmt(usd, 'us')}`;
        if (hasEur) out += `\nSubtotal €: ${fmt(eur, 'eu')}`;
        navigator.clipboard?.writeText(out).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }).catch(() => {});
    };

    return (
        <SumPanel
            title="Selected invoices"
            count={items.length}
            storageKey={POS_KEY}
            actions={<>
                <SumPanelAction action="excel" onClick={exportExcel} disabled={exporting} pulse={exporting} danger={exportErr}
                    title={exportErr ? 'Export failed — see the browser console' : 'Export selection to Excel'} />
                <SumPanelAction action={copied ? 'confirm' : 'copy'} onClick={copySummary} title="Copy summary" />
                <SumPanelAction action={collapsed ? 'expand' : 'collapse'} onClick={() => setCollapsed(c => !c)}
                    title={collapsed ? 'Show list' : 'Hide list'} />
                <SumPanelAction action="close" onClick={onClear} title="Clear all" />
            </>}
        >
            {/* Metric switcher */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--bg-subtle)] border-b border-[var(--line)]">
                {METRICS.map(m => (
                    <button key={m} onClick={() => setMetric(m)}
                        className={`flex-1 responsiveTextTable font-semibold py-1 rounded-lg transition-colors ${metric === m
                            ? 'bg-[var(--brand)] text-[var(--on-brand)] shadow-card'
                            : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'}`}>
                        {metricLabel[m]}
                    </button>
                ))}
            </div>

            {/* Subtotals — always visible, shown as soft stat pills */}
            <div className="px-3 py-2.5 flex flex-col gap-1.5 bg-[var(--surface-card)]">
                {hasUsd &&
                    <SumStat badge="$" label={metricLabel[metric]}
                        value={<NumericFormat value={usd} displayType="text" thousandSeparator prefix="$" decimalScale={2} fixedDecimalScale />} />
                }
                {hasEur &&
                    <SumStat badge="€" label={metricLabel[metric]}
                        value={<NumericFormat value={eur} displayType="text" thousandSeparator prefix="€" decimalScale={2} fixedDecimalScale />} />
                }
                {naCount > 0 &&
                    <div className="responsiveTextTable text-[var(--ink-muted)] italic">
                        {naCount} item{naCount > 1 ? 's' : ''} ha{naCount > 1 ? 've' : 's'} no {metricLabel[metric].toLowerCase()} — excluded
                    </div>
                }
            </div>

            {/* Selected line items — collapsible */}
            {!collapsed &&
                <div className="max-h-52 overflow-y-auto border-t border-[var(--line)] bg-[var(--bg-subtle)]">
                    {rows.map(r => (
                        <div key={r.key}
                            className="group flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-[var(--bg-subtle)] transition-colors responsiveText">
                            <div className="min-w-0">
                                <div className="truncate text-[var(--ink)] font-medium leading-tight">{r.label || kindLabel[r.kind]}</div>
                                {r.sub && <div className="truncate responsiveTextTable text-[var(--ink-muted)] leading-tight">{r.sub}</div>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {r.v == null
                                    ? <span className="text-[var(--ink-muted)]">—</span>
                                    : <NumericFormat value={r.v} displayType="text" thousandSeparator
                                        prefix={r.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale
                                        className="tabular-nums text-[var(--ink)]" />
                                }
                                <button onClick={() => onRemove(r.key)} title="Remove"
                                    className="grid place-items-center w-4 h-4 rounded-full text-[var(--ink-muted)] hover:text-[var(--on-brand)] hover:bg-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            }
        </SumPanel>
    );
}
