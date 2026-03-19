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
import { useMemo, useState } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb";
import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import '../contracts/style.css';
import { usePathname } from "next/navigation";
import { getTtl } from "../../../utils/languages";

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  excellReport,
  cb,
  cb1,
  type,
  ln
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState(invisible);
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 100 });
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
            style={{ accentColor: '#BCE1FE' }}
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .dashboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .dashboard-scroll::-webkit-scrollbar-track { 
          background: linear-gradient(180deg, #F5F5F5, #FAFAFA); 
          border-radius: 6px; 
        }
        .dashboard-scroll::-webkit-scrollbar-thumb { 
          background: linear-gradient(180deg, #6366F1, #4338CA); 
          border-radius: 6px; 
          border: 2px solid #F5F5F5;
        }
        .dashboard-scroll::-webkit-scrollbar-thumb:hover { 
          background: linear-gradient(180deg, #A855F7, #7E22CE);
          border-color: #FAFAFA;
        }
        .glass-table {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.85) 0%, 
            rgba(250, 250, 250, 0.90) 50%,
            rgba(255, 255, 255, 0.85) 100%
          );
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
        }
        .custom-table, .custom-table *, .glass-table, .glass-table * {
          font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px !important;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
        .custom-table th, .custom-table td {
          border: 1px solid #d8e8f5;
          background-color: #f8fbff;
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          border-radius: 4px;
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
        <div className="flex flex-col" style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 0 1px rgba(99, 102, 241, 0.1) inset' }}>
          {/* HEADER */}
          <div className="flex-shrink-0" style={{ borderBottom: '2px solid #E5E7EB', background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))' }}>
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
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight, borderLeft: '8px solid var(--chathams-blue)', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className={`px-2 py-2 font-poppins text-xs font-medium`}
                          style={{
                            color: 'var(--chathams-blue)',
                            backgroundColor: '#dbeeff',
                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                            letterSpacing: '0.05em',
                            textAlign: header.column.id === 'select' ? 'left' : 'center',
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
                        className={`border-b ${borderColor} cursor-pointer transition-colors ${isAverageRow ? "bg-orange-100 hover:bg-orange-200" : "hover:bg-[#dbeeff]"}`}
                      >
                        {row.index === firstOccurrenceOrder && (
                          <td
                            rowSpan={rowSpanOrder}
                            className={`table_cell text-xs md:py-3 ${isLastRow ? 'border-b-0' : `border-t ${borderColor}`}`}
                          >
                            {row.original.order}
                          </td>
                        )}
                        {row.getVisibleCells().map(cell => {
                          if (cell.column.id === 'order') return null;
                          return (
                            <td
                              key={cell.id}
                              className={`table_cell text-xs md:py-3 border-t ${borderColor}`}
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
            <div className="overflow-auto dashboard-scroll" style={{ maxHeight: dynamicMaxHeight, borderLeft: '8px solid var(--chathams-blue)', borderTopLeftRadius: '24px', borderBottomLeftRadius: '24px' }}>
              <table className="w-full" style={{ tableLayout: 'auto' }}>
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map(hdGroup => (
                    <tr key={hdGroup.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                      {hdGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className={`px-2 py-2 font-poppins text-xs font-medium`}
                          style={{
                            color: 'var(--chathams-blue)',
                            backgroundColor: '#dbeeff',
                            minWidth: header.column.id === 'select' ? '50px' : '60px',
                            letterSpacing: '0.05em',
                            textAlign: header.column.id === 'select' ? 'left' : 'center',
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
                        className={`border-b ${borderColor} cursor-pointer transition-colors ${isAverageRow ? "bg-orange-100 hover:bg-orange-200" : "hover:bg-[#dbeeff]"}`}
                      >
                        {row.index === firstOccurrenceOrder && (
                          <td
                            rowSpan={rowSpanOrder}
                            className={`table_cell text-xs md:py-3 ${isLastRow ? 'border-b-0' : `border-t ${borderColor}`}`}
                          >
                            {row.original.order}
                          </td>
                        )}
                        {row.getVisibleCells().map(cell => {
                          if (cell.column.id === 'order') return null;
                          return (
                            <td
                              key={cell.id}
                              className={`table_cell text-xs md:py-3 border-t ${borderColor}`}
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
            <div className="flex items-center justify-between p-4" style={{ borderTop: '2px solid #E5E7EB', background: 'linear-gradient(90deg, rgba(255,255,255,0.95), rgba(250,250,250,0.98))' }}>
              <RowsIndicator
                table={table}
                quickSumEnabled={quickSumEnabled}
                quickSumResults={quickSumResults}
              />
              <Paginator
                table={table}
                className="flex-shrink-0"
                buttonClassName="px-3 py-1 text-sm"
                disabledClassName="opacity-50 cursor-not-allowed"
                activeClassName="bg-blue-600 text-white"
                inactiveClassName="bg-gray-100 text-gray-700"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Customtable;
