
'use client'
// Fade-in animation for badges
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`;
  document.head.appendChild(style);
}

import Header from "../../../components/table/header";
import EmptyState from "../../../components/EmptyState";
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
import { IoIosArrowDown } from "react-icons/io";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc'
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { labelAwareGlobalFilter } from '../../../components/table/filters/labelAwareGlobalFilter';


// Expandable detail for a contract line: warehouse lots + shipments
const DetailPanel = ({ lots = [], shipments = [] }) => {
  const fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(Number(n) || 0);
  const headSt = { border: 'none', textAlign: 'left', padding: '5px 12px', fontSize: 'var(--fs-caption)', background: 'var(--bg-subtle)', color: 'var(--regent-gray)', fontWeight: 500, letterSpacing: '0.04em' };
  const cellSt = { border: 'none', textAlign: 'left', padding: '5px 12px', fontSize: 'var(--fs-table)', color: 'var(--port-gore)', background: "var(--bg-card)" };
  const lotChip = (status) => {
    const s = (status || '').toLowerCase();
    const map = {
      sold: { bg: 'var(--ok-bg)', c: 'var(--ok-text)', b: 'var(--ok-border)', t: 'Sold' },
      unsold: { bg: 'var(--bad-bg)', c: 'var(--bad-text)', b: 'var(--bad-border)', t: 'Unsold' },
    };
    const v = map[s] || { bg: 'var(--neutral-bg)', c: 'var(--ink-secondary)', b: 'var(--neutral-border)', t: status || '—' };
    return <span style={{ backgroundColor: v.bg, color: v.c, border: `1px solid ${v.b}`, borderRadius: 8, padding: '1px 8px', fontSize: 'var(--fs-table)' }}>{v.t}</span>;
  };
  return (
    <div className="flex flex-col lg:flex-row gap-3" style={{ animation: 'fadeIn .2s ease-in' }}>
      {/* Lots */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line-strong)', flex: '1.4 1 0', minWidth: 0 }}>
        <div style={{ background: 'var(--bg-subtle)', color: 'var(--chathams-blue)', fontSize: 'var(--fs-table)', fontWeight: 600, padding: '5px 12px' }}>Lots in warehouse</div>
        {lots.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={headSt}>QUANTITY</th><th style={headSt}>STATUS</th><th style={headSt}>CONSIGNEE</th><th style={headSt}>SALES PO</th></tr></thead>
            <tbody>
              {lots.map((l, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={cellSt}>{fmt(l.qnty)} MT</td>
                  <td style={cellSt}>{lotChip(l.status)}</td>
                  <td style={cellSt}>{l.consignee || '—'}</td>
                  <td style={cellSt}>{l.salesPo || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: '8px 12px', fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>No lots in warehouse</div>}
      </div>
      {/* Shipments */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line-strong)', flex: '2 1 0', minWidth: 0 }}>
        <div style={{ background: 'var(--bg-subtle)', color: 'var(--chathams-blue)', fontSize: 'var(--fs-table)', fontWeight: 600, padding: '5px 12px' }}>Shipments</div>
        {shipments.length ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['INVOICE', 'CONSIGNEE', 'PO CLIENT', 'DESTINATION', 'QTY'].map(h => <th key={h} style={headSt}>{h}</th>)}</tr></thead>
            <tbody>
              {shipments.map((s, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={cellSt}>{s.invoice || '—'}</td>
                  <td style={cellSt}>{s.consignee || '—'}</td>
                  <td style={cellSt}>{s.po || '—'}</td>
                  <td style={cellSt}>{s.destination || '—'}</td>
                  <td style={cellSt}>{fmt(s.qnty)} MT</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: '8px 12px', fontSize: 'var(--fs-table)', color: 'var(--regent-gray)' }}>No shipments yet</div>}
      </div>
    </div>
  );
};

// Modern rounded checkbox (brand-blue when active) used for row selection + select-all.
const RowCheckbox = ({ checked = false, indeterminate = false, disabled = false, onChange }) => {
  const active = checked || indeterminate;
  return (
    <label
      className={`inline-flex items-center justify-center ${disabled ? 'opacity-40' : 'cursor-pointer'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input type="checkbox" className="sr-only" checked={checked} disabled={disabled} onChange={onChange} />
      <span
        className="flex items-center justify-center transition-all duration-150"
        style={{
          width: 16, height: 16, borderRadius: 5,
          border: `1px solid ${active ? 'var(--endeavour)' : 'var(--line-strong)'}`,
          background: active ? 'var(--endeavour)' : 'var(--bg-card)',
          boxShadow: active ? 'var(--shadow-xs)' : 'none',
        }}
      >
        {indeterminate ? (
          <span style={{ width: 8, height: 2, borderRadius: 1, background: "var(--bg-card)" }} />
        ) : checked ? (
          <svg viewBox="0 0 12 12" width="11" height="11" fill="none">
            <path d="M2.5 6.2l2.2 2.2 4.8-4.8" stroke="var(--on-brand)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
    </label>
  );
};

const Customtable = ({
  data,
  columns,
  invisible,
  excellReport,
  ln,
  setFilteredData,
  onSelectionChange,
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
  const [openLots, setOpenLots] = useState({})
  const [columnFilters, setColumnFilters] = useState([])
  const [sorting, setSorting] = useState([])

  const [quickSumEnabled, setQuickSumEnabled] = useState(false)
  const [quickSumColumns, setQuickSumColumns] = useState([])
  const [rowSelection, setRowSelection] = useState({})

  usePathname()

  // Selection checkbox column is always present so contracts can be ticked for Excel export
  // (it also feeds Quick Sum when that mode is on).
  const columnsWithSelection = useMemo(() => {
    return [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center w-full h-full">
            <RowCheckbox
              checked={table.getIsAllPageRowsSelected()}
              indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
              onChange={table.getToggleAllPageRowsSelectedHandler()}
            />
          </div>
        ),
       cell: ({ row }) => (
        <div className="flex items-center justify-center w-full h-full">
          <RowCheckbox
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
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
  }, [columns])

  const table = useReactTable({
    data,
    columns: columnsWithSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: row => row.subRows,
    filterFns: { dateBetweenFilterFn },
    globalFilterFn: labelAwareGlobalFilter,
    state: {
      globalFilter,
      columnVisibility,
      pagination,
      expanded,
      columnFilters,
      rowSelection,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
  })

  useEffect(() => {
    // flatRows includes the per-material sub-rows, not just the PO parent rows, so the Excel
    // export contains every line even while the PO groups are collapsed. (For the flat "Table
    // mode" there are no sub-rows, so flatRows === rows and behaviour is unchanged.)
    setFilteredData(
      table.getFilteredRowModel().flatRows.map(r => r.original)
    )
  }, [globalFilter, columnFilters])

  // Report ticked rows (incl. the per-material sub-rows of any selected PO) up for the Excel export.
  useEffect(() => {
    onSelectionChange?.(
      table.getSelectedRowModel().flatRows.map(r => r.original?.id).filter(Boolean)
    )
  }, [rowSelection])

  const resetTable = () => table.resetColumnFilters()

  const currentRows = table.getRowModel().rows.length;
  const dynamicMaxHeight = currentRows > 0
    ? `${Math.min(currentRows * 40 + 180, 700)}px`
    : '320px';


  return (
    <div className="w-full">
     <style jsx global>{`
        /* Table font */

 /* Professional gradient scrollbar matching cards */
     .dashboard-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .dashboard-scroll::-webkit-scrollbar-track {
          background: var(--bg-subtle);
          border-radius: 6px;
        }
        .dashboard-scroll::-webkit-scrollbar-thumb {
          background: var(--line-strong);
          border-radius: 6px;
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--brand);
        }


        /* Glassmorphic professional table */
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(var(--surface-card-rgb),0.85) 0%, 
            rgba(var(--surface-base-rgb),0.90) 50%,
            rgba(var(--surface-card-rgb),0.85) 100%
          );
        }

        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: inherit;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        .custom-table th {
          background-color: var(--bg-subtle);
          border-bottom: 1px solid var(--line);
          text-align: center;
          vertical-align: middle;
          padding: 4px 8px;
          font-size: var(--fs-table);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--ink-secondary);
          font-weight: 500;
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
              tableModes={tableModes}
              type={type}
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
                            className="font-sans responsiveTextTable font-medium"
                            style={{
                              color: 'var(--chathams-blue)',
                              minWidth: header.column.id === 'select' ? '42px' : header.column.id === 'expander' ? '52px' : '60px',
                              maxWidth: header.column.id === 'select' ? '42px' : header.column.id === 'expander' ? '52px' : 'none',
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
                        <tr style={{ backgroundColor: "var(--bg-card)" }}>
                          {group.headers.map(header => (
                            <th
                              key={header.id}
                              className="px-2 py-1.5"
                              style={{
                                backgroundColor: "var(--bg-card)",
                                borderBottom: '2px solid var(--line)',
                                minWidth: header.column.id === 'select' ? '50px' : header.column.columnDef.meta?.filterVariant === 'dates' ? '220px' : '60px',
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

                {/* TBODY */}
                <tbody>
                  {table.getRowModel().rows.map(row => {
                    // Sub-rows are shown in the inline detail panel — skip them here
                    if (row.depth > 0) return null;

                    return (
                    <Fragment key={row.id}>
                      <tr
                        tabIndex={0}
                        className="cursor-pointer transition-colors hover-row"
                        style={{ background: row.getIsSelected() ? 'var(--brand-soft)' : row.getIsExpanded() ? 'var(--bg-subtle)' : undefined }}
                      >
                        {row.getVisibleCells().map((cell) => {
                          if (cell.column.id === 'expander') {
                            return (
                              <td key={cell.id} className="px-2 py-0.5 text-center" style={{ whiteSpace: 'nowrap', minWidth: '50px', maxWidth: '50px' }}>
                                <div className="flex justify-center">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </td>
                            )
                          }
                          if (cell.column.id === 'select') {
                            return (
                              <td key={cell.id} className="px-2 py-0.5 text-center" style={{ whiteSpace: 'nowrap', minWidth: '42px', maxWidth: '42px', boxShadow: row.getIsSelected() ? 'inset 3px 0 0 var(--endeavour)' : undefined }}>
                                <div className="flex justify-center">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </td>
                            )
                          }
                          const isStatus = cell.column.id === 'status';
                          const val = cell.getValue();

                          return (
                            <td
                              key={cell.id}
                              className="px-2 py-2 text-center"
                              style={{ minWidth: '60px', whiteSpace: 'nowrap' }}
                            >
                              {isStatus ? (
                                <div className="flex justify-center">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  {val !== null && val !== undefined && val !== '' ? (
                                    <div className="px-1 py-1 responsiveTextTable font-medium min-w-[70px] flex items-center justify-center" style={{ color: 'var(--ink)' }}>
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </div>
                                  ) : (
                                    <div className="px-1 py-1 responsiveTextTable font-medium min-w-[70px]">&nbsp;</div>
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>

                      {/* ── Inline SubRows — aligned under parent columns ── */}
                      {row.getIsExpanded() && row.subRows && row.subRows.map((sub, si) => {
                        // Quantity (poWeight) is shown per material line on sub-rows; only the
                        // header/identity + PO-level totals stay parent-only.
                        const parentOnlyCols = ['date','order','supplier','shiipedWeight','remaining'];
                        const isOpen = !!openLots[sub.id];
                        const hasDetail = !!((sub.original.lots && sub.original.lots.length) || (sub.original.shipments && sub.original.shipments.length));
                        return (
                          <Fragment key={sub.id}>
                          <tr
                            style={{ background: isOpen ? 'var(--brand-soft)' : 'var(--bg-subtle)' }}
                            className={hasDetail ? 'cursor-pointer hover-row' : ''}
                            onClick={hasDetail ? () => setOpenLots(p => ({ ...p, [sub.id]: !p[sub.id] })) : undefined}
                          >
                            {sub.getVisibleCells().map((cell) => {
                              if (cell.column.id === 'expander') {
                                const isLast = si === row.subRows.length - 1;
                                return (
                                  <td key={cell.id} style={{ position: 'relative', whiteSpace: 'nowrap', minWidth: '52px', maxWidth: '52px', padding: 0 }}>
                                    <div style={{
                                      position: 'absolute',
                                      left: '50%',
                                      top: 0,
                                      bottom: isLast ? '50%' : 0,
                                      width: '1.5px',
                                      background: 'var(--line)',
                                    }} />
                                    <div style={{
                                      position: 'absolute',
                                      left: '50%',
                                      top: '50%',
                                      width: '14px',
                                      height: '1.5px',
                                      background: 'var(--line)',
                                    }} />
                                    <div style={{
                                      position: 'absolute',
                                      left: 'calc(50% + 12px)',
                                      top: '50%',
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      background: 'var(--endeavour)',
                                      transform: 'translate(-50%, -50%)',
                                      boxShadow: '0 0 0 2px var(--bg-subtle)',
                                    }} />
                                  </td>
                                )
                              }
                              if (cell.column.id === 'select') {
                                return <td key={cell.id} className="px-2 py-1" style={{ minWidth: '42px', maxWidth: '42px', boxShadow: row.getIsSelected() ? 'inset 3px 0 0 var(--endeavour)' : undefined }} />
                              }
                              if (parentOnlyCols.includes(cell.column.id)) {
                                return <td key={cell.id} className="px-2 py-1" style={{ minWidth: '60px' }} />
                              }
                              const isStatus = cell.column.id === 'status';
                              const isDesc = cell.column.id === 'description';
                              const val = cell.getValue();

                              if (isStatus) {
                                return (
                                  <td key={cell.id} className="px-2 py-1.5 text-center" style={{ minWidth: '60px', whiteSpace: 'nowrap' }}>
                                    <div className="flex justify-center">
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </div>
                                  </td>
                                )
                              }

                              if (isDesc) {
                                return (
                                  <td key={cell.id} className="px-2 py-1.5 text-center" style={{ minWidth: '60px', whiteSpace: 'nowrap' }}>
                                    <div className="flex items-center justify-center gap-1.5">
                                      {hasDetail && (
                                        <IoIosArrowDown size={11} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--endeavour)', flexShrink: 0 }} />
                                      )}
                                      <div className="px-1 py-1 responsiveTextTable font-medium min-w-[70px] flex items-center justify-center" style={{ color: 'var(--ink)' }}>
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                      </div>
                                    </div>
                                  </td>
                                )
                              }

                              return (
                                <td
                                  key={cell.id}
                                  className="px-2 py-1.5 text-center"
                                  style={{ minWidth: '60px', whiteSpace: 'nowrap' }}
                                >
                                  {isStatus ? (
                                    <div className="flex justify-center">
                                      <div
                                        className="px-1 py-1 responsiveTextTable font-medium flex items-center justify-center"
                                        style={{
                                          backgroundColor: val === 'Paid' ? 'var(--ok-bg)' : val === 'Unpaid' ? 'var(--warn-bg)' : 'transparent',
                                          border: val ? `1px solid ${val === 'Paid' ? 'var(--ok-border)' : val === 'Unpaid' ? 'var(--warn-border)' : 'transparent'}` : 'none',
                                          color: val === 'Paid' ? 'var(--ok-text)' : val === 'Unpaid' ? 'var(--warn-text)' : 'var(--port-gore)'
                                        }}
                                      >
                                        {val || ' '}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      {val !== null && val !== undefined && val !== '' ? (
                                        <div
                                          className="px-1 py-1 responsiveTextTable font-medium min-w-[70px] flex items-center justify-center"
                                          style={{ color: 'var(--ink)' }}
                                        >
                                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                      ) : (
                                        <div className="px-1 py-1 responsiveTextTable font-medium min-w-[70px]">&nbsp;</div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                          {isOpen && hasDetail && (
                            <tr style={{ background: 'var(--bg-subtle)' }}>
                              <td colSpan={sub.getVisibleCells().length} style={{ border: 'none', background: 'var(--bg-subtle)', padding: '6px 18px 14px' }}>
                                <DetailPanel lots={sub.original.lots} shipments={sub.original.shipments} />
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        )
                      })}
                    </Fragment>
                    );
                  })}
                  {/* EMPTY STATE */}
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
                    backgroundColor: "var(--bg-card)",
                    border: '1px solid var(--line)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div 
                    className="px-3 py-2 flex items-center justify-between bg-[var(--bg-subtle)]"
                    // style={{ 
                    //   background: 'linear-gradient(135deg, #7A6FE3, #7A6FE3, #0E9888)',
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

                    {/* Expanded SubRows in Mobile */}
                    {row.getIsExpanded() && row.subRows && row.subRows.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '2px solid var(--line)' }}>
                        {row.subRows.map((sub, subIdx) => (
                          <div 
                            key={sub.id} 
                            className="mb-3 p-3 rounded-lg" 
                            style={{ 
                              backgroundColor: 'var(--bg-subtle)', 
                              border: '1px solid var(--line)',
                              borderLeft: '3px solid var(--brand)'
                            }}
                          >
                            <div
                              className="responsiveTextTable font-medium mb-2.5 pb-2"
                              style={{
                                color: 'var(--endeavour)',
                                borderBottom: '1px solid var(--line)'
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
                                  <div key={cell.id} className="flex justify-between items-center py-1.5 min-h-8">
                                    <span
                                      className="responsiveTextTable font-medium uppercase pr-3"
                                      style={{
                                        color: 'var(--regent-gray)',
                                        letterSpacing: '0.05em'
                                      }}
                                    >
                                      {cell.column.columnDef.header}:
                                    </span>
                                    <span
                                      className="responsiveTextTable truncate text-right px-2 py-1 rounded"
                                      style={{
                                        color: hasValue ? 'var(--port-gore)' : 'var(--regent-gray)',
                                        backgroundColor: "var(--bg-card)",
                                        border: '1px solid var(--line)',
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
                                    <p
                    className="responsiveTextTable font-medium mb-2 text-center"
                    style={{
                      color: 'var(--port-gore)',
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
