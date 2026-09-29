// Cashflow report — one structured picture of the page, read by both the Report dialog
// (reportModal.js) and the Excel export (excel.js). It is built from the SAME state
// arrays the page renders, so every figure reconciles with the screen:
//
//   - a party's amount is the page's active figure — Pending holds are left out of it
//     and carried beside it (funcs.js pendingSplit), exactly like the section headers;
//   - suppliers are in USD (getTotalsSupPayments converts EUR at the contract's rate),
//     expenses in USD at runExpenses' 1.08, clients and stock summed as the page sums
//     them.
//
// Pure — no React, no Firestore. Names come in as resolvers so this file can be tested
// without loading funcs.js.
import { resolveInvoiceDate } from '../../../utils/pureHelpers';

const num = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
};
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

// runExpenses' EUR→USD rate for the per-vendor totals (funcs.js).
const EXP_EUR_USD = 1.08;

const isClientFinal = (z) => z.shipData?.fnlzing === '4568' || z.invType === '3333' || z.invType === 'Final Note';
const isSupplierFinal = (z) => z.fnlzing === '4568' || /fn\s*$/i.test(String(z.invoice || '').trim());
// Invoice-number suffix, as the tables print it (funcs.js getprefixInv).
const invSuffix = (z) => (!z.invType || z.invType === '1111' || z.invType === 'Invoice') ? ''
    : (z.invType === '2222' || z.invType === 'Credit Note') ? 'CN' : 'FN';
const dateOf = (d) => (d ? String(d).slice(0, 10) : '');

/* A section = the parties it lists (one accordion row each on the page) with their
   detail rows. Each party carries `summary`: its row in the export — the active rows
   summed column by column, with the page's own figure in the amount column and the
   held amount in "On hold". */
const makeSection = ({ key, title, side, party, unit, columns, amountKey, parties }) => {
    const sumKeys = columns.filter(c => c.sum).map(c => c.key);
    const built = parties.map((p) => {
        const active = p.rows.filter(r => !r._pending);
        // One currency across the party's rows → its money columns can be summed; mixed
        // → only the USD columns and the page's own figure are, the rest stay blank.
        const curs = [...new Set(active.map(r => r._cur).filter(Boolean))];
        const rowCur = curs.length === 1 ? curs[0] : curs.length === 0 ? p.cur : null;
        const summary = { name: p.name, count: p.rows.length, cur: rowCur || 'Mixed', _fmtCur: rowCur || p.cur };
        sumKeys.forEach((k) => {
            const col = columns.find(c => c.key === k);
            if (col.kind === 'money' && !rowCur) return;
            summary[k] = sum(active, r => num(r[k]));
        });
        summary[amountKey] = p.amount;
        if (columns.some(c => c.key === 'hold')) summary.hold = p.pendingAmount || null;
        if (p.pendingCount) summary.status = `${p.pendingCount} pending`;
        return { ...p, summary };
    });
    return {
        key, title, side, party, unit, columns, amountKey,
        parties: built,
        total: sum(built, p => p.amount),
        pendingTotal: sum(built, p => p.pendingAmount || 0),
        pendingCount: sum(built, p => p.pendingCount || 0),
        rowCount: sum(built, p => p.rows.length),
    };
};

const NAME = (header) => ({ key: 'name', header, width: 30 });
const COUNT = (header) => ({ key: 'count', header, width: 9, kind: 'count' });
const HOLD = { key: 'hold', header: 'On hold', width: 14, kind: 'money' };
const STATUS = { key: 'status', header: 'Status', width: 11 };

// ── Clients ─────────────────────────────────────────────────────────────────────
const clientSection = ({ key, title, aggregates, rows, paid, names }) => {
    const columns = [
        NAME('Client'), COUNT('Invoices'),
        { key: 'po', header: 'PO#', width: 12 },
        { key: 'invoice', header: 'Invoice', width: 11 },
        { key: 'invDate', header: 'Inv. date', width: 11, kind: 'date' },
        { key: 'etd', header: 'ETD', width: 11, kind: 'date' },
        { key: 'eta', header: 'ETA', width: 11, kind: 'date' },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'amount', header: 'Amount', width: 15, kind: 'money', sum: true },
        ...(paid
            ? [{ key: 'paid', header: 'Paid', width: 15, kind: 'money', sum: true }]
            : [{ key: 'pct', header: 'Payment %', width: 10, kind: 'pct' },
                { key: 'prep', header: 'Prepayment', width: 15, kind: 'money', sum: true }]),
        { key: 'balance', header: 'Balance', width: 15, kind: 'money', sum: true },
        HOLD,
        { key: 'final', header: 'Final', width: 7 },
        STATUS,
    ];
    const parties = aggregates.map((a) => ({
        id: a.client,
        name: names.client(a.client),
        cur: a.cur,
        amount: num(a.debtBlnc),
        pendingAmount: num(a._pendingBlnc),
        pendingCount: a._pendingCount || 0,
        rows: rows.filter(z => z.client === a.client).map((z) => ({
            name: names.client(z.client),
            po: z.poSupplier?.order || '',
            invoice: `${z.invoice ?? ''}${invSuffix(z)}`,
            invDate: dateOf(resolveInvoiceDate(z) || z.date),
            etd: dateOf(z.shipData?.etd?.startDate),
            eta: dateOf(z.shipData?.eta?.startDate),
            cur: z.cur,
            amount: num(z.totalAmount),
            ...(paid
                ? { paid: sum(z.payments || [], p => num(p.pmnt)) }
                : { pct: num(z.percentage) || null, prep: num(z.totalAmount) * num(z.percentage) / 100 || null }),
            balance: num(z.debtBlnc),
            final: isClientFinal(z) ? 'Yes' : 'No',
            status: z.pending ? 'Pending' : '',
            _cur: z.cur,
            _pending: !!z.pending,
            _final: isClientFinal(z),
        })),
    }));
    return makeSection({ key, title, side: 'left', party: 'Client', unit: ['invoice', 'invoices'], columns, amountKey: 'balance', parties });
};

// ── Suppliers ───────────────────────────────────────────────────────────────────
const supplierSection = ({ key, title, aggregates, rows, names }) => {
    const columns = [
        NAME('Supplier'), COUNT('Invoices'),
        { key: 'po', header: 'PO#', width: 12 },
        { key: 'invoice', header: 'Invoice', width: 13 },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'value', header: 'Value', width: 15, kind: 'money', sum: true },
        { key: 'paid', header: 'Paid', width: 15, kind: 'money', sum: true },
        { key: 'balance', header: 'Balance', width: 15, kind: 'money', sum: true },
        { key: 'balanceUsd', header: 'Balance USD', width: 15, kind: 'usd', sum: true },
        { ...HOLD, kind: 'usd' },
        { key: 'final', header: 'Final', width: 7 },
        STATUS,
    ];
    const parties = aggregates.map((a) => ({
        id: a.supplier,
        name: names.supplier(a.supplier),
        cur: 'us', // the page's supplier figures are converted to USD
        amount: num(a.blnc),
        pendingAmount: num(a._pendingBlnc),
        pendingCount: a._pendingCount || 0,
        // SupplierDetails lists the supplier's rows with a balance (funcs.js base filter).
        rows: rows.filter(z => z.supplier === a.supplier && num(z.blnc) !== 0).map((z) => ({
            name: names.supplier(z.supplier),
            po: z.order || '',
            invoice: z.invoice ?? '',
            cur: z.cur,
            value: num(z.invValue),
            paid: num(z.pmnt),
            balance: num(z.blnc),
            // getTotalsSupPayments' conversion, row by row.
            balanceUsd: z.cur === 'us' ? num(z.blnc) : num(z.blnc) * num(z.euroToUSD),
            final: isSupplierFinal(z) ? 'Yes' : 'No',
            status: z.pending ? 'Pending' : '',
            _cur: z.cur,
            _pending: !!z.pending,
        })),
    }));
    return makeSection({ key, title, side: 'right', party: 'Supplier', unit: ['invoice', 'invoices'], columns, amountKey: 'balanceUsd', parties });
};

// ── Stock ───────────────────────────────────────────────────────────────────────
const stockSection = ({ key, title, warehouses, rows, holdable, names }) => {
    const columns = [
        NAME('Warehouse'), COUNT('Lines'),
        { key: 'po', header: 'PO#', width: 14 },
        { key: 'supplier', header: 'Supplier', width: 18 },
        { key: 'description', header: 'Description', width: 28 },
        { key: 'qty', header: 'Qty (MT)', width: 11, kind: 'qty', sum: true },
        { key: 'unitPrc', header: 'Unit price', width: 13, kind: 'money' },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'value', header: 'Value', width: 16, kind: 'money', sum: true },
        ...(holdable ? [HOLD, STATUS] : []),
    ];
    const parties = warehouses.map((w) => ({
        id: w.stock,
        name: names.warehouse(w.stock),
        cur: w.cur,
        amount: num(w.total),
        pendingAmount: num(w._pendingBlnc),
        pendingCount: w._pendingCount || 0,
        rows: rows.filter(z => z.stock === w.stock).map((z) => ({
            name: names.warehouse(z.stock),
            po: (z.orders?.length ? z.orders : [z.order]).filter(Boolean).join(' + '),
            supplier: [...new Set((z.supplierIds?.length ? z.supplierIds : [z.supplier])
                .filter(id => id && id !== '-').map(names.supplier))].join(' + '),
            description: z.descriptionName || '',
            qty: num(z.qnty),
            unitPrc: num(z.unitPrc),
            cur: z.cur,
            value: z.total === '-' ? 0 : num(z.total),
            ...(holdable ? { status: z.pending ? 'Pending' : '' } : {}),
            _cur: z.cur,
            _pending: !!z.pending,
        })),
    }));
    return makeSection({ key, title, side: 'left', party: 'Warehouse', unit: ['line', 'lines'], columns, amountKey: 'value', parties });
};

// ── Expenses ────────────────────────────────────────────────────────────────────
const expenseSection = ({ aggregates, rows, names }) => {
    const columns = [
        NAME('Vendor'), COUNT('Expenses'),
        { key: 'po', header: 'PO#', width: 12 },
        { key: 'invoice', header: 'Exp. invoice', width: 14 },
        { key: 'type', header: 'Type', width: 18 },
        { key: 'date', header: 'Date', width: 11, kind: 'date' },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'amount', header: 'Amount', width: 15, kind: 'money', sum: true },
        { key: 'usd', header: 'Amount USD', width: 15, kind: 'usd', sum: true },
    ];
    const parties = aggregates.map((a) => ({
        id: a.supplier,
        name: names.supplier(a.supplier),
        cur: 'us',
        amount: num(a.amount),
        pendingAmount: 0,
        pendingCount: 0,
        rows: rows.filter(z => z.supplier === a.supplier).map((z) => ({
            name: names.supplier(z.supplier),
            po: z.poSupplier?.order ?? 'Comp. Exp.',
            invoice: z.expense || '',
            type: names.expType(z.expType),
            date: dateOf(z.date),
            cur: z.cur,
            amount: num(z.amount),
            usd: num(z.amount) * (z.cur === 'us' ? 1 : EXP_EUR_USD),
            _cur: z.cur,
        })),
    }));
    return makeSection({ key: 'expenses', title: 'Expenses', side: 'right', party: 'Vendor', unit: ['expense', 'expenses'], columns, amountKey: 'usd', parties });
};

// ── Unsold stock (the page's second tab) ────────────────────────────────────────
const unsoldSection = ({ aggregates, rows, names }) => {
    const columns = [
        NAME('Supplier'), COUNT('Lines'),
        { key: 'po', header: 'PO#', width: 12 },
        { key: 'description', header: 'Description', width: 28 },
        { key: 'warehouse', header: 'Warehouse', width: 18 },
        { key: 'qty', header: 'Qty (MT)', width: 11, kind: 'qty', sum: true },
        { key: 'unitPrc', header: 'Unit price', width: 13, kind: 'money' },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'value', header: 'Value', width: 16, kind: 'money', sum: true },
    ];
    const parties = aggregates.map((a) => ({
        id: a.supplier,
        name: a.supplierName || names.supplier(a.supplier),
        cur: a.cur,
        amount: num(a.total),
        pendingAmount: 0,
        pendingCount: 0,
        rows: rows.filter(z => z.supplier === a.supplier).map((z) => ({
            name: a.supplierName || names.supplier(z.supplier),
            po: z.order || '',
            description: z.description || '',
            warehouse: z.stockName || '',
            qty: num(z.qnty),
            unitPrc: num(z.unitPrc),
            cur: z.cur,
            value: num(z.total),
            _cur: z.cur,
        })),
    }));
    return makeSection({ key: 'unsold', title: 'Unsold Stocks', side: null, party: 'Supplier', unit: ['line', 'lines'], columns, amountKey: 'value', parties });
};

// Top n parties by amount, merged across sections (a client can sit in both the
// Payment and the Balances section), with their share of `whole`.
const topParties = (sections, whole, n = 5) => {
    const m = new Map();
    sections.forEach(s => s.parties.forEach((p) => {
        const e = m.get(p.name) || { name: p.name, amount: 0, count: 0, pendingAmount: 0 };
        e.amount += p.amount;
        e.count += p.rows.filter(r => !r._pending).length;
        e.pendingAmount += p.pendingAmount || 0;
        m.set(p.name, e);
    }));
    return [...m.values()]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, n)
        .map(e => ({ ...e, share: whole ? e.amount / whole : 0 }));
};

const AGE_BUCKETS = [
    { label: '0–30 days', maxDays: 30 },
    { label: '31–60 days', maxDays: 60 },
    { label: '61–90 days', maxDays: 90 },
    { label: 'Over 90 days', maxDays: Infinity },
];

/**
 * @param {Object} p  the page's state — see page.js buildReport for the wiring.
 * @returns the report: meta, the sections with their parties and rows, and the
 *          summary blocks (position, receivables, payables, stock, expenses, unsold,
 *          holds).
 */
export const buildCashflowReport = (p) => {
    const names = p.names;
    const asOf = p.asOf || new Date();

    const sections = [
        stockSection({ key: 'stocksPaid', title: 'Stocks - Paid', warehouses: p.stockPaid || [], rows: p.stockPaidRows || [], holdable: false, names }),
        stockSection({ key: 'stocksUnpaid', title: 'Stocks - UnPaid', warehouses: p.stockUnpaid || [], rows: p.stockUnpaidRows || [], holdable: true, names }),
        clientSection({ key: 'clientsPayment', title: 'Clients - Payment', aggregates: p.clientsPayment || [], rows: (p.clientRows || []).filter(z => !(z.payments || []).length), paid: false, names }),
        clientSection({ key: 'clientsBalances', title: 'Clients - Balances', aggregates: p.clientsBalances || [], rows: (p.clientRows || []).filter(z => (z.payments || []).length > 0), paid: true, names }),
        supplierSection({ key: 'suppliersPayment', title: 'Supplier - Payment', aggregates: p.suppliersPayment || [], rows: (p.supplierRows || []).filter(z => num(z.pmnt) === 0), names }),
        supplierSection({ key: 'suppliersBalances', title: 'Supplier - Balances', aggregates: p.suppliersBalances || [], rows: (p.supplierRows || []).filter(z => num(z.pmnt) > 0), names }),
        expenseSection({ aggregates: p.expenses || [], rows: p.expenseRows || [], names }),
        unsoldSection({ aggregates: p.unsold || [], rows: p.unsoldRows || [], names }),
    ];
    const s = Object.fromEntries(sections.map(x => [x.key, x]));

    // ── Position: the page's Total (Left) / Total (Right) and what makes them up ──
    let position = null;
    if (p.isAdmin) {
        const line = (label, amount, note = '') => ({ label, amount: num(amount), note });
        const left = [
            line('Future (incoming)', p.incoming, 'Margins still to come in'),
            ...(p.initialData || []).map(z => line(z.title || 'Opening balance', z.num)),
            line('Stocks - Paid', s.stocksPaid.total),
            line('Stocks - UnPaid', s.stocksUnpaid.total),
            line('Clients - Payment', s.clientsPayment.total),
            line('Clients - Balances', s.clientsBalances.total),
            ...(p.financedLeft || []).map(z => line(`Financing · ${z.title || 'untitled'}`, z.num)),
        ];
        const right = [
            line('Supplier - Payment', s.suppliersPayment.total),
            line('Supplier - Balances', s.suppliersBalances.total),
            line('Expenses', s.expenses.total),
            ...(p.financedRight || []).map(z => line(`Financing · ${z.title || 'untitled'}`, z.num)),
        ];
        const leftTotal = sum(left, x => x.amount);
        const rightTotal = sum(right, x => x.amount);
        const share = (arr, whole) => arr.map(x => ({ ...x, share: whole ? x.amount / whole : 0 }));
        position = {
            left: share(left, leftTotal), right: share(right, rightTotal),
            leftTotal, rightTotal, balance: leftTotal - rightTotal,
        };
    }

    // ── Receivables ──
    const clientSecs = [s.clientsPayment, s.clientsBalances];
    const clientActive = clientSecs.flatMap(x => x.parties.flatMap(pp => pp.rows)).filter(r => !r._pending);
    const clientsDue = s.clientsPayment.total + s.clientsBalances.total;
    const aging = AGE_BUCKETS.map(b => ({ ...b, count: 0, amount: 0 }));
    let undated = { count: 0, amount: 0 };
    clientActive.forEach((r) => {
        if (r.balance <= 0.01) return; // credits and settled residues are not ageing debt
        if (!r.invDate) { undated.count++; undated.amount += r.balance; return; }
        const days = Math.max(0, Math.floor((asOf - new Date(r.invDate)) / 86400000));
        const b = aging.find(x => days <= x.maxDays) || aging[aging.length - 1];
        b.count++;
        b.amount += r.balance;
    });
    const agingTotal = sum(aging, b => b.amount) + undated.amount;
    const notFinal = clientActive.filter(r => !r._final);
    const receivables = {
        due: clientsDue,
        openCount: clientActive.length,
        noPaymentYet: s.clientsPayment.total,
        partlyPaid: s.clientsBalances.total,
        pendingTotal: s.clientsPayment.pendingTotal + s.clientsBalances.pendingTotal,
        pendingCount: s.clientsPayment.pendingCount + s.clientsBalances.pendingCount,
        notFinalCount: notFinal.length,
        notFinalAmount: sum(notFinal, r => r.balance),
        aging: aging.map(b => ({ label: b.label, count: b.count, amount: b.amount, share: agingTotal ? b.amount / agingTotal : 0 })),
        undated,
        top: topParties(clientSecs, clientsDue),
    };

    // ── Payables ──
    const supplierSecs = [s.suppliersPayment, s.suppliersBalances];
    const suppliersDue = s.suppliersPayment.total + s.suppliersBalances.total;
    const payables = {
        due: suppliersDue,
        openCount: supplierSecs.reduce((n, x) => n + x.parties.reduce((m, pp) => m + pp.rows.filter(r => !r._pending).length, 0), 0),
        noPaymentYet: s.suppliersPayment.total,
        partlyPaid: s.suppliersBalances.total,
        pendingTotal: s.suppliersPayment.pendingTotal + s.suppliersBalances.pendingTotal,
        pendingCount: s.suppliersPayment.pendingCount + s.suppliersBalances.pendingCount,
        top: topParties(supplierSecs, suppliersDue),
    };

    // ── Stock ──
    const qtyOf = (sec) => sum(sec.parties.flatMap(pp => pp.rows).filter(r => !r._pending), r => r.qty);
    const stockSecs = [s.stocksPaid, s.stocksUnpaid];
    const stockTotal = s.stocksPaid.total + s.stocksUnpaid.total;
    const stock = {
        total: stockTotal,
        paid: s.stocksPaid.total, paidQty: qtyOf(s.stocksPaid),
        unpaid: s.stocksUnpaid.total, unpaidQty: qtyOf(s.stocksUnpaid),
        pendingTotal: s.stocksUnpaid.pendingTotal, pendingCount: s.stocksUnpaid.pendingCount,
        top: topParties(stockSecs, stockTotal).map(t => ({
            ...t,
            qty: sum(stockSecs.flatMap(x => x.parties.filter(pp => pp.name === t.name).flatMap(pp => pp.rows)).filter(r => !r._pending), r => r.qty),
        })),
        unsold: s.unsold.total,
        unsoldQty: qtyOf(s.unsold),
        unsoldTop: topParties([s.unsold], s.unsold.total),
    };

    const expenses = {
        total: s.expenses.total,
        count: s.expenses.rowCount,
        top: topParties([s.expenses], s.expenses.total),
    };

    // ── Everything on hold, largest first ──
    const holds = sections.flatMap(sec => sec.parties.flatMap(pp => pp.rows.filter(r => r._pending).map(r => ({
        section: sec.title,
        party: pp.name,
        reference: [r.po && `PO ${r.po}`, r.invoice && `Inv ${r.invoice}`, r.description].filter(Boolean).join(' · '),
        cur: sec.key.startsWith('suppliers') ? 'us' : r._cur,
        amount: sec.key.startsWith('suppliers') ? r.balanceUsd : sec.key.startsWith('clients') ? r.balance : r.value,
    })))).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return {
        asOf,
        account: p.account || '',
        years: p.years || [],
        isAdmin: !!p.isAdmin,
        sections,
        position,
        receivables,
        payables,
        stock,
        expenses,
        holds,
    };
};
