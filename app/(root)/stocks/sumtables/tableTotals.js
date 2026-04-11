'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import { TbSortDescending, TbSortAscending } from "react-icons/tb"
import { usePathname } from 'next/navigation'
import { useMemo, useCallback } from 'react'
import '../../contracts/style.css'
import { getTtl } from "@utils/languages"
import Tltip from "@components/tlTip"
import { detailsToolTip } from "./tablesFuncs"

const CURRENCIES = {
  USD: { symbol: '$', code: 'usd', label: 'Total $' },
  EUR: { symbol: '€', code: 'eur', label: 'Total €' }
}

const Customtable = ({ data, columns, ln, ttl, settings, dataTable, rmrk }) => {
  const pathname = usePathname()

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // Memoized formatters
  const formatCurrency = useCallback((amount, currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount)
  }, [])

  const formatNumber = useCallback((amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 3
    }).format(amount)
  }, [])

  // Memoized totals calculation
  const totals = useMemo(() => {
    const result = {}
    Object.keys(CURRENCIES).forEach(cur => {
      const filtered = data.filter(item => item.cur === cur)
      result[cur] = {
        quantity: filtered.reduce((sum, item) => sum + (item.qnty || 0), 0),
        total: filtered.reduce((sum, item) => sum + (item.total || 0), 0)
      }
    })
    return result
  }, [data])

  const renderTotalRow = useCallback((currency) => {
    const config = CURRENCIES[currency]
    const { quantity, total } = totals[currency]

    return (
      <tr key={currency}>
        {columns.map((col, index) => (
          <td
            key={`${currency}-${index}`}
            className="responsiveTextTable font-medium text-center"
            style={{
              color: 'var(--chathams-blue)',
              background: '#dbeeff',
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {index === 0 ? config.label : index === 2 ? formatNumber(quantity) : index === 3 ? formatCurrency(total, config.code) : ''}
          </td>
        ))}
      </tr>
    )
  }, [totals, columns, formatNumber, formatCurrency])

  return (
    <div className="w-full">
      <div
        className="w-full"
        style={{
          borderRadius: '16px',
          border: '1px solid #b8ddf8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
      >
        {/* Title */}
        <div
          className="responsiveTextTable font-medium text-center"
          style={{
            background: '#dbeeff',
            padding: '8px 16px',
            borderBottom: '1px solid #b8ddf8',
            color: 'var(--chathams-blue)',
            fontWeight: '500'
          }}
        >
          Summary - Stocks
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
            <thead>
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id}>
                  {hdGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="responsiveTextTable font-medium text-center"
                      style={{
                        color: 'var(--chathams-blue)',
                        background: '#dbeeff',
                        padding: '6px 10px',
                        borderBottom: '1px solid #b8ddf8',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header.column.getCanSort() ? (
                        <div onClick={header.column.getToggleSortingHandler()} className="flex cursor-pointer items-center gap-1 justify-center">
                          {header.column.columnDef.header}
                          {header.column.getIsSorted() === 'asc' && <TbSortAscending className="text-[var(--endeavour)] scale-110" />}
                          {header.column.getIsSorted() === 'desc' && <TbSortDescending className="text-[var(--endeavour)] scale-110" />}
                        </div>
                      ) : (
                        <span>{header.column.columnDef.header}</span>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="cursor-pointer hover:bg-[var(--selago)]">
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="responsiveTextTable text-center"
                        style={{
                          color: 'var(--chathams-blue)',
                          padding: '6px 10px',
                          borderBottom: '1px solid #E5E7EB',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Tltip direction='right' tltpText={detailsToolTip(row, data, settings, dataTable, rmrk)}>
                          <span>{flexRender(cell.column.columnDef.cell, cell.getContext())}</span>
                        </Tltip>
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="responsiveTextTable text-center py-8" style={{ color: 'var(--regent-gray)' }}>
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              {Object.keys(CURRENCIES).map(currency => renderTotalRow(currency))}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Customtable;