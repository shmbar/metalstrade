'use client'

import React, { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import CurrencyChip from '../../../../components/CurrencyChip'
import Tltip from '../../../../components/tlTip'
import CheckBox from '../../../../components/checkbox'
import ChemistryPopover from '../../../../components/ChemistryPopover'
import { BtnIcon } from '../../../../components/buttonIcons'
import { resolveGrade } from '../../../../utils/grades'
import { gradeKeyOf, gradeLabel, niRangeLabel } from './gradeKey'
import MergeGradeModal from './mergeGrade'
import SuggestGradesModal from './suggestGrades'

/* The four figure columns are bounded — each is sized to the wider of its header and
   its values — and Description is the one free-text column, so under table-layout:fixed
   it takes whatever is left. That is what lets this card be handed any width and still
   fit: on a 1920 row Description gets ~730px and a full grade name reads end to end, at
   1280 it gets ~120px and truncates. Nothing ever scrolls sideways. */
const COL_W = { pick: 30, weight: 112, avg: 96, value: 100, cur: 72 }

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
    const qty = parseFloat(row.qnty) || 0
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

const fmtMT = (q) => (Number(q) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

const GradeTable = ({ dataTable, loading, settings, gradeIndex }) => {
  // Expanded state per grade row (keyed by descriptionName|cur).
  const [expanded, setExpanded] = useState({})
  // Ticked spellings → their tonnage, for "Merge into grade".
  const [picked, setPicked] = useState({})
  const [mergeOpen, setMergeOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  /* One row declared from its own line. The card has already folded its spellings, so
     this needs no ticking: it opens the merge dialog carrying that fold's spellings and
     the name the row is displaying. */
  const [quick, setQuick] = useState(null)

  if (loading) return null

  const rows = computeGradeSummary(dataTable, settings, gradeIndex)

  if (rows.length === 0) return null

  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }))

  // Tonnage per spelling across every row, so a ticked spelling carries its whole weight.
  const spellingQty = {}
  rows.forEach(r => r.lots.forEach(l => { spellingQty[l.description] = (spellingQty[l.description] || 0) + l.qnty }))

  const pickSpellings = (names, on) => setPicked(prev => {
    const next = { ...prev }
    names.forEach(n => { if (on) next[n] = spellingQty[n] || 0; else delete next[n] })
    return next
  })
  const pickedNames = Object.keys(picked)
  const pickedQty = pickedNames.reduce((s, n) => s + (picked[n] || 0), 0)

  // The name a row would take as a grade: the fold's label, without the Ni span the
  // card appends for reading ("NiCrMo Ingots · 16-31Ni" is named "NiCrMo Ingots").
  const nameOf = (r) => gradeLabel(r.synthLabel, r.spellings)

  /* Every fold that is not a declared grade yet, deduped by that name so the same
     material held in two currencies is one suggestion rather than two. */
  const suggestGroups = Object.values(rows.filter(r => !r.declared).reduce((acc, r) => {
    const name = nameOf(r)
    if (!acc[name]) acc[name] = { key: name, name, spellings: [], qnty: 0 }
    r.spellings.forEach(s => { if (!acc[name].spellings.includes(s)) acc[name].spellings.push(s) })
    acc[name].qnty += r.totalQnty
    return acc
  }, {})).sort((a, b) => b.qnty - a.qnty)

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

  const pickStyle = { ...tdStyle, padding: '6px 4px 6px 12px' }

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

  const stop = (e) => e.stopPropagation()

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
          className="responsiveTextCardTitle flex items-center justify-between gap-3"
          style={{
            background: 'var(--bg-subtle)',
            padding: '8px 16px',
            borderBottom: '1px solid var(--line)',
            color: 'var(--ink)',
            fontWeight: '400'
          }}
        >
          <span className="w-32 shrink-0" />
          <span className="text-center truncate">Avg Cost Price per Grade</span>
          <span className="w-32 shrink-0 flex justify-end">
            {suggestGroups.length > 0 ? (
              <Tltip direction='left' tltpText='Name every group that is not a grade yet, in one pass - or tick rows to merge a few by hand'>
                <button type="button" className="whiteButton blackButtonSm" onClick={() => setSuggestOpen(true)}>
                  <BtnIcon action="merge" />Name groups
                </button>
              </Tltip>
            ) : (
              <span className="responsiveTextTable text-[var(--ink-muted)]">Tick rows to merge</span>
            )}
          </span>
        </div>

        {/* Merge bar — only while something is ticked. */}
        {pickedNames.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-1.5 border-b border-[var(--line)] bg-[var(--brand-soft)]">
            <span className="responsiveTextTable font-medium text-[var(--brand-strong)]">
              {pickedNames.length} spelling{pickedNames.length === 1 ? '' : 's'} · {fmtMT(pickedQty)} MT selected
            </span>
            <span className="flex items-center gap-2">
              <button type="button" className="whiteButton blackButtonSm" onClick={() => setPicked({})}>
                <BtnIcon action="clear" />Clear
              </button>
              <button type="button" className="blackButton blackButtonSm" onClick={() => setMergeOpen(true)}>
                <BtnIcon action="merge" />Merge into grade…
              </button>
            </span>
          </div>
        )}

        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th className="responsiveTextTable font-medium" style={{ ...thStyle, width: COL_W.pick }} />
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
                const lots = r.lots || []
                const children = lots.map(l => ({
                  name: l.description && l.description !== r.descriptionName
                    ? `${l.description} · ${l.supplier}`
                    : l.supplier,
                  spelling: l.description,
                  lots: l.lots,
                  qnty: l.qnty, value: l.value,
                }))
                const canExpand = children.length > 1
                const isOpen = !!expanded[key]
                const allPicked = r.spellings.every(s => picked[s] !== undefined)
                const tip = r.declared
                  ? [r.grade.name, r.grade.spec && `nominal ${r.grade.spec}`, `${r.spellings.length} spelling${r.spellings.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')
                  : r.descriptionName
                return (
                  <React.Fragment key={i}>
                  <tr className="group" style={{ background: 'var(--bg-card)', cursor: canExpand ? 'pointer' : 'default' }}
                    onClick={() => canExpand && toggle(key)}>
                    <td style={pickStyle} onClick={stop}>
                      <CheckBox size='size-3' checked={allPicked} onChange={() => pickSpellings(r.spellings, !allPicked)} />
                    </td>
                    <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '6px' }}>
                      <span className='flex items-center gap-1 w-full min-w-0'>
                        {canExpand && (
                          <ChevronRight className='w-3 h-3 shrink-0 transition-transform'
                            style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'var(--endeavour)' }} />
                        )}
                        <Tltip direction='top' tltpText={tip}>
                          <span className={`block truncate min-w-0 cursor-default ${r.declared ? 'font-medium text-[var(--brand-strong)]' : ''}`}>
                            {r.descriptionName}
                          </span>
                        </Tltip>
                        <ChemistryPopover lots={r.inLots} description={r.descriptionName} grade={r.grade} />
                        {!r.declared && (
                          <Tltip direction='top' tltpText={`Make "${nameOf(r)}" a grade - ${r.spellings.length} spelling${r.spellings.length === 1 ? '' : 's'}`}>
                            <button type="button" aria-label="Make this a grade"
                              onClick={(e) => { stop(e); setQuick({ name: nameOf(r), spellings: r.spellings }); setMergeOpen(true) }}
                              className="shrink-0 inline-flex items-center text-[var(--ink-muted)] hover:text-[var(--brand)]
                                opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                              <BtnIcon action="merge" />
                            </button>
                          </Tltip>
                        )}
                        {canExpand && (
                          <span className='shrink-0 whitespace-nowrap' style={{ color: 'var(--regent-gray)' }}>
                            {children.length} lots
                          </span>
                        )}
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
                  {isOpen && children.map((c, k) => (
                    <tr key={`${i}-child-${k}`} style={{ background: 'var(--surface-pill)' }}>
                      <td style={pickStyle} onClick={stop}>
                        <CheckBox size='size-3' checked={picked[c.spelling] !== undefined}
                          onChange={() => pickSpellings([c.spelling], picked[c.spelling] === undefined)} />
                      </td>
                      <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '28px', color: 'var(--regent-gray)' }}>
                        <span className='flex items-center gap-1 min-w-0 w-full'>
                          <Tltip direction='top' tltpText={c.name}>
                            <span className='block truncate cursor-default min-w-0'>{c.name}</span>
                          </Tltip>
                          <ChemistryPopover lots={c.lots} description={c.spelling} grade={r.grade} />
                        </span>
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
            {/* Bottom line, one row per currency in play — the card had none, while
                Summary - Stocks beside it did. Sticky, because this table scrolls
                inside its own box and a total you have to scroll to find is not a
                total. */}
            <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
              {totals.map(t => (
                <tr key={t.isoCode}>
                  <td style={footStyle}></td>
                  <td className="responsiveTextTable font-medium" style={{ ...footStyle, textAlign: 'left', paddingLeft: '6px' }}>
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

      <MergeGradeModal
        isOpen={mergeOpen}
        setIsOpen={(v) => { setMergeOpen(v); if (!v) setQuick(null) }}
        spellings={(quick ? quick.spellings.map(name => ({ name, qnty: spellingQty[name] || 0 }))
          : pickedNames.map(name => ({ name, qnty: picked[name] })))}
        suggestName={quick?.name || ''}
        onDone={() => { setPicked({}); setQuick(null) }}
      />

      <SuggestGradesModal
        isOpen={suggestOpen}
        setIsOpen={setSuggestOpen}
        groups={suggestGroups}
        onDone={() => setPicked({})}
      />
    </div>
  )
}

export default GradeTable
