/* Which sales invoices have already taken which LOTS of a purchase contract.
   PURE: no Firestore, no React — the loader lives in utils/utils.js.

   (Not to be confused with utils/salesLink.js, which links an invoice to the client's
   sales CONTRACT. This is the stock side: what has physically been sold.)

   A sale is written against the material LINE — the invoice line carries the contract
   line's id as `descriptionId` — never against one lot. Marking every lot of a sold line
   would be wrong: a line of three 22.5 MT lots with one sold would show all three as
   sold. So each line's sales are ALLOCATED to its lots:

     1. weight first — an invoice line whose weight is exactly one lot's weight took that
        lot (how material actually ships: lot by lot, at the lot's weight);
     2. then first in, first out — what is left is taken from the earliest arrivals.

   On real contracts this reproduces the Sold / Unsold status the team keeps by hand.
   It is still an allocation, and the tooltip says so.

   What counts as a sale: an `out` movement carrying an invoice number. A warehouse
   transfer is also an `out` movement, but it carries a moveType and no invoice —
   moving material between terminals does not sell it. */

const EPS = 0.0005;

/** Invoice numbers are reused across types, so the type prefixes them — as in the stock
    movements table: plain for an invoice, CN for a credit note, FN for a final one. */
export const salePrefix = (invType) => {
    const t = String(invType ?? '');
    if (t === '1111' || t === 'Invoice') return '';
    if (t === '2222' || t === 'Credit Note') return 'CN';
    return 'FN';
};

export const isSaleMovement = (l) =>
    !!l && l.type === 'out' && !l.moveType &&
    l.invoice !== '' && l.invoice !== null && l.invoice !== undefined;

export const saleLabel = (l) => `${salePrefix(l?.invType)}${l?.invoice ?? ''}`;

/** The line a movement belongs to: an invoice line carries descriptionId, a purchase
    lot carries description. */
export const movementLineId = (l) => l?.descriptionId || l?.description || '';

/** Sale movements grouped by the PO line they took material from. */
export const groupSalesByLine = (lots = []) => {
    const out = {};
    for (const l of lots || []) {
        if (!isSaleMovement(l)) continue;
        const key = movementLineId(l);
        if (!key) continue;
        (out[key] = out[key] || []).push(l);
    }
    return out;
};

/** A lot's weight as settled: the final-settlement figure once there is one. */
export const settledQty = (lot) => {
    const f = parseFloat(lot?.finalqnty);
    return Number.isFinite(f) ? f : (parseFloat(lot?.qnty) || 0);
};

const arrivalOf = (lot) => {
    const d = lot?.indDate;
    return String((d && typeof d === 'object' ? (d.startDate || d.endDate) : d) || '');
};

const NONE = Object.freeze({ invoices: [], allocated: 0, qty: 0, state: 'none' });

/**
 * { [lotId]: { invoices: [{ label, qnty, date, clients }], allocated, qty, state } } —
 * state 'full' (the whole lot is sold), 'part', or 'none'. Rows that hold no material
 * (a Misc-invoice row, a zero-weight line) are always 'none'.
 */
export const allocateSalesToLots = (lots = [], salesByLine = {}) => {
    const out = {};
    const byLine = new Map();
    (lots || []).forEach((lot, i) => {
        if (!lot?.id) return;
        const qty = settledQty(lot);
        out[lot.id] = { ...NONE, qty };
        if (lot.spInv || !(qty > EPS) || !lot.description) return;
        const list = byLine.get(lot.description) || [];
        list.push({ lot, i, qty, left: qty, parts: new Map() });
        byLine.set(lot.description, list);
    });

    for (const [lineId, entries] of byLine) {
        entries.sort((a, b) => arrivalOf(a.lot).localeCompare(arrivalOf(b.lot)) || a.i - b.i);
        const sales = (salesByLine[lineId] || [])
            .map((m, j) => ({ m, j, left: Number(m.qnty) || 0 }))
            .filter(s => s.left > EPS)
            .sort((a, b) => String(a.m.date || '').localeCompare(String(b.m.date || '')) || a.j - b.j);

        const take = (entry, sale, q) => {
            const label = saleLabel(sale.m);
            const p = entry.parts.get(label) || { label, qnty: 0, date: '', clients: new Set() };
            p.qnty += q;
            if (!p.date && sale.m.date) p.date = sale.m.date;
            if (sale.m.client) p.clients.add(sale.m.client);
            entry.parts.set(label, p);
            entry.left -= q;
            sale.left -= q;
        };

        // 1. weight first: an invoice line of exactly one untouched lot's weight took it
        for (const s of sales) {
            const hit = entries.find(e => Math.abs(e.left - e.qty) < EPS && Math.abs(e.qty - s.left) < EPS);
            if (hit) take(hit, s, Math.min(hit.left, s.left));
        }
        // 2. what is left, first in, first out
        for (const s of sales) {
            for (const e of entries) {
                if (s.left <= EPS) break;
                if (e.left <= EPS) continue;
                take(e, s, Math.min(e.left, s.left));
            }
        }

        for (const e of entries) {
            const allocated = Math.min(e.qty, e.qty - e.left);
            out[e.lot.id] = {
                invoices: [...e.parts.values()]
                    .map(p => ({ ...p, clients: [...p.clients] }))
                    .sort((a, b) => b.qnty - a.qnty),
                allocated,
                qty: e.qty,
                state: allocated >= e.qty - EPS ? 'full' : allocated > EPS ? 'part' : 'none',
            };
        }
    }
    return out;
};

const fmtQ = (q) => (Number(q) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** The cell: "46", "46, 51", "46, 51 +2", with "· part" for a partly sold lot. */
export const lotSalesCellText = (a, max = 2) => {
    const labels = (a?.invoices || []).map(i => i.label);
    if (!labels.length) return '';
    const shown = labels.slice(0, max).join(', ') + (labels.length > max ? ` +${labels.length - max}` : '');
    return a.state === 'part' ? `${shown} · part` : shown;
};

/** The tooltip: how much of the lot is sold, on which invoices, and how that is known. */
export const lotSalesTooltip = (a, unit = 'MT') => {
    if (!a?.invoices?.length) return '';
    const head = `${a.state === 'full' ? 'Sold' : 'Part sold'} — ${fmtQ(a.allocated)} of ${fmtQ(a.qty)} ${unit}`;
    const lines = a.invoices.map(i =>
        `${i.label} · ${fmtQ(i.qnty)} ${unit}${i.date ? ` · ${i.date}` : ''}${i.clients.length ? ` · ${i.clients.join(', ')}` : ''}`);
    return [head, ...lines,
        'Sales record the material line, not the lot — matched to lots by weight, then first in, first out.'].join('\n');
};
