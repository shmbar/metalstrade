'use client';
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
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "../../../components/table/filters/filterFunc";
import { labelAwareGlobalFilter } from "../../../components/table/filters/labelAwareGlobalFilter";


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
            style={{ accentColor: 'var(--brand-soft)' }}
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
    globalFilterFn: labelAwareGlobalFilter,
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
        /* .custom-table th/td now live in globals.css — one definition for every
           table in the app. */
        .header-blue {
          background-color: var(--bg-subtle);
          color: var(--chathams-blue);
        }

        /* The two totals bands, matching specialinvoices/newTable.js.
           The background has to sit on the th, not the tr: .custom-table th paints
           var(--bg-subtle) on every header cell, and a cell background covers the
           row's. Set on the tr alone (as --ok-border / --line-strong were) it never
           showed at all, so both bands rendered the same grey as the column header
           below them — three identical rows.
           Tokens follow the 2026-08-08 client revision: a totals row is a summary,
           not a status, so these are quiet fills rather than a saturated green, and
           --ok-border / --line-strong are border tokens, not surfaces.

           2026-08-20: the --ok-* green went too. A totals band is not "good news",
           it is structure, and green was the one hue on these pages sitting outside
           the violet base. Both bands are now the brand family: the USD band takes
           --violet-border, the EUR band the neutral --bg-sunken one step lighter, so
           they stay tellable apart by value rather than by hue. The class names said
           "green"/"blue" and no longer described anything, hence usd/eur. */
        .summary-usd {
          background-color: var(--violet-border);
          color: var(--brand-strong);
          font-weight: 500;
        }
        /* Only the horizontal rule is suppressed, so the two totals bands read as
           one block. A blanket "border: none" also removed the column dividers the
           global grid draws (the :where(thead th) rules in globals.css), which left
           these two rows as the only ones in the table without them. */
        .summary-usd th {
          background-color: var(--violet-border) !important;
          color: var(--brand-strong) !important;
          border-bottom: 0 !important;
        }

        .summary-eur {
          background-color: var(--bg-sunken);
          color: var(--ink);
          font-weight: 500;
        }
        .summary-eur th {
          background-color: var(--bg-sunken) !important;
          color: var(--ink) !important;
          border-bottom: 0 !important;
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
          background-color: var(--brand-deep);
          color: white;
        }

        .page-normal {
          color: var(--chathams-blue);
        }
      `}</style>

      <div className="custom-table">
        <div className="relative flex flex-col rounded-2xl">
          {/* Border overlay — renders above children so corners always visible */}
          <div className="absolute inset-0 rounded-2xl border border-[var(--line)] pointer-events-none z-sticky" />

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
                  <tr className="summary-usd">
                    {hdGroup.headers.map(header => (
                      <th key={header.id} className="py-1.5">
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
                  <tr className="summary-eur">
                    {hdGroup.headers.map(header => (
                      <th key={header.id} className="py-1.5">
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
                        className="header-blue py-1.5 font-medium font-sans responsiveTextTable"
                        style={{
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
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className="px-2 py-1.5"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            borderBottom: '2px solid var(--line)',
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
                      value === 'Completed'
                        ? 'var(--ok-bg)'
                        : 'var(--bad-bg)',
                    color: value === 'Completed' ? 'var(--ok-text)' : 'var(--bad-text)',
                    border: value === 'Completed' ? '1px solid var(--ok-border)' : '1px solid var(--bad-border)'
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
                    className="px-2.5 py-0.5 rounded-lg responsiveTextTable font-medium min-w-[70px] text-center transition-all duration-200 ease-in-out"
                    style={{
                      backgroundColor:
                        value === 'Paid' ? 'var(--ok-bg)' :
                        value === 'Unpaid' ? 'var(--bad-bg)' : 'transparent',
                      color:
                        value === 'Paid' ? 'var(--ok-text)' :
                        value === 'Unpaid' ? 'var(--bad-text)' : 'var(--port-gore)',
                      border: `1px solid ${value === 'Paid' ? 'var(--ok-border)' : value === 'Unpaid' ? 'var(--bad-border)' : 'transparent'}`,
                      fontWeight: '400',
                      ...(isEditMode && { boxShadow: 'inset 0 0 0 1px var(--line-strong)' })
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ) : (
                  <div className="p-1 responsiveTextTable min-w-[70px]">&nbsp;</div>
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
        <EmptyState message={getTtl('No data available', ln)} hint="Try adjusting your filters or date range" />
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
                    backgroundColor: "var(--bg-card)",
                    border: highlightId === row.original.id 
                      ? '2px solid var(--warn-text)' 
                      : '1px solid var(--line)',
                    boxShadow: highlightId === row.original.id 
                      ? 'var(--shadow-lg)'
                      : '0 4px 12px rgba(var(--shadow-rgb), 0.06)'
                  }}
                >
                  <div 
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ 
                      background: 'var(--bg-subtle)',
                    }}
                  >
                    <span
                      className="font-normal"
                      style={{
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
                            className="responsiveTextTable break-words px-2 py-1 rounded-2xl leading-relaxed min-h-7 flex items-center shadow-sm" style={{ color: 'var(--ink)' }}
                          >
                            {cell.column.id === 'completed' ? (
                              cell.getValue() ? (
                                <div 
                                      className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-md"
                                      style={{
                                        backgroundColor: 'var(--ok-bg)',
                                        color: 'var(--ok-text)'
                                      }}
                                >
                                  Completed
                                </div>
                              ) : (
                                <div
                                  className="w-full px-2 py-2 rounded-lg responsiveTextTable font-medium flex items-center gap-2 justify-center shadow-sm"
                                  style={{
                                    backgroundColor: 'var(--bad-bg)',
                                    color: 'var(--bad-text)'
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
    borderTop: '1px solid var(--line)',
    background: "var(--bg-card)",
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
