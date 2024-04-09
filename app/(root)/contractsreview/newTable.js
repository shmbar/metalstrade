'use client'

import Header from "@components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { Fragment, useEffect, useMemo, useState } from "react"
import { TbSortDescending } from "react-icons/tb";
import { TbSortAscending } from "react-icons/tb";

import { Paginator } from "@components/table/Paginator";
import RowsIndicator from "@components/table/RowsIndicator";
import { usePathname } from "next/navigation";
import '../contracts/style.css';
import { getTtl } from "@utils/languages";

const Customtable = ({ data, columns, invisible, SelectRow, excellReport, cb, setFilteredData, ln }) => {

    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)

    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 5, })
    const pagination = useMemo(() => ({ pageIndex, pageSize, }), [pageIndex, pageSize])
    const pathName = usePathname()

    const table = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        state: {
            globalFilter,
            columnVisibility,
            pagination
        },
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    useEffect(() => {
        setFilteredData(table.getFilteredRowModel().rows.map(x => x.original))
    }, [globalFilter])

    return (
        <div className="flex flex-col relative ">
            <div>
                <Header globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                    table={table} excellReport={excellReport} cb={cb} />

                <div className=" overflow-x-auto border-x">
                    <table className="w-full">
                        <thead className="bg-gray-50 divide-y divide-gray-200 ">
                            {table.getHeaderGroups().map((hdGroup, i) =>
                                <Fragment key={hdGroup.id}>
                                    <tr className="border-b cursor-pointer bg-slate-600 ">
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id} className="text-white font-medium table_cell py-2 text-xs text-left">
                                                    {header.column.columnDef.ttl}
                                                </th>
                                        )}
                                    </tr>
                                    <tr key={hdGroup.id + '-row'} className='border-b'>
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id + '-header'} className="relative px-6 py-2 text-left text-sm font-medium text-gray-500 uppercase
                                     dark:text-gray-400 border-b">
                                                    {header.column.getCanSort() ?

                                                        <div onClick={header.column.getToggleSortingHandler()} className="text-xs flex cursor-pointer items-center gap-1">
                                                            {header.column.columnDef.header}
                                                            {
                                                                {
                                                                    asc: <TbSortAscending className="text-slate-600 scale-125" />,
                                                                    desc: <TbSortDescending className="text-slate-600 scale-125" />
                                                                }[header.column.getIsSorted()]
                                                            }
                                                        </div>
                                                        :
                                                        <span className="text-xs ">{header.column.columnDef.header}</span>
                                                    }
                                                </th>
                                        )}
                                    </tr>
                                </Fragment>
                            )}
                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className='cursor-pointer' onDoubleClick={() => SelectRow(row.original)}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} data-label={cell.column.columnDef.header} className={`table_cell text-xs ${pathName === '/invoices' ? 'md:py-1.5' : 'md:py-3'}`}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
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