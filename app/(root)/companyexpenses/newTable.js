'use client'

import Header from "@components/table/header";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { Fragment, useEffect, useMemo, useState } from "react"
import { TbSortDescending } from "react-icons/tb";
import { TbSortAscending } from "react-icons/tb";

import { Paginator } from "@components/table/Paginator";
import RowsIndicator from "@components/table/RowsIndicator";
import '../contracts/style.css';
import { useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { usePathname } from "next/navigation";
import { getTtl } from "@utils/languages";
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';
import { Filter } from "@components/table/filters/filterFunc";


const Customtable = ({ data, columns, SelectRow, excellReport, setFilteredId, invisible }) => {



    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)
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
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    const resetTable = () => {
        table.resetColumnFilters()
    }

    useEffect(() => {
        setFilteredId(table.getFilteredRowModel().rows.map(x => x.original).map(x=> x.id))
    }, [columnFilters, globalFilter])

    let showAmount = (val, cur) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: cur,
            minimumFractionDigits: 2
        }).format(val)
    }

    let amountUSD = showAmount(table.getFilteredRowModel().rows.map(x => x.original).reduce((sum, row) => {
        const value = row.cur === 'USD' ? row.amount : 0
        return sum + (value * 1 || 0)
    }, 0), 'usd')

    let amountEur = showAmount(table.getFilteredRowModel().rows.map(x => x.original).reduce((sum, row) => {
        const value = row.cur === 'EUR' ? row.amount : 0
        return sum + (value * 1 || 0)
    }, 0), 'eur')

    return (
        <div className="flex flex-col relative ">
            <div >
                <Header globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                    table={table} excellReport={excellReport}
                    filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
                    resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
                />

                <div className=" overflow-x-auto border-x md:max-h-[310px] 2xl:max-h-[550px]">
                    <table className="w-full">
                        <thead className="bg-gray-50 divide-y divide-gray-200 md:sticky md:top-0 md:z-10 ">
                            {table.getHeaderGroups().map(hdGroup =>
                                <Fragment key={hdGroup.id}>
                                    <tr className="cursor-pointer bg-blue-200 ">
                                        {hdGroup.headers.map(
                                            header => {
                                                return (
                                                    <th key={header.id} className="text-dark font-medium table_cell text-xs py-1.5 text-left">
                                                        {header.id === 'supplier' ? 'Total $:' :
                                                            header.id === 'cur' ? 'USD' :
                                                                header.id === 'amount' ? amountUSD : ''}
                                                    </th>
                                                )
                                            }

                                        )}
                                    </tr>
                                    <tr className="cursor-pointer bg-blue-200 ">
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id} className="text-dark font-medium table_cell text-xs py-1.5 text-left">
                                                    {header.id === 'supplier' ? 'Total €:' :
                                                        header.id === 'cur' ? 'EUR' :
                                                            header.id === 'amount' ? amountEur : ''}
                                                </th>
                                        )}
                                    </tr>
                                    <tr key={hdGroup.id} className='border-b'>
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id} className="relative px-6 py-2 text-left text-sm font-medium text-gray-500 uppercase">
                                                    {header.column.getCanSort() ?
                                                        <div onClick={header.column.getToggleSortingHandler()} className="table-caption cursor-pointer items-center gap-1 text-xs
                                                    font-medium">
                                                            {/* <Tltip direction='top' tltpText='sdsd ffgf'> */}
                                                            {header.column.columnDef.header}
                                                            {/* </Tltip> */}

                                                            {
                                                                {
                                                                    asc: <TbSortAscending className="text-slate-600 scale-125" />,
                                                                    desc: <TbSortDescending className="text-slate-600 scale-125" />
                                                                }[header.column.getIsSorted()]
                                                            }
                                                        </div>
                                                        :
                                                        <span className="text-xs py-1  font-medium">{header.column.columnDef.header}</span>
                                                    }
                                                    {header.column.getCanFilter() ? (
                                                        <div>
                                                            <Filter column={header.column} table={table} filterOn={filterOn} />
                                                        </div>
                                                    ) : null}
                                                </th>
                                        )}
                                    </tr>
                                </Fragment>
                            )}
                        </thead>
                        <tbody className="divide-y divide-gray-200 ">
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id} className='cursor-pointer hover:bg-slate-200 ' onDoubleClick={() => SelectRow(row.original)}>

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