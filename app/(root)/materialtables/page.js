'use client'

import Toast from "../../../components/toast";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { useContext, useEffect, useRef, useState } from "react"
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
import Table from './newTable'
import TableTotals from './totals'
import { v4 as uuidv4 } from 'uuid';
import { TPdfTable } from "./pdfTable";
import { EXD } from "./excel";
import { UserAuth } from "../../../contexts/useAuthContext";
import { delCompExp, loadMaterials, saveMaterials, loadDataSettings } from "../../../utils/utils";
import { DEFAULT_ELEMENTS, UNIT_LABELS, TO_KGS, FROM_KGS } from './constants';
import useMetalPrices from '../../../hooks/useMetalPrices';
import LoadingButton from '../../../components/LoadingButton';
import { BtnIcon } from '../../../components/buttonIcons';
import DocumentImportOverlay from '../../../components/DocumentImportOverlay';

function countDecimalDigits(str) {
    const match = str.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/)
    if (!match) return 0
    const combined = (match[1] || '') + (match[2] || '')
    return combined.replace(/^0+/, '').length
}

// Auto-compute Fe = 100 − sum(all non-Fe elements)
// Returns '' if all elements are empty (new row), else rounded string
function autoFe(row, elements) {
    const nonFe = elements.filter(el => el.key !== 'fe')
    const hasAny = nonFe.some(el => parseFloat(row[el.key]) > 0)
    if (!hasAny) return ''
    const sum = nonFe.reduce((s, el) => s + (parseFloat(row[el.key]) || 0), 0)
    return parseFloat(Math.max(0, 100 - sum).toFixed(2)).toString()
}

const MaterialTables = () => {
    const { settings, ln, setToast } = useContext(SettingsContext)
    const [data, setData] = useState([])
    const [totals, setTotals] = useState({})
    const [loading, setLoading] = useState(true)
    const [nilmePrice, setNilmePrice] = useState('')
    const [showDocImport, setShowDocImport] = useState(false)
    const { uidCollection } = UserAuth()
    const { prices: metalPrices } = useMetalPrices()

    /* The last LME print this page wrote into a table. It's how the poll below
       tells its own value apart from one a person typed — see the comment there.
       A ref, not state: it must be read and rewritten inside the poll without
       queueing another render of its own. */
    const lastLmeRef = useRef('')

    const fmtNum = (v) => {
        if (v == null || v === '') return ''
        const n = Number(v)
        if (isNaN(n)) return v
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    }

    const buildColumns = (table) => {
        if (Object.keys(settings).length === 0) return []
        const elems = table.elements || DEFAULT_ELEMENTS
        const unit = table.unit || 'kgs'
        const cols = []

        if (table.showContainer) {
            cols.push({ accessorKey: 'container', header: 'Container', cell: (props) => <p>{props.getValue()}</p> })
        }
        cols.push({ accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> })
        cols.push({
            accessorKey: 'kgs', header: UNIT_LABELS[unit] || 'Kgs',
            cell: (props) => <p>{fmtNum(props.getValue())}</p>,
            sortingFn: (a, b) => (parseFloat(a.getValue('kgs')) || 0) - (parseFloat(b.getValue('kgs')) || 0),
        })
        elems.forEach(el => cols.push({
            accessorKey: el.key,
            header: el.label,
            cell: (props) => <p>{fmtNum(props.getValue())}</p>,
            sortingFn: (a, b, cid) => (parseFloat(a.getValue(cid)) || 0) - (parseFloat(b.getValue(cid)) || 0),
        }))
        cols.push({ accessorKey: 'del', header: '', enableSorting: false, cell: () => null })
        return cols
    }

    const totalsColumns = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'kgs', header: 'Kgs', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        ...DEFAULT_ELEMENTS.map(el => ({
            accessorKey: el.key, header: el.label,
            cell: (props) => <p>{fmtNum(props.getValue())}</p>,
        })),
        { accessorKey: 'del', header: '', cell: () => null },
    ]

    /* Roll the live Ni LME price forward into both the cost and the sales bar of
       every table. The two track LME alike: the gap between what you buy at and
       what you sell at belongs in each bar's own × % factor, not the base price.

       A field is only rewritten while it's still *ours* — empty, or still holding
       the previous print we put there. The moment someone types their own number
       it stops moving, because a negotiated price has to outlive the next tick;
       silently resetting it 60 seconds later would quietly wrong the margin.

       The poll fires every 60s with a fresh metalPrices object even when the
       rounded price hasn't moved, so return the previous state references on a
       no-op and leave the tables (and totals) alone. */
    useEffect(() => {
        if (metalPrices?.['LME-NI']?.price == null || loading) return
        const liveNi = String(Math.round(metalPrices['LME-NI'].price))
        const prevLme = lastLmeRef.current
        const ours = (v) => v == null || v === '' || v === prevLme
        const stale = (v) => ours(v) && v !== liveNi
        lastLmeRef.current = liveNi
        setNilmePrice(prev => (prev === liveNi ? prev : liveNi))
        setData(prev => {
            let touched = false
            const next = prev.map(t => {
                const costStale = stale(t.prices?.ni)
                const salesStale = stale(t.salesPrices?.ni)
                if (!costStale && !salesStale) return t
                touched = true
                return {
                    ...t,
                    ...(costStale && { prices: { ...t.prices, ni: liveNi } }),
                    ...(salesStale && { salesPrices: { ...t.salesPrices, ni: liveNi } }),
                }
            })
            return touched ? next : prev
        })
    }, [metalPrices, loading]);

    /* One definition of "a blank table", used by both the Add Table button and the
       empty-state seed below. They have to stay identical — if they drift, the
       table you get on first open behaves differently from the one you add by
       hand, which is the kind of bug nobody thinks to look for.
       Takes nilme as an argument rather than reading nilmePrice from state,
       because the seed runs inside loadData before that state has been set. */
    /* Fe is the auto-calculated remainder, so it reads last. Saved tables carry
       their own copy of the element list, so changing DEFAULT_ELEMENTS alone would
       only reorder NEW tables and leave existing ones with Fe stranded mid-row.
       Applied on load so both cases agree. Order of the other elements — including
       any the user dragged — is preserved exactly. */
    const moveFeLast = (elements) => {
        const list = elements || DEFAULT_ELEMENTS
        const fe = list.find(e => e.key === 'fe')
        return fe ? [...list.filter(e => e.key !== 'fe'), fe] : list
    }

    const makeBlankTable = (nilme) => ({
        id: uuidv4(), name: '', unit: 'kgs',
        elements: [...DEFAULT_ELEMENTS],
        prices: nilme ? { ni: nilme } : {},
        containerNo: '', showContainer: false, containerLabel: 'Container',
        showCosts: false, costLabel: 'Price', niPercent: 100, priceKeys: null, data: [],
        salesPrices: nilme ? { ni: nilme } : {}, showSales: false, salesLabel: 'Sales Price',
        salesNiPercent: 100, salesPriceKeys: null,
    })

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const [dt, formulaData] = await Promise.all([
                loadMaterials(uidCollection),
                loadDataSettings(uidCollection, 'formulasCalc').catch(() => ({})),
            ])
            const nilme = formulaData?.general?.nilme ? String(formulaData.general.nilme) : ''
            setNilmePrice(nilme)
            /* Whatever the settings seeded is the page's own value, so the first
               poll is free to move it. Without this the poll would read every
               seeded field as hand-typed and freeze on load. */
            lastLmeRef.current = nilme
            const normalized = (dt || []).map(t => ({
                ...t,
                name: t.name || '',
                unit: t.unit || 'kgs',
                elements: moveFeLast(t.elements),
                prices: { ...(nilme ? { ni: nilme } : {}), ...(t.prices || {}) },
                containerNo: t.containerNo || '',
                showContainer: t.showContainer || false,
                containerLabel: t.containerLabel || 'Container',
                showCosts: t.showCosts || false,
                costLabel: t.costLabel || 'Price',
                niPercent: t.niPercent != null ? t.niPercent : 100,
                priceKeys: t.priceKeys || null,
                /* Sales fields default in for tables saved before this existed.
                   salesPrices is seeded with the LME nickel price the same way
                   prices is, so the sales bar opens filled rather than at 0. */
                salesPrices: { ...(nilme ? { ni: nilme } : {}), ...(t.salesPrices || {}) },
                showSales: t.showSales || false,
                salesLabel: t.salesLabel || 'Sales Price',
                salesNiPercent: t.salesNiPercent != null ? t.salesNiPercent : 100,
                salesPriceKeys: t.salesPriceKeys || null,
            }))
            /* Never land on a blank page. With no saved tables the user previously
               saw an empty shell and had to work out that "+ Add Table" was the
               way in; now the page opens on one ready-to-fill table, exactly the
               one that button would have created.
               This is LOCAL state only — nothing is written to Firestore until the
               user presses Save, so opening the page never creates a stray empty
               table for someone who just looked and left. */
            setData(normalized.length ? normalized : [makeBlankTable(nilme)])
            setLoading(false)
        }
        loadData()
    }, [])

    const addTable = () => {
        setData(prev => [...prev, makeBlankTable(nilmePrice)])
    }

    /* Build a whole table from a packing list / weight list / analysis certificate.
       This page is the one place in the app where the document being retyped IS a
       table — a bundle per line with a weight and a percentage per element — so the
       reader returns rows rather than the single `analysis` string the contract and
       invoice schemas produce (see the materialtable branch in
       app/api/ai/document-reader/route.js).

       It appends a NEW table rather than filling the one on screen: a packing list
       covers one container, and merging it into whatever happens to be open would
       silently mix two shipments' bundles. */
    const applyDocument = (out) => {
        const table = makeBlankTable(nilmePrice)
        if (out.tableName) table.name = out.tableName
        if (out.unit) table.unit = out.unit
        if (out.containerNo) {
            table.containerNo = out.containerNo
            table.showContainer = true
        }
        table.data = (out.rows || []).map(r => {
            const row = { id: uuidv4(), material: r.material || '', kgs: r.weight != null ? String(r.weight) : '', container: out.containerNo || '', _feManual: false }
            DEFAULT_ELEMENTS.forEach(el => {
                const v = r.elements?.[el.key]
                row[el.key] = v != null ? String(v) : ''
            })
            // The reader is told to leave Fe null — it is the balance, and this is the
            // same computation the table itself runs on every edit.
            if (!row.fe) row.fe = autoFe(row, DEFAULT_ELEMENTS)
            return row
        })
        setData(prev => [...prev, table])
        setToast({
            show: true,
            text: table.data.length ? `Added "${table.name || 'table'}" — ${table.data.length} row${table.data.length === 1 ? '' : 's'}` : 'Added an empty table — nothing was read from that document',
            clr: table.data.length ? 'success' : 'warning',
        })
    }

    const saveTable = async () => {
        const result = await saveMaterials(uidCollection, data)
        result && setToast({ show: true, text: 'Saved successfully!', clr: 'success' })
    }

    const addMaterial = (table) => {
        const elems = table.elements || DEFAULT_ELEMENTS
        const newRow = { id: uuidv4(), material: '', kgs: '', container: '', _feManual: false }
        elems.forEach(el => { newRow[el.key] = '' })
        setData(prev => prev.map(t => t.id === table.id
            ? { ...table, data: [...table.data, newRow] } : t))
    }

    const delMaterial = (table1, cell) => {
        setData(prev => prev.map(t => t.id === table1.id
            ? { ...table1, data: table1.data.filter(x => x.id !== cell.row.original.id) } : t))
    }

    const delTable = async (table1) => {
        if (table1.data.length === 0) {
            setData(prev => prev.filter(t => t.id !== table1.id))
            await delCompExp(uidCollection, 'materialtables', table1)
            setToast({ show: true, text: 'Table deleted!', clr: 'success' })
        } else {
            setToast({ show: true, text: 'Table contains materials!', clr: 'fail' })
        }
    }

    // Convert all weight values when unit changes
    const setUnit = (tableId, newUnit) => {
        setData(prev => prev.map(t => {
            if (t.id !== tableId) return t
            const oldUnit = t.unit || 'kgs'
            if (oldUnit === newUnit) return t
            const factor = (TO_KGS[oldUnit] || 1) * (FROM_KGS[newUnit] || 1)
            return {
                ...t, unit: newUnit,
                data: t.data.map(row => {
                    const v = parseFloat(row.kgs)
                    if (isNaN(v) || row.kgs === '') return row
                    const result = v * factor
                    // Round to integer for kgs/lbs to avoid floating point drift (e.g. 80000 * 0.001 * 1000)
                    const converted = (newUnit === 'kgs' || newUnit === 'lbs')
                        ? Math.round(result).toString()
                        : parseFloat(result.toFixed(6)).toString()
                    return { ...row, kgs: converted }
                }),
            }
        }))
    }

    const addElement = (tableId, key, label) => {
        const k = key.trim().toLowerCase().replace(/\s+/g, '_')
        const lbl = (label || '').trim() || key.trim().charAt(0).toUpperCase() + key.trim().slice(1)
        setData(prev => prev.map(t => {
            if (t.id !== tableId) return t
            const elems = t.elements || DEFAULT_ELEMENTS
            if (elems.some(e => e.key === k)) return t
            return { ...t, elements: [...elems, { key: k, label: lbl }] }
        }))
    }

    const removeElement = (tableId, key) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : {
            ...t, elements: (t.elements || DEFAULT_ELEMENTS).filter(e => e.key !== key),
        }))
    }

    const reorderElements = (tableId, newElements) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, elements: newElements }))
    }

    const setPrice = (tableId, key, val) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : {
            ...t, prices: { ...(t.prices || {}), [key]: val },
        }))
    }

    const setContainerNo = (tableId, val) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, containerNo: val }))
    }

    const toggleContainer = (tableId) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, showContainer: !t.showContainer }))
    }

    const setTableName = (tableId, name) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, name }))
    }

    const setContainerLabel = (tableId, containerLabel) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, containerLabel }))
    }

    const setCostLabel = (tableId, costLabel) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, costLabel }))
    }

    const setNiPercent = (tableId, niPercent) => {
        const v = Math.min(100, Math.max(0, parseFloat(niPercent) || 0))
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, niPercent: v }))
    }

    const toggleCosts = (tableId) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, showCosts: !t.showCosts }))
    }

    /* ── Sales side ───────────────────────────────────────────────────────────
       Deliberately a mirror of the cost handlers above, on its own set of fields
       (salesPrices / showSales / salesLabel / salesPriceKeys / salesNiPercent).
       Keeping them separate rather than parameterising one handler means the two
       panels can never contaminate each other's prices — the whole point is to
       compare a purchase price against a sale price on the same rows. */
    const setSalesPrice = (tableId, key, val) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : {
            ...t, salesPrices: { ...(t.salesPrices || {}), [key]: val },
        }))
    }

    const setSalesLabel = (tableId, salesLabel) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, salesLabel }))
    }

    const setSalesNiPercent = (tableId, v) => {
        const n = Math.min(100, Math.max(0, parseFloat(v) || 0))
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, salesNiPercent: n }))
    }

    const toggleSales = (tableId) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, showSales: !t.showSales }))
    }

    const applySalesPreset = (tableId, keys) => {
        setData(prev => prev.map(t => {
            if (t.id !== tableId) return t
            // Same rule as the cost preset: keep only prices for elements in the preset.
            const newPrices = {}
            keys.forEach(k => { if (t.salesPrices?.[k] != null) newPrices[k] = t.salesPrices[k] })
            return { ...t, salesPriceKeys: keys, salesPrices: newPrices }
        }))
    }

    const applyPreset = (tableId, keys) => {
        setData(prev => prev.map(t => {
            if (t.id !== tableId) return t
            // Keep prices only for elements in the preset — clears non-preset prices
            const newPrices = {}
            keys.forEach(k => { if (t.prices?.[k] != null) newPrices[k] = t.prices[k] })
            return { ...t, prices: newPrices, priceKeys: keys }
        }))
    }

    const editCell = (table1, e, cell) => {
        const value = e.target.value
        const colId = cell.column.id
        const rowId = cell.row.original.id

        if (colId !== 'material' && colId !== 'container' && colId !== 'kgs') {
            if (countDecimalDigits(value) > 2) return
        }

        setData(prev => prev.map(tbl => {
            if (tbl.id !== table1.id) return tbl
            const elems = tbl.elements || DEFAULT_ELEMENTS
            const hasFe = elems.some(el => el.key === 'fe')
            return {
                ...tbl,
                data: tbl.data.map(row => {
                    if (row.id !== rowId) return row
                    const clean = colId === 'kgs' ? value.replace(/[^0-9.-]/g, '') : value
                    let newRow = { ...row, [colId]: clean }

                    if (colId === 'fe') {
                        // User editing Fe directly
                        if (clean === '') {
                            // Cleared → revert to auto-calc
                            newRow._feManual = false
                            const computed = autoFe(newRow, elems)
                            if (computed !== '') newRow.fe = computed
                        } else {
                            newRow._feManual = true
                        }
                    } else if (hasFe && colId !== 'kgs' && colId !== 'material' && colId !== 'container') {
                        // Non-Fe element changed → recompute Fe unless manually overridden
                        if (!row._feManual) {
                            const computed = autoFe(newRow, elems)
                            if (computed !== '') newRow.fe = computed
                        }
                    }
                    return newRow
                })
            }
        }))
    }

    const runPdf = (table1) => {
        const elems = table1.elements || DEFAULT_ELEMENTS
        const totalKgs = table1.data.reduce((sum, item) => sum + Number(item.kgs), 0)
        const obj = { material: '', kgs: totalKgs }
        elems.forEach(el => {
            const ws = table1.data.reduce((s, row) => s + (parseFloat(row[el.key] || 0) * Number(row.kgs)), 0)
            obj[el.key] = totalKgs > 0 ? (ws / totalKgs).toFixed(2) : '0.00'
        })
        let tmp = [...table1.data, obj].map(z => [
            z.material, z.kgs, ...elems.map(el => z[el.key])
        ]).map(row => row.map((val, idx) => {
            if (idx === 0) return val
            const n = parseFloat(val)
            return isNaN(n) ? '' : new Intl.NumberFormat('en-US', {}).format(n)
        }))
        TPdfTable(tmp, elems, UNIT_LABELS[table1.unit || 'kgs'])
    }

    useEffect(() => {
        if (!data || data.length === 0) return
        const arr = data.map(table => {
            const elems = table.elements || DEFAULT_ELEMENTS
            const totalKgs = table.data.reduce((sum, item) => sum + Number(item.kgs), 0)
            const obj = { kgs: totalKgs }
            elems.forEach(el => {
                const ws = table.data.reduce((s, row) => s + (parseFloat(row[el.key] || 0) * Number(row.kgs)), 0)
                obj[el.key] = totalKgs > 0 ? (ws / totalKgs).toFixed(2) : '0.00'
            })
            return obj
        })
        const totalKgs = arr.reduce((sum, item) => sum + Number(item.kgs), 0)
        const result = { kgs: totalKgs.toFixed(2) }
        DEFAULT_ELEMENTS.forEach(el => {
            const valid = arr.filter(item => !isNaN(parseFloat(item[el.key])))
            const sum = valid.reduce((acc, item) => acc + parseFloat(item[el.key] || 0), 0)
            result[el.key] = valid.length > 0 ? (sum / valid.length).toFixed(2) : '0.00'
        })
        setTotals(result)
        // Identity dep: every mutation goes through setData(prev => prev.map(...)),
        // so a new array reference accompanies every change — no need to serialize
        // the whole dataset on each render just to build a comparison key.
    }, [data])

    return (
        <div className="w-full" style={{ background: "var(--bg-subtle)" }}>
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <TableSkeleton /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />
                        {/* Main Card — the shell the other 18 pages use. This page used to
                            float its header and table cards straight on the background, which
                            is why it read as a different app. */}
                        <div className="page-card rounded-2xl p-3 sm:p-5 mt-8 border border-[var(--line)] shadow-card w-full bg-[var(--bg-card)]">
                            <div className="flex flex-wrap items-end justify-between gap-2 pb-3">
                                <div>
                                    <h1 className="text-display">{getTtl('Material Tables', ln)}</h1>
                                    <p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Element composition & pricing</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setShowDocImport(true)} className="whiteButton">
                                        <BtnIcon action="autofill" />{getTtl('Read Packing List', ln) || 'Read Packing List'}
                                    </button>
                                    <button onClick={addTable} className="blackButton">
                                        <BtnIcon action="add" />{getTtl('Add Table', ln) || 'Add Table'}
                                    </button>
                                    <LoadingButton variant="secondary" onClick={saveTable}>
                                        {getTtl('Save', ln) || 'Save'}
                                    </LoadingButton>
                                </div>
                            </div>
                            <div className="w-full">
                                {data.map((table) => (
                                    /* NOT overflow-hidden. That clipped the preset dropdowns,
                                       which are absolutely positioned inside this card — they
                                       opened, then got cut off at the card edge. The clip only
                                       ever existed to stop the table's square corners poking
                                       past this radius, so it now lives on the table itself
                                       (rounded-b-2xl on its scroll box in newTable.js) where it
                                       does that job without trapping popovers. */
                                    <div key={table.id} className="mb-3 bg-[var(--bg-card)] rounded-2xl border border-[var(--line)]">
                                        <Table
                                            data={table.data}
                                            table1={table}
                                            columns={buildColumns(table)}
                                            addMaterial={() => addMaterial(table)}
                                            editCell={editCell}
                                            delMaterial={delMaterial}
                                            delTable={delTable}
                                            runPdf={runPdf}
                                            excellReport={EXD(table)}
                                            unit={table.unit || 'kgs'}
                                            elements={table.elements || DEFAULT_ELEMENTS}
                                            prices={table.prices || {}}
                                            containerNo={table.containerNo || ''}
                                            showContainer={table.showContainer || false}
                                            containerLabel={table.containerLabel || 'Container'}
                                            setContainerLabel={(v) => setContainerLabel(table.id, v)}
                                            tableName={table.name || ''}
                                            setTableName={(v) => setTableName(table.id, v)}
                                            showCosts={table.showCosts || false}
                                            costLabel={table.costLabel || 'Price'}
                                            setCostLabel={(v) => setCostLabel(table.id, v)}
                                            toggleCosts={() => toggleCosts(table.id)}
                                            niPercent={table.niPercent != null ? table.niPercent : 100}
                                            setNiPercent={(v) => setNiPercent(table.id, v)}
                                            priceKeys={table.priceKeys || null}
                                            setUnit={(u) => setUnit(table.id, u)}
                                            addElement={(k, l) => addElement(table.id, k, l)}
                                            removeElement={(k) => removeElement(table.id, k)}
                                            reorderElements={(els) => reorderElements(table.id, els)}
                                            setPrice={(k, v) => setPrice(table.id, k, v)}
                                            setContainerNo={(v) => setContainerNo(table.id, v)}
                                            toggleContainer={() => toggleContainer(table.id)}
                                            applyPreset={(keys) => applyPreset(table.id, keys)}
                                            salesPrices={table.salesPrices || {}}
                                            showSales={table.showSales || false}
                                            salesLabel={table.salesLabel || 'Sales Price'}
                                            salesNiPercent={table.salesNiPercent != null ? table.salesNiPercent : 100}
                                            salesPriceKeys={table.salesPriceKeys || null}
                                            setSalesPrice={(k, v) => setSalesPrice(table.id, k, v)}
                                            setSalesLabel={(v) => setSalesLabel(table.id, v)}
                                            setSalesNiPercent={(v) => setSalesNiPercent(table.id, v)}
                                            toggleSales={() => toggleSales(table.id)}
                                            applySalesPreset={(keys) => applySalesPreset(table.id, keys)}
                                        />
                                    </div>
                                ))}
                            </div>
                            {(data.length > 0 && !Object.values(totals).some(v => isNaN(v))) && (
                                <div className="w-full pt-1">
                                    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] overflow-hidden">
                                        <TableTotals data={[totals]} columns={totalsColumns} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                }
            </div>
            {showDocImport && (
                <DocumentImportOverlay
                    documentType='materialtable'
                    onApply={applyDocument}
                    onClose={() => setShowDocImport(false)}
                />
            )}
        </div>
    )
}

export default MaterialTables
