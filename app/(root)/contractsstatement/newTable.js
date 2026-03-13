
'use client'
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

const EMPTY_STATE_VIDEO_SRC = '/logo/no-data.mp4';

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
  const [isEmptyStateVideoError, setIsEmptyStateVideoError] = useState(false)

  usePathname()

  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns

    return [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center w-full h-full">
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
          </div>
        ),
       cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-full">
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

  const renderEmptyStateMedia = () => {
    if (!isEmptyStateVideoError) {
      return (
        <video
          className="w-24 h-24 mb-5 rounded-2xl object-cover"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setIsEmptyStateVideoError(true)}
        >
          <source src={EMPTY_STATE_VIDEO_SRC} type="video/mp4" />
        </video>
      );
    }

    return <div className="w-24 h-24 mb-5" />;
  }

  return (
    <div className="w-full">
     <style jsx global>{`
        /* Import Poppins and set table font */
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

 /* Professional gradient scrollbar matching cards */
     .dashboard-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dashboard-scroll::-webkit-scrollbar-track {
          background: #ebf2fc;
          border-radius: 6px;
        }
        .dashboard-scroll::-webkit-scrollbar-thumb {
          background: #9fb8d4;
          border-radius: 6px;
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover {
          background: #0366ae;
        }


        /* Glassmorphic professional table */
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.85) 0%, 
            rgba(250, 250, 250, 0.90) 50%,
            rgba(255, 255, 255, 0.85) 100%
          );
        }

        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        .custom-table th {
          border: 1px solid #ccc;
          background-color: #f9f9f9;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
          font-size: 11px !important;
        }

        .custom-table td {
          border: 1px solid #ccc;
          background-color: #f9f9f9;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
          font-size: 10px !important;
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
        <div className="flex flex-col rounded-2xl glass-table"
          style={{
            border: '1px solid #b8ddf8',
          }}
        >

          {/* HEADER */}
          <div
            className="flex-shrink-0 rounded-t-2xl"
            style={{
              borderBottom: '1px solid #b8ddf8',
              background: '#ffffff',
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
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight, borderLeft: '8px solid var(--chathams-blue)', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>

                {/* THEAD - Multi-color gradient inspired by all cards */}
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map(group => (
                    <Fragment key={group.id}>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        {group.headers.map(header => (
                          <th
                            key={header.id}
                            className="font-poppins text-xs"
                            style={{
                              color: 'var(--chathams-blue)',
                              minWidth: header.column.id === 'select' ? '50px' : header.column.id === 'expander' ? '80px' : '60px',
                              maxWidth: header.column.id === 'select' ? '50px' : header.column.id === 'expander' ? '80px' : 'none',
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
                                minWidth: header.column.id === 'select' ? '50px' : '60px',
                                maxWidth: header.column.id === 'select' ? '50px' : '150px',
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
                        tabIndex={0}
                        className="cursor-pointer transition-colors hover-row"
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (cell.column.id === 'expander') {
                            return (
                              <td key={cell.id} className="px-2 py-0.5 text-center" style={{ whiteSpace: 'nowrap', minWidth: '60px', maxWidth: 'none' }}>
                                <div className="flex justify-center">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </td>
                            )
                          }
                          if (cell.column.id === 'select') {
                            return (
                              <td key={cell.id} className="px-2 py-0.5 text-center" style={{ whiteSpace: 'nowrap', minWidth: '50px', maxWidth: '50px' }}>
                                <div className="flex justify-center">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </td>
                            )
                          }
                          const isCompleted = cell.column.id === 'completed';
                          const isStatus = cell.column.id === 'status';

                        return (
                          <td
                            key={cell.id}
                            className="px-2 py-2 text-center"
                            style={{
                              minWidth: cell.column.id === 'select' ? '50px' : '60px',
                              maxWidth: cell.column.id === 'select' ? '50px' : 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isCompleted ? (
                              <div className="flex justify-center">
                                <div
                                  className="px-3 py-1 rounded-xl text-[11px] font-normal flex items-center justify-center"
                                  style={{
                                    backgroundColor: cell.getValue() ? '#dcfce7' : '#fee2e2',
                                    color: cell.getValue() ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${cell.getValue() ? '#bbf7d0' : '#fecaca'}`
                                  }}
                                >
                                  {cell.getValue() ? 'Completed' : 'Incompleted'}
                                </div>
                              </div>
                            ) : isStatus ? (
                              <div className="flex justify-center">
                                <div
                                  className="px-3 py-1 rounded-xl text-[11px] font-normal flex items-center justify-center"
                                  style={{
                                    backgroundColor:
                                      cell.getValue() === 'Paid'
                                        ? '#ede9fe'
                                        : cell.getValue() === 'Unpaid'
                                        ? '#fce7f3'
                                        : '#f9f9f9',
                                    border: cell.getValue() ? `1px solid ${cell.getValue() === 'Paid' ? '#ddd6fe' : cell.getValue() === 'Unpaid' ? '#fbcfe8' : '#cecece'}` : 'none',
                                    color: cell.getValue() === 'Paid' ? '#7c3aed' : cell.getValue() === 'Unpaid' ? '#be185d' : '#1F2937'
                                  }}
                                >
                                  {cell.getValue() || '\u00A0'}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {cell.getValue() !== null && cell.getValue() !== undefined && cell.getValue() !== '' ? (
                                  <div
                                    className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px] flex items-center justify-center"
                                    style={{
                                      backgroundColor:
                                        cell.getValue() === 'Paid'
                                          ? '#ede9fe'
                                          : cell.getValue() === 'Not Paid'
                                          ? '#fce7f3'
                                          : '#f9f9f9',
                                      border: '1px solid #cecece',
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="px-3 py-1 rounded-xl text-[11px] font-normal w-full" style={{ backgroundColor: '#f9f9f9', border: '1px solid #cecece' }}>&nbsp;</div>
                                )}
                              </div>
                            )}
                          </td>
                        )
                        })}
                      </tr>

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
                          {renderEmptyStateMedia()}
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
                  <div 
                    className="px-3 py-2 flex items-center justify-between bg-[#9ad4ff]"
                    // style={{ 
                    //   background: 'linear-gradient(135deg, #6366F1, #9333EA, #0D9488)',
                    // }}
                  >
                    <span 
                      className="font-normal"
                      style={{ 
                        color: 'var(--endeavour)',
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
                          <div 
                            key={sub.id} 
                            className="mb-3 p-3 rounded-lg" 
                            style={{ 
                              backgroundColor: '#F9FAFB', 
                              border: '1px solid #E5E7EB',
                              borderLeft: '3px solid #6366F1'
                            }}
                          >
                            <div 
                              className="font-medium mb-2.5 pb-2" 
                              style={{ 
                                color: '#6366F1',
                                fontSize: 'clamp(9px, 0.9vw, 11px)',
                                fontWeight: '600',
                                borderBottom: '1px solid #E5E7EB'
                              }}
                            >
                              Sub-item {subIdx + 1}
                            </div>
                            <div className="space-y-2">
                              {sub.getVisibleCells().map(cell => {
                                if (cell.column.id === 'select') return null;
                                const value = cell.getValue();
                                const hasValue = value !== null && value !== undefined && value !== '';
                                
                                return (
                                  <div key={cell.id} className="flex justify-between items-center py-1.5 min-h-[32px]">
                                    <span 
                                      className="font-medium uppercase pr-3"
                                      style={{ 
                                        color: '#6B7280',
                                        fontSize: 'clamp(8px, 0.8vw, 9px)',
                                        letterSpacing: '0.05em'
                                      }}
                                    >
                                      {cell.column.columnDef.header}:
                                    </span>
                                    <span 
                                      className="truncate text-right px-2 py-1 rounded"
                                      style={{ 
                                        fontSize: 'clamp(9px, 0.9vw, 11px)',
                                        color: hasValue ? '#1F2937' : '#9CA3AF',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E7EB',
                                        fontWeight: '500',
                                        minWidth: '60px'
                                      }}
                                    >
                                      {hasValue ? flexRender(cell.column.columnDef.cell, cell.getContext()) : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
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
                  {renderEmptyStateMedia()}
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
            className="flex-shrink-0 rounded-b-2xl"
            style={{
              borderTop: '1px solid #b8ddf8',
              background: '#ffffff',
            }}
          >
            <div className="w-full px-6 py-4">
              <div className="flex items-center justify-between">

              {/* LEFT — COUNT */}
              <div
                className="text-sm font-medium"
                style={{ color: '#6B7280' }}
              >
                {`${
                  table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                  (table.getFilteredRowModel().rows.length ? 1 : 0)
                }–${
                  table.getRowModel().rows.length +
                  table.getState().pagination.pageIndex *
                  table.getState().pagination.pageSize
                } of ${table.getFilteredRowModel().rows.length}`}
              </div>

              {/* CENTER — PAGINATOR */}
              <div className="flex justify-center">
                <Paginator table={table} />
              </div>

              {/* RIGHT — ROWS */}
              <div className="flex justify-end">
                <RowsIndicator table={table} />
              </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Customtable