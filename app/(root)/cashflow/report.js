// Cashflow report — one structured picture of the page, read by both the Report dialog
// (reportModal.js) and the Excel export (excel.js). It is built from the SAME state
// arrays the page renders, so every figure reconciles with the screen:
//
//   - a party's amount is the page's active figure — Pending holds are left out of it
//     and carried beside it (totals.js pendingSplit), exactly like the section headers;
//   - every section is in DOLLARS, as the page is: a euro invoice, lot or expense goes
//     in at the rate the page loaded with (`p.fx.rate` — today's live EUR→USD, see the
//     note at the top of totals.js). Each line keeps its own figure in its own currency
//     and carries the dollar one beside it, in the column the totals are taken from.
//
// Pure — no React, no Firestore. Names come in as resolvers so this file can be tested
// without loading funcs.js.
import { resolveInvoiceDate } from '../../../utils/pureHelpers';
import { fx, num, resolveCur, EUR_USD_FALLBACK } from '../../../utils/finance';

const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
// An expense is in euros unless it is marked dollars (funcs.js expenseCur).
const expenseCur = (z) => (z?.cur === 'us' ? 'us' : 'eu');

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
// What is on hold is a page figure, so it is in dollars like the totals beside it.
const HOLD = { key: 'hold', header: 'On hold', width: 14, kind: 'usd' };
const STATUS = { key: 'status', header: 'Status', width: 11 };

// ── Clients ─────────────────────────────────────────────────────────────────────
const clientSection = ({ key, title, aggregates, rows, paid, names, rate }) => {
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
        { key: 'balanceUsd', header: 'Balance USD', width: 15, kind: 'usd', sum: true },
        HOLD,
        { key: 'final', header: 'Final', width: 7 },
        STATUS,
    ];
    const parties = aggregates.map((a) => ({
        id: a.client,
        name: names.client(a.client),
        cur: 'us', // the page's client figures are in USD (getTotals)
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
            cur: resolveCur(z),
            amount: num(z.totalAmount),
            ...(paid
                ? { paid: sum(z.payments || [], p => num(p.pmnt)) }
                : { pct: num(z.percentage) || null, prep: num(z.totalAmount) * num(z.percentage) / 100 || null }),
            balance: num(z.debtBlnc),
            // getTotals' conversion, row by row.
            balanceUsd: fx(z.debtBlnc, z.cur, rate),
            final: isClientFinal(z) ? 'Yes' : 'No',
            status: z.pending ? 'Pending' : '',
            _cur: resolveCur(z),
            _pending: !!z.pending,
            _final: isClientFinal(z),
        })),
    }));
    return makeSection({ key, title, side: 'left', party: 'Client', unit: ['invoice', 'invoices'], columns, amountKey: 'balanceUsd', parties });
};

// ── Suppliers ───────────────────────────────────────────────────────────────────
const supplierSection = ({ key, title, aggregates, rows, names, rate }) => {
    const columns = [
        NAME('Supplier'), COUNT('Invoices'),
        { key: 'po', header: 'PO#', width: 12 },
        { key: 'invoice', header: 'Invoice', width: 13 },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'value', header: 'Value', width: 15, kind: 'money', sum: true },
        { key: 'paid', header: 'Paid', width: 15, kind: 'money', sum: true },
        { key: 'balance', header: 'Balance', width: 15, kind: 'money', sum: true },
        { key: 'balanceUsd', header: 'Balance USD', width: 15, kind: 'usd', sum: true },
        HOLD,
        { key: 'final', header: 'Final', width: 7 },
        STATUS,
    ];
    const parties = aggregates.map((a) => ({
        id: a.supplier,
        name: names.supplier(a.supplier),
        cur: 'us', // the page's supplier figures are in USD (getTotalsSupPayments)
        amount: num(a.blnc),
        pendingAmount: num(a._pendingBlnc),
        pendingCount: a._pendingCount || 0,
        // SupplierDetails lists the supplier's rows with a balance (funcs.js base filter).
        rows: rows.filter(z => z.supplier === a.supplier && num(z.blnc) !== 0).map((z) => ({
            name: names.supplier(z.supplier),
            po: z.order || '',
            invoice: z.invoice ?? '',
            cur: resolveCur(z),
            value: num(z.invValue),
            paid: num(z.pmnt),
            balance: num(z.blnc),
            // getTotalsSupPayments' conversion, row by row.
            balanceUsd: fx(z.blnc, z.cur, rate),
            final: isSupplierFinal(z) ? 'Yes' : 'No',
            status: z.pending ? 'Pending' : '',
            _cur: resolveCur(z),
            _pending: !!z.pending,
        })),
    }));
    return makeSection({ key, title, side: 'right', party: 'Supplier', unit: ['invoice', 'invoices'], columns, amountKey: 'balanceUsd', parties });
};

// ── Stock ───────────────────────────────────────────────────────────────────────
const stockSection = ({ key, title, warehouses, rows, holdable, names, rate }) => {
    const columns = [
        NAME('Warehouse'), COUNT('Lines'),
        { key: 'po', header: 'PO#', width: 14 },
        { key: 'supplier', header: 'Supplier', width: 18 },
        { key: 'description', header: 'Description', width: 28 },
        { key: 'qty', header: 'Qty (MT)', width: 11, kind: 'qty', sum: true },
        { key: 'unitPrc', header: 'Unit price', width: 13, kind: 'money' },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'value', header: 'Value', width: 16, kind: 'money', sum: true },
        { key: 'valueUsd', header: 'Value USD', width: 16, kind: 'usd', sum: true },
        ...(holdable ? [HOLD, STATUS] : []),
    ];
    const parties = warehouses.map((w) => ({
        id: w.stock,
        name: names.warehouse(w.stock),
        cur: 'us', // the page's warehouse figures are in USD (runStocks, sumUnpaidStocksByWarehouse)
        amount: num(w.total),
        pendingAmount: num(w._pendingBlnc),
        pendingCount: w._pendingCount || 0,
        rows: rows.filter(z => z.stock === w.stock).map((z) => ({
            name: names.warehouse(z.stock),
            po: (z.orders?.length ? z.orders : [z.order]).filter(Boolean).join(' + '),
            supplier: [...new Set((z.supplierIds?.length ? z.supplierIds : [z.supplier])
                .filter(id => id && id !== '-').map(names.supplier))].join(' + '),
            description: z.descriptionName || '',
            qty: names.mt ? names.mt(z) : num(z.qnty), // in MT — a kg line is not 660 tonnes
            unitPrc: num(z.unitPrc),
            cur: resolveCur(z),
            value: z.total === '-' ? 0 : num(z.total),
            valueUsd: z.total === '-' ? 0 : fx(z.total, z.cur, rate),
            ...(holdable ? { status: z.pending ? 'Pending' : '' } : {}),
            _cur: resolveCur(z),
            _pending: !!z.pending,
        })),
    }));
    return makeSection({ key, title, side: 'left', party: 'Warehouse', unit: ['line', 'lines'], columns, amountKey: 'valueUsd', parties });
};

// ── Expenses ────────────────────────────────────────────────────────────────────
const expenseSection = ({ aggregates, rows, names, rate }) => {
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
            cur: expenseCur(z),
            amount: num(z.amount),
            // runExpenses' conversion, row by row.
            usd: fx(z.amount, expenseCur(z), rate),
            _cur: expenseCur(z),
        })),
    }));
    return makeSection({ key: 'expenses', title: 'Expenses', side: 'right', party: 'Vendor', unit: ['expense', 'expenses'], columns, amountKey: 'usd', parties });
};

// ── Unsold stock (the page's second tab) ────────────────────────────────────────
const unsoldSection = ({ aggregates, rows, names, rate }) => {
    const columns = [
        NAME('Supplier'), COUNT('Lines'),
        { key: 'po', header: 'PO#', width: 12 },
        { key: 'description', header: 'Description', width: 28 },
        { key: 'warehouse', header: 'Warehouse', width: 18 },
        { key: 'qty', header: 'Qty (MT)', width: 11, kind: 'qty', sum: true },
        { key: 'unitPrc', header: 'Unit price', width: 13, kind: 'money' },
        { key: 'cur', header: 'Cur.', width: 6 },
        { key: 'value', header: 'Value', width: 16, kind: 'money', sum: true },
        { key: 'valueUsd', header: 'Value USD', width: 16, kind: 'usd', sum: true },
    ];
    const parties = aggregates.map((a) => ({
        id: a.supplier,
        name: a.supplierName || names.supplier(a.supplier),
        cur: 'us', // the page's unsold figures are in USD (runStocks)
        amount: num(a.total),
        pendingAmount: 0,
        pendingCount: 0,
        rows: rows.filter(z => z.supplier === a.supplier).map((z) => ({
            name: a.supplierName || names.supplier(z.supplier),
            po: z.order || '',
            description: z.description || '',
            warehouse: z.stockName || '',
            qty: names.mt ? names.mt(z) : num(z.qnty), // in MT, from the PO's unit
            unitPrc: num(z.unitPrc),
            cur: resolveCur(z),
            value: num(z.total),
            valueUsd: fx(z.total, z.cur, rate),
            _cur: resolveCur(z),
        })),
    }));
    return makeSection({ key: 'unsold', title: 'Unsold Stocks', side: null, party: 'Supplier', unit: ['line', 'lines'], columns, amountKey: 'valueUsd', parties });
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
    // The rate the page's figures were converted at (page.js fxRate) — the lines below are
    // converted with the same one, so each sheet adds up to the page's own section figure.
    const rate = num(p.fx?.rate) > 0 ? num(p.fx.rate) : EUR_USD_FALLBACK;

    const sections = [
        stockSection({ key: 'stocksPaid', title: 'Stocks - Paid', warehouses: p.stockPaid || [], rows: p.stockPaidRows || [], holdable: false, names, rate }),
        stockSection({ key: 'stocksUnpaid', title: 'Stocks - UnPaid', warehouses: p.stockUnpaid || [], rows: p.stockUnpaidRows || [], holdable: true, names, rate }),
        clientSection({ key: 'clientsPayment', title: 'Clients - Payment', aggregates: p.clientsPayment || [], rows: (p.clientRows || []).filter(z => !(z.payments || []).length), paid: false, names, rate }),
        clientSection({ key: 'clientsBalances', title: 'Clients - Balances', aggregates: p.clientsBalances || [], rows: (p.clientRows || []).filter(z => (z.payments || []).length > 0), paid: true, names, rate }),
        supplierSection({ key: 'suppliersPayment', title: 'Supplier - Payment', aggregates: p.suppliersPayment || [], rows: (p.supplierRows || []).filter(z => num(z.pmnt) === 0), names, rate }),
        supplierSection({ key: 'suppliersBalances', title: 'Supplier - Balances', aggregates: p.suppliersBalances || [], rows: (p.supplierRows || []).filter(z => num(z.pmnt) > 0), names, rate }),
        expenseSection({ aggregates: p.expenses || [], rows: p.expenseRows || [], names, rate }),
        unsoldSection({ aggregates: p.unsold || [], rows: p.unsoldRows || [], names, rate }),
    ];
    const s = Object.fromEntries(sections.map(x => [x.key, x]));
    // Said on the report only when a line on it is in euros.
    const hasEuro = sections.some(sec => sec.parties.some(pp => pp.rows.some(r => r._cur === 'eu')));

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
    // In dollars, like `due` above it — a euro invoice ages at the page's rate.
    clientActive.forEach((r) => {
        if (r.balance <= 0.01) return; // credits and settled residues are not ageing debt
        if (!r.invDate) { undated.count++; undated.amount += r.balanceUsd; return; }
        const days = Math.max(0, Math.floor((asOf - new Date(r.invDate)) / 86400000));
        const b = aging.find(x => days <= x.maxDays) || aging[aging.length - 1];
        b.count++;
        b.amount += r.balanceUsd;
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
        notFinalAmount: sum(notFinal, r => r.balanceUsd),
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

    // ── Everything on hold, largest first — each at the dollar figure its section counts in ──
    const holds = sections.flatMap(sec => sec.parties.flatMap(pp => pp.rows.filter(r => r._pending).map(r => ({
        section: sec.title,
        party: pp.name,
        reference: [r.po && `PO ${r.po}`, r.invoice && `Inv ${r.invoice}`, r.description].filter(Boolean).join(' · '),
        cur: 'us',
        amount: sec.key.startsWith('stocks') ? r.valueUsd : r.balanceUsd,
    })))).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return {
        asOf,
        account: p.account || '',
        years: p.years || [],
        isAdmin: !!p.isAdmin,
        // The EUR→USD every euro line above went in at, and where it came from (page.js
        // fxRate: 'live' / 'daily', or no source when the fixed fallback had to be used).
        fx: { rate, source: p.fx?.source || null, stale: !!p.fx?.stale, hasEuro },
        sections,
        position,
        receivables,
        payables,
        stock,
        expenses,
        holds,
    };
};
