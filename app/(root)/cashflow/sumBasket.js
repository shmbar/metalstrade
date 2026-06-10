'use client';
import { useRef, useState } from 'react';
import { NumericFormat } from 'react-number-format';
import { Sigma, X, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

const kindLabel = { client: 'Client', supplier: 'Supplier', expense: 'Expense', stock: 'Stock' };

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
    const [pos, setPos] = useState(null); // {left, top} once dragged; else default (bottom-center)
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
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
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
            className={`fixed z-40 w-[19rem] rounded-2xl overflow-hidden font-poppins
                ring-1 ring-[#cfe3f5] border border-white/60
                bg-white/85 backdrop-blur-md shadow-[0_16px_50px_rgba(3,102,174,0.28)]
                animate-in fade-in slide-in-from-bottom-3 duration-300
                ${pos ? '' : 'bottom-4 left-1/2 -translate-x-1/2'}`}
            style={pos ? { left: pos.left, top: pos.top } : undefined}
        >
            {/* Header — drag handle */}
            <div
                onPointerDown={startDrag}
                className="flex items-center justify-between gap-2 px-3 py-2 cursor-grab active:cursor-grabbing select-none
                    bg-gradient-to-br from-[var(--endeavour)] via-[#0a52a0] to-[var(--chathams-blue)] text-white"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="grid place-items-center w-6 h-6 rounded-lg bg-white/20 shrink-0">
                        <Sigma className="w-3.5 h-3.5" />
                    </span>
                    <span className="font-semibold text-[0.78rem] truncate">Selected invoices</span>
                    <span className="shrink-0 text-[0.64rem] font-bold px-1.5 py-0.5 rounded-full bg-white/25">
                        {items.length}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onPointerDown={e => e.stopPropagation()} onClick={copySummary}
                        title="Copy summary" className="p-1 rounded-md hover:bg-white/20 transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={() => setCollapsed(c => !c)}
                        title={collapsed ? 'Show list' : 'Hide list'} className="p-1 rounded-md hover:bg-white/20 transition-colors">
                        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button onPointerDown={e => e.stopPropagation()} onClick={onClear}
                        title="Clear all" className="p-1 rounded-md hover:bg-white/20 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Metric switcher */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-white/60 border-b border-[#eef5fc]">
                {METRICS.map(m => (
                    <button key={m} onClick={() => setMetric(m)}
                        className={`flex-1 text-[0.62rem] font-semibold py-1 rounded-lg transition-colors ${metric === m
                            ? 'bg-[var(--endeavour)] text-white shadow-sm'
                            : 'text-[var(--chathams-blue)] hover:bg-[#dbeeff]'}`}>
                        {metricLabel[m]}
                    </button>
                ))}
            </div>

            {/* Subtotals — always visible, shown as soft stat pills */}
            <div className="px-3 py-2.5 flex flex-col gap-1.5 bg-white/70">
                {hasUsd &&
                    <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5 bg-gradient-to-r from-[#f0f7ff] to-[#dbeeff]/70 border border-[#cfe3f5]">
                        <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold tracking-wide uppercase text-[var(--regent-gray)]">
                            <span className="grid place-items-center w-4 h-4 rounded-full bg-[var(--endeavour)] text-white text-[0.62rem] font-bold leading-none">$</span>
                            {metricLabel[metric]}
                        </span>
                        <NumericFormat value={usd} displayType="text" thousandSeparator prefix="$"
                            decimalScale={2} fixedDecimalScale
                            className="tabular-nums text-[1rem] font-bold text-[var(--chathams-blue)] leading-none" />
                    </div>
                }
                {hasEur &&
                    <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5 bg-gradient-to-r from-[#f0f7ff] to-[#dbeeff]/70 border border-[#cfe3f5]">
                        <span className="flex items-center gap-1.5 text-[0.6rem] font-semibold tracking-wide uppercase text-[var(--regent-gray)]">
                            <span className="grid place-items-center w-4 h-4 rounded-full bg-[var(--chathams-blue)] text-white text-[0.62rem] font-bold leading-none">€</span>
                            {metricLabel[metric]}
                        </span>
                        <NumericFormat value={eur} displayType="text" thousandSeparator prefix="€"
                            decimalScale={2} fixedDecimalScale
                            className="tabular-nums text-[1rem] font-bold text-[var(--chathams-blue)] leading-none" />
                    </div>
                }
                {naCount > 0 &&
                    <div className="text-[0.6rem] text-[var(--regent-gray)] italic">
                        {naCount} item{naCount > 1 ? 's' : ''} ha{naCount > 1 ? 've' : 's'} no {metricLabel[metric].toLowerCase()} — excluded
                    </div>
                }
            </div>

            {/* Selected line items — collapsible */}
            {!collapsed &&
                <div className="max-h-52 overflow-y-auto border-t border-[#eef5fc] bg-white/40">
                    {rows.map(r => (
                        <div key={r.key}
                            className="group flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-[#eef6ff] transition-colors text-[0.7rem]">
                            <div className="min-w-0">
                                <div className="truncate text-[var(--port-gore)] font-medium leading-tight">{r.label || kindLabel[r.kind]}</div>
                                {r.sub && <div className="truncate text-[0.62rem] text-[var(--regent-gray)] leading-tight">{r.sub}</div>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {r.v == null
                                    ? <span className="text-[var(--regent-gray)]">—</span>
                                    : <NumericFormat value={r.v} displayType="text" thousandSeparator
                                        prefix={r.cur === 'us' ? '$' : '€'} decimalScale={2} fixedDecimalScale
                                        className="tabular-nums text-[var(--port-gore)]" />
                                }
                                <button onClick={() => onRemove(r.key)} title="Remove"
                                    className="grid place-items-center w-4 h-4 rounded-full text-[var(--regent-gray)] hover:text-white hover:bg-red-400 opacity-0 group-hover:opacity-100 transition-all">
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
