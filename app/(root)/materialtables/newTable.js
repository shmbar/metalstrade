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

  // Cell helpers
  const getCellWidthClass = (columnId) => {
    if (columnId === 'material') return 'min-w-[120px] lg:min-w-[150px]'
    if (columnId === 'kgs') return 'min-w-[100px] lg:min-w-[120px]'
    return 'min-w-[80px] lg:min-w-[90px]'
  }
  const getTextAlignClass = (columnId) => columnId === 'material' ? 'text-left' : 'text-center'

  // Fade-in animation for badges (as in contracts table)
  if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
    document.head.appendChild(style);
  }

  return (
    <div className="w-full">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { 
          background: linear-gradient(180deg, #F8F8F8, #F0F0F0); 
          border-radius: 6px; 
        }
        .dashboard-scroll::-webkit-scrollbar-thumb { 
          background: linear-gradient(180deg, #E0E0E0, #CCCCCC); 
          border-radius: 6px; 
          border: 2px solid #F8F8F8;
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(180deg, #CCCCCC, #B0B0B0);
          border-color: #F0F0F0;
        }
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.85) 0%, 
            rgba(250, 250, 250, 0.90) 50%,
            rgba(255, 255, 255, 0.85) 100%
          );
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
        }
        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px !important;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
        .custom-table th, .custom-table td {
          border: 1px solid #ccc;
          background-color: #f9f9f9;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
        }
        .custom-table th {
          background-color: #d4eafc;
        }
        .custom-table td {
          background-color: #fff;
          border: 1px solid #e0e0e0;
        }
      `}</style>

      {/* Header Controls */}
      {showHeader && (
        <div className="flex-shrink-0"
          style={{
            borderBottom: '2px solid #E5E7EB',
            background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
          }}>
          <Header 
            globalFilter={globalFilter} 
            setGlobalFilter={setGlobalFilter}
            table={table} 
            excellReport={excellReport}
            type='mTable'
            addMaterial={addMaterial}
            delTable={delTable}
            table1={table1}
            runPdf={runPdf}
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden sm:block custom-table">
        <div className="overflow-auto dashboard-scroll rounded-2xl " style={{ maxHeight: '700px'}}>
          <table className="w-full p-1" style={{ tableLayout: 'auto' }}>
            {/* THEAD */}
            <thead className="sticky top-0 z-10">
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                  {hdGroup.headers.map((header, idx) => (
                   <th
  key={header.id}
  className={`px-2 py-2 uppercase ${
    header.column.id === 'material' ? 'text-left' : 'text-center'
  }`}
  style={{
    backgroundColor:
      header.column.id === 'material' || header.column.id === 'kgs'
        ? '#d4eafc'
        : '#ffdbdb',
    color: '#183d79',
    minWidth: header.column.id === 'material' ? '120px' : '60px',
    maxWidth: header.column.id === 'material' ? '150px' : 'none',
    fontSize: 'clamp(10px, 1.0vw, 13px)',
    letterSpacing: '0.05em',
    textAlign: header.column.id === 'material' ? 'left' : 'center',
  }}
>
                      {header.column.getCanSort() ? (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className={`cursor-pointer flex items-center gap-1.5 ${header.column.id === 'material' ? 'justify-start' : 'justify-center'}`}
                        >
                          {header.column.columnDef.header}
                          {{
                            asc: <TbSortAscending className="text-[#183d79] w-4 h-4" />,
                            desc: <TbSortDescending className="text-[#183d79] w-4 h-4" />
                          }[header.column.getIsSorted()]}
                        </div>
                      ) : (
                        <span className="text-[13px] font-semibold text-[#183d79]">
                          {header.column.columnDef.header}
                        </span>
                      )}
                      {header.column.getCanFilter() && (
                        <div>
                          <Filter column={header.column} table={table} filterOn={filterOn} />
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* TBODY */}
            <tbody>
              {table.getRowModel().rows.map((row, rowIdx) => (
                <tr key={row.id} className="cursor-pointer">
                  {row.getVisibleCells().map(cell => {
                    const isMaterialOrKgs = cell.column.id === 'material' || cell.column.id === 'kgs'
                    const isDel = cell.column.id === 'del'
                    return (
                    <td
  key={cell.id}
  data-label={cell.column.columnDef.header}
  className="px-2 py-2 transition-colors duration-150 group/cell relative"
  style={{
    color: '#1F2937',
    minWidth: cell.column.id === 'material' ? '120px' : '60px',
    maxWidth: cell.column.id === 'material' ? '150px' : '110px',
    fontSize: 'clamp(11px, 1.0vw, 13px)',
    fontWeight: '400',
  }}
>
                        {!isDel ? (
                         <div
  className="
    px-2 py-1
    text-[11px]
    font-normal
    flex items-center justify-center
    min-w-[70px]
    text-center
    whitespace-nowrap
    rounded-lg
    transition-all duration-200 ease-in-out
  "
  style={{
    backgroundColor: '#f9f9f9',
    border: '1px solid #cecece',
  }}
>
                            <input
                              type={isMaterialOrKgs ? 'text' : 'number'}
                              className={`w-full border-none bg-transparent focus:outline-none text-center`}
                              onChange={(e) => editCell(table1, e, cell)}
                              value={cell.column.id === 'kgs' ? formatNumber(cell.getContext().getValue()) : cell.getContext().getValue()}
                              style={{
                                fontFamily: 'Poppins, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                color: '#1F2937',
                                background: 'transparent',
                                textAlign: cell.column.id === 'material' ? 'left' : 'center'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex justify-center items-center px-2 py-1.5">
  <button
    onClick={() => delMaterial(table1, cell)}
    className="cursor-pointer transition-colors duration-150 hover:text-red-700"
  >
    <MdDeleteOutline className="w-[18px] h-[18px] text-red-600" />
  </button>
</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>

            {/* TFOOT - Footer Totals */}
            {showFooter && (
<tfoot>
  <tr>
    {table.getHeaderGroups()[0].headers.map((header, idx) => {
      const isMaterialOrKgs =
        header.id === 'material' || header.id === 'kgs'

      return (
        <td
          key={header.id}
          className="px-2 py-2 font-bold"
          style={{
            backgroundColor:
              idx >= 2
                ? isMaterialOrKgs
                  ? '#d4eafc'
                  : '#ffdbdb'
                : '#f9f9f9',
            color:
              idx < 2
                ? '#6B7280'   // 👈 gray text for first two
                : '#183d79',  // normal blue text for others
            fontSize: 'clamp(10px, 1.0vw, 13px)',
            textAlign: header.id === 'material' ? 'left' : 'center',
            border: '1px solid #cecece'
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

      {/* Mobile Table/Card View */}
      <div className="sm:hidden">
        <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2" style={{ maxHeight: '700px' }}>
          {table.getRowModel().rows.map((row, rowIndex) => (
            <div
              key={row.id}
              className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
              }}
            >
              <div
                className="px-3 py-2 flex items-center justify-between"
                style={{
                  background: '#bce1ff',
                }}
              >
                <span
                  className="font-normal"
                  style={{
                    fontSize: 'clamp(9px, 0.8vw, 10px)',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  Row {rowIndex + 1}
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                {row.getVisibleCells().map((cell) => {
                  if (cell.column.id === 'del') return null;
                  return (
                    <div
                      key={cell.id}
                      className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
                      style={{ borderBottom: '1px solid #E5E7EB' }}
                    >
                      <div
                        className="uppercase tracking-wider font-normal"
                        style={{
                          color: '#6B7280',
                          fontSize: 'clamp(6px, 0.6vw, 7px)'
                        }}
                      >
                        {cell.column.columnDef.header}
                      </div>
                      <div
                        className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                        style={{
                          color: '#1F2937',
                          background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                          fontSize: 'clamp(8px, 0.7vw, 10px)',
                          border: '1px solid #E5E7EB'
                        }}
                      >
                        <input
                          type={cell.column.id === 'material' || cell.column.id === 'kgs' ? 'text' : 'number'}
                          className="w-full border-none bg-transparent focus:outline-none"
                          onChange={(e) => editCell(table1, e, cell)}
                          value={cell.column.id === 'kgs' ? formatNumber(cell.getContext().getValue()) : cell.getContext().getValue()}
                          style={{
                            fontFamily: 'Poppins, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                            fontSize: 'clamp(8px, 0.7vw, 10px)',
                            color: '#1F2937',
                            background: 'transparent',
                            textAlign: cell.column.id === 'material' ? 'left' : 'center'
                          }}
                        />
                      </div>
                    </div>
                  );
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
