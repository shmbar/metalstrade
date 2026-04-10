'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { usePathname } from 'next/navigation'
import '../../contracts/style.css'
import { getTtl } from "../../../../utils/languages"
import Tltip from "../../../../components/tlTip"
import { detailsToolTip } from "./sumTablesFuncs"

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
        <div className="custom-table-totals bg-white rounded-xl shadow border overflow-hidden"
            style={{
                borderColor: 'var(--selago)',
                borderWidth: 1,
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
            <div className="px-4 py-2.5"
                style={{
                    background: '#dbeeff',
                    borderBottom: '1px solid var(--rock-blue)',
                    borderTopLeftRadius: '16px',
                    borderTopRightRadius: '12px'
                }}>
                <h3 className="responsiveTextTable text-[var(--chathams-blue)] font-medium font-poppins text-center"
                    style={{
                        letterSpacing: '0.02em'
                    }}>
                    {getTtl(ttl, ln)}
                </h3>
            </div>
            <div style={{ overflow: 'hidden' }}>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            {table1.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} style={{ borderBottom: '1px solid var(--selago)' }}>
                                    {hdGroup.headers.map(header =>
                                        <th key={header.id}
                                            className="responsiveTextTable relative px-6 py-2 text-left font-medium font-poppins uppercase"
                                            style={{
                                                color: 'var(--chathams-blue)',
                                                letterSpacing: '0.05em',
                                                borderRight: '1px solid var(--selago)',
                                                borderBottom: '1px solid var(--selago)'
                                            }}>
                                            {header.column.getCanSort() ?
                                                <div onClick={header.column.getToggleSortingHandler()} className="flex cursor-pointer items-center gap-1">
                                                    {header.column.columnDef.header}
                                                    {(() => {
                                                        const sorted = header.column.getIsSorted();
                                                        if (sorted === 'asc') return <TbSortAscending className="text-[var(--chathams-blue)] scale-125" />;
                                                        if (sorted === 'desc') return <TbSortDescending className="text-[var(--chathams-blue)] scale-125" />;
                                                        return null;
                                                    })()}
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
                                <tr key={row.id} style={{ borderBottom: '1px solid var(--selago)' }} className='hover:bg-[#f8fbff] transition'>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} data-label={cell.column.columnDef.header}
                                            className="responsiveTextTable px-6 py-1 items-center"
                                            style={{
                                                color: cell.column.id === 'amount' ? 'var(--chathams-blue)' : 'var(--port-gore)',
                                                fontWeight: cell.column.id === 'amount' ? 500 : 400,
                                                textAlign: cell.column.id === 'amount' ? 'right' : 'left',
                                                borderRight: '1px solid var(--selago)',
                                                borderBottom: '1px solid var(--selago)'
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
                            <tr style={{ background: '#dbeeff', fontWeight: 500 }}>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)', borderRight: '1px solid var(--selago)' }}>
                                    Total $:
                                </th>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)', borderRight: '1px solid var(--selago)' }}>
                                    {showAmount(usdTotals.invoices, 'usd')}
                                </th>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)', borderRight: '1px solid var(--selago)' }}>
                                    {showAmount(usdTotals.payments, 'usd')}
                                </th>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)' }}>
                                    {showAmount(usdTotals.balance, 'usd')}
                                </th>
                            </tr>
                            <tr style={{ background: '#dbeeff', borderTop: '1px solid var(--rock-blue)' }}>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)', borderRight: '1px solid var(--selago)' }}>
                                    Total €:
                                </th>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)', borderRight: '1px solid var(--selago)' }}>
                                    {showAmount(eurTotals.invoices, 'eur')}
                                </th>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)', borderRight: '1px solid var(--selago)' }}>
                                    {showAmount(eurTotals.payments, 'eur')}
                                </th>
                                <th className="responsiveTextTable relative px-2 py-2 text-left font-medium"
                                    style={{ color: 'var(--chathams-blue)' }}>
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
                            <div key={row.id} className="p-4 bg-white hover:bg-[#f8fbff] transition-colors" style={{ borderBottom: '1px solid var(--selago)' }}>
                                <Tltip direction='top' tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}>
                                    <div className="space-y-2.5">
                                        {row.getVisibleCells().map((cell) => (
                                            <div key={cell.id} className="flex justify-between items-start gap-4">
                                                <span className="responsiveTextTable uppercase tracking-wide flex-shrink-0 min-w-[100px]"
                                                    style={{ fontWeight: 500, color: 'var(--chathams-blue)', letterSpacing: '0.05em' }}>
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
                    <div className="border-t-2" style={{ background: '#dbeeff', borderTop: '1px solid var(--rock-blue)' }}>
                        {/* USD Totals */}
                        <div className="p-4 border-b" style={{ borderBottom: '1px solid var(--rock-blue)' }}>
                            <div className="space-y-2.5">
                                <div className="pb-2 mb-2">
                                    <span className="responsiveTextTable uppercase tracking-wide" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>
                                        Total $ (USD)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{columns[1]?.header || 'Invoices'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{showAmount(usdTotals.invoices, 'usd')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{columns[2]?.header || 'Payments'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{showAmount(usdTotals.payments, 'usd')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{columns[3]?.header || 'Balance'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{showAmount(usdTotals.balance, 'usd')}</span>
                                </div>
                            </div>
                        </div>
                        {/* EUR Totals */}
                        <div className="p-4" style={{ borderBottom: '1px solid var(--rock-blue)' }}>
                            <div className="space-y-2.5">
                                <div className="pb-2 mb-2">
                                    <span className="responsiveTextTable uppercase tracking-wide" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>
                                        Total € (EUR)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{columns[1]?.header || 'Invoices'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{showAmount(eurTotals.invoices, 'eur')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{columns[2]?.header || 'Payments'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{showAmount(eurTotals.payments, 'eur')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{columns[3]?.header || 'Balance'}</span>
                                    <span className="responsiveTextTable" style={{ fontWeight: 500, color: 'var(--chathams-blue)' }}>{showAmount(eurTotals.balance, 'eur')}</span>
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
