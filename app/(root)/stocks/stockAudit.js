'use client'

import { useMemo, useState } from 'react'
import Modal from '@components/modal.js'
import { NumericFormat } from 'react-number-format'
import dateFormat from 'dateformat'

const tabs = [
  { id: 'dupes', label: 'Duplicate OUT' },
  { id: 'over', label: 'Over-shipped (OUT > IN)' },
  { id: 'orphan', label: 'Orphan OUT (no IN)' },
  { id: 'zeroIn', label: 'Zero-qnty IN rows' },
]

const resolveDescName = (r) => {
  const arr = Array.isArray(r?.productsData) ? r.productsData : []
  if (r.type === 'in' && r.description) {
    return arr.find(p => p.id === r.description)?.description || ''
  }
  if (r.mtrlStatus === 'select' || r.isSelection) {
    return arr.find(p => p.id === r.descriptionId)?.description || ''
  }
  if (r.type === 'out' && r.moveType === 'out') {
    return r.descriptionName || ''
  }
  return r.descriptionText || r.descriptionName || ''
}

const buildAudit = (stockData, settings) => {
  const stockName = (id) => settings?.Stocks?.Stocks?.find(s => s.id === id)?.nname || id || '(none)'
  const supplierName = (id) => settings?.Supplier?.Supplier?.find(s => s.id === id)?.nname || ''

  const enriched = (stockData || []).filter(Boolean).map(r => ({
    raw: r,
    id: r.id,
    type: r.type,
    stockId: r.stock,
    stockNm: stockName(r.stock),
    descId: r.description || r.descriptionId || '',
    descNm: resolveDescName(r),
    qnty: parseFloat(r.qnty) || 0,
    finalqnty: r.finalqnty != null ? parseFloat(r.finalqnty) : null,
    unitPrc: parseFloat(r.unitPrc) || 0,
    cur: r.cur || '',
    supplier: supplierName(r.supplier),
    order: r.order || '',
    date: r.contractData?.date || r.date || '',
    invoice: r.invoice || '',
  }))

  // 1. Duplicate OUT — same (type=out, stockId, descId, qnty, unitPrc) appearing 2+ times
  const dupBuckets = {}
  enriched.filter(r => r.type === 'out').forEach(r => {
    const k = `${r.stockId}|${r.descId}|${r.qnty.toFixed(3)}|${r.unitPrc}`
    if (!dupBuckets[k]) dupBuckets[k] = []
    dupBuckets[k].push(r)
  })
  const dupes = Object.values(dupBuckets)
    .filter(g => g.length > 1)
    .flat()
    .sort((a, b) => (a.descNm || '').localeCompare(b.descNm || ''))

  // 2 + 3. Group by (stock, descId), sum in vs out
  const groupBuckets = {}
  enriched.forEach(r => {
    const k = `${r.stockId}|${r.descId}`
    if (!groupBuckets[k]) {
      groupBuckets[k] = {
        stockId: r.stockId,
        stockNm: r.stockNm,
        descId: r.descId,
        names: new Set(),
        inQty: 0,
        outQty: 0,
        inRows: 0,
        outRows: 0,
      }
    }
    if (r.descNm) groupBuckets[k].names.add(r.descNm)
    if (r.type === 'in') {
      const useQ = r.finalqnty != null && r.finalqnty !== r.qnty ? r.finalqnty : r.qnty
      groupBuckets[k].inQty += Math.abs(useQ)
      groupBuckets[k].inRows += 1
    } else {
      groupBuckets[k].outQty += Math.abs(r.qnty)
      groupBuckets[k].outRows += 1
    }
  })
  const groupRows = Object.values(groupBuckets).map(g => ({
    ...g,
    names: [...g.names].join(' / '),
    net: +(g.inQty - g.outQty).toFixed(3),
  }))

  const over = groupRows
    .filter(g => g.outQty > g.inQty + 0.1 && g.outRows > 0 && g.inRows > 0)
    .sort((a, b) => (b.outQty - b.inQty) - (a.outQty - a.inQty))

  const orphan = groupRows
    .filter(g => g.inRows === 0 && g.outRows > 0)
    .sort((a, b) => b.outQty - a.outQty)

  // 4. Zero-qnty IN with non-zero unitPrc
  const zeroIn = enriched
    .filter(r => r.type === 'in' && r.qnty === 0 && r.unitPrc > 0)
    .sort((a, b) => b.unitPrc - a.unitPrc)

  return { dupes, over, orphan, zeroIn, total: enriched.length }
}

const fmtQ = (v) => (
  <NumericFormat value={v} displayType="text" thousandSeparator decimalScale={3} fixedDecimalScale />
)
const fmtP = (v, cur) => (
  <NumericFormat
    value={v}
    displayType="text"
    thousandSeparator
    prefix={cur?.toLowerCase() === 'eur' ? '€' : '$'}
    decimalScale={2}
    fixedDecimalScale
  />
)
const fmtDate = (d) => {
  if (!d) return ''
  try { return dateFormat(d, 'dd.mm.yy') } catch { return d }
}

const cellTh = {
  background: '#dbeeff',
  color: 'var(--chathams-blue)',
  padding: '6px 10px',
  borderBottom: '1px solid #b8ddf8',
  fontWeight: 500,
  textAlign: 'left',
  whiteSpace: 'nowrap',
}
const cellTd = {
  color: 'var(--port-gore)',
  padding: '6px 10px',
  borderBottom: '1px solid #eef4fb',
  whiteSpace: 'nowrap',
}

const ShortId = ({ id }) => (
  <span title={id} style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--regent-gray)' }}>
    {id ? id.slice(0, 8) : ''}
  </span>
)

const StockAudit = ({ isOpen, setIsOpen, stockData, settings }) => {
  const [tab, setTab] = useState('dupes')
  const audit = useMemo(() => buildAudit(stockData, settings), [stockData, settings])

  const counts = {
    dupes: audit.dupes.length,
    over: audit.over.length,
    orphan: audit.orphan.length,
    zeroIn: audit.zeroIn.length,
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} title="Stock Audit" w="max-w-7xl">
      <div className="p-4">
        <p className="responsiveTextTable mb-3" style={{ color: 'var(--regent-gray)' }}>
          Read-only report. Scanned {audit.total} stock records. Use record IDs / PO# / dates to find and fix entries in the corresponding contract or invoice.
        </p>

        <div className="flex gap-1.5 mb-3 flex-wrap">
          {tabs.map(t => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={active
                  ? 'whiteButton whitespace-nowrap !bg-[var(--chathams-blue)] !text-white !border-[#b8ddf8]'
                  : 'whiteButton whitespace-nowrap'}
              >
                {t.label}
                <span style={{ opacity: 0.75, marginLeft: 4 }}>({counts[t.id]})</span>
              </button>
            )
          })}
        </div>

        <div className="rounded-xl border border-[#b8ddf8] overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
            {tab === 'dupes' && (
              <table className="w-full responsiveTextTable" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={cellTh}>Description</th>
                    <th style={cellTh}>Warehouse</th>
                    <th style={cellTh}>Qty</th>
                    <th style={cellTh}>Unit price</th>
                    <th style={cellTh}>Date</th>
                    <th style={cellTh}>Invoice#</th>
                    <th style={cellTh}>Record ID</th>
                    <th style={cellTh}>DescId</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.dupes.map(r => (
                    <tr key={r.id}>
                      <td style={cellTd}>{r.descNm || '(no name)'}</td>
                      <td style={cellTd}>{r.stockNm}</td>
                      <td style={cellTd}>{fmtQ(r.qnty)}</td>
                      <td style={cellTd}>{fmtP(r.unitPrc, r.cur)}</td>
                      <td style={cellTd}>{fmtDate(r.date)}</td>
                      <td style={cellTd}>{r.invoice}</td>
                      <td style={cellTd}><ShortId id={r.id} /></td>
                      <td style={cellTd}><ShortId id={r.descId} /></td>
                    </tr>
                  ))}
                  {audit.dupes.length === 0 && (
                    <tr><td colSpan={8} style={{ ...cellTd, textAlign: 'center', padding: '20px' }}>No duplicate OUT records found.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'over' && (
              <table className="w-full responsiveTextTable" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={cellTh}>Description</th>
                    <th style={cellTh}>Warehouse</th>
                    <th style={cellTh}>IN qty</th>
                    <th style={cellTh}>OUT qty</th>
                    <th style={cellTh}>Net (over)</th>
                    <th style={cellTh}>IN rows</th>
                    <th style={cellTh}>OUT rows</th>
                    <th style={cellTh}>DescId</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.over.map(g => (
                    <tr key={`${g.stockId}|${g.descId}`}>
                      <td style={cellTd}>{g.names || '(no name)'}</td>
                      <td style={cellTd}>{g.stockNm}</td>
                      <td style={cellTd}>{fmtQ(g.inQty)}</td>
                      <td style={cellTd}>{fmtQ(g.outQty)}</td>
                      <td style={{ ...cellTd, color: '#dc2626', fontWeight: 500 }}>{fmtQ(g.outQty - g.inQty)}</td>
                      <td style={cellTd}>{g.inRows}</td>
                      <td style={cellTd}>{g.outRows}</td>
                      <td style={cellTd}><ShortId id={g.descId} /></td>
                    </tr>
                  ))}
                  {audit.over.length === 0 && (
                    <tr><td colSpan={8} style={{ ...cellTd, textAlign: 'center', padding: '20px' }}>No over-shipped groups.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'orphan' && (
              <table className="w-full responsiveTextTable" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={cellTh}>Description</th>
                    <th style={cellTh}>Warehouse</th>
                    <th style={cellTh}>OUT qty</th>
                    <th style={cellTh}>OUT rows</th>
                    <th style={cellTh}>DescId</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.orphan.map(g => (
                    <tr key={`${g.stockId}|${g.descId}`}>
                      <td style={cellTd}>{g.names || '(no name)'}</td>
                      <td style={cellTd}>{g.stockNm}</td>
                      <td style={cellTd}>{fmtQ(g.outQty)}</td>
                      <td style={cellTd}>{g.outRows}</td>
                      <td style={cellTd}><ShortId id={g.descId} /></td>
                    </tr>
                  ))}
                  {audit.orphan.length === 0 && (
                    <tr><td colSpan={5} style={{ ...cellTd, textAlign: 'center', padding: '20px' }}>No orphan OUT groups.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {tab === 'zeroIn' && (
              <table className="w-full responsiveTextTable" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={cellTh}>Description</th>
                    <th style={cellTh}>Warehouse</th>
                    <th style={cellTh}>unitPrc value</th>
                    <th style={cellTh}>Supplier</th>
                    <th style={cellTh}>PO#</th>
                    <th style={cellTh}>Date</th>
                    <th style={cellTh}>Record ID</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.zeroIn.map(r => (
                    <tr key={r.id}>
                      <td style={cellTd}>{r.descNm || '(no name)'}</td>
                      <td style={cellTd}>{r.stockNm}</td>
                      <td style={cellTd}>{fmtP(r.unitPrc, r.cur)}</td>
                      <td style={cellTd}>{r.supplier}</td>
                      <td style={cellTd}>{r.order}</td>
                      <td style={cellTd}>{fmtDate(r.date)}</td>
                      <td style={cellTd}><ShortId id={r.id} /></td>
                    </tr>
                  ))}
                  {audit.zeroIn.length === 0 && (
                    <tr><td colSpan={7} style={{ ...cellTd, textAlign: 'center', padding: '20px' }}>No zero-qnty IN rows.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default StockAudit
