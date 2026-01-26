'use client'

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table"

import Tltip from "../../../../components/tlTip"
import { expensesToolTip } from "./funcs"

const TABLE_WIDTH = "340px"

const Customtable = ({ data, columns, expensesData, settings, title, filt }) => {

  const table1 = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const showAmount = (x, y) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: y,
      minimumFractionDigits: 2
    }).format(x)

  const rows = table1.getRowModel().rows
  const isMulti = rows.length > 1

  return (
    <div
      className="bg-white rounded-xl shadow border overflow-hidden"
      style={{ width: TABLE_WIDTH }}
    >
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
        .custom-table-totals, .custom-table-totals * {
          font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 10px !important;
          transition-property: color, background-color, border-color, box-shadow !important;
          transition-duration: 150ms !important;
          transition-timing-function: ease-in-out !important;
        }
      `}</style>

      <div className="custom-table-totals">
        {/* HEADER */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-[#d4eafc] to-[#bce1fe]">
          <p className="text-[#183d79] font-semibold uppercase" style={{ fontSize: 'clamp(10px, 1vw, 13px)', letterSpacing: '0.05em' }}>{title}</p>
        </div>

        {/* BODY */}
        <div className={isMulti ? 'divide-y' : ''}>
          {rows.map(row => (
            <Tltip
              key={row.id}
              direction="right"
              tltpText={expensesToolTip(row, expensesData, settings, filt)}
            >
              <div className="grid grid-cols-[1fr_auto] px-4 py-2.5 items-center hover:bg-[#f9f9f9] transition">
                {row.getVisibleCells().map(cell => (
                  <div
                    key={cell.id}
                    className={
                      cell.column.id === 'amount'
                        ? 'font-medium text-right'
                        : 'truncate'
                    }
                    style={{
                      color: cell.column.id === 'amount' ? '#183d79' : '#1F2937',
                      fontSize: 'clamp(10px, 1vw, 13px)',
                      fontWeight: cell.column.id === 'amount' ? 500 : 400,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            </Tltip>
          ))}
        </div>

        {/* TOTALS */}
        <div className={`border-t px-4 py-3 ${isMulti ? 'bg-[#f9f9f9]' : 'bg-white'}`}>
          <div className="flex justify-between font-semibold" style={{ color: '#183d79', fontSize: 'clamp(10px, 1vw, 13px)' }}>
            <span>Total $</span>
            <span>
              {showAmount(
                data.filter(i => i.cur === 'us').reduce((s, i) => s + i.amount, 0),
                'usd'
              )}
            </span>
          </div>
          <div className="flex justify-between font-semibold mt-1" style={{ color: '#183d79', fontSize: 'clamp(10px, 1vw, 13px)' }}>
            <span>Total €</span>
            <span>
              {showAmount(
                data.filter(i => i.cur === 'eu').reduce((s, i) => s + i.amount, 0),
                'eur'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Customtable