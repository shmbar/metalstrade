// 'use client'

// Fade-in animation for badges
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(style);
}

import Header from "../../../components/table/header";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable
} from "@tanstack/react-table"

import { Fragment, useEffect, useMemo, useState } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc'
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';

const Customtable = ({
  data,
  columns,
  invisible,
  excellReport,
  ln,
  setFilteredData,
  tableModes,
  type
}) => {

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState(invisible)
  const [filterOn, setFilterOn] = useState(false)

  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25
  })

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const [expanded, setExpanded] = useState({})
  const [columnFilters, setColumnFilters] = useState([])

  const [quickSumEnabled, setQuickSumEnabled] = useState(false)
  const [quickSumColumns, setQuickSumColumns] = useState([])
  const [rowSelection, setRowSelection] = useState({})

  usePathname()

  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns

    return [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={el => {
              if (!el) return;
              el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: '#9333EA' }}
          />
        ),
       cell: ({ row }) => (
        <div className="flex items-center  w-full h-full">
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 cursor-pointer rounded"
            style={{ accentColor: '#BCE1FE' }}
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
    data,
    columns: columnsWithSelection,
    enableRowSelection: quickSumEnabled,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: row => row.subRows,
    filterFns: { dateBetweenFilterFn },
    state: {
      globalFilter,
      columnVisibility,
      pagination,
      expanded,
      columnFilters,
      rowSelection,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
  })

  useEffect(() => {
    setFilteredData(
      table.getFilteredRowModel().rows.map(r => r.original)
    )
  }, [globalFilter, columnFilters])

  const resetTable = () => table.resetColumnFilters()

  const currentRows = table.getRowModel().rows.length;
  const dynamicMaxHeight = currentRows > 0
    ? `${Math.min(currentRows * 40 + 180, 700)}px`
    : '320px';

  return (
    <div className="w-full">
     <style jsx global>{`
        /* Import Poppins and set table font */
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

        /* Glassmorphic professional table */
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.85) 0%, 
            rgba(250, 250, 250, 0.90) 50%,
            rgba(255, 255, 255, 0.85) 100%
          );
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
        }

        /* Use Poppins for the table and limit transitions to non-transform properties
           to avoid any hover vibration (no transform transitions allowed). */
        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px !important;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        /* Add border, background, and text alignment styles for table cells */
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

      <div className="custom-table">
        <div className="flex flex-col rounded-3xl shadow-xl  glass-table"
          style={{ 
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(99, 102, 241, 0.1) inset',
          }}
        >

          {/* HEADER */}
          <div 
            className="flex-shrink-0"
            style={{ 
              borderBottom: '2px solid #E5E7EB',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
            }}
          >
            <Header
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              table={table}
              excellReport={excellReport}
              filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
              resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
              tableModes={tableModes}
              type={type}
            />
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block">
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight, borderLeft: '8px solid #1D3D79', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>

                {/* THEAD - Multi-color gradient inspired by all cards */}
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map(group => (
                    <Fragment key={group.id}>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        {group.headers.map(header => (
                          <th
                            key={header.id}
                            className="px-2 py-2 uppercase"
                            style={{
                              color: '#183d79',
                              minWidth: header.column.id === 'select' ? '50px' : '60px',
                              maxWidth: header.column.id === 'select' ? '50px' : 'none',
                              fontSize: 'clamp(10px, 1.0vw, 13px)',
                              letterSpacing: '0.05em',
                              textAlign: 'center',
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>

                      {/* Filter Row */}
                      {filterOn && (
                        <tr style={{ backgroundColor: '#FFFFFF' }}>
                          {group.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-2 py-1.5"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderBottom: '2px solid #E5E7EB',
                                minWidth: header.column.id === 'select' ? '50px' : '90px',
                                maxWidth: header.column.id === 'select' ? '50px' : 'none',
                              }}
                            >
                              {header.column.getCanFilter() && (
                                <Filter
                                  column={header.column}
                                  table={table}
                                  filterOn={filterOn}
                                />
                              )}
                            </th>
                          ))}
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </thead>

                {/* TBODY - Professional rows with card-inspired hover */}
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <Fragment key={row.id}>
                      <tr
                        onClick={() => row.getCanExpand() && row.toggleExpanded()}
                        tabIndex={0}
                        className="cursor-pointer"
                      >
                        {row.getVisibleCells().map((cell) => {
                          const isCompleted = cell.column.id === 'completed';
                          const isStatus = cell.column.id === 'status' && cell.getValue();
                          let bg = undefined;
                          if (isCompleted) bg = cell.getValue() ? '#00bf63' : '#ff3131';
                          if (isStatus) {
                            if (cell.getValue() === 'Completed') bg = '#00bf63';
                            else if (cell.getValue() === 'Incompleted') bg = '#ff3131';
                          }

                          return (
                            <td
                              key={cell.id}
                              className={`px-2 py-2 transition-colors duration-150 group/cell relative cell-hover-effect`}
                              style={{
                                color: bg ? '#FFFFFF' : '#1F2937',
                                backgroundColor: bg || undefined,
                                minWidth: cell.column.id === 'select' ? '50px' : '60px',
                                maxWidth: cell.column.id === 'select' ? '50px' : '110px',
                                fontSize: 'clamp(11px, 1.0vw, 13px)',
                                fontWeight: '400',
                                zIndex: 1,
                                willChange: 'background-color, color',
                                padding: bg ? '6px' : undefined,
                              }}
                            >
                              {isCompleted ? (
                                <div className="w-full flex items-center justify-center">
                                  <span className="text-[11px] font-normal text-white">{cell.getValue() ? 'Completed' : 'Incompleted'}</span>
                                </div>
                              ) : isStatus ? (
                                <div className="w-full flex items-center justify-center">
                                  <span className="text-[11px] font-normal" style={{ color: bg ? '#FFFFFF' : undefined }}>{cell.getValue()}</span>
                                </div>
                              ) : (
                                <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border rounded-xl border-transparent transition-all duration-200  ease-in-out hover:bg-[#f9f9f9] hover:text-[#545454] hover:shadow-[inset_0_0_0_1px_#d1d1d1] fade-in">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext()) || '\u00A0'}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>

                      {/* Expanded SubRows */}
                      {row.getIsExpanded() && row.subRows && row.subRows.length > 0 && (
                        <tr style={{ backgroundColor: '#FAFAFA' }}>
                          <td colSpan={row.getVisibleCells().length} className="p-0">
                            <div className="p-4">
                              <table className="w-full">
                                <tbody>
                                  {row.subRows.map(sub => (
                                    <tr key={sub.id} style={{ borderBottom: '1px solid #E5E7EB' }} className="last:border-b-0">
                                      {sub.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-2 py-2" style={{ fontSize: 'clamp(10px, 0.9vw, 12px)' }}>
                                          <div className="px-2 py-1 text-[11px] font-normal flex items-center justify-center min-w-[70px] text-center whitespace-nowrap border border-transparent transition-all duration-200 ease-in-out hover:bg-[#f9f9f9] hover:text-[#545454] hover:shadow-[inset_0_0_0_1px_#d1d1d1]">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext()) || '\u00A0'}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {/* EMPTY STATE */}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={columnsWithSelection.length}
                        className="py-24 text-center"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <div 
                            className="w-24 h-24 mb-5 rounded-full flex items-center justify-center shadow-lg"
                            style={{ 
                              background: 'linear-gradient(135deg, #6366F1, #A855F7)',
                            }}
                          >
                            <svg 
                              className="w-12 h-12" 
                              style={{ color: '#FFFFFF' }}
                              fill="none" 
                              viewBox="0 0 24 24" 
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <p 
                            className="font-normal mb-2" 
                            style={{ 
                              color: '#1F2937',
                              fontSize: 'clamp(12px, 1.0vw, 14px)' 
                            }}
                          >
                            {getTtl('No data available', ln)}
                          </p>
                          <p 
                            style={{ 
                              color: '#6B7280',
                              fontSize: 'clamp(10px, 0.9vw, 12px)' 
                            }}
                          >
                            Try adjusting your filters or date range
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>
          </div>

          {/* MOBILE VIEW - Card Layout */}
          <div className="block md:hidden">
            <div 
              className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
              style={{ maxHeight: dynamicMaxHeight }}
            >
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  onClick={() => row.getCanExpand() && row.toggleExpanded()}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  {/* Card Header - Multi-gradient */}
                  <div 
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366F1, #9333EA, #0D9488)',
                    }}
                  >
                    <span 
                      className="font-normal"
                      style={{ 
                        color: '#FFFFFF',
                        fontSize: 'clamp(9px, 0.8vw, 10px)',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
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
                        style={{ accentColor: '#FFFFFF' }}
                      />
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-2.5">
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === 'select') return null;
                      
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
                            {flexRender(cell.column.columnDef.cell, cell.getContext()) || '\u00A0'}
                          </div>
                        </div>
                      );
                    })}

                    {/* Expanded SubRows in Mobile */}
                    {row.getIsExpanded() && row.subRows && row.subRows.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '2px solid #E5E7EB' }}>
                        {row.subRows.map((sub, subIdx) => (
                          <div key={sub.id} className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                            <div 
                              className="font-normal mb-2" 
                              style={{ 
                                color: '#6366F1',
                                fontSize: 'clamp(7px, 0.7vw, 8px)',
                                fontWeight: '600'
                              }}
                            >
                              Sub-item {subIdx + 1}
                            </div>
                            {sub.getVisibleCells().map(cell => {
                              if (cell.column.id === 'select') return null;
                              return (
                                <div key={cell.id} className="flex justify-between items-center py-1 min-h-[32px]">
                                  <span 
                                    className="font-normal uppercase pr-2"
                                    style={{ 
                                      color: '#6B7280',
                                      fontSize: 'clamp(6px, 0.6vw, 7px)' 
                                    }}
                                  >
                                    {cell.column.columnDef.header}
                                  </span>
                                  <span 
                                    className="truncate"
                                    style={{ 
                                      fontSize: 'clamp(7px, 0.7vw, 9px)',
                                      color: '#1F2937'
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext()) || '\u00A0'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty state for mobile */}
              {table.getRowModel().rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 px-3">
                  <div 
                    className="w-24 h-24 mb-5 rounded-full flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366F1, #A855F7)',
                    }}
                  >
                    <svg 
                      className="w-12 h-12" 
                      style={{ color: '#FFFFFF' }}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p 
                    className="font-normal mb-2 text-center" 
                    style={{ 
                      color: '#1F2937',
                      fontSize: 'clamp(9px, 0.8vw, 10px)' 
                    }}
                  >
                    {getTtl('No data available', ln)}
                  </p>
                  <p 
                    className="text-center" 
                    style={{ 
                      color: '#6B7280',
                      fontSize: 'clamp(7px, 0.6vw, 9px)' 
                    }}
                  >
                    Try adjusting your filters or date range
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* FOOTER - Professional Style */}
          <div 
            className="flex-shrink-0"
            style={{ 
              borderTop: '2px solid #E5E7EB',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2">
              <div className="flex items-center">
                <Paginator table={table} />
              </div>
              <div className="flex items-center gap-4">
                <div 
                  className="whitespace-nowrap font-normal" 
                  style={{ 
                    color: '#6B7280',
                    fontSize: 'clamp(7px, 0.6vw, 9px)' 
                  }}
                >
                  {`${
                    table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                    (table.getFilteredRowModel().rows.length ? 1 : 0)
                  } - ${
                    table.getRowModel().rows.length + table.getState().pagination.pageIndex * table.getState().pagination.pageSize
                  } ${getTtl('of', ln)} ${table.getFilteredRowModel().rows.length}`}
                </div>
                <RowsIndicator table={table} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Customtable