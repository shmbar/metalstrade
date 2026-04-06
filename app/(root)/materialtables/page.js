'use client'

import Toast from "../../../components/toast";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { useContext, useEffect, useState } from "react"
import VideoLoader from '../../../components/videoLoader';
import Table from './newTable'
import TableTotals from './totals'
import { v4 as uuidv4 } from 'uuid';
import { MdDeleteOutline } from "react-icons/md";
import { TPdfTable } from "./pdfTable";
import { EXD } from "./excel";
import { UserAuth } from "../../../contexts/useAuthContext";
import { delCompExp, loadMaterials, saveMaterials } from "../../../utils/utils";
import { DEFAULT_ELEMENTS, UNIT_LABELS } from './constants';


function countDecimalDigits(inputString) {
    const match = inputString.match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return 0;
    const decimalPart = match[1] || '';
    const exponentPart = match[2] || '';
    const combinedPart = decimalPart + exponentPart;
    const trimmedPart = combinedPart.replace(/^0+/, '');
    return trimmedPart.length;
}

const MaterialTables = () => {

    const { settings, ln, setToast } = useContext(SettingsContext);
    const [data, setData] = useState([])
    const [totals, setTotals] = useState({})
    const [loading, setLoading] = useState(true)
    const { uidCollection } = UserAuth();

    const fmtNum = (v) => {
        if (v == null || v === '') return '';
        const n = Number(v);
        if (isNaN(n)) return v;
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    };

    const buildColumns = (table) => {
        if (Object.keys(settings).length === 0) return []
        const elems = table.elements || DEFAULT_ELEMENTS
        const unit = table.unit || 'kgs'
        return [
            { accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> },
            { accessorKey: 'kgs', header: UNIT_LABELS[unit] || 'Kgs', cell: (props) => <p className="max-w-10">{fmtNum(props.getValue())}</p> },
            ...elems.map(el => ({
                accessorKey: el.key,
                header: el.label,
                cell: (props) => <p>{fmtNum(props.getValue())}</p>,
            })),
            { accessorKey: 'del', header: '', cell: () => <div><MdDeleteOutline className='text-slate-400 cursor-pointer' /></div> },
        ]
    }

    const totalsColumns = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'kgs', header: 'Kgs', cell: (props) => <p>{fmtNum(props.getValue())}</p> },
        ...DEFAULT_ELEMENTS.map(el => ({
            accessorKey: el.key,
            header: el.label,
            cell: (props) => <p>{fmtNum(props.getValue())}</p>,
        })),
        { accessorKey: 'del', header: '', cell: () => null },
    ]

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            let dt = await loadMaterials(uidCollection)
            // Normalize to new data structure (backward-compatible)
            dt = (dt || []).map(t => ({
                ...t,
                unit: t.unit || 'kgs',
                elements: t.elements || DEFAULT_ELEMENTS,
                prices: t.prices || {},
            }))
            setData(dt)
            setLoading(false)
        }
        loadData()
    }, [])

    const addTable = () => {
        let dt = [...data, { id: uuidv4(), unit: 'kgs', elements: [...DEFAULT_ELEMENTS], prices: {}, data: [] }]
        setData(dt)
    }

    const saveTable = async () => {
        let result = await saveMaterials(uidCollection, data)
        result && setToast({ show: true, text: 'Saved successfully!', clr: 'success' })
    }

    const addMaterial = (table) => {
        const elems = table.elements || DEFAULT_ELEMENTS
        const newRow = { id: uuidv4(), material: '', kgs: '' }
        elems.forEach(el => { newRow[el.key] = '' })
        let dt = data.map(z => z.id === table.id ? { ...table, data: [...table.data, newRow] } : z)
        setData(dt)
    }

    const delMaterial = (table1, cell) => {
        let dt = data.map(z => z.id === table1.id ? { ...table1, data: table1.data.filter(x => x.id !== cell.row.original.id) } : z);
        setData(dt)
    }

    const delTable = async (table1) => {
        if (table1.data.length === 0) {
            let dt = data.filter(z => z.id !== table1.id);
            setData(dt)
            await delCompExp(uidCollection, 'materialtables', table1)
            setToast({ show: true, text: 'Table successfully deleted!', clr: 'success' })
        } else {
            setToast({ show: true, text: 'Table contains materials!', clr: 'fail' })
            return;
        }
    }

    const setUnit = (tableId, unit) => {
        setData(prev => prev.map(t => t.id === tableId ? { ...t, unit } : t))
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
            ...t,
            elements: (t.elements || DEFAULT_ELEMENTS).filter(e => e.key !== key),
        }))
    }

    const reorderElements = (tableId, newElements) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : { ...t, elements: newElements }))
    }

    const setPrice = (tableId, key, val) => {
        setData(prev => prev.map(t => t.id !== tableId ? t : {
            ...t,
            prices: { ...(t.prices || {}), [key]: val },
        }))
    }

    const runPdf = (table1) => {
        const elems = table1.elements || DEFAULT_ELEMENTS
        const totalKgs = table1.data.reduce((sum, item) => sum + Number(item.kgs), 0)
        const obj = { kgs: totalKgs }
        elems.forEach(el => {
            const weightedSum = table1.data.reduce((sum, row) => sum + (parseFloat(row[el.key] || 0) * Number(row.kgs)), 0)
            obj[el.key] = totalKgs > 0 ? (weightedSum / totalKgs).toFixed(2) : '0.00'
        })
        obj.material = ''

        let tmp = [...table1.data, obj].map(z => [
            z.material,
            z.kgs,
            ...elems.map(el => z[el.key])
        ]).map(row => row.map((value, index) => {
            if (index === 0) return value
            const num = parseFloat(value)
            return isNaN(num) ? '' : new Intl.NumberFormat('en-US', {}).format(num)
        }))

        TPdfTable(tmp, elems, UNIT_LABELS[table1.unit || 'kgs'])
    }

    const editCell = (table1, e, cell) => {
        const value = e.target.value

        if (cell.column.id === 'kgs') {
            const raw = value.replace(/[^0-9.-]/g, '')
            setData(prev => prev.map(tbl =>
                tbl.id === table1.id
                    ? { ...tbl, data: tbl.data.map(row => row.id === cell.row.original.id ? { ...row, kgs: raw } : row) }
                    : tbl
            ))
        } else {
            if (cell.column.id !== 'material' && countDecimalDigits(value) > 2) return
            setData(prev => prev.map(tbl =>
                tbl.id === table1.id
                    ? { ...tbl, data: tbl.data.map(row => row.id === cell.row.original.id ? { ...row, [cell.column.id]: value } : row) }
                    : tbl
            ))
        }
    };

    useEffect(() => {
        if (!data || data.length === 0) return;

        const arr = data.map(table => {
            const elems = table.elements || DEFAULT_ELEMENTS
            const totalKgs = table.data.reduce((sum, item) => sum + Number(item.kgs), 0)
            const obj = { kgs: totalKgs }
            elems.forEach(el => {
                const weightedSum = table.data.reduce((sum, row) => sum + (parseFloat(row[el.key] || 0) * Number(row.kgs)), 0)
                obj[el.key] = totalKgs > 0 ? (weightedSum / totalKgs).toFixed(2) : '0.00'
            })
            return obj
        })

        const totalKgs = arr.reduce((sum, item) => sum + Number(item.kgs), 0)
        const result = { kgs: totalKgs.toFixed(2) }

        DEFAULT_ELEMENTS.forEach(el => {
            const validArr = arr.filter(item => !isNaN(parseFloat(item[el.key])))
            const sum = validArr.reduce((acc, item) => acc + parseFloat(item[el.key] || 0), 0)
            result[el.key] = validArr.length > 0 ? (sum / validArr.length).toFixed(2) : '0.00'
        })

        setTotals(result);
    }, [JSON.stringify(data)]);


    return (
        <div className="w-full">
            <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
                {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
                    <>
                        <Toast />
                        <VideoLoader loading={loading} fullScreen={true} />
                        {/* Main Card */}
                        <div className="rounded-2xl p-2 sm:p-3 mt-2 border border-[#b8ddf8] shadow-xl w-full bg-white relative max-w-7xl mx-auto">
                            {/* Header Section */}
                            <div className="flex flex-col gap-2 pb-2">
                                <h1 className="text-[14px] text-[var(--chathams-blue)] font-poppins responsiveTextTitle border-l-4 border-[var(--chathams-blue)] pl-2" style={{ fontSize: '14px' }}>
                                    {getTtl('Material Tables', ln)}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={addTable}
                                        className="flex items-center gap-1 bg-[var(--endeavour)] text-white text-xs font-medium px-3 h-7 rounded-full hover:opacity-90 transition-all"
                                    >
                                        + {getTtl('Add Table', ln) || 'Add Table'}
                                    </button>
                                    <button
                                        onClick={saveTable}
                                        className="flex items-center text-[var(--endeavour)] border border-[var(--rock-blue)] text-xs font-medium px-3 h-7 rounded-full hover:bg-[var(--selago)] transition-all"
                                    >
                                        {getTtl('Save', ln) || 'Save'}
                                    </button>
                                </div>
                            </div>
                            {/* Table(s) */}
                            <div className="w-full overflow-x-auto mt-1">
                                {data.map(table => (
                                    <div key={table.id} className="mb-2 rounded-2xl border border-[#b8ddf8] shadow-sm overflow-hidden">
                                        <Table
                                            data={table.data}
                                            table1={table}
                                            columns={buildColumns(table)}
                                            addMaterial={() => addMaterial(table)}
                                            addTable={addTable}
                                            saveTable={saveTable}
                                            editCell={editCell}
                                            delMaterial={delMaterial}
                                            delTable={delTable}
                                            runPdf={runPdf}
                                            excellReport={EXD(table)}
                                            unit={table.unit || 'kgs'}
                                            elements={table.elements || DEFAULT_ELEMENTS}
                                            prices={table.prices || {}}
                                            setUnit={(unit) => setUnit(table.id, unit)}
                                            addElement={(key, label) => addElement(table.id, key, label)}
                                            removeElement={(key) => removeElement(table.id, key)}
                                            reorderElements={(elems) => reorderElements(table.id, elems)}
                                            setPrice={(key, val) => setPrice(table.id, key, val)}
                                        />
                                    </div>
                                ))}
                            </div>
                            {/* Totals Section */}
                            {(data.length && !Object.values(totals).some(value => isNaN(value))) ? (
                                <div className="w-full pt-2 overflow-x-auto">
                                    <div className="rounded-2xl border border-[#b8ddf8] shadow-sm overflow-hidden">
                                        <TableTotals
                                            data={[totals]}
                                            columns={totalsColumns}
                                            addMaterial={addMaterial}
                                            editCell={editCell}
                                            delMaterial={delMaterial}
                                            delTable={delTable}
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </>
                }
            </div>
        </div>
    )
}

export default MaterialTables;
