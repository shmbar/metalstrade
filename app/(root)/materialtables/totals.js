'use client'

import Header from "@components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { TbSortDescending } from "react-icons/tb";
import { TbSortAscending } from "react-icons/tb";

import { Paginator } from "@components/table/Paginator";
import RowsIndicator from "@components/table/RowsIndicator";
import '../contracts/style.css';
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "@utils/languages";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import Tltip from "@components/tlTip";
//import FiltersIcon from '../../../components/table/filters/filters';
//import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
//import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "@components/table/filters/filterFunc";
import { MdDeleteOutline } from "react-icons/md";

const Customtable = ({ data, columns }) => {



    const [globalFilter, setGlobalFilter] = useState('')
    const [filterOn, setFilterOn] = useState(false)


    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 500, })
    const pagination = useMemo(() => ({ pageIndex, pageSize, }), [pageIndex, pageSize])
    const pathName = usePathname()
    const { ln } = useContext(SettingsContext);

    const [columnFilters, setColumnFilters] = useState([]) //Column filter

    const table = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            //   dateBetweenFilterFn,
        },
        state: {
            globalFilter,
            pagination,
            columnFilters
        },
        onColumnFiltersChange: setColumnFilters, ////Column filter
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    return (
        <div className="flex flex-col relative pt-7">
            <div >


                <div className=" overflow-x-auto border-x md:max-h-[310px] 2xl:max-h-[550px]">
                    <table className="w-full">
                        <thead className="bg-gray-50 divide-y divide-gray-200 md:sticky md:top-0 md:z-10 ">
                            {table.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id}>
                                    {hdGroup.headers.map(
                                        header =>
                                            <th key={header.id}
                                                className={`relative px-4 ${header.id === 'material' ? 'w-96' : 'w-3'}
                                            `}>


                                            </th>
                                    )}
                                </tr>)}
                        </thead>
                        <tbody className="divide-y divide-black ">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className='cursor-pointer divide-gray-500'>
                                    {row.getVisibleCells().map(cell =>

                                        <td key={cell.id} data-label={cell.column.columnDef.header}
                                            className={`table_cell text-sm text-center p-1 w-20 ${cell.column.id === 'material' ? 'bg-[#FFFFFF]' : 'bg-[#F2CEEF]'} font-bold`}>
                                            {cell.column.id !== 'del' ?
                                                <div
                                                    className={`indent-0 input h-8 border-none text-black font-bold items-center text-sm
                                                    ${cell.column.id === 'material' ? 'w-80' : 'w-20'} flex justify-center`}
                                                >
                                                    {cell.column.id !== 'material' ?
                                                        new Intl.NumberFormat('en-US', {
                                                            minimumFractionDigits: 2
                                                        }).format(cell.getContext().getValue())
                                                        : ''
                                                    }
                                                </div>

                                                :
                                                ''
                                            }
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    )
}


export default Customtable;