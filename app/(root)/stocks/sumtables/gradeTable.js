'use client'

import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import CurrencyChip from '../../../../components/CurrencyChip'
import Tltip from '../../../../components/tlTip'
import { gradeKeyOf, gradeLabel } from './gradeKey'

/* The four figure columns are bounded — each is sized to the wider of its header and
   its values — and Description is the one free-text column, so under table-layout:fixed
   it takes whatever is left. That is what lets this card be handed any width and still
   fit: on a 1920 row Description gets ~730px and a full grade name reads end to end, at
   1280 it gets ~120px and truncates. Nothing ever scrolls sideways. */
const COL_W = { weight: 112, avg: 96, value: 100, cur: 72 }

/* Group stock rows by GRADE + currency, returning the total quantity and the
   weighted average cost per MT for each. Shared between the on-screen "Avg Cost
   Price per Grade" table and the Excel export so both reflect the same data.

   The grade — not the typed description — is the unit here. Grouping on the raw
   description gave one line per SPELLING, so twenty-one lots of the same unnamed
   NiCrMo ingot showed as twenty-one 9 MT rows instead of one 230 MT position, and
   "IN 718 Chips" sat three times over depending on whether whoever typed it put a
   space inside the assay. See gradeKey.js for what folds and why. Each group keeps
   both splits it can be opened on: the spellings that fed it, and the suppliers. */
export const computeGradeSummary = (dataTable, settings) => {
  if (!dataTable || dataTable.length === 0) return []

  const gCur = (id) => settings?.Currency?.Currency?.find(q => q.id === id)?.cur || id
  const supName = (id) => settings?.Supplier?.Supplier?.find(q => q.id === id)?.nname
    || (id && id !== '-' ? String(id) : '(no supplier)')

  const groups = {}
  dataTable.forEach(row => {
    const name = row.descriptionName || '-'
    const curId = row.cur || ''
    const { key: gradeKey, label: synthLabel } = gradeKeyOf(name)
    const key = `${gradeKey || name}|${curId}`
    if (!groups[key]) {
      groups[key] = {
        curId, synthLabel, totalQnty: 0, totalValue: 0, bySupplier: {}, byVariant: {},
      }
    }
    const g = groups[key]
    const qty = parseFloat(row.qnty) || 0
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0
    g.totalQnty += qty
    g.totalValue += val

    const sup = supName(row.supplier)
    if (!g.bySupplier[sup]) g.bySupplier[sup] = { supplier: sup, qnty: 0, value: 0 }
    g.bySupplier[sup].qnty += qty
    g.bySupplier[sup].value += val

    if (!g.byVariant[name]) g.byVariant[name] = { description: name, qnty: 0, value: 0 }
    g.byVariant[name].qnty += qty
    g.byVariant[name].value += val
  })

  return Object.values(groups)
    .filter(r => r.totalQnty > 0.1)
    .map(r => {
      const curCode = gCur(r.curId)
      const isoCode = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD'
      const variants = Object.values(r.byVariant)
        .filter(v => v.qnty > 0.0005)
        .sort((a, b) => b.value - a.value)
      return {
        ...r,
        // Keeps the name under the key the Excel sheet already writes.
        descriptionName: gradeLabel(r.synthLabel, Object.keys(r.byVariant)),
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
        variants,
        suppliers: Object.values(r.bySupplier)
          .filter(s => s.qnty > 0.0005)
          .sort((a, b) => b.value - a.value),
      }
    })
    .sort((a, b) => a.descriptionName.localeCompare(b.descriptionName))
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
                /* A grade folded from several spellings opens on THOSE — that is the
                   breakdown behind the total, and the one the fold made invisible.
                   A grade with a single spelling has nothing to show there, so it
                   keeps opening on the supplier split as it always did. */
                const variants = r.variants || []
                const children = variants.length > 1
                  ? variants.map(v => ({ name: v.description, qnty: v.qnty, value: v.value }))
                  : (r.suppliers || []).map(s => ({ name: s.supplier, qnty: s.qnty, value: s.value }))
                const canExpand = children.length > 0
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
                          {variants.length > 1 && (
                            <span className='shrink-0' style={{ color: 'var(--regent-gray)' }}>({variants.length})</span>
                          )}
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
                  {isOpen && children.map((c, k) => (
                    <tr key={`${i}-child-${k}`} style={{ background: 'var(--surface-pill)' }}>
                      <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '34px', color: 'var(--regent-gray)' }}>
                        <Tltip direction='top' tltpText={c.name}>
                          <span className='block truncate cursor-default w-full'>{c.name}</span>
                        </Tltip>
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        <NumericFormat value={c.qnty} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        <NumericFormat value={c.qnty > 0 ? c.value / c.qnty : 0} displayType="text" thousandSeparator
                          prefix={isoCode === 'EUR' ? '€' : '$'} decimalScale={2} fixedDecimalScale />
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        <NumericFormat value={c.value} displayType="text" thousandSeparator
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
