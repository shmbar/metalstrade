'use client';
import { useContext, useState, useCallback } from 'react';
import { UserAuth } from '../../../contexts/useAuthContext';
import { SettingsContext } from '../../../contexts/useSettingsContext';
import { loadData, resolveDueDate } from '../../../utils/utils';
import { authedFetch } from '../../../utils/aiClient';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Minus, AlertTriangle, Info, Clock } from 'lucide-react';

const HORIZONS = [30, 60, 90];

function CurrencyRows({ label, data, colorClass }) {
    const entries = Object.entries(data || {});
    if (!entries.length) return (
        <div>
            <p className='font-semibold mb-0.5' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>{label}</p>
            <p style={{ fontSize: '0.68rem', color: 'var(--regent-gray)' }}>—</p>
        </div>
    );
    return (
        <div>
            <p className='font-semibold mb-0.5' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>{label}</p>
            {entries.map(([cur, val]) => (
                <p key={cur} className={`font-semibold ${colorClass}`} style={{ fontSize: '0.78rem' }}>
                    {cur} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            ))}
        </div>
    );
}

function ConfidenceBadge({ confidence }) {
    const map = {
        high: { bg: '#d1fae5', text: '#065f46', label: 'High confidence' },
        medium: { bg: '#fef3c7', text: '#92400e', label: 'Medium confidence' },
        low: { bg: '#fee2e2', text: '#991b1b', label: 'Low confidence' },
    };
    const s = map[confidence] || map.medium;
    return (
        <span className='px-2 py-0.5 rounded-full font-medium' style={{ fontSize: '0.58rem', backgroundColor: s.bg, color: s.text }}>
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

    const handleOpen = () => {
        if (!opened) {
            setOpened(true);
            loadAndForecast(30);
        }
    };

    const handleRefresh = () => {
        setResults({});
        loadAndForecast(activeHorizon);
    };

    const result = results[activeHorizon];

    return (
        <section className='mb-3 rounded-xl overflow-hidden' style={{ border: '1px solid #b8ddf8' }} aria-labelledby='forecast-panel-title'>
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
                className='w-full flex items-center justify-between px-4 py-2.5 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
                style={{ background: '#dbeeff' }}
            >
                <div className='flex items-center gap-2'>
                    <TrendingUp className='w-3.5 h-3.5' style={{ color: 'var(--endeavour)' }} />
                    <span id='forecast-panel-title' className='font-semibold' style={{ fontSize: '0.72rem', color: 'var(--chathams-blue)' }}>
                        AI Cash Forecast
                    </span>
                    {result && <ConfidenceBadge confidence={result.confidence} />}
                </div>
                <div className='flex items-center gap-2'>
                    {result && (
                        <button
                            onClick={e => { e.stopPropagation(); handleRefresh(); }}
                            aria-label='Refresh cash forecast'
                            className='p-1 rounded-full hover:bg-[#b8ddf8] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
                        >
                            <RefreshCw className='w-3 h-3' style={{ color: 'var(--endeavour)' }} aria-hidden='true' />
                        </button>
                    )}
                    <span style={{ fontSize: '0.65rem', color: 'var(--chathams-blue)' }}>
                        {opened ? '▲' : '▼'}
                    </span>
                </div>
            </div>

            {opened && (
                <div className='p-3 bg-white'>
                    {/* Horizon tabs */}
                    <div className='flex gap-1.5 mb-3'>
                        {HORIZONS.map(h => (
                            <button
                                key={h}
                                onClick={() => loadAndForecast(h)}
                                disabled={loading}
                                className='px-3 py-1 rounded-full font-medium transition-all disabled:opacity-50'
                                style={{
                                    fontSize: '0.65rem',
                                    background: activeHorizon === h ? 'var(--endeavour)' : '#f8fbff',
                                    color: activeHorizon === h ? 'white' : 'var(--chathams-blue)',
                                    border: `1px solid ${activeHorizon === h ? 'var(--endeavour)' : '#b8ddf8'}`,
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
                            <span style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>Generating forecast…</span>
                        </div>
                    )}

                    {/* Error state */}
                    {!loading && error && (
                        <div className='flex items-center gap-2 py-2 px-3 rounded-lg' style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                            <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' style={{ color: '#991b1b' }} />
                            <span style={{ fontSize: '0.65rem', color: '#991b1b' }}>{error}</span>
                        </div>
                    )}

                    {/* Results */}
                    {!loading && result && (
                        <div>
                            {/* Unified base-currency total (includes overdue) */}
                            {result.baseTotals && result.baseCurrency && (
                                <div className='rounded-xl p-3 mb-3 flex items-center justify-between flex-wrap gap-2'
                                    style={{ background: 'linear-gradient(135deg, #dbeeff 0%, #f0f9ff 100%)', border: '1px solid #93c5fd' }}>
                                    <div>
                                        <p style={{ fontSize: '0.58rem', color: 'var(--regent-gray)' }}>
                                            Effective net (projected + overdue, all currencies → {result.baseCurrency} @ ECB rates)
                                        </p>
                                        <p className='font-semibold' style={{
                                            fontSize: '1rem',
                                            color: result.baseTotals.net >= 0 ? '#15803d' : '#dc2626'
                                        }}>
                                            {result.baseTotals.net >= 0 ? '+' : ''}{result.baseCurrency} {Number(result.baseTotals.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className='text-right' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>
                                        <div>Inflow (proj+overdue): <span style={{ color: '#15803d', fontWeight: 600 }}>{result.baseCurrency} {Number((result.baseTotals.inflow || 0) + (result.baseTotals.overdueInflow || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                                        <div>Outflow (proj+overdue): <span style={{ color: '#dc2626', fontWeight: 600 }}>{result.baseCurrency} {Number((result.baseTotals.outflow || 0) + (result.baseTotals.overdueOutflow || 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></div>
                                    </div>
                                </div>
                            )}

                            {/* Three stat boxes */}
                            <div className='grid grid-cols-3 gap-3 mb-3'>
                                <div className='rounded-xl p-3' style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                                    <div className='flex items-center gap-1 mb-1'>
                                        <TrendingUp className='w-3 h-3' style={{ color: '#16a34a' }} />
                                        <span className='font-semibold' style={{ fontSize: '0.6rem', color: '#15803d' }}>Projected Inflow</span>
                                    </div>
                                    <CurrencyRows data={result.inflow} colorClass='text-[#15803d]' />
                                    <p style={{ fontSize: '0.55rem', color: '#86efac', marginTop: '2px' }}>
                                        {result.sources.invoiceCount} invoice{result.sources.invoiceCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className='rounded-xl p-3' style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                    <div className='flex items-center gap-1 mb-1'>
                                        <TrendingDown className='w-3 h-3' style={{ color: '#dc2626' }} />
                                        <span className='font-semibold' style={{ fontSize: '0.6rem', color: '#dc2626' }}>Projected Outflow</span>
                                    </div>
                                    <CurrencyRows data={result.outflow} colorClass='text-[#dc2626]' />
                                    <p style={{ fontSize: '0.55rem', color: '#fca5a5', marginTop: '2px' }}>
                                        {result.sources.expenseCount} expense{result.sources.expenseCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className='rounded-xl p-3' style={{ background: '#eff6ff', border: '1px solid #93c5fd' }}>
                                    <div className='flex items-center gap-1 mb-1' title='Net = projected + already-overdue (the cash that needs to move regardless of when it was originally due)'>
                                        <Minus className='w-3 h-3' style={{ color: 'var(--endeavour)' }} />
                                        <span className='font-semibold' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>Net Position (incl. overdue)</span>
                                    </div>
                                    {Object.entries(result.net || {}).map(([cur, val]) => (
                                        <p key={cur} className='font-semibold' style={{ fontSize: '0.78rem', color: val >= 0 ? '#15803d' : '#dc2626' }}>
                                            {val >= 0 ? '+' : ''}{cur} {Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    ))}
                                    {Object.keys(result.net || {}).length === 0 && (
                                        <p style={{ fontSize: '0.68rem', color: 'var(--regent-gray)' }}>—</p>
                                    )}
                                </div>
                            </div>

                            {/* Already-overdue strip */}
                            {(Object.keys(result.overdueInflow || {}).length > 0 || Object.keys(result.overdueOutflow || {}).length > 0) && (
                                <div className='rounded-lg p-2.5 mb-3 flex items-start gap-2' style={{ background: '#fef2f2', border: '1px solid #fca5a5' }}>
                                    <Clock className='w-3.5 h-3.5 flex-shrink-0 mt-0.5' style={{ color: '#dc2626' }} />
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-semibold mb-0.5' style={{ fontSize: '0.62rem', color: '#991b1b' }}>
                                            Already overdue (not in horizon — still uncollected/unpaid)
                                        </p>
                                        <div className='flex flex-wrap gap-x-3 gap-y-0.5' style={{ fontSize: '0.6rem', color: '#7f1d1d' }}>
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
                                    <div className='rounded-lg p-2.5' style={{ background: '#f8fbff', border: '1px solid #dbeeff' }}>
                                        <div className='flex items-center gap-1 mb-1.5'>
                                            <Info className='w-3 h-3' style={{ color: 'var(--endeavour)' }} />
                                            <span className='font-semibold' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>Key Assumptions</span>
                                        </div>
                                        <ul className='space-y-0.5'>
                                            {result.assumptions.map((a, i) => (
                                                <li key={i} className='flex items-start gap-1' style={{ fontSize: '0.62rem', color: 'var(--port-gore)' }}>
                                                    <span style={{ color: 'var(--endeavour)' }}>•</span> {a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {result.risks?.length > 0 && (
                                    <div className='rounded-lg p-2.5' style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                                        <div className='flex items-center gap-1 mb-1.5'>
                                            <AlertTriangle className='w-3 h-3' style={{ color: '#d97706' }} />
                                            <span className='font-semibold' style={{ fontSize: '0.6rem', color: '#92400e' }}>Risks</span>
                                        </div>
                                        <ul className='space-y-0.5'>
                                            {result.risks.map((r, i) => (
                                                <li key={i} className='flex items-start gap-1' style={{ fontSize: '0.62rem', color: '#78350f' }}>
                                                    <span style={{ color: '#d97706' }}>•</span> {r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <p style={{ fontSize: '0.55rem', color: 'var(--regent-gray)', marginTop: '8px' }}>
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
