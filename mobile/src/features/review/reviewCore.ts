// Invoices Review — the PURE core of useInvoicesReview.
//
// Extracted out of the hook so it can be fed fixture data and compared, figure for
// figure, against web's app/(root)/InvoicesReview&Statement/page.js. Behaviour is
// unchanged; the hook now only loads and hands the two arrays to computeInvoicesReview.

import { Contract, Invoice } from '@/data/types';
import { resolveClientName, deriveInvoice, InvoiceView } from '@/features/invoices/useInvoices';
import { resolveCur, num } from '@shared/finance';

export interface PartyStatement {
  name: string;
  byCur: Record<string, number>;
}

export interface ReducedInvoiceGroup {
  /** every document sharing one invoice number */
  group: Invoice[];
  /** the doc whose metadata (client, currency, ship data) represents the row */
  base: any;
  /** web's Total().accumuLastInv */
  totalAmount: number;
  payments: any[];
  paid: number;
  /** web's debtBlnc = totalAmount − Σ payments */
  bal: number;
}

export interface InvoicesReviewData {
  rows: InvoiceView[];
  clients: PartyStatement[];
  suppliers: PartyStatement[];
  receivablesByCur: Record<string, number>;
}

const addCur = (m: Record<string, number>, c: string, v: number) => {
  m[c] = (m[c] || 0) + v;
};

/** '1111' on drafts, 'Invoice' on finalized docs — web's test, both shapes. */
export const isOriginalDoc = (o: any) => ['1111', 'Invoice'].includes(o?.invType);

/**
 * Web's makeGroup (page.js:210-223): bucket a flat invoice list by invoice NUMBER.
 *
 * The gate is web's `if (invoiceNum)` — a TRUTHY test, so a doc whose number is 0,
 * '' or null is dropped entirely. Mobile used `== null`, which kept '' and 0 and
 * therefore invented a phantom group (and a phantom receivable) out of an
 * unnumbered draft.
 */
export function groupByInvoiceNumber(invoices: Invoice[]): Invoice[][] {
  const groups = new Map<any, Invoice[]>();
  (invoices || []).forEach((inv: any) => {
    if (!inv?.invoice) return;
    const g = groups.get(inv.invoice) || [];
    g.push(inv);
    groups.set(inv.invoice, g);
  });
  return [...groups.values()];
}

/**
 * ONE grouping + ONE reduction, shared by the review cards and the statement — they
 * apply the same web rule and previously duplicated it, which is how they drifted
 * apart in the first place.
 *
 * The amount rule is web's Total() (page.js:51-72), NOT finance.groupInvoices. The
 * two genuinely differ:
 *   • [Invoice, CreditNote, FinalNote] — web sums CN + FN; groupInvoices keeps only
 *     the max-rank doc (FN), so the card read low.
 *   • [Invoice, Invoice] (two same-type originals) — web renders $0.00 because
 *     neither doc qualifies; groupInvoices bails out and rendered BOTH as rows.
 *   • [CreditNote] alone (original outside the period) — web renders $0.00 because
 *     a single-doc group only counts when that doc IS the original.
 *   • a canceled doc contributes 0 to web's total; groupInvoices counts it.
 * finance.js is byte-identical to web's and also feeds receivables/aging/revenue
 * (all currently true parity on the dashboard), so this is fixed HERE rather than in
 * the shared module.
 */
export function reduceInvoiceGroups(invoices: Invoice[]): ReducedInvoiceGroup[] {
  return groupByInvoiceNumber(invoices).map((group) => {
    // web Total(): a doc counts when
    //   (group of 1 AND it is the original) OR (group of >1 AND it is NOT the original)
    const counted = group.filter((o: any) =>
      group.length === 1 ? isOriginalDoc(o) : !isOriginalDoc(o)
    );
    const totalAmount = counted.reduce(
      (s: number, o: any) => s + (o.canceled ? 0 : num(o.totalAmount)),
      0
    );
    // Payments come from EVERY doc in the group (web TotalInvoicePayments, page.js:32).
    const payments = group.flatMap((o: any) => o.payments || []);
    const paid = payments.reduce((t: number, p: any) => t + num(p.pmnt), 0);
    // Display metadata from the superseding doc when there is one; web falls back to
    // the group's first doc (`...x.arr[0]`).
    const base: any = (group.length > 1 ? counted[0] : group[0]) || group[0];
    return { group, base, totalAmount, payments, paid, bal: totalAmount - paid };
  });
}

const sortByCur = (m: Map<string, PartyStatement>) =>
  [...m.values()].sort(
    (a, b) =>
      Object.values(b.byCur).reduce((s, v) => s + v, 0) -
      Object.values(a.byCur).reduce((s, v) => s + v, 0)
  );

/**
 * Review rows (deduped invoices with balances) plus the statement of client
 * receivables and supplier payables, per currency.
 */
export function computeInvoicesReview(
  invoices: Invoice[],
  contracts: Contract[],
  settings: any
): InvoicesReviewData {
  const reduced = reduceInvoiceGroups(invoices || []);

  const rows = reduced
    .map((r) =>
      deriveInvoice({ ...r.base, totalAmount: r.totalAmount, payments: r.payments } as Invoice, settings)
    )
    .sort((a, b) => (b.number ?? 0) - (a.number ?? 0));

  // Client receivables — same reduction, then web's statement filter: keep
  // |bal| >= 0.1 INCLUDING negatives (over-paid credits); drafts are NOT excluded.
  const receivablesByCur: Record<string, number> = {};
  const clientMap = new Map<string, PartyStatement>();
  reduced.forEach(({ base, bal }) => {
    if (Math.abs(bal) < 0.1) return;
    const cur = resolveCur(base);
    addCur(receivablesByCur, cur, bal);
    const name = resolveClientName(base.client, settings) || '—';
    const e = clientMap.get(name) || { name, byCur: {} };
    addCur(e.byCur, cur, bal);
    clientMap.set(name, e);
  });

  // Supplier payables — web's InvoicesReview STATEMENT pipeline
  // (page.js:142-169 setInvoicesDTStatement), NOT the Cashflow payables formula
  // mobile was running here.
  //
  // Three differences that all moved money:
  //   • web has NO draft filter on this screen (Cashflow does) — a purchase invoice
  //     marked "Hidden from Cashflow" still counts in the statement.
  //   • web has NO ≤1¢ artifact filter here.
  //   • web only counts a poInvoice whose invRef[0] matches a sales invoice number
  //     that is actually LOADED in the period; mobile counted every poInvoice on
  //     every contract in range.
  // A per-currency row whose balance nets to zero is then dropped (web sumSuppliers
  // filters `blnc != 0`).
  const loadedInvNums = new Set(
    (invoices || []).map((i: any) => parseFloat(i?.invoice)).filter((n) => !isNaN(n))
  );
  const supMap = new Map<string, PartyStatement>();
  (contracts || []).forEach((con: any) => {
    const cur = con.cur === 'eu' ? 'eu' : 'us';
    const name =
      settings?.Supplier?.Supplier?.find((s: any) => s.id === con.supplier)?.nname || '—';
    (con.poInvoices || []).forEach((po: any) => {
      const ref = parseFloat((po?.invRef || [])[0]);
      if (isNaN(ref) || !loadedInvNums.has(ref)) return;
      const blnc = num(po.blnc);
      const e = supMap.get(name) || { name, byCur: {} };
      addCur(e.byCur, cur, blnc);
      supMap.set(name, e);
    });
  });
  supMap.forEach((e, k) => {
    Object.keys(e.byCur).forEach((c) => {
      if (e.byCur[c] === 0) delete e.byCur[c];
    });
    if (!Object.keys(e.byCur).length) supMap.delete(k);
  });

  return { rows, clients: sortByCur(clientMap), suppliers: sortByCur(supMap), receivablesByCur };
}
