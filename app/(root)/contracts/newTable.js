
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
import { TbSortDescending, TbSortAscending } from "react-icons/tb";
import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import Image from "next/image";

import { SettingsContext } from "../../../contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";

import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "../../../components/table/filters/filterFunc";
import Tltip from "../../../components/tlTip";

const EMPTY_STATE_VIDEO_SRC = '/logo/no-data.mp4';

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
  const { ln, settings } = useContext(SettingsContext);

  const globalFilterFn = useMemo(() => (row, columnId, filterValue) => {
    const search = String(filterValue ?? '').toLowerCase();
    const val = row.getValue(columnId);
    if (columnId === 'supplier' || columnId === 'originSupplier') {
      const name = (settings?.Supplier?.Supplier ?? []).find(s => s.id === val)?.nname || '';
      return name.toLowerCase().includes(search);
    }
    return String(val ?? '').toLowerCase().includes(search);
  }, [settings]);

  const [quickSumEnabled, setQuickSumEnabled] = useState(false);
  const [quickSumColumns, setQuickSumColumns] = useState([]);
  const [showSelectionDropdown, setShowSelectionDropdown] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false)
  const [rowSelection, setRowSelection] = useState({});

  const [columnFilters, setColumnFilters] = useState([])
  const [sorting, setSorting] = useState([])
  const [isEmptyStateVideoError, setIsEmptyStateVideoError] = useState(false)

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
            style={{ accentColor: '#dbeeff' }}
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
            style={{ accentColor: '#dbeeff' }}
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
        .dashboard-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .dashboard-scroll::-webkit-scrollbar-track { background: #f1f5fb; }
        .dashboard-scroll::-webkit-scrollbar-thumb { background: #b8d4ee; border-radius: 4px; }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { background: #7aaed6; }

        .glass-table { background: #ffffff; }

        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: var(--font-poppins), 'Poppins', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        .custom-table th {
          border: 1px solid #d8e8f5;
          background-color: #dbeeff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
          font-size: 0.78rem !important;
          font-weight: 600 !important;
          color: var(--chathams-blue) !important;
        }

        .custom-table td {
          border: 1px solid #d8e8f5;
          background-color: #ffffff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
          font-size: 0.68rem !important;
        }

        tr.selected-row td {
          background-color: #b8ddf8 !important;
        }
      `}</style>

      <div className="custom-table">
        <div className="relative flex flex-col rounded-2xl glass-table">
          {/* Border overlay — renders above children so corners always visible */}
          <div className="absolute inset-0 rounded-2xl border border-[#b8ddf8] pointer-events-none z-[15]" />

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

                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map(hdGroup => (
                    <Fragment key={hdGroup.id}>
                      <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="font-poppins responsiveTextTable font-medium py-2"
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
                            {header.column.getIsSorted() === 'asc' && <TbSortAscending className="shrink-0" style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                            {header.column.getIsSorted() === 'desc' && <TbSortDescending className="shrink-0" style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                          </span>
                        </th>
                        ))}
                      </tr>

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
                        const isCustomCell = cell.column.id === 'invoiceStatus';
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
                                  className="px-3 py-1 rounded-xl responsiveTextTable font-normal"
                                  style={{
                                    backgroundColor: value ? '#dcfce7' : '#fce7f3',
                                    color: value ? '#166534' : '#be185d',
                                    border: `1px solid ${value ? '#bbf7d0' : '#fbcfe8'}`
                                  }}
                                >
                                  {value ? 'Completed' : 'Incompleted'}
                                </div>
                              </div>
                            ) : isStatus ? (
                              <div className="flex justify-center">
                                <div
                                  className="px-3 py-1 rounded-xl responsiveTextTable font-normal"
                                  style={{
                                    backgroundColor:
                                      value === 'Paid'
                                        ? '#dcfce7'
                                        : value === 'Unpaid'
                                        ? '#fef9c3'
                                        : '#f8fbff',
                                    border: value ? `1px solid ${value === 'Paid' ? '#bbf7d0' : value === 'Unpaid' ? '#fde68a' : '#cecece'}` : 'none',
                                    color: value === 'Paid' ? '#166534' : value === 'Unpaid' ? '#92400e' : 'var(--port-gore)'
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
                                    const bg = isUSD ? '#dcfce7' : isEUR ? '#dbeeff' : '#e5e7eb';
                                    const border = isUSD ? '1px solid #bbf7d0' : isEUR ? '1px solid #b8ddf8' : '1px solid #d1d5db';
                                    const color = isUSD ? '#166534' : 'var(--chathams-blue)';

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
                                    className="px-3 py-1 rounded-xl responsiveTextTable font-normal min-w-[70px]"
                                    style={{
                                      backgroundColor: '#f8fbff',
                                      border: '1px solid #d8e8f5',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '160px',
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="px-3 py-1 rounded-xl responsiveTextTable font-normal w-full" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>&nbsp;</div>
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
                          <p className="responsiveText font-normal mb-2" style={{ color: 'var(--port-gore)' }}>
                            {getTtl('No data available', ln)}
                          </p>
                          <p className="responsiveText" style={{ color: 'var(--regent-gray)' }}>
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

          {/* MOBILE VIEW */}
          <div className="block md:hidden">
            <div className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2" style={{ maxHeight: dynamicMaxHeight }}>
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  onClick={() => SelectRow(row.original)}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: highlightId === row.original.id ? '2px solid var(--endeavour)' : '1px solid #d8e8f5',
                    boxShadow: highlightId === row.original.id ? '0 4px 16px rgba(3,102,174,0.15)' : '0 2px 8px rgba(3,102,174,0.06)'
                  }}
                >
                  <div 
                    className="px-3 py-2 flex items-center justify-between bg-[#dbeeff]"
                    // style={{ 
                    //   background: 'linear-gradient(135deg, #6366F1, #9333EA, #0D9488)',
                    // }}
                  >
                    <span
                      className="responsiveTextTable font-medium"
                      style={{ color: 'var(--chathams-blue)' }}
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
                  <div className="p-4 space-y-2.5">
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === 'select') return null;
                      return (
                        <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <div className="uppercase tracking-wider font-medium responsiveTextTable" style={{ color: 'var(--regent-gray)' }}>
                            {cell.column.columnDef.header}
                          </div>
                          <div className="responsiveTextTable font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center"
                            style={{ color: 'var(--port-gore)', backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>
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
                  {renderEmptyStateMedia()}
                  <p className="responsiveText font-normal mb-2 text-center" style={{ color: 'var(--port-gore)' }}>
                    {getTtl('No data available', ln)}
                  </p>
                  <p className="responsiveText text-center" style={{ color: 'var(--regent-gray)' }}>
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
                  className="responsiveText font-medium"
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
};
export default Customtable;