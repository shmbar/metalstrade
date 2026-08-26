'use client'
// Fade-in animation for badges
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(style);
}

import Header from "../../../components/table/header";
import SortIcon from "@components/table/SortIcon";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";

import { Fragment, useEffect, useMemo, useState } from "react";


import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { getTtl } from "../../../utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc';
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { labelAwareGlobalFilter } from '../../../components/table/filters/labelAwareGlobalFilter';
import EmptyState from '../../../components/EmptyState';
import { TONES } from '../../../components/statusUtils';
import { useTablePrefs, useTablePagination } from '@components/table/useTablePrefs';

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
  const [columnVisibility, setColumnVisibility] = useTablePrefs('columns', invisible, type)
  const [filterOn, setFilterOn] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [columnFilters, setColumnFilters] = useTablePrefs('filters', [], type)
  const [sorting, setSorting] = useTablePrefs('sorting', [], type)
  const [{ pageIndex, pageSize }, setPagination] = useTablePagination(50, type)

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
              style={{ accentColor: 'var(--brand)' }}
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
            style={{ accentColor: 'var(--brand)' }}
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
        /* Set the table font and limit transitions to non-transform properties
           to avoid any hover vibration (no transform transitions allowed). */
        .custom-table, .custom-table * {
          font-family: var(--font-jakarta), 'Plus Jakarta Sans', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        /* .custom-table th/td now live in globals.css — one definition for every
           table in the app. This file's copy additionally set border:none,
           which cancelled the :where() column dividers every other table in the
           app draws, so stocks was the one main table with no vertical rules.
           Dropping it is the point of the exercise: it now matches. */
      `}</style>

      <div className="custom-table">
        <div className="flex flex-col rounded-2xl bg-[var(--bg-card)] overflow-hidden"
          style={{
            border: '1px solid var(--line)',
          }}
        >

          {/* HEADER */}
          <div
            className="flex-shrink-0"
            style={{
              borderBottom: '1px solid var(--line)',
              background: "var(--bg-card)",
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
                      <tr style={{ borderBottom: '1px solid var(--line)' }}>
                        {group.headers.map(header => (
                          <th
                            key={header.id}
                            className="group/th"
                            /* Band comes from .custom-table th — see globals.css.
                               Colour was --ink-muted, a rung lighter than the
                               standard's --ink-secondary. */
                            /* meta.narrow = a column whose values have a bounded, tiny
                               maximum (a unit, a currency code). width:1% under
                               table-layout:auto shrinks it to the wider of its header and
                               its values instead of handing it an equal share of the row,
                               so the slack goes to the columns holding real text. */
                            style={{
                              width: header.column.id === 'select' ? '50px'
                                : header.column.columnDef.meta?.narrow ? '1%' : undefined,
                              whiteSpace: header.column.columnDef.meta?.narrow ? 'nowrap' : undefined,
                              cursor: header.column.getCanSort() ? 'pointer' : 'default',
                              userSelect: 'none',
                            }}
                            onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {/* `idle` IS this hover affordance — it was hand-rolled
                                  here next to the icon that already offers it, so the
                                  unsorted state rendered two 11px boxes' worth of
                                  layout and pushed the column title left of centre. */}
                              <SortIcon column={header.column} idle />
                            </div>
                          </th>
                        ))}
                      </tr>

                      {/* Filter Row */}
                      {filterOn && (
                        <tr style={{ backgroundColor: "var(--bg-card)" }}>
                          {group.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-2 py-1.5"
                              style={{
                                backgroundColor: "var(--bg-card)",
                                borderBottom: '1px solid var(--line)',
                                minWidth: header.column.id === 'select' ? '50px'
                                  : header.column.columnDef.meta?.narrow ? '64px' : '90px',
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
                        let tone = undefined;
                        if (isCompleted) tone = cell.getValue() ? TONES.green : TONES.red;
                        if (isStatus) {
                          if (cell.getValue() === 'Completed') tone = TONES.green;
                          else if (cell.getValue() === 'Incompleted') tone = TONES.red;
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`px-2 py-2 transition-colors duration-150 group/cell relative cell-hover-effect`}
                            style={{
                              color: 'var(--ink)',
                              width: cell.column.id === 'select' ? '50px'
                                : cell.column.columnDef.meta?.narrow ? '1%' : undefined,
                              maxWidth: cell.column.id === 'select' ? '50px' : undefined,
                              whiteSpace: cell.column.columnDef.meta?.narrow ? 'nowrap' : undefined,
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
                                <span className="px-3 py-1 rounded-lg font-normal" style={{ backgroundColor: tone.bg, color: tone.text, border: `1px solid ${tone.border}` }}>{cell.getValue() ? 'Completed' : 'Incompleted'}</span>
                              </div>
                            ) : isStatus ? (
                              <div className="w-full flex items-center justify-center">
                                <span className="px-3 py-1 rounded-lg font-normal" style={{ backgroundColor: tone?.bg, color: tone?.text, border: tone ? `1px solid ${tone.border}` : undefined }}>{cell.getValue()}</span>
                              </div>
                            ) : (
                              <div className="flex justify-center font-normal">
                                {cell.getValue() !== null && cell.getValue() !== undefined && cell.getValue() !== '' ? (
                                  flexRender(cell.column.columnDef.cell, cell.getContext())
                                ) : (
                                  ' '
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
                      <td colSpan={columnsWithSelection.length}>
                        <EmptyState
                          message={getTtl('No data available', ln)}
                          hint="Try adjusting your filters or date range"
                        />
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
                  className="rounded-2xl overflow-hidden shadow-card transition-colors duration-200"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: '1px solid var(--line)',
                  }}
                >
                  {/* Card Header */}
                  <div
                    className="px-3 py-2 flex items-center justify-between bg-[var(--bg-subtle)]"
                  >
                    <span
                      className="font-normal"
                      style={{
                        color: 'var(--ink)',
                        fontSize: 'var(--fs-table)',
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
                        style={{ accentColor: 'var(--brand)' }}
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
                          style={{ borderBottom: '1px solid var(--line)' }}
                        >
                          <div
                            className="font-semibold"
                            style={{
                              color: 'var(--ink-muted)',
                              fontSize: 'var(--fs-caption)'
                            }}
                          >
                            {cell.column.columnDef.header}
                          </div>
                          <div
                            className="font-normal break-words leading-relaxed min-h-7 flex items-center"
                            style={{
                              color: 'var(--ink)',
                              fontSize: 'var(--fs-table)',
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
                <EmptyState message="No stock data" hint="Try adjusting your filters or date range" />
              )}
            </div>
          </div>

          {/* FOOTER - Professional Style */}
<div
  className="flex-shrink-0 rounded-b-2xl"
  style={{
    borderTop: '1px solid var(--line)',
    background: "var(--bg-card)",
  }}
>
  <div className="w-full px-4 py-3">
    <div className="flex items-center justify-between">

      {/* LEFT — Showing Range */}
      <div
        className="whitespace-nowrap font-normal responsiveTextTable"
        style={{
          color: 'var(--ink-muted)',
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
