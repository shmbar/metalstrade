

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
import { Fragment, useEffect, useMemo, useState } from "react"
import { TbSortDescending, TbSortAscending } from "react-icons/tb";

import { Paginator } from "../../../components/table/Paginator";
import RowsIndicator from "../../../components/table/RowsIndicator";
import { getTtl } from "../../../utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc'
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import '../contracts/style.css';

const Customtable = ({
  data,
  columns,
  invisible,
  SelectRow,
  excellReport,
  cb,
  setFilteredData,
  ln
}) => {

  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState(invisible)
  const [filterOn, setFilterOn] = useState(false)
  const [columnFilters, setColumnFilters] = useState([])

  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 500 })
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

  const [quickSumEnabled, setQuickSumEnabled] = useState(false)
  const [quickSumColumns, setQuickSumColumns] = useState([])
  const [rowSelection, setRowSelection] = useState({})

  const columnsWithSelection = useMemo(() => {
    if (!quickSumEnabled) return columns
    return [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={el => el && (el.indeterminate = table.getIsSomePageRowsSelected())}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="w-4 h-4 accent-blue-600 cursor-pointer"
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 48,
      },
      ...(columns || [])
    ]
  }, [columns, quickSumEnabled])

  const table = useReactTable({
    columns: columnsWithSelection,
    data,
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
  })

  useEffect(() => {
    setFilteredData?.(table.getFilteredRowModel().rows.map(r => r.original))
  }, [globalFilter, columnFilters])

  const resetTable = () => table.resetColumnFilters()

  return (
    <div className="flex flex-col relative">

      {/* HEADER */}
      <Header
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        table={table}
        excellReport={excellReport}
        cb={cb}
        type="accstatement"
        filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
        resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
        quickSumEnabled={quickSumEnabled}
        setQuickSumEnabled={setQuickSumEnabled}
        quickSumColumns={quickSumColumns}
        setQuickSumColumns={setQuickSumColumns}
      />

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-x-auto overflow-y-auto border-2 border-gray-300 rounded-xl shadow-[0_10px_24px_rgba(0,0,0,0.18)] bg-gradient-to-br from-gray-50 to-gray-100 md:max-h-[650px]">

        <table className="w-full table-auto border-collapse">

          <thead>
            {table.getHeaderGroups().map(group => (
              <Fragment key={group.id}>
                <tr className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 shadow-lg">
                  {group.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-xs font-bold uppercase text-white border-r border-blue-500/30 last:border-r-0 whitespace-nowrap"
                    >
                      {header.column.getCanSort() ? (
                        <div
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          {header.column.columnDef.header}
                          {{
                            asc: <TbSortAscending />,
                            desc: <TbSortDescending />
                          }[header.column.getIsSorted()]}
                        </div>
                      ) : header.column.columnDef.header}
                    </th>
                  ))}
                </tr>

                {filterOn && (
                  <tr className="bg-white">
                    {group.headers.map(header => (
                      <th key={header.id} className="px-3 py-3">
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

          <tbody className="bg-white">
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                onDoubleClick={() => SelectRow?.(row.original)}
                className={`transition-all hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50
                ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-5 py-3 text-xs whitespace-nowrap">
                    <div className="px-4 py-2.5 bg-white rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE CARDS ================= */}
      <div className="block md:hidden space-y-4 mt-3">
        {table.getRowModel().rows.map((row, idx) => (
          <div
            key={row.id}
            className="bg-white border-2 border-gray-300 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] overflow-hidden"
          >
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white flex justify-between items-center">
              <span className="text-sm font-bold">
                #{idx + 1}
              </span>
              {quickSumEnabled && (
                <input
                  type="checkbox"
                  checked={row.getIsSelected()}
                  onChange={row.getToggleSelectedHandler()}
                  className="w-4 h-4 accent-white"
                />
              )}
            </div>

            <div className="p-4 space-y-3">
              {row.getVisibleCells().map(cell => (
                <div key={cell.id}>
                  <div className="text-[10px] font-bold text-blue-700 uppercase mb-1">
                    {cell.column.columnDef.header}
                  </div>
                  <div className="px-3 py-2 bg-white rounded-lg shadow-inner text-xs">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="flex p-4 gap-3 items-center border-2 border-t-0 border-gray-300 rounded-b-xl bg-gradient-to-br from-white via-gray-50 to-white shadow-[0_8px_16px_rgba(0,0,0,0.15)]">
        <div className="hidden lg:flex text-sm text-gray-600">
          {`${getTtl('Showing', ln)} ${pageIndex * pageSize + 1}-${table.getRowModel().rows.length + pageIndex * pageSize} ${getTtl('of', ln)} ${table.getFilteredRowModel().rows.length}`}
        </div>
        <Paginator table={table} />
        <RowsIndicator table={table} />
      </div>

    </div>
  )
}

export default Customtable
