'use client'

import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { NumericFormat } from 'react-number-format'

// Group stock rows by grade (descriptionName + currency), returning total
// quantity and the weighted average cost per MT for each grade. Shared between
// the on-screen "Avg Cost Price per Grade" table and the Excel export so both
// reflect the same (filtered) data.
export const computeGradeSummary = (dataTable, settings) => {
  if (!dataTable || dataTable.length === 0) return []

  const gCur = (id) => settings?.Currency?.Currency?.find(q => q.id === id)?.cur || id
  const supName = (id) => settings?.Supplier?.Supplier?.find(q => q.id === id)?.nname
    || (id && id !== '-' ? String(id) : '(no supplier)')

  // Group by descriptionName + cur, sum qnty and total value; keep a per-supplier
  // split inside each group so the row can expand to show who supplied how much.
  const groups = {}
  dataTable.forEach(row => {
    const name = row.descriptionName || '-'
    const curId = row.cur || ''
    const key = `${name}|${curId}`
    if (!groups[key]) {
      groups[key] = { descriptionName: name, curId, totalQnty: 0, totalValue: 0, bySupplier: {} }
    }
    const qty = parseFloat(row.qnty) || 0
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0
    groups[key].totalQnty += qty
    groups[key].totalValue += val
    const sup = supName(row.supplier)
    if (!groups[key].bySupplier[sup]) groups[key].bySupplier[sup] = { supplier: sup, qnty: 0, value: 0 }
    groups[key].bySupplier[sup].qnty += qty
    groups[key].bySupplier[sup].value += val
  })

  return Object.values(groups)
    .filter(r => r.totalQnty > 0.1)
    .sort((a, b) => a.descriptionName.localeCompare(b.descriptionName))
    .map(r => {
      const curCode = gCur(r.curId)
      const isoCode = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD'
      return {
        ...r,
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
        suppliers: Object.values(r.bySupplier)
          .filter(s => s.qnty > 0.0005)
          .sort((a, b) => b.value - a.value),
      }
    })
}

const GradeTable = ({ dataTable, loading, settings }) => {
  // Expanded state per grade row (keyed by descriptionName|cur).
  const [expanded, setExpanded] = useState({})

  if (loading) return null

  const rows = computeGradeSummary(dataTable, settings)

  if (rows.length === 0) return null

  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

  const thStyle = {
    color: 'var(--chathams-blue)',
    background: '#dbeeff',
    padding: '6px 10px',
    borderBottom: '1px solid #b8ddf8',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  }

  const tdStyle = {
    color: 'var(--chathams-blue)',
    padding: '6px 10px',
    borderBottom: '1px solid #b8ddf8',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }

  return (
    <div className="mt-5 min-w-[420px]">
      <div
        style={{
          borderRadius: '16px',
          border: '1px solid #b8ddf8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden',
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
          Avg Cost Price per Grade
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Description</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Total Weight (MT)</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Avg Cost /MT</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Total Value</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>$/€</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const { avgPrice, isoCode } = r
                const key = `${r.descriptionName}|${r.curId}`
                const canExpand = (r.suppliers || []).length > 0
                const isOpen = !!expanded[key]
                return (
                  <React.Fragment key={i}>
                  <tr style={{ background: '#fff', cursor: canExpand ? 'pointer' : 'default' }}
                    onClick={() => canExpand && toggle(key)}>
                    <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '14px' }}>
                      <span className='inline-flex items-center gap-1'>
                        {canExpand && (
                          <ChevronRight className='w-3 h-3 shrink-0 transition-transform'
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'var(--endeavour)' }} />
                        )}
                        {r.descriptionName}
                      </span>
                    </td>
                    <td className="responsiveTextTable" style={tdStyle}>
                      <NumericFormat
                        value={r.totalQnty}
                        displayType="text"
                        thousandSeparator
                        decimalScale={3}
                        fixedDecimalScale
                      />
                    </td>
                    <td className="responsiveTextTable" style={tdStyle}>
                      <NumericFormat
                        value={avgPrice}
                        displayType="text"
                        thousandSeparator
                        prefix={isoCode === 'EUR' ? '€' : '$'}
                        decimalScale={2}
                        fixedDecimalScale
                      />
                    </td>
                    <td className="responsiveTextTable" style={{ ...tdStyle, fontWeight: 600 }}>
                      <NumericFormat
                        value={r.totalValue}
                        displayType="text"
                        thousandSeparator
                        prefix={isoCode === 'EUR' ? '€' : '$'}
                        decimalScale={2}
                        fixedDecimalScale
                      />
                    </td>
                    <td className="responsiveTextTable" style={tdStyle}>
                      {isoCode === 'EUR' ? '€' : '$'}
                    </td>
                  </tr>
                  {isOpen && r.suppliers.map((s, k) => (
                    <tr key={`${i}-sup-${k}`} style={{ background: '#f8fbff' }}>
                      <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '34px', color: 'var(--regent-gray)' }}>
                        {s.supplier}
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        <NumericFormat value={s.qnty} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        <NumericFormat value={s.qnty > 0 ? s.value / s.qnty : 0} displayType="text" thousandSeparator
                          prefix={isoCode === 'EUR' ? '€' : '$'} decimalScale={2} fixedDecimalScale />
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        <NumericFormat value={s.value} displayType="text" thousandSeparator
                          prefix={isoCode === 'EUR' ? '€' : '$'} decimalScale={2} fixedDecimalScale />
                      </td>
                      <td style={tdStyle}></td>
                    </tr>
                  ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default GradeTable
