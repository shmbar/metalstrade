'use client'

import Toast from "../../../components/toast";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { useContext, useEffect, useState } from "react"
import VideoLoader from '../../../components/videoLoader';
import Table from './newTable'
import TableTotals from './totals'
import { v4 as uuidv4 } from 'uuid';
import { TPdfTable } from "./pdfTable";
import { EXD } from "./excel";
import { UserAuth } from "../../../contexts/useAuthContext";
import { delCompExp, loadMaterials, saveMaterials, loadDataSettings } from "../../../utils/utils";
import { DEFAULT_ELEMENTS, UNIT_LABELS, TO_KGS, FROM_KGS } from './constants';
import useMetalPrices from '../../../hooks/useMetalPrices';

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
    const { uidCollection } = UserAuth()
    const { prices: metalPrices } = useMetalPrices()

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

    // Auto-update ni price across all tables when live Ni LME price arrives
    useEffect(() => {
        if (metalPrices?.['LME-NI']?.price != null && !loading) {
            const liveNi = String(Math.round(metalPrices['LME-NI'].price));
            setNilmePrice(liveNi);
            setData(prev => prev.map(t => ({
                ...t,
                prices: { ...t.prices, ni: liveNi },
            })));
        }
    }, [metalPrices, loading]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const [dt, formulaData] = await Promise.all([
                loadMaterials(uidCollection),
                loadDataSettings(uidCollection, 'formulasCalc').catch(() => ({})),
            ])
            const nilme = formulaData?.general?.nilme ? String(formulaData.general.nilme) : ''
            setNilmePrice(nilme)
            const normalized = (dt || []).map(t => ({
                ...t,
                name: t.name || '',
                unit: t.unit || 'kgs',
                elements: t.elements || DEFAULT_ELEMENTS,
                prices: { ...(nilme ? { ni: nilme } : {}), ...(t.prices || {}) },
                containerNo: t.containerNo || '',
                showContainer: t.showContainer || false,
                containerLabel: t.containerLabel || 'Container',
                showCosts: t.showCosts || false,
                costLabel: t.costLabel || 'Price',
                niPercent: t.niPercent != null ? t.niPercent : 100,
                priceKeys: t.priceKeys || null,
            }))
            setData(normalized)
            setLoading(false)
        }
        loadData()
    }, [])

    const addTable = () => {
        setData(prev => [...prev, {
            id: uuidv4(), name: '', unit: 'kgs',
            elements: [...DEFAULT_ELEMENTS],
            prices: nilmePrice ? { ni: nilmePrice } : {},
            containerNo: '', showContainer: false, containerLabel: 'Container',
            showCosts: false, costLabel: 'Price', niPercent: 100, priceKeys: null, data: [],
        }])
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
    }, [JSON.stringify(data)])

    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />
                        <div className="rounded-2xl p-2 sm:p-3 mt-2 border border-[#b8ddf8] shadow-xl w-full bg-white relative overflow-hidden">
                            <div className="flex flex-col gap-2 pb-2">
                                <h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">
                                    {getTtl('Material Tables', ln)}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <button onClick={addTable} className="flex items-center gap-1 bg-[var(--endeavour)] text-white responsiveTextTable font-medium px-4 h-[32px] text-[0.8rem] rounded-full hover:opacity-90 transition-all">
                                        + {getTtl('Add Table', ln) || 'Add Table'}
                                    </button>
                                    <button onClick={saveTable} className="flex items-center text-[var(--endeavour)] border border-[var(--rock-blue)] responsiveTextTable font-medium px-4 h-[32px] text-[0.8rem] rounded-full hover:bg-[var(--selago)] transition-all">
                                        {getTtl('Save', ln) || 'Save'}
                                    </button>
                                </div>
                            </div>
                            <div className="w-full overflow-x-auto mt-1">
                                {data.map((table) => (
                                    <div key={table.id} className="mb-2 rounded-2xl border border-[#b8ddf8] shadow-sm">
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
                                        />
                                    </div>
                                ))}
                            </div>
                            {(data.length > 0 && !Object.values(totals).some(v => isNaN(v))) && (
                                <div className="w-full pt-3 overflow-x-auto">
                                    <div className="rounded-2xl border border-[#c8b8f8] shadow-sm overflow-hidden">
                                        <TableTotals data={[totals]} columns={totalsColumns} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default MaterialTables
