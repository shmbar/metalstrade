
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
  excellReport
}) => {
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState(invisible)
  const [filterOn, setFilterOn] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState(null)

  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25
  })

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const pathName = usePathname()
  const { ln } = useContext(SettingsContext);

  const [quickSumEnabled, setQuickSumEnabled] = useState(false);
  const [quickSumColumns, setQuickSumColumns] = useState([]);
  const [showSelectionDropdown, setShowSelectionDropdown] = useState(false);

  const [isEditMode, setIsEditMode] = useState(false)
  const [rowSelection, setRowSelection] = useState({});

  const [columnFilters, setColumnFilters] = useState([])
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
    state: {
      globalFilter,
      columnVisibility,
      pagination,
      columnFilters,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');

        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { 
          background: linear-gradient(180deg, #F8F8F8, #F0F0F0); 
          border-radius: 6px; 
        }
        .dashboard-scroll::-webkit-scrollbar-thumb { 
          background: linear-gradient(180deg, #E0E0E0, #CCCCCC); 
          border-radius: 6px; 
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(180deg, #CCCCCC, #B0B0B0);
        }

        .glass-table {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.85) 0%, 
            rgba(250, 250, 250, 0.90) 50%,
            rgba(255, 255, 255, 0.85) 100%
          );
        }

        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: var(--font-poppins), 'Plus Jakarta Sans', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        .custom-table th {
          border: 1px solid #d8e8f5;
          background-color: #f8fbff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
          font-size: 11px !important;
        }

        .custom-table td {
          border: 1px solid #d8e8f5;
          background-color: #f8fbff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
          font-size: 10px !important;
        }

        .custom-table th {
          background-color: #dbeeff;
        }

        .custom-table td {
          background-color: #fff;
          border: 1px solid #e0e0e0;
        }

        tr.selected-row td {
          background-color: #b8ddf8 !important;
        }
      `}</style>

      <div className="custom-table">
        <div className="flex flex-col rounded-2xl glass-table"
          style={{
            border: '1px solid #b8ddf8',
            overflow: 'hidden',
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
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
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
              className="overflow-auto dashboard-scroll rounded-3xl border border-[#d8e8f5]"
              style={{
                maxHeight: dynamicMaxHeight,
                borderRadius: '24px'
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
                          className="font-poppins text-xs font-medium py-2"
                          style={{
                            color: 'var(--chathams-blue)',
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
                                  className="px-3 py-1 rounded-xl text-[11px] font-normal"
                                  style={{
                                    backgroundColor: value ? '#dcfce7' : '#fee2e2',
                                    color: value ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${value ? '#bbf7d0' : '#fecaca'}`
                                  }}
                                >
                                  {value ? 'Completed' : 'Incompleted'}
                                </div>
                              </div>
                            ) : isStatus ? (
                              <div className="flex justify-center">
                                <div
                                  className="px-3 py-1 rounded-xl text-[11px] font-normal"
                                  style={{
                                    backgroundColor:
                                      value === 'Paid'
                                        ? '#ede9fe'
                                        : value === 'Unpaid'
                                        ? '#fce7f3'
                                        : '#f8fbff',
                                    border: value ? `1px solid ${value === 'Paid' ? '#ddd6fe' : value === 'Unpaid' ? '#fbcfe8' : '#cecece'}` : 'none',
                                    color: value === 'Paid' ? '#7c3aed' : value === 'Unpaid' ? '#be185d' : '#1F2937'
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
                                    const bg = isUSD ? '#c2e2bb' : isEUR ? '#d4eafc' : '#e5e7eb';

                                    return (
                                      <span
                                        className="rounded-full text-[11px] font-medium"
                                        style={{
                                          backgroundColor: bg,
                                          color: 'var(--chathams-blue)',
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
                                  <Tltip direction="top" tltpText={typeof value === 'string' || typeof value === 'number' ? String(value) : undefined}>
                                    <div
                                      className="px-3 py-1 rounded-xl text-[11px] font-normal min-w-[70px]"
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
                                  </Tltip>
                                ) : (
                                  <div className="px-3 py-1 rounded-xl text-[11px] font-normal w-full" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>&nbsp;</div>
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
                          <p className="font-normal mb-2" style={{ color: '#1F2937', fontSize: 'clamp(12px, 1.0vw, 14px)' }}>
                            {getTtl('No data available', ln)}
                          </p>
                          <p style={{ color: '#6B7280', fontSize: 'clamp(10px, 0.9vw, 12px)' }}>
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
                    border: highlightId === row.original.id ? '2px solid #F97316' : '1px solid #E5E7EB',
                    boxShadow: highlightId === row.original.id ? '0 12px 28px rgba(249, 115, 22, 0.2)' : '0 4px 12px rgba(0, 0, 0, 0.06)'
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
                  <div className="p-4 space-y-2.5">
                    {row.getVisibleCells().map((cell) => {
                      if (cell.column.id === 'select') return null;
                      return (
                        <div key={cell.id} className="flex flex-col space-y-1.5 pb-2.5 last:pb-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <div className="uppercase tracking-wider font-normal" style={{ color: '#6B7280', fontSize: 'clamp(6px, 0.6vw, 7px)' }}>
                            {cell.column.columnDef.header}
                          </div>
                          <div className="font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                            style={{ color: '#1F2937', background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)', fontSize: 'clamp(8px, 0.7vw, 10px)', border: '1px solid #E5E7EB' }}>
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
                  <p className="font-normal mb-2 text-center" style={{ color: '#1F2937', fontSize: 'clamp(9px, 0.8vw, 10px)' }}>
                    {getTtl('No data available', ln)}
                  </p>
                  <p className="text-center" style={{ color: '#6B7280', fontSize: 'clamp(7px, 0.6vw, 9px)' }}>
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
};
export default Customtable;