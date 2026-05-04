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
  const [selectedRowId, setSelectedRowId] = useState(null)

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
  const [sorting, setSorting] = useState([])
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
    setFilteredData && setFilteredData(
      table.getFilteredRowModel().rows.map(x => x.original)
    )
  }, [columnFilters, globalFilter])

  const currentRows = table.getRowModel().rows.length;
  const dynamicMaxHeight = currentRows > 0
    ? `${Math.min(currentRows * 40 + 180, 700)}px`
    : 'auto';

  return (
    <div className="w-full">
      <style jsx global>{`
        .custom-table th {
          border: 1px solid #e8f0f8;
          text-align: center;

          font-family: var(--font-poppins), 'Poppins', sans-serif;
          font-size: 0.78rem !important;
        }
        .custom-table td {
          border: 1px solid #e8f0f8;
          text-align: center;
          font-size: 10px !important;
          font-family: var(--font-poppins), 'Poppins', sans-serif;

        }
        .header-blue {
          background-color: #dbeeff;
          color: var(--chathams-blue);
        }

        .summary-green {
          background-color: #b7d1b5;
          color: #1a3a1a;
          font-weight: 600;
        }
        .summary-green th {
          color: #1a3a1a !important;
          border: none !important;
        }

        .summary-blue {
          background-color: #8db6d8;
          color: var(--chathams-blue);
          font-weight: 600;
        }
        .summary-blue th {
          color: var(--chathams-blue) !important;
          border: none !important;
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
          background-color: var(--chathams-blue);
          color: white;
        }

        .page-normal {
          color: var(--chathams-blue);
        }
      `}</style>

      <div className="custom-table">
        <div className="relative flex flex-col rounded-2xl">
          {/* Border overlay — renders above children so corners always visible */}
          <div className="absolute inset-0 rounded-2xl border border-[#b8ddf8] pointer-events-none z-[15]" />

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
          <div className="hidden md:block flex-1" >
<div
  className="overflow-auto dashboard-scroll shadow-sm"
  style={{
    maxHeight: dynamicMaxHeight,
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
              {table.getHeaderGroups().map(hdGroup => (
                <Fragment key={hdGroup.id + '-totals'}>
                  <tr className="summary-green">
                    {hdGroup.headers.map(header => (
                      <th key={header.id} className="py-1.5 responsiveTextTable font-normal text-left px-2">
                        {header.id === 'supplier' ? 'Total $:' :
                          header.id === 'cur' ? 'USD' :
                            header.id === 'amount' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(
                              table.getFilteredRowModel().rows.reduce((sum, row) => {
                                const cur = (row.original.cur || '').toUpperCase();
                                return sum + (cur === 'USD' || cur === 'US' ? (row.original.amount * 1 || 0) : 0);
                              }, 0)) : ''}
                      </th>
                    ))}
                  </tr>
                  <tr className="summary-blue">
                    {hdGroup.headers.map(header => (
                      <th key={header.id} className="py-1.5 responsiveTextTable font-normal text-left px-2">
                        {header.id === 'supplier' ? 'Total —:' :
                          header.id === 'cur' ? 'EUR' :
                            header.id === 'amount' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(
                              table.getFilteredRowModel().rows.reduce((sum, row) => {
                                const cur = (row.original.cur || '').toUpperCase();
                                return sum + (cur === 'EUR' || cur === 'EU' ? (row.original.amount * 1 || 0) : 0);
                              }, 0)) : ''}
                      </th>
                    ))}
                  </tr>
                </Fragment>
              ))}

              {/* ======= HEADER ======= */}
              {table.getHeaderGroups().map(hdGroup => (
                <Fragment key={hdGroup.id}>
                  <tr>
                    {hdGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="header-blue py-1.5 font-medium font-poppins"
                        style={{
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          userSelect: 'none',
                        }}
                        onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' && <TbSortAscending style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                          {header.column.getIsSorted() === 'desc' && <TbSortDescending style={{ fontSize: '0.85rem', color: 'var(--endeavour)' }} />}
                        </div>
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
                            minWidth: header.column.id === 'select' ? '40px' : '90px',
                            maxWidth: header.column.id === 'select' ? '40px' : 'none',
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
        const isCompleted = cell.column.id === 'completed';
        const isStatus = cell.column.id === 'status' && value;

        const hasValue =
          value !== null &&
          value !== undefined &&
          value !== '';

        const isSelect = cell.column.id === 'select';
        const isCur = cell.column.id === 'cur';
        return (
          <td
            key={cell.id}
            className="px-2 py-0.5 text-center"
            style={{
              minWidth: isSelect ? '40px' : '60px',
              maxWidth: isSelect ? '40px' : '150px',
              width: isSelect ? '40px' : undefined,
              verticalAlign: 'middle',
            }}
          >
            {isCompleted ? (
              <div className="flex justify-center">
                <div
                  className="px-3 py-1.5 rounded-lg font-normal"
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
                  className="px-3 py-1.5 rounded-xl responsiveTextTable font-normal"
                  style={{
                    backgroundColor:
                      value === 'Completed'
                        ? '#dcfce7'
                        : '#fee2e2',
                    color: value === 'Completed' ? '#16a34a' : '#dc2626',
                    border: '1px solid #d8e8f5'
                  }}
                >
                  {value}
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                {isCur ? (
                  flexRender(cell.column.columnDef.cell, cell.getContext())
                ) : hasValue ? (
                  <div
                    className="px-3 py-1.5 rounded-xl responsiveTextTable font-normal min-w-[70px] text-center transition-all duration-200 ease-in-out"
                    style={{
                      backgroundColor:
                        value === 'Paid' ? '#ede9fe' :
                        value === 'Unpaid' ? '#fce7f3' : '#f8fbff',
                      color:
                        value === 'Paid' ? '#7c3aed' :
                        value === 'Unpaid' ? '#be185d' : 'var(--port-gore)',
                      border: `1px solid ${value === 'Paid' ? '#ddd6fe' : value === 'Unpaid' ? '#fbcfe8' : '#d8e8f5'}`,
                      fontWeight: value === 'Paid' || value === 'Unpaid' ? '600' : '400',
                      ...(isEditMode && { boxShadow: 'inset 0 0 0 1px #d1d1d1' })
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ) : (
                  <div className="p-1.5 rounded-xl responsiveTextTable font-normal min-w-[70px]" style={{ backgroundColor: '#f8fbff', border: '1px solid #d8e8f5' }}>&nbsp;</div>
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
        className="py-8 text-center"
      >
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
                            className="responsiveTextTable font-normal break-words px-2 py-1 rounded-xl leading-relaxed min-h-[28px] flex items-center shadow-sm"
                            style={{
                              color: 'var(--port-gore)',
                              background: 'linear-gradient(135deg, #FAFAFA, #F5F5F5)',
                              border: '1px solid #E5E7EB'
                            }}
                          >
                            {cell.column.id === 'completed' ? (
                              cell.getValue() ? (
                                <div 
                                      className="w-full px-2 py-2 rounded-md responsiveTextTable font-normal flex items-center gap-2 justify-center shadow-md"
                                      style={{
                                        backgroundColor: '#dcfce7',
                                        color: '#16a34a'
                                      }}
                                >
                                  Completed
                                </div>
                              ) : (
                                <div
                                  className="w-full px-2 py-2 rounded-md responsiveTextTable font-normal flex items-center gap-2 justify-center shadow-sm"
                                  style={{
                                    backgroundColor: '#fee2e2',
                                    color: '#dc2626'
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
         <div
  className="flex-shrink-0 rounded-b-2xl"
  style={{
    borderTop: '1px solid #b8ddf8',
    background: '#ffffff',
  }}
>
  <div className="px-4 py-3">

    {/* TOP ROW */}
    <div className="grid grid-cols-3 items-center">

      {/* LEFT — Showing Info */}
      <div className="flex justify-start">
        <div className="responsiveText font-normal whitespace-nowrap" style={{ color: 'var(--regent-gray)' }}>
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
