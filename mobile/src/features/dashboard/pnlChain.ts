// Sold-basis P&L chain — port of web dashboard/funcs.js calContracts().
//
// This is the machinery behind web's Net Profit / COGS / Other Expenses / Storage
// Spend / Avg-Profit-per-MT KPIs, none of which existed on mobile.
//
// The core idea: only the cost of the SOLD portion of a contract is a cost. The
// rest is unsold stock — capital tied up, not a loss. So each contract's purchase
// value is split by soldFrac = shippedMT / contractMT.
//
// TWO TRAPS in web's implementation, reproduced deliberately so the figures match.
// Both are recorded as web bugs rather than silently "fixed" here, because a
// dashboard that disagrees with web is worse than one that agrees and is flagged:
//
//   1. sumInvProductsMT checks only `canceled` and NOT `draft`, so DRAFT invoice
//      quantities inflate shippedMT — even though the revenue rule excludes drafts.
//      Net effect: soldFrac (and therefore COGS) runs high when drafts exist.
//   2. Invoice quantities are summed RAW while contract quantities are unit-
//      converted to MT. For a KGS or LB contract the two sides are in different
//      units, so soldFrac is meaningless (it clamps to 1 almost immediately).
//
// Reproducing them is a choice, not an oversight. See DASHBOARD_PNL_CAVEATS.

export const DASHBOARD_PNL_CAVEATS = [
  'Draft invoices count toward shipped MT (web excludes only canceled), so COGS runs high where drafts exist.',
  'Invoice quantities are summed raw while contract quantities convert to MT — soldFrac is unreliable for KGS/LB contracts.',
] as const;

const num = (v: any) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// Shipped MT for one contract, from its grouped invoicesData. Counts a doc when
// its group is a singleton OR it is not the original — the same supersede rule the
// revenue figure uses, so shipped and revenue stay aligned.
export function sumInvProductsMT(invoicesData: any[]): number {
  let mt = 0;
  (invoicesData || []).forEach((group) => {
    if (!Array.isArray(group)) return;
    group.forEach((obj: any) => {
      if (!obj || obj.canceled) return; // trap 1: `draft` deliberately NOT checked
      const isOriginal = ['1111', 'Invoice'].includes(obj.invType);
      const counts = group.length === 1 || !isOriginal;
      if (!counts) return;
      (obj.productsDataInvoice || []).forEach((p: any) => {
        // trap 2: raw quantity, no unit conversion
        if (p && p.qnty !== 's' && p.qnty !== '' && !isNaN(parseFloat(p.qnty))) mt += parseFloat(p.qnty);
      });
    });
  });
  return mt;
}

// DEAL-BASIS revenue for one contract — port of web dashboard/funcs.js Total().
// This is the series web's Net Profit is built from, and it is NOT the same as the
// invoice-dated Sales Revenue KPI on the same page:
//   • attributed to the CONTRACT's month, at the CONTRACT's rate
//   • drafts AND canceled excluded (unlike sumInvProductsMT, which drops only canceled)
//   • a group of ONE counts whatever it is — a lone Credit/Final note means the
//     original was issued in a previous period, and skipping it used to drop every
//     deal that finalized this year.
export function dealRevenue(invoicesData: any[], mult: number, settings: any): number {
  let acc = 0;
  (invoicesData || []).forEach((group) => {
    if (!Array.isArray(group)) return;
    group.forEach((obj: any) => {
      if (!obj || isNaN(obj.totalAmount)) return;
      const currentCur = !obj.final
        ? obj.cur
        : settings?.Currency?.Currency?.find((x: any) => x.cur === obj.cur?.cur)?.id;
      const mltTmp = currentCur === 'us' ? 1 : mult;
      const val = obj.canceled || obj.draft === true ? 0 : obj.totalAmount * 1 * mltTmp;
      const isOriginal = ['1111', 'Invoice'].includes(obj.invType);
      acc += group.length === 1 || !isOriginal ? val : 0;
    });
  });
  return acc;
}

export interface PnlResult {
  /** deal-basis SALES revenue by contract month — the series Net Profit uses */
  dealRevenueByMonth: number[];
  dealRevenue: number;
  purchaseByMonth: number[];
  cogsByMonth: number[];
  expensesByMonth: number[];
  storageByMonth: number[];
  cogs: number;
  unsoldValue: number;
  expensesTotal: number;
  storageTotal: number;
  freightTotal: number;
  shippedMT: number;
  totalMT: number;
  /** EUR contracts with no usable rate, counted 1:1 — surfaced so the gap is visible */
  missingRate: number;
  expByType: Record<string, number>;
  materialSold: Record<string, number>;
  supplierTotals: Record<string, number>;
  /** consignee (client) ranking — web accumulatedTop5Cus */
  clientTotals: Record<string, number>;
}

// `contracts` must already be enriched with grouped `invoicesData`.
export function computePnl(contracts: any[], settings: any, companyRate: number): PnlResult {
  const z12 = () => Array(12).fill(0);
  const purchaseByMonth = z12();
  const dealRevenueByMonth = z12();
  const cogsByMonth = z12();
  const expensesByMonth = z12();
  const storageByMonth = z12();

  const supplierTotals: Record<string, number> = {};
  const clientTotals: Record<string, number> = {};
  const expByType: Record<string, number> = {};
  const materialSold: Record<string, number> = {};

  let totalMT = 0;
  let shippedMT = 0;
  let freightTotal = 0;
  let missingRate = 0;
  let cogs = 0;
  let unsoldValue = 0;
  let expensesTotal = 0;
  let storageTotal = 0;

  const freightIds = new Set(
    (settings?.Expenses?.Expenses || [])
      .filter((e: any) => String(e.expType || '').toLowerCase().includes('freight'))
      .map((e: any) => e.id)
  );
  const expLabel = (id: string) =>
    settings?.Expenses?.Expenses?.find((e: any) => e.id === id)?.expType || 'Unspecified';

  (contracts || []).forEach((x: any) => {
    // One standard company rate when set; else the contract's own; else 1:1.
    const contractRate = num(x.euroToUSD);
    const mult = companyRate > 0 ? companyRate : contractRate > 0 ? contractRate : 1;
    if (x.cur !== 'us' && !(companyRate > 0) && !(contractRate > 0)) missingRate++;
    const mltTmp = x.cur === 'us' ? 1 : mult;

    const startDate = x.dateRange?.startDate || x.date || '';
    const m = parseInt(String(startDate).substring(5, 7), 10) - 1;
    if (m < 0 || m > 11) return;

    const contractPurchase = (x.poInvoices || []).reduce((s: number, z: any) => s + num(z?.pmnt), 0) * mltTmp;
    purchaseByMonth[m] += contractPurchase;

    const supName = settings?.Supplier?.Supplier?.find((s: any) => s.id === x.supplier)?.nname || x.supplier || '—';
    supplierTotals[supName] = (supplierTotals[supName] || 0) + contractPurchase;

    // Contract tonnage, unit-converted. Web's DASHBOARD counts every productsData
    // row, including import-flagged breakdown helpers that its contracts page
    // excludes. Mobile used to filter them, which made MT Purchased read low AND
    // shrank the soldFrac denominator — inflating COGS and shrinking Unsold Stock.
    // Matching web here so every dashboard figure ties out; the inconsistency is
    // web's and is recorded as a web bug rather than silently diverged from.
    const qUnit = settings?.Quantity?.Quantity?.find((q: any) => q.id === x.qTypeTable)?.qTypeTable;
    const mtFactor = qUnit === 'KGS' ? 0.001 : qUnit === 'LB' ? 0.0005 : 1;
    let contractTotalMT = 0;
    (x.productsData || []).forEach((p: any) => {
      contractTotalMT += num(p.qnty) * mtFactor;
    });
    totalMT += contractTotalMT;

    dealRevenueByMonth[m] += dealRevenue(x.invoicesData, mult, settings);

    // Consignee ranking: same counting rule as dealRevenue, attributed per group
    // to the client the invoice was billed to.
    (x.invoicesData || []).forEach((group: any[]) => {
      if (!Array.isArray(group)) return;
      let acc = 0;
      let clnt = '';
      group.forEach((obj: any) => {
        if (!obj || isNaN(obj.totalAmount)) return;
        const currentCur = !obj.final
          ? obj.cur
          : settings?.Currency?.Currency?.find((c: any) => c.cur === obj.cur?.cur)?.id;
        clnt = !obj.final
          ? settings?.Client?.Client?.find((c: any) => c.id === obj.client)?.nname
          : obj.client?.nname;
        const mltTmp = currentCur === 'us' ? 1 : mult;
        const val = obj.canceled || obj.draft === true ? 0 : obj.totalAmount * 1 * mltTmp;
        const isOriginal = ['1111', 'Invoice'].includes(obj.invType);
        acc += group.length === 1 || !isOriginal ? val : 0;
      });
      if (clnt) clientTotals[clnt] = (clientTotals[clnt] || 0) + acc;
    });

    const contractShipped = sumInvProductsMT(x.invoicesData);
    shippedMT += contractShipped;

    // Sold-basis split.
    const soldFrac = contractTotalMT > 0 ? Math.min(1, contractShipped / contractTotalMT) : 0;
    cogs += contractPurchase * soldFrac;
    unsoldValue += contractPurchase * (1 - soldFrac);
    cogsByMonth[m] += contractPurchase * soldFrac;

    (x.productsData || []).forEach((p: any) => {
      const d = String(p.description || '').trim();
      if (!d) return;
      materialSold[d] = (materialSold[d] || 0) + num(p.qnty) * mtFactor * soldFrac;
    });

    // Expenses — the FX multiplier keys off each EXPENSE's own currency flag, but
    // uses the CONTRACT's rate (web funcs.js:268). Reproduced exactly.
    (x.expenses || []).forEach((obj: any) => {
      if (!obj || isNaN(parseFloat(obj.amount))) return;
      const m2 = obj.cur === 'us' ? 1 : mult;
      const amt = parseFloat(obj.amount) * m2;
      expensesByMonth[m] += amt;
      expensesTotal += amt;
      if (freightIds.has(obj.expType)) freightTotal += amt;
      const lbl = expLabel(obj.expType);
      expByType[lbl] = (expByType[lbl] || 0) + amt;
      if (['storage', 'warehouse'].includes(String(lbl).toLowerCase())) {
        storageByMonth[m] += amt;
        storageTotal += amt;
      }
    });
  });

  return {
    dealRevenueByMonth,
    dealRevenue: dealRevenueByMonth.reduce((s2, v) => s2 + v, 0),
    purchaseByMonth,
    cogsByMonth,
    expensesByMonth,
    storageByMonth,
    cogs,
    unsoldValue,
    expensesTotal,
    storageTotal,
    freightTotal,
    shippedMT,
    totalMT,
    missingRate,
    expByType,
    materialSold,
    supplierTotals,
    clientTotals,
  };
}
