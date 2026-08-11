'use client'

import {
    flexRender, getCoreRowModel, getFilteredRowModel,
    getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { Settings2, HelpCircle, ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react"
import Header from "../../../components/table/header"
import { TONES } from "../../../components/statusUtils"
import { Filter } from "../../../components/table/filters/filterFunc"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { UNIT_LABELS, UNIT_TO_MT } from './constants'
import SortIcon from "@components/table/SortIcon";

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
                    {isFe && <span className="responsiveTextTable" style={{ color: 'var(--brand-border)', marginLeft: '2px', fontStyle: 'italic' }}>auto</span>}
                    {/* This header sorts via its own sortDir state, not a TanStack
                        column, hence `direction` rather than `column`. */}
                    <SortIcon direction={sortDir} />
                </span>
                {!isStandard && (
                    <button
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); onRemove() }}
                        className="responsiveTextTable" style={{ fontWeight: '500', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', lineHeight: 1 }}
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
                return <p className="responsiveTextTable" style={{ color: TONES.green.text }}>
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
                return <p className="responsiveTextTable" style={{ color: TONES.green.text, fontWeight: '600' }}>
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

    // Per-element pastel column tints (status TONES: blue = base/auto, green = costs, red = elements)
    const hdrBg = (colId) => {
        if (colId === 'material' || colId === 'kgs' || colId === 'container') return TONES.blue.bg
        if (colId === 'fe') return TONES.blue.bg
        if (colId === 'costPmt' || colId === 'costTotal') return TONES.green.bg
        return TONES.red.bg
    }
    const ftrBg = (colId) => {
        if (colId === 'material' || colId === 'kgs' || colId === 'container') return TONES.blue.bg
        if (colId === 'fe') return TONES.blue.border
        if (colId === 'costPmt' || colId === 'costTotal') return TONES.green.border
        return TONES.red.bg
    }

    const headers = table.getHeaderGroups()[0]?.headers ?? []

    // Segmented-control chip (unit toggle)
    const segChip = (active) => ({
        padding: '1px 10px', height: '20px', borderRadius: '99px', border: 'none',
        background: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-secondary)',
        fontWeight: active ? '500' : '400',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        cursor: 'pointer', transition: 'all 0.15s',
    })

    // On/off pill toggle (container / cost columns)
    const toggleChip = (active) => ({
        padding: '1px 10px', height: '24px', borderRadius: '99px',
        border: `1px solid ${active ? 'var(--brand-border)' : 'var(--line)'}`,
        background: active ? 'var(--brand-soft)' : 'var(--bg-card)',
        color: active ? 'var(--brand)' : 'var(--ink-secondary)',
        fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s',
    })

    // Ghost icon-button (presets / help)
    const iconBtn = (active) => ({
        width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '99px', border: 'none', cursor: 'pointer', padding: 0,
        background: active ? 'var(--brand-soft)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--ink-muted)',
        transition: 'all 0.15s',
    })

    // Popover shell
    const popStyle = {
        position: 'absolute', top: '30px', zIndex: 50,
        background: "var(--bg-card)", border: '1px solid var(--line)',
        borderRadius: '12px', boxShadow: 'var(--shadow-md)',
    }

    return (
        <div className="w-full">

            {/* ── Toolbar ── */}
            {showHeader && (
                <div className="flex-shrink-0 bg-[var(--bg-card)]" style={{ borderBottom: '1px solid var(--line)' }}>
                    {/* Table name */}
                    <div style={{ padding: '8px 14px 2px' }}>
                        <input
                            value={tableName}
                            onChange={e => setTableName(e.target.value)}
                            placeholder="Table name..."
                            className="font-display font-semibold responsiveTextTitle text-[var(--ink)] placeholder:text-[var(--ink-muted)] placeholder:font-normal"
                            style={{
                                background: 'transparent',
                                border: 'none', outline: 'none', borderBottom: '1px dashed var(--line-strong)',
                                width: '100%', maxWidth: '280px', padding: '1px 4px',
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
                        {/* Unit segmented toggle */}
                        <div className="flex items-center rounded-full p-0.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)' }}>
                            {['mt', 'kgs', 'lbs'].map(u => (
                                <button key={u} onClick={() => setUnit(u)} style={segChip(unit === u)}>{UNIT_LABELS[u]}</button>
                            ))}
                        </div>
                        {/* Container column toggle */}
                        <button
                            onClick={toggleContainer}
                            title="Toggle container column — double-click label to rename"
                            style={{ ...toggleChip(showContainer), display: 'flex', alignItems: 'center', gap: '3px' }}
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
                        {/* Cost columns toggle */}
                        <button
                            onClick={hasPrices ? toggleCosts : undefined}
                            title={hasPrices ? 'Toggle cost columns — double-click label to rename' : 'Enter element prices above to enable cost columns'}
                            style={{ ...toggleChip(showCosts && hasPrices), opacity: hasPrices ? 1 : 0.45, display: 'flex', alignItems: 'center', gap: '3px' }}
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
                        {/* Shipment container reference */}
                        <div className="flex items-center gap-1.5">
                            <span
                                className="responsiveTextTable font-medium uppercase text-[var(--ink-muted)]"
                                style={{ letterSpacing: '0.04em' }}
                                title="Shipment container reference number (e.g. TCKU1234567)"
                            >Shipment #</span>
                            <input
                                value={containerNo}
                                onChange={e => setContainerNo(e.target.value)}
                                placeholder="e.g. TCKU1234567"
                                className="rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors"
                                style={{ padding: '1px 8px', height: '24px', width: '130px', fontSize: 'inherit' }}
                            />
                        </div>
                        {/* Presets + help — ghost icon-buttons */}
                        <div className="flex items-center gap-1 ml-auto">
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowPresets(p => !p)}
                                    title="Price presets — select which elements appear in the $/MT row"
                                    style={iconBtn(showPresets)}
                                >
                                    <Settings2 style={{ width: '15px', height: '15px' }} />
                                </button>
                                {showPresets && (
                                    <div style={{
                                        ...popStyle, right: 0,
                                        padding: '6px', minWidth: '160px',
                                        display: 'flex', flexDirection: 'column', gap: '1px',
                                    }}>
                                        <p className="responsiveTextTable font-medium uppercase" style={{ color: 'var(--ink-muted)', letterSpacing: '0.04em', padding: '3px 10px 5px' }}>Price presets</p>
                                        {PRESETS.map(p => (
                                            <button
                                                key={p.label}
                                                onClick={() => { applyPreset(p.keys); setShowPresets(false) }}
                                                style={{
                                                    padding: '5px 10px', borderRadius: '8px',
                                                    border: 'none', background: 'transparent',
                                                    color: 'var(--ink-secondary)', fontWeight: '500',
                                                    cursor: 'pointer', textAlign: 'left',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--ink)' }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-secondary)' }}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowHelp(p => !p)}
                                    title="How to use this table"
                                    style={iconBtn(showHelp)}
                                >
                                    <HelpCircle style={{ width: '15px', height: '15px' }} />
                                </button>
                                {showHelp && (
                                    <div style={{ ...popStyle, right: 0, zIndex: 60, padding: '10px 14px', minWidth: '340px' }}>
                                        <p className="responsiveTextTable font-display" style={{ fontWeight: '600', color: 'var(--ink)', marginBottom: '6px' }}>How to use this table</p>
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
                                                <span className="responsiveTextTable" style={{ fontWeight: '500', color: 'var(--brand)', minWidth: '110px', paddingTop: '1px' }}>{action}</span>
                                                <span className="responsiveTextTable" style={{ color: 'var(--ink-secondary)' }}>{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Price bar ($/MT per element) ── */}
            {elements.length > 0 && (
                <div style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--line)', padding: '6px 12px' }}>
                    <div className="responsiveTextTable" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span className="responsiveTextTable font-medium uppercase" style={{ color: 'var(--ink-muted)', letterSpacing: '0.04em', minWidth: '32px' }}>$/MT</span>
                        {elements.filter(el => priceKeys ? priceKeys.includes(el.key) : el.key !== 'fe').map(el => {
                            const isNi = el.key === 'ni'
                            const focused = focusedPrice === el.key
                            return (
                                <div key={el.key} style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: isNi ? 'var(--brand-soft)' : 'var(--bg-card)',
                                    border: `1px solid ${isNi ? 'var(--brand-border)' : 'var(--line)'}`,
                                    borderRadius: '99px', padding: '2px 10px', minWidth: '68px',
                                }}>
                                    <span style={{
                                        fontSize: 'var(--fs-table)', fontWeight: '600', textTransform: 'uppercase',
                                        letterSpacing: '0.04em', minWidth: '16px',
                                        color: isNi ? 'var(--brand)' : 'var(--ink-muted)',
                                    }}>
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
                                            color: isNi ? 'var(--brand)' : 'var(--ink)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    />
                                    {isNi && (
                                        <>
                                            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--brand)', opacity: 0.55, fontWeight: '600' }}>LME</span>
                                            <span style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)', margin: '0 2px' }}>×</span>
                                            <input
                                                value={niPercent}
                                                onChange={e => setNiPercent(e.target.value)}
                                                inputMode="decimal"
                                                style={{
                                                    fontSize: 'inherit', fontWeight: '600', width: '28px', textAlign: 'center',
                                                    background: 'transparent', border: 'none', outline: 'none',
                                                    color: 'var(--brand)',
                                                }}
                                            />
                                            <span className="responsiveTextTable" style={{ color: 'var(--brand)', fontWeight: '600' }}>%</span>
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
                <div className="overflow-auto dashboard-scroll" style={{ maxHeight: '700px' }}>
                    <table className="w-full responsiveTextTable" style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0, fontFamily: 'inherit' }}>

                        {/* THEAD */}
                        <thead>
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={elementKeys} strategy={horizontalListSortingStrategy}>
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.flatMap((header) => {
                                                const colId = header.column.id
                                                const isDel = colId === 'del'
                                                const isElem = elementKeys.includes(colId)
                                                const isFe = colId === 'fe'

                                                const thStyle = {
                                                    backgroundColor: hdrBg(colId),
                                                    color: 'var(--ink)',
                                                    padding: '5px 5px', fontWeight: '500', fontSize: 'inherit',
                                                    textAlign: (colId === 'material' || colId === 'container') ? 'left' : 'center',
                                                    letterSpacing: '0.03em', whiteSpace: 'nowrap', border: 'none',
                                                    minWidth: colId === 'material' ? '150px' : colId === 'del' ? '26px' : colId === 'container' ? '88px' : colId === 'kgs' ? '68px' : colId === 'costPmt' || colId === 'costTotal' ? '70px' : '50px',
                                                }

                                                if (isDel) {
                                                    // + button to add custom element, inserted before del column
                                                    const addBtn = (
                                                        <th key="__addElem" style={{ ...thStyle, backgroundColor: TONES.red.bg, minWidth: '26px', padding: '5px 3px' }}>
                                                            {showAddElem ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                    <input
                                                                        autoFocus
                                                                        value={addElemInput}
                                                                        onChange={e => setAddElemInput(e.target.value)}
                                                                        onKeyDown={e => { if (e.key === 'Enter') handleAddElement(); if (e.key === 'Escape') { setAddElemInput(''); setShowAddElem(false) } }}
                                                                        placeholder="Al"
                                                                        className="responsiveTextTable" style={{ width: '26px', textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', borderBottom: '1px solid var(--line-strong)' }}
                                                                    />
                                                                    <button onClick={() => { setAddElemInput(''); setShowAddElem(false) }} className="responsiveTextTable" style={{ color: 'var(--ink-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => setShowAddElem(true)} title="Add custom element column" style={{ fontSize: 'var(--fs-title)', fontWeight: '500', color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>+</button>
                                                            )}
                                                        </th>
                                                    )
                                                    return [addBtn, <th key={header.id} style={thStyle} />]
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
                                                                <SortIcon column={header.column} />
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
                        <tbody style={{ backgroundColor: "var(--bg-card)" }}>
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
                                            <td key={cell.id} style={{ backgroundColor: "var(--bg-card)", padding: '3px 3px', borderBottom: '1px solid var(--line)', verticalAlign: 'middle' }}>
                                                {isDel ? (
                                                    <div className="flex justify-center items-center">
                                                        <button
                                                            onClick={() => delMaterial(table1, cell)}
                                                            style={{ fontSize: 'var(--fs-page)', fontWeight: '500', color: TONES.red.text, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 5px', lineHeight: 1 }}
                                                        >×</button>
                                                    </div>
                                                ) : isCost ? (
                                                    <div style={{ backgroundColor: TONES.green.bg, border: `1px solid ${TONES.green.border}`, borderRadius: '8px', padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '62px', minHeight: '23px' }}>
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        backgroundColor: focused ? 'var(--bg-card)' : 'var(--bg-subtle)',
                                                        border: `1px solid ${focused ? 'var(--brand)' : isFe ? 'var(--brand-border)' : 'var(--line-strong)'}`,
                                                        boxShadow: focused ? '0 0 0 3px var(--brand-soft)' : 'none',
                                                        borderRadius: '8px', padding: '2px 5px',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: isLeft ? 'flex-start' : 'center',
                                                        minWidth: colId === 'material' ? '150px' : colId === 'container' ? '78px' : colId === 'kgs' ? '62px' : '44px',
                                                        minHeight: '23px',
                                                        transition: 'border-color 0.15s, box-shadow 0.15s',
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
                                                                color: isFe ? 'var(--brand)' : 'var(--ink)',
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
                                    {headers.map((header) => {
                                        const colId = header.column.id
                                        return (
                                            <td key={header.id} className="responsiveTextTable" style={{
                                                backgroundColor: ftrBg(colId),
                                                color: 'var(--ink)',
                                                padding: '6px 5px', fontWeight: '600',
                                                textAlign: (colId === 'material' || colId === 'container') ? 'left' : 'center',
                                                whiteSpace: 'nowrap',
                                                borderTop: '1px solid var(--line-strong)',
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
                <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2" style={{ maxHeight: '700px', fontFamily: 'inherit' }}>
                    {table.getRowModel().rows.map((row, ri) => (
                        <div key={row.id} className="rounded-2xl overflow-hidden shadow-card" style={{ backgroundColor: "var(--bg-card)", border: '1px solid var(--line)' }}>
                            <div className="px-3 py-2" style={{ background: 'var(--brand-soft)' }}>
                                <span className="responsiveTextTable font-display" style={{ color: 'var(--ink)', fontWeight: '600' }}>Row {ri + 1}</span>
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
                                        <div key={cell.id} className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--line)' }}>
                                            <span style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-caption)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cell.column.columnDef.header}</span>
                                            <span className="responsiveTextTable" style={{ color: TONES.green.text, fontWeight: '600' }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                                        </div>
                                    )
                                    return (
                                        <div key={cell.id} className="flex flex-col space-y-1 pb-2 last:pb-0" style={{ borderBottom: '1px solid var(--line)' }}>
                                            <div style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-caption)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{cell.column.columnDef.header}</div>
                                            <div style={{
                                                backgroundColor: focused ? 'var(--bg-card)' : 'var(--bg-subtle)',
                                                border: `1px solid ${focused ? 'var(--brand)' : isFe ? 'var(--brand-border)' : 'var(--line-strong)'}`,
                                                boxShadow: focused ? '0 0 0 3px var(--brand-soft)' : 'none',
                                                borderRadius: '8px', padding: '4px 8px', minHeight: '28px', display: 'flex', alignItems: 'center',
                                                transition: 'border-color 0.15s, box-shadow 0.15s',
                                            }}>
                                                <input
                                                    type="text"
                                                    inputMode={(colId === 'material' || colId === 'container' || colId === 'kgs') ? 'text' : 'decimal'}
                                                    className="responsiveTextTable w-full border-none bg-transparent focus:outline-none"
                                                    onChange={e => editCell(table1, e, cell)}
                                                    onFocus={() => setFocusedCell(ck)}
                                                    onBlur={() => setFocusedCell(null)}
                                                    value={focused ? (cell.getContext().getValue() ?? '') : fmt(cell.getContext().getValue(), colId)}
                                                    style={{ color: isFe ? 'var(--brand)' : 'var(--ink)', background: 'transparent' }}
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
