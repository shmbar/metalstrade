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
import { TableSkeleton } from "../../../components/skeletons";
import AutosavePill from "../../../components/AutosavePill";
import Tooltip from "../../../components/tooltip";
import FirstPart from "./firstpart";
import ThirdPart from "./thirdpart";
import dateFormat from "dateformat";
import { AlertTriangle, Loader2, X, ChevronDown, ChevronUp, Info, Search, Undo2 } from 'lucide-react';
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
    // Edits (dates, rows, deleted months…) only lived in local state until "Save", so leaving
    // silently lost them (the reported disappearing dates). Every mutation flips `dirty`, which
    // now drives AUTOSAVE: a debounced save fires ~1.5s after the last change, an unmount flush
    // catches in-app navigation inside that window, and beforeunload still warns on tab close.
    const [dirty, setDirty] = useState(false);
    const [autoSaving, setAutoSaving] = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);
    const dataRef = useRef(data); dataRef.current = data;
    const dirtyRef = useRef(dirty); dirtyRef.current = dirty;

    // ── Undo + search ────────────────────────────────────────────────────────
    // Every mutation handler rebuilds `data` immutably (map/spread), so pushing
    // the pre-mutation reference is a free snapshot — no cloning needed. Pushes
    // within 2s coalesce, so a typing burst is ONE undo step, not one per key.
    const undoStack = useRef([]);
    const lastPushAt = useRef(0);
    const [undoCount, setUndoCount] = useState(0);
    const [query, setQuery] = useState('');
    const pushUndo = useCallback(() => {
        const now = Date.now();
        if (now - lastPushAt.current < 2000) return;
        lastPushAt.current = now;
        undoStack.current.push(dataRef.current);
        if (undoStack.current.length > 25) undoStack.current.shift();
        setUndoCount(undoStack.current.length);
    }, []);
    const undo = useCallback(() => {
        const snap = undoStack.current.pop();
        setUndoCount(undoStack.current.length);
        if (!snap) return;
        lastPushAt.current = 0;
        setDirty(true); // autosave persists the restored state
        setData(snap);
    }, []);
    // The year the CURRENT data belongs to (set when a load completes) — autosave writes to
    // this year, never to a freshly-picked year whose data hasn't loaded yet.
    const dataYrRef = useRef(null);

    useEffect(() => {
        if (!dirty) return;
        const t = setTimeout(async () => {
            if (!uidCollection || dataYrRef.current == null) return;
            setAutoSaving(true);
            const ok = await saveMargins(uidCollection, dataRef.current, dataYrRef.current).catch(() => false);
            setAutoSaving(false);
            if (ok) {
                setDirty(false);
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 2500);
            }
        }, 1500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, dirty, uidCollection]);

    // In-app navigation unmounts the page and would cancel a pending autosave — flush it.
    useEffect(() => () => {
        if (dirtyRef.current && uidCollection && dataYrRef.current != null) {
            saveMargins(uidCollection, dataRef.current, dataYrRef.current).catch(() => { });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uidCollection]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
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
            dataYrRef.current = yr // autosave targets the year this data came from
            setDirty(false)
            setLoading(false)
        }

        reloadRef.current = Load;
        Load();
    }, [yr, uidCollection])

    // Stale sessions were the last way a deleted month could resurrect: an old tab that
    // still held the month in memory would autosave the full list and re-create its doc.
    // Refresh from the server whenever the tab regains focus (the page-load cache also
    // busts on focus, so this reads fresh) — unless there are unsaved local edits.
    const reloadRef = useRef(null);
    useEffect(() => {
        const onFocus = () => { if (!dirtyRef.current) reloadRef.current?.(); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

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

    const handleChangeDate = useCallback((e, id, month) => {
        pushUndo();
        setDirty(true);
        const dd = dateFormat(e, 'yyyy-mm-dd')
        setData(prev => prev.map(z => z.month === month ? {
            ...z, items: z.items.map(x => x.id === id ? {
                ...x, date: { endDate: dd, startDate: dd }
            } : x)
        } : z))
    }, [])

    const handleCancelDate = useCallback((e, id, month) => {
        pushUndo();
        setDirty(true);
        setData(prev => prev.map(z => z.month === month ? {
            ...z, items: z.items.map(x => x.id === id ? {
                ...x, date: { endDate: null, startDate: null }
            } : x)
        } : z))
    }, [])

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (!active || !over || active.id === over.id) return;
        pushUndo();
        setDirty(true);
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
        pushUndo();
        setDirty(true);
        const newId = uuidv4();
        const newItem1 = { ...newItm, id: newId };
        setData(prev => prev.map(z => z.month === month
            ? { ...z, items: [...z.items, newItem1], ids: [...z.ids, newId] }
            : z
        ));
    }, []);

    const deleteRow = useCallback((e, id, month) => {
        // Deletions always get their own snapshot (see deleteMonth).
        lastPushAt.current = 0;
        pushUndo();
        setDirty(true);
        setData(prev => prev.map(z => z.month === month ? {
            ...z,
            items: z.items.filter(x => x.id !== id),
            ids: z.ids.filter(x => x !== id)
        } : z))
    }, [])

    const addMonth = () => {
        pushUndo();
        setDirty(true);
        const month = data.length + 1;
        const formattedMonth = String(month).padStart(2, '0');

        let newData = [...data, {
            month: formattedMonth, openShip: '', purchase: '', remaining: '', totalMargin: '',
            items: [], ids: []
        }]

        setData(newData)
    }

    const handleChange = useCallback((e, id, month) => {
        if (countDecimalDigits(e.target.value) > 3) return;
        const name = e.target.name;
        pushUndo();
        setDirty(true);
        const value = name === 'description' ? e.target.value : removeNonNumeric(e.target.value);

        setData(prev => {
            let monthData = prev.map(z => z.month === month ? {
                ...z, items: z.items.map(x => x.id === id ? { ...x, [name]: value } : x)
            } : z)

            monthData = monthData.map(z => z.month === month ? {
                ...z, items: z.items.map(x => x.id === id ? {
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

    const handleChangeSelect = useCallback((e, id, month, name) => {
        pushUndo();
        setDirty(true);
        setData((prevData) =>
            prevData.map((z) =>
                z.month === month
                    ? {
                        ...z,
                        items: z.items.map(x =>
                            x.id === id ? { ...x, [name]: e } : x
                        )
                    }
                    : z
            )
        );
    }, [setData]); // Add `setData` as a dependency

    const handleCheckBox = useCallback((value, id, month) => {
        pushUndo();
        setDirty(true);
        setData(prev => {
            let newArr = prev.map(z => z.month === month ? {
                ...z, items: z.items.map(x => x.id === id ? { ...x, gis: value } : x)
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
        if (result) { setDirty(false); setToast({ show: true, text: 'Data successfully saved!', clr: 'success' }) }
    }

    const deleteMonth = useCallback((month) => {
        // A deleted month must get its own snapshot — never coalesced into a
        // preceding typing burst.
        lastPushAt.current = 0;
        pushUndo();
        setDirty(true);
        setData(prev => prev.filter(z => z.month !== month));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="w-full" style={{ background: "var(--surface-pill)" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <TableSkeleton /> :
                    <>
                        <Toast />
                        {/* Floating autosave status — visible anywhere on the page, not just the top bar */}
                        <AutosavePill
                            mode={autoSaving ? 'saving' : dirty ? 'info' : savedFlash ? 'saved' : null}
                            text={autoSaving ? 'Saving…' : savedFlash ? 'Saved' : 'Unsaved — autosaving…'}
                        />
                        <VideoLoader loading={loading} fullScreen={true} />

                        {/* Main Card */}
                        <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--border-divider)] shadow-xl w-full bg-[var(--surface-card)]">

                            {/* Header Section */}
                            <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Margins', ln)}
                                </h1>

                                <div className='flex items-center gap-3 flex-wrap'>
                                    {/* Search — filters rows across all months by description / supplier / client */}
                                    <div className='flex items-center gap-1.5'>
                                        <Search className='w-3 h-3' style={{ color: 'var(--regent-gray)' }} />
                                        <input
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder={getTtl('Search', ln) || 'Search…'}
                                            aria-label='Search margin rows'
                                            className='w-36 rounded-full border px-3 py-0.5 outline-none focus:border-[var(--endeavour)]'
                                            style={{ fontSize: 'var(--fs-table)', borderColor: 'var(--border-divider)', background: 'var(--surface-pill)', color: 'var(--port-gore)' }}
                                        />
                                        {query && (
                                            <button onClick={() => setQuery('')} aria-label='Clear search'
                                                className='p-0.5 rounded-full hover:bg-[var(--surface-header)]'>
                                                <X className='w-3 h-3' style={{ color: 'var(--regent-gray)' }} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Undo — restores the state before the last change (edit / row / month) */}
                                    {undoCount > 0 && (
                                        <button
                                            onClick={undo}
                                            title='Undo the last change — works for edits, added/deleted rows and deleted months. Autosave then stores the restored state.'
                                            className='flex items-center gap-1 px-2.5 py-1 rounded-full transition-all hover:opacity-80'
                                            style={{ fontSize: 'var(--fs-table)', background: 'var(--surface-header)', color: 'var(--chathams-blue)', border: '1px solid var(--border-divider)' }}
                                        >
                                            <Undo2 className='w-3 h-3' /> Undo
                                        </button>
                                    )}

                                    {/* Margin alert threshold — flags items whose total margin (profit) is at/below this amount */}
                                    <div className='flex items-center gap-1.5' title='Flag items whose Total Margin (profit) is at or below this amount. 0 = flag zero/negative profit.'>
                                        <AlertTriangle className='w-3 h-3' style={{ color: 'var(--warn-text)' }} />
                                        <span className='responsiveTextInput font-medium whitespace-nowrap' style={{ color: 'var(--chathams-blue)', fontSize: 'var(--fs-table)' }}>Alert if total margin ≤</span>
                                        <input
                                            type='number'
                                            min='0'
                                            step='100'
                                            value={threshold}
                                            onChange={e => handleThresholdChange(e.target.value)}
                                            aria-label='Minimum acceptable total margin'
                                            className='w-20 text-center rounded-full border px-2 py-0.5 outline-none focus:border-[var(--endeavour)]'
                                            style={{ fontSize: 'var(--fs-table)', borderColor: 'var(--border-divider)', background: 'var(--surface-pill)', color: 'var(--port-gore)' }}
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
                                <div className='rounded-2xl mb-3 overflow-hidden' style={{ border: '1px solid var(--warn-text)', background: 'var(--warn-bg)' }} role='alert' aria-live='polite'>
                                    <div className='flex items-center justify-between px-3 py-2'>
                                        <div className='flex items-center gap-2'>
                                            <AlertTriangle className='w-4 h-4 flex-shrink-0' style={{ color: 'var(--warn-text)' }} />
                                            <span className='font-medium' style={{ fontSize: 'var(--fs-input)', color: 'var(--warn-strong)' }}>
                                                {alertedItems.length} item{alertedItems.length > 1 ? 's' : ''} with total margin ≤ {Number(threshold).toLocaleString()}
                                            </span>
                                            <div className='flex flex-wrap gap-1'>
                                                {alertedItems.slice(0, 3).map((item, i) => (
                                                    <span key={i} className='px-2 py-0.5 rounded-full' style={{ fontSize: 'var(--fs-caption)', background: 'var(--warn-border)', color: 'var(--warn-strong)' }}>
                                                        {item.description || 'Item'} · {Number(item.totalMarginVal || 0).toLocaleString()} ({item.month})
                                                    </span>
                                                ))}
                                                {alertedItems.length > 3 && (
                                                    <span className='px-2 py-0.5 rounded-full' style={{ fontSize: 'var(--fs-caption)', background: 'var(--warn-border)', color: 'var(--warn-strong)' }}>
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
                                                style={{ fontSize: 'var(--fs-table)', background: 'var(--warn-text)' }}
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
                                                className='p-1 rounded-full hover:bg-[var(--warn-border)] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(var(--warn-text-rgb),0.4)]'
                                            >
                                                <X className='w-3.5 h-3.5' style={{ color: 'var(--warn-strong)' }} aria-hidden='true' />
                                            </button>
                                        </div>
                                    </div>
                                    {explainOpen && (
                                        <div className='px-3 pb-3'>
                                            <div
                                                ref={explainScrollRef}
                                                className='rounded-lg p-2.5 overflow-y-auto'
                                                style={{ background: 'var(--surface-card)', border: '1px solid var(--warn-border)', minHeight: '48px', maxHeight: '320px' }}
                                            >
                                                {explanation ? (
                                                    <p className='whitespace-pre-wrap' style={{ fontSize: 'var(--fs-body)', color: 'var(--warn-strong)', lineHeight: '1.5' }}>
                                                        {explanation}
                                                    </p>
                                                ) : explaining ? (
                                                    <div className='flex items-center gap-2'>
                                                        <Loader2 className='w-3 h-3 animate-spin' style={{ color: 'var(--warn-text)' }} />
                                                        <span style={{ fontSize: 'var(--fs-table)', color: 'var(--warn-strong)' }}>Analyzing margins…</span>
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
                                                style={{ fontSize: 'var(--fs-table)', color: 'var(--warn-strong)', fontWeight: 600 }}
                                                aria-expanded={historyOpen}
                                            >
                                                {historyOpen ? <ChevronUp className='w-3 h-3' /> : <ChevronDown className='w-3 h-3' />}
                                                Alert trend across {alertHistory.length} month{alertHistory.length !== 1 ? 's' : ''}
                                            </button>
                                            {historyOpen && (
                                                <div className='rounded-lg p-2 mt-1.5' style={{ background: 'var(--surface-card)', border: '1px solid var(--warn-border)' }}>
                                                    <div className='flex items-end gap-1.5 mb-2' style={{ height: '40px' }}>
                                                        {(() => {
                                                            const max = Math.max(...alertHistory.map(h => h.count), 1);
                                                            return alertHistory.slice().reverse().map(h => {
                                                                const heightPct = (h.count / max) * 100;
                                                                return (
                                                                    <div key={h.month} className='flex-1 flex flex-col items-center gap-0.5' title={`Month ${h.month}: ${h.count} alert(s)`}>
                                                                        <div className='w-full rounded-t' style={{
                                                                            height: `${Math.max(heightPct, 8)}%`,
                                                                            background: h.count >= 5 ? 'var(--danger-text)' : h.count >= 3 ? 'var(--warn-text)' : 'var(--warn-border)',
                                                                            minHeight: '4px'
                                                                        }} />
                                                                        <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--warn-strong)' }}>{h.month}</span>
                                                                    </div>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                    <p style={{ fontSize: 'var(--fs-caption)', color: 'var(--warn-strong)', textAlign: 'center' }}>
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
                                    style={{ background: 'var(--surface-pill)', border: '1px solid var(--surface-header)' }}
                                >
                                    <Info className='w-3 h-3 flex-shrink-0' style={{ color: 'var(--regent-gray)' }} />
                                    <span style={{ fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>
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
                            <div className="rounded-2xl border border-[var(--border-divider)]">
                                <div className="p-2 flex gap-3 mt-3">
                                    <button
                                        className="bg-[var(--surface-header)] text-[var(--chathams-blue)] font-medium px-3 py-1 responsiveText rounded-full hover:opacity-90 transition-all"
                                        disabled={data.length >= 12}
                                        onClick={addMonth}
                                    >
                                        Add month
                                    </button>

                                    {autoSaving ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                                            style={{ fontSize: 'var(--fs-table)', background: 'var(--surface-header)', color: 'var(--chathams-blue)', border: '1px solid var(--border-divider)' }}>
                                            <Loader2 className="w-3 h-3 animate-spin" /> Saving…
                                        </span>
                                    ) : dirty ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                                            style={{ fontSize: 'var(--fs-table)', background: 'var(--warn-soft)', color: 'var(--warn-strong)', border: '1px solid var(--warn-border)' }}>
                                            <AlertTriangle className="w-3 h-3" /> Unsaved — autosaving…
                                        </span>
                                    ) : savedFlash ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                                            style={{ fontSize: 'var(--fs-table)', background: 'var(--ok-soft)', color: 'var(--ok-strong)', border: '1px solid var(--ok-border)' }}>
                                            ✓ Saved
                                        </span>
                                    ) : null}
                                    <button
                                        className="bg-[var(--endeavour)] border border-[var(--rock-blue)] text-white px-3 py-1 responsiveText rounded-full hover:bg-[var(--selago)]/30 transition-all"
                                        onClick={saveData}
                                    >
                                        Save
                                    </button>
                                </div>

                                {/* Margins Tables */}
                                <div className="w-full p-2 mt-2">
                                    <div className="w-full max-w-8xl divide-y divide-[var(--surface-header)] rounded-2xl">
                                        {data.map(({ month, items, openMonth }) => {
                                            // Search filters the DISPLAY only — edits address rows by id+month
                                            // and autosave writes the full dataset, so nothing can be lost.
                                            const q = query.trim().toLowerCase();
                                            const supName = (id) => settings?.Supplier?.Supplier?.find(x => x.id === id)?.nname || '';
                                            const cliName = (id) => settings?.Client?.Client?.find(x => x.id === id)?.nname || '';
                                            const shown = !q ? items : items.filter(x =>
                                                String(x.description || '').toLowerCase().includes(q)
                                                || supName(x.supplier).toLowerCase().includes(q)
                                                || cliName(x.client).toLowerCase().includes(q));
                                            if (q && shown.length === 0) return null;
                                            return (
                                                <div key={month}>
                                                    <MarginTable
                                                        month={month}
                                                        year={yr}
                                                        items={shown}
                                                        openMonth={q ? true : openMonth}
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
                                        isGIS
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

