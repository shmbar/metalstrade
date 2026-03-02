'use client';
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
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "../../../components/table/filters/filterFunc";

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

  const [{ pageIndex, pageSize }, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25
  })

  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])
  const { ln } = useContext(SettingsContext)

  const [quickSumEnabled, setQuickSumEnabled] = useState(false)
  const [quickSumColumns, setQuickSumColumns] = useState([])
  const [showSelectionDropdown, setShowSelectionDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false)
  const [rowSelection, setRowSelection] = useState({});
  const [columnFilters, setColumnFilters] = useState([])
  const [isEmptyStateVideoError, setIsEmptyStateVideoError] = useState(false)

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

  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns;

    const selectCol = {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-start w-full h-full ml-2">
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
    };

    return [selectCol, ...(columns || [])];
  }, [columns, quickSumEnabled]);

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
    setFilteredData && setFilteredData(
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
        .custom-table th {
          border: 1px solid #d7d7d7;
          text-align: center;
          font-size: 12px !important;
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;

        }
        .custom-table td {
          border: 1px solid #d7d7d7;
          text-align: center;
          font-size: 10px !important;
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;

        }
        .header-blue {
          background-color: #d9e6f2;
          color: #1d3d79;
        }

        .summary-green {
          background-color: #b7d1b5;
          color: #1d3d79;
          font-weight: 600;
        }

        .summary-blue {
          background-color: #8db6d8;
          color: #1d3d79;
          font-weight: 600;
        }

        .pagination-center {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .page-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-weight: 500;
        }

        .page-active {
          background-color: #1d3d79;
          color: white;
        }

        .page-normal {
          color: #1d3d79;
        }
      `}</style>

      <div className="custom-table">
        <div className="flex flex-col "
          style={{ 
            boxShadow: '',
          }}
        >
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
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
            />
          </div>
          <div className="hidden md:block" >
<div
  className="overflow-auto dashboard-scroll rounded-3xl border border-[#d7d7d7] shadow-sm"
  style={{
    maxHeight: dynamicMaxHeight,
    borderLeft: '8px solid #1D3D79',
    borderRadius: '20px'
  }}
>                <table
  className="w-full"
  style={{
    tableLayout: 'auto',
    borderCollapse: 'separate',
    borderSpacing: 0
  }}
>
                   <thead>
              <tr className="summary-green">
                <th colSpan={columns.length}>
                  <div className="grid grid-cols-4 w-full font-normal">
                    <div className="text-left pl-6">Total $:</div>
                    <div>$ 0.00</div>
                    <div>$ 0.00</div>
                    <div>$ 0.00</div>
                  </div>
                </th>
              </tr>

              <tr className="summary-blue">
                <th colSpan={columns.length}>
                  <div className="grid grid-cols-4 w-full font-normal">
                    <div className="text-left pl-6">Total €:</div>
                    <div>€ 0.00</div>
                    <div>€ 0.00</div>
                    <div>€ 0.00</div>
                  </div>
                </th>
              </tr>

              {/* ======= HEADER ======= */}
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id}>
                  {hdGroup.headers.map(header => (
                    <th key={header.id} className="header-blue py-3 font-bold font-poppins">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
                
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
        const isCompleted = cell.column.id === 'completed';
        const isStatus = cell.column.id === 'status' && value;

        const hasValue =
          value !== null &&
          value !== undefined &&
          value !== '';

        return (
          <td
            key={cell.id}
            className="px-2 py-2 text-center"
            style={{
              minWidth: cell.column.id === 'select' ? '50px' : '60px',
              maxWidth: cell.column.id === 'select' ? '50px' : '110px',
            }}
          >
            {isCompleted ? (
              <div className="flex justify-center">
                <div
                  className="px-3 py-1.5 rounded-lg font-normal"
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
                  className="px-3 py-1.5 rounded-lg text-[11px] font-normal"
                  style={{
                    backgroundColor:
                      value === 'Completed'
                        ? '#00bf63'
                        : '#eb3636',
                    color: '#FFFFFF',
                    border: '1px solid #cecece'
                  }}
                >
                  {value}
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                {hasValue ? (
                  <div
                    className="px-3 py-1.5 rounded-lg text-[11px] font-normal min-w-[70px] text-center transition-all duration-200 ease-in-out"
                    style={{
                      backgroundColor:
                        value === 'Paid'
                          ? '#ceb8ff'
                          : value === 'Unpaid'
                          ? '#c387b4'
                          : '#f9f9f9',
                      border: '1px solid #cecece',
                      ...(isEditMode && {
                        boxShadow: 'inset 0 0 0 1px #d1d1d1'
                      })
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
      <td
        colSpan={columnsWithSelection.length}
        className="py-24 text-center"
      >
        <div className="flex flex-col items-center justify-center">
          {renderEmptyStateMedia()}
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
          <div className="block md:hidden">
            <div 
              className="overflow-y-auto dashboard-scroll px-2 py-2 space-y-2"
              style={{ maxHeight: dynamicMaxHeight }}
            >
              {table.getRowModel().rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  onClick={() => SelectRow(row.original)}
                  className="rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: highlightId === row.original.id 
                      ? '2px solid #F97316' 
                      : '1px solid #E5E7EB',
                    boxShadow: highlightId === row.original.id 
                      ? '0 12px 28px rgba(249, 115, 22, 0.2)'
                      : '0 4px 12px rgba(0, 0, 0, 0.06)'
                  }}
                >
                  <div 
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ 
                      background: '#bce1ff',
                    }}
                  >
                    <span 
                      className="font-normal"
                      style={{ 
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
                            {cell.column.id === 'completed' ? (
                              cell.getValue() ? (
                                <div 
                                      className="w-full px-2 py-2 rounded-md text-[11px] font-normal flex items-center gap-2 justify-center shadow-md"
                                      style={{ 
                                        backgroundColor: '#00bf63',
                                        color: '#FFFFFF'
                                      }}
                                >
                                  Completed
                                </div>
                              ) : (
                                <div 
                                  className="w-full px-2 py-2 rounded-md text-[11px] font-normal flex items-center gap-2 justify-center shadow-sm"
                                  style={{ 
                                    backgroundColor: '#eb3636',
                                    color: '#FFFFFF'
                                  }}
                                >
                                  Pending
                                </div>
                              )
                            ) : (
                              flexRender(cell.column.columnDef.cell, cell.getContext())
                            )}
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
         <div
  className="flex-shrink-0"
  style={{
    borderTop: '2px solid #E5E7EB',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))'
  }}
>
  <div className="px-4 py-3">

    {/* TOP ROW */}
    <div className="grid grid-cols-3 items-center">

      {/* LEFT — Showing Info */}
      <div className="flex justify-start">
        <div
          className="whitespace-nowrap font-normal"
          style={{
            color: '#6B7280',
            fontSize: 'clamp(7px, 0.6vw, 9px)'
          }}
        >
          {`${
            table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize +
            (table.getFilteredRowModel().rows.length ? 1 : 0)
          } - ${
            table.getRowModel().rows.length +
            table.getState().pagination.pageIndex *
              table.getState().pagination.pageSize
          } ${getTtl('of', ln)} ${
            table.getFilteredRowModel().rows.length
          }`}
        </div>
      </div>

      {/* CENTER — Pagination */}
      <div className="flex justify-center">
        <Paginator table={table} />
      </div>

      {/* RIGHT — Rows Indicator */}
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
