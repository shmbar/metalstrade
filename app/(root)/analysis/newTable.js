'use client'
import Header from "../../../components/table/header";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"
import { useMemo, useState, useEffect } from "react"

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import '../contracts/style.css';
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";
import { useTablePrefs, useTablePagination } from '@components/table/useTablePrefs';

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  excellReport,
  cb,
  cb1,
  type,
  ln,
  setFilteredData
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useTablePrefs('columns', invisible, type)
  const [{ pageIndex, pageSize }, setPagination] = useTablePagination(50, type)
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);
  const [quickSumEnabled, setQuickSumEnabled] = useState(false);
  const [quickSumColumns, setQuickSumColumns] = useState(['Toqnty', 'Backqnty']); // Example columns to sum
  const [rowSelection, setRowSelection] = useState({});
  const pathName = usePathname();

  // Add selection column if quick sum is enabled
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
            style={{ accentColor: 'var(--brand)' }}
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center w-full h-full">
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

  const table = useReactTable({
    columns: columnsWithSelection,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
      columnVisibility,
      pagination,
      rowSelection,
    },
    enableRowSelection: quickSumEnabled,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
  });

  /* Report the rows the filters have left, so the Excel export can be built from
     what is on screen. Without this the page exported the whole period: search for
     one supplier, press Excel, and every supplier came back with it. */
  useEffect(() => {
    if (typeof setFilteredData !== 'function') return;
    setFilteredData(table.getFilteredRowModel().rows.map(r => r.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter, data]);

  const rows = table.getRowModel().rows;
  const dynamicMaxHeight = rows.length > 0
    ? `${Math.min(rows.length * 40 + 180, 700)}px`
    : '320px';

  // Calculate quick sum for selected rows and columns
  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);
  const quickSumResults = quickSumColumns.reduce((acc, col) => {
    acc[col] = selectedRows.reduce((sum, row) => sum + (parseFloat(row[col]) || 0), 0);
    return acc;
  }, {});

  return (
    <div className="w-full">
      <style jsx global>{`
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
        /* .custom-table th/td now live in globals.css — one definition for every
           table in the app. This file's copy also gave the HEADER 6px vertical
           padding where every other table used 4px, so its header band sat 4px
           taller than the same band on every other page. */
      `}</style>

      <div className="custom-table">
        <div className="flex flex-col" style={{ boxShadow: '0 20px 60px rgba(var(--shadow-rgb), 0.08), 0 0 1px rgba(var(--shadow-rgb), 0.1) inset' }}>
          {/* HEADER */}
          <div className="flex-shrink-0" style={{ borderBottom: '2px solid var(--line)', background: 'linear-gradient(90deg, color-mix(in srgb, var(--bg-card) 95%, transparent), color-mix(in srgb, var(--bg-subtle) 98%, transparent))' }}>
            <Header
              globalFilter={globalFilter}
              setGlobalFilter={setGlobalFilter}
              table={table}
              excellReport={excellReport}
              cb={cb}
              cb1={cb1}
              type={type}
              quickSumEnabled={quickSumEnabled}
              setQuickSumEnabled={setQuickSumEnabled}
              quickSumColumns={quickSumColumns}
              setQuickSumColumns={setQuickSumColumns}
              quickSumResults={quickSumResults}
            />
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block">
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight, borderRadius: '24px', border: '1px solid var(--line-strong)' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-sticky">
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(var(--surface-card-rgb), 0.2)' }}>
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          /* Band comes from .custom-table th. This header restated it
                             inline and had drifted on two counts: full ink against the
                             standard's --ink-secondary, and 0.05em tracking against
                             0.04em. Both read as "heavier" next to another table. */
                          style={{
                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                            textAlign: header.column.id === 'select' ? 'left' : undefined,
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const firstOccurrenceOrder = rows.findIndex(r => r.original.order === row.original.order)
                    const rowSpanOrder = rows.filter(r => r.original.order === row.original.order).length
                    const prevOrder = rowIndex > 0 ? rows[rowIndex - 1].original.order : null
                    const currentOrder = row.original.order
                    const borderColor = prevOrder !== currentOrder ? 'border-slate-500' : 'border-gray-200'
                    const isLastRow = rowIndex + 1 === rows.length
                    const isAverageRow = row.original.cert === "Average"
                    return (
                      <tr
                        key={row.id}
                        onDoubleClick={() => SelectRow?.(row.original)}
                        className={`border-b ${borderColor} cursor-pointer transition-colors ${isAverageRow ? "bg-[var(--bg-sunken)] hover:bg-[var(--bg-sunken)] font-semibold" : "hover:bg-[var(--bg-subtle)]"}`}
                      >
                        {row.index === firstOccurrenceOrder && (
                          <td
                            rowSpan={rowSpanOrder}
                            className={`table_cell responsiveTextTable md:py-3 ${isLastRow ? 'border-b-0' : `border-t ${borderColor}`}`}
                          >
                            {row.original.order}
                          </td>
                        )}
                        {row.getVisibleCells().map(cell => {
                          if (cell.column.id === 'order') return null;
                          return (
                            <td
                              key={cell.id}
                              className={`table_cell responsiveTextTable md:py-3 border-t ${borderColor}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE TABLE */}
          <div className="block md:hidden">
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight, borderRadius: '24px' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-sticky">
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(var(--surface-card-rgb), 0.2)' }}>
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          /* Band comes from .custom-table th. This header restated it
                             inline and had drifted on two counts: full ink against the
                             standard's --ink-secondary, and 0.05em tracking against
                             0.04em. Both read as "heavier" next to another table. */
                          style={{
                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                            textAlign: header.column.id === 'select' ? 'left' : undefined,
                          }}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const firstOccurrenceOrder = rows.findIndex(r => r.original.order === row.original.order)
                    const rowSpanOrder = rows.filter(r => r.original.order === row.original.order).length
                    const prevOrder = rowIndex > 0 ? rows[rowIndex - 1].original.order : null
                    const currentOrder = row.original.order
                    const borderColor = prevOrder !== currentOrder ? 'border-slate-500' : 'border-gray-200'
                    const isLastRow = rowIndex + 1 === rows.length
                    const isAverageRow = row.original.cert === "Average"
                    return (
                      <tr
                        key={row.id}
                        onDoubleClick={() => SelectRow?.(row.original)}
                        className={`border-b ${borderColor} cursor-pointer transition-colors ${isAverageRow ? "bg-[var(--bg-sunken)] hover:bg-[var(--bg-sunken)] font-semibold" : "hover:bg-[var(--bg-subtle)]"}`}
                      >
                        {row.index === firstOccurrenceOrder && (
                          <td
                            rowSpan={rowSpanOrder}
                            className={`table_cell responsiveTextTable md:py-3 ${isLastRow ? 'border-b-0' : `border-t ${borderColor}`}`}
                          >
                            {row.original.order}
                          </td>
                        )}
                        {row.getVisibleCells().map(cell => {
                          if (cell.column.id === 'order') return null;
                          return (
                            <td
                              key={cell.id}
                              className={`table_cell responsiveTextTable md:py-3 border-t ${borderColor}`}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between p-4" style={{ borderTop: '2px solid var(--line)', background: 'linear-gradient(90deg, color-mix(in srgb, var(--bg-card) 95%, transparent), color-mix(in srgb, var(--bg-subtle) 98%, transparent))' }}>
              <RowsIndicator
                table={table}
                quickSumEnabled={quickSumEnabled}
                quickSumResults={quickSumResults}
              />
              <Paginator
                table={table}
                className="flex-shrink-0"
                buttonClassName="px-3 py-1 responsiveText"
                disabledClassName="opacity-50 cursor-not-allowed"
                activeClassName="bg-blue-600 text-[var(--on-brand)]"
                inactiveClassName="bg-[var(--neutral-bg)] text-[var(--port-gore)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customtable;
