'use client'

import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import CurrencyChip from '../../../../components/CurrencyChip'
import Tltip from '../../../../components/tlTip'

/* The four figure columns are bounded — each is sized to the wider of its header and
   its values — and Description is the one free-text column, so under table-layout:fixed
   it takes whatever is left. That is what lets this card be handed any width and still
   fit: on a 1920 row Description gets ~730px and a full grade name reads end to end, at
   1280 it gets ~120px and truncates. Nothing ever scrolls sideways. */
const COL_W = { weight: 112, avg: 96, value: 100, cur: 72 }

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
    color: 'var(--ink-muted)',
    background: 'var(--bg-subtle)',
    padding: '6px 10px',
    borderBottom: '1px solid var(--line)',
    whiteSpace: 'nowrap',
    fontWeight: 600,
    /* --fs-table, matching the responsiveTextTable cells below it. At --fs-body
       the header sat a rung ABOVE its own rows, the same inversion the detail
       popups had. */
    fontSize: 'var(--fs-table)',
  }

  const tdStyle = {
    color: 'var(--ink)',
    padding: '6px 10px',
    borderBottom: '1px solid var(--line)',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }

  return (
    <div className="mt-5 flex-auto min-w-0">
      <div
        style={{
          borderRadius: '16px',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-xs)',
          overflow: 'hidden',
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
          Avg Cost Price per Grade
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Description</th>
                <th className="responsiveTextTable font-medium text-center" style={{ ...thStyle, width: COL_W.weight }}>Total Weight (MT)</th>
                <th className="responsiveTextTable font-medium text-center" style={{ ...thStyle, width: COL_W.avg }}>Avg Cost /MT</th>
                <th className="responsiveTextTable font-medium text-center" style={{ ...thStyle, width: COL_W.value }}>Total Value</th>
                <th className="responsiveTextTable font-medium text-center" style={{ ...thStyle, width: COL_W.cur }}>Currency</th>
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
                  <tr style={{ background: 'var(--bg-card)', cursor: canExpand ? 'pointer' : 'default' }}
                    onClick={() => canExpand && toggle(key)}>
                    <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '14px' }}>
                      <Tltip direction='top' tltpText={r.descriptionName}>
                        <span className='flex items-center gap-1 cursor-default w-full'>
                          {canExpand && (
                            <ChevronRight className='w-3 h-3 shrink-0 transition-transform'
                              style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'var(--endeavour)' }} />
                          )}
                          <span className='block truncate min-w-0'>{r.descriptionName}</span>
                        </span>
                      </Tltip>
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
                    {/* Regular weight — the Summary table's money cells are not bold,
                        and the two cards must read as one set. */}
                    <td className="responsiveTextTable" style={tdStyle}>
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
                      <CurrencyChip cur={isoCode} />
                    </td>
                  </tr>
                  {isOpen && r.suppliers.map((s, k) => (
                    <tr key={`${i}-sup-${k}`} style={{ background: 'var(--surface-pill)' }}>
                      <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '34px', color: 'var(--regent-gray)' }}>
                        <Tltip direction='top' tltpText={s.supplier}>
                          <span className='block truncate cursor-default w-full'>{s.supplier}</span>
                        </Tltip>
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
