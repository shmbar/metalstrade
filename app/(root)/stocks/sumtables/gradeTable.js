'use client'

import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import CurrencyChip from '../../../../components/CurrencyChip'
import Tltip from '../../../../components/tlTip'
import ChemistryPopover from '../../../../components/ChemistryPopover'
import { resolveGrade, specBreakdown } from '../../../../utils/grades'
import { gradeKeyOf, gradeLabel, niRangeLabel } from './gradeKey'
import { toMT } from '../../../../utils/finance'

/* The four figure columns are bounded — each is sized to the wider of its header and
   its values — and Description is the one free-text column, so under table-layout:fixed
   it takes whatever is left. That is what lets this card be handed any width and still
   fit: on a 1920 row Description gets ~730px and a full grade name reads end to end, at
   1280 it gets ~120px and truncates. Nothing ever scrolls sideways. */
const COL_W = { weight: 112, avg: 96, value: 100, cur: 72 }

/* THE GRADE LIST IS RETIRED (2026-10-02). Material is grouped by the name it carries in
   Materials Breakdown, with its specs underneath — nothing reads the shared registry
   (SHARED_STOCK/data/grades) any more, and the tick boxes, "Merge into grade", "Name
   groups" and the PO page's Grade box that fed it are gone. It grouped no stock at all by
   then, and what it held was mostly wrong (R 88 and IN 100 carrying each other's
   chemistry, Ti powder under 40Ni, producers declared as grades). Two materials are one
   line here when they are given the same name. `gradeIndex` below is never passed. */

/* Group stock rows by GRADE + currency, returning the total quantity and the
   weighted average cost per MT for each. Shared between the on-screen "Avg Cost
   Price per Grade" table and the Excel export so both reflect the same data.

   The grade — not the typed description — is the unit here. A DECLARED grade (the
   registry in utils/grades.js: a PO line's explicit assignment, else the grade its
   spelling belongs to) wins; everything not yet declared falls back to the text fold in
   gradeKey.js exactly as before, so nothing regresses while the registry is still being
   filled. Grouping on the raw description gave one line per SPELLING, so twenty-one lots
   of the same unnamed NiCrMo ingot showed as twenty-one 9 MT rows instead of one 230 MT
   position. Each group keeps the lots behind it, which is what the chemistry popup and
   the merge action both need. */
export const computeGradeSummary = (dataTable, settings, gradeIndex = null) => {
  if (!dataTable || dataTable.length === 0) return []

  const gCur = (id) => settings?.Currency?.Currency?.find(q => q.id === id)?.cur || id
  const supName = (id) => settings?.Supplier?.Supplier?.find(q => q.id === id)?.nname
    || (id && id !== '-' ? String(id) : '(no supplier)')

  const groups = {}
  dataTable.forEach(row => {
    const name = row.descriptionName || '-'
    const curId = row.cur || ''
    const inLots = (row.data || []).filter(l => l && l.type === 'in')
    const declared = resolveGrade(gradeIndex, {
      description: name,
      lineId: inLots.find(l => l.description)?.description,
    })
    const { key: gradeKey, label: synthLabel, ni } = gradeKeyOf(name)
    const key = declared ? `grade:${declared.id}|${curId}` : `${gradeKey || name}|${curId}`
    if (!groups[key]) {
      groups[key] = {
        curId, grade: declared || null, synthLabel: declared ? null : synthLabel,
        totalQnty: 0, totalValue: 0, byLot: {}, spellings: new Set(), niValues: [], inLots: [],
      }
    }
    const g = groups[key]
    // In MT — the card is per MT, and a line kept in kg is not that many tonnes (2026-10-07).
    const qty = toMT(parseFloat(row.qnty) || 0, row, settings)
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0
    g.totalQnty += qty
    g.totalValue += val
    g.spellings.add(name)
    if (ni !== null) g.niValues.push(ni)
    g.inLots.push(...inLots)

    /* One breakdown, not two. A row used to open on suppliers, and a folded one on
       spellings, so the same chevron meant different things depending on the row —
       the thing that read as confusing. A LOT (this description, from this supplier)
       carries both facts, so there is now a single list behind every chevron. */
    const supplier = supName(row.supplier)
    const lotKey = `${name}|${supplier}`
    if (!g.byLot[lotKey]) g.byLot[lotKey] = { description: name, supplier, qnty: 0, value: 0, lots: [] }
    g.byLot[lotKey].qnty += qty
    g.byLot[lotKey].value += val
    g.byLot[lotKey].lots.push(...inLots)
  })

  return Object.values(groups)
    .filter(r => r.totalQnty > 0.1)
    .map(r => {
      const curCode = gCur(r.curId)
      const isoCode = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD'
      const base = r.grade ? r.grade.name : gradeLabel(r.synthLabel, [...r.spellings])
      const span = r.synthLabel ? niRangeLabel(r.niValues) : ''
      return {
        ...r,
        spellings: [...r.spellings],
        declared: !!r.grade,
        // Keeps the name under the key the Excel sheet already writes.
        descriptionName: span ? `${base} · ${span}` : base,
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
        lots: Object.values(r.byLot)
          .filter(l => l.qnty > 0.0005)
          .sort((a, b) => b.value - a.value),
      }
    })
    /* Biggest position first. Alphabetical put an $857k line in the middle of 85
       rows; this table is read to find where the money is. */
    .sort((a, b) => b.totalValue - a.totalValue)
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

  // Same band as the Summary - Stocks total row, so the two cards close the same way.
  const footStyle = {
    color: 'var(--ink)',
    background: 'var(--bg-subtle)',
    padding: '6px 10px',
    borderTop: '1px solid var(--line)',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }

  // One line per currency actually present, in the order the rows use them.
  const totals = Object.values(rows.reduce((acc, r) => {
    const k = r.isoCode
    if (!acc[k]) acc[k] = { isoCode: k, qnty: 0, value: 0 }
    acc[k].qnty += r.totalQnty
    acc[k].value += r.totalValue
    return acc
  }, {}))

  const fmtMTq = (q) => (Number(q) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const SOURCE_NOTE = {
    spec: 'spec as recorded on the lot',
    analysis: 'from the lot analysis',
    description: 'from the figures in the description',
    name: 'no spec or chemistry recorded yet',
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
          className="responsiveTextCardTitle text-center truncate"
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
                /* Always the same thing behind the chevron: the lots that make up
                   the total. The description is dropped from a lot's line when it
                   only repeats the grade name above it — same row, less noise. */
                /* Behind the chevron: the material's stock by SPEC (utils/grades.js
                   specBreakdown) — 40Ni opens into 43Ni 15Cr and 41Ni 12Cr, Ta Bars into
                   UMZ and Silmet — each with its own tonnage, average and value. The arrow
                   alone says the row opens; the "3 specs" count beside it read as jargon
                   (client, 2026-10-02) and is gone. */
                const children = specBreakdown(r.lots || [])
                const canExpand = children.length > 1
                const isOpen = !!expanded[key]
                return (
                  <React.Fragment key={i}>
                  <tr style={{ background: 'var(--bg-card)', cursor: canExpand ? 'pointer' : 'default' }}
                    onClick={() => canExpand && toggle(key)}>
                    <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left' }}>
                      <span className='flex items-center gap-1 w-full min-w-0'>
                        {canExpand && (
                          <ChevronRight className='w-3 h-3 shrink-0 transition-transform'
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'var(--endeavour)' }} />
                        )}
                        <Tltip direction='top' tltpText={r.descriptionName}>
                          <span className='block truncate min-w-0 cursor-default'>
                            {r.descriptionName}
                          </span>
                        </Tltip>
                        <ChemistryPopover lots={r.inLots} description={r.descriptionName} />
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
                  {isOpen && children.map((c) => {
                    const tipText = [
                      c.label,
                      SOURCE_NOTE[c.source],
                      c.suppliers.length ? `supplier ${c.suppliers.join(', ')}` : '',
                      `from ${c.spellings.join(' · ')}`,
                    ].filter(Boolean).join(' — ')
                    return (
                    <tr key={`${i}-child-${c.key}`} style={{ background: 'var(--surface-pill)' }}>
                      <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '28px', color: 'var(--regent-gray)' }}>
                        <span className='flex items-center gap-1 min-w-0 w-full'>
                          <Tltip direction='top' tltpText={tipText}>
                            <span className='block truncate cursor-default min-w-0'>
                              <span className={c.source === 'spec' || c.source === 'analysis' ? 'font-medium text-[var(--ink)]' : ''}>{c.label}</span>
                              {c.suppliers.length > 0 && <span> · {c.suppliers.join(', ')}</span>}
                            </span>
                          </Tltip>
                          <ChemistryPopover lots={c.lots} description={c.spellings[0] || ''} />
                        </span>
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, color: 'var(--regent-gray)' }}>
                        {c.estimated ? (
                          <Tltip direction='top' tltpText={`≈ ${fmtMTq(c.qnty)} — part of this material has been sold, and a sale does not record which lot shipped, so what is left is shared across its specs by the quantity received of each.`}>
                            <span className='cursor-default'>≈ <NumericFormat value={c.qnty} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale /></span>
                          </Tltip>
                        ) : (
                          <NumericFormat value={c.qnty} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />
                        )}
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
                    )
                  })}
                  </React.Fragment>
                )
              })}
            </tbody>
            {/* Bottom line, one row per currency in play — the card had none, while
                Summary - Stocks beside it did. Sticky, because this table scrolls
                inside its own box and a total you have to scroll to find is not a
                total. */}
            <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
              {totals.map(t => (
                <tr key={t.isoCode}>
                  <td className="responsiveTextTable font-medium" style={{ ...footStyle, textAlign: 'left' }}>
                    Total {t.isoCode === 'EUR' ? '€' : '$'}
                  </td>
                  <td className="responsiveTextTable font-medium" style={footStyle}>
                    <NumericFormat value={t.qnty} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />
                  </td>
                  <td style={footStyle}></td>
                  <td className="responsiveTextTable font-medium" style={footStyle}>
                    <NumericFormat value={t.value} displayType="text" thousandSeparator
                      prefix={t.isoCode === 'EUR' ? '€' : '$'} decimalScale={2} fixedDecimalScale />
                  </td>
                  <td style={footStyle}></td>
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default GradeTable
