// 'use client'
// Fade-in animation for badges
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(style);
}

import Header from "../../../components/table/header";
import SortIcon from "@components/table/SortIcon";
import EmptyState from "../../../components/EmptyState";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable
} from "@tanstack/react-table";

import { Fragment, useEffect, useMemo, useState, useContext } from "react";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";
import { Filter } from "../../../components/table/filters/filterFunc";
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
    setFilteredData
}) => {

    const { ln } = useContext(SettingsContext)

    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)
    const [filterOn, setFilterOn] = useState(false)
    const [selectedRowId, setSelectedRowId] = useState(null)
    const [columnFilters, setColumnFilters] = useState([])
    const [sorting, setSorting] = useState([])
    const [rowSelection, setRowSelection] = useState({})

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

    /* SELECTION COLUMN */
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
        data,
        columns: columnsWithSelection,
        enableRowSelection: quickSumEnabled,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        filterFns: { dateBetweenFilterFn },
        globalFilterFn: labelAwareGlobalFilter,
        state: {
            globalFilter,
            columnVisibility,
            pagination,
            columnFilters,
            rowSelection,
            sorting,
        },
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
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
            <style>{`
                /* Table font */

                /* Professional gradient scrollbar matching cards */

                /* Glassmorphic professional table */
                .glass-table {
                    background: linear-gradient(135deg,
                        rgba(var(--surface-card-rgb),0.85) 0%,
                        rgba(var(--surface-base-rgb),0.90) 50%,
                        rgba(var(--surface-card-rgb),0.85) 100%
                    );
                }

                /* Set the table font and limit transitions to non-transform properties
                   to avoid any hover vibration (no transform transitions allowed). */
                .custom-table, .custom-table *, .glass-table, .glass-table * {
                    font-family: inherit;
                    transition-property: color, background-color, border-color, box-shadow !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                /* .custom-table th/td now live in globals.css — one definition
                   for every table in the app. */

                /* Two summary bands. They were a saturated --ok-border green and a
                   --line-strong blue, which is the "green that doesn't match" the
                   client flagged — a green band on a totals row does not mean
                   "good", it just means "this row is a summary".
                   Both are now quiet fills; they stay tellable apart by tint plus a
                   semibold label, not by hue strength. Contrast measured: 8.2:1 and
                   11:1 respectively. */
                .summary-green-si {
                    background-color: var(--ok-bg);
                    color: var(--ok-strong);
                    font-weight: 500;
                }
                .summary-green-si th {
                    background-color: var(--ok-bg) !important;
                    color: var(--ok-strong) !important;
                    border: none !important;
                }

                .summary-blue-si {
                    background-color: var(--bg-sunken);
                    color: var(--ink);
                    font-weight: 500;
                }
                .summary-blue-si th {
                    background-color: var(--bg-sunken) !important;
                    color: var(--ink) !important;
                    border: none !important;
                }
            `}</style>


            <div className="custom-table">
                <div className="relative flex flex-col rounded-2xl glass-table">
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
  <div
    className="overflow-auto dashboard-scroll"
    style={{
      maxHeight: dynamicMaxHeight,
    }}
  >
                        <div className="overflow-x-auto dashboard-scroll">
                            <table className="w-full custom-table" style={{ tableLayout: 'auto', borderCollapse: 'separate', borderSpacing: 0 }}>

                                {/* THEAD */}
                                <thead className="sticky top-0 z-sticky">
                                    {table.getHeaderGroups().map(group => (
                                        <Fragment key={group.id}>
                                            {/* Total $ row */}
                                            {(() => {
                                                const usdTotal = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'us' || o.cur === 'USD') ? s + (o.total * 1 || 0) : s; }, 0);
                                                const usdWeight = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'us' || o.cur === 'USD') ? s + (o.qnty * 1 || 0) : s; }, 0);
                                                return (
                                                    <tr className="summary-green-si">
                                                        {group.headers.map(header => (
                                                            <th key={header.id} style={{ padding: '6px 8px', borderRight: '1px solid rgba(var(--shadow-rgb), 0.08)' }}>
                                                                {header.id === 'compName' ? 'Total $:' :
                                                                    header.id === 'qnty' ? (usdWeight % 1 === 0 ? usdWeight : usdWeight.toFixed(2)) :
                                                                        header.id === 'total' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(usdTotal) : ''}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                );
                                            })()}

                                            {/* Total € row */}
                                            {(() => {
                                                const eurTotal = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'eu' || o.cur === 'EUR') ? s + (o.total * 1 || 0) : s; }, 0);
                                                const eurWeight = table.getFilteredRowModel().rows.reduce((s, r) => { const o = r.original; return (o.cur === 'eu' || o.cur === 'EUR') ? s + (o.qnty * 1 || 0) : s; }, 0);
                                                return (
                                                    <tr className="summary-blue-si">
                                                        {group.headers.map(header => (
                                                            <th key={header.id} style={{ padding: '6px 8px', borderRight: '1px solid rgba(var(--shadow-rgb), 0.08)' }}>
                                                                {header.id === 'compName' ? 'Total EUR:' :
                                                                    header.id === 'qnty' ? (eurWeight % 1 === 0 ? eurWeight : eurWeight.toFixed(2)) :
                                                                        header.id === 'total' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(eurTotal) : ''}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                );
                                            })()}

                                            <tr style={{ borderBottom: '1px solid rgba(var(--surface-card-rgb), 0.2)' }}>
                                                {group.headers.map(header => (
                                                    <th
                                                        key={header.id}
                                                        /* Band comes from .custom-table th — see
                                                           globals.css. This header had drifted to
                                                           full ink and 0.05em tracking. */
                                                        style={{
                                                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                                                            maxWidth: header.column.id === 'select' ? '50px' : 'none',
                                                            cursor: header.column.getCanSort() ? 'pointer' : 'default',
                                                            userSelect: 'none',
                                                        }}
                                                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                            <SortIcon column={header.column} />
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
                                                            className="px-2 py-1.5 font-medium responsiveTextInput font-sans"
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
                                        </Fragment>
                                    ))}
                                </thead>

                                {/* TBODY - Professional rows with card-inspired hover */}
                              <tbody>
  {table.getRowModel().rows.map((row) => (
    <tr
      key={row.id}
      onClick={() => setSelectedRowId(row.id)}
      onDoubleClick={() => SelectRow(row.original)}
      tabIndex={0}
      className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ' cursor-pointer'}`}
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
              whiteSpace: 'nowrap',
            }}
          >
            {isCompleted ? (
              <div className="flex justify-center">
                <div
                  className="px-2.5 py-0.5 rounded-lg responsiveTextTable font-medium"
                  style={{
                    backgroundColor: value ? 'var(--ok-bg)' : 'var(--bad-bg)',
                    color: value ? 'var(--ok-text)' : 'var(--bad-text)',
                    border: `1px solid ${value ? 'var(--ok-border)' : 'var(--bad-border)'}`
                  }}
                >
                  {value ? 'Completed' : 'Incompleted'}
                </div>
              </div>
            ) : isStatus ? (
              <div className="flex justify-center">
                <div
                  className="px-2.5 py-0.5 rounded-lg responsiveTextTable font-medium"
                  style={{
                    backgroundColor:
                      value === 'Paid'
                        ? 'var(--ok-bg)'
                        : value === 'Unpaid'
                        ? 'var(--warn-bg)'
                        : 'var(--bg-subtle)',
                    border: value ? `1px solid ${value === 'Paid' ? 'var(--ok-border)' : value === 'Unpaid' ? 'var(--warn-border)' : 'var(--line-strong)'}` : 'none',
                    color: value === 'Paid' ? 'var(--ok-text)' : value === 'Unpaid' ? 'var(--warn-text)' : 'var(--port-gore)'
                  }}
                >
                  {value || '\u00A0'}
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                {hasValue ? (
                  value === 'Paid' || value === 'Not Paid' ? (
                    <div
                      className="px-2.5 py-0.5 rounded-lg responsiveTextTable font-medium min-w-[70px]"
                      style={{
                        backgroundColor: value === 'Paid' ? 'var(--ok-bg)' : 'var(--warn-bg)',
                        border: `1px solid ${value === 'Paid' ? 'var(--ok-border)' : 'var(--warn-border)'}`,
                        color: value === 'Paid' ? 'var(--ok-text)' : 'var(--warn-text)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ) : (
                    <div className="px-1 py-0.5 responsiveTextTable font-medium min-w-[70px]" style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  )
                ) : (
                  <div className="p-1 responsiveTextTable font-medium min-w-[70px]">&nbsp;</div>
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
        <EmptyState message={getTtl('No data available', ln)} hint="Try adjusting your filters or date range" />
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
                                        backgroundColor: "var(--bg-card)",
                                        border: '1px solid var(--line)',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}
                                >
                                    {/* Card Header - Multi-gradient */}
                                    <div
                                        className="px-3 py-2 flex items-center justify-between bg-[var(--bg-subtle)]"
                                        // style={{
                                        //     background: 'linear-gradient(135deg, #7A6FE3, #7A6FE3, #0E9888)',
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
                                                        className="responsiveTextTable font-medium break-words px-1 py-1 leading-relaxed min-h-7 flex items-center" style={{ color: 'var(--ink)' }}
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
                                                                        <p
                                        className="font-normal mb-2 text-center"
                                        style={{ color: 'var(--port-gore)' }}
                                    >
                                        {getTtl('No data available', ln)}
                                    </p>
                                    <p
                                        className="text-center"
                                        style={{ color: 'var(--regent-gray)', fontSize: 'var(--fs-caption)' }}
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
    borderTop: '1px solid var(--line)',
    background: "var(--bg-card)",
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
