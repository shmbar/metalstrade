'use client'

import {
    flexRender, getCoreRowModel, getFilteredRowModel,
    getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import Header from "../../../components/table/header"
import { Filter } from "../../../components/table/filters/filterFunc"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { UNIT_LABELS, UNIT_TO_MT } from './constants'

// Standard elements — cannot be removed (only user-added custom elements have the × button)
const STANDARD_KEYS = new Set(['ni', 'cr', 'mo', 'co', 'w', 'nb', 'fe'])

// Price calculation presets — controls which elements appear in $/MT price row
// Chemistry columns are always full regardless of preset
const PRESETS = [
    { label: 'Ni Cr Fe',          keys: ['ni', 'cr', 'fe'] },
    { label: 'Ni Cr Mo Fe',       keys: ['ni', 'cr', 'mo', 'fe'] },
    { label: 'Ni Cr Mo Co',       keys: ['ni', 'cr', 'mo', 'co'] },
    { label: 'Ni Cr Mo Co Nb',    keys: ['ni', 'cr', 'mo', 'co', 'nb'] },
    { label: 'Ni Cr Mo Co Nb W',  keys: ['ni', 'cr', 'mo', 'co', 'nb', 'w'] },
    { label: 'Ni Cu',             keys: ['ni', 'cu'] },
    { label: 'Full',              keys: ['ni', 'cr', 'mo', 'co', 'nb', 'w', 'cu', 'fe'] },
]

function SortableHeaderCell({ id, label, style, onRemove, isFe, isStandard, sortDir, onSort }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <th
            ref={setNodeRef}
            style={{ ...style, transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            {...attributes}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                <span
                    {...listeners}
                    onClick={onSort}
                    style={{ cursor: 'grab', display: 'flex', alignItems: 'center', gap: '1px', userSelect: 'none' }}
                >
                    {label}
                    {isFe && <span className="responsiveTextTable" style={{ color: '#93c5fd', marginLeft: '2px', fontStyle: 'italic' }}>auto</span>}
                    {sortDir === 'asc' && <TbSortAscending style={{ width: '10px', height: '10px', marginLeft: '1px' }} />}
                    {sortDir === 'desc' && <TbSortDescending style={{ width: '10px', height: '10px', marginLeft: '1px' }} />}
                </span>
                {!isStandard && (
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); onRemove() }}
                        className="responsiveTextTable" style={{ fontWeight: '700', color: '#c4d4e4', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1 }}
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
    containerLabel = 'Container', setContainerLabel = () => {},
    tableName = '', setTableName = () => {},
    showCosts = false, costLabel = 'Price', setCostLabel = () => {}, toggleCosts = () => {},
    niPercent = 100, setNiPercent = () => {},
    priceKeys = null,
    setUnit = () => {}, addElement = () => {}, removeElement = () => {},
    reorderElements = () => {}, setPrice = () => {},
    setContainerNo = () => {}, toggleContainer = () => {},
    applyPreset = () => {},
}) => {
    const [globalFilter, setGlobalFilter] = useState('')
    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
    const [columnFilters, setColumnFilters] = useState([])
    const [addElemInput, setAddElemInput] = useState('')
    const [showAddElem, setShowAddElem] = useState(false)
    const [focusedCell, setFocusedCell] = useState(null)
    const [focusedPrice, setFocusedPrice] = useState(null)
    const [showPresets, setShowPresets] = useState(false)
    const [editingContainerLabel, setEditingContainerLabel] = useState(false)
    const [editingCostLabel, setEditingCostLabel] = useState(false)
    const [showHelp, setShowHelp] = useState(false)

    const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
    const elementKeys = useMemo(() => elements.map(e => e.key), [elements])

    const hasPrices = useMemo(
        () => elements.some(el => el.key !== 'fe' && prices[el.key] !== undefined && prices[el.key] !== ''),
        [elements, prices]
    )

    const niMult = (niPercent || 100) / 100

    // Inject Cost PMT + Cost Total columns before 'del' when prices exist AND showCosts is on
    const enhancedColumns = useMemo(() => {
        if (!columns.length || !hasPrices || !showCosts) return columns
        const delIdx = columns.findIndex(c => c.accessorKey === 'del')
        const costPmtCol = {
            id: 'costPmt', header: 'Cost PMT', enableSorting: true,
            accessorFn: (row) => elements.reduce((sum, el) => {
                const price = parseFloat(prices[el.key]) || 0
                if (!price) return sum
                const mult = el.key === 'ni' ? niMult : 1
                return sum + ((parseFloat(row[el.key]) || 0) / 100) * price * mult
            }, 0),
            cell: (props) => {
                const v = props.getValue()
                if (!v) return <p></p>
                return <p className="responsiveTextTable" style={{ color: '#003366' }}>
                    ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
                </p>
            },
        }
        const costTotalCol = {
            id: 'costTotal', header: 'Cost Total', enableSorting: true,
            accessorFn: (row) => {
                const wMT = (parseFloat(row.kgs) || 0) * (UNIT_TO_MT[unit] || 0.001)
                const cPmt = elements.reduce((sum, el) => {
                    const price = parseFloat(prices[el.key]) || 0
                    if (!price) return sum
                    const mult = el.key === 'ni' ? niMult : 1
                    return sum + ((parseFloat(row[el.key]) || 0) / 100) * price * mult
                }, 0)
                return cPmt * wMT
            },
            cell: (props) => {
                const v = props.getValue()
                if (!v) return <p></p>
                return <p className="responsiveTextTable" style={{ color: '#003366', fontWeight: '600' }}>
                    ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
                </p>
            },
        }
        const cols = [...columns]
        const at = delIdx >= 0 ? delIdx : cols.length
        cols.splice(at, 0, costPmtCol, costTotalCol)
        return cols
    }, [columns, hasPrices, showCosts, elements, prices, unit])

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

    // Format value for blurred display
    const fmt = (val, colId) => {
        if (colId === 'material' || colId === 'container') return val ?? ''
        if (val === '' || val == null) return ''
        const n = parseFloat(val)
        if (isNaN(n)) return ''
        if (colId === 'kgs') {
            // MT: 3 decimal places; Kgs/Lbs: integer with comma (no decimals)
            if (unit === 'mt') return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n)
            return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n))
        }
        return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
    }

    // Format price for blurred display (comma-separated)
    const fmtPrice = (val) => {
        if (!val && val !== 0) return ''
        const n = parseFloat(String(val).replace(/,/g, ''))
        if (isNaN(n)) return val
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)
    }

    // Footer value for a given column
    const footerVal = (header) => {
        const colId = header.column.id
        if (colId === 'del' || colId === 'container') return ''
        const allRows = table.getFilteredRowModel().rows
        // Exclude rows where material is empty AND all element values are empty/zero
        const rows = allRows.filter(r => {
            const mat = r.getValue('material')
            if (mat && String(mat).trim() !== '') return true
            return elements.some(el => {
                const v = parseFloat(r.getValue(el.key))
                return !isNaN(v) && v !== 0
            })
        })
        if (colId === 'material') return `${rows.length} items`
        const totalW = rows.reduce((s, r) => s + (parseFloat(r.getValue('kgs')) || 0), 0)
        if (colId === 'kgs') {
            if (unit === 'mt') return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(totalW)
            return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(totalW))
        }
        if (colId === 'costPmt') {
            if (!hasPrices || totalW === 0) return ''
            const wAvg = rows.reduce((s, r) => {
                const kgs = parseFloat(r.getValue('kgs')) || 0
                const cPmt = elements.reduce((sum, el) => {
                    const price = parseFloat(prices[el.key]) || 0
                    if (!price) return sum
                    const mult = el.key === 'ni' ? niMult : 1
                    return sum + ((parseFloat(r.getValue(el.key)) || 0) / 100) * price * mult
                }, 0)
                return s + cPmt * kgs
            }, 0) / totalW
            return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(wAvg)
        }
        if (colId === 'costTotal') {
            if (!hasPrices) return ''
            const tot = rows.reduce((s, r) => {
                const wMT = (parseFloat(r.getValue('kgs')) || 0) * (UNIT_TO_MT[unit] || 0.001)
                const cPmt = elements.reduce((sum, el) => {
                    const price = parseFloat(prices[el.key]) || 0
                    if (!price) return sum
                    const mult = el.key === 'ni' ? niMult : 1
                    return sum + ((parseFloat(r.getValue(el.key)) || 0) / 100) * price * mult
                }, 0)
                return s + cPmt * wMT
            }, 0)
            return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tot)
        }
        const wSum = rows.reduce((s, r) => {
            const kgs = parseFloat(r.getValue('kgs')) || 0
            return s + kgs * (parseFloat(r.getValue(colId)) || 0)
        }, 0)
        const avg = totalW > 0 ? wSum / totalW : 0
        return avg === 0 ? '' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avg)
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
        padding: '1px 9px', height: '22px', borderRadius: '99px',
        border: `1px solid ${unit === u ? 'var(--endeavour)' : '#d8e8f5'}`,
        background: unit === u ? 'var(--endeavour)' : 'transparent',
        color: unit === u ? '#fff' : 'var(--endeavour)',
        cursor: 'pointer', transition: 'all 0.15s',
        fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
    })

    const smallBtn = (active) => ({
        padding: '1px 8px', height: '22px', borderRadius: '99px',
        border: `1px solid ${active ? 'var(--endeavour)' : '#b8cfe0'}`,
        background: active ? '#eef6ff' : 'transparent',
        color: active ? 'var(--endeavour)' : '#2d5270',
        cursor: 'pointer',
        fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
    })

    const inputStyle = {
        padding: '1px 8px', height: '22px', borderRadius: '8px',
        border: '1px solid #d8e8f5', background: '#f8fbff', outline: 'none',
        fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
    }

    return (
        <div className="w-full">

            {/* ── Toolbar ── */}
            {showHeader && (
                <div className="flex-shrink-0" style={{ borderBottom: '2px solid var(--selago)', background: 'linear-gradient(90deg,rgba(255,255,255,.95),rgba(250,250,250,.98))', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
                    {/* Table name */}
                    <div style={{ padding: '6px 14px 2px' }}>
                        <input
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            placeholder="Table name..."
                            className="responsiveTextTitle"
                            style={{
                                fontWeight: '600',
                                color: 'var(--chathams-blue)', background: 'transparent',
                                border: 'none', outline: 'none', borderBottom: '1px dashed #c8d8e8',
                                width: '100%', maxWidth: '280px', padding: '1px 4px',
                                fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
                            }}
                        />
                    </div>
                    <Header
                        globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                        table={table} excellReport={excellReport} type='mTable'
                        addMaterial={addMaterial} addTable={null} saveTable={null}
                        delTable={delTable} table1={table1} runPdf={runPdf}
                    />
                    {/* Controls row */}
                    <div className="flex flex-wrap items-center gap-2 px-3 pb-2 responsiveTextTable">
                        {/* Unit toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#2d5270' }}>Unit:</span>
                            {['mt', 'kgs', 'lbs'].map(u => (
                                <button key={u} onClick={() => setUnit(u)} style={unitBtn(u)}>{UNIT_LABELS[u]}</button>
                            ))}
                        </div>
                        {/* Container column toggle */}
                        <button
                            onClick={toggleContainer}
                            title="Toggle container column — double-click label to rename"
                            style={{ ...smallBtn(showContainer), display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                            {editingContainerLabel ? (
                                <input
                                    autoFocus
                                    value={containerLabel}
                                    onChange={e => setContainerLabel(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onBlur={() => setEditingContainerLabel(false)}
                                    onKeyDown={e => { if (e.key === 'Enter') setEditingContainerLabel(false); e.stopPropagation(); }}
                                    style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', width: `${Math.max(50, containerLabel.length * 7)}px`, textAlign: 'center', padding: 0 }}
                                />
                            ) : (
                                <span onDoubleClick={e => { e.stopPropagation(); setEditingContainerLabel(true); }}>
                                    {containerLabel}
                                </span>
                            )}
                        </button>
                        {/* Shipment container reference */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#2d5270' }} title="Shipment container reference number (e.g. TCKU1234567)">Shipment #:</span>
                            <input
                                value={containerNo}
                                onChange={e => setContainerNo(e.target.value)}
                                placeholder="e.g. TCKU1234567"
                                style={{ ...inputStyle, width: '130px', color: '#374151' }}
                            />
                        </div>
                        {/* Presets dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowPresets(p => !p)}
                                style={{ ...smallBtn(showPresets), paddingRight: '10px' }}
                            >
                                Presets {showPresets ? '▴' : '▾'}
                            </button>
                            {showPresets && (
                                <div style={{
                                    position: 'absolute', top: '26px', left: 0, zIndex: 50,
                                    background: '#fff', border: '1px solid #d8e8f5',
                                    borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                    padding: '6px', minWidth: '148px',
                                    display: 'flex', flexDirection: 'column', gap: '2px',
                                }}>
                                    {PRESETS.map(p => (
                                        <button
                                            key={p.label}
                                            onClick={() => { applyPreset(p.keys); setShowPresets(false) }}
                                            style={{
                                                padding: '4px 10px', borderRadius: '6px',
                                                border: '1px solid #e8f0f8', background: '#f8fbff',
                                                color: 'var(--chathams-blue)', cursor: 'pointer', textAlign: 'left',
                                                fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#e8f4ff'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#f8fbff'}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Help */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowHelp(p => !p)}
                                style={{
                                    padding: '2px 7px', borderRadius: '999px',
                                    border: `1px solid ${showHelp ? 'var(--endeavour)' : '#b8cfe0'}`,
                                    background: showHelp ? 'var(--endeavour)' : '#f8fbff',
                                    color: showHelp ? '#fff' : '#2d5270',
                                    cursor: 'pointer', fontWeight: '600',
                                    fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
                                }}
                            >?</button>
                            {showHelp && (
                                <div style={{
                                    position: 'absolute', top: '26px', left: 0, zIndex: 60,
                                    background: '#fff', border: '1px solid #b8ddf8',
                                    borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                                    padding: '10px 14px', minWidth: '340px',
                                    fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
                                }}>
                                    <p className="responsiveTextTable" style={{ fontWeight: '700', color: 'var(--chathams-blue)', marginBottom: '6px' }}>How to use this table</p>
                                    {[
                                        ['Drag column header', 'Reorder elements'],
                                        ['Double-click column header label', 'Add / remove element'],
                                        ['Double-click Container / Price label', 'Rename the button'],
                                        ['Presets', 'Select which elements appear in $/MT price row'],
                                        ['Fe price', 'Include steel scrap price (skipped if 0)'],
                                        ['Ni × %', 'Multiply Ni LME by a payable % factor'],
                                        ['Price button', 'Toggle Cost PMT / Cost Total columns'],
                                        ['Container button', 'Toggle per-row container # column'],
                                    ].map(([action, desc]) => (
                                        <div key={action} style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                                            <span className="responsiveTextTable" style={{ fontWeight: '600', color: 'var(--endeavour)', minWidth: '110px', paddingTop: '1px' }}>{action}</span>
                                            <span className="responsiveTextTable" style={{ color: '#475569' }}>{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Cost columns toggle */}
                        <button
                            onClick={hasPrices ? toggleCosts : undefined}
                            title={hasPrices ? 'Toggle cost columns — double-click label to rename' : 'Enter element prices above to enable cost columns'}
                            style={{ ...smallBtn(showCosts && hasPrices), opacity: hasPrices ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                            {editingCostLabel ? (
                                <input
                                    autoFocus
                                    value={costLabel}
                                    onChange={e => setCostLabel(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onBlur={() => setEditingCostLabel(false)}
                                    onKeyDown={e => { if (e.key === 'Enter') setEditingCostLabel(false); e.stopPropagation(); }}
                                    style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit', width: `${Math.max(40, costLabel.length * 7)}px`, textAlign: 'center', padding: 0 }}
                                />
                            ) : (
                                <span onDoubleClick={e => { e.stopPropagation(); setEditingCostLabel(true); }}>
                                    {costLabel}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Price bar ($/MT per element) ── */}
            {elements.length > 0 && (
                <div style={{ background: '#f0f7ff', borderBottom: '1px solid #d8e8f5', padding: '5px 10px' }}>
                    <div className="responsiveTextTable" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                        <span className="responsiveTextTable" style={{ color: '#2d5270', minWidth: '32px' }}>$/MT:</span>
                        {elements.filter(el => priceKeys ? priceKeys.includes(el.key) : el.key !== 'fe').map(el => {
                            const isNi = el.key === 'ni'
                            const focused = focusedPrice === el.key
                            return (
                                <div key={el.key} style={{
                                    display: 'flex', alignItems: 'center', gap: '2px',
                                    background: 'white',
                                    border: `1px solid ${isNi ? '#93c5fd' : '#d8e8f5'}`,
                                    borderRadius: '8px', padding: '2px 6px', minWidth: '68px',
                                }}>
                                    <span className="responsiveTextTable" style={{ color: 'var(--chathams-blue)', fontWeight: '700', minWidth: '16px' }}>
                                        {el.label}
                                    </span>
                                    <input
                                        value={focused ? (prices[el.key] || '') : fmtPrice(prices[el.key] || '')}
                                        onFocus={() => setFocusedPrice(el.key)}
                                        onBlur={() => setFocusedPrice(null)}
                                        onChange={e => setPrice(el.key, e.target.value)}
                                        placeholder="0"
                                        inputMode="decimal"
                                        style={{
                                            fontSize: 'inherit', fontWeight: '600', width: '50px', textAlign: 'right',
                                            background: 'transparent', border: 'none', outline: 'none',
                                            color: isNi ? '#0366ae' : '#374151',
                                            fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
                                        }}
                                    />
                                    {isNi && (
                                        <>
                                            <span style={{ fontSize: '0.58rem', color: '#93c5fd', fontWeight: '600' }}>LME</span>
                                            <span style={{ fontSize: '0.62rem', color: '#94a3b8', margin: '0 2px' }}>×</span>
                                            <input
                                                value={niPercent}
                                                onChange={e => setNiPercent(e.target.value)}
                                                inputMode="decimal"
                                                style={{
                                                    fontSize: 'inherit', fontWeight: '600', width: '28px', textAlign: 'center',
                                                    background: 'transparent', border: 'none', outline: 'none',
                                                    color: '#0366ae',
                                                    fontFamily: "var(--font-poppins), 'Geist Sans', sans-serif",
                                                }}
                                            />
                                            <span className="responsiveTextTable" style={{ color: '#0366ae', fontWeight: '600' }}>%</span>
                                        </>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Desktop table ── */}
            <div className="hidden sm:block">
                <div className="overflow-auto" style={{ maxHeight: '700px' }}>
                    <table className="w-full responsiveTextTable" style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0, fontFamily: "var(--font-poppins),'Geist Sans',sans-serif" }}>

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
                                                    padding: '5px 5px', fontWeight: '600', fontSize: 'inherit',
                                                textAlign: (colId === 'material' || colId === 'container') ? 'left' : 'center',
                                                    letterSpacing: '0.03em', whiteSpace: 'nowrap', border: 'none',
                                                    borderTopLeftRadius: isFirst ? '10px' : '0',
                                                    borderTopRightRadius: (isLast && !isDel) ? '10px' : '0',
                                                    minWidth: colId === 'material' ? '150px' : colId === 'del' ? '26px' : colId === 'container' ? '88px' : colId === 'kgs' ? '68px' : colId === 'costPmt' || colId === 'costTotal' ? '70px' : '50px',
                                                }

                                                if (isDel) {
                                                    // + button to add custom element, inserted before del column
                                                    const addBtn = (
                                                        <th key="__addElem" style={{ ...thStyle, backgroundColor: '#fde8e8', minWidth: '26px', padding: '5px 3px', borderTopRightRadius: '0' }}>
                                                            {showAddElem ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                    <input
                                                                        autoFocus
                                                                        value={addElemInput}
                                                                        onChange={e => setAddElemInput(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') handleAddElement(); if (e.key === 'Escape') { setAddElemInput(''); setShowAddElem(false) } }}
                                                                        placeholder="Al"
                                                                        className="responsiveTextTable" style={{ width: '26px', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid #d8e8f5', fontFamily: "var(--font-poppins),'Geist Sans',sans-serif" }}
                                                                    />
                                                                    <button onClick={() => { setAddElemInput(''); setShowAddElem(false) }} className="responsiveTextTable" style={{ color: '#2d5270', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setShowAddElem(true)} title="Add custom element column" style={{ fontSize: '14px', fontWeight: '700', color: '#c4d4e4', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>+</button>
                                                            )}
                                                        </th>
                                                    )
                                                    return [addBtn, <th key={header.id} style={{ ...thStyle, borderTopRightRadius: '10px' }} />]
                                                }

                                                if (isElem) {
                                                    return [<SortableHeaderCell
                                                        key={header.id}
                                                        id={colId}
                                                        label={header.column.columnDef.header}
                                                        style={thStyle}
                                                        onRemove={() => removeElement(colId)}
                                                        isFe={isFe}
                                                        isStandard={STANDARD_KEYS.has(colId)}
                                                        sortDir={header.column.getIsSorted()}
                                                        onSort={header.column.getToggleSortingHandler()}
                                                    />]
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
                            {table.getRowModel().rows.map((row, rIdx) => (
                                <tr key={row.id} className="transition-colors">
                                    {row.getVisibleCells().map((cell, cIdx) => {
                                        const colId = cell.column.id
                                        const isDel = colId === 'del'
                                        const isCost = colId === 'costPmt' || colId === 'costTotal'
                                        const isLeft = colId === 'material' || colId === 'container'
                                        const isFe = colId === 'fe'
                                        const ck = `${row.id}-${colId}`
                                        const focused = focusedCell === ck
                                        return (
                                            <td key={cell.id} style={{ backgroundColor: '#fff', padding: '2px 2px', borderTop: rIdx === 0 ? '1px solid #b8cfe0' : 'none', borderBottom: '1px solid #b8cfe0', borderRight: '1px solid #b8cfe0', borderLeft: cIdx === 0 ? '1px solid #b8cfe0' : 'none', verticalAlign: 'middle' }}>
                                                {isDel ? (
                                                    <div className="flex justify-center items-center">
                                                        <button
                                                            onClick={() => delMaterial(table1, cell)}
                                                            style={{ fontSize: '15px', fontWeight: '600', color: '#e87070', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 5px', lineHeight: 1 }}
                                                        >×</button>
                                                    </div>
                                                ) : isCost ? (
                                                    <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px', padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '62px', minHeight: '23px' }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        backgroundColor: isFe ? '#eef6ff' : '#f8fbff',
                                                        border: `1px solid ${isFe ? '#93c5fd' : '#d8e8f5'}`,
                                                        borderRadius: '7px', padding: '2px 5px',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: isLeft ? 'flex-start' : 'center',
                                                        minWidth: colId === 'material' ? '150px' : colId === 'container' ? '78px' : colId === 'kgs' ? '62px' : '44px',
                                                        minHeight: '23px',
                                                    }}>
                                                        <input
                                                            type="text"
                                                            inputMode={isLeft || colId === 'kgs' ? 'text' : 'decimal'}
                                                            className="responsiveTextTable w-full border-none bg-transparent focus:outline-none"
                                                            onChange={e => editCell(table1, e, cell)}
                                                            onFocus={() => setFocusedCell(ck)}
                                                            onBlur={() => setFocusedCell(null)}
                                                            value={focused ? (cell.getContext().getValue() ?? '') : fmt(cell.getContext().getValue(), colId)}
                                                            style={{
                                                                fontFamily: "var(--font-poppins),'Geist Sans',sans-serif",
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
                                            <td key={header.id} className="responsiveTextTable" style={{
                                                backgroundColor: ftrBg(colId),
                                                color: 'var(--chathams-blue)',
                                                padding: '5px 5px', fontWeight: '600',
                                                textAlign: (colId === 'material' || colId === 'container') ? 'left' : 'center',
                                                whiteSpace: 'nowrap',
                                                borderTop: '1px solid #b8cfe0',
                                                borderBottom: '1px solid #b8cfe0',
                                                borderRight: '1px solid #b8cfe0',
                                                borderLeft: isFirst ? '1px solid #b8cfe0' : 'none',
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
                                <span className="responsiveTextTable" style={{ color: 'var(--chathams-blue)', fontWeight: '500' }}>Row {ri + 1}</span>
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
                                            <span style={{ color: 'var(--regent-gray)', fontSize: '0.58rem', textTransform: 'uppercase' }}>{cell.column.columnDef.header}</span>
                                            <span className="responsiveTextTable" style={{ color: '#003366', fontWeight: '600' }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                                        </div>
                                    )
                                    return (
                                        <div key={cell.id} className="flex flex-col space-y-1 pb-2 last:pb-0" style={{ borderBottom: '1px solid var(--selago)' }}>
                                            <div style={{ color: 'var(--regent-gray)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cell.column.columnDef.header}</div>
                                            <div style={{ backgroundColor: isFe ? '#eef6ff' : '#fff', border: `1px solid ${isFe ? '#93c5fd' : '#c7d7e8'}`, borderRadius: '8px', padding: '4px 8px', minHeight: '28px', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    inputMode={(colId === 'material' || colId === 'container' || colId === 'kgs') ? 'text' : 'decimal'}
                                                    className="responsiveTextTable w-full border-none bg-transparent focus:outline-none"
                                                    onChange={e => editCell(table1, e, cell)}
                                                    onFocus={() => setFocusedCell(ck)}
                                                    onBlur={() => setFocusedCell(null)}
                                                    value={focused ? (cell.getContext().getValue() ?? '') : fmt(cell.getContext().getValue(), colId)}
                                                    style={{ fontFamily: "var(--font-poppins),'Geist Sans',sans-serif", color: isFe ? 'var(--endeavour)' : '#1F2937', background: 'transparent' }}
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
