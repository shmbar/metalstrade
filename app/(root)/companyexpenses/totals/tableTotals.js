'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"

import { TbSortDescending } from "react-icons/tb";
import { TbSortAscending } from "react-icons/tb";
import '../../contracts/style.css';
import Tltip from "@components/tlTip";
import { expensesToolTip } from "./funcs";

const Customtable = ({ data, columns, expensesData, settings, title, filt }) => {

    const table1 = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),

    })

    let showAmount = (x, y) => {

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: y,
            minimumFractionDigits: 2
        }).format(x)
    }

    return (
        <div className={`flex flex-col relative max-w-[486px]`}>
            <div className="border rounded-xl">
                <div className="justify-between flex p-2 flex-wrap bg-gray-50 rounded-t-xl border-b">
                   <p className="text-slate-700 px-2 text-sm font-semibold">{title}</p>
                </div>

                <div className=" overflow-x-auto ">
                    <table className="w-full">
                        <thead className="bg-gray-50 divide-y divide-gray-200">
                            {table1.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} className='border-b '>
                                    {hdGroup.headers.map(
                                        header =>
                                            <th key={header.id} className="relative px-6 py-2 text-left text-sm font-medium text-gray-500 uppercase
                                     dark:text-gray-400 ">
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
                        <tbody className="divide-y divide-gray-200 ">
                            {table1.getRowModel().rows.map(row => (
                                <tr key={row.id} className='cursor-pointer '>

                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} data-label={cell.column.columnDef.header} className={`table_cell text-xs md:py-3 items-center `}>
                                            <Tltip direction='right' tltpText={expensesToolTip(row, expensesData, settings, filt)}>
                                                <span className="text-[0.8rem] items-center flex outline-none w-44 truncate cursor-default"
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                            </Tltip>
                                        </td>
                                    ))}

                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t bg-slate-100">
                                <th className="relative px-6 py-2 text-left text-[0.8rem] font-medium text-gray-500 uppercase                                  ">
                                    Total $
                                </th>
                                <th className="relative px-6 py-2 text-left text-[0.8rem] font-medium text-gray-500 uppercase">
                                    {showAmount(data
                                        .filter(item => item.cur === "us")
                                        .reduce((sum, item) => sum + item.amount, 0), 'usd')}
                                </th>
                            </tr>
                            <tr className="border-t bg-slate-100">
                                <th className="relative px-6 py-2 text-left text-[0.8rem] font-medium text-gray-500 uppercase">
                                    Total €
                                </th>
                                <th className="relative px-6 py-2 text-left text-[0.8rem] font-medium text-gray-500 uppercase">
                                    {showAmount(data
                                        .filter(item => item.cur === "eu")
                                        .reduce((sum, item) => sum + item.amount, 0), 'eur')}
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div >
    )
}


export default Customtable;