'use client'

import Header from "@components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"

import { Paginator } from "@components/table/Paginator";
import RowsIndicator from "@components/table/RowsIndicator";
import '../contracts/style.css';
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from "@utils/languages";
import { Filter } from '../../../components/table/filters/filterFunc'
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';

const Customtable = ({ data, columns, invisible, excellReport }) => {



    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)
    const [filterOn, setFilterOn] = useState(false)

    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 500 })
    const pagination = useMemo(() => ({ pageIndex, pageSize, }), [pageIndex, pageSize])
    const [columnFilters, setColumnFilters] = useState([]) //Column filter

    const { ln } = useContext(SettingsContext);

    const table = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            dateBetweenFilterFn,
        },
        state: {
            globalFilter,
            columnVisibility,
            pagination,
            columnFilters
        },
        onColumnFiltersChange: setColumnFilters, ////Column filter
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    const resetTable = () => {
        table.resetColumnFilters()
    }


    return (
        <div className="flex flex-col relative ">
            <div >
                <Header globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                    table={table} excellReport={excellReport}
                    filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
                    resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
                />

                <div className=" overflow-x-auto border-x">
                    <table className="w-full">
                        <thead className="bg-gray-50 divide-y divide-gray-200 ">
                            {table.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} className='border border-slate-400'>
                                    {hdGroup.headers.map(
                                        header =>
                                            <th key={header.id} className={`relative px-6 py-2 text-left text-xs font-medium text-gray-800 uppercase
                                     dark:text-gray-400 border-b border-slate-400 ${header.column.columnDef.bgt}`}>
                                                <span className="table-caption">{header.column.columnDef.header}</span>
                                                {header.column.getCanFilter() ? (
                                                    <div>
                                                        <Filter column={header.column} table={table} filterOn={filterOn} />
                                                    </div>
                                                ) : null}
                                            </th>
                                    )}
                                </tr>)}
                        </thead>
                        <tbody className="border-r border-slate-400">
                            {table.getRowModel().rows.map((row, rowIndex) => {
                                let bottomRow = table.getRowModel().rows[rowIndex]?.original.invoice * 1 !== table.getRowModel().rows[rowIndex + 1]?.original.invoice * 1

                                return (
                                    <tr key={row.id} className={`
                                    ${bottomRow ? 'border-b border-slate-400' : 'border-b  border-slate-200'}
                                    `}>
                                        {row.getVisibleCells().map(cell => {
                                            let hideTD = !row.original.span && cell.column?.id === 'num';
                                            let brdr = cell.column?.id === 'num' && row.original?.span;

                                            return (

                                                !hideTD &&
                                                <td rowSpan={cell.column?.id === 'num' && row.original?.span ? row.original.span : null}
                                                    key={cell.id} data-label={cell.column.columnDef.header}
                                                    className={`table_cell text-xs md:py-2 ${brdr ? 'border border-slate-400' : ''}
                                                    ${cell.column.columnDef.bgr}`}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>

                                            )


                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="flex p-2 border-t flex-wrap bg-slate-50 border rounded-b-xl">
                    <div className="hidden lg:flex text-gray-600 text-sm w-48 xl:w-96 p-2 items-center">
                        {`${getTtl('Showing', ln)} ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize +
                            (table.getFilteredRowModel().rows.length ? 1 : 0)}-${table.getRowModel().rows.length + table.getState().pagination.pageIndex * table.getState().pagination.pageSize}
                            ${getTtl('of', ln)} ${table.getFilteredRowModel().rows.length}`}
                    </div>
                    <Paginator table={table} />
                    <RowsIndicator table={table} />
                </div>
            </div>
        </div>
    )
}


export default Customtable;