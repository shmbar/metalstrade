
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

import { Fragment, useEffect, useMemo, useState, useContext } from "react";
import { ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowUpDown } from "lucide-react";
import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import EmptyState from "../../../components/EmptyState";
import { TONES } from "../../../components/statusUtils";

import { SettingsContext } from "../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";

import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "../../../components/table/filters/filterFunc";
import { labelAwareGlobalFilter } from "../../../components/table/filters/labelAwareGlobalFilter";
import Tltip from "../../../components/tlTip";
import SortIcon from "@components/table/SortIcon";

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  setFilteredData,
  highlightId,
  onCellUpdate,
  excellReport,
  extraActions
}) => {
  const [globalFilter, setGlobalFilter] = useState('')
  const [filterOn, setFilterOn] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState(null)

  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25
  })

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const pathName = usePathname()

  const storageKey = `col-vis-${pathName}`
  const getInitialVisibility = () => {
    if (typeof window === 'undefined') return invisible
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return { ...invisible, ...JSON.parse(saved) }
    } catch {}
    return invisible
  }
  const [columnVisibility, setColumnVisibility] = useState(getInitialVisibility)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(columnVisibility)) } catch {}
  }, [columnVisibility, storageKey])
  const { ln } = useContext(SettingsContext);

  const globalFilterFn = labelAwareGlobalFilter;

  const [quickSumEnabled, setQuickSumEnabled] = useState(false);
  const [quickSumColumns, setQuickSumColumns] = useState([]);
  const [showSelectionDropdown, setShowSelectionDropdown] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false)
  const [rowSelection, setRowSelection] = useState({});

  const [columnFilters, setColumnFilters] = useState([])
  const [sorting, setSorting] = useState([])

  // ---------- Selection Column ----------
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
    };

    return [selectCol, ...(columns || [])];
  }, [columns, quickSumEnabled]);

  // ---------- TABLE ----------
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
    globalFilterFn,
    state: {
      globalFilter,
      columnVisibility,
      pagination,
      columnFilters,
      rowSelection,
      sorting,
    },
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

  useEffect(() => {
    setFilteredData(
      table.getFilteredRowModel().rows.map(x => x.original)
    )
  }, [columnFilters, globalFilter])

  const currentRows = table.getRowModel().rows.length;
  const dynamicMaxHeight = currentRows > 0
    ? `${Math.min(currentRows * 40 + 180, 700)}px`
    : '320px';


  return (
    <div className="w-full">
      <style jsx global>{`

        .glass-table { background: var(--bg-card); }

        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: inherit;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        /* .custom-table th/td now live in globals.css — one definition for every
           table in the app. This file's copy was the odd one out: it declared
           only background/border/align/padding and left font-size, transform,
           letter-spacing, colour and weight to inline styles on each <th>, so
           the "same" global rule meant something different here than on the
           other thirteen pages that defined it. */
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
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
              extraActions={extraActions}
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
              <div style={{ maxHeight: dynamicMaxHeight }}>
                <table className="w-full" style={{ tableLayout: 'auto' }}>

                <thead className="sticky top-0 z-sticky">
                  {table.getHeaderGroups().map(hdGroup => (
                    <Fragment key={hdGroup.id}>
                      <tr style={{ borderBottom: '1px solid var(--on-brand-soft)' }}>
                        {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="group/th"
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          /* Size, weight, uppercase, tracking, colour, padding and
                             alignment all come from `.custom-table th` in globals.css
                             — the same rule every other table in the app reads. Only
                             what is genuinely per-column stays inline. */
                          style={{
                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                            maxWidth: header.column.id === 'select' ? '50px' : 'none',
                            cursor: header.column.getCanSort() ? 'pointer' : 'default',
                            userSelect: 'none',
                          }}
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {/* idle: this <th> carries group/th, so the low-contrast
                                affordance for a sortable-but-unsorted column reveals
                                on hover. */}
                            <SortIcon column={header.column} idle />
                          </span>
                        </th>
                        ))}
                      </tr>

                      {filterOn && (
                        <tr style={{ backgroundColor: "var(--bg-card)" }}>
                          {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-2 py-1.5"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            borderBottom: '1px solid var(--line)',
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

                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      onDoubleClick={() => SelectRow(row.original)}
                      tabIndex={0}
                      className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ''}`}
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
                        const isCustomCell = cell.column.id === 'invoiceStatus' || cell.column.id === 'fnlzing';
                        const isCurrency = cell.column.id === 'cur';

                        return (
                          <td
                            key={cell.id}
                            className="px-2 py-0.5 text-center"
                            style={{
                              minWidth: cell.column.id === 'select' ? '50px' : '60px',
                              maxWidth: cell.column.id === 'select' ? '50px' : 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isCustomCell ? (
                              <div className="flex justify-center">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            ) : isCompleted ? (
                              <div className="flex justify-center">
                                <div
                                  className="px-2.5 py-0.5 rounded-lg responsiveTextTable font-medium"
                                  style={{
                                    backgroundColor: value ? TONES.green.bg : TONES.amber.bg,
                                    color: value ? TONES.green.text : TONES.amber.text,
                                    border: `1px solid ${value ? TONES.green.border : TONES.amber.border}`
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
                                        ? TONES.green.bg
                                        : value === 'Unpaid'
                                        ? TONES.amber.bg
                                        : 'transparent',
                                    border: value ? `1px solid ${value === 'Paid' ? TONES.green.border : value === 'Unpaid' ? TONES.amber.border : 'var(--line)'}` : 'none',
                                    color: value === 'Paid' ? TONES.green.text : value === 'Unpaid' ? TONES.amber.text : 'var(--ink)'
                                  }}
                                >
                                  {value || '\u00A0'}
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {isCurrency && hasValue ? (
                                  (() => {
                                    const val = String(value).trim();
                                    const isUSD = val === 'USD' || val === '$' || val.toLowerCase() === 'us';
                                    const isEUR = val === 'EUR' || val === '€' || val.toLowerCase() === 'eu';
                                    const symbol = isUSD ? '$' : isEUR ? '€' : val;
                                    const bg = isUSD ? TONES.green.bg : isEUR ? TONES.blue.bg : TONES.gray.bg;
                                    const border = `1px solid ${isUSD ? TONES.green.border : isEUR ? TONES.blue.border : TONES.gray.border}`;
                                    const color = isUSD ? TONES.green.text : isEUR ? TONES.blue.text : TONES.gray.text;

                                    return (
                                      <span
                                        className="rounded-full responsiveTextTable font-medium"
                                        style={{
                                          backgroundColor: bg,
                                          color: color,
                                          border: border,
                                          borderRadius: '999px',
                                          padding: '2px 12px',
                                          minWidth: '30px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {symbol}
                                      </span>
                                    );
                                  })()
                                ) : hasValue ? (
                                  <div
                                    className="px-1 py-1 responsiveTextTable min-w-[70px]"
                                    style={{
                                      color: 'var(--ink)',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '160px',
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="px-1 py-1 responsiveTextTable w-full">&nbsp;</div>
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
          </div>

          {/* MOBILE VIEW */}
          <div className="block md:hidden">
            <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2" style={{ maxHeight: dynamicMaxHeight }}>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  onClick={() => SelectRow(row.original)}
                  className="rounded-2xl overflow-hidden transition-colors duration-200"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: highlightId === row.original.id ? '2px solid var(--brand)' : '1px solid var(--line)',
                    boxShadow: highlightId === row.original.id ? 'var(--shadow-sm)' : 'var(--shadow-xs)'
                  }}
                >
                  <div
                    className="px-3 py-2 flex items-center justify-between bg-[var(--bg-subtle)]"
                  >
                    <span
                      className="responsiveTextTable font-medium"
                      style={{ color: 'var(--ink-secondary)' }}
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
                        <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0" style={{ borderBottom: '1px solid var(--line)' }}>
                          <div className="uppercase tracking-wider font-medium responsiveTextTable" style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-body)' }}>
                            {cell.column.columnDef.header}
                          </div>
                          <div className="responsiveTextTable break-words px-1 py-1 leading-relaxed min-h-7 flex items-center"
                            style={{ color: 'var(--ink)' }}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {table.getRowModel().rows.length === 0 && (
                <EmptyState
                  message={getTtl('No data available', ln)}
                  hint="Try adjusting your filters or date range"
                />
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
            <div className="w-full px-6 py-3">
              <div className="flex items-center justify-between">

                {/* LEFT — COUNT */}
                <div
                  className="responsiveText font-medium"
                  style={{ color: 'var(--ink-muted)' }}
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
};
export default Customtable;
