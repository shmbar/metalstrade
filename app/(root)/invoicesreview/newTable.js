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
import { Filter } from '../../../components/table/filters/filterFunc'
import FiltersIcon from '../../../components/table/filters/filters';
import ResetFilterTableIcon from '../../../components/table/filters/resetTabe';
import dateBetweenFilterFn from '../../../components/table/filters/date-between-filter';


const Customtable = ({ data, columns, invisible, SelectRow, excellReport, /*cb,*/ setFilteredData, ln }) => {

    const [globalFilter, setGlobalFilter] = useState('')
    const [columnVisibility, setColumnVisibility] = useState(invisible)
    const [filterOn, setFilterOn] = useState(false)
    const [selectedRowId, setSelectedRowId] = useState(null)
    const [quickSumEnabled, setQuickSumEnabled] = useState(false)
    const [quickSumColumns, setQuickSumColumns] = useState([])
    const [rowSelection, setRowSelection] = useState({})

    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 500 })
    const pagination = useMemo(() => ({ pageIndex, pageSize, }), [pageIndex, pageSize])
    const pathName = usePathname()
    const [columnFilters, setColumnFilters] = useState([]) //Column filter

    const columnsWithSelection = useMemo(() => {
        if (!quickSumEnabled) return columns
        const selectCol = {
            id: "select",
            header: ({ table }) => (
                <div className="flex items-center justify-center w-full h-full">
                    <input type="checkbox" checked={table.getIsAllPageRowsSelected()}
                        ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected() }}
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                        className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: '#BCE1FE' }} />
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center w-full h-full">
                    <input type="checkbox" checked={row.getIsSelected()} disabled={!row.getCanSelect()}
                        onChange={row.getToggleSelectedHandler()}
                        className="w-4 h-4 cursor-pointer rounded" style={{ accentColor: '#BCE1FE' }} />
                </div>
            ),
            enableSorting: false, enableColumnFilter: false, size: 50, minSize: 50, maxSize: 50,
        }
        return [selectCol, ...(columns || [])]
    }, [columns, quickSumEnabled])

    const table = useReactTable({
        columns: columnsWithSelection, data,
        enableRowSelection: quickSumEnabled,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        filterFns: {
            dateBetweenFilterFn,
        },
        state: {
            globalFilter,
            columnVisibility,
            pagination,
            columnFilters,
            rowSelection,
        },
        onColumnFiltersChange: setColumnFilters, ////Column filter
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

    useEffect(() => {
        setFilteredData(table.getFilteredRowModel().rows.map(x => x.original))
    }, [columnFilters])

    const resetTable = () => {
        table.resetColumnFilters()
    }
    return (
        <div className="flex flex-col relative rounded-2xl border border-[#b8ddf8] bg-white">
            <div>
                <div className="flex-shrink-0 rounded-t-2xl" style={{ borderBottom: '1px solid #b8ddf8', background: '#ffffff' }}>
                    <Header globalFilter={globalFilter} setGlobalFilter={setGlobalFilter}
                        table={table} excellReport={excellReport} //cb={cb}
                        filterIcon={FiltersIcon(ln, filterOn, setFilterOn)}
                        resetFilterTable={ResetFilterTableIcon(ln, resetTable, filterOn)}
                        quickSumEnabled={quickSumEnabled}
                        setQuickSumEnabled={setQuickSumEnabled}
                        quickSumColumns={quickSumColumns}
                        setQuickSumColumns={setQuickSumColumns}
                    />
                </div>

                <div className=" overflow-x-auto">
                    <table className="w-full">
                        <thead className="divide-y">
                            {table.getHeaderGroups().map((hdGroup, i) =>
                                <Fragment key={hdGroup.id}>
                                    <tr className="cursor-pointer bg-[#dbeeff]">
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id} className="font-poppins text-xs font-medium text-[var(--chathams-blue)] table_cell py-1.5 text-left">
                                                    {header.column.columnDef.ttlUS}
                                                </th>
                                        )}
                                    </tr>
                                    <tr className="cursor-pointer bg-[#dbeeff]">
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id} className="font-poppins text-xs font-medium text-[var(--chathams-blue)] table_cell py-1.5 text-left">
                                                    {header.column.columnDef.ttlEU}
                                                </th>
                                        )}
                                    </tr>
                                    <tr key={hdGroup.id + '-row'} className='border-b'>
                                        {hdGroup.headers.map(
                                            header =>
                                                <th key={header.id + '-header'} className={`relative px-6 py-1 text-left text-sm font-medium  uppercase
                                     border-b ${header.column.columnDef.bgt}`}>
                                                    {header.column.getCanSort() ?

                                                        <div onClick={header.column.getToggleSortingHandler()}
                                                            className='table-caption cursor-pointer items-center gap-1 text-white text-xs'>
                                                            {header.column.columnDef.header}
                                                            {
                                                                {
                                                                    asc: <TbSortAscending className="text-[var(--regent-gray)] scale-125" />,
                                                                    desc: <TbSortDescending className="text-[var(--regent-gray)] scale-125" />
                                                                }[header.column.getIsSorted()]
                                                            }
                                                        </div>
                                                        :
                                                        <span className="text-white table-caption">{header.column.columnDef.header}</span>
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
                                <tr key={row.id} onClick={() => setSelectedRowId(row.id)} className={`cursor-pointer transition-colors${selectedRowId === row.id ? ' selected-row' : ' cursor-pointer'}`} onDoubleClick={() => SelectRow(row.original)}>
                                    {row.getVisibleCells().map(cell => {
                                        if (cell.column.id === 'select') {
                                            return (
                                                <td key={cell.id} className="px-2 py-0.5 text-center" style={{ whiteSpace: 'nowrap', minWidth: '50px', maxWidth: '50px' }}>
                                                    <div className="flex justify-center">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </div>
                                                </td>
                                            )
                                        }
                                        return (
                                            <td key={cell.id} data-label={cell.column.columnDef.header} className={`table_cell text-xs md:py-3 ${cell.column.columnDef.bgr}`} style={{ whiteSpace: 'nowrap' }}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex p-2 flex-wrap flex-shrink-0 rounded-b-2xl" style={{ borderTop: '1px solid #b8ddf8', background: '#ffffff' }}>
                    <div className="hidden lg:flex text-[var(--regent-gray)] text-sm w-48 xl:w-96 p-2 items-center">
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