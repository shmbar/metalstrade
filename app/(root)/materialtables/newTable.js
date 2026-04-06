'use client'

import {
    flexRender, getCoreRowModel, getFilteredRowModel,
    getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { MdDeleteOutline } from "react-icons/md"
import Header from "../../../components/table/header"
import { Filter } from "../../../components/table/filters/filterFunc"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { UNIT_LABELS, UNIT_TO_MT } from './constants'

// Draggable + removable header cell for element columns
function SortableHeaderCell({ id, label, style, onRemove, isFe }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <th
            ref={setNodeRef}
            style={{ ...style, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            {...attributes}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                <span style={{ cursor: isFe ? 'default' : 'grab' }} {...(isFe ? {} : listeners)}>
                    {label}
                    {isFe && <span style={{ fontSize: '8px', color: '#93c5fd', marginLeft: '1px' }}>auto</span>}
                </span>
                {!isFe && (
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={onRemove}
                        style={{ fontSize: '11px', fontWeight: '700', color: '#c4d4e4', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1 }}
                    >×</button>
                )}
            </div>
        </th>
    )
}

const Customtable = ({
    data, columns, excellReport, addMaterial, editCell, table1,
    delMaterial, delTable, runPdf,
    showHeader = true, showFooter = true,
    unit = 'kgs', elements = [], prices = {},
    containerNo = '', showContainer = false,
    setUnit = () => {}, addElement = () => {}, removeElement = () => {},
    reorderElements = () => {}, setPrice = () => {},
    setContainerNo = () => {}, toggleContainer = () => {},
}) => {
    const [globalFilter, setGlobalFilter] = useState('')
    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
    const [columnFilters, setColumnFilters] = useState([])
    const [addElemInput, setAddElemInput] = useState('')
    const [showAddElem, setShowAddElem] = useState(false)
    const [focusedCell, setFocusedCell] = useState(null)

    const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
    const elementKeys = useMemo(() => elements.map(e => e.key), [elements])

    const hasPrices = useMemo(
        () => elements.some(el => el.key !== 'fe' && prices[el.key] !== undefined && prices[el.key] !== ''),
        [elements, prices]
    )

    // Inject Cost PMT + Cost Total columns before 'del' when prices exist
    const enhancedColumns = useMemo(() => {
        if (!columns.length || !hasPrices) return columns
        const delIdx = columns.findIndex(c => c.accessorKey === 'del')

        const costPmtCol = {
            id: 'costPmt', header: 'Cost PMT', enableSorting: false,
            accessorFn: (row) => elements.reduce((sum, el) => {
                if (el.key === 'fe') return sum
                return sum + ((parseFloat(row[el.key]) || 0) / 100) * (parseFloat(prices[el.key]) || 0)
            }, 0),
            cell: (props) => {
                const v = props.getValue()
                if (!v) return <p></p>
                return <p style={{ color: '#003366', fontSize: '10px' }}>
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
                </p>
            },
        }
        const costTotalCol = {
            id: 'costTotal', header: 'Cost Total', enableSorting: false,
            accessorFn: (row) => {
                const wMT = (parseFloat(row.kgs) || 0) * (UNIT_TO_MT[unit] || 0.001)
                const cPmt = elements.reduce((sum, el) => {
                    if (el.key === 'fe') return sum
                    return sum + ((parseFloat(row[el.key]) || 0) / 100) * (parseFloat(prices[el.key]) || 0)
                }, 0)
                return cPmt * wMT
            },
            cell: (props) => {
                const v = props.getValue()
                if (!v) return <p></p>
                return <p style={{ color: '#003366', fontWeight: '600', fontSize: '10px' }}>
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
                </p>
            },
        }
        const cols = [...columns]
        const at = delIdx >= 0 ? delIdx : cols.length
        cols.splice(at, 0, costPmtCol, costTotalCol)
        return cols
    }, [columns, hasPrices, elements, prices, unit])

    const table = useReactTable({
        columns: enhancedColumns, data,
        getCoreRowModel: getCoreRowModel(),
        state: { globalFilter, pagination, columnFilters },
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
    const handleDragEnd = ({ active, over }) => {
        if (!over || active.id === over.id) return
        const oi = elements.findIndex(e => e.key === active.id)
        const ni = elements.findIndex(e => e.key === over.id)
        if (oi !== -1 && ni !== -1) reorderElements(arrayMove(elements, oi, ni))
    }
    const handleAddElement = () => {
        const raw = addElemInput.trim()
        if (!raw) return
        const parts = raw.split('|')
        addElement(parts[0].trim(), (parts[1] || parts[0]).trim())
        setAddElemInput('')
        setShowAddElem(false)
    }

    // 2dp when not focused; 3dp for MT weight; raw text for material/container
    const fmt = (val, colId) => {
        if (colId === 'material' || colId === 'container') return val ?? ''
        if (val === '' || val == null) return ''
        const n = parseFloat(val)
        if (isNaN(n)) return ''
        if (colId === 'kgs' && unit === 'mt') return n.toFixed(3)
        return n.toFixed(2)
    }

    // Footer calculations
    const footerVal = (header) => {
        const colId = header.column.id
        if (colId === 'del' || colId === 'container') return ''
        const rows = table.getFilteredRowModel().rows
        if (colId === 'material') return `${rows.length} items`
        const totalW = rows.reduce((s, r) => s + (parseFloat(r.getValue('kgs')) || 0), 0)
        if (colId === 'kgs') {
            const n = unit === 'mt' ? totalW.toFixed(3) : totalW.toFixed(2)
            return fmtComma(n)
        }
        if (colId === 'costPmt') {
            if (!hasPrices || totalW === 0) return ''
            const wAvg = rows.reduce((s, r) => {
                const kgs = parseFloat(r.getValue('kgs')) || 0
                const cPmt = elements.reduce((sum, el) => {
                    if (el.key === 'fe') return sum
                    return sum + ((parseFloat(r.getValue(el.key)) || 0) / 100) * (parseFloat(prices[el.key]) || 0)
                }, 0)
                return s + cPmt * kgs
            }, 0) / totalW
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(wAvg)
        }
        if (colId === 'costTotal') {
            if (!hasPrices) return ''
            const tot = rows.reduce((s, r) => {
                const wMT = (parseFloat(r.getValue('kgs')) || 0) * (UNIT_TO_MT[unit] || 0.001)
                const cPmt = elements.reduce((sum, el) => {
                    if (el.key === 'fe') return sum
                    return sum + ((parseFloat(r.getValue(el.key)) || 0) / 100) * (parseFloat(prices[el.key]) || 0)
                }, 0)
                return s + cPmt * wMT
            }, 0)
            return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tot)
        }
        const wSum = rows.reduce((s, r) => {
            const kgs = parseFloat(r.getValue('kgs')) || 0
            return s + kgs * (parseFloat(r.getValue(colId)) || 0)
        }, 0)
        const avg = totalW > 0 ? (wSum / totalW).toFixed(2) : '0.00'
        return avg === 'NaN' ? '' : fmtComma(avg)
    }

    const fmtComma = (nStr) => {
        if (!nStr && nStr !== 0) return ''
        nStr += ''
        const x = nStr.split('.')
        let x1 = x[0]
        const x2 = x.length > 1 ? '.' + x[1] : ''
        const rgx = /(\d+)(\d{3})/
        while (rgx.test(x1)) x1 = x1.replace(rgx, '$1,$2')
        return x1 + x2
    }

    const hdrBg = (colId) => {
        if (colId === 'material' || colId === 'kgs' || colId === 'container') return '#dbeafe'
        if (colId === 'fe') return '#e0f2fe'
        if (colId === 'costPmt' || colId === 'costTotal') return '#dcfce7'
        return '#fde8e8'
    }
    const ftrBg = (colId) => {
        if (colId === 'material' || colId === 'kgs' || colId === 'container') return '#dbeafe'
        if (colId === 'fe') return '#bae6fd'
        if (colId === 'costPmt' || colId === 'costTotal') return '#bbf7d0'
        return '#fdd6d6'
    }

    const headers = table.getHeaderGroups()[0]?.headers ?? []
    const totalCols = headers.length

    const unitBtn = (u) => ({
        fontSize: '10px', padding: '1px 9px', height: '22px', borderRadius: '99px',
        border: `1px solid ${unit === u ? 'var(--endeavour)' : '#d8e8f5'}`,
        background: unit === u ? 'var(--endeavour)' : 'transparent',
        color: unit === u ? '#fff' : 'var(--endeavour)',
        cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
    })

    const smallBtn = (active) => ({
        fontSize: '10px', padding: '1px 8px', height: '22px', borderRadius: '99px',
        border: `1px solid ${active ? 'var(--endeavour)' : '#d8e8f5'}`,
        background: active ? '#eef6ff' : 'transparent',
        color: active ? 'var(--endeavour)' : '#9fb8d4',
        cursor: 'pointer',
        fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
    })

    const inputStyle = {
        fontSize: '10px', padding: '1px 8px', height: '22px', borderRadius: '8px',
        border: '1px solid #d8e8f5', background: '#f8fbff', outline: 'none',
        fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
    }

    return (
        <div className="w-full">

            {/* ── Toolbar ── */}
            {showHeader && (
                <div className="flex-shrink-0" style={{ borderBottom: '2px solid var(--selago)', background: 'linear-gradient(90deg,rgba(255,255,255,.95),rgba(250,250,250,.98))' }}>
                    <Header
                        globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                        table={table} excellReport={excellReport} type='mTable'
                        addMaterial={addMaterial} addTable={null} saveTable={null}
                        delTable={delTable} table1={table1} runPdf={runPdf}
                    />
                    {/* Controls row */}
                    <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
                        {/* Unit toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#9fb8d4' }}>Unit:</span>
                            {['mt', 'kgs', 'lbs'].map(u => (
                                <button key={u} onClick={() => setUnit(u)} style={unitBtn(u)}>{UNIT_LABELS[u]}</button>
                            ))}
                        </div>
                        {/* Container column toggle */}
                        <button onClick={toggleContainer} style={smallBtn(showContainer)}>
                            Container col
                        </button>
                        {/* Table-level container number */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '10px', color: '#9fb8d4' }}>Container #:</span>
                            <input
                                value={containerNo}
                                onChange={e => setContainerNo(e.target.value)}
                                placeholder="e.g. TCKU1234567"
                                style={{ ...inputStyle, width: '140px', color: '#374151' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Price bar (always shown when elements exist) ── */}
            {elements.length > 0 && (
                <div style={{ background: '#f0f7ff', borderBottom: '1px solid #d8e8f5', padding: '5px 10px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '9px', color: '#9fb8d4', minWidth: '32px' }}>$/MT:</span>
                        {elements.filter(el => el.key !== 'fe').map(el => {
                            const isNi = el.key === 'ni'
                            return (
                                <div key={el.key} style={{
                                    display: 'flex', alignItems: 'center', gap: '2px',
                                    background: 'white',
                                    border: `1px solid ${isNi ? '#93c5fd' : '#d8e8f5'}`,
                                    borderRadius: '8px', padding: '2px 6px', minWidth: '72px',
                                }}>
                                    <span style={{ fontSize: '10px', color: 'var(--chathams-blue)', fontWeight: '600', minWidth: '18px' }}>
                                        {el.label}
                                    </span>
                                    <input
                                        value={prices[el.key] || ''}
                                        onChange={e => setPrice(el.key, e.target.value)}
                                        placeholder="0"
                                        inputMode="decimal"
                                        style={{
                                            fontSize: '10px', width: '52px', textAlign: 'right',
                                            background: 'transparent', border: 'none', outline: 'none',
                                            color: isNi ? '#0366ae' : '#374151',
                                            fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
                                        }}
                                    />
                                    {isNi && <span style={{ fontSize: '8px', color: '#93c5fd', fontWeight: '600' }}>LME</span>}
                                </div>
                            )
                        })}
                        {hasPrices && (
                            <span style={{ fontSize: '9px', color: '#9fb8d4', marginLeft: '4px' }}>
                                Cost PMT = Σ(% ÷ 100 × $/MT) &nbsp;|&nbsp; Cost Total = Cost PMT × weight in MT
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* ── Desktop table ── */}
            <div className="hidden sm:block">
                <div className="overflow-auto" style={{ maxHeight: '700px' }}>
                    <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0, fontFamily: "var(--font-poppins),'Plus Jakarta Sans',sans-serif" }}>

                        {/* THEAD */}
                        <thead>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={elementKeys} strategy={horizontalListSortingStrategy}>
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.flatMap((header, idx) => {
                                                const isFirst = idx === 0
                                                const colId = header.column.id
                                                const isDel = colId === 'del'
                                                const isElem = elementKeys.includes(colId)
                                                const isFe = colId === 'fe'
                                                const isLast = idx === hg.headers.length - 1

                                                const thStyle = {
                                                    backgroundColor: hdrBg(colId),
                                                    color: 'var(--chathams-blue)',
                                                    padding: '5px 6px', fontSize: '11px', fontWeight: '500',
                                                    textAlign: (colId === 'material' || colId === 'container') ? 'left' : 'center',
                                                    letterSpacing: '0.04em', whiteSpace: 'nowrap', border: 'none',
                                                    borderTopLeftRadius: isFirst ? '10px' : '0',
                                                    borderTopRightRadius: (isLast && !isDel) ? '10px' : '0',
                                                    minWidth: colId === 'material' ? '180px' : colId === 'del' ? '32px' : colId === 'container' ? '100px' : '55px',
                                                }

                                                if (isDel) {
                                                    // Insert + button before del
                                                    const addBtn = (
                                                        <th key="__addElem" style={{ ...thStyle, backgroundColor: '#fde8e8', minWidth: '32px', padding: '5px 4px', borderTopRightRadius: '0' }}>
                                                            {showAddElem ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                    <input
                                                                        autoFocus
                                                                        value={addElemInput}
                                                                        onChange={e => setAddElemInput(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') handleAddElement(); if (e.key === 'Escape') { setAddElemInput(''); setShowAddElem(false) } }}
                                                                        placeholder="Al"
                                                                        style={{ fontSize: '10px', width: '28px', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid #d8e8f5', fontFamily: "var(--font-poppins),'Plus Jakarta Sans',sans-serif" }}
                                                                    />
                                                                    <button onClick={() => { setAddElemInput(''); setShowAddElem(false) }} style={{ fontSize: '10px', color: '#9fb8d4', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setShowAddElem(true)} title="Add element" style={{ fontSize: '14px', fontWeight: '700', color: '#c4d4e4', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>+</button>
                                                            )}
                                                        </th>
                                                    )
                                                    return [addBtn, <th key={header.id} style={{ ...thStyle, borderTopRightRadius: '10px' }} />]
                                                }

                                                if (isElem) {
                                                    return [<SortableHeaderCell key={header.id} id={colId} label={header.column.columnDef.header} style={thStyle} onRemove={() => removeElement(colId)} isFe={isFe} />]
                                                }

                                                return [(
                                                    <th key={header.id} style={thStyle}>
                                                        {header.column.getCanSort() ? (
                                                            <div onClick={header.column.getToggleSortingHandler()} className="cursor-pointer flex items-center gap-1" style={{ justifyContent: (colId === 'material' || colId === 'container') ? 'flex-start' : 'center' }}>
                                                                {header.column.columnDef.header}
                                                                {{ asc: <TbSortAscending className="w-3.5 h-3.5" />, desc: <TbSortDescending className="w-3.5 h-3.5" /> }[header.column.getIsSorted()]}
                                                            </div>
                                                        ) : (
                                                            <span>{header.column.columnDef.header}</span>
                                                        )}
                                                        {header.column.getCanFilter() && <Filter column={header.column} table={table} filterOn={false} />}
                                                    </th>
                                                )]
                                            })}
                                        </tr>
                                    ))}
                                </SortableContext>
                            </DndContext>
                        </thead>

                        {/* TBODY */}
                        <tbody style={{ backgroundColor: '#fff' }}>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className="transition-colors">
                                    {row.getVisibleCells().map(cell => {
                                        const colId = cell.column.id
                                        const isDel = colId === 'del'
                                        const isCost = colId === 'costPmt' || colId === 'costTotal'
                                        const isLeft = colId === 'material' || colId === 'container'
                                        const isFe = colId === 'fe'
                                        const ck = `${row.id}-${colId}`
                                        const focused = focusedCell === ck
                                        return (
                                            <td key={cell.id} style={{ backgroundColor: '#fff', padding: '2px 3px', borderBottom: '1px solid #e8f0f8', borderRight: '1px solid #e8f0f8', verticalAlign: 'middle' }}>
                                                {isDel ? (
                                                    <div className="flex justify-center items-center px-1 py-1">
                                                        <button onClick={() => delMaterial(table1, cell)} className="cursor-pointer transition-colors duration-150 hover:text-red-700">
                                                            <MdDeleteOutline className="w-[18px] h-[18px] text-red-500" />
                                                        </button>
                                                    </div>
                                                ) : isCost ? (
                                                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '3px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '64px', minHeight: '26px' }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        backgroundColor: isFe ? '#eef6ff' : '#f8fbff',
                                                        border: `1px solid ${isFe ? '#93c5fd' : '#d8e8f5'}`,
                                                        borderRadius: '8px', padding: '3px 8px',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: isLeft ? 'flex-start' : 'center',
                                                        minWidth: colId === 'material' ? '180px' : colId === 'container' ? '90px' : '55px',
                                                        minHeight: '26px',
                                                    }}>
                                                        <input
                                                            type="text"
                                                            inputMode={isLeft || colId === 'kgs' ? 'text' : 'decimal'}
                                                            className="w-full border-none bg-transparent focus:outline-none"
                                                            onChange={e => editCell(table1, e, cell)}
                                                            onFocus={() => setFocusedCell(ck)}
                                                            onBlur={() => setFocusedCell(null)}
                                                            value={focused ? (cell.getContext().getValue() ?? '') : fmt(cell.getContext().getValue(), colId)}
                                                            style={{
                                                                fontFamily: "var(--font-poppins),'Plus Jakarta Sans',sans-serif",
                                                                fontSize: '11px',
                                                                color: isFe ? 'var(--endeavour)' : '#1F2937',
                                                                background: 'transparent',
                                                                textAlign: isLeft ? 'left' : 'center',
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>

                        {/* TFOOT */}
                        {showFooter && (
                            <tfoot>
                                <tr>
                                    {headers.map((header, idx) => {
                                        const isFirst = idx === 0
                                        const isLast = idx === totalCols - 1
                                        const colId = header.column.id
                                        return (
                                            <td key={header.id} style={{
                                                backgroundColor: ftrBg(colId),
                                                color: 'var(--chathams-blue)',
                                                padding: '5px 6px', fontSize: '11px', fontWeight: '600',
                                                textAlign: (colId === 'material' || colId === 'container') ? 'left' : 'center',
                                                border: 'none', whiteSpace: 'nowrap',
                                                borderRadius: `${isFirst ? '10px' : '0'} ${isLast ? '10px' : '0'} ${isLast ? '10px' : '0'} ${isFirst ? '10px' : '0'}`,
                                            }}>
                                                {footerVal(header)}
                                            </td>
                                        )
                                    })}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Mobile card view ── */}
            <div className="sm:hidden">
                <div className="overflow-y-auto px-2 py-2 space-y-2" style={{ maxHeight: '700px' }}>
                    {table.getRowModel().rows.map((row, ri) => (
                        <div key={row.id} className="rounded-2xl overflow-hidden shadow-md" style={{ backgroundColor: '#fff', border: '1px solid var(--selago)' }}>
                            <div className="px-3 py-2" style={{ background: '#dbeafe' }}>
                                <span style={{ fontSize: '10px', color: 'var(--chathams-blue)', fontWeight: '500' }}>Row {ri + 1}</span>
                            </div>
                            <div className="p-3 space-y-2">
                                {row.getVisibleCells().map(cell => {
                                    const colId = cell.column.id
                                    if (colId === 'del') return null
                                    const isCost = colId === 'costPmt' || colId === 'costTotal'
                                    const isFe = colId === 'fe'
                                    const ck = `${row.id}-${colId}`
                                    const focused = focusedCell === ck
                                    if (isCost) return (
                                        <div key={cell.id} className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--selago)' }}>
                                            <span style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase' }}>{cell.column.columnDef.header}</span>
                                            <span style={{ color: '#003366', fontSize: '11px', fontWeight: '600' }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                                        </div>
                                    )
                                    return (
                                        <div key={cell.id} className="flex flex-col space-y-1 pb-2 last:pb-0" style={{ borderBottom: '1px solid var(--selago)' }}>
                                            <div style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cell.column.columnDef.header}</div>
                                            <div style={{ backgroundColor: isFe ? '#eef6ff' : '#fff', border: `1px solid ${isFe ? '#93c5fd' : '#c7d7e8'}`, borderRadius: '8px', padding: '4px 8px', minHeight: '28px', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    inputMode={(colId === 'material' || colId === 'container' || colId === 'kgs') ? 'text' : 'decimal'}
                                                    className="w-full border-none bg-transparent focus:outline-none"
                                                    onChange={e => editCell(table1, e, cell)}
                                                    onFocus={() => setFocusedCell(ck)}
                                                    onBlur={() => setFocusedCell(null)}
                                                    value={focused ? (cell.getContext().getValue() ?? '') : fmt(cell.getContext().getValue(), colId)}
                                                    style={{ fontFamily: "var(--font-poppins),'Plus Jakarta Sans',sans-serif", fontSize: '11px', color: isFe ? 'var(--endeavour)' : '#1F2937', background: 'transparent' }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Customtable
