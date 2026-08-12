'use client';
import { useContext, useState, useCallback } from 'react';
import { UserAuth } from '../../../contexts/useAuthContext';
import { SettingsContext } from '../../../contexts/useSettingsContext';
import { loadData, resolveDueDate } from '../../../utils/utils';
import { authedFetch } from '../../../utils/aiClient';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Info, Clock } from 'lucide-react';
import { TONES } from '../../../components/statusUtils';
import CountUp from '../../../components/CountUp';

const HORIZONS = [30, 60, 90];

function CurrencyRows({ label, data, colorClass }) {
    const entries = Object.entries(data || {});
    if (!entries.length) return (
        <div>
            <p className='font-semibold mb-0.5' style={{ fontSize: 'var(--fs-table)', color: 'var(--chathams-blue)' }}>{label}</p>
            <p style={{ fontSize: 'var(--fs-body)', color: 'var(--regent-gray)' }}>—</p>
        </div>
    );
    return (
        <div>
            <p className='font-semibold mb-0.5' style={{ fontSize: 'var(--fs-table)', color: 'var(--chathams-blue)' }}>{label}</p>
            {entries.map(([cur, val]) => (
                <p key={cur} className={`font-medium ${colorClass}`} style={{ fontSize: 'var(--fs-input)' }}>
                    {cur} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            ))}
        </div>
    );
}

function ConfidenceBadge({ confidence }) {
    const map = {
        high: { bg: TONES.green.bg, text: TONES.green.text, label: 'High confidence' },
        medium: { bg: TONES.amber.bg, text: TONES.amber.text, label: 'Medium confidence' },
        low: { bg: TONES.red.bg, text: TONES.red.text, label: 'Low confidence' },
    };
    const s = map[confidence] || map.medium;
    return (
        <span className='px-2 py-0.5 rounded-lg font-medium' style={{ fontSize: 'var(--fs-caption)', backgroundColor: s.bg, color: s.text }}>
            {s.label}
        </span>
    );
}

const ForecastPanel = () => {
    const { uidCollection } = UserAuth();
    const { settings } = useContext(SettingsContext);

    const [activeHorizon, setActiveHorizon] = useState(30);
    const [results, setResults] = useState({}); // keyed by horizon
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [opened, setOpened] = useState(false);

    const resolveCurrency = useCallback((f) => {
        const list = settings?.Currency?.Currency || [];
        return f?.cur ? f.cur : list.find(c => c.id === f)?.cur || f || 'USD';
    }, [settings]);

    const loadAndForecast = useCallback(async (horizon) => {
        if (!uidCollection) return;
        if (results[horizon]) { setActiveHorizon(horizon); return; }

        setLoading(true);
        setError(null);
        try {
            // The forecast needs every invoice/expense whose DUE date is within the
            // horizon OR already overdue — that pool is independent of the cashflow
            // page's date filter (which slices by ISSUE date). Using `dateSelect`
            // here meant a user filtering "this month only" saw a USD 0 forecast
            // because invoices issued in earlier months were excluded even when
            // their due date is days away. So we load a wide fixed window:
            // 3 years back through 1 year forward (covers all realistic open AR/AP).
            const todayYr = new Date().getFullYear();
            const forecastRange = {
                start: `${todayYr - 3}-01-01`,
                end: `${todayYr + 1}-12-31`,
            };
            const [rawInvoices, rawExpenses] = await Promise.all([
                loadData(uidCollection, 'invoices', forecastRange),
                loadData(uidCollection, 'expenses', forecastRange),
            ]);

            const clientList = settings?.Client?.Client || [];
            const resolveClient = f => f?.nname ? f.nname : clientList.find(c => c.id === f)?.nname || f || 'Unknown';

            const invoices = (rawInvoices || []).map(inv => {
                const totalAmt = parseFloat(inv.totalAmount) || 0;
                const totalPaid = (inv.payments || []).reduce((s, p) => s + (parseFloat(p.pmnt) || 0), 0);
                const balanceDue = inv.debtBlnc != null ? parseFloat(inv.debtBlnc) : totalAmt - totalPaid;
                const paymentStatus = balanceDue <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
                // "Issued" = not a draft and not canceled (matches Cashflow debt logic)
                const isCanceled = !!inv.canceled;
                return {
                    isFinal: inv.draft !== true && !isCanceled,
                    canceled: isCanceled,
                    paymentStatus,
                    balanceDue: balanceDue > 0 ? balanceDue : 0,
                    currency: resolveCurrency(inv.cur),
                    dueDate: resolveDueDate(inv),
                    client: resolveClient(inv.client),
                };
            });

            // Project convention: expense.paid === '111' means Paid
            const expenses = (rawExpenses || []).map(exp => ({
                amount: parseFloat(exp.amount) || 0,
                currency: resolveCurrency(exp.cur),
                date: exp.date,
                isPaid: exp.paid === '111',
            }));

            // Use the user's configured base currency (Company Details) if set, else USD
            const baseCurrency = settings?.AppSettings?.AppSettings?.[0]?.baseCurrency
                || settings?.Currency?.Currency?.[0]?.cur
                || 'USD';

            const res = await authedFetch('/api/ai/cash-forecast', {
                method: 'POST',
                body: JSON.stringify({ horizon, invoices, expenses, uid: uidCollection, baseCurrency }),
            });
            if (!res.ok) throw new Error('Forecast failed');
            const data = await res.json();
            setResults(prev => ({ ...prev, [horizon]: data }));
            setActiveHorizon(horizon);
        } catch (e) {
            setError(e.message || 'Failed to generate forecast');
        } finally {
            setLoading(false);
        }
    }, [uidCollection, settings, results, resolveCurrency]);

    // Toggle — the old handler could only OPEN (guarded on !opened), so the ▲
    // arrow never collapsed the panel. Closing keeps the cached results; the
    // forecast only (re)loads when opening without data for the horizon.
    const handleOpen = () => {
        if (opened) { setOpened(false); return; }
        setOpened(true);
        if (!results[activeHorizon]) loadAndForecast(activeHorizon || 30);
    };

    const handleRefresh = () => {
        setResults({});
        loadAndForecast(activeHorizon);
    };

    const result = results[activeHorizon];

    return (
        <section className='mb-3 rounded-2xl overflow-hidden' style={{ border: '1px solid var(--line)' }} aria-labelledby='forecast-panel-title'>
            {/* Header / toggle — div+role rather than <button> so the inner
                Refresh <button> can be a real nested interactive element
                (nested <button> inside <button> is invalid HTML and hard-errors
                in React 19). Keyboard support preserved via onKeyDown. */}
            <div
                onClick={handleOpen}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); } }}
                role='button'
                tabIndex={0}
                aria-expanded={opened}
                aria-controls='forecast-panel-body'
                className='w-full flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30'
                style={{ background: 'var(--bg-subtle)' }}
            >
                <div className='flex items-center gap-2'>
                    <TrendingUp className='w-3.5 h-3.5' style={{ color: 'var(--brand)' }} />
                    <span id='forecast-panel-title' className='font-semibold' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)' }}>
                        AI Cash Forecast
                    </span>
                    {result && <ConfidenceBadge confidence={result.confidence} />}
                </div>
                <div className='flex items-center gap-2'>
                    {result && (
                        <button
                            onClick={e => { e.stopPropagation(); handleRefresh(); }}
                            aria-label='Refresh cash forecast'
                            className='p-1 rounded-full hover:bg-[var(--bg-sunken)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30'
                        >
                            <RefreshCw className='w-3 h-3' style={{ color: 'var(--brand)' }} aria-hidden='true' />
                        </button>
                    )}
                    <span style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-secondary)' }}>
                        {opened ? '▲' : '▼'}
                    </span>
                </div>
            </div>

            {opened && (
                <div className='p-3 bg-[var(--bg-card)]'>
                    {/* Horizon tabs */}
                    <div className='inline-flex gap-1 mb-3 bg-[var(--bg-subtle)] border border-[var(--line)] rounded-full p-0.5'>
                        {HORIZONS.map(h => (
                            <button
                                key={h}
                                onClick={() => loadAndForecast(h)}
                                disabled={loading}
                                className='px-3 py-1 rounded-lg font-medium transition-all disabled:opacity-50'
                                style={{
                                    fontSize: 'var(--fs-table)',
                                    background: activeHorizon === h ? 'var(--endeavour)' : 'var(--surface-pill)',
                                    color: activeHorizon === h ? 'var(--on-brand)' : 'var(--chathams-blue)',
                                    border: `1px solid ${activeHorizon === h ? 'var(--endeavour)' : 'var(--border-divider)'}`,
                                }}
                            >
                                {h}d
                            </button>
                        ))}
                    </div>

                    {/* Loading state */}
                    {loading && (
                        <div className='flex items-center gap-2 py-4 justify-center'>
                            <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--endeavour)' }} />
                            <span style={{ fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)' }}>Generating forecast…</span>
                        </div>
                    )}

                    {/* Error state */}
                    {!loading && error && (
                        <div className='flex items-center gap-2 py-2 px-3 rounded-lg' style={{ background: TONES.red.bg, border: `1px solid ${TONES.red.border}` }}>
                            <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' style={{ color: TONES.red.text }} />
                            <span style={{ fontSize: 'var(--fs-table)', color: TONES.red.text }}>{error}</span>
                        </div>
                    )}

                    {/* Results */}
                    {!loading && result && (
                        <div>
                            {/* Unified base-currency total (includes overdue) */}
                            {result.baseTotals && result.baseCurrency && (
                                <div className='rounded-2xl p-3 mb-3 flex items-center justify-between flex-wrap gap-2'
                                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)' }}>
                                    <div>
                                        <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--ink-muted)' }}>
                                            Effective net (projected + overdue, all currencies → {result.baseCurrency} @ ECB rates)
                                        </p>
                                        <p className='font-semibold font-display tabular-nums' style={{
                                            fontSize: 'var(--fs-page)',
                                            color: result.baseTotals.net >= 0 ? TONES.green.text : TONES.red.text
                                        }}>
                                            {result.baseTotals.net >= 0 ? '+' : ''}{result.baseCurrency}{' '}
                                            <CountUp value={result.baseTotals.net} format={(n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                                        </p>
                                    </div>
                                    <div className='text-right' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-secondary)' }}>
                                        <div>Inflow (proj+overdue): <span style={{ color: TONES.green.text, fontWeight: 600 }}>{result.baseCurrency} {Number((result.baseTotals.inflow || 0) + (result.baseTotals.overdueInflow || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                                        <div>Outflow (proj+overdue): <span style={{ color: TONES.red.text, fontWeight: 600 }}>{result.baseCurrency} {Number((result.baseTotals.outflow || 0) + (result.baseTotals.overdueOutflow || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                                    </div>
                                </div>
                            )}

                            {/* Three stat boxes */}
                            <div className='grid grid-cols-3 gap-3 mb-3'>
                                <div className='rounded-2xl p-3' style={{ background: TONES.green.bg, border: `1px solid ${TONES.green.border}` }}>
                                    <div className='flex items-center gap-1 mb-1'>
                                        <TrendingUp className='w-3 h-3' style={{ color: TONES.green.text }} />
                                        <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: TONES.green.text }}>Projected Inflow</span>
                                    </div>
                                    <CurrencyRows data={result.inflow} colorClass='text-[var(--ok-text)]' />
                                    <p style={{ fontSize: 'var(--fs-caption)', color: TONES.green.border, marginTop: '2px' }}>
                                        {result.sources.invoiceCount} invoice{result.sources.invoiceCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className='rounded-2xl p-3' style={{ background: TONES.red.bg, border: `1px solid ${TONES.red.border}` }}>
                                    <div className='flex items-center gap-1 mb-1'>
                                        <TrendingDown className='w-3 h-3' style={{ color: TONES.red.text }} />
                                        <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: TONES.red.text }}>Projected Outflow</span>
                                    </div>
                                    <CurrencyRows data={result.outflow} colorClass='text-[var(--bad-text)]' />
                                    <p style={{ fontSize: 'var(--fs-caption)', color: TONES.red.border, marginTop: '2px' }}>
                                        {result.sources.expenseCount} expense{result.sources.expenseCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className='rounded-2xl p-3' style={{ background: TONES.blue.bg, border: `1px solid ${TONES.blue.border}` }}>
                                    <div className='flex items-center gap-1 mb-1' title='Net = projected + already-overdue (the cash that needs to move regardless of when it was originally due)'>
                                        <Minus className='w-3 h-3' style={{ color: TONES.blue.text }} />
                                        <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: TONES.blue.text }}>Net Position (incl. overdue)</span>
                                    </div>
                                    {Object.entries(result.net || {}).map(([cur, val]) => (
                                        <p key={cur} className='font-semibold' style={{ fontSize: 'var(--fs-input)', color: val >= 0 ? TONES.green.text : TONES.red.text }}>
                                            {val >= 0 ? '+' : ''}{cur} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    ))}
                                    {Object.keys(result.net || {}).length === 0 && (
                                        <p style={{ fontSize: 'var(--fs-body)', color: 'var(--regent-gray)' }}>—</p>
                                    )}
                                </div>
                            </div>

                            {/* Already-overdue strip */}
                            {(Object.keys(result.overdueInflow || {}).length > 0 || Object.keys(result.overdueOutflow || {}).length > 0) && (
                                <div className='rounded-lg p-2.5 mb-3 flex items-start gap-2' style={{ background: TONES.red.bg, border: `1px solid ${TONES.red.border}` }}>
                                    <Clock className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' style={{ color: TONES.red.text }} />
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-semibold mb-0.5' style={{ fontSize: 'var(--fs-table)', color: TONES.red.text }}>
                                            Already overdue (not in horizon — still uncollected/unpaid)
                                        </p>
                                        <div className='flex flex-wrap gap-x-3 gap-y-0.5' style={{ fontSize: 'var(--fs-table)', color: TONES.red.text }}>
                                            {Object.entries(result.overdueInflow || {}).map(([cur, val]) => (
                                                <span key={'oi-' + cur}>Receivable: {cur} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({result.sources.overdueInvoiceCount} inv)</span>
                                            ))}
                                            {Object.entries(result.overdueOutflow || {}).map(([cur, val]) => (
                                                <span key={'oo-' + cur}>Payable: {cur} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({result.sources.overdueExpenseCount} exp)</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI insights: assumptions + risks */}
                            <div className='grid grid-cols-2 gap-3'>
                                {result.assumptions?.length > 0 && (
                                    <div className='rounded-lg p-2.5' style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)' }}>
                                        <div className='flex items-center gap-1 mb-1.5'>
                                            <Info className='w-3 h-3' style={{ color: 'var(--brand)' }} />
                                            <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}>Key Assumptions</span>
                                        </div>
                                        <ul className='space-y-0.5'>
                                            {result.assumptions.map((a, i) => (
                                                <li key={i} className='flex items-start gap-1' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink)' }}>
                                                    <span style={{ color: 'var(--brand)' }}>•</span> {a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {result.risks?.length > 0 && (
                                    <div className='rounded-lg p-2.5' style={{ background: TONES.amber.bg, border: `1px solid ${TONES.amber.border}` }}>
                                        <div className='flex items-center gap-1 mb-1.5'>
                                            <AlertTriangle className='w-3 h-3' style={{ color: TONES.amber.text }} />
                                            <span className='font-semibold' style={{ fontSize: 'var(--fs-table)', color: TONES.amber.text }}>Risks</span>
                                        </div>
                                        <ul className='space-y-0.5'>
                                            {result.risks.map((r, i) => (
                                                <li key={i} className='flex items-start gap-1' style={{ fontSize: 'var(--fs-table)', color: TONES.amber.text }}>
                                                    <span style={{ color: TONES.amber.text }}>•</span> {r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--regent-gray)', marginTop: '8px' }}>
                                Generated {result.generatedAt} · cached 15 min · scans all open AR/AP (ignores page date filter)
                            </p>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default ForecastPanel;
