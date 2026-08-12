'use client'

import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table"
import SortIcon from "@components/table/SortIcon"
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
              color: 'var(--ink)',
              background: 'var(--bg-subtle)',
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
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-xs)',
          overflow: 'hidden'
        }}
      >
        {/* Title */}
        <div
          className="responsiveTextCardTitle text-center"
          style={{
            background: 'var(--bg-subtle)',
            padding: '8px 16px',
            borderBottom: '1px solid var(--line)',
            color: 'var(--ink)',
            fontWeight: '400'
          }}
        >
          Summary - Stocks
        </div>
        <div className="overflow-x-auto">
          {/* custom-table: the app-wide table standard in globals.css. The header
              band below used to be restated inline, one property at a time, and had
              drifted to --fs-body (12px) and 6px/10px padding against the standard's
              --fs-table (11px) and 4px/8px. Inline styles beat the shared rule, so
              they had to come off for the standard to reach this table at all. */}
          <table className="custom-table w-full" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
            <thead>
              {table.getHeaderGroups().map(hdGroup => (
                <tr key={hdGroup.id}>
                  {hdGroup.headers.map(header => (
                    <th
                      key={header.id}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {header.column.getCanSort() ? (
                        <div onClick={header.column.getToggleSortingHandler()} className="flex cursor-pointer items-center gap-1 justify-center">
                          {header.column.columnDef.header}
                          <SortIcon column={header.column} />
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
                  <tr key={row.id} className="cursor-pointer hover:bg-[var(--bg-subtle)]">
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="responsiveTextTable text-center"
                        style={{
                          color: 'var(--ink)',
                          padding: '6px 10px',
                          borderBottom: '1px solid var(--line)',
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
                  <td colSpan={columns.length} className="responsiveTextTable text-center py-8" style={{ color: 'var(--ink-muted)' }}>
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
