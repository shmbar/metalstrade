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
    useReactTable
} from "@tanstack/react-table";

import { Fragment, useEffect, useMemo, useState, useContext } from "react";
import { TbSortDescending, TbSortAscending } from "react-icons/tb";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { Filter } from "../../../components/table/filters/filterFunc";
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';

const EMPTY_STATE_VIDEO_SRC = '/logo/no-data.mp4';

const Customtable = ({
    data,
    columns,
    invisible,
    SelectRow,
    excellReport,
    setFilteredData
}) => {

    const { ln } = useContext(SettingsContext)

    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)
    const [filterOn, setFilterOn] = useState(false)
    const [columnFilters, setColumnFilters] = useState([])
    const [rowSelection, setRowSelection] = useState({})
    const [isEmptyStateVideoError, setIsEmptyStateVideoError] = useState(false)

    const [{ pageIndex, pageSize }, setPagination] = useState({
        pageIndex: 0,
        pageSize: 25
    })

    const pagination = useMemo(
        () => ({ pageIndex, pageSize }),
        [pageIndex, pageSize]
    )

    const [quickSumEnabled, setQuickSumEnabled] = useState(false)
    const [quickSumColumns, setQuickSumColumns] = useState([])

    const renderEmptyStateMedia = () => {
      if (!isEmptyStateVideoError) {
        return (
          <video className="w-24 h-24 mb-5 rounded-2xl object-cover" autoPlay loop muted playsInline onError={() => setIsEmptyStateVideoError(true)}>
            <source src={EMPTY_STATE_VIDEO_SRC} type="video/mp4" />
          </video>
        );
      }
      return <div className="w-24 h-24 mb-5" />;
    }

    /* SELECTION COLUMN */
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
        filterFns: { dateBetweenFilterFn },
        state: {
            globalFilter,
            columnVisibility,
            pagination,
            columnFilters,
            rowSelection
        },
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection
    })

    useEffect(() => {
        table.resetColumnFilters()
    }, [])

    useEffect(() => {
        setFilteredData(
            table.getFilteredRowModel().rows.map(r => r.original)
        )
    }, [columnFilters, globalFilter])

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

                /* Professional gradient scrollbar matching cards */
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
                    transition-property: color, background-color, border-color, box-shadow !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                /* Add border, background, and text alignment styles for table cells */
                .custom-table th{
                    border: 1px solid #e8f0f8;
                    background-color: #dbeeff;
                    text-align: center;
                    vertical-align: middle;
                    padding: 6px;
                    font-size: 11px !important;
                }
                .custom-table td {
                    border: 1px solid #e8f0f8;
                    background-color: #fff;
                    text-align: center;
                    vertical-align: middle;
                    padding: 6px;
                    font-size: 10px !important;
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
                        />
                    </div>

                    {/* DESKTOP */}
<div className="hidden md:block">
  <div
    className="overflow-auto dashboard-scroll rounded-3xl border border-[#cecece]"
    style={{
      maxHeight: dynamicMaxHeight,
      borderLeft: '8px solid var(--chathams-blue)',
      borderRadius: '24px'
    }}
  >
                    {/* Total $ row - outside table to avoid table CSS */}
                    {(() => {
                        const cols = table.getVisibleLeafColumns();
                        const colCount = cols.length;
                        const usdTotal = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'us' || o.cur === 'USD') ? s + (o.total * 1 || 0) : s; }, 0);
                        const usdWeight = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'us' || o.cur === 'USD') ? s + (o.qnty * 1 || 0) : s; }, 0);
                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, backgroundColor: '#b7d1b5', padding: '6px 8px', color: '#1a3a1a', fontWeight: 600, fontSize: '10px' }}>
                                {cols.map((col, i) => (
                                    <span key={col.id} style={{ textAlign: i === 0 ? 'left' : 'center', paddingLeft: i === 0 ? '8px' : 0 }}>
                                        {i === 0 ? 'Total $:' : col.id === 'qnty' ? (usdWeight % 1 === 0 ? usdWeight : usdWeight.toFixed(2)) : col.id === 'total' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(usdTotal) : ''}
                                    </span>
                                ))}
                            </div>
                        );
                    })()}
                    {/* Total € row - outside table to avoid table CSS */}
                    {(() => {
                        const cols = table.getVisibleLeafColumns();
                        const colCount = cols.length;
                        const eurTotal = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'eu' || o.cur === 'EUR') ? s + (o.total * 1 || 0) : s; }, 0);
                        const eurWeight = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'eu' || o.cur === 'EUR') ? s + (o.qnty * 1 || 0) : s; }, 0);
                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colCount}, 1fr)`, backgroundColor: '#8db6d8', padding: '6px 8px', color: 'var(--chathams-blue)', fontWeight: 600, fontSize: '10px' }}>
                                {cols.map((col, i) => (
                                    <span key={col.id} style={{ textAlign: i === 0 ? 'left' : 'center', paddingLeft: i === 0 ? '8px' : 0 }}>
                                        {i === 0 ? 'Total €:' : col.id === 'qnty' ? (eurWeight % 1 === 0 ? eurWeight : eurWeight.toFixed(2)) : col.id === 'total' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(eurTotal) : ''}
                                    </span>
                                ))}
                            </div>
                        );
                    })()}
                        <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight }}>
                            <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>

                                {/* THEAD */}
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
                                                            backgroundColor: '#dbeeff',
                                                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                                                            maxWidth: header.column.id === 'select' ? '50px' : 'none',
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
                                                            className="px-2 py-1.5 font-bold text-xs font-poppins"
                                                            style={{
                                                                backgroundColor: '#FFFFFF',
                                                                borderBottom: '2px solid #E5E7EB',
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
                                        </Fragment>
                                    ))}
                                </thead>

                                {/* TBODY - Professional rows with card-inspired hover */}
                              <tbody>
  {table.getRowModel().rows.map((row) => (
    <tr
      key={row.id}
      onDoubleClick={() => SelectRow(row.original)}
      tabIndex={0}
      className="cursor-pointer"
    >
      {row.getVisibleCells().map((cell) => {
        const value = cell.getValue();
        const hasValue =
          value !== null &&
          value !== undefined &&
          value !== '';

        const isCompleted = cell.column.id === 'completed';
        const isStatus = cell.column.id === 'status';

        return (
          <td
            key={cell.id}
            className="px-2 py-2 text-center"
            style={{
              minWidth: cell.column.id === 'select' ? '50px' : '60px',
              maxWidth: cell.column.id === 'select' ? '50px' : '150px',
            }}
          >
            {isCompleted ? (
              <div className="flex justify-center">
                <div
                  className="px-3 py-1.5 rounded-xl text-[11px] font-normal"
                  style={{
                    backgroundColor: value ? '#00bf63' : '#eb3636',
                    color: '#FFFFFF',
                    border: '1px solid #cecece'
                  }}
                >
                  {value ? 'Completed' : 'Incompleted'}
                </div>
              </div>
            ) : isStatus ? (
              <div className="flex justify-center">
                <div
                  className="px-3 py-1.5 rounded-xl text-[11px] font-normal"
                  style={{
                    backgroundColor:
                      value === 'Paid'
                        ? '#ceb8ff'
                        : value === 'Unpaid'
                        ? '#c387b4'
                        : '#f9f9f9',
                    border: value ? '1px solid #cecece' : 'none',
                    color: '#1F2937'
                  }}
                >
                  {value || '\u00A0'}
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                {hasValue ? (
                  <div
                    className="px-3 py-1.5 rounded-xl text-[11px] font-normal min-w-[70px]"
                    style={{
                      backgroundColor:
                        value === 'Paid'
                          ? '#ceb8ff'
                          : value === 'Not Paid'
                          ? '#c387b4'
                          : '#f9f9f9',
                      border: '1px solid #cecece',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#6B7280]">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  ))}

  {table.getRowModel().rows.length === 0 && (
    <tr>
      <td colSpan={columnsWithSelection.length} className="py-24 text-center">
        <div className="flex flex-col items-center justify-center">
          {renderEmptyStateMedia()}
          <p 
            className="font-normal mb-2" 
            style={{ 
              color: '#1F2937',
              fontSize: 'clamp(9px, 0.8vw, 10px)' 
            }}
          >
            {getTtl('No data available', ln)}
          </p>
          <p 
            style={{ 
              color: '#6B7280',
              fontSize: 'clamp(7px, 0.6vw, 9px)' 
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
                                    onDoubleClick={() => SelectRow(row.original)}
                                    className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E7EB',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                                    }}
                                >
                                    {/* Card Header - Multi-gradient */}
                                    <div 
                                        className="px-3 py-2 flex items-center justify-between bg-[#9ad4ff]"
                                        // style={{ 
                                        //     background: 'linear-gradient(135deg, #6366F1, #9333EA, #0D9488)',
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
  className="flex-shrink-0"
  style={{
    borderTop: '2px solid #E5E7EB',
    background: '#FFFFFF'
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