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
        <div className="w-full">
            {/* Card header */}
            <div className="flex items-baseline gap-2 px-3.5 py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="font-display font-semibold responsiveTextTitle text-[var(--ink)]">Totals</span>
                <span className="responsiveText text-[var(--ink-muted)]">All tables</span>
            </div>

            <div className="w-full overflow-x-auto">
                {/* Desktop */}
                {/* custom-table: the app-wide table standard in globals.css. */}
                <table
                    className="custom-table w-full hidden sm:table"
                    style={{
                        tableLayout: 'auto',
                        borderCollapse: 'separate',
                        borderSpacing: 0,
                        fontFamily: 'inherit',
                    }}
                >
                    <thead>
                        {table.getHeaderGroups().map(hg => (
                            <tr key={hg.id}>
                                {hg.headers.map((header) => {
                                    const colId = header.column.id
                                    const isDel = colId === 'del'
                                    const colMinWidth = colId === 'material' ? '150px' : colId === 'kgs' ? '68px' : isDel ? '26px' : '50px'
                                    return (
                                        <th
                                            key={header.id}
                                            style={{
                                                /* Size, weight, colour, background, uppercase
                                                   and tracking come from .custom-table th. This
                                                   header had drifted to --fs-body (12px) against
                                                   the standard's --fs-table (11px).
                                                   What stays is content-driven, not styling: the
                                                   material column is long free text and reads
                                                   left, and the del column is an icon with no
                                                   padding. */
                                                padding: isDel ? '0' : undefined,
                                                textAlign: colId === 'material' ? 'left' : undefined,
                                                border: 'none',
                                                whiteSpace: 'nowrap',
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
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map((cell) => {
                                    const colId = cell.column.id
                                    const isDel = colId === 'del'
                                    const colMinWidth = colId === 'material' ? '150px' : colId === 'kgs' ? '68px' : isDel ? '26px' : '50px'
                                    return (
                                        <td
                                            key={cell.id}
                                            className="responsiveTextTable"
                                            style={{
                                                backgroundColor: 'var(--bg-subtle)',
                                                color: 'var(--ink)',
                                                padding: isDel ? '0' : '6px 6px',
                                                fontWeight: '600',
                                                fontVariantNumeric: 'tabular-nums',
                                                textAlign: colId === 'material' ? 'left' : 'center',
                                                border: 'none',
                                                borderTop: '1px solid var(--line-strong)',
                                                whiteSpace: 'nowrap',
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
                        ))}
                    </tbody>
                </table>

                {/* Mobile */}
                <div className="sm:hidden flex flex-col gap-3 p-3" style={{ fontFamily: 'inherit' }}>
                    {table.getRowModel().rows.map((row) => (
                        <div
                            key={row.id}
                            className="rounded-2xl overflow-hidden shadow-card"
                            style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--line)' }}
                        >
                            <div className="p-3 space-y-2">
                                {row.getVisibleCells().map((cell) => {
                                    if (cell.column.id === 'del') return null
                                    return (
                                        <div key={cell.id} className="flex justify-between items-center">
                                            <span style={{ color: 'var(--ink-muted)', fontSize: 'var(--fs-caption)', fontWeight: '600' }}>
                                                {cell.column.columnDef.header}
                                            </span>
                                            <span className="responsiveTextTable" style={{ color: 'var(--ink)', fontSize: 'inherit', fontWeight: '400', fontVariantNumeric: 'tabular-nums' }}>
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
        </div>
    )
}

export default Customtable
