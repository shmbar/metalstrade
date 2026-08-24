'use client';

import { invoiceQtyBySalesContract } from '@utils/salesLink';

// Names every client PO an invoice is split across, with the tonnage each carries.
//
// Deliberately silent when the invoice touches ONE contract: that is the normal case,
// the panel above already states the link, and repeating it here is the "PO shown 4x"
// noise the client asked us to stop. It only speaks up for the case that actually
// needs explaining — where the tonnage on this invoice does not all belong to the
// contract named above it.
//
// Shared by both invoice modals (invoices/ and contracts/) so the two cannot drift.
export default function SalesSplitSummary({ inv, contracts = [] }) {
    const byQty = invoiceQtyBySalesContract(inv);
    const ids = Object.keys(byQty);
    if (ids.length < 2) return null;

    const fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(n || 0);
    const nameOf = (id) => contracts.find((c) => c && c.id === id)?.contractNo || '(unknown)';

    return (
        <div className='pt-1'>
            <p className='responsiveText text-[var(--regent-gray)]'>
                Split across {ids.length} client POs
            </p>
            {ids.map((id) => (
                <p key={id} className='responsiveText text-[var(--ink)] pl-1'>
                    {nameOf(id)} · {fmt(byQty[id])} MT
                </p>
            ))}
        </div>
    );
}
