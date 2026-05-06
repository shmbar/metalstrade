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
  useReactTable
} from "@tanstack/react-table"

import { Fragment, useMemo, useState, useContext, useEffect } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";

import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";

import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "../../../components/table/filters/filterFunc";

const EMPTY_STATE_VIDEO_SRC = '/logo/no-data.mp4';

const Customtable = ({ data, columns, invisible, excellReport, onCellUpdate }) => {

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState(invisible)
  const [filterOn, setFilterOn] = useState(false)
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 })
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
  const { ln } = useContext(SettingsContext);

  const [columnFilters, setColumnFilters] = useState([])
  const [sorting, setSorting] = useState([])
  const [quickSumEnabled, setQuickSumEnabled] = useState(false)
  const [quickSumColumns, setQuickSumColumns] = useState([])
  const [rowSelection, setRowSelection] = useState({})
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEmptyStateVideoError, setIsEmptyStateVideoError] = useState(false)

  /* ---------- Selection Column ---------- */
  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns;

    const selectCol = {
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
            style={{ accentColor: '#BCE1FE' }}
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
    };

    return [selectCol, ...(columns || [])];
  }, [columns, quickSumEnabled]);

  /* ---------- TABLE ---------- */
  const table = useReactTable({
    meta: {
      isEditMode,
      updateData: (rowIndex, columnId, value) => {
        if (!isEditMode) return;
        onCellUpdate?.({ rowIndex, columnId, value });
      },
    },
    columns: columnsWithSelection,
    data,
    enableRowSelection: quickSumEnabled,
    getCoreRowModel: getCoreRowModel(),
    filterFns: { dateBetweenFilterFn },
    state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
  })

  const resetTable = () => table.resetColumnFilters()
  useEffect(() => resetTable(), [])

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

        /* Table background */
        .glass-table {
          background: #ffffff;
        }

        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: var(--font-poppins), 'Poppins', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        .custom-table th {
          background-color: #dbeeff;

          text-align: center;
          vertical-align: middle;
          padding: 8px 6px;
          border-bottom: 1px solid #b8ddf8;
          border-right: 1px solid #b8ddf8;
          font-size: 0.68rem !important;
        }

        .custom-table th:last-child {
          border-right: none;
        }

        .custom-table td {
          background-color: #fff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-bottom: 1px solid #e8f0f8;
          border-right: 1px solid #e8f0f8;
        }

        .custom-table td:last-child {
          border-right: none;
        }
      `}</style>

      <div className="custom-table">
        <div className="relative flex flex-col rounded-2xl">
          {/* Border overlay — renders above children so corners always visible */}
          <div className="absolute inset-0 rounded-2xl border border-[#b8ddf8] pointer-events-none z-[15]" />

          {/* HEADER */}
          <div
            className="flex-shrink-0 rounded-t-2xl"
            style={{
              borderBottom: '1px solid #b8ddf8',
              background: '#ffffff'
            }}
          >
            <Header
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              table={table}
              excellReport={excellReport}
              filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
              resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
            />
          </div>

          {/* DESKTOP */}
          <div className="hidden md:block flex-1">
            <div
              className="overflow-auto dashboard-scroll"
              style={{
                maxHeight: dynamicMaxHeight,
              }}
            >
              <div>
              <table className="w-full" style={{ tableLayout: 'auto' }}>

                {/* THEAD - Multi-color gradient inspired by all cards */}
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map(hdGroup => (
                    <Fragment key={hdGroup.id}>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        {hdGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className="font-poppins responsiveTextTable font-medium"
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                            style={{
                              color: 'var(--chathams-blue)',
                              minWidth: header.column.id === 'select' ? '50px' : '60px',
                              maxWidth: header.column.id === 'select' ? '50px' : 'none',
                              letterSpacing: '0.05em',
                              textAlign: 'center',
                              cursor: header.column.getCanSort() ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === 'asc'  && <TbSortAscending  style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                              {header.column.getIsSorted() === 'desc' && <TbSortDescending style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                            </span>
                          </th>
                        ))}
                      </tr>

                      {/* Filter Row */}
                      {filterOn && (
                        <tr style={{ backgroundColor: '#FFFFFF' }}>
                          {hdGroup.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-2 py-1.5"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderBottom: '2px solid #E5E7EB',
                                minWidth: header.column.id === 'select' ? '50px' : '90px',
                                maxWidth: header.column.id === 'select' ? '50px' : 'none',
                                zIndex: ['description', 'supplier', 'client'].includes(header.column.id) ? 100 : 50,
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
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className="cursor-pointer transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => {
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
                        const isStatus = cell.column.id === 'status' && cell.getValue();

                        // Badge config
                        let badgeConfig = null;
                        if (isCompleted) {
                          badgeConfig = cell.getValue()
                            ? { bg: '#dcfce7', color: '#16a34a', label: 'Completed' }
                            : { bg: '#fee2e2', color: '#dc2626', label: 'Incompleted' };
                        }
                        if (isStatus && cell.getValue()) {
                          if (cell.getValue() === 'Completed')
                            badgeConfig = { bg: '#dcfce7', color: '#16a34a', label: 'Completed' };
                          else if (cell.getValue() === 'Incompleted')
                            badgeConfig = { bg: '#fee2e2', color: '#dc2626', label: 'Incompleted' };
                          else if (cell.getValue() === 'Paid')
                            badgeConfig = { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Paid' };
                          else if (cell.getValue() === 'Unpaid')
                            badgeConfig = { bg: '#fef9c3', color: '#92400e', border: '#fde68a', label: 'Unpaid' };
                        }

                        return (
                          <td
                            key={cell.id}
                            className="px-1 py-1 text-center"
                            style={{
                              minWidth: cell.column.id === 'select' ? '50px' : '60px',
                              maxWidth: cell.column.id === 'select' ? '50px' : '150px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {(isCompleted || isStatus) && badgeConfig ? (
                              <div className="flex justify-center">
                                <div
                                  className="px-2 py-0.5 rounded-xl responsiveTextTable font-normal"
                                  style={{
                                    backgroundColor: badgeConfig.bg,
                                    color: badgeConfig.color,
                                    border: `1px solid ${badgeConfig.border || '#d8e8f5'}`
                                  }}
                                >
                                  {badgeConfig.label}
                                </div>
                              </div>
                            ) : (isCompleted || isStatus) && !badgeConfig ? (
                              <div className="flex justify-center">
                                <div className="responsiveTextTable text-[var(--regent-gray)]">
                                  {null}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {cell.getValue() !== null && cell.getValue() !== undefined && cell.getValue() !== '' ? (
                                  <div
                                    className="px-2 py-0.5 rounded-xl responsiveTextTable font-normal min-w-[50px]"
                                    style={{
                                      backgroundColor: '#f8fbff',
                                      border: '1px solid #d8e8f5',
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="px-2 py-0.5 rounded-xl responsiveTextTable font-normal w-full" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>&nbsp;</div>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
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
                            className="responsiveText font-normal mb-2"
                            style={{ color: 'var(--port-gore)' }}
                          >
                            {getTtl('No data available', ln)}
                          </p>
                          <p
                            className="responsiveTextTable"
                            style={{ color: 'var(--regent-gray)' }}
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
                        fontSize: '0.62rem',
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
                              color: 'var(--regent-gray)',
                              fontSize: '0.58rem'
                            }}
                          >
                            {cell.column.columnDef.header}
                          </div>
                          <div 
                            className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm" 
                            style={{
                              color: 'var(--port-gore)',
                              background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                              fontSize: '0.62rem',
                              border: '1px solid #E5E7EB'
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                    className="responsiveTextTable font-normal mb-2 text-center"
                    style={{ color: 'var(--port-gore)' }}
                  >
                    {getTtl('No data available', ln)}
                  </p>
                  <p
                    className="text-center"
                    style={{
                      color: 'var(--regent-gray)',
                      fontSize: '0.58rem'
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
              background: '#ffffff'
            }}
          >
            <div className="w-full px-6 py-4">
              <div className="flex items-center justify-between">

                {/* LEFT — COUNT */}
                <div
                  className="responsiveTextTable font-medium"
                  style={{ color: 'var(--regent-gray)' }}
                >
                  {`${
                    table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                    (table.getFilteredRowModel().rows.length ? 1 : 0)
                  }—${
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