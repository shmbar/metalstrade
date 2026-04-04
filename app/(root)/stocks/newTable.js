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
  const [columnFilters, setColumnFilters] = useState([{ id: 'sType', value: 'Warehouse' }]);
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
    state: { globalFilter, columnVisibility, pagination, columnFilters, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection
  });

  useEffect(() => {
    setFilteredArray1(table.getFilteredRowModel().rows.map(r => r.original));
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
        }

        /* Use Poppins for the table and limit transitions to non-transform properties
           to avoid any hover vibration (no transform transitions allowed). */
        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: var(--font-poppins), 'Plus Jakarta Sans', sans-serif;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }

        /* Add border, background, and text alignment styles for table cells */
        .custom-table th {
          border: 1px solid #d8e8f5;
          background-color: #f8fbff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
                              font-size: 12px !important;

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
                            className="px-2 py-2 text-xs font-poppins font-medium"
                            style={{
                              color: 'var(--chathams-blue)',
 width: header.column.id === 'select' ? '50px' : undefined,
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
                        if (isCompleted) bg = cell.getValue() ? '#dcfce7' : '#fee2e2';
                        if (isStatus) {
                          if (cell.getValue() === 'Completed') bg = '#dcfce7';
                          else if (cell.getValue() === 'Incompleted') bg = '#fee2e2';
                        }

                        return (
                          <td
                            key={cell.id}
                            className={`px-2 py-2 transition-colors duration-150 group/cell relative cell-hover-effect text-[11px]`}
                            style={{
                              color: '#1F2937',
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
                                <span className="px-3 py-1 rounded-xl text-[11px] font-normal" style={{ backgroundColor: cell.getValue() ? '#dcfce7' : '#fee2e2', color: cell.getValue() ? '#16a34a' : '#dc2626', border: `1px solid ${cell.getValue() ? '#bbf7d0' : '#fecaca'}` }}>{cell.getValue() ? 'Completed' : 'Incompleted'}</span>
                              </div>
                            ) : isStatus ? (
                              <div className="w-full flex items-center justify-center">
                                <span className="px-3 py-1 rounded-xl text-[11px] font-normal" style={{ backgroundColor: bg || undefined, color: bg === '#dcfce7' ? '#16a34a' : bg === '#fee2e2' ? '#dc2626' : undefined }}>{cell.getValue()}</span>
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                {cell.getValue() !== null && cell.getValue() !== undefined && cell.getValue() !== '' ? (
                                  <div
                                    className="p-1.5 rounded-xl text-[11px] font-normal min-w-[70px]"
                                    style={{
                                      backgroundColor: '#f8fbff',
                                      border: '1px solid #d8e8f5',
                                    }}
                                  >
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                  </div>
                                ) : (
                                  <div className="p-1.5 rounded-xl text-[11px] font-normal min-w-[70px]" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>&nbsp;</div>
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
                  </div>
                </div>
              ))}

              {/* Empty state for mobile */}
              {table.getRowModel().rows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 px-3">
                  <div 
                    className="w-24 h-24 mb-5 rounded-full flex items-center justify-center shadow-lg"
                    style={{ 
                      background: 'linear-gradient(135deg, #6366F1, #A855F7)',
                    }}
                  >
                    <svg 
                      className="w-12 h-12" 
                      style={{ color: '#FFFFFF' }}
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
  <div className="w-full px-4 py-3">
    <div className="flex items-center justify-between">

      {/* LEFT � Showing Range */}
      <div
        className="whitespace-nowrap font-normal"
        style={{
          color: '#6B7280',
          fontSize: 'clamp(10px, 0.8vw, 12px)'
        }}
      >
        {`${
          table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize +
          (table.getFilteredRowModel().rows.length ? 1 : 0)
        }�${
          table.getRowModel().rows.length +
          table.getState().pagination.pageIndex *
            table.getState().pagination.pageSize
        } ${getTtl('of', ln)} ${
          table.getFilteredRowModel().rows.length
        }`}
      </div>

      {/* CENTER � Pagination */}
      <div className="flex justify-center">
        <Paginator table={table} />
      </div>

      {/* RIGHT � Rows Dropdown */}
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