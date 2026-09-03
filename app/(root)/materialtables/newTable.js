'use client'

import {
    flexRender, getCoreRowModel, getFilteredRowModel,
    getPaginationRowModel, getSortedRowModel, useReactTable
} from "@tanstack/react-table"
import { useMemo, useState, useCallback } from "react"
import { Settings2, HelpCircle, ArrowUpNarrowWide, ArrowDownWideNarrow } from "lucide-react"
import Header from "../../../components/table/header"
import { TONES } from "../../../components/statusUtils"
import { Filter } from "../../../components/table/filters/filterFunc"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { UNIT_LABELS, UNIT_TO_MT } from './constants'
import SortIcon from "@components/table/SortIcon";
import { useTablePrefs, useTablePagination } from '@components/table/useTablePrefs';

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

/* The Cost bar and the Sales bar, from one definition.
   They were two hand-written rows and had drifted: the cost row was labelled
   "$/MT" while the sales row said "Sales"; the cost preset picker lived up in the
   toolbar while the sales one sat inline on its bar; and each wrapped its own
   chips, so the two never lined up. One component means they cannot diverge
   again — the same call the formulas cards make.

   The label cell sits OUTSIDE the horizontal scroller on purpose. With the
   preset popover inside it, `overflow-x: auto` clipped the menu to the bar's
   4px-tall padding box, which is why picking a sales preset did nothing. */
function PriceBar({
    label, accent, background, elements, template, activeKeys,
    prices, setPrice, niPercent, setNiPercent,
    focusPrefix, focusedPrice, setFocusedPrice,
    open, setOpen, applyPreset, fmtPrice, iconBtn, popStyle,
}) {
    const isActive = (key) => (activeKeys ? activeKeys.includes(key) : key !== 'fe')
    return (
        <div style={{ background, borderBottom: '1px solid var(--line)', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '76px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '2px', position: 'relative' }}>
                <span className="responsiveTextTable font-medium" style={{ color: accent }}>{label}</span>
                <button
                    onClick={() => setOpen(v => !v)}
                    title={`Choose which elements the ${label.toLowerCase()} price is built from`}
                    style={iconBtn(open)}
                >
                    <Settings2 style={{ width: '15px', height: '15px' }} />
                </button>
                {open && (
                    <div style={{ ...popStyle, left: 0, padding: '6px', minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <p className="responsiveTextTable font-medium" style={{ color: 'var(--ink-muted)', padding: '4px 10px' }}>{label} preset</p>
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => { applyPreset(p.keys); setOpen(false) }}
                                className="responsiveTextTable"
                                style={{
                                    padding: '5px 10px', borderRadius: '8px', border: 'none',
                                    background: activeKeys && activeKeys.join() === p.keys.join() ? 'var(--bg-subtle)' : 'transparent',
                                    color: 'var(--ink-secondary)', fontWeight: '500', cursor: 'pointer', textAlign: 'left',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--ink)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = activeKeys && activeKeys.join() === p.keys.join() ? 'var(--bg-subtle)' : 'transparent'; e.currentTarget.style.color = 'var(--ink-secondary)' }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                <div className="responsiveTextTable" style={{ display: 'grid', gridTemplateColumns: template, gap: '6px', alignItems: 'center', width: 'max-content', minWidth: '100%' }}>
                    {elements.map(el => {
                        const isNi = el.key === 'ni'
                        const priced = (parseFloat(prices[el.key]) || 0) > 0
                        const focused = focusedPrice === focusPrefix + el.key
                        const active = isActive(el.key)
                        return (
                            <div
                                key={el.key}
                                title={active ? undefined : `${el.label} is not in the ${label.toLowerCase()} preset`}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    background: isNi ? 'var(--brand-soft)' : priced ? 'var(--bg-card)' : 'transparent',
                                    border: `1px solid ${isNi ? 'var(--brand-border)' : priced ? 'var(--line)' : 'transparent'}`,
                                    borderRadius: 'var(--radius-control)', padding: '1px 8px',
                                    // Dimmed while it sits outside the preset — but never hidden,
                                    // and never un-editable: the price still counts, and a cell
                                    // you cannot see is a cell you cannot correct.
                                    opacity: active || focused ? 1 : 0.45,
                                    transition: 'opacity 0.15s',
                                }}
                            >
                                <span style={{ fontSize: 'var(--fs-table)', fontWeight: '600', minWidth: '16px', color: isNi ? accent : 'var(--ink-muted)' }}>
                                    {el.label}
                                </span>
                                <input
                                    value={focused ? (prices[el.key] || '') : fmtPrice(prices[el.key] || '')}
                                    onFocus={() => setFocusedPrice(focusPrefix + el.key)}
                                    onBlur={() => setFocusedPrice(null)}
                                    onChange={e => setPrice(el.key, e.target.value)}
                                    placeholder="0"
                                    inputMode="decimal"
                                    style={{
                                        fontSize: 'inherit', fontWeight: '600', width: '50px', textAlign: 'right',
                                        background: 'transparent', border: 'none', outline: 'none',
                                        color: isNi ? accent : 'var(--ink)', fontVariantNumeric: 'tabular-nums',
                                    }}
                                />
                                {isNi && (
                                    <>
                                        <span style={{ fontSize: 'var(--fs-caption)', color: accent, opacity: 0.55, fontWeight: '600' }}>LME</span>
                                        <span style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)', margin: '0 2px' }}>×</span>
                                        <input
                                            value={niPercent}
                                            onChange={e => setNiPercent(e.target.value)}
                                            inputMode="decimal"
                                            style={{
                                                fontSize: 'inherit', fontWeight: '600', width: '28px', textAlign: 'center',
                                                background: 'transparent', border: 'none', outline: 'none', color: accent,
                                            }}
                                        />
                                        <span className="responsiveTextTable" style={{ color: accent, fontWeight: '600' }}>%</span>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

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
                    <SortIcon direction={sortDir} inline />
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
    salesPrices = {}, showSales = false, salesLabel = 'Sales Price',
    salesNiPercent = 100, salesPriceKeys = null,
    setSalesPrice = () => {}, setSalesLabel = () => {},
    setSalesNiPercent = () => {}, toggleSales = () => {}, applySalesPreset = () => {},
}) => {
    const [globalFilter, setGlobalFilter] = useState('')
    const [{ pageIndex, pageSize }, setPagination] = useTablePagination(50)
    const [columnFilters, setColumnFilters] = useTablePrefs('filters', [])
    const [addElemInput, setAddElemInput] = useState('')
    const [showAddElem, setShowAddElem] = useState(false)
    const [focusedCell, setFocusedCell] = useState(null)
    const [focusedPrice, setFocusedPrice] = useState(null)
    const [showPresets, setShowPresets] = useState(false)
    const [editingContainerLabel, setEditingContainerLabel] = useState(false)
    const [editingCostLabel, setEditingCostLabel] = useState(false)
    const [editingSalesLabel, setEditingSalesLabel] = useState(false)
    const [showSalesPresets, setShowSalesPresets] = useState(false)
    const [showHelp, setShowHelp] = useState(false)

    const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
    const elementKeys = useMemo(() => elements.map(e => e.key), [elements])

    const hasPrices = useMemo(
        () => elements.some(el => el.key !== 'fe' && prices[el.key] !== undefined && prices[el.key] !== ''),
        [elements, prices]
    )

    const niMult = (niPercent || 100) / 100

    /* The cost bar and the sales bar are one grid, not two independent wrapping
       rows (Zak, 2026-08-26: "you can see it's not aligned, cost row and sales
       row"). They used to be flex rows of content-sized chips, so the moment the
       two sides priced a different set of elements — or the Ni chip came out a
       different width because one side had a figure and the other didn't — every
       chip after it sat at a different x than its opposite number. Same approach
       as the formulas cards: one column per element, both rows reading from it,
       so Cr sits under Cr whatever either side holds.

       EVERY element gets a column in BOTH bars, whatever either preset says. The
       first version skipped a bar's non-preset elements and left the slot empty,
       which put a "Ni Cr Fe" cost row's Fe out at the far right with a hole where
       Mo…Ti would be (Zak, 2026-08-26). A preset is a display emphasis, not a
       different set of columns: the ones it names read normally and the rest are
       dimmed, so nothing moves when you switch preset and every cell is still
       there to type into.

       Ni carries "LME × 100 %" as well as its figure, so it needs about twice the
       room. Keyed off the element rather than its position — the header row is
       drag-reorderable, so Ni is not always first. */
    const barTemplate = useMemo(
        () => elements.map(el => (el.key === 'ni' ? '176px' : '96px')).join(' '),
        [elements]
    )

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
                return <p className="responsiveTextTable" style={{ color: 'var(--pink-text)' }}>
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
                return <p className="responsiveTextTable" style={{ color: 'var(--pink-text)', fontWeight: '500' }}>
                    ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
                </p>
            },
        }
        const cols = [...columns]
        const at = delIdx >= 0 ? delIdx : cols.length
        cols.splice(at, 0, costPmtCol, costTotalCol)
        return cols
    }, [columns, hasPrices, showCosts, elements, prices, unit])

    /* ── Sales columns ────────────────────────────────────────────────────────
       Same maths as cost, against salesPrices instead of prices: a row's value
       per metric ton is the sum over elements of (element % / 100) x its price,
       with Ni scaled by its own percentage. Sales Total is that x the row weight.
       Chained off enhancedColumns so both pairs can show at once and the order
       stays Cost PMT, Cost Total, Sales MT, Sales Total. */
    const hasSalesPrices = useMemo(
        () => elements.some(el => el.key !== 'fe' && salesPrices[el.key] !== undefined && salesPrices[el.key] !== ''),
        [elements, salesPrices]
    )
    const salesNiMult = (salesNiPercent || 100) / 100

    const salesPerMT = useCallback((row) => elements.reduce((sum, el) => {
        const price = parseFloat(salesPrices[el.key]) || 0
        if (!price) return sum
        const mult = el.key === 'ni' ? salesNiMult : 1
        return sum + ((parseFloat(row[el.key]) || 0) / 100) * price * mult
    }, 0), [elements, salesPrices, salesNiMult])

    const columnsWithSales = useMemo(() => {
        if (!enhancedColumns.length || !hasSalesPrices || !showSales) return enhancedColumns
        const money = (v, weight) => {
            if (!v) return <p></p>
            return <p className="responsiveTextTable" style={{ color: 'var(--brand-strong)', fontWeight: weight }}>
                ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
            </p>
        }
        const salesMtCol = {
            id: 'salesMt', header: 'Sales MT', enableSorting: true,
            accessorFn: salesPerMT,
            cell: (props) => money(props.getValue(), '500'),
        }
        const salesTotalCol = {
            id: 'salesTotal', header: 'Sales Total', enableSorting: true,
            accessorFn: (row) => salesPerMT(row) * ((parseFloat(row.kgs) || 0) * (UNIT_TO_MT[unit] || 0.001)),
            cell: (props) => money(props.getValue(), '500'),
        }
        const cols = [...enhancedColumns]
        const delIdx = cols.findIndex(c => c.accessorKey === 'del')
        cols.splice(delIdx >= 0 ? delIdx : cols.length, 0, salesMtCol, salesTotalCol)
        return cols
    }, [enhancedColumns, hasSalesPrices, showSales, salesPerMT, unit])

    const table = useReactTable({
        columns: columnsWithSales, data,
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

    /* Column surfaces.
       Every element column used to be painted TONES.red.bg and the base columns
       TONES.blue.bg — a different fill per column group, which is precisely what
       makes a table read as a spreadsheet rather than as part of an application.
       It also put a red/salmon wash across the widest part of the page, where red
       carries no meaning: an element percentage is not an error.

       Now the header band and footer use the same neutral surfaces as every other
       table in the app (see .custom-table in globals.css). Meaning is carried where
       it is actually needed and nowhere else: the computed columns keep a quiet
       tint so a derived figure is distinguishable from an entered one, and Fe keeps
       one because it is the auto-calculated remainder.

       2026-08-20: the cost columns were TONES.green and green said nothing here —
       a cost is not "good", it is just the other half of the cost/sales pair. They
       take --pink-* instead, which the token file keeps expressly as a non-status
       hue, so the pair now reads cost=plum / sales=violet with no status colour
       borrowed for structure. */
    const hdrBg = (colId) => {
        if (colId === 'costPmt' || colId === 'costTotal') return 'var(--pink-bg)'
        if (colId === 'salesMt' || colId === 'salesTotal') return 'var(--brand-soft)'
        if (colId === 'fe') return 'var(--bg-sunken)'
        return 'var(--bg-subtle)'
    }
    const ftrBg = (colId) => {
        if (colId === 'costPmt' || colId === 'costTotal') return 'var(--pink-bg)'
        if (colId === 'salesMt' || colId === 'salesTotal') return 'var(--brand-soft)'
        if (colId === 'fe') return 'var(--bg-sunken)'
        return 'var(--bg-subtle)'
    }

    const headers = table.getHeaderGroups()[0]?.headers ?? []

    // Segmented-control chip (unit toggle)
    const segChip = (active) => ({
        padding: '1px 10px', height: '28px', borderRadius: 'var(--radius-control)', border: 'none',
        background: active ? 'var(--bg-card)' : 'transparent',
        color: active ? 'var(--ink)' : 'var(--ink-secondary)',
        fontWeight: active ? '500' : '400',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        cursor: 'pointer', transition: 'all 0.15s',
    })

    // On/off pill toggle (container / cost columns)
    const toggleChip = (active) => ({
        padding: '1px 10px', height: '28px', borderRadius: 'var(--radius-control)',
        border: `1px solid ${active ? 'var(--brand-border)' : 'var(--line)'}`,
        background: active ? 'var(--brand-soft)' : 'var(--bg-card)',
        color: active ? 'var(--brand)' : 'var(--ink-secondary)',
        fontWeight: '500', cursor: 'pointer', transition: 'all 0.15s',
    })

    // Ghost icon-button (presets / help)
    const iconBtn = (active) => ({
        width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'var(--radius-control)', border: 'none', cursor: 'pointer', padding: 0,
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
                /* rounded-t-2xl: this block is the top of the card, and the card can
                   no longer use overflow-hidden (it was clipping the preset popovers).
                   Without overflow-hidden a child's background paints straight over the
                   card's rounded corners, so the top two corners rendered square. The
                   scroll box at the bottom carries rounded-b-2xl for the same reason. */
                <div className="flex-shrink-0 bg-[var(--bg-card)] rounded-t-2xl" style={{ borderBottom: '1px solid var(--line)' }}>
                    {/* Table name */}
                    <div style={{ padding: '6px 14px 0' }}>
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
                    <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1.5 responsiveTextTable">
                        {/* Unit segmented toggle */}
                        <div className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--line)' }}>
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
                            /* This button now opens the Cost price row as well as the
                               Cost columns, so it can no longer be disabled until a
                               price exists — that was a loop: no row to type the price
                               into, so the price that would enable the row could never
                               be entered. The COLUMNS still appear only once there is
                               something to compute from (see enhancedColumns). */
                            onClick={toggleCosts}
                            title='Show the cost price row and the Cost columns — double-click the label to rename'
                            style={{ ...toggleChip(showCosts), display: 'flex', alignItems: 'center', gap: '3px' }}
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
                        {/* Sales columns toggle — mirrors the cost toggle beside it.
                            Disabled until at least one sales price is entered, for the
                            same reason: two empty columns tell you nothing. */}
                        <button
                            onClick={toggleSales}
                            title='Show the sales price row and the Sales columns — double-click the label to rename'
                            style={{ ...toggleChip(showSales), display: 'flex', alignItems: 'center', gap: '3px' }}
                        >
                            {editingSalesLabel ? (
                                <input
                                    autoFocus
                                    value={salesLabel}
                                    onChange={e => setSalesLabel(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    onBlur={() => setEditingSalesLabel(false)}
                                    onKeyDown={e => { if (e.key === 'Enter') setEditingSalesLabel(false); e.stopPropagation(); }}
                                    style={{ background: 'none', border: 'none', outline: 'none', color: 'inherit', font: 'inherit', width: '70px' }}
                                />
                            ) : (
                                <span onDoubleClick={e => { e.stopPropagation(); setEditingSalesLabel(true); }}>
                                    {salesLabel}
                                </span>
                            )}
                        </button>
                        {/* Shipment container reference */}
                        <div className="flex items-center gap-1.5">
                            <span
                                className="responsiveTextTable font-medium text-[var(--ink-muted)]"
                                title="Shipment container reference number (e.g. TCKU1234567)"
                            >Shipment #</span>
                            <input
                                value={containerNo}
                                onChange={e => setContainerNo(e.target.value)}
                                placeholder="e.g. TCKU1234567"
                                className="rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors"
                                style={{ padding: '1px 8px', height: '28px', width: '130px', fontSize: 'inherit' }}
                            />
                        </div>
                        {/* Presets + help — ghost icon-buttons */}
                        <div className="flex items-center gap-1 ml-auto">
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
                                            ['Preset button on a price row', 'Which elements that price is built from'],
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

            {/* ── Cost and Sales price bars ──────────────────────────────────
                ONE component rendered twice, for the same reason the formulas
                cards share theirs: as two hand-written rows they drifted, and
                the cost row ended up labelled "$/MT" against the sales row's
                "Sales", with its preset picker parked in the toolbar while the
                sales one sat inline (Zak, 2026-08-26). */}
            {showCosts && elements.length > 0 && (
                <PriceBar
                    label="Cost"
                    accent="var(--brand)"
                    background="var(--bg-subtle)"
                    elements={elements}
                    template={barTemplate}
                    activeKeys={priceKeys}
                    prices={prices}
                    setPrice={setPrice}
                    niPercent={niPercent}
                    setNiPercent={setNiPercent}
                    focusPrefix="cost:"
                    focusedPrice={focusedPrice}
                    setFocusedPrice={setFocusedPrice}
                    open={showPresets}
                    setOpen={setShowPresets}
                    applyPreset={applyPreset}
                    fmtPrice={fmtPrice}
                    iconBtn={iconBtn}
                    popStyle={popStyle}
                />
            )}

            {showSales && elements.length > 0 && (
                <PriceBar
                    label="Sales"
                    accent="var(--brand-strong)"
                    background="var(--brand-soft)"
                    elements={elements}
                    template={barTemplate}
                    activeKeys={salesPriceKeys}
                    prices={salesPrices}
                    setPrice={setSalesPrice}
                    niPercent={salesNiPercent}
                    setNiPercent={setSalesNiPercent}
                    focusPrefix="sales:"
                    focusedPrice={focusedPrice}
                    setFocusedPrice={setFocusedPrice}
                    open={showSalesPresets}
                    setOpen={setShowSalesPresets}
                    applyPreset={applySalesPreset}
                    fmtPrice={fmtPrice}
                    iconBtn={iconBtn}
                    popStyle={popStyle}
                />
            )}

            {/* ── Desktop table ── */}
            <div className="hidden sm:block">
                {/* rounded-b-2xl: this box is the bottom of the card, so it takes over
                    clipping the square table corners from the card wrapper in page.js —
                    which had to stop clipping so the preset dropdowns could escape. */}
                {/* The price bars are settings for the table, not the top of it. Run
                    straight into the header row and they read as two more rows of it
                    (Zak, 2026-08-26). A band of card background between the two says
                    where the inputs stop and the data starts. */}
                <div className="overflow-auto dashboard-scroll rounded-b-2xl pt-2 bg-[var(--bg-card)]" style={{ maxHeight: '700px' }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    {/* NOT w-full. With `table-layout: auto` a full-width table hands
                        every column a share of the leftover space, so a table with a
                        handful of columns came out with each cell stretched right
                        across the card — "all cells are large and wide" after a
                        document import, which is exactly when a table has few columns
                        (Zak, 2026-08-26). Sized to its content instead; the scroll box
                        around it handles the case where the content is wider. */}
                    <table className="responsiveTextTable" style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0, fontFamily: 'inherit' }}>

                        {/* THEAD */}
                        <thead>
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
                                                    whiteSpace: 'nowrap', border: 'none',
                                                    minWidth: colId === 'material' ? '150px' : colId === 'del' ? '26px' : colId === 'container' ? '88px' : colId === 'kgs' ? '68px' : colId === 'costPmt' || colId === 'costTotal' ? '70px' : '50px',
                                                }

                                                if (isDel) {
                                                    // + button to add custom element, inserted before del column
                                                    const addBtn = (
                                                        <th key="__addElem" style={{ ...thStyle, backgroundColor: 'var(--bg-subtle)', minWidth: '26px', padding: '5px 3px' }}>
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
                        </thead>

                        {/* TBODY */}
                        <tbody style={{ backgroundColor: "var(--bg-card)" }}>
                            {table.getRowModel().rows.map((row, rIdx) => (
                                <tr key={row.id} className="transition-colors">
                                    {row.getVisibleCells().map((cell, cIdx) => {
                                        const colId = cell.column.id
                                        const isDel = colId === 'del'
                                        /* Sales MT and Sales Total are worked out from the sales
                                           bar, exactly as Cost PMT and Cost Total are worked out
                                           from the cost bar — but only the cost pair was drawn as
                                           read-only. The sales pair rendered through the editable
                                           branch, so it took a text input and, now that the border
                                           only appears on cells you can actually type in, would
                                           have been the only computed column still offering one. */
                                        const isCost = colId === 'costPmt' || colId === 'costTotal'
                                            || colId === 'salesMt' || colId === 'salesTotal'
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
                                                    /* Computed, so it gets the tint the app gives a worked-out
                                                       figure everywhere else (see the formulas cards) — fill,
                                                       no border. It used to carry a pink border as well, which
                                                       made the one read-only column the loudest thing in the
                                                       row. */
                                                    <div
                                                        className="flex items-center justify-center rounded-control px-1.5"
                                                        style={{ background: hdrBg(colId), minWidth: '62px', minHeight: 'var(--h-cell-control)' }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                ) : (
                                                    /* The value carries the cell, not a box around it.
                                                       Every editable cell used to draw a filled, bordered
                                                       pill whether or not it held anything — 33 columns of
                                                       outline per row, and a column like Co or W that is
                                                       empty on every row still drew a full stack of empty
                                                       boxes. The border comes back on hover (this is
                                                       editable) and on focus (this is where you are), which
                                                       is when it means something. */
                                                    <div
                                                        className={`flex items-center rounded-control px-1.5 transition-colors ${
                                                            isLeft ? 'justify-start' : 'justify-center'
                                                        } ${
                                                            focused
                                                                ? 'bg-[var(--bg-card)] border border-[var(--brand)] shadow-[0_0_0_3px_var(--brand-soft)]'
                                                                /* Fe is the balance, so it carries the
                                                                   computed tint — but only once it holds
                                                                   a figure. Tinted while empty it was the
                                                                   loudest thing in the table, a filled
                                                                   block on every row saying nothing. */
                                                                : isFe && (cell.getContext().getValue() ?? '') !== ''
                                                                    ? 'bg-[var(--brand-soft)] border border-transparent'
                                                                    : 'border border-transparent hover:bg-[var(--bg-subtle)] hover:border-[var(--line-strong)]'
                                                        }`}
                                                        style={{
                                                            minWidth: colId === 'material' ? '150px' : colId === 'container' ? '78px' : colId === 'kgs' ? '62px' : '44px',
                                                            minHeight: 'var(--h-cell-control)',
                                                        }}
                                                    >
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
                                                padding: '6px 5px', fontWeight: '500',
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
                    </DndContext>
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
                                            <span className='font-semibold' style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-caption)', fontWeight: '600' }}>{cell.column.columnDef.header}</span>
                                            <span className="responsiveTextTable" style={{ color: 'var(--pink-text)', fontWeight: '600' }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                                        </div>
                                    )
                                    return (
                                        <div key={cell.id} className="flex flex-col space-y-1 pb-2 last:pb-0" style={{ borderBottom: '1px solid var(--line)' }}>
                                            <div className='font-semibold' style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-caption)', fontWeight: '600' }}>{cell.column.columnDef.header}</div>
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
