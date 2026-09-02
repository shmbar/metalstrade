'use client';
import { useRef, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { saveAs } from 'file-saver';
import { Sigma, X, ChevronDown, ChevronUp, Copy, Check, FileSpreadsheet } from 'lucide-react';

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
// the cashflow sections. Draggable + collapsible, with a metric switcher. Never persisted.
export default function SumBasket({ items = [], onRemove, onClear }) {
    const [collapsed, setCollapsed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [metric, setMetric] = useState('auto');
    const [exporting, setExporting] = useState(false);
    const [exportErr, setExportErr] = useState(false);

    // Where the panel sits. Default is now top-right, under the header, not
    // bottom-centre: the bottom edge already carries the toast (bottom-left), the
    // ⌘K hint (bottom-4 right-20) and the chat launcher (bottom-4 right-4), and at
    // 19rem wide this panel landed on top of the rows you were ticking.
    //
    // A dragged position is remembered. It was reset on every remount, so anyone
    // who moved it out of the way had to move it again the next time they selected
    // anything.
    const [pos, setPos] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
            // Ignore a stored position that is off-screen — a smaller window, or a
            // second monitor that is no longer attached, would strand the panel.
            if (saved && saved.left >= 0 && saved.top >= 0
                && saved.left < window.innerWidth - 40 && saved.top < window.innerHeight - 40) return saved;
        } catch { /* private mode, or nothing stored */ }
        return null;
    });
    const ref = useRef(null);

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

    // ── Drag (header handle) ───────────────────────────────────────────────
    const startDrag = (e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dx = e.clientX - rect.left;
        const dy = e.clientY - rect.top;
        const move = (ev) => {
            setPos({
                left: Math.min(Math.max(8, ev.clientX - dx), window.innerWidth - rect.width - 8),
                top: Math.min(Math.max(8, ev.clientY - dy), window.innerHeight - 44),
            });
        };
        const up = () => {
            // Remember it: the panel used to snap back to its default on every
            // remount, so moving it out of the way had to be redone each time.
            setPos(cur => {
                try { if (cur) localStorage.setItem(POS_KEY, JSON.stringify(cur)); } catch { /* private mode */ }
                return cur;
            });
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

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
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

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
                t.font = { bold: true };
                t.getCell('v').numFmt = '"$"#,##0.00';
            }
            if (hasEur) {
                const t = ws.addRow({ label: 'Subtotal EUR', v: eur });
                t.font = { bold: true };
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
        <div
            ref={ref}
            className={`fixed z-40 w-[19rem] rounded-2xl overflow-hidden font-sans
                border border-[var(--line)]
                bg-[var(--glass)] backdrop-blur-md shadow-pop
                animate-in fade-in slide-in-from-top-3 duration-300
                ${pos ? '' : 'top-20 right-4'}`}
            style={pos ? { left: pos.left, top: pos.top } : undefined}
        >
            {/* Header — drag handle */}
            <div
                onPointerDown={startDrag}
                className="flex items-center justify-between gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none
                    bg-[var(--bg-card)] border-b border-[var(--line)] text-[var(--ink)]"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="grid place-items-center w-6 h-6 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] shrink-0">
                        <Sigma className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold responsiveTextInput truncate">Selected invoices</span>
                    <span className="shrink-0 responsiveTextTable font-bold px-1.5 py-0.5 rounded-lg bg-[var(--bg-subtle)] text-[var(--ink-secondary)]">
                        {items.length}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0 text-[var(--ink-secondary)]">
                    <button onPointerDown={e => e.stopPropagation()} onClick={exportExcel}
                        disabled={exporting}
                        title={exportErr ? 'Export failed — see the browser console' : 'Export selection to Excel'}
                        className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
                        style={exportErr ? { color: 'var(--danger-text)' } : undefined}>
                        <FileSpreadsheet className={`w-3.5 h-3.5 ${exporting ? 'animate-pulse' : ''}`} />
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={copySummary}
                        title="Copy summary" className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Show list' : 'Hide list'} className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors">
                        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={onClear}
                        title="Clear all" className="p-1 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

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
                    <div className="flex items-center justify-between rounded-2xl px-2.5 py-1.5 bg-[var(--bg-subtle)] border border-[var(--line)]">
                        <span className="flex items-center gap-1.5 responsiveTextTable font-semibold text-[var(--ink-muted)]">
                            <span className="grid place-items-center w-4 h-4 rounded-full bg-[var(--brand)] text-[var(--on-brand)] responsiveTextTable font-bold leading-none">$</span>
                            {metricLabel[metric]}
                        </span>
                        <NumericFormat value={usd} displayType="text" thousandSeparator prefix="$"
                            decimalScale={2} fixedDecimalScale
                            className="tabular-nums responsiveTextTitle font-bold text-[var(--ink)] leading-none" />
                    </div>
                }
                {hasEur &&
                    <div className="flex items-center justify-between rounded-2xl px-2.5 py-1.5 bg-[var(--bg-subtle)] border border-[var(--line)]">
                        <span className="flex items-center gap-1.5 responsiveTextTable font-semibold text-[var(--ink-muted)]">
                            <span className="grid place-items-center w-4 h-4 rounded-full bg-[var(--brand-strong)] text-[var(--on-brand)] responsiveTextTable font-bold leading-none">€</span>
                            {metricLabel[metric]}
                        </span>
                        <NumericFormat value={eur} displayType="text" thousandSeparator prefix="€"
                            decimalScale={2} fixedDecimalScale
                            className="tabular-nums responsiveTextTitle font-bold text-[var(--ink)] leading-none" />
                    </div>
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
        </div>
    );
}
