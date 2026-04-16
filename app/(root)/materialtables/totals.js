'use client'

import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { useMemo, useState } from "react"

const Customtable = ({ data, columns }) => {
    const [globalFilter, setGlobalFilter] = useState('')
    const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 500 })
    const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize])

    const table = useReactTable({
        columns, data,
        getCoreRowModel: getCoreRowModel(),
        state: { globalFilter, pagination },
        getFilteredRowModel: getFilteredRowModel(),
        onGlobalFilterChange: setGlobalFilter,
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onPaginationChange: setPagination,
    })

    return (
        <div className="w-full overflow-x-auto">
            {/* Desktop */}
            <table
                className="w-full hidden sm:table"
                style={{
                    tableLayout: 'auto',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                }}
            >
                <thead>
                    {table.getHeaderGroups().map(hg => (
                        <tr key={hg.id}>
                            {hg.headers.map((header, idx) => {
                                const colId = header.column.id
                                const isDel = colId === 'del'
                                const isFirst = idx === 0
                                const nonDelHeaders = hg.headers.filter(h => h.column.id !== 'del')
                                const isLast = header.id === nonDelHeaders[nonDelHeaders.length - 1]?.id
                                const colMinWidth = colId === 'material' ? '150px' : colId === 'kgs' ? '68px' : isDel ? '26px' : '50px'
                                return (
                                    <th
                                        key={header.id}
                                        className="responsiveTextTable"
                                        style={{
                                            backgroundColor: isDel ? 'transparent' : '#dbeeff',
                                            color: 'var(--chathams-blue)',
                                            padding: isDel ? '0' : '5px 6px',
                                                                                        fontWeight: '600',
                                            textAlign: colId === 'material' ? 'left' : 'center',
                                            border: 'none',
                                            whiteSpace: 'nowrap',
                                            borderTopLeftRadius: isFirst ? '10px' : '0',
                                            borderTopRightRadius: isLast ? '10px' : '0',
                                            minWidth: colMinWidth,
                                        }}
                                    >
                                        {isDel ? null : colId === 'material' ? '' : header.column.columnDef.header}
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map((row) => {
                        const nonDelCells = row.getVisibleCells().filter(c => c.column.id !== 'del')
                        return (
                            <tr key={row.id}>
                                {row.getVisibleCells().map((cell) => {
                                    const colId = cell.column.id
                                    const isDel = colId === 'del'
                                    const isFirst = cell.id === nonDelCells[0]?.id
                                    const isLast = cell.id === nonDelCells[nonDelCells.length - 1]?.id
                                    const colMinWidth = colId === 'material' ? '150px' : colId === 'kgs' ? '68px' : isDel ? '26px' : '50px'
                                    return (
                                        <td
                                            key={cell.id}
                                            className="responsiveTextTable"
                                            style={{
                                                backgroundColor: isDel ? 'transparent' : '#ede9fe',
                                                color: 'var(--chathams-blue)',
                                                padding: isDel ? '0' : '5px 6px',
                                                                                                fontWeight: '600',
                                                textAlign: colId === 'material' ? 'left' : 'center',
                                                border: 'none',
                                                whiteSpace: 'nowrap',
                                                borderTopLeftRadius: '0',
                                                borderBottomLeftRadius: isFirst ? '10px' : '0',
                                                borderTopRightRadius: '0',
                                                borderBottomRightRadius: isLast ? '10px' : '0',
                                                minWidth: colMinWidth,
                                            }}
                                        >
                                            {isDel
                                                ? null
                                                : colId === 'material'
                                                ? 'Total'
                                                : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cell.getContext().getValue())}
                                        </td>
                                    )
                                })}
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* Mobile */}
            <div className="sm:hidden flex flex-col gap-3 p-3">
                {table.getRowModel().rows.map((row) => (
                    <div
                        key={row.id}
                        className="rounded-2xl overflow-hidden"
                        style={{ backgroundColor: '#ede9fe', border: 'none' }}
                    >
                        <div className="p-3 space-y-2">
                            {row.getVisibleCells().map((cell) => {
                                if (cell.column.id === 'del') return null
                                return (
                                    <div key={cell.id} className="flex justify-between items-center">
                                        <span style={{ color: 'var(--regent-gray)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {cell.column.columnDef.header}
                                        </span>
                                        <span style={{ color: 'var(--chathams-blue)', fontSize: 'inherit', fontWeight: '600' }}>
                                            {cell.column.id !== 'material'
                                                ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cell.getContext().getValue())
                                                : 'Total'}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Customtable
