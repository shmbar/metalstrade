'use client'

import Spinner from "../../../components/spinner";
import Toast from "../../../components/toast";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import MarginTable from "./marginTable";
import YearSelect from "../../../components/yearSelect";
import { loadMargins, saveMargins } from "../../../utils/utils";
import { UserAuth } from "../../../contexts/useAuthContext";
import Spin from '../../../components/spinTable';
import VideoLoader from '../../../components/videoLoader';
import Tooltip from "../../../components/tooltip";
import FirstPart from "./firstpart";
import ThirdPart from "./thirdpart";
import dateFormat from "dateformat";
import { AlertTriangle, Loader2, X, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { authedFetch } from '../../../utils/aiClient';

// needed for table body level scope DnD setup
import {
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';

const MOUSE_SENSOR_OPTIONS = {};
const TOUCH_SENSOR_OPTIONS = {};
const KEYBOARD_SENSOR_OPTIONS = {};

import {
    arrayMove,
} from '@dnd-kit/sortable';

// needed for row & cell level scope DnD setup
import { useSortable } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { countDecimalDigits, dataIds, removeNonNumeric } from "./funcs";

// Cell Component
const RowDragHandleCell = ({ rowId }) => {
    const { attributes, listeners } = useSortable({
        id: rowId,
    });
    return (
        // Alternatively, you could set these attributes on the rows themselves
        <button {...attributes} {...listeners} className='cursor-grabbing'>
            🟰
        </button>
    );
};

let newItm = {
    date: null, purchase: '', description: '', supplier: '', client: '',
    margin: '', totalMargin: '', shipped: '', openShip: '', remaining: '',
}

// Table Component
const Margins = () => {

    const { settings, ln, setLoading, loading, setToast, compData, updateSettings } = useContext(SettingsContext);
    const [yr, setYr] = useState()
    const { uidCollection } = UserAuth();
    const [data, setData] = useState([]);
    const [dataGIS, setDataGIS] = useState([]);
    const currentYear = new Date().getFullYear();
    const [incoming, setIncoming] = useState('')
    const [outStandingShip, setOutStandingShip] = useState('')
    const [outStandingShipGIS, setOutStandingShipGIS] = useState('')

    const [purchase, setPurchase] = useState('')
    const [purchaseGIS, setPurchaseGIS] = useState('')
    const [totalMargin, setTotalMargin] = useState('')
    const [totalMarginGIS, setTotalMarginGIS] = useState('')
    const [shipped, setShipped] = useState('')
    const [remaining, setRemaining] = useState('')
    const [remainingGIS, setRemainingGIS] = useState('')

    const cName = compData?.name?.slice(0, 3).toLowerCase()

    // --- Margin Alert state ---
    // This table has no cost/revenue column, so a "% margin" is not derivable.
    // The actionable signal is Total Margin (profit $) at or below a threshold.
    // Threshold lives in Firestore under settings.MarginAlert.threshold so it
    // follows the user account. Default 0 → flag zero/negative-profit items.
    const settingsThreshold = settings?.MarginAlert?.threshold;
    const [threshold, setThreshold] = useState(() => {
        if (settingsThreshold != null) return parseFloat(settingsThreshold);
        if (typeof window === 'undefined') return 0;
        return parseFloat(localStorage.getItem('ims-margin-threshold') || '0');
    });
    const [alertedItems, setAlertedItems] = useState([]);
    const [incompleteCount, setIncompleteCount] = useState(0); // rows with no margin entered yet
    const [alertHistory, setAlertHistory] = useState([]); // [{ month, count, items }]
    const [historyOpen, setHistoryOpen] = useState(false);
    const [alertDismissed, setAlertDismissed] = useState(false);
    const [explainOpen, setExplainOpen] = useState(false);
    const [explaining, setExplaining] = useState(false);
    const [explanation, setExplanation] = useState('');
    const explainScrollRef = useRef(null);
    const thresholdSaveTimer = useRef(null);

    // Sync threshold once settings doc finishes loading
    useEffect(() => {
        if (settingsThreshold != null) {
            const n = parseFloat(settingsThreshold);
            if (!isNaN(n)) setThreshold(n);
        }
    }, [settingsThreshold]);

    const handleThresholdChange = (val) => {
        const n = parseFloat(val);
        if (isNaN(n) || n < 0) return;
        setThreshold(n);
        setAlertDismissed(false);

        // Debounce Firestore write so we don't hammer it on every keystroke
        if (thresholdSaveTimer.current) clearTimeout(thresholdSaveTimer.current);
        thresholdSaveTimer.current = setTimeout(() => {
            if (uidCollection) {
                updateSettings(uidCollection, { threshold: n }, 'MarginAlert', true);
            }
        }, 600);
    };

    const handleExplainAlerts = async () => {
        if (explaining) return;
        setExplainOpen(true);
        setExplaining(true);
        setExplanation('');
        try {
            const res = await authedFetch('/api/ai/margin-alert', {
                method: 'POST',
                body: JSON.stringify({ alertedItems, threshold }),
            });
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') break;
                    try {
                        const { text } = JSON.parse(payload);
                        if (text) setExplanation(prev => prev + text);
                    } catch { /* ignore */ }
                }
            }
        } catch { setExplanation('Failed to load explanation. Please try again.'); }
        finally { setExplaining(false); }
    };

    // Keep the streamed explanation scrolled to the bottom WITHOUT moving the page.
    // We scroll the inner container only — scrollIntoView() on a page-level element
    // yanks the whole window on every token and makes the screen flicker.
    useEffect(() => {
        if (!explainOpen) return;
        const box = explainScrollRef.current;
        if (box) box.scrollTop = box.scrollHeight;
    }, [explanation, explainOpen]);
    // --- End Margin Alert state ---

    useEffect(() => {
        setYr(currentYear)
    }, [])

    useEffect(() => {
        // yr starts undefined and is set after mount (effect above), and
        // uidCollection resolves async. Without this guard Load() ran 2-3x
        // per page open — once with no year/uid (wasted ~566ms fetch that
        // returns 0 rows) — each run also re-triggering the totals effect and
        // a full MarginTable re-render. Skip until both are ready.
        if (!uidCollection || !yr) return;

        const Load = async () => {
            setLoading(true)

            let dt = await loadMargins(uidCollection, yr)

            dt = dt.map(({ items, ids, ...rest }) => ({
                ...rest,
                ids,
                items: ids?.map(id => items?.find(item => item.id === id)).filter(Boolean) || []
            }));

            setData(dt)
            setLoading(false)
        }

        Load();
    }, [yr, uidCollection])

    useEffect(() => {
        // Main totals
        let _purchase = 0, _openShip = 0, _totalMargin = 0, _remaining = 0;
        // GIS totals
        let _purchaseGIS = 0, _openShipGIS = 0, _totalMarginGIS = 0, _remainingGIS = 0;
        const gisData = data.map(z => {
            _purchase    += parseFloat(z.purchase)    || 0;
            _openShip    += parseFloat(z.openShip)    || 0;
            _totalMargin += parseFloat(z.totalMargin) || 0;
            _remaining   += parseFloat(z.remaining)   || 0;

            const gPurchase    = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.purchase    || 0) : 0), 0);
            const gOpenShip    = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.openShip * 1 || 0) : 0), 0);
            const gTotalMargin = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.totalMargin || 0) : 0), 0);
            const gRemaining   = z.items.reduce((a, c) => a + parseFloat(c.gis ? (c.remaining   || 0) : 0), 0);

            _purchaseGIS    += gPurchase;
            _openShipGIS    += gOpenShip;
            _totalMarginGIS += gTotalMargin;
            _remainingGIS   += gRemaining;

            return { ...z, purchase: gPurchase, openShip: gOpenShip, totalMargin: gTotalMargin, remaining: gRemaining };
        });

        setIncoming(_remaining);
        setOutStandingShip(_openShip);
        setPurchase(_purchase);
        setTotalMargin(_totalMargin);
        setShipped(_purchase - _openShip);
        setRemaining(_remaining);

        setDataGIS(gisData);
        setPurchaseGIS(_purchaseGIS);
        setTotalMarginGIS(_totalMarginGIS);
        setOutStandingShipGIS(_openShipGIS);
        setRemainingGIS(_remainingGIS);

        // `purchase` = Qty (MT); `margin` = per-unit profit $; `totalMargin` = total profit $.
        // No cost basis exists so a % can't be computed. Two distinct signals:
        //   • REAL ALERT  → margin was entered and total profit is ≤ threshold (losses / thin deals)
        //   • INCOMPLETE  → a real row (has description or qty) but no margin entered yet
        // Truly blank template rows are ignored entirely.
        const alerted = [];
        const byMonth = new Map();
        let incomplete = 0;
        data.forEach(monthRow => {
            const monthAlerts = [];
            (monthRow.items || []).forEach(item => {
                const qty = parseFloat(item.purchase) || 0;
                const perUnitMargin = parseFloat(item.margin) || 0;
                const totalMarginVal = parseFloat(item.totalMargin) || 0;
                const hasContent = (item.description && String(item.description).trim())
                    || qty > 0 || perUnitMargin !== 0 || totalMarginVal !== 0;
                if (!hasContent) return; // blank template row — ignore

                const marginEntered = perUnitMargin !== 0 || totalMarginVal !== 0;
                if (!marginEntered) {
                    incomplete++; // has data but margin not filled in — not a financial alert
                    return;
                }

                if (totalMarginVal <= threshold) {
                    const row = {
                        ...item,
                        qty,
                        perUnitMargin,
                        totalMarginVal,
                        isLoss: totalMarginVal < 0,
                        month: monthRow.month,
                    };
                    alerted.push(row);
                    monthAlerts.push(row);
                }
            });
            if (monthAlerts.length) {
                byMonth.set(monthRow.month, {
                    month: monthRow.month,
                    count: monthAlerts.length,
                    items: monthAlerts,
                });
            }
        });
        setAlertedItems(alerted);
        setIncompleteCount(incomplete);
        // Sort months descending so the most recent appears first
        const history = [...byMonth.values()].sort((a, b) => Number(b.month) - Number(a.month));
        setAlertHistory(history);
        if (alerted.length > 0) setAlertDismissed(false);
    }, [data, threshold])

    const handleChangeDate = useCallback((e, i, month) => {
        const dd = dateFormat(e, 'yyyy-mm-dd')
        setData(prev => prev.map(z => z.month === month ? {
            ...z, items: z.items.map((x, k) => k === i ? {
                ...x, date: { endDate: dd, startDate: dd }
            } : x)
        } : z))
    }, [])

    const handleCancelDate = useCallback((e, i, month) => {
        setData(prev => prev.map(z => z.month === month ? {
            ...z, items: z.items.map((x, k) => k === i ? {
                ...x, date: { endDate: null, startDate: null }
            } : x)
        } : z))
    }, [])

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;
        setData(prev => {
            const index = prev.findIndex(monthData =>
                monthData.items.some(item => item.id === event.collisions[0].id)
            );
            if (index === -1) return prev;
            const ids = dataIds(prev[index].items);
            const oldIndex = ids.indexOf(active.id);
            const newIndex = ids.indexOf(over.id);
            const reordered = arrayMove(prev[index].items, oldIndex, newIndex);
            return prev.map((x, i) => i === index
                ? { ...x, ids: reordered.map(z => z.id), items: reordered }
                : x
            );
        });
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS),
        useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS),
        useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS)
    );

    const addItem = useCallback((month) => {
        const newId = uuidv4();
        const newItem1 = { ...newItm, id: newId };
        setData(prev => prev.map(z => z.month === month
            ? { ...z, items: [...z.items, newItem1], ids: [...z.ids, newId] }
            : z
        ));
    }, []);

    const deleteRow = useCallback((e, i, month) => {
        setData(prev => prev.map(z => z.month === month ? {
            ...z,
            items: z.items.filter((_, k) => k !== i),
            ids: z.ids.filter((_, k) => k !== i)
        } : z))
    }, [])

    const addMonth = () => {

        const month = data.length + 1;
        const formattedMonth = String(month).padStart(2, '0');

        let newData = [...data, {
            month: formattedMonth, openShip: '', purchase: '', remaining: '', totalMargin: '',
            items: [], ids: []
        }]

        setData(newData)
    }

    const handleChange = useCallback((e, i, month) => {
        if (countDecimalDigits(e.target.value) > 3) return;
        const name = e.target.name;
        const value = name === 'description' ? e.target.value : removeNonNumeric(e.target.value);

        setData(prev => {
            let monthData = prev.map(z => z.month === month ? {
                ...z, items: z.items.map((x, k) => k === i ? { ...x, [name]: value } : x)
            } : z)

            monthData = monthData.map(z => z.month === month ? {
                ...z, items: z.items.map((x, k) => k === i ? {
                    ...x, totalMargin: x.purchase * x.margin,
                    openShip: x.purchase - x.shipped,
                    remaining: (x.purchase - x.shipped) * x.margin
                } : x)
            } : z)

            return monthData.map(z => z.month === month ? {
                ...z,
                remaining: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.remaining / 2 || 0) : (cur.remaining || 0)), 0),
                totalMargin: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.totalMargin / 2 || 0) : (cur.totalMargin || 0)), 0),
                purchase: z.items.reduce((acc, cur) => acc + (cur.purchase * 1 || 0), 0),
                openShip: z.items.reduce((acc, cur) => acc + (cur.openShip * 1 || 0), 0),
            } : z)
        })
    }, [])

    const handleChangeSelect = useCallback((e, i, month, name) => {
        setData((prevData) =>
            prevData.map((z) =>
                z.month === month
                    ? {
                        ...z,
                        items: z.items.map((x, k) =>
                            k === i ? { ...x, [name]: e } : x
                        )
                    }
                    : z
            )
        );
    }, [setData]); // Add `setData` as a dependency

    const handleCheckBox = useCallback((value, i, month) => {
        setData(prev => {
            let newArr = prev.map(z => z.month === month ? {
                ...z, items: z.items.map((x, k) => k === i ? { ...x, gis: value } : x)
            } : z)
            return newArr.map(z => z.month === month ? {
                ...z,
                remaining: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.remaining / 2 || 0) : (cur.remaining || 0)), 0),
                totalMargin: z.items.reduce((acc, cur) => acc + (cur.gis ? (cur.totalMargin / 2 || 0) : (cur.totalMargin || 0)), 0),
                purchase: z.items.reduce((acc, cur) => acc + (cur.purchase * 1 || 0), 0),
                openShip: z.items.reduce((acc, cur) => acc + (cur.openShip * 1 || 0), 0),
            } : z)
        })
    }, []);

    const saveData = async () => {
        let result = await saveMargins(uidCollection, data, yr)
        result && setToast({ show: true, text: 'Data successfully saved!', clr: 'success' })
    }

    const deleteMonth = useCallback((month) => {
        setData(prev => prev.filter(z => z.month !== month));
    }, []);

    return (
        <div className="w-full" style={{ background: "#f8fbff" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />

                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[#b8ddf8] shadow-xl w-full bg-white">

                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Margins', ln)}
                                </h1>

                                <div className='flex items-center gap-3'>
                                    {/* Margin alert threshold — flags items whose total margin (profit) is at/below this amount */}
                                    <div className='flex items-center gap-1.5' title='Flag items whose Total Margin (profit) is at or below this amount. 0 = flag zero/negative profit.'>
                                        <AlertTriangle className='w-3 h-3' style={{ color: '#f59e0b' }} />
                                        <span className='text-xs font-medium whitespace-nowrap' style={{ color: 'var(--chathams-blue)', fontSize: '0.65rem' }}>Alert if total margin ≤</span>
                                        <input
                                            type='number'
                                            min='0'
                                            step='100'
                                            value={threshold}
                                            onChange={e => handleThresholdChange(e.target.value)}
                                            aria-label='Minimum acceptable total margin'
                                            className='w-20 text-center rounded-full border px-2 py-0.5 outline-none focus:border-[var(--endeavour)]'
                                            style={{ fontSize: '0.65rem', borderColor: '#b8ddf8', background: '#f8fbff', color: 'var(--port-gore)' }}
                                        />
                                    </div>
                                    <div className='flex items-center gap-2 group'>
                                        <div className="relative">
                                            <YearSelect yr={yr} setYr={setYr} />
                                        </div>
                                        <Tooltip txt='Select year' />
                                    </div>
                                </div>
                            </div>

                            {/* Margin Alert Banner */}
                            {!loading && !alertDismissed && alertedItems.length > 0 && (
                                <div className='rounded-xl mb-3 overflow-hidden' style={{ border: '1px solid #ffc107', background: '#fff3cd' }} role='alert' aria-live='polite'>
                                    <div className='flex items-center justify-between px-3 py-2'>
                                        <div className='flex items-center gap-2'>
                                            <AlertTriangle className='w-4 h-4 flex-shrink-0' style={{ color: '#d97706' }} />
                                            <span className='font-medium' style={{ fontSize: '0.72rem', color: '#92400e' }}>
                                                {alertedItems.length} item{alertedItems.length > 1 ? 's' : ''} with total margin ≤ {Number(threshold).toLocaleString()}
                                            </span>
                                            <div className='flex flex-wrap gap-1'>
                                                {alertedItems.slice(0, 3).map((item, i) => (
                                                    <span key={i} className='px-2 py-0.5 rounded-full' style={{ fontSize: '0.58rem', background: '#fde68a', color: '#78350f' }}>
                                                        {item.description || 'Item'} · {Number(item.totalMarginVal || 0).toLocaleString()} ({item.month})
                                                    </span>
                                                ))}
                                                {alertedItems.length > 3 && (
                                                    <span className='px-2 py-0.5 rounded-full' style={{ fontSize: '0.58rem', background: '#fde68a', color: '#78350f' }}>
                                                        +{alertedItems.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className='flex items-center gap-1.5'>
                                            <button
                                                onClick={handleExplainAlerts}
                                                disabled={explaining}
                                                className='flex items-center gap-1 px-2.5 py-1 rounded-full text-white transition-all disabled:opacity-60'
                                                style={{ fontSize: '0.62rem', background: '#d97706' }}
                                            >
                                                {explaining ? <Loader2 className='w-3 h-3 animate-spin' /> : null}
                                                Explain with AI
                                                {explainOpen
                                                    ? <ChevronUp className='w-3 h-3' />
                                                    : <ChevronDown className='w-3 h-3' />
                                                }
                                            </button>
                                            <button
                                                onClick={() => setAlertDismissed(true)}
                                                aria-label='Dismiss margin alert banner'
                                                className='p-1 rounded-full hover:bg-[#fde68a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#d97706]/40'
                                            >
                                                <X className='w-3.5 h-3.5' style={{ color: '#92400e' }} aria-hidden='true' />
                                            </button>
                                        </div>
                                    </div>
                                    {explainOpen && (
                                        <div className='px-3 pb-3'>
                                            <div
                                                ref={explainScrollRef}
                                                className='rounded-lg p-2.5 overflow-y-auto'
                                                style={{ background: 'white', border: '1px solid #fde68a', minHeight: '48px', maxHeight: '320px' }}
                                            >
                                                {explanation ? (
                                                    <p className='whitespace-pre-wrap' style={{ fontSize: '0.68rem', color: '#78350f', lineHeight: '1.5' }}>
                                                        {explanation}
                                                    </p>
                                                ) : explaining ? (
                                                    <div className='flex items-center gap-2'>
                                                        <Loader2 className='w-3 h-3 animate-spin' style={{ color: '#d97706' }} />
                                                        <span style={{ fontSize: '0.65rem', color: '#92400e' }}>Analyzing margins…</span>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {/* Alert history (per-month breakdown) */}
                                    {alertHistory.length > 1 && (
                                        <div className='px-3 pb-3'>
                                            <button
                                                onClick={() => setHistoryOpen(o => !o)}
                                                className='flex items-center gap-1 text-left'
                                                style={{ fontSize: '0.62rem', color: '#92400e', fontWeight: 600 }}
                                                aria-expanded={historyOpen}
                                            >
                                                {historyOpen ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
                                                Alert trend across {alertHistory.length} month{alertHistory.length !== 1 ? 's' : ''}
                                            </button>
                                            {historyOpen && (
                                                <div className='rounded-lg p-2 mt-1.5' style={{ background: 'white', border: '1px solid #fde68a' }}>
                                                    <div className='flex items-end gap-1.5 mb-2' style={{ height: '40px' }}>
                                                        {(() => {
                                                            const max = Math.max(...alertHistory.map(h => h.count), 1);
                                                            return alertHistory.slice().reverse().map(h => {
                                                                const heightPct = (h.count / max) * 100;
                                                                return (
                                                                    <div key={h.month} className='flex-1 flex flex-col items-center gap-0.5' title={`Month ${h.month}: ${h.count} alert(s)`}>
                                                                        <div className='w-full rounded-t' style={{
                                                                            height: `${Math.max(heightPct, 8)}%`,
                                                                            background: h.count >= 5 ? '#dc2626' : h.count >= 3 ? '#f59e0b' : '#fbbf24',
                                                                            minHeight: '4px'
                                                                        }} />
                                                                        <span style={{ fontSize: '0.5rem', color: '#92400e' }}>{h.month}</span>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                    <p style={{ fontSize: '0.55rem', color: '#78350f', textAlign: 'center' }}>
                                                        Months with alerts (bar height = count). Tap above to see current items.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quiet data-completeness notice — informational, not an alarm */}
                            {!loading && incompleteCount > 0 && (
                                <div
                                    className='flex items-center gap-2 px-3 py-1.5 mb-3 rounded-lg'
                                    style={{ background: '#f8fbff', border: '1px solid #dbeeff' }}
                                >
                                    <Info className='w-3 h-3 flex-shrink-0' style={{ color: 'var(--regent-gray)' }} />
                                    <span style={{ fontSize: '0.62rem', color: 'var(--regent-gray)' }}>
                                        {incompleteCount} item{incompleteCount !== 1 ? 's have' : ' has'} no margin entered yet — fill in the Margin column to track profitability.
                                    </span>
                                </div>
                            )}

                            {/* Stats Section */}
                            <FirstPart
                                incoming={incoming}
                                outStandingShip={outStandingShip}
                                purchase={purchase}
                                totalMargin={totalMargin}
                                shipped={shipped}
                            />

                            {/* Action Buttons - Keep original position */}
                            <div className="rounded-2xl border border-[#b8ddf8]">
                                <div className="p-2 flex gap-3 mt-3">
                                    <button
                                        className="bg-[#dbeeff] text-[var(--chathams-blue)] font-medium px-3 py-1 text-[0.68rem] rounded-full hover:opacity-90 transition-all"
                                        disabled={data.length >= 12}
                                        onClick={addMonth}
                                    >
                                        Add month
                                    </button>

                                    <button
                                        className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 py-1 text-[0.68rem] rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                        onClick={saveData}
                                    >
                                        Save
                                    </button>
                                </div>

                                {/* Margins Tables */}
                                <div className="w-full p-2 mt-2">
                                    <div className="w-full max-w-8xl divide-y divide-[#dbeeff] rounded-xl">
                                        {data.map(({ month, items, openMonth }) => {
                                            return (
                                                <div key={month}>
                                                    <MarginTable
                                                        month={month}
                                                        year={yr}
                                                        items={items}
                                                        openMonth={openMonth}
                                                        setData={setData}
                                                        uidCollection={uidCollection}
                                                        addItem={addItem}
                                                        deleteMonth={deleteMonth}
                                                        handleChangeDate={handleChangeDate}
                                                        handleChange={handleChange}
                                                        handleChangeSelect={handleChangeSelect}
                                                        deleteRow={deleteRow}
                                                        handleCancelDate={handleCancelDate}
                                                        settings={settings}
                                                        RowDragHandleCell={RowDragHandleCell}
                                                        handleDragEnd={handleDragEnd}
                                                        sensors={sensors}
                                                        handleCheckBox={handleCheckBox}
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Summary Sections */}
                                <div className='flex flex-col lg:flex-row gap-6'>
                                    <ThirdPart
                                        data={data}
                                        remaining={remaining}
                                        outStandingShip={outStandingShip}
                                        purchase={purchase}
                                        totalMargin={totalMargin}
                                        yr={yr}
                                        title='Totals'
                                    />
                                    <ThirdPart
                                        data={dataGIS}
                                        remaining={remainingGIS}
                                        outStandingShip={outStandingShipGIS}
                                        purchase={purchaseGIS}
                                        totalMargin={totalMarginGIS}
                                        yr={yr}
                                        title={cName === 'ims' ? 'Total GIS' : 'Total IMS'}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default Margins;

