'use client'

import Header from "@components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { TbSortDescending } from "react-icons/tb";
import { TbSortAscending } from "react-icons/tb";

import { Paginator } from "@components/table/Paginator";
import RowsIndicator from "@components/table/RowsIndicator";
import '../contracts/style.css';
import { usePathname } from "next/navigation";
import { getTtl } from "@utils/languages";

const Customtable = ({ data, columns, invisible, SelectRow, excellReport, cb, cb1, type, ln }) => {



    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)

    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 100 })
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


    return (
        <div className="flex flex-col relative ">
            <div >
                <Header globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                    table={table} excellReport={excellReport} cb={cb} cb1={cb1}
                    type={type} />

                <div className=" overflow-x-auto border-x">
                    <table className="w-full">
                        <thead className="bg-gray-50 divide-y divide-gray-200 ">
                            {table.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} className='border-b'>
                                    {hdGroup.headers.map(
                                        header =>
                                            <th key={header.id} className="relative px-6 py-2 text-left text-sm font-medium text-gray-500 uppercase
                                     dark:text-gray-400">
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
                                                    <span className="text-xs">{header.column.columnDef.header}</span>
                                                }
                                            </th>
                                    )}
                                </tr>)}
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {table.getRowModel().rows.map((row, rowIndex) => {
                                const rows = table.getRowModel().rows;

                                const firstOccurrenceOrder = rows.findIndex(
                                    (r) => r.original.order === row.original.order
                                );

                                const rowSpanOrder = rows.filter(
                                    (r) => r.original.order === row.original.order
                                ).length;

                                // Get the previous row's order to check if it changed
                                const prevOrder = rowIndex > 0 ? rows[rowIndex - 1].original.order : null;
                                const currentOrder = row.original.order;

                                // Conditionally apply Tailwind border color when order changes
                                const borderColor = prevOrder !== currentOrder ? 'border-slate-500' : 'border-gray-200';

                                // Check if this is the last row in the table
                                const isLastRow = rowIndex + 1 === rows.length;

                                // Check if the row is an average row
                                const isAverageRow = row.original.cert === "Average";

                                return (
                                    <tr key={row.id} className={`border-b ${borderColor} ${isAverageRow ? "bg-orange-100 text-white" : ""}`}>
                                        {/* Render "order" column with rowSpan for the first occurrence only */}
                                        {row.index === firstOccurrenceOrder && (
                                            <td
                                                rowSpan={rowSpanOrder}
                                                className={`table_cell text-xs md:py-3 ${isLastRow ? 'border-b-0' : `border-t ${borderColor}`}`}
                                            >
                                                {row.original.order}
                                            </td>
                                        )}

                                        {/* Render remaining columns */}
                                        {row.getVisibleCells().map((cell) => {
                                            if (cell.column.id !== 'order') {
                                                return (
                                                    <td key={cell.id} className={`table_cell text-xs md:py-3 border-t ${borderColor}`}>
                                                        {typeof cell.column.columnDef.cell === 'function'
                                                            ? cell.column.columnDef.cell(cell.getContext())
                                                            : cell.getValue()}
                                                    </td>
                                                );
                                            }
                                            return null; // Skip rendering for the 'order' column here
                                        })}
                                    </tr>
                                );
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
        </div >
    )
}


export default Customtable;