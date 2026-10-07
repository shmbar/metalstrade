// Accounting — the PURE core of the Accounting screen.
//
// Extracted out of useAccounting()'s queryFn and out of app/(app)/accounting.tsx so
// every figure can be fed fixture data and compared against web's
// app/(root)/accounting/page.js. Behaviour is unchanged.

import { num, standingDocs, ledgerTotals } from '@shared/finance';

export const getprefixInv = (x: any) =>
  x.invType === '1111' || x.invType === 'Invoice'
    ? ''
    : x.invType === '2222' || x.invType === 'Credit Note'
      ? 'CN'
      : 'FN';

export const getprefixInv1 = (x: any) =>
  x.invType === '1111' || x.invType === 'Invoice'
    ? 'Sales Invoice'
    : x.invType === '2222' || x.invType === 'Credit Note'
      ? 'Credit Note'
      : 'Final Note';

/**
 * Numeric-aware ordering. Web uses utils.sortArr (utils/utils.js:143), a plain
 * lowercased STRING compare, so web lists 1001, 1002, 999 in that order. Invoice
 * numbers are numbers to a reader, so mobile orders them numerically — a display
 * order divergence, deliberately kept; it moves no money.
 */
export const sortBy = (arr: any[], key: string) =>
  [...arr].sort((a, b) =>
    String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true })
  );

/** settings lookup: gQ(id, 'Supplier', 'nname') → 'Acme Metals'. */
export const makeGQ =
  (settings: any) =>
  (id: string, cat: string, field: string): string =>
    settings?.[cat]?.[cat]?.find((q: any) => q.id === id)?.[field] || '';

export interface AccountingLine {
  dateExp: string;
  expInvoice: string;
  supplierName: string;
  amountExp: number;
  expType: string;
  curEX: string;
  /** write targets for inline editing — absent on Purchase rows, which web blocks */
  expenseId?: string;
  expenseDate?: string;
  /** one per supplier invoice / expense document: a cost listed under several sales
      invoices is counted once in the totals (shared finance.js ledgerTotals) */
  costKey?: string;
}

export interface AccountingGroup {
  /** write targets for inline editing of the sales-invoice side */
  invoiceId?: string;
  invoiceDate?: string;
  invoice: string;
  saleInvoice: string;
  dateInv: string;
  clientInvName: string;
  amountInv: number;
  curINV: string;
  invType: string;
  /**
   * Every sales-invoice DOCUMENT folded into this number — the original plus each
   * Credit/Final Note. Web emits one merged table row per document (page.js:59
   * `invArr.map`), each carrying its own date, amount and suffixed number, so the
   * transaction count, the avg-transaction denominator and the by-weekday credit
   * bars all have to see the documents rather than the netted group.
   */
  invDocs: { saleInvoice: string; dateInv: string; amountInv: number; invType?: string; canceled?: boolean; draft?: boolean }[];
  lines: AccountingLine[];
}

/**
 * CN/FN whose original sits in this period but whose note may live elsewhere
 * (web page.js:159-162).
 */
export function selectCnFnRefs(dt: any[]): any[] {
  return dt
    .filter(
      ({ invoice, invType, cnORfl }: any) =>
        dt.filter((item: any) => item.invoice === invoice).length === 1 &&
        ['1111', 'invoice'].includes(invType) &&
        cnORfl !== undefined &&
        cnORfl !== null
    )
    .map((z: any) => z.cnORfl);
}

/** Drop standalone CN/FN with no original in the period (web page.js:166-167). */
export function dropOrphanNotes(dt: any[]): any[] {
  return dt.filter(
    (z: any) =>
      dt.find((x: any) => x.invoice === z.invoice && x.invType === '1111') ||
      z.invType === '1111' ||
      z.invType === 'Invoice'
  );
}

/** One sales-invoice row per DOCUMENT (web page.js:174-191). */
export function buildInvoiceRows(dt: any[], gQ: ReturnType<typeof makeGQ>) {
  return dt.map((l: any) => ({
    dateInv: l.final ? l.date : l.dateRange?.endDate,
    saleInvoice: l.invoice + getprefixInv(l),
    clientInvName: l.final ? l.client?.nname : gQ(l.client, 'Client', 'nname'),
    amountInv: num(l.totalAmount),
    invType: getprefixInv1(l),
    invoice: l.invoice,
    curINV: l.final ? l.cur?.cur : gQ(l.cur, 'Currency', 'cur'),
    invoiceId: l.id,
    invoiceDate: l.final ? l.date : l.dateRange?.startDate,
    // As web's row carries them for its totals (page.js): the document's own type and
    // number, and whether it was cancelled.
    invTypeRaw: l.invType,
    invoiceNo: l.invoice,
    canceled: !!l.canceled,
    // …and whether it is still a draft: a draft note does not stand in for its invoice.
    draft: l.draft === true,
  }));
}

/**
 * Purchase invoices from the linked contracts. A poInvoice contributes once per
 * invRef entry that matches a LOADED sales-invoice number (web page.js:211-234) —
 * and the ref is the SUFFIXED number, so a purchase pointing at '1001CN' buckets
 * under '1001CN', not under invoice 1001.
 */
export function buildPurchaseLines(
  contracts: any[],
  saleNumbers: Set<string>,
  gQ: ReturnType<typeof makeGQ>
) {
  const consArr: any[] = [];
  contracts.forEach((contract: any) => {
    if (!contract || !Array.isArray(contract.poInvoices)) return;
    contract.poInvoices.forEach((po: any, poIdx: number) => {
      if (!po || !Array.isArray(po.invRef)) return;
      po.invRef.forEach((ref: any) => {
        if (saleNumbers.has(ref)) {
          consArr.push({
            dateExp: contract.dateRange?.endDate,
            expInvoice: po.inv,
            supplierName: gQ(contract.supplier, 'Supplier', 'nname'),
            amountExp: num(po.invValue),
            expType: 'Purchase',
            invoice: ref,
            curEX: gQ(contract.cur, 'Currency', 'cur'),
            // by its place in the contract, not its id — web page.js: one IMS contract
            // holds two supplier invoices under the same id, and they are two costs
            costKey: `po:${contract.id}:${poIdx}`,
          });
        }
      });
    });
  });
  return consArr;
}

/** Linked expense docs (web page.js:242-258). salesInv is stripped to digits. */
export function buildExpenseLines(expData: any[], gQ: ReturnType<typeof makeGQ>) {
  return expData.map((l: any) => ({
    dateExp: l.dateRange?.endDate,
    expInvoice: l.expense,
    supplierName: gQ(l.supplier, 'Supplier', 'nname'),
    amountExp: num(l.amount),
    expType: gQ(l.expType, 'Expenses', 'expType') || l.expType,
    invoice: String(l.salesInv || '').replace(/\D/g, ''),
    curEX: gQ(l.cur, 'Currency', 'cur'),
    expenseId: l.id,
    expenseDate: l.dateRange?.startDate ?? l.date,
    costKey: `exp:${l.id}`,
  }));
}

/**
 * Group sales invoices by number, attaching their purchase/expense lines. Every
 * document is kept in `invDocs` (web lists one row per document), but the group's
 * amount is the invoice AS IT STANDS — its highest-ranked live document(s), shared
 * finance.js standingDocs. A Credit/Final Note is the invoice issued again with its
 * settled figures, not a correction to add: summing them showed every finalised
 * invoice at twice its value (1374: $182,943.00 + $182,200.50) — 2026-10-06.
 */
export function groupAccounting(invArr: any[], allLines: any[]): AccountingGroup[] {
  const byInvoice: Record<string, AccountingGroup> = {};
  invArr.forEach((s: any) => {
    const key = String(s.invoice);
    if (!byInvoice[key]) {
      byInvoice[key] = {
        invoice: key,
        saleInvoice: s.saleInvoice,
        dateInv: s.dateInv || '',
        clientInvName: s.clientInvName || '—',
        amountInv: s.amountInv,
        curINV: s.curINV || '',
        invType: s.invType,
        invoiceId: s.invoiceId,
        invoiceDate: s.invoiceDate,
        invDocs: [
          { saleInvoice: s.saleInvoice || String(s.invoice), dateInv: s.dateInv || '', amountInv: s.amountInv, invType: s.invType, canceled: !!s.canceled, draft: s.draft === true },
        ],
        lines: [],
      };
    } else {
      byInvoice[key].invDocs.push({
        saleInvoice: s.saleInvoice || String(s.invoice),
        dateInv: s.dateInv || '',
        amountInv: s.amountInv,
        invType: s.invType,
        canceled: !!s.canceled,
        draft: s.draft === true,
      });
    }
  });
  // The invoice as it stands: the note that replaced it, not the two added together.
  Object.values(byInvoice).forEach((g) => {
    const standing = standingDocs(g.invDocs);
    g.amountInv = standing.reduce((t, d) => t + (Number(d.amountInv) || 0), 0);
  });
  allLines.forEach((e) => {
    const key = String(e.invoice);
    (byInvoice[key] ||= {
      invoice: key,
      saleInvoice: '',
      dateInv: '',
      clientInvName: '—',
      amountInv: 0,
      curINV: '',
      invType: '',
      invDocs: [],
      lines: [],
    }).lines.push({
      dateExp: e.dateExp || '',
      expInvoice: String(e.expInvoice ?? ''),
      supplierName: e.supplierName || '—',
      amountExp: e.amountExp,
      expType: e.expType || '',
      curEX: e.curEX || '',
      expenseId: e.expenseId,
      expenseDate: e.expenseDate,
      costKey: e.costKey,
    });
  });

  return Object.values(byInvoice).sort((a, b) =>
    String(a.invoice).localeCompare(String(b.invoice), undefined, { numeric: true })
  );
}

// ── screen-level derivations ─────────────────────────────────────────────────

export interface AccountingSummary {
  /** dollars — web's cards (the euro part is reported apart, never added in) */
  income: number;
  expense: number;
  balance: number;
  incomeEur: number;
  expenseEur: number;
  balanceEur: number;
  marginPct: number;
  txCount: number;
  avgTx: number;
}

/**
 * Web's cards (accounting/page.js `totals`), through the shared finance.js
 * ledgerTotals: each invoice once at the value it stands at, each supplier invoice
 * and expense once however many sales invoices list it, $ and € apart. The old
 * cards added every row — notes on top of their invoices, a supplier invoice once
 * per sales invoice it covers, € into $ — and "savings" was 20% of the balance.
 *
 * txCount is the MERGED ROW count. mergeArrays (page.js:48) pairs each invoice row
 * with at most one of that number's expense lines (`shift()`) and pushes whatever is
 * left over as its own row, so per invoice number the row count is
 *   max(documents, lines)
 * — NOT max(1, lines): an invoice with a credit note and no expense is TWO rows on
 * web because each document is a row.
 */
export function accountingSummary(groups: AccountingGroup[] | undefined): AccountingSummary {
  const gs = groups || [];
  const t = ledgerTotals({
    sales: gs.flatMap((g) =>
      (g.invDocs || []).map((d) => ({ invoice: g.invoice, invType: d.invType, amount: d.amountInv, cur: g.curINV, canceled: d.canceled, draft: d.draft }))
    ),
    costs: gs.flatMap((g) => (g.lines || []).map((l) => ({ key: l.costKey, amount: l.amountExp, cur: l.curEX }))),
  });
  const txCount = gs.reduce(
    (s, g) => s + Math.max(g.invDocs?.length || 0, g.lines?.length || 0),
    0
  );
  return {
    income: t.income.us,
    expense: t.expense.us,
    balance: t.balance.us,
    incomeEur: t.income.eu,
    expenseEur: t.expense.eu,
    balanceEur: t.balance.eu,
    marginPct: t.income.us > 0 ? (t.balance.us / t.income.us) * 100 : 0,
    txCount,
    avgTx: txCount > 0 ? (t.income.us + t.expense.us) / txCount : 0,
  };
}

export const ACC_DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Web's Sat-first weekday index (page.js:431-432). -1 when the date is unusable. */
export const dayIndex = (iso?: string): number => {
  if (!iso) return -1;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return -1;
  const day = d.getDay(); // 0=Sun … 6=Sat
  return day === 6 ? 0 : day + 1; // Sat→0, Sun→1 … Fri→6
};

/**
 * Debit (costs) vs Credit (sales) by weekday — web's chartData (page.js:422-465),
 * which iterates the MERGED ROWS. Each invoice DOCUMENT is its own row carrying its
 * OWN date, so a credit note raised weeks after the original belongs to the note's
 * weekday; bucketing the netted group total put the whole net on one bar and left
 * the other empty.
 */
export function accountingWeekdayChart(groups: AccountingGroup[] | undefined) {
  const debit = new Array(7).fill(0);
  const credit = new Array(7).fill(0);
  (groups || []).forEach((g) => {
    (g.invDocs || []).forEach((d) => {
      const ci = dayIndex(d.dateInv);
      if (ci >= 0) credit[ci] += d.amountInv || 0;
    });
    (g.lines || []).forEach((l) => {
      const di = dayIndex(l.dateExp);
      if (di >= 0) debit[di] += l.amountExp || 0;
    });
  });
  return { debit, credit, hasData: debit.some((v) => v) || credit.some((v) => v) };
}
