'use client'

import { useContext, useMemo, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Modal from '@components/modal.js'
import Tltip from '@components/tlTip'
import { NumericFormat } from 'react-number-format'
import dateFormat from 'dateformat'
import { filteredArray, saveStockIn } from '@utils/utils'
import { SettingsContext } from '@contexts/useSettingsContext'
import { UserAuth } from '@contexts/useAuthContext'

const tabs = [
  { id: 'left', label: 'Leftovers (net > 0)' },
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

  // An invoice and its Credit/Final note BOTH write off the same lines by design, and
  // every stock reader keeps only the superseding doc per invoice number (filteredArray).
  // Apply the same rule here, or those by-design pairs read as "duplicates" and their
  // doubled outs as "over-shipped" — burying the real problems (this was inflating the
  // tabs to 464/406 entries). Outs without an invoice reference pass through untouched.
  const rows = (stockData || []).filter(Boolean)
  const isInvOut = (r) => r.type === 'out' && r.invoice !== undefined && r.invoice !== null && r.invoice !== ''
  const auditSource = [...rows.filter(r => !isInvOut(r)), ...filteredArray(rows.filter(isInvOut))]

  const enriched = auditSource.map(r => ({
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
      // Representative in-row: supplies price/currency/supplier/PO for the
      // leftover valuation and any write-off row created from this group.
      if (!groupBuckets[k].rep || (r.unitPrc > 0 && !groupBuckets[k].rep.unitPrc)) {
        groupBuckets[k].rep = { unitPrc: r.unitPrc, cur: r.raw?.cur || '', supplierId: r.raw?.supplier || '', supplierNm: r.supplier, order: r.order }
      }
    } else {
      groupBuckets[k].outQty += Math.abs(r.qnty)
      groupBuckets[k].outRows += 1
    }
    const d = String(r.date || '')
    if (d && (!groupBuckets[k].lastDate || String(groupBuckets[k].lastDate) < d)) groupBuckets[k].lastDate = r.date
  })
  const groupRows = Object.values(groupBuckets).map(g => ({
    ...g,
    names: [...g.names].join(' / '),
    net: +(g.inQty - g.outQty).toFixed(3),
  }))

  // Remaining balances: material still showing in stock (net IN − OUT > 0). Some
  // of it is real unsold inventory; the rest is history that was never written
  // off (sold/settled on the cashflow side but the stock movement was never
  // recorded). The Leftovers tab lets the user write those off explicitly.
  const leftovers = groupRows
    .filter(g => g.net > 0.0005 && g.inRows > 0)
    .map(g => ({ ...g, value: g.net * (g.rep?.unitPrc || 0) }))
    .sort((a, b) => b.value - a.value)

  const over = groupRows
    .filter(g => g.outQty > g.inQty + 0.1 && g.outRows > 0 && g.inRows > 0)
    .sort((a, b) => (b.outQty - b.inQty) - (a.outQty - a.inQty))

  const orphan = groupRows
    .filter(g => g.inRows === 0 && g.outRows > 0 && g.outQty > 0.001) // zero-qty outs are noise, not misdirected write-offs
    .sort((a, b) => b.outQty - a.outQty)

  // 4. Zero-qnty IN with non-zero unitPrc
  const zeroIn = enriched
    .filter(r => r.type === 'in' && r.qnty === 0 && r.unitPrc > 0)
    .sort((a, b) => b.unitPrc - a.unitPrc)

  return { left: leftovers, dupes, over, orphan, zeroIn, total: enriched.length }
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

const descTd = {
  ...cellTd,
  maxWidth: '260px',
  minWidth: '180px',
}

const descClamp = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  wordBreak: 'break-word',
  whiteSpace: 'normal',
  lineHeight: 1.3,
  cursor: 'help',
}

const DescCell = ({ text }) => (
  <Tltip tltpText={text || '(no name)'} direction="top">
    <span style={descClamp}>{text || '(no name)'}</span>
  </Tltip>
)

const ShortId = ({ id }) => (
  <span title={id} style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--regent-gray)' }}>
    {id ? id.slice(0, 8) : ''}
  </span>
)

const StockAudit = ({ isOpen, setIsOpen, stockData, settings, onDataChanged }) => {
  const [tab, setTab] = useState('left')
  const [sel, setSel] = useState([])        // selected leftover group keys (stockId|descId)
  const [armed, setArmed] = useState(false) // two-step confirm for the write-off
  const [writing, setWriting] = useState(false)
  const { setToast } = useContext(SettingsContext)
  const { uidCollection } = UserAuth()
  const audit = useMemo(() => buildAudit(stockData, settings), [stockData, settings])

  const counts = {
    left: audit.left.length,
    dupes: audit.dupes.length,
    over: audit.over.length,
    orphan: audit.orphan.length,
    zeroIn: audit.zeroIn.length,
  }

  const keyOf = (g) => `${g.stockId}|${g.descId}`
  const toggleSel = (k) => setSel(prev => { setArmed(false); return prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k] })
  const selGroups = audit.left.filter(g => sel.includes(keyOf(g)))

  // Writes one OUT movement per selected group, dated today, for the remaining
  // quantity — the same ledger mechanics as a shipment, so every reader (stocks
  // tables, cashflow, shared-stock picker) nets the group to zero. Additive and
  // reversible: history stays intact; deleting the OUT row restores the balance.
  const writeOffSelected = async () => {
    if (!selGroups.length || writing) return
    if (!armed) { setArmed(true); return }
    setWriting(true)
    try {
      const rows = selGroups.map(g => ({
        id: uuidv4(),
        type: 'out',
        writeOff: true,
        comment: 'Stock audit write-off (leftover cleanup)',
        stock: g.stockId,
        descriptionId: g.descId,
        descriptionText: g.names,
        descriptionName: g.names,
        qnty: g.net,
        unitPrc: g.rep?.unitPrc || 0,
        cur: g.rep?.cur || 'us',
        supplier: g.rep?.supplierId || '',
        invoice: '',
        date: dateFormat(new Date(), 'dd-mmm-yyyy'),
      }))
      await saveStockIn(uidCollection, rows)
      setToast?.({ show: true, text: `${rows.length} leftover${rows.length > 1 ? 's' : ''} written off — stock balances updated`, clr: 'success' })
      setSel([]); setArmed(false)
      onDataChanged?.()
    } catch (e) {
      setToast?.({ show: true, text: `Write-off failed: ${e?.message || e}`, clr: 'fail' })
    }
    setWriting(false)
  }

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} title="Stock Audit" w="max-w-7xl">
      <div className="p-4">
        <p className="responsiveTextTable mb-3" style={{ color: 'var(--regent-gray)' }}>
          Scanned {audit.total} stock records. The <b>Leftovers</b> tab lists every remaining balance and lets you write off the ones that are not factual; the other tabs are read-only reports — use record IDs / PO# / dates to fix entries in the corresponding contract or invoice.
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

        {tab === 'left' && (
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <p className="responsiveTextTable" style={{ color: 'var(--regent-gray)' }}>
              Net remaining weight per material &amp; warehouse. Real unsold inventory belongs here — tick only the rows that are already sold/settled and should be gone, then write them off.
            </p>
            {sel.length > 0 && (
              <button
                type="button"
                disabled={writing}
                onClick={writeOffSelected}
                className="whiteButton whitespace-nowrap"
                style={armed
                  ? { background: '#dc2626', color: '#fff', borderColor: '#dc2626' }
                  : { background: 'var(--chathams-blue)', color: '#fff', borderColor: '#b8ddf8' }}
              >
                {writing ? 'Writing off…'
                  : armed ? `Confirm — write off ${sel.length} item${sel.length > 1 ? 's' : ''} (OUT dated today)`
                    : `Write off selected (${sel.length})`}
              </button>
            )}
          </div>
        )}

        <div className="rounded-xl border border-[#b8ddf8] overflow-hidden">
          <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
            {tab === 'left' && (
              <table className="w-full responsiveTextTable" style={{ borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={cellTh}>
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--endeavour)] align-middle"
                        checked={audit.left.length > 0 && sel.length === audit.left.length}
                        onChange={() => { setArmed(false); setSel(sel.length === audit.left.length ? [] : audit.left.map(keyOf)) }} />
                    </th>
                    <th style={cellTh}>Description</th>
                    <th style={cellTh}>Warehouse</th>
                    <th style={cellTh}>IN</th>
                    <th style={cellTh}>OUT</th>
                    <th style={cellTh}>Net left</th>
                    <th style={cellTh}>Unit price</th>
                    <th style={cellTh}>Est. value</th>
                    <th style={cellTh}>Supplier</th>
                    <th style={cellTh}>PO#</th>
                    <th style={cellTh}>Last move</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.left.map(g => {
                    const k = keyOf(g)
                    return (
                      <tr key={k} style={sel.includes(k) ? { background: '#fff7ed' } : undefined}>
                        <td style={cellTd}>
                          <input type="checkbox" className="w-3.5 h-3.5 accent-[var(--endeavour)] align-middle"
                            checked={sel.includes(k)} onChange={() => toggleSel(k)} />
                        </td>
                        <td style={descTd}><DescCell text={g.names} /></td>
                        <td style={cellTd}>{g.stockNm}</td>
                        <td style={cellTd}>{fmtQ(g.inQty)}</td>
                        <td style={cellTd}>{fmtQ(g.outQty)}</td>
                        <td style={{ ...cellTd, fontWeight: 600 }}>{fmtQ(g.net)}</td>
                        <td style={cellTd}>{fmtP(g.rep?.unitPrc || 0, g.rep?.cur)}</td>
                        <td style={cellTd}>{fmtP(g.value, g.rep?.cur)}</td>
                        <td style={cellTd}>{g.rep?.supplierNm || ''}</td>
                        <td style={cellTd}>{g.rep?.order || ''}</td>
                        <td style={cellTd}>{fmtDate(g.lastDate)}</td>
                      </tr>
                    )
                  })}
                  {audit.left.length === 0 && (
                    <tr><td colSpan={11} style={{ ...cellTd, textAlign: 'center', padding: '20px' }}>No remaining balances — stock is fully netted.</td></tr>
                  )}
                </tbody>
              </table>
            )}

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
                      <td style={descTd}><DescCell text={r.descNm} /></td>
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
                      <td style={descTd}><DescCell text={g.names} /></td>
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
                      <td style={descTd}><DescCell text={g.names} /></td>
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
                      <td style={descTd}><DescCell text={r.descNm} /></td>
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
