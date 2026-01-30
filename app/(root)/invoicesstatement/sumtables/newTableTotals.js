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
                borderColor: '#e0e0e0',
                borderWidth: 1,
                borderRadius: '16px', // more rounded overall
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
            <div className="px-4 py-2.5"
                style={{
                    // background: '#eaf4ff',
                    // borderBottom: '1px solid #e0e0e0',
                    borderTopLeftRadius: '16px', // more rounded
                    borderTopRightRadius: '12px'
                }}>
                <p className="text-[#183d79] font-semibold uppercase"
                    style={{
                        fontSize: 'clamp(12px, 1vw, 15px)',
                        letterSpacing: '0.05em'
                    }}>
                    {getTtl(ttl, ln)}
                </p>
            </div>
            <div style={{
                borderLeft: '8px solid #1D3D79',
                borderTopLeftRadius: '32px',    // << more rounded left top
                borderBottomLeftRadius: '32px', // << more rounded left bottom
                borderTopRightRadius: '0px',
                borderBottomRightRadius: '0px',
                overflow: 'hidden'
            }}>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            {table1.getHeaderGroups().map(hdGroup =>
                                <tr key={hdGroup.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                    {hdGroup.headers.map(header =>
                                        <th key={header.id}
                                            className="relative px-6 py-2 text-left font-medium uppercase"
                                            style={{
                                                fontSize: 'clamp(10px, 1vw, 13px)',
                                                color: '#183d79',
                                                letterSpacing: '0.05em',
                                                background: '#d4eafc',
                                                borderRight: '1px solid #e0e0e0',
                                                borderBottom: '1px solid #e0e0e0'
                                            }}>
                                            {header.column.getCanSort() ?
                                                <div onClick={header.column.getToggleSortingHandler()} className="flex cursor-pointer items-center gap-1">
                                                    {header.column.columnDef.header}
                                                    {(() => {
                                                        const sorted = header.column.getIsSorted();
                                                        if (sorted === 'asc') return <TbSortAscending className="text-[#183d79] scale-125" />;
                                                        if (sorted === 'desc') return <TbSortDescending className="text-[#183d79] scale-125" />;
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
                                <tr key={row.id} style={{ borderBottom: '1px solid #e0e0e0' }} className='hover:bg-[#f9f9f9] transition'>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} data-label={cell.column.columnDef.header}
                                            className="px-6 py-2 items-center"
                                            style={{
                                                fontSize: 'clamp(10px, 1vw, 13px)',
                                                color: cell.column.id === 'amount' ? '#183d79' : '#1F2937',
                                                fontWeight: cell.column.id === 'amount' ? 500 : 400,
                                                textAlign: cell.column.id === 'amount' ? 'right' : 'left',
                                                borderRight: '1px solid #e0e0e0',
                                                borderBottom: '1px solid #e0e0e0'
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
                            <tr style={{
                                background: '#eaf4ff', // match header
                                fontWeight: 600
                            }}>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                    borderRight: '1px solid #e0e0e0'
                                    }}>
                                    Total $
                                </th>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                    borderRight: '1px solid #e0e0e0'
                                    }}>
                                    {showAmount(usdTotals.invoices, 'usd')}
                                </th>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                    borderRight: '1px solid #e0e0e0'
                                    }}>
                                    {showAmount(usdTotals.payments, 'usd')}
                                </th>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)'
                                    }}>
                                    {showAmount(usdTotals.balance, 'usd')}
                                </th>
                            </tr>
                            <tr style={{
                                background: '#f9f9f9', borderTop: '1px solid #e0e0e0', borderBottom: '1px solid #e0e0e0'
                            }}>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                    borderRight: '1px solid #e0e0e0'
                                    }}>
                                    Total €
                                </th>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                    borderRight: '1px solid #e0e0e0'
                                    }}>
                                    {showAmount(eurTotals.invoices, 'eur')}
                                </th>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                    borderRight: '1px solid #e0e0e0'
                                    }}>
                                    {showAmount(eurTotals.payments, 'eur')}
                                </th>
                                <th className="relative px-2 py-2 text-left font-medium uppercase"
                                    style={{
                                    color: '#183d79',
                                    fontSize: 'clamp(10px, 1vw, 13px)'
                                    }}>
                                    {showAmount(eurTotals.balance, 'eur')}
                                </th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {/* Mobile View - Card Layout */}
                <div className="md:hidden">
                    <div className="divide-y" style={{ borderColor: '#e0e0e0' }}>
                        {table1.getRowModel().rows.map(row => (
                            <div key={row.id} className="p-4 bg-white hover:bg-[#f9f9f9] transition-colors" style={{ borderBottom: '1px solid #e0e0e0' }}>
                                <Tltip direction='top' tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}>
                                    <div className="space-y-2.5">
                                        {row.getVisibleCells().map((cell) => (
                                            <div key={cell.id} className="flex justify-between items-start gap-4">
                                                <span className="uppercase tracking-wide flex-shrink-0 min-w-[100px]"
                                                    style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79', letterSpacing: '0.05em' }}>
                                                    {cell.column.columnDef.header}
                                                </span>
                                                <span style={{
                                                    fontSize: 'clamp(10px, 1vw, 13px)',
                                                    fontWeight: cell.column.id === 'amount' ? 500 : 400,
                                                    color: cell.column.id === 'amount' ? '#183d79' : '#1F2937',
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
                    <div className="border-t-2" style={{ background: '#f9f9f9', borderTop: '2px solid #e0e0e0' }}>
                        {/* USD Totals */}
                        <div className="p-4 border-b" style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <div className="space-y-2.5">
                                <div className="pb-2 mb-2 border-b" style={{ borderColor: '#e0e0e0', background: '#d4eafc' }}>
                                    <span className="uppercase tracking-wide"
                                        style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        Total $ (USD)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79' }}>
                                        {columns[1]?.header || 'Invoices'}
                                    </span>
                                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        {showAmount(usdTotals.invoices, 'usd')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79' }}>
                                        {columns[2]?.header || 'Payments'}
                                    </span>
                                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        {showAmount(usdTotals.payments, 'usd')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79' }}>
                                        {columns[3]?.header || 'Balance'}
                                    </span>
                                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        {showAmount(usdTotals.balance, 'usd')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* EUR Totals */}
                        <div className="p-4" style={{ borderBottom: '1px solid #e0e0e0' }}>
                            <div className="space-y-2.5">
                                <div className="pb-2 mb-2 border-b" style={{ borderColor: '#e0e0e0', background: '#d4eafc' }}>
                                    <span className="uppercase tracking-wide"
                                        style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        Total € (EUR)
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79' }}>
                                        {columns[1]?.header || 'Invoices'}
                                    </span>
                                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        {showAmount(eurTotals.invoices, 'eur')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79' }}>
                                        {columns[2]?.header || 'Payments'}
                                    </span>
                                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        {showAmount(eurTotals.payments, 'eur')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 600, color: '#183d79' }}>
                                        {columns[3]?.header || 'Balance'}
                                    </span>
                                    <span style={{ fontSize: 'clamp(10px, 1vw, 13px)', fontWeight: 700, color: '#183d79' }}>
                                        {showAmount(eurTotals.balance, 'eur')}
                                    </span>
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