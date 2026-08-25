'use client'
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"

import { usePathname } from 'next/navigation'
import '../../contracts/style.css'
import { getTtl } from "../../../../utils/languages"
import Tltip from "../../../../components/tlTip"
import { detailsToolTip } from "./sumTablesFuncs"
import SortIcon from "@components/table/SortIcon";

const Customtable = ({ data, columns, ln, ttl, settings, dataTable, rmrk }) => {

    const pathname = usePathname()

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
            minimumFractionDigits: x === 0 ? 0 : 2
        }).format(x)
    }

    const calculateTotals = (currency) => {
        const filtered = data.filter(item => item.cur === currency)
        return {
            invoices: filtered.reduce((sum, item) => sum + (item.invAmount ?? 0) + (item.totalInvoices ?? 0), 0),
            payments: filtered.reduce((sum, item) => sum + (item.pmntAmount ?? 0) + (item.totalPmnts ?? 0), 0),
            balance: filtered.reduce((sum, item) => sum + (item.blnc ?? 0) + (item.inDebt ?? 0), 0)
        }
    }

    const usdTotals = calculateTotals("usd")
    const eurTotals = calculateTotals("eur")

    return (
        <div className="custom-table-totals bg-[var(--bg-card)] rounded-2xl shadow border overflow-hidden"
            style={{
                borderColor: 'var(--line)',
                borderWidth: 1,
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(var(--shadow-rgb), 0.08)'
            }}>
            <div className="px-4 py-2.5"
                style={{
                    background: 'var(--bg-subtle)',
                    borderBottom: '1px solid var(--rock-blue)',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '12px'
                }}>
                <h3 className="responsiveTextTable text-[var(--chathams-blue)] font-medium font-sans text-center"
                    style={{
                        letterSpacing: '0.02em'
                    }}>
                    {getTtl(ttl, ln)}
                </h3>
            </div>
            <div style={{ overflow: 'hidden' }}>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    {/* custom-table: the app-wide table standard in globals.css. */}
                    <table className="custom-table w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            {table1.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} style={{ borderBottom: '1px solid var(--selago)' }}>
                                    {hdGroup.headers.map(header =>
                                        /* Band (size, weight, colour, padding, borders,
                                           case, tracking) comes from .custom-table th.
                                           This header was --fs-table but left-aligned at
                                           px-6, so it sat apart from every other header. */
                                        <th key={header.id} className="relative">
                                            {header.column.getCanSort() ?
                                                <div onClick={header.column.getToggleSortingHandler()} className="flex cursor-pointer items-center gap-1">
                                                    {header.column.columnDef.header}
                                                    <SortIcon column={header.column} />
                                                </div>
                                                :
                                                <span>{header.column.columnDef.header}</span>
                                            }
                                        </th>
                                    )}
                                </tr>)}
                        </thead>
                        <tbody>
                            {table1.getRowModel().rows.map(row => (
                                <tr key={row.id} style={{ borderBottom: '1px solid var(--selago)' }} className='hover:bg-[var(--bg-subtle)] transition'>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} data-label={cell.column.columnDef.header}
                                            style={{
                                                /* Size, colour, padding and borders come from
                                                   .custom-table td. What stays is content-driven:
                                                   the amount is a figure, so it takes the 500
                                                   figure weight and right-aligns to put its
                                                   decimal points in a column. */
                                                fontWeight: cell.column.id === 'amount' ? 500 : undefined,
                                                textAlign: cell.column.id === 'amount' ? 'right' : 'left',
                                            }}>
                                            <Tltip direction='right' tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}>
                                                <span>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                            </Tltip>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-subtle)', fontWeight: 500 }}>
                                <th className="relative text-left">
                                    Total $:
                                </th>
                                <th className="relative text-left">
                                    {showAmount(usdTotals.invoices, 'usd')}
                                </th>
                                <th className="relative text-left">
                                    {showAmount(usdTotals.payments, 'usd')}
                                </th>
                                <th className="relative text-left">
                                    {showAmount(usdTotals.balance, 'usd')}
                                </th>
                            </tr>
                            <tr style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--rock-blue)' }}>
                                <th className="relative text-left">
                                    Total €:
                                </th>
                                <th className="relative text-left">
                                    {showAmount(eurTotals.invoices, 'eur')}
                                </th>
                                <th className="relative text-left">
                                    {showAmount(eurTotals.payments, 'eur')}
                                </th>
                                <th className="relative text-left">
                                    {showAmount(eurTotals.balance, 'eur')}
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Mobile View - Card Layout */}
                <div className="md:hidden">
                    <div className="divide-y" style={{ borderColor: 'var(--selago)' }}>
                        {table1.getRowModel().rows.map(row => (
                            <div key={row.id} className="p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] transition-colors" style={{ borderBottom: '1px solid var(--selago)' }}>
                                <Tltip direction='top' tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}>
                                    <div className="space-y-2.5">
                                        {row.getVisibleCells().map((cell) => (
                                            <div key={cell.id} className="flex justify-between items-start gap-4">
                                                <span className="responsiveTextTable font-semibold flex-shrink-0 min-w-[100px]"
                                                    style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>
                                                    {cell.column.columnDef.header}
                                                </span>
                                                <span className="responsiveTextTable" style={{
                                                    fontWeight: cell.column.id === 'amount' ? 500 : 400,
                                                    color: cell.column.id === 'amount' ? 'var(--chathams-blue)' : 'var(--port-gore)',
                                                    textAlign: cell.column.id === 'amount' ? 'right' : 'left',
                                                    wordBreak: 'break-word'
                                                }}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Tltip>
                            </div>
                        ))}
                    </div>
                    {/* Mobile Total Sections */}
                    <div className="border-t-2" style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--rock-blue)' }}>
                        {/* USD Totals */}
                        <div className="p-4 border-b" style={{ borderBottom: '1px solid var(--rock-blue)' }}>
                            <div className="space-y-2.5">
                                <div className="pb-2 mb-2">
                                    <span className="responsiveTextTable font-semibold" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>
                                        Total $:
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{columns[1]?.header || 'Invoices'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{showAmount(usdTotals.invoices, 'usd')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{columns[2]?.header || 'Payments'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{showAmount(usdTotals.payments, 'usd')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{columns[3]?.header || 'Balance'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{showAmount(usdTotals.balance, 'usd')}</span>
                                </div>
                            </div>
                        </div>
                        {/* EUR Totals */}
                        <div className="p-4" style={{ borderBottom: '1px solid var(--rock-blue)' }}>
                            <div className="space-y-2.5">
                                <div className="pb-2 mb-2">
                                    <span className="responsiveTextTable font-semibold" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>
                                        Total €:
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{columns[1]?.header || 'Invoices'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{showAmount(eurTotals.invoices, 'eur')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{columns[2]?.header || 'Payments'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{showAmount(eurTotals.payments, 'eur')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{columns[3]?.header || 'Balance'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 600, color: 'var(--chathams-blue)' }}>{showAmount(eurTotals.balance, 'eur')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Customtable;
