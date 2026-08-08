'use client'

import Header from "../../../components/table/header";
import EmptyState from "../../../components/EmptyState";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"
import { Fragment, useEffect, useMemo, useState } from "react"
import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { getTtl } from "../../../utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc'
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { labelAwareGlobalFilter } from '../../../components/table/filters/labelAwareGlobalFilter';


const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  excellReport,
  cb,
  setFilteredData,
  ln
}) => {

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState(invisible)
  const [filterOn, setFilterOn] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState(null)
  const [columnFilters, setColumnFilters] = useState([])

  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const [quickSumEnabled, setQuickSumEnabled] = useState(false)
  const [quickSumColumns, setQuickSumColumns] = useState([])
  const [rowSelection, setRowSelection] = useState({})

  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns
    return [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-start w-full h-full ml-2">
            <input
              type="checkbox"
              checked={table.getIsAllPageRowsSelected()}
              ref={el => {
                if (!el) return;
                el.indeterminate = table.getIsSomePageRowsSelected();
              }}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
              className="w-4 h-4 cursor-pointer rounded"
              style={{ accentColor: 'var(--brand-soft)' }}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center  w-full h-full">
            <input
              type="checkbox"
              checked={row.getIsSelected()}
              disabled={!row.getCanSelect()}
              onChange={row.getToggleSelectedHandler()}
              className="w-4 h-4 cursor-pointer rounded"
              style={{ accentColor: 'var(--brand-soft)' }}
            />
          </div>
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 50,
        minSize: 50,
        maxSize: 50,
      },
      ...(columns || [])
    ]
  }, [columns, quickSumEnabled])

  const table = useReactTable({
    columns: columnsWithSelection,
    data,
    enableRowSelection: quickSumEnabled,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: { dateBetweenFilterFn },
    globalFilterFn: labelAwareGlobalFilter,
    state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection
  })

  useEffect(() => {
    setFilteredData?.(table.getFilteredRowModel().rows.map(r => r.original))
  }, [globalFilter, columnFilters])

  const resetTable = () => table.resetColumnFilters()


  // Fade-in animation for badges (as in contracts table)
  if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
    document.head.appendChild(style);
  }

  return (
    <div className="w-full">
      <style jsx global>{`
        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { 
          background: linear-gradient(180deg, var(--bg-subtle), var(--neutral-bg)); 
          border-radius: 6px; 
        }
        .dashboard-scroll::-webkit-scrollbar-thumb { 
          background: linear-gradient(180deg, var(--line), var(--line-strong)); 
          border-radius: 6px; 
          border: 2px solid var(--bg-subtle);
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(180deg, var(--line-strong), var(--ink-muted));
          border-color: var(--neutral-bg);
        }
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(var(--surface-card-rgb),0.85) 0%, 
            rgba(var(--surface-base-rgb),0.90) 50%,
            rgba(var(--surface-card-rgb),0.85) 100%
          );
        }
        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
        .custom-table th {
          background-color: var(--bg-subtle);
          border-bottom: 1px solid var(--line);
          text-align: center;
          vertical-align: middle;
          padding: 7px 8px;
          font-size: 0.6875rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ink-secondary);
          font-weight: 600;
        }
        .custom-table td {
          background-color: var(--bg-card);
          border-bottom: 1px solid var(--line);
          text-align: center;
          vertical-align: middle;
          padding: 6px 8px;
          font-size: 0.75rem;
          font-variant-numeric: tabular-nums;
        }
        .custom-table th {
          background-color: var(--bg-subtle);
        }
        .custom-table td {
          background-color: var(--bg-card);
          border-bottom: 1px solid var(--line);
        }
      `}</style>

      <div className="custom-table">
        <div className="relative flex flex-col rounded-2xl">
          {/* Border overlay — renders above children so corners always visible */}
          <div className="absolute inset-0 rounded-2xl border border-[var(--line)] pointer-events-none z-sticky" />

          {/* HEADER */}
          <div
            className="flex-shrink-0 rounded-t-2xl"
            style={{
              borderBottom: '1px solid var(--line)',
              background: "var(--bg-card)",
            }}
          >
            <Header
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              table={table}
              excellReport={excellReport}
              cb={cb}
              type="accstatement"
              filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
              resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
            />
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block flex-1">
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: '700px' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-sticky">
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(var(--surface-card-rgb), 0.2)' }}>
                      {hdGroup.headers.map((header, idx) => (
                        <th
                          key={header.id}
                          className={`px-2 py-2 responsiveTextTable font-poppins font-medium ${header.column.id === 'select' ? 'text-left' : 'text-center'}`}
                          style={{
                            color: 'var(--chathams-blue)',
                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                            maxWidth: header.column.id === 'select' ? '50px' : 'none',
                            letterSpacing: '0.05em',
                            textAlign: header.column.id === 'select' ? 'left' : 'center',
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                  {filterOn && (
                    <tr style={{ backgroundColor: "var(--bg-card)" }}>
                      {table.getHeaderGroups()[0].headers.map(header => (
                        <th
                          key={header.id}
                          className="px-2 py-1.5"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            borderBottom: '2px solid var(--line)',
                            minWidth: header.column.id === 'select' ? '50px' : '90px',
                            maxWidth: header.column.id === 'select' ? '50px' : 'none',
                          }}
                        >
                          {header.column.getCanFilter() && (
                            <Filter column={header.column} table={table} filterOn={filterOn} />
                          )}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      onDoubleClick={() => SelectRow?.(row.original)}
                      tabIndex={0}
                      className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ' cursor-pointer'}`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-2 py-2 transition-colors duration-150 group/cell relative cell-hover-effect"
                          style={{
                            color: 'var(--port-gore)',
                            minWidth: cell.column.id === 'select' ? '50px' : '60px',
                            maxWidth: cell.column.id === 'select' ? '50px' : 'none',
                            fontWeight: '400',
                            zIndex: 1,
                            willChange: 'background-color, color',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <div
                            className="px-2 py-1 responsiveTextTable font-medium flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-2xl border-transparent transition-all duration-200  ease-in-out hover:bg-[var(--bg-subtle)] hover:text-[var(--port-gore)] hover:shadow-[inset_0_0_0_1px_var(--line-strong)] fade-in"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columnsWithSelection.length}
                        className="py-24 text-center"
                      >
                        <EmptyState message={getTtl('No data available', ln)} hint="Try adjusting your filters or date range" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW */}
          <div className="block md:hidden">
            <div
              className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
              style={{ maxHeight: '700px' }}
            >
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  onClick={() => SelectRow?.(row.original)}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: '1px solid var(--line)',
                  }}
                >
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{
                      background: 'var(--bg-subtle)',
                    }}
                  >
                    <span
                      className="font-normal"
                      style={{
                        fontSize: 'var(--fs-table)',
                        textShadow: '0 1px 2px rgba(var(--shadow-rgb), 0.2)'
                      }}
                    >
                      {getTtl('Row', ln)} {rowIndex + 1}
                    </span>
                    {quickSumEnabled && (
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 cursor-pointer rounded"
                        style={{ accentColor: 'var(--on-brand)' }}
                      />
                    )}
                  </div>
                  <div className="p-4 space-y-2.5">
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === 'select') return null;
                      return (
                        <div
                          key={cell.id}
                          className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
                          style={{ borderBottom: '1px solid var(--line)' }}
                        >
                          <div
                            className="uppercase tracking-wider font-normal"
                            style={{
                              color: 'var(--regent-gray)',
                              fontSize: 'var(--fs-caption)'
                            }}
                          >
                            {cell.column.columnDef.header}
                          </div>
                          <div
                            className="font-normal break-words px-1 py-1 leading-relaxed min-h-7 flex items-center" style={{ color: 'var(--ink)' }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {table.getRowModel().rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 px-3">
                                    <p
                    className="responsiveTextTable font-medium mb-2 text-center"
                    style={{ color: 'var(--port-gore)' }}
                  >
                    {getTtl('No data available', ln)}
                  </p>
                  <p
                    className="text-center"
                    style={{
                      color: 'var(--regent-gray)',
                      fontSize: 'var(--fs-caption)'
                    }}
                  >
                    Try adjusting your filters or date range
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER */}
        <div
  className="flex-shrink-0 rounded-b-2xl"
  style={{
    borderTop: '1px solid var(--line)',
    background: "var(--bg-card)",
  }}
>
  <div className="w-full px-4 py-3">
    <div className="grid grid-cols-3 items-center">

      {/* LEFT — Showing Range */}
      <div
        className="responsiveTextTable whitespace-nowrap justify-self-start"
        style={{ color: 'var(--regent-gray)' }}
      >
        {`${
          table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
          (table.getFilteredRowModel().rows.length ? 1 : 0)
        }–${
          table.getRowModel().rows.length +
          table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize
        } ${getTtl('of', ln)} ${
          table.getFilteredRowModel().rows.length
        }`}
      </div>

      {/* CENTER — Pagination */}
      <div className="justify-self-center">
        <Paginator table={table} />
      </div>

      {/* RIGHT — Rows Dropdown */}
      <div className="justify-self-end">
        <RowsIndicator table={table} />
      </div>

    </div>
  </div>
</div>
        </div>
      </div>
    </div>
  )
}

export default Customtable
