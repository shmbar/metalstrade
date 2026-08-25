'use client'

import { useState } from "react";
import { NumericFormat } from "react-number-format";

// A lot belongs to a fold group when its material is an invoice-imported
// (import-flagged) product of a single-line PO — the PO's own description becomes
// the group label. Same derivation as the cashflow Stocks popup (funcs.js
// `groupDescOf`), so a 20-alloy DMT container reads as one line in both places.
const groupDescOf = (z) => {
    const rec = z.data?.[0]
    const prods = rec?.productsData || []
    const pid = rec?.description || rec?.descriptionId
    const p = prods.find(q => q.id === pid)
    if (!p?.import) return ''
    const own = prods.filter(q => !q.import)
    return own.length === 1 ? (own[0]?.description || 'Materials') : ''
}

const num = (v) => v === '-' ? 0 : parseFloat(v) || 0

/* Description is the only free-text column here and a grade name runs to 60+ chars,
   which sized the popup past 800px and off the side of the card. Fixed width +
   truncate, the same 260px as the Avg Cost per Grade table so the two read alike.
   The full name goes on a native title, NOT a <Tltip>: this popup IS a Radix
   tooltip, and opening a nested one dispatches tooltip.open, which every mounted
   tooltip content listens for and closes itself on — the popup would vanish the
   moment you hovered a description. */
const DESC_W = 260

const StockDetails = ({ row, settings, dataTable }) => {
    // Per-alloy rows of a PO collapse under one summary line — without this a
    // container that was invoiced per alloy floods the popup with 20+ lines.
    const [openPOs, setOpenPOs] = useState({})

    const id = settings.Stocks.Stocks.find(z => z.nname === row.original.stock)?.id
    const filteredArr = dataTable
        .filter(z => z.stock === id)
        // Group rows by contract number (PO#), matching the cashflow popup's ordering.
        .sort((a, b) => String(a.order ?? '').localeCompare(String(b.order ?? ''), undefined, { numeric: true }))
        .map(z => ({ ...z, _groupDesc: groupDescOf(z) }))

    const supName = (z) => settings.Supplier.Supplier.find(q => q.id === z.supplier)?.nname

    const renderRow = (z, key, indent = false) => (
        <tr key={key}>
            <td>{indent ? '' : z.order}</td>
            <td>{supName(z)}</td>
            <td style={indent ? { textAlign: 'left' } : undefined}>
                <span className="block truncate" title={z.descriptionName || ''}
                    style={{ width: `${DESC_W}px`, paddingLeft: indent ? '18px' : 0 }}>{z.descriptionName}</span>
            </td>
            <td>
                <NumericFormat value={z.qnty} displayType="text" thousandSeparator allowNegative decimalScale='3' fixedDecimalScale />
            </td>
            <td>
                <NumericFormat value={z.unitPrc} displayType="text" thousandSeparator allowNegative prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
            </td>
            <td>
                <NumericFormat value={z.total} displayType="text" thousandSeparator allowNegative prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
            </td>
        </tr>
    )

    const emitted = new Set()
    const body = []
    filteredArr.forEach((z, i) => {
        const grp = z._groupDesc ? filteredArr.filter(r => r.order === z.order && r._groupDesc) : []
        if (z._groupDesc && grp.length >= 3) {
            if (emitted.has(z.order)) return
            emitted.add(z.order)
            const isOpen = !!openPOs[z.order]
            const qSum = grp.reduce((s, r) => s + num(r.qnty), 0)
            const tSum = grp.reduce((s, r) => s + num(r.total), 0)
            body.push(
                <tr key={`grp-${z.order}`} className="cursor-pointer"
                    onClick={() => setOpenPOs(prev => ({ ...prev, [z.order]: !prev[z.order] }))}>
                    <td>{z.order}</td>
                    <td>{supName(z)}</td>
                    <td style={{ textAlign: 'left' }}>
                        <span className="flex items-center gap-1 font-medium" title={z._groupDesc}
                            style={{ width: `${DESC_W}px`, color: 'var(--chathams-blue)' }}>
                            <span className="inline-block shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                            <span className="block truncate min-w-0">{z._groupDesc}</span>
                            <span className="shrink-0" style={{ color: 'var(--regent-gray)' }}>({grp.length})</span>
                        </span>
                    </td>
                    <td className="font-medium">
                        <NumericFormat value={qSum} displayType="text" thousandSeparator decimalScale='3' fixedDecimalScale />
                    </td>
                    <td></td>
                    <td className="font-medium">
                        <NumericFormat value={tSum} displayType="text" thousandSeparator prefix={z.cur === 'us' ? '$' : '€'} decimalScale='2' fixedDecimalScale />
                    </td>
                </tr>
            )
            if (isOpen) grp.forEach((r, k) => body.push(renderRow(r, `grp-${z.order}-${k}`, true)))
        } else {
            body.push(renderRow(z, i))
        }
    })

    return (
        <div style={{
            background: "var(--bg-card)",
            borderRadius: '16px',
            overflow: 'hidden',
            maxHeight: '28rem',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--line)',
            fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
            minWidth: '400px',
        }}>
            {/* Type, weight, padding and the header band all come from
                .detail-popup-* in globals.css — the same band .custom-table uses,
                so this popup matches the summary table it opens from. */}
            <div className="detail-popup-title">
                Stock Details
            </div>
            <table className="detail-popup-table" style={{ fontFamily: 'inherit' }}>
                <thead>
                    <tr>
                        <th>PO#</th>
                        <th>Supplier</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {body}
                </tbody>
            </table>
        </div>
    )
}

export const detailsToolTip = (row, data, settings, dataTable) =>
    <StockDetails row={row} settings={settings} dataTable={dataTable} />
