'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState, useContext } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { MdDeleteOutline } from "react-icons/md"
import Header from "../../../components/table/header"
import { Filter } from "../../../components/table/filters/filterFunc"
import { SettingsContext } from "../../../contexts/useSettingsContext"

const Customtable = ({
  data,
  columns,
  excellReport,
  addMaterial,
  addTable,
  saveTable,
  editCell,
  table1,
  delMaterial,
  delTable,
  runPdf,
  showHeader = true,
  showFooter = true,
  editable = true
}) => {
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterOn, setFilterOn] = useState(false)
  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25
  })
  const [columnFilters, setColumnFilters] = useState([])

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
  const { ln } = useContext(SettingsContext)

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    state: {
      globalFilter,
      pagination,
      columnFilters
    },
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  // Utility: Format numbers with commas
  const formatNumber = (nStr) => {
    if (!nStr && nStr !== 0) return ''
    nStr += ''
    const x = nStr.split('.')
    let x1 = x[0]
    let x2 = x.length > 1 ? '.' + x[1] : ''
    const rgx = /(\d+)(\d{3})/
    while (rgx.test(x1)) {
      x1 = x1.replace(rgx, '$1,$2')
    }
    x2 = x2.length > 3 ? x2.substring(0, 3) : x2
    return x1 + x2
  }

  // Footer totals
  const calculateFooterTotals = (header) => {
    const columnId = header.id
    if (columnId === 'del') return ''
    const filteredRows = table.getFilteredRowModel().rows
    if (columnId === 'material') return `${filteredRows.length} items`
    const totalKGS = filteredRows.reduce((sum, row) => sum + (parseFloat(row.getValue('kgs')) || 0), 0)
    if (columnId === 'kgs') return formatNumber(totalKGS.toFixed(2))
    const weightedTotal = filteredRows.reduce((sum, row) => {
      const kgs = parseFloat(row.getValue('kgs')) || 0
      const val = parseFloat(row.getValue(columnId)) || 0
      return sum + kgs * val
    }, 0)
    const average = totalKGS > 0 ? (weightedTotal / totalKGS).toFixed(2) : 0
    return average !== 'NaN' ? formatNumber(average) : ''
  }

  // Column color: blue for material/kgs, pink for elements (del same as pink to keep seamless band)
  const getColBg = (columnId) => {
    if (columnId === 'material' || columnId === 'kgs') return '#dbeafe'
    return '#ffdbdb'
  }

  const headers = table.getHeaderGroups()[0]?.headers ?? []
  const totalCols = headers.length

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
            addTable={addTable}
            saveTable={saveTable}
            delTable={delTable}
            table1={table1}
            runPdf={runPdf}
          />
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
              fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
            }}
          >
            {/* THEAD — seamless colored band */}
            <thead>
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id}>
                  {hdGroup.headers.map((header, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === hdGroup.headers.length - 1
                    const isDel = header.column.id === 'del'
                    return (
                      <th
                        key={header.id}
                        style={{
                          backgroundColor: getColBg(header.column.id),
                          color: 'var(--chathams-blue)',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textAlign: header.column.id === 'material' ? 'left' : 'center',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                          borderTop: 'none',
                          borderBottom: 'none',
                          borderLeft: 'none',
                          borderRight: 'none',
                          borderTopLeftRadius: isFirst ? '10px' : '0',
                          borderTopRightRadius: isLast ? '10px' : '0',
                          minWidth: header.column.id === 'material' ? '280px' : header.column.id === 'del' ? '40px' : '70px',
                          maxWidth: 'none',
                        }}
                      >
                        {isDel ? null : (
                          header.column.getCanSort() ? (
                            <div
                              onClick={header.column.getToggleSortingHandler()}
                              className="cursor-pointer flex items-center gap-1 justify-center"
                              style={{ justifyContent: header.column.id === 'material' ? 'flex-start' : 'center' }}
                            >
                              {header.column.columnDef.header}
                              {{
                                asc: <TbSortAscending className="w-3.5 h-3.5" />,
                                desc: <TbSortDescending className="w-3.5 h-3.5" />,
                              }[header.column.getIsSorted()]}
                            </div>
                          ) : (
                            <span>{header.column.columnDef.header}</span>
                          )
                        )}
                        {header.column.getCanFilter() && (
                          <Filter column={header.column} table={table} filterOn={filterOn} />
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>

            {/* TBODY — pill cells on white background */}
            <tbody style={{ backgroundColor: '#ffffff' }}>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#dbeeff] transition-colors cursor-pointer">
                  {row.getVisibleCells().map((cell) => {
                    const isDel = cell.column.id === 'del'
                    const isMaterialOrKgs = cell.column.id === 'material' || cell.column.id === 'kgs'
                    return (
                      <td
                        key={cell.id}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '3px 4px',
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
                        ) : (
                          <div
                            style={{
                              backgroundColor: '#f9f9f9',
                              border: '1px solid #cecece',
                              borderRadius: '8px',
                              padding: '3px 8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: cell.column.id === 'material' ? 'flex-start' : 'center',
                              minWidth: cell.column.id === 'material' ? '270px' : '60px',
                              minHeight: '26px',
                            }}
                          >
                            <input
                              type="text"
                              inputMode={isMaterialOrKgs ? 'text' : 'decimal'}
                              className="w-full border-none bg-transparent focus:outline-none"
                              onChange={(e) => editCell(table1, e, cell)}
                              value={cell.column.id === 'kgs' ? formatNumber(cell.getContext().getValue()) : cell.getContext().getValue()}
                              style={{
                                fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                                fontSize: '11px',
                                color: '#1F2937',
                                background: 'transparent',
                                textAlign: cell.column.id === 'material' ? 'left' : 'center',
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

            {/* TFOOT — seamless colored band */}
            {showFooter && (
              <tfoot>
                <tr>
                  {headers.map((header, idx) => {
                    const isFirst = idx === 0
                    const isLast = idx === totalCols - 1
                    return (
                      <td
                        key={header.id}
                        style={{
                          backgroundColor: getColBg(header.id),
                          color: 'var(--chathams-blue)',
                          padding: '8px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textAlign: header.id === 'material' ? 'left' : 'center',
                          border: 'none',
                          whiteSpace: 'nowrap',
                          borderTopLeftRadius: isFirst ? '10px' : '0',
                          borderTopRightRadius: isLast ? '10px' : '0',
                          borderBottomLeftRadius: isFirst ? '10px' : '0',
                          borderBottomRightRadius: isLast ? '10px' : '0',
                        }}
                      >
                        {calculateFooterTotals(header)}
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
              <div
                className="px-3 py-2"
                style={{ background: '#dbeafe' }}
              >
                <span style={{ fontSize: '10px', color: 'var(--chathams-blue)', fontWeight: '500' }}>
                  Row {rowIndex + 1}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {row.getVisibleCells().map((cell) => {
                  if (cell.column.id === 'del') return null
                  return (
                    <div
                      key={cell.id}
                      className="flex flex-col space-y-1 pb-2 last:pb-0"
                      style={{ borderBottom: '1px solid var(--selago)' }}
                    >
                      <div style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {cell.column.columnDef.header}
                      </div>
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #c7d7e8',
                          borderRadius: '8px',
                          padding: '4px 8px',
                          minHeight: '28px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <input
                          type="text"
                          inputMode={cell.column.id === 'material' || cell.column.id === 'kgs' ? 'text' : 'decimal'}
                          className="w-full border-none bg-transparent focus:outline-none"
                          onChange={(e) => editCell(table1, e, cell)}
                          value={cell.column.id === 'kgs' ? formatNumber(cell.getContext().getValue()) : cell.getContext().getValue()}
                          style={{
                            fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
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
