// Contracts Review financial math — verbatim port of the web page's helpers
// (app/(root)/ContractsReview&Statement/page.js:89-154 + funcs.js:1-62).
//
// Every one of these was missing on mobile, so the Review tab showed shipped-weight
// progress only and none of web's 11 money columns. The FX convention is identical
// throughout: an amount in currency `c` converts to the VIEW currency `val.cur` by
//   c === val.cur           → 1
//   c === 'us' && val 'eu'  → 1 / euroToUSD
//   otherwise               → euroToUSD

export interface ViewCur {
  cur: 'us' | 'eu';
}

const mlt = (rowCur: string, val: ViewCur, mult: number) =>
  rowCur === val.cur ? 1 : rowCur === 'us' && val.cur === 'eu' ? 1 / mult : mult;

// Σ over a contract's poInvoices of the named field, FX-converted. `name` is
// 'pmnt' (money paid → Purchase Value) or 'invValue' etc.
export function contractsValue(contract: any, name: string, val: ViewCur, mult: number): number {
  let acc = 0;
  (contract?.poInvoices || []).forEach((z: any) => {
    const m = mlt(contract?.cur, val, mult);
    if (z && !isNaN(parseFloat(z[name]))) acc += parseFloat(z[name]) * m;
  });
  return acc;
}

// Σ EVERY payment across EVERY invoice doc in every group — originals AND notes.
// Deliberately different from total(): payments are never superseded.
export function totalInvoicePayments(groups: any[][], val: ViewCur, mult: number): number {
  let acc = 0;
  (groups || []).forEach((group) =>
    (group || []).forEach((obj: any) => {
      if (obj && Array.isArray(obj.payments)) {
        obj.payments.forEach((p: any) => {
          const m = mlt(obj.cur, val, mult);
          if (p && !isNaN(parseFloat(p.pmnt))) acc += parseFloat(p.pmnt) * 1 * m;
        });
      }
    })
  );
  return acc;
}

// Σ contract.expenses[].amount — the FX multiplier keys off EACH EXPENSE's own
// currency, not the contract's.
export function totalArrsExp(expenses: any[], val: ViewCur, mult: number): number {
  let acc = 0;
  (expenses || []).forEach((obj: any) => {
    if (!obj) return;
    const m = mlt(obj.cur, val, mult);
    if (!isNaN(parseFloat(obj.amount))) acc += parseFloat(obj.amount) * 1 * m;
  });
  return acc;
}

// Per invoice-number group, split the named field two ways:
//   accumuDeviation — the ORIGINAL '1111'/'Invoice' doc's value (what was first billed)
//   accumuLastInv   — the CURRENT value: the original when it stands alone, else the
//                     superseding Credit/Final notes
// canceled docs contribute 0. Finalized docs store cur as an object, so the id is
// recovered from settings.Currency before converting.
export function total(
  groups: any[][],
  name: string,
  val: ViewCur,
  mult: number,
  settings: any
): { accumuDeviation: number; accumuLastInv: number } {
  let accumuLastInv = 0;
  let accumuDeviation = 0;

  (groups || []).forEach((group) =>
    (group || []).forEach((obj: any) => {
      if (!obj || isNaN(obj[name])) return;
      const currentCur = !obj.final
        ? obj.cur
        : settings?.Currency?.Currency?.find((x: any) => x.cur === obj.cur?.cur)?.id;
      const m = mlt(currentCur, val, mult);
      const num = obj.canceled ? 0 : obj[name] * 1 * m;
      const isOriginal = ['1111', 'Invoice'].includes(obj.invType);

      accumuDeviation += isOriginal ? num : 0;
      accumuLastInv += (group.length === 1 && isOriginal) || (group.length > 1 && !isOriginal) ? num : 0;
    })
  );

  return { accumuDeviation, accumuLastInv };
}

export interface ReviewFinancials {
  /** Purchase Value — Σ poInvoices.pmnt */
  conValue: number;
  /** Inv Value Sales — current invoice value (notes supersede the original) */
  totalInvoices: number;
  /** originally-billed value, before any credit/final note */
  originalInvoices: number;
  /** deviation = current − original */
  deviation: number;
  /** Prepaid Amount */
  totalPrepayment1: number;
  /** Prepaid % of the sale */
  prepaidPer: number;
  /** Initial Debt = sale − prepayment */
  inDebt: number;
  /** Actual Payment — Σ all payments across all docs */
  payments: number;
  /** Debt after prepayment */
  debtaftr: number;
  /** Debt Balance = sale − payments */
  debtBlnc: number;
  /** Σ contract expenses */
  expenses1: number;
  /** profit = sale − purchase − expenses */
  profit: number;
}

// One contract's full financial row. `groups` is the contract's invoicesData
// (grouped by invoice number, as contractInvoicesFromIndex produces).
export function reviewFinancials(
  contract: any,
  groups: any[][],
  val: ViewCur,
  settings: any
): ReviewFinancials {
  const mult = parseFloat(contract?.euroToUSD) || 1;

  const conValue = contractsValue(contract, 'pmnt', val, mult);
  const amounts = total(groups, 'totalAmount', val, mult, settings);
  const prepay = total(groups, 'totalPrepayment', val, mult, settings);

  const totalInvoices = amounts.accumuLastInv;
  const originalInvoices = amounts.accumuDeviation;
  const totalPrepayment1 = prepay.accumuLastInv;
  const payments = totalInvoicePayments(groups, val, mult);
  const expenses1 = totalArrsExp(contract?.expenses || [], val, mult);

  const inDebt = totalInvoices - totalPrepayment1;
  return {
    conValue,
    totalInvoices,
    originalInvoices,
    deviation: totalInvoices - originalInvoices,
    totalPrepayment1,
    prepaidPer: totalInvoices > 0 ? (totalPrepayment1 / totalInvoices) * 100 : 0,
    inDebt,
    payments,
    debtaftr: inDebt - Math.max(0, payments - totalPrepayment1),
    debtBlnc: totalInvoices - payments,
    expenses1,
    profit: totalInvoices - conValue - expenses1,
  };
}
