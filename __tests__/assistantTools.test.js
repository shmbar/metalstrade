import { describe, it, expect } from 'vitest';
import { executeTool } from '../utils/assistantTools.js';

// "Overdue" and "balance" are two different questions about receivables, and the
// client reads the answer that way: overdue = past its due date, balance = still
// owed but not yet due. Asking for one and getting the other is the bug this
// covers — it happened because the Assistant page passed a due date that was set
// on 2 of 532 real invoices, so every invoice looked "not yet due".
const day = 86400000;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);

const inv = (over) => ({
    id: `id-${over.invoice}`,
    invoice: String(over.invoice),
    client: 'SJM',
    clientFull: 'SJM Metals',
    currency: 'USD',
    totalAmount: 1000,
    amountPaid: 0,
    balanceDue: 1000,
    paymentStatus: 'Unpaid',
    invoiceStatus: 'Issued',
    isFinal: true,
    canceled: false,
    ...over,
});

// two past their due date, one still inside its terms
const data = {
    invoices: [
        inv({ invoice: 1409, dueDate: iso(-40), balanceDue: 19909.85 }),
        inv({ invoice: 1420, dueDate: iso(-10), balanceDue: 4321.49 }),
        inv({ invoice: 1466, dueDate: iso(+15), balanceDue: 4718175.0 }),
    ],
};
const textOf = (r) => (typeof r === 'string' ? r : r.text);

describe('get_overdue_invoices — overdue and balance are not the same question', () => {
    it('scope "overdue" returns only invoices past their due date', () => {
        const out = textOf(executeTool('get_overdue_invoices', { scope: 'overdue' }, data));
        expect(out).toContain('OVERDUE INVOICES');
        expect(out).not.toContain('BALANCE INVOICES');
        expect(out).toContain('#1409');
        expect(out).toContain('#1420');
        // the not-yet-due one must not be smuggled into an "overdue" answer
        expect(out).not.toContain('#1466');
    });

    it('scope "balance" returns only invoices that are NOT yet due', () => {
        const out = textOf(executeTool('get_overdue_invoices', { scope: 'balance' }, data));
        expect(out).toContain('BALANCE INVOICES');
        expect(out).not.toContain('OVERDUE INVOICES');
        expect(out).toContain('#1466');
        expect(out).not.toContain('#1409');
    });

    it('scope "all" keeps both sections, each with its own total', () => {
        const out = textOf(executeTool('get_overdue_invoices', { scope: 'all' }, data));
        expect(out).toContain('OVERDUE INVOICES');
        expect(out).toContain('BALANCE INVOICES');
        expect(out).toContain('#1409');
        expect(out).toContain('#1466');
    });

    it('an empty category says so instead of showing the other one', () => {
        const onlyOverdue = { invoices: [inv({ invoice: 1409, dueDate: iso(-40) })] };
        const out = textOf(executeTool('get_overdue_invoices', { scope: 'balance' }, onlyOverdue));
        // this is the exact failure the client hit, mirrored: asking for one category
        // must never quietly answer with the other
        expect(out).toContain('BALANCE INVOICES — none');
        expect(out).not.toContain('#1409');
    });

    it('the header total describes only the category shown', () => {
        const out = textOf(executeTool('get_overdue_invoices', { scope: 'overdue' }, data));
        // 19909.85 + 4321.49 — the not-yet-due 4,718,175 must not be in this total
        expect(out).toContain('24231.34');
        expect(out).not.toContain('4718175');
    });

    it('cites only the invoices it actually showed', () => {
        const res = executeTool('get_overdue_invoices', { scope: 'overdue' }, data);
        expect(res.sources.map(s => s.id)).toEqual(['id-1409', 'id-1420']);
    });
});

// The Assistant's profit is the Margins page's profit: each month added up from the rows it
// lists, a deal shared with the other company counting half (margins/marginsView.js). It
// used to read the totalMargin a month document stores, which a deleted row left as it was —
// GIS 2026 answered $808,600 beside a page whose rows add up to $782,200.
describe('get_profit_info — the same profit the Margins page shows', () => {
    const row = (id, totalMargin, gis = false) => ({ id, totalMargin, gis });
    const margins = [
        // Stored total left behind by a deleted row; 'gone' is listed but no longer there,
        // 'orphan' is there but no longer listed.
        { month: '01', totalMargin: 101075, ids: ['a', 'b', 'gone'], items: [row('a', 60000), row('b', 29350, true), row('orphan', 5000)] },
        { month: '02', totalMargin: '', ids: ['c'], items: [row('c', '1200.50')] },
        { month: '03', totalMargin: 0, ids: [], items: [] },
    ];

    it('adds the year up from its rows, a shared deal counting half', () => {
        const out = textOf(executeTool('get_profit_info', {}, { margins }));
        // 60,000 + 29,350 / 2 + 1,200.50 — not the stored 101,075
        expect(out).toContain('Total margin: 75875.50');
        expect(out).not.toContain('101075');
        expect(out).toContain('Months with data: 2 of 3');
    });

    it('agrees with the Margins page on the same months', async () => {
        const { viewMonths, sumMonths } = await import('../app/(root)/margins/marginsView.js');
        // The page lists a month's rows in its `ids` order (margins/page.js Load).
        const loaded = margins.map(({ items, ids, ...rest }) => ({ ...rest, ids, items: ids.map(id => items.find(i => i.id === id)).filter(Boolean) }));
        const page = sumMonths(viewMonths(loaded)).totalMargin;
        expect(textOf(executeTool('get_profit_info', {}, { margins }))).toContain(`Total margin: ${page.toFixed(2)}`);
    });

    it('says so when there is nothing to add up', () => {
        expect(textOf(executeTool('get_profit_info', {}, { margins: [] }))).toContain('No margin data found');
    });
});
