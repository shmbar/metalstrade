import { describe, it, expect } from 'vitest';
import { executeTool } from '../app/api/assistant/route.js';

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
