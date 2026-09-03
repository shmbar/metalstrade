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

export interface MarginsSummary {
  quantity: number;
  shipped: number;
  outstanding: number;
  profits: number;
}

/**
 * Sum of every margin ITEM across every loaded month — web's marginsSummary
 * (dashboard/page.js:1638-1649), which is where the dashboard's headline
 * Purchased/Shipped/Pending tonnage AND Gross Profit both now read from
 * (":1841-1843 'Tonnage and profit come from the Margins worksheet'"; ":1759
 * totalPL = marginsSummary.profits"). calContracts' own totalMT/shippedMT loop
 * above still runs — Contract Expenses, the per-type breakdown and the tonnage
 * cap still need it — this is a SEPARATE figure web reads for the headline tiles.
 *
 * quantity/shipped/outstanding are NOT halved on a GIS-shared row: the full
 * tonnage moves through IMS either way (Zak, 2026-08-31). Only `profits` halves,
 * matching the rule the Margins sheet itself has always applied to a shared deal.
 */
export function computeMarginsSummary(margins: any[]): MarginsSummary {
  const nn = (v: any) => {
    const x = parseFloat(v);
    return isNaN(x) ? 0 : x;
  };
  const acc: MarginsSummary = { quantity: 0, shipped: 0, outstanding: 0, profits: 0 };
  (margins || []).forEach((mo: any) => {
    (mo?.items || []).forEach((i: any) => {
      acc.quantity += nn(i.purchase);
      acc.shipped += nn(i.shipped);
      acc.outstanding += nn(i.openShip);
      acc.profits += i.gis ? nn(i.totalMargin) / 2 : nn(i.totalMargin);
    });
  });
  return acc;
}

// Shipped MT for one contract, from its grouped invoicesData. Counts a doc when
// its group is a singleton OR it is not the original — the same supersede rule the
// revenue figure uses, so shipped and revenue stay aligned.
/**
 * Which material an invoice LINE names — web funcs.js:108-118 invLineMaterial.
 *
 * A line names its material by descriptionId: the id of a row in productsData,
 * carried on the invoice itself and, for older invoices, only on the parent
 * contract. The line's own `description` exists in the draft shape but is empty on
 * every saved line, and descriptionText holds heat-level detail ("24.4Ni 11.95Cr
 * 0.48Mo Solids Scrap") — one distinct string per lot, so grouping on it shatters
 * the ranking into hundreds of one-offs. Id first, both places, then the text, and
 * only then give up.
 */
export function invLineMaterial(line: any, invoice: any, contract: any): string {
  const byId = (arr: any[]) => (arr || []).find((y: any) => y.id === line?.descriptionId)?.description;
  return (
    String(byId(invoice?.productsData) || byId(contract?.productsData) || line?.descriptionText || '').trim() ||
    'Unspecified'
  );
}

/**
 * Shipped MT off the invoice lines — web funcs.js:119-144.
 *
 * `byMaterial`, when passed, is filled with material -> MT off the SAME lines this
 * totals. That is the point of threading it through rather than computing it
 * separately: "Most-Sold Material" reconciles to shipped MT by construction, and
 * there is no second rule about which invoices count that could drift from this one.
 */
export function sumInvProductsMT(
  invoicesData: any[],
  byMaterial: Record<string, number> | null = null,
  contract: any = null
): number {
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
        if (p && p.qnty !== 's' && p.qnty !== '' && !isNaN(parseFloat(p.qnty))) {
          const q = parseFloat(p.qnty);
          mt += q;
          if (byMaterial) {
            const d = invLineMaterial(p, obj, contract);
            byMaterial[d] = (byMaterial[d] || 0) + q;
          }
        }
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
  /** contracts whose own records contradict each other — over-valued lines, duplicate POs */
  dataIssues: any[];
  /** the partner's half of a shared IMS/GIS deal, tracked so profit can state it */
  gisCogs: number;
  gisExpenses: number;
  /**
   * Commission billed BY GIS to IMS — money moving between the two houses, not a
   * cost of trading, so it is diverted OUT of expensesTotal/expByType entirely
   * rather than counted there (web funcs.js:309-320, Zak 2026-09-02). At the time
   * web made this change it was 94% of ALL commission ($305,495 of $326,378), which
   * had been making commission read as the single biggest cost line in the business.
   */
  gisCommission: { total: number; rows: any[]; byEntity: { name: string; value: number }[] };
}

/**
 * Month an expense belongs to — web funcs.js:228-246.
 * Contract expenses carry their own date, but this used to bucket them by the
 * CONTRACT start month, so a December cost on a January contract landed in January
 * and skewed the monthly profit line. Trust the expense date only when it falls in
 * the contract year, so a stray date cannot move spend out of the loaded period;
 * the annual total is identical either way.
 */
function expenseMonth(obj: any, contract: any, fallback: number): number {
  const d = obj?.date || obj?.dateRange?.startDate;
  if (typeof d !== 'string' || d.length < 7) return fallback;
  const yr = String(contract?.dateRange?.startDate || '').substring(0, 4);
  if (yr && d.substring(0, 4) !== yr) return fallback;
  const m = Number(d.substring(5, 7));
  return m >= 1 && m <= 12 ? m : fallback;
}

/**
 * How far a contract's line values may exceed its PO value before it is flagged —
 * web funcs.js:VALUE_TOLERANCE. Set at 3x deliberately, not tighter: poInvoices is a
 * LIST, so a contract invoiced in instalments legitimately shows lines worth more
 * than the PO value recorded so far, and a half-invoiced contract sits near 2x
 * through no fault of its data. At 1.5x this flagged eight contracts, six of them
 * explained by partial invoicing; a banner that cries wolf is a banner nobody reads.
 */
const VALUE_TOLERANCE = 3;

// `contracts` must already be enriched with grouped `invoicesData`.
export function computePnl(
  contracts: any[],
  settings: any,
  companyRate: number,
  expenseRows: any[] | null = null,
  liveRate = 0
): PnlResult {
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
  let gisCogs = 0;
  let gisExpenses = 0;
  const dataIssues: any[] = []; // contracts whose own records contradict each other

  /* Canonical expense rows bucketed by the contract they belong to. `unlinked` are
     rows dated in the period whose contract is not in the loaded set — real spend the
     /expenses page counts, so they are added AFTER the contract loop rather than
     dropped. The dashboard used to total expenses off each contract's own embedded
     `expenses` array, which is a partial, stale mirror: at the time web changed this
     it held 40 rows against the collection's 73, understating contract expenses by
     $191,094 — 30% — and carried 2 rows with no canonical record at all. Falling back
     to x.expenses when no index is supplied keeps older callers working. */
  let expByContract: Record<string, any[]> | null = null;
  let unlinkedExpenses: any[] | null = null;
  if (Array.isArray(expenseRows)) {
    expByContract = {};
    unlinkedExpenses = [];
    const ids = new Set((contracts || []).map((c: any) => c.id));
    expenseRows.forEach((r: any) => {
      const cid = r?.poSupplier?.id;
      if (cid && ids.has(cid)) (expByContract![cid] ||= []).push(r);
      else unlinkedExpenses!.push(r);
    });
  }

  const freightIds = new Set(
    (settings?.Expenses?.Expenses || [])
      .filter((e: any) => String(e.expType || '').toLowerCase().includes('freight'))
      .map((e: any) => e.id)
  );
  const expLabel = (id: string) =>
    settings?.Expenses?.Expenses?.find((e: any) => e.id === id)?.expType || 'Unspecified';

  /* Commission billed by GIS is diverted before any expense accumulator sees it, so
     Contract Expenses, Expenses by Type, the per-MT figures and the drill-down all
     exclude it consistently — one exit rather than several subtractions. No expense
     row carries a GIS flag, so it is identified the only way the data allows: a
     commission-type expense whose counterparty is a GIS entity. Word-boundary match,
     so a supplier that merely CONTAINS those letters is not swept in. */
  const supplierNameOf = (id: string) =>
    settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || '';
  const isGisCommission = (obj: any) =>
    /commission/i.test(expLabel(obj?.expType)) && /\bGIS\b/i.test(supplierNameOf(obj?.supplier));
  const gisCommission: { total: number; rows: any[] } = { total: 0, rows: [] };

  (contracts || []).forEach((x: any) => {
    // One standard company rate when set; else the contract's own; else 1:1.
    const contractRate = num(x.euroToUSD);
    // company rate, then the contract's own, then the LIVE rate, then 1:1. A EUR
    // contract with neither rate used to be converted at 1.0 — the euro counted as a
    // dollar, silently, in whatever total it landed in.
    const mult =
      companyRate > 0 ? companyRate : contractRate > 0 ? contractRate : liveRate > 0 ? liveRate : 1;
    if (x.cur !== 'us' && !(companyRate > 0) && !(contractRate > 0)) missingRate++;
    const mltTmp = x.cur === 'us' ? 1 : mult;

    const startDate = x.dateRange?.startDate || x.date || '';
    const m = parseInt(String(startDate).substring(5, 7), 10) - 1;
    if (m < 0 || m > 11) return;

    const contractPurchase = (x.poInvoices || []).reduce((s: number, z: any) => s + num(z?.pmnt), 0) * mltTmp;
    purchaseByMonth[m] += contractPurchase;

    // web funcs.js:477 now says 'Unknown supplier' and ADDS on collision, rather
    // than assigning — two ids resolving to the same nname used to overwrite each
    // other, and every id missing from settings collapsed onto one `undefined` key.
    // Both silently deleted contract value from the card while the header total still
    // counted it. Mobile had already avoided the overwrite; this adopts web's label.
    const supName =
      settings?.Supplier?.Supplier?.find((s: any) => s.id === x.supplier)?.nname || 'Unknown supplier';
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
    /* A contract cannot have bought more material than its own money paid for. Where
       the entered quantities multiply out to far more than the PO is worth, the
       QUANTITIES are the thing that is wrong, so tonnage is capped at
       PO value / weighted-average unit price. 060526-TIM entered 2,576.8 MT at
       $4,050/MT — $10.4M of material — against ten payments totalling $774,683,
       because thirteen of its twenty-three rows have the contract TOTAL (191) pasted
       into them. The cap puts it back at 191 MT.
       Three guards: only past VALUE_TOLERANCE, so an ordinary part-invoiced contract
       is never touched; never UPWARD, so a genuinely under-invoiced contract keeps
       what it entered; and the correction is reported so the source record still gets
       fixed rather than quietly papered over. */
    const enteredMT = contractTotalMT;
    let lineValue = 0;
    let pricedMT = 0;
    (x.productsData || []).forEach((p2: any) => {
      const q = parseFloat(p2.qnty);
      const pr = parseFloat(p2.unitPrc);
      if (!isNaN(q) && !isNaN(pr)) {
        lineValue += q * pr;
        pricedMT += q * mtFactor;
      }
    });
    const poValue = (x.poInvoices || []).reduce((s2: number, z: any) => {
      const v = parseFloat(z?.pmnt);
      return isNaN(v) ? s2 : s2 + v;
    }, 0);
    if (contractTotalMT > 0 && poValue > 0 && lineValue > poValue * VALUE_TOLERANCE) {
      const avgPrice = pricedMT > 0 ? lineValue / pricedMT : 0;
      if (avgPrice > 0) {
        const impliedMT = poValue / avgPrice;
        if (impliedMT < contractTotalMT) contractTotalMT = impliedMT;
      }
      dataIssues.push({
        id: x.id,
        order: x.order || '',
        supplier: x.supplier,
        date: x.dateRange?.startDate || '',
        mt: contractTotalMT,
        kind: 'value',
        lineValue,
        poValue,
        ratio: lineValue / poValue,
        correctedTo: contractTotalMT,
        enteredMT,
      });
    }
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

    const contractShipped = sumInvProductsMT(x.invoicesData, materialSold, x);
    shippedMT += contractShipped;

    // Sold-basis split.
    const soldFrac = contractTotalMT > 0 ? Math.min(1, contractShipped / contractTotalMT) : 0;
    cogs += contractPurchase * soldFrac;
    // A contract ticked 'Shared IMS / GIS deal' keeps HALF its profit — the partner
    // takes the other half, as the Margins sheet has always done. Tonnage is NOT
    // halved: the full quantity moves through IMS either way (Zak, 2026-08-31). So
    // the cost and expense sides are tracked separately and the partner's share is
    // subtracted from profit as one explicit figure, rather than by quietly scaling
    // revenue and cost — which would have halved Average Rate per MT along with them.
    if (x.gis) gisCogs += contractPurchase * soldFrac;
    unsoldValue += contractPurchase * (1 - soldFrac);
    cogsByMonth[m] += contractPurchase * soldFrac;

    /* most-sold material is filled by sumInvProductsMT above, off the actual invoice
       lines. It used to be ESTIMATED here: every purchased product line scaled by one
       contract-level soldFrac. That spread a sale across materials that never shipped
       — buy 100 MT of A and 100 MT of B, ship only A, and the card reported 50 MT of
       each. The invoice lines carry the material and the qty, so the real split was
       always available; nothing needed estimating. */

    // Expenses — the FX multiplier keys off each EXPENSE's own currency flag, but
    // uses the CONTRACT's rate (web funcs.js:268). Reproduced exactly.
    const ownExpenses = expByContract ? expByContract[x.id] || [] : x.expenses || [];
    ownExpenses.forEach((obj: any) => {
      if (!obj || isNaN(parseFloat(obj.amount))) return;
      const m2 = obj.cur === 'us' ? 1 : mult;
      const amt = parseFloat(obj.amount) * m2;
      if (isGisCommission(obj)) {
        gisCommission.total += amt;
        gisCommission.rows.push({
          supplier: obj.supplier,
          order: x.order || '',
          usd: amt,
          amount: parseFloat(obj.amount),
          cur: obj.cur || 'us',
          date: obj.date || obj.dateRange?.startDate || '',
        });
        return;
      }
      const expMonth = expenseMonth(obj, x, m + 1) - 1;
      expensesByMonth[expMonth] += amt;
      expensesTotal += amt;
      if (freightIds.has(obj.expType)) freightTotal += amt;
      const lbl = expLabel(obj.expType);
      expByType[lbl] = (expByType[lbl] || 0) + amt;
      if (x.gis) gisExpenses += amt;
      // web funcs.js:441 uses includes(), so "Storage Costs" and "Warehouse Rent"
      // both bucket. An exact match missed every label with a qualifier on it.
      const lblLower = String(lbl).toLowerCase();
      if (lblLower.includes('storage') || lblLower.includes('warehouse')) {
        storageByMonth[expMonth] += amt;
        storageTotal += amt;
      }
    });
  });

  /* Expenses dated in the period whose contract is not in the loaded set. Counted at
     the company rate (or live, or 1:1) rather than a contract's own, because there is
     no contract to borrow one from. Bucketed by the expense's OWN date, the only date
     it has. */
  (unlinkedExpenses || []).forEach((obj: any) => {
    const amt = parseFloat(obj?.amount);
    if (isNaN(amt)) return;
    const m2 = obj.cur === 'us' ? 1 : companyRate > 0 ? companyRate : liveRate > 0 ? liveRate : 1;
    const val = amt * m2;
    const d = obj.date || obj.dateRange?.startDate || '';
    // Same diversion as the linked rows above — an unlinked GIS commission is
    // still GIS commission, and the two biggest ones carry no contract.
    if (isGisCommission(obj)) {
      gisCommission.total += val;
      gisCommission.rows.push({
        supplier: obj.supplier,
        order: '',
        usd: val,
        amount: amt,
        cur: obj.cur || 'us',
        date: d,
      });
      return;
    }
    const mm = Number(String(d).substring(5, 7));
    const expMonth = (mm >= 1 && mm <= 12 ? mm : 1) - 1;
    expensesByMonth[expMonth] += val;
    expensesTotal += val;
    if (freightIds.has(obj.expType)) freightTotal += val;
    const lbl = expLabel(obj.expType);
    expByType[lbl] = (expByType[lbl] || 0) + val;
    const l = String(lbl).toLowerCase();
    if (l.includes('storage') || l.includes('warehouse')) {
      storageByMonth[expMonth] += val;
      storageTotal += val;
    }
  });

  /* Duplicate PO numbers. Two documents sharing an order number are counted twice by
     everything on this page — contract 090426 existed twice with the same two product
     lines and different payment totals, quietly adding 143 MT and ~$560K. Firestore
     cannot see it: the documents have different ids, so only the PO number gives it
     away. */
  const byOrder: Record<string, any[]> = {};
  (contracts || []).forEach((x: any) => {
    const key = String(x.order || '').trim();
    if (key) (byOrder[key] ||= []).push(x);
  });
  Object.entries(byOrder).forEach(([order, list]) => {
    if (list.length < 2) return;
    dataIssues.push({
      kind: 'duplicate',
      order,
      id: list[0].id,
      supplier: list[0].supplier,
      date: list[0].dateRange?.startDate || '',
      copies: list.length,
      mt: list.slice(1).reduce((s2: number, c: any) => {
        const u = settings?.Quantity?.Quantity?.find((q: any) => q.id === c.qTypeTable)?.qTypeTable;
        const f = u === 'KGS' ? 0.001 : u === 'LB' ? 0.0005 : 1;
        return s2 + (c.productsData || []).reduce((t: number, pr: any) => t + (parseFloat(pr.qnty) || 0) * f, 0);
      }, 0),
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
    dataIssues,
    gisCogs,
    gisExpenses,
    gisCommission: {
      total: gisCommission.total,
      rows: gisCommission.rows,
      // WHO billed it — the card's own breakdown (web page.js gisCommissionBy).
      byEntity: Object.entries(
        gisCommission.rows.reduce((acc: Record<string, number>, r: any) => {
          const name = supplierNameOf(r.supplier) || 'GIS';
          acc[name] = (acc[name] || 0) + r.usd;
          return acc;
        }, {})
      )
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value),
    },
  };
}
