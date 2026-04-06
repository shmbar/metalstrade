'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState, useContext } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { MdDeleteOutline } from "react-icons/md"
import Header from "../../../components/table/header"
import { Filter } from "../../../components/table/filters/filterFunc"
import { SettingsContext } from "../../../contexts/useSettingsContext"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DEFAULT_ELEMENTS, UNIT_LABELS, UNIT_TO_MT } from './constants'

// Sortable header cell for element columns (supports drag-to-reorder + remove button)
function SortableHeaderCell({ id, label, style, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <th
      ref={setNodeRef}
      style={{
        ...style,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      {...attributes}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
        <span style={{ cursor: 'grab' }} {...listeners}>{label}</span>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={onRemove}
          title="Remove element"
          style={{
            fontSize: '11px', fontWeight: '700', color: '#c4d4e4',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '0 1px', lineHeight: 1,
          }}
        >×</button>
      </div>
    </th>
  )
}

const Customtable = ({
  data,
  columns,
  excellReport,
  addMaterial,
  editCell,
  table1,
  delMaterial,
  delTable,
  runPdf,
  showHeader = true,
  showFooter = true,
  // New props
  unit = 'kgs',
  elements = [],
  prices = {},
  setUnit = () => {},
  addElement = () => {},
  removeElement = () => {},
  reorderElements = () => {},
  setPrice = () => {},
}) => {
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterOn] = useState(false)
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const [columnFilters, setColumnFilters] = useState([])
  const [addElemInput, setAddElemInput] = useState('')
  const [showAddElem, setShowAddElem] = useState(false)

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
  useContext(SettingsContext)

  const elementKeys = useMemo(() => elements.map(e => e.key), [elements])

  const hasPrices = useMemo(
    () => elements.some(el => prices[el.key] !== undefined && prices[el.key] !== ''),
    [elements, prices]
  )

  // Inject a computed "Cost" column before "del" when any price is set
  const enhancedColumns = useMemo(() => {
    if (!columns.length || !hasPrices) return columns
    const delIdx = columns.findIndex(c => c.accessorKey === 'del')
    const costCol = {
      id: 'cost',
      header: 'Cost $',
      enableSorting: false,
      accessorFn: (row) => {
        const weight = parseFloat(row.kgs) || 0
        const weightMT = weight * (UNIT_TO_MT[unit] || 0.001)
        return elements.reduce((sum, el) => {
          const pct = parseFloat(row[el.key]) || 0
          const price = parseFloat(prices[el.key]) || 0
          return sum + (pct / 100) * price
        }, 0) * weightMT
      },
      cell: (props) => {
        const v = props.getValue()
        if (!v) return <p></p>
        return (
          <p style={{ color: '#003366', fontWeight: '600', fontSize: '10px' }}>
            {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}
          </p>
        )
      },
    }
    if (delIdx >= 0) return [...columns.slice(0, delIdx), costCol, ...columns.slice(delIdx)]
    return [...columns, costCol]
  }, [columns, hasPrices, elements, prices, unit])

  const table = useReactTable({
    columns: enhancedColumns,
    data,
    getCoreRowModel: getCoreRowModel(),
    state: { globalFilter, pagination, columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = elements.findIndex(e => e.key === active.id)
    const newIdx = elements.findIndex(e => e.key === over.id)
    if (oldIdx !== -1 && newIdx !== -1) reorderElements(arrayMove(elements, oldIdx, newIdx))
  }

  const handleAddElement = () => {
    const raw = addElemInput.trim()
    if (!raw) return
    const parts = raw.split('|')
    const key = parts[0].trim()
    const label = (parts[1] || parts[0]).trim()
    addElement(key, label)
    setAddElemInput('')
    setShowAddElem(false)
  }

  // Utility: Format numbers with commas (2 dp)
  const formatNumber = (nStr) => {
    if (!nStr && nStr !== 0) return ''
    nStr += ''
    const x = nStr.split('.')
    let x1 = x[0]
    let x2 = x.length > 1 ? '.' + x[1] : ''
    const rgx = /(\d+)(\d{3})/
    while (rgx.test(x1)) { x1 = x1.replace(rgx, '$1,$2') }
    x2 = x2.length > 3 ? x2.substring(0, 3) : x2
    return x1 + x2
  }

  // Footer totals
  const calculateFooterTotals = (header) => {
    const columnId = header.column ? header.column.id : header.id
    if (columnId === 'del') return ''
    const filteredRows = table.getFilteredRowModel().rows
    if (columnId === 'material') return `${filteredRows.length} items`

    const totalWeight = filteredRows.reduce((sum, row) => sum + (parseFloat(row.getValue('kgs')) || 0), 0)

    if (columnId === 'kgs') return formatNumber(totalWeight.toFixed(2))

    if (columnId === 'cost') {
      if (!hasPrices) return ''
      const totalCost = filteredRows.reduce((sum, row) => {
        const w = parseFloat(row.getValue('kgs')) || 0
        const wMT = w * (UNIT_TO_MT[unit] || 0.001)
        const rowCost = elements.reduce((s, el) => {
          const pct = parseFloat(row.getValue(el.key)) || 0
          const price = parseFloat(prices[el.key]) || 0
          return s + (pct / 100) * price
        }, 0) * wMT
        return sum + rowCost
      }, 0)
      return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCost)
    }

    const weightedTotal = filteredRows.reduce((sum, row) => {
      const kgs = parseFloat(row.getValue('kgs')) || 0
      const val = parseFloat(row.getValue(columnId)) || 0
      return sum + kgs * val
    }, 0)
    const average = totalWeight > 0 ? (weightedTotal / totalWeight).toFixed(2) : 0
    return average !== 'NaN' ? formatNumber(average) : ''
  }

  const getHeaderBg = (columnId) => {
    if (columnId === 'material' || columnId === 'kgs') return '#dbeafe'
    if (columnId === 'cost') return '#dcfce7'
    return '#fde8e8'
  }
  const getFooterBg = (columnId) => {
    if (columnId === 'material' || columnId === 'kgs') return '#dbeafe'
    if (columnId === 'cost') return '#bbf7d0'
    return '#fdd6d6'
  }

  const headers = table.getHeaderGroups()[0]?.headers ?? []
  const totalCols = headers.length

  const unitBtnStyle = (u) => ({
    fontSize: '10px',
    padding: '1px 9px',
    height: '22px',
    borderRadius: '99px',
    border: `1px solid ${unit === u ? 'var(--endeavour)' : '#d8e8f5'}`,
    background: unit === u ? 'var(--endeavour)' : 'transparent',
    color: unit === u ? '#fff' : 'var(--endeavour)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
  })

  return (
    <div className="w-full">

      {/* Header Controls */}
      {showHeader && (
        <div
          className="flex-shrink-0"
          style={{
            borderBottom: '2px solid var(--selago)',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
          }}
        >
          <Header
            globalFilter={globalFilter}
            setGlobalFilter={setGlobalFilter}
            table={table}
            excellReport={excellReport}
            type='mTable'
            addMaterial={addMaterial}
            addTable={null}
            saveTable={null}
            delTable={delTable}
            table1={table1}
            runPdf={runPdf}
          />

          {/* Unit toggle + Element management row */}
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2">

            {/* Weight unit selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '10px', color: '#9fb8d4', marginRight: '2px' }}>Unit:</span>
              {['mt', 'kgs', 'lbs'].map(u => (
                <button key={u} onClick={() => setUnit(u)} style={unitBtnStyle(u)}>
                  {UNIT_LABELS[u]}
                </button>
              ))}
            </div>

            {/* Add custom element */}
            {showAddElem ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  autoFocus
                  value={addElemInput}
                  onChange={e => setAddElemInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddElement()
                    if (e.key === 'Escape') { setAddElemInput(''); setShowAddElem(false) }
                  }}
                  placeholder="Symbol (e.g. Al)"
                  style={{
                    fontSize: '10px', padding: '2px 8px', height: '22px',
                    borderRadius: '8px', border: '1px solid #d8e8f5', background: '#f8fbff',
                    outline: 'none', width: '110px',
                    fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
                  }}
                />
                <button
                  onClick={handleAddElement}
                  style={{ fontSize: '10px', color: 'var(--endeavour)', background: 'none', border: 'none', cursor: 'pointer' }}
                >Add</button>
                <button
                  onClick={() => { setAddElemInput(''); setShowAddElem(false) }}
                  style={{ fontSize: '10px', color: '#9fb8d4', background: 'none', border: 'none', cursor: 'pointer' }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddElem(true)}
                style={{
                  fontSize: '10px', padding: '1px 8px', height: '22px', borderRadius: '99px',
                  border: '1px dashed #d8e8f5', color: '#9fb8d4',
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--endeavour)'; e.currentTarget.style.color = 'var(--endeavour)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d8e8f5'; e.currentTarget.style.color = '#9fb8d4' }}
              >
                + Element
              </button>
            )}

            {hasPrices && (
              <span style={{ fontSize: '10px', color: '#9fb8d4', marginLeft: '4px' }}>
                Prices ($/MT) — enter below each element column
              </span>
            )}
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden sm:block">
        <div className="overflow-auto" style={{ maxHeight: '700px' }}>
          <table
            className="w-full"
            style={{
              tableLayout: 'auto',
              borderCollapse: 'separate',
              borderSpacing: 0,
              fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* THEAD — with dnd-kit sortable for element columns */}
            <thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={elementKeys} strategy={horizontalListSortingStrategy}>
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id}>
                      {hdGroup.headers.map((header, idx) => {
                        const isFirst = idx === 0
                        const isLast = idx === hdGroup.headers.length - 1
                        const colId = header.column.id
                        const isDel = colId === 'del'
                        const isElement = elementKeys.includes(colId)

                        const thStyle = {
                          backgroundColor: getHeaderBg(colId),
                          color: 'var(--chathams-blue)',
                          padding: '5px 6px',
                          fontSize: '11px',
                          fontWeight: '500',
                          textAlign: colId === 'material' ? 'left' : 'center',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          border: 'none',
                          borderTopLeftRadius: isFirst ? '10px' : '0',
                          borderTopRightRadius: isLast ? '10px' : '0',
                          minWidth: colId === 'material' ? '200px' : colId === 'del' ? '32px' : '55px',
                        }

                        if (isDel) return <th key={header.id} style={thStyle} />

                        if (isElement) {
                          return (
                            <SortableHeaderCell
                              key={header.id}
                              id={colId}
                              label={header.column.columnDef.header}
                              style={thStyle}
                              onRemove={() => removeElement(colId)}
                            />
                          )
                        }

                        return (
                          <th key={header.id} style={thStyle}>
                            {header.column.getCanSort() ? (
                              <div
                                onClick={header.column.getToggleSortingHandler()}
                                className="cursor-pointer flex items-center gap-1"
                                style={{ justifyContent: colId === 'material' ? 'flex-start' : 'center' }}
                              >
                                {header.column.columnDef.header}
                                {{
                                  asc: <TbSortAscending className="w-3.5 h-3.5" />,
                                  desc: <TbSortDescending className="w-3.5 h-3.5" />,
                                }[header.column.getIsSorted()]}
                              </div>
                            ) : (
                              <span>{header.column.columnDef.header}</span>
                            )}
                            {header.column.getCanFilter() && (
                              <Filter column={header.column} table={table} filterOn={filterOn} />
                            )}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </SortableContext>
              </DndContext>
            </thead>

            {/* TBODY */}
            <tbody style={{ backgroundColor: '#ffffff' }}>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-colors">
                  {row.getVisibleCells().map((cell) => {
                    const colId = cell.column.id
                    const isDel = colId === 'del'
                    const isCost = colId === 'cost'
                    const isKgs = colId === 'kgs'
                    const isMaterial = colId === 'material'
                    return (
                      <td
                        key={cell.id}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '2px 3px',
                          borderBottom: '1px solid #e8f0f8',
                          borderRight: '1px solid #e8f0f8',
                          borderTop: 'none',
                          borderLeft: 'none',
                          verticalAlign: 'middle',
                        }}
                      >
                        {isDel ? (
                          <div className="flex justify-center items-center px-1 py-1">
                            <button
                              onClick={() => delMaterial(table1, cell)}
                              className="cursor-pointer transition-colors duration-150 hover:text-red-700"
                            >
                              <MdDeleteOutline className="w-[18px] h-[18px] text-red-500" />
                            </button>
                          </div>
                        ) : isCost ? (
                          <div style={{
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '60px',
                            minHeight: '26px',
                          }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        ) : (
                          <div style={{
                            backgroundColor: '#f8fbff',
                            border: '1px solid #d8e8f5',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isMaterial ? 'flex-start' : 'center',
                            minWidth: isMaterial ? '270px' : '60px',
                            minHeight: '26px',
                          }}>
                            <input
                              type="text"
                              inputMode={isMaterial || isKgs ? 'text' : 'decimal'}
                              className="w-full border-none bg-transparent focus:outline-none"
                              onChange={(e) => editCell(table1, e, cell)}
                              value={cell.getContext().getValue() ?? ''}
                              style={{
                                fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
                                fontSize: '11px',
                                color: '#1F2937',
                                background: 'transparent',
                                textAlign: isMaterial ? 'left' : 'center',
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
                {/* Weighted average row */}
                <tr>
                  {headers.map((header, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === totalCols - 1
                    return (
                      <td
                        key={header.id}
                        style={{
                          backgroundColor: getFooterBg(header.column.id),
                          color: 'var(--chathams-blue)',
                          padding: '5px 6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textAlign: header.column.id === 'material' ? 'left' : 'center',
                          border: 'none',
                          whiteSpace: 'nowrap',
                          borderTopLeftRadius: isFirst ? '10px' : '0',
                          borderTopRightRadius: isLast ? '10px' : '0',
                          // No bottom radius — price row always follows
                        }}
                      >
                        {calculateFooterTotals(header)}
                      </td>
                    )
                  })}
                </tr>

                {/* Price input row — always shown so users can enter $/MT prices */}
                <tr>
                  {headers.map((header, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === totalCols - 1
                    const colId = header.column.id
                    const isElem = elementKeys.includes(colId)
                    return (
                      <td
                        key={`price-${header.id}`}
                        style={{
                          backgroundColor: '#fffbeb',
                          padding: '3px 6px',
                          fontSize: '10px',
                          textAlign: 'center',
                          border: 'none',
                          borderBottomLeftRadius: isFirst ? '10px' : '0',
                          borderBottomRightRadius: isLast ? '10px' : '0',
                        }}
                      >
                        {colId === 'material' ? (
                          <span style={{ color: '#9fb8d4', fontSize: '9px', fontStyle: 'italic' }}>$/MT</span>
                        ) : isElem ? (
                          <input
                            value={prices[colId] || ''}
                            onChange={e => setPrice(colId, e.target.value)}
                            placeholder="0"
                            inputMode="decimal"
                            style={{
                              fontSize: '10px',
                              width: '100%',
                              textAlign: 'center',
                              background: 'transparent',
                              border: 'none',
                              outline: 'none',
                              color: '#b45309',
                              fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
                            }}
                          />
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden">
        <div className="overflow-y-auto px-2 py-2 space-y-2" style={{ maxHeight: '700px' }}>
          {table.getRowModel().rows.map((row, rowIndex) => (
            <div
              key={row.id}
              className="rounded-2xl overflow-hidden shadow-md"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--selago)' }}
            >
              <div className="px-3 py-2" style={{ background: '#dbeafe' }}>
                <span style={{ fontSize: '10px', color: 'var(--chathams-blue)', fontWeight: '500' }}>
                  Row {rowIndex + 1}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {row.getVisibleCells().map((cell) => {
                  const colId = cell.column.id
                  if (colId === 'del') return null

                  if (colId === 'cost') return (
                    <div key={cell.id} className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--selago)' }}>
                      <span style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cost $</span>
                      <span style={{ color: '#003366', fontSize: '11px', fontWeight: '600' }}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </span>
                    </div>
                  )

                  return (
                    <div
                      key={cell.id}
                      className="flex flex-col space-y-1 pb-2 last:pb-0"
                      style={{ borderBottom: '1px solid var(--selago)' }}
                    >
                      <div style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {cell.column.columnDef.header}
                      </div>
                      <div style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #c7d7e8',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        minHeight: '28px',
                        display: 'flex',
                        alignItems: 'center',
                      }}>
                        <input
                          type="text"
                          inputMode={colId === 'material' || colId === 'kgs' ? 'text' : 'decimal'}
                          className="w-full border-none bg-transparent focus:outline-none"
                          onChange={(e) => editCell(table1, e, cell)}
                          value={cell.getContext().getValue() ?? ''}
                          style={{
                            fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif",
                            fontSize: '11px',
                            color: '#1F2937',
                            background: 'transparent',
                          }}
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
