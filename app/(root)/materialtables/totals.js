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

    const totalCols = table.getHeaderGroups()[0]?.headers?.length ?? 0

    return (
        <div className="w-full overflow-x-auto">
            {/* Desktop */}
            <table
                className="w-full hidden sm:table"
                style={{
                    tableLayout: 'auto',
                    borderCollapse: 'separate',
                    borderSpacing: 0,
                    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                }}
            >
                <thead className="hidden" />
                <tbody>
                    {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map((cell, idx) => {
                                if (cell.column.id === 'del') return null
                                const isFirst = idx === 0
                                // last non-del cell
                                const visibleCells = row.getVisibleCells().filter(c => c.column.id !== 'del')
                                const isLast = idx === visibleCells.length - 1
                                return (
                                    <td
                                        key={cell.id}
                                        style={{
                                            backgroundColor: '#ede9fe',
                                            color: 'var(--chathams-blue)',
                                            padding: '5px 6px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            textAlign: cell.column.id === 'material' ? 'left' : 'center',
                                            border: 'none',
                                            whiteSpace: 'nowrap',
                                            borderTopLeftRadius: isFirst ? '10px' : '0',
                                            borderBottomLeftRadius: isFirst ? '10px' : '0',
                                            borderTopRightRadius: isLast ? '10px' : '0',
                                            borderBottomRightRadius: isLast ? '10px' : '0',
                                            minWidth: cell.column.id === 'material' ? '200px' : '55px',
                                        }}
                                    >
                                        {cell.column.id === 'material'
                                            ? 'Total'
                                            : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(cell.getContext().getValue())}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile */}
            <div className="sm:hidden flex flex-col gap-3 p-3">
                {table.getRowModel().rows.map((row, rowIndex) => (
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
                                        <span style={{ color: '#6B7280', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {cell.column.columnDef.header}
                                        </span>
                                        <span style={{ color: 'var(--chathams-blue)', fontSize: '11px', fontWeight: '600' }}>
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
