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
} from "@tanstack/react-table";

import { Fragment, useEffect, useMemo, useState } from "react";
import { TbSortDescending, TbSortAscending } from "react-icons/tb";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { getTtl } from "../../../utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc';
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
  type,
  ln,
  setFilteredArray1
}) => {

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState(invisible);
  const [filterOn, setFilterOn] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [columnFilters, setColumnFilters] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  const [quickSumEnabled, setQuickSumEnabled] = useState(false);
  const [quickSumColumns, setQuickSumColumns] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  /* SELECTION COLUMN */
  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns;
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
              style={{ accentColor: 'var(--violet-text)' }}
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
            style={{ accentColor: 'var(--border-divider)' }}
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
    ];
  }, [columns, quickSumEnabled]);

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    enableRowSelection: quickSumEnabled,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    filterFns: { dateBetweenFilterFn },
    globalFilterFn: labelAwareGlobalFilter,
    state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
  });

  useEffect(() => {
    // Optional callback — callers like SharedStock render this table without it,
    // and calling it unguarded white-screened the whole /stocks page.
    setFilteredArray1?.(table.getFilteredRowModel().rows.map(r => r.original));
  }, [globalFilter, columnFilters]);

  const resetTable = () => table.resetColumnFilters();

  const currentRows = table.getRowModel().rows.length;
  const dynamicMaxHeight = currentRows > 0
    ? `${Math.min(currentRows * 40 + 180, 700)}px`
    : '320px';

  return (
    <div className="w-full">
      <style jsx global>{`
        /* Import Poppins and set table font */

        /* Professional gradient scrollbar matching cards */
        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { 
          background: linear-gradient(180deg, var(--surface-base), var(--surface-muted)); 
          border-radius: 6px; 
        }
        .dashboard-scroll::-webkit-scrollbar-thumb { 
          background: linear-gradient(180deg, var(--border-neutral), var(--border-neutral-strong)); 
          border-radius: 6px; 
          border: 2px solid var(--surface-base);
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(180deg, var(--border-neutral-strong), var(--text-faint));
          border-color: var(--surface-muted);
        }

        /* Glassmorphic professional table */
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(var(--surface-card-rgb),0.85) 0%, 
            rgba(var(--surface-base-rgb),0.90) 50%,
            rgba(var(--surface-card-rgb),0.85) 100%
          );
        }

        /* Use Poppins for the table and limit transitions to non-transform properties
           to avoid any hover vibration (no transform transitions allowed). */
        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: var(--font-poppins), 'Poppins', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        /* Add border, background, and text alignment styles for table cells */
        .custom-table th {
          border: 1px solid var(--border-cell);
          background-color: var(--surface-pill);
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
        }
          .custom-table td {
            font-size: var(--fs-table);   /* dense-cell rung; was a hardcoded 9px */
          border: 1px solid var(--border-cell);
          background-color: var(--surface-pill);
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;

        }


        .custom-table th {
          background-color: var(--border-cell);
        }

        .custom-table td {
          font-size: var(--fs-table);   /* dense-cell rung; was a hardcoded 9px */
          background-color: var(--surface-card);
          border: 1px solid var(--border-neutral);
        }
      `}</style>

      <div className="custom-table">
        <div className="flex flex-col rounded-2xl glass-table overflow-hidden"
          style={{
            border: '1px solid var(--border-divider)',
          }}
        >

          {/* HEADER */}
          <div
            className="flex-shrink-0"
            style={{
              borderBottom: '1px solid var(--border-divider)',
              background: 'var(--surface-card)',
            }}
          >
            <Header
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              table={table}
              excellReport={typeof excellReport === 'function' ? excellReport(columnVisibility) : excellReport}
              cb={cb}
              type={type}
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
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight }}>
<table className="w-full" style={{ tableLayout: 'auto' }}>
                {/* THEAD - Multi-color gradient inspired by all cards */}
                <thead className="sticky top-0 z-sticky">
                  {table.getHeaderGroups().map(group => (
                    <Fragment key={group.id}>
                      <tr style={{ borderBottom: '1px solid rgba(var(--surface-card-rgb), 0.2)' }}>
                        {group.headers.map(header => (
                          <th
                            key={header.id}
                            className="px-2 py-2 responsiveTextTable font-poppins font-medium"
                            style={{
                              color: 'var(--chathams-blue)',
                              width: header.column.id === 'select' ? '50px' : undefined,
                              letterSpacing: '0.05em',
                              textAlign: 'center',
                              cursor: header.column.getCanSort() ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === 'asc' && <TbSortAscending style={{ fontSize: 'var(--fs-title)', color: 'var(--endeavour)' }} />}
                              {header.column.getIsSorted() === 'desc' && <TbSortDescending style={{ fontSize: 'var(--fs-title)', color: 'var(--endeavour)' }} />}
                            </div>
                          </th>
                        ))}
                      </tr>

                      {/* Filter Row */}
                      {filterOn && (
                        <tr style={{ backgroundColor: 'var(--surface-card)' }}>
                          {group.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-2 py-1.5"
                              style={{
                                backgroundColor: 'var(--surface-card)',
                                borderBottom: '2px solid var(--border-divider)',
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
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      onDoubleClick={() => SelectRow(row.original)}
                      tabIndex={0}
                      className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ' cursor-pointer'}`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isCompleted = cell.column.id === 'completed';
                        const isStatus = cell.column.id === 'status' && cell.getValue();
                        let bg = undefined;
                        if (isCompleted) bg = cell.getValue() ? 'var(--ok-bg)' : 'var(--danger-bg)';
                        if (isStatus) {
                          if (cell.getValue() === 'Completed') bg = 'var(--ok-bg)';
                          else if (cell.getValue() === 'Incompleted') bg = 'var(--danger-bg)';
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`px-2 py-2 transition-colors duration-150 group/cell relative cell-hover-effect responsiveTextTable`}
                            style={{
                              color: 'var(--port-gore)',
                              width: cell.column.id === 'select' ? '50px' : undefined,
                              maxWidth: cell.column.id === 'select' ? '50px' : undefined,
                              fontWeight: '400',
                              zIndex: 1,
                            }}
                          >
                            {cell.column.id === 'select' ? (
                              <div className="w-full flex items-center justify-center">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ) : isCompleted ? (
                              <div className="w-full flex items-center justify-center">
                                <span className="px-3 py-1 rounded-2xl responsiveTextTable font-normal" style={{ backgroundColor: cell.getValue() ? 'var(--ok-bg)' : 'var(--danger-bg)', color: cell.getValue() ? 'var(--ok-text)' : 'var(--danger-text)', border: `1px solid ${cell.getValue() ? 'var(--ok-border)' : 'var(--danger-border)'}` }}>{cell.getValue() ? 'Completed' : 'Incompleted'}</span>
                              </div>
                            ) : isStatus ? (
                              <div className="w-full flex items-center justify-center">
                                <span className="px-3 py-1 rounded-2xl responsiveTextTable font-normal" style={{ backgroundColor: bg || undefined, color: bg === 'var(--ok-bg)' ? 'var(--ok-text)' : bg === 'var(--danger-bg)' ? 'var(--danger-text)' : undefined }}>{cell.getValue()}</span>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {cell.getValue() !== null && cell.getValue() !== undefined && cell.getValue() !== '' ? (
                                  <div
                                    className="p-1.5 rounded-2xl responsiveTextTable font-normal min-w-[70px]"
                                    style={{
                                      backgroundColor: 'var(--surface-pill)',
                                      border: '1px solid var(--border-cell)',
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="p-1.5 rounded-2xl responsiveTextTable font-normal min-w-[70px]" style={{ backgroundColor: 'var(--surface-pill)', border: '1px solid var(--border-cell)' }}>&nbsp;</div>
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
                          <video
                            className="w-24 h-24 mb-5 rounded-2xl object-cover"
                            autoPlay
                            loop
                            muted
                            playsInline
                          >
                            <source src="/logo/no-data.mp4" type="video/mp4" />
                          </video>
                          <p
                            className="font-normal mb-2 responsiveText"
                            style={{
                              color: 'var(--port-gore)',
                            }}
                          >
                            {getTtl('No data available', ln)}
                          </p>
                          <p
                            className="responsiveTextTable"
                            style={{
                              color: 'var(--regent-gray)',
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
                  onDoubleClick={() => SelectRow(row.original)}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border-divider)',
                    boxShadow: '0 4px 12px rgba(var(--shadow-rgb), 0.06)'
                  }}
                >
                  {/* Card Header - Multi-gradient */}
                  <div 
                    className="px-3 py-2 flex items-center justify-between bg-[var(--border-divider)]"
                    // style={{ 
                    //   background: 'linear-gradient(135deg, var(--violet-text), var(--violet-text), #0D9488)',
                    // }}
                  >
                    <span 
                      className="font-normal"
                      style={{ 
                        color: 'var(--endeavour)',
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

                  {/* Card Content */}
                  <div className="p-4 space-y-2.5">
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === 'select') return null;
                      
                      return (
                        <div 
                          key={cell.id} 
                          className="flex flex-col space-y-1.5 pb-2.5 last:pb-0"
                          style={{ borderBottom: '1px solid var(--border-divider)' }}
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
                            className="font-normal break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" 
                            style={{ 
                              color: 'var(--port-gore)',
                              background: 'linear-gradient(135deg, var(--surface-base), var(--surface-muted))',
                              fontSize: 'var(--fs-table)',
                              border: '1px solid var(--border-divider)'
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
                  <div 
                    className="w-24 h-24 mb-5 rounded-full flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, var(--violet-text), var(--violet-text))',
                    }}
                  >
                    <svg 
                      className="w-12 h-12" 
                      style={{ color: 'var(--on-brand)' }}
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
                      color: 'var(--port-gore)',
                      fontSize: 'var(--fs-table)'
                    }}
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

          {/* FOOTER - Professional Style */}
<div
  className="flex-shrink-0 rounded-b-2xl"
  style={{
    borderTop: '1px solid var(--border-divider)',
    background: 'var(--surface-card)',
  }}
>
  <div className="w-full px-4 py-3">
    <div className="flex items-center justify-between">

      {/* LEFT — Showing Range */}
      <div
        className="whitespace-nowrap font-normal responsiveTextTable"
        style={{
          color: 'var(--regent-gray)',
        }}
      >
        {`${
          table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
          (table.getFilteredRowModel().rows.length ? 1 : 0)
        }—${
          table.getRowModel().rows.length +
          table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize
        } ${getTtl('of', ln)} ${
          table.getFilteredRowModel().rows.length
        }`}
      </div>

      {/* CENTER — Pagination */}
      <div className="flex justify-center">
        <Paginator table={table} />
      </div>

      {/* RIGHT — Rows Dropdown */}
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
};

export default Customtable;