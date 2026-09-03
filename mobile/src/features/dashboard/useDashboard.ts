import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings, selectTermDays, selectCompanyRate } from '@/store/settings';
import { loadData, loadFlatByDate, buildInvoiceIndex, contractInvoicesFromIndex, loadMargins } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import {
  receivables as financeReceivables,
  agingBuckets,
  invoiceRevenue,
  contractPurchaseValue,
  num,
  groupInvoices,
  isIssued,
  resolveInvoiceDate,
  resolveCur,
  ReceivablesSlot,
  AgingBucket,
} from '@shared/finance';
import { getCur } from '@/data/writes';
import { computePnl, computeMarginsSummary } from './pnlChain';
import { resolveClientName } from '@/features/invoices/useInvoices';

export interface DashboardFilters {
  supplier: string;
  client: string;
  material: string;
}


export interface DashboardData {
  contractCount: number;
  purchaseByCur: Record<string, number>;
  totalMT: number;
  revenueByCur: Record<string, number>;
  /** web parity: the single USD Sales Revenue figure (company-rate aware) */
  revenueUsd: number;
  revenueByMonth: number[]; // 12 months, converted to a USD basis (web's companyRate rule)
  receivables: Record<string, ReceivablesSlot>;
  aging: AgingBucket[];
  miscByCur: Record<string, number>;
  miscCount: number;
  topSuppliers: { name: string; value: number }[];

  // ── sold-basis P&L (web's Net Profit / COGS / Expenses / Storage KPIs) ──────
  /** revenue − COGS − expenses, all deal-basis (contract month, contract rate) */
  netProfit: number;
  /** Margins profits, BEFORE overheads - web's totalPL */
  grossProfit: number;
  /** company expenses, converted - web's companyExpAgg.total */
  overheads: number;
  cogs: number;
  expensesTotal: number;
  storageTotal: number;
  shippedMT: number;
  /** netProfit / shippedMT */
  avgProfitPerMT: number;
  /** purchase value of material NOT yet sold — capital tied up, not a loss */
  unsoldValue: number;
  freightTotal: number;
  /** EUR contracts with no usable FX rate, counted 1:1 */
  missingRate: number;
  cogsByMonth: number[];
  expensesByMonth: number[];
  profitByMonth: number[];
  /** deal-basis sales revenue — the basis Net Profit uses (web Capital Breakdown) */
  dealRevenue: number;
  dealRevenueByMonth: number[];
  pendingMT: number;
  avgCostPerMT: number;
  avgExpensePerMT: number;
  avgFreightPerMT: number;
  materialSold: { name: string; value: number }[];
  miscByCat: { name: string; amount: number; count: number }[];
  dueCount: number;
  balanceCount: number;
  consignees: { name: string; value: number }[];
  expByType: { name: string; value: number }[];
  /** web's "Contracts — $" ranking-card headline — the same accumulatedPmnt sum topSuppliers ranks */
  totalContracts: number;
  /** commission billed by GIS, held out of expensesTotal — web's GIS Commission card */
  gisCommission: { total: number; rows: any[]; byEntity: { name: string; value: number }[] };
}

// Loads everything the dashboard needs in parallel, then derives KPIs. The
// financial aggregates come straight from the shared finance.js so they match
// the web CRM to the cent.
export function useDashboard(filters: DashboardFilters = { supplier: '', client: '', material: '' }) {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();
  const termDays = useSettings(selectTermDays);
  const companyRate = useSettings(selectCompanyRate);

  const enabled = !!uidCollection && loaded;

  const query = useQuery({
    enabled,
    queryKey: ['dashboard', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;

      // Contracts in the selected period, enriched with their linked invoices in
      // one batched pass (the same N+1-avoiding flow the web dashboard uses).
      const contracts = await loadData<Contract>(uid, 'contracts', dateSelect);
      const invIndex = await buildInvoiceIndex(uid, contracts);
      const enriched = contracts.map((c) => ({
        ...c,
        invoicesData: contractInvoicesFromIndex(c, invIndex, true) as Invoice[][],
      }));

      // Revenue invoices dated in the period.
      const periodInvoices = await loadData<Invoice>(uid, 'invoices', dateSelect);

      // Outstanding receivables are a running total — last 4 years, like the web app.
      const curYr = new Date().getFullYear();
      const recvInvoices = await loadData<Invoice>(uid, 'invoices', {
        start: `${curYr - 3}-01-01`,
        end: `${curYr}-12-31`,
      });

      // Misc (P1 special) invoices in the period.
      const misc = await loadFlatByDate<any>(uid, 'specialInvoices', dateSelect);

      /* CANONICAL expense rows - the collection /expenses reads. The dashboard used
         to total expenses off each contract's embedded `expenses` array, a partial
         stale mirror that understated contract spend by ~30% and could not see a
         supplier, a sales invoice or a paid flag. Web fixed this (page.js:1558 passes
         scopedExpenses); mobile was still on the old source. */
      const expenseRows = await loadData<any>(uid, 'expenses', dateSelect);

      /* Live EUR/USD, used ONLY as the last fallback before 1:1. Without it a EUR
         contract with no company rate and no rate of its own converted at 1.0 - the
         euro counted as a dollar in whatever total it landed in. Best-effort: a
         failure leaves the old behaviour rather than blocking the screen. */
      const liveRate = await getCur(new Date().toISOString().slice(0, 10)).catch(() => 0);

      /* MARGINS and COMPANY OVERHEADS. Web's headline Net Profit is not revenue minus
         cost minus expenses at all — it is the Margins page's Profits figure minus
         company overheads (page.js:1759 + :1788). Mobile was computing its own
         revenue-cogs-expenses figure and calling it the same thing, which is why the
         two apps disagreed on the single number a user looks at first. */
      const margins = await loadMargins(uid, Number(dateSelect.start.substring(0, 4))).catch(() => []);
      const companyExpenses = await loadFlatByDate<any>(uid, 'companyExpenses', dateSelect).catch(() => []);

      return { enriched, periodInvoices, recvInvoices, misc: misc.filter(Boolean), expenseRows, liveRate, margins, companyExpenses };
    },
  });

  const data = useMemo<DashboardData | null>(() => {
    if (!query.data) return null;
    const { enriched: allEnriched, periodInvoices: allPeriodInv, recvInvoices: allRecv, misc, expenseRows, liveRate, margins, companyExpenses } = query.data;
    const { supplier: fSupplier, client: fClient, material: fMaterial } = filters;

    // Web's exact predicates (dashboard/page.js:928-934): supplier by id, material
    // by an exact productsData description match, client by the RESOLVED NAME —
    // which has to work against both the draft shape (an id) and the finalized
    // shape ({ nname }), hence resolveClientName on both sides.
    const enriched = allEnriched.filter((c: any) => {
      if (fSupplier && c.supplier !== fSupplier) return false;
      if (fMaterial && !(c.productsData || []).some((p: any) => (p.description || '') === fMaterial)) return false;
      if (
        fClient &&
        !(c.invoicesData || []).some((g: any[]) =>
          (g || []).some((inv: any) => resolveClientName(inv.client, settings) === fClient)
        )
      )
        return false;
      return true;
    });

    // Revenue: the Client filter matches the invoice directly; Supplier/Material can
    // only resolve through a loaded contract, so they narrow by the filtered PO set.
    const allowedPO = fSupplier || fMaterial ? new Set(enriched.map((c: any) => c.id)) : null;
    const periodInvoices = allPeriodInv.filter((inv: any) => {
      if (fClient && resolveClientName(inv.client, settings) !== fClient) return false;
      if (allowedPO && !allowedPO.has(inv.poSupplier?.id)) return false;
      return true;
    });

    // Receivables + aging follow the Client filter only (web page.js:1030, 1039).
    const recvInvoices = fClient
      ? allRecv.filter((inv: any) => resolveClientName(inv.client, settings) === fClient)
      : allRecv;

    // Purchase value from contracts. Tonnage does NOT come from this loop any more
    // — see marginsSummary below, which is where web's headline Purchased/Shipped/
    // Pending now read from (page.js "Tonnage and profit come from the Margins
    // worksheet"). soldFrac and the tonnage-cap inside calContracts still need their
    // OWN contract-quantity loop, so that one stays in pnlChain.ts unchanged.
    const purchaseByCur: Record<string, number> = {};
    const supplierTotals: Record<string, number> = {};
    enriched.forEach((c) => {
      const pv = contractPurchaseValue(c, { base: 'us' });
      Object.entries(pv.byCur).forEach(([cur, v]) => (purchaseByCur[cur] = (purchaseByCur[cur] || 0) + v));
      const supName =
        settings.Supplier?.Supplier?.find((s) => s.id === c.supplier)?.nname || c.supplier || '—';
      // Supplier ranking value — web's rule (dashboard/funcs.js): a EUR contract
      // converts at the COMPANY standard rate when one is set, else its own
      // euroToUSD, else 1:1. contractPurchaseValue().base routes through fx(), which
      // never consults the company rate — so on a EUR-heavy book both the values and
      // the ranking ORDER drifted from web.
      const cCur = c.cur === 'eu' ? 'eu' : 'us';
      const cRate = num((c as any).euroToUSD);
      const cMult =
      cCur === 'us' ? 1 : companyRate > 0 ? companyRate : cRate > 0 ? cRate : liveRate > 0 ? liveRate : 1;
      supplierTotals[supName] = (supplierTotals[supName] || 0) + (pv.byCur[cCur] || 0) * cMult;
    });

    const revenue = invoiceRevenue(periodInvoices, { base: 'us' });

    // Monthly revenue series (issued invoices, by invoice month) for the trend chart.
    // Converted to a single USD basis with web's exact rule (dashboard/page.js:986):
    // the company's standard rate when set, else the invoice's own euroToUSD, else
    // 1:1. Summing raw totalAmount added EUR invoices at face value into a
    // USD-labelled series, so the chart and its total read low for EUR-heavy months.
    const revenueByMonth = Array(12).fill(0);
    groupInvoices(periodInvoices)
      .filter(isIssued)
      .forEach((inv) => {
        const iso = resolveInvoiceDate(inv);
        const m = iso ? parseInt(iso.substring(5, 7), 10) - 1 : -1;
        if (m < 0 || m > 11) return;
        const amt = num(inv.totalAmount);
        const rate = num((inv as any).euroToUSD);
        const mult = companyRate > 0 ? companyRate : rate > 0 ? rate : liveRate > 0 ? liveRate : 1;
        revenueByMonth[m] += resolveCur(inv) === 'us' ? amt : amt * mult;
      });

    // Web's Sales Revenue KPI is ONE USD figure, accumulated in the same pass as
    // its monthly series — so the total is exactly the sum of the months. Mobile
    // showed per-currency raw sums instead, and threw away the USD figure the
    // shared module computes (invoiceRevenue().base is unusable here anyway: its
    // fx() ignores the company standard rate).
    const revenueUsd = revenueByMonth.reduce((s, v) => s + v, 0);

    const recv = financeReceivables(recvInvoices, { asOf: new Date(), termDays });
    const aging = agingBuckets(recvInvoices, { asOf: new Date() });

    // Misc invoices by CATEGORY — web shows shipments/personal/random/uncategorized
    // amounts, counts and share.
    const miscByCat: Record<string, { amount: number; count: number }> = {};
    const miscByCur: Record<string, number> = {};
    misc.forEach((r: any) => {
      const cur = r.cur || 'us';
      miscByCur[cur] = (miscByCur[cur] || 0) + (parseFloat(r.total) || 0);
    });

    // Sold-basis P&L chain (web calContracts). Deal basis: revenue, COGS and
    // expenses are all attributed to the CONTRACT month using the CONTRACT rate —
    // deliberately different from the invoice-dated Sales Revenue KPI above.
    /* Web scopes the expense rows to the surviving contracts whenever a
       contract-side filter is active, and hands over everything otherwise
       (page.js:1551-1556). Rows with no contract in the set are still counted —
       computePnl adds them after its loop — which is the whole point of the change. */
    const contractSide = !!(filters.supplier || filters.material);
    const ids = new Set(enriched.map((c: any) => c.id));
    const scopedExpenses = contractSide
      ? (expenseRows || []).filter((r: any) => ids.has(r?.poSupplier?.id))
      : expenseRows || [];
    const pnl = computePnl(enriched, settings, companyRate, scopedExpenses, liveRate);
    const profitByMonth = pnl.purchaseByMonth.map(
      (_v, i) => revenueByMonth[i] - pnl.cogsByMonth[i] - pnl.expensesByMonth[i]
    );

    /* THE MARGINS WORKSHEET is now where Tonnage AND Gross Profit both come from
       (web page.js:1638-1649, and :1841-1843 "Tonnage and profit come from the
       Margins worksheet"). calContracts' own totalMT/shippedMT/cogs loop still runs
       — Contract Expenses, the per-type breakdown and the tonnage CAP still need
       it — but the headline Purchased/Shipped/Pending figures and Gross Profit read
       from here instead. */
    const marginsSummary = computeMarginsSummary(margins);
    const grossProfit = marginsSummary.profits;

    /* COMPANY OVERHEADS, converted on the same rule as everything else on the page
       (web page.js:1768-1783). Kept SEPARATE from contract expenses on purpose:
       contract expenses are attributable to a trade and drive the per-MT metrics,
       overheads are not, and merging them would silently change what those mean. */
    const overheads = (companyExpenses || []).reduce((acc: number, r: any) => {
      const amt = parseFloat(r?.amount);
      if (!Number.isFinite(amt)) return acc;
      const rate = parseFloat(r?.euroToUSD);
      const mult = companyRate > 0 ? companyRate : rate > 0 ? rate : liveRate > 0 ? liveRate : 1;
      return acc + (r?.cur === 'us' ? amt : amt * mult);
    }, 0);

    /* web page.js:1788 - gross profit LESS overheads. Mobile used to sum its own
       revenue-cogs-expenses series and call THAT Net Profit, which is a different
       figure entirely: on live data it read $38.09M against web's, because it was
       using invoice-dated revenue rather than the Margins profit. */
    const netProfit = grossProfit - overheads;

    // Purchase value behind the "Contracts — $" ranking's own headline — web's
    // TotalCell now leads that card instead of a separate standalone figure
    // (page.js "Total Value is the headline"). Same accumulatedPmnt sum either way.
    const totalContracts = pnl.purchaseByMonth.reduce((a, b) => a + b, 0);

    const topSuppliers = Object.entries(supplierTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      contractCount: enriched.length,
      purchaseByCur,
      totalContracts,
      // Purchased/Shipped/Pending all read off the Margins worksheet now (web
      // page.js:1841-1843), NOT off calContracts' own tonnage loop. quantity/
      // shipped/outstanding are never halved for a GIS-shared row — only profits is.
      totalMT: marginsSummary.quantity,
      revenueByCur: revenue.byCur,
      revenueUsd,
      revenueByMonth,
      receivables: recv.byCur,
      aging,
      miscByCur,
      miscCount: misc.length,
      topSuppliers,
      netProfit,
      grossProfit,
      overheads,
      cogs: pnl.cogs,
      expensesTotal: pnl.expensesTotal,
      storageTotal: pnl.storageTotal,
      shippedMT: marginsSummary.shipped,
      // web page.js:1843 divides by totalPL - GROSS profit, before overheads.
      // Overheads are not attributable to a trade, so charging them per shipped
      // tonne would misstate the unit economics.
      avgProfitPerMT: marginsSummary.shipped > 0 ? grossProfit / marginsSummary.shipped : 0,
      unsoldValue: pnl.unsoldValue,
      freightTotal: pnl.freightTotal,
      missingRate: pnl.missingRate,
      cogsByMonth: pnl.cogsByMonth,
      expensesByMonth: pnl.expensesByMonth,
      profitByMonth,
      dealRevenue: pnl.dealRevenue,
      dealRevenueByMonth: pnl.dealRevenueByMonth,
      pendingMT: marginsSummary.outstanding,
      avgCostPerMT: marginsSummary.quantity > 0 ? totalContracts / marginsSummary.quantity : 0,
      avgExpensePerMT: marginsSummary.quantity > 0 ? pnl.expensesTotal / marginsSummary.quantity : 0,
      avgFreightPerMT: marginsSummary.quantity > 0 ? pnl.freightTotal / marginsSummary.quantity : 0,
      gisCommission: pnl.gisCommission,
      miscByCat: Object.entries(miscByCat)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.amount - a.amount),
      // Live alerts — web pills. Counts come straight off the receivables slots.
      dueCount: Object.values(recv.byCur).reduce((s2, x) => s2 + (x.dueCount || 0), 0),
      balanceCount: Object.values(recv.byCur).reduce((s2, x) => s2 + (x.balanceCount || 0), 0),
      consignees: Object.entries(pnl.clientTotals)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      materialSold: Object.entries(pnl.materialSold)
        .map(([name, value]) => ({ name, value }))
        .filter((r) => r.value > 0.0005)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      expByType: Object.entries(pnl.expByType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    };
  }, [query.data, settings, termDays, companyRate, filters.supplier, filters.client, filters.material]);

  // Option lists come from the UNFILTERED set so a chosen filter never removes
  // the other options.
  const options = useMemo(() => {
    const raw = query.data?.enriched || [];
    const suppliers = new Map<string, string>();
    const materials = new Set<string>();
    const clients = new Set<string>();
    raw.forEach((c: any) => {
      if (c.supplier) {
        suppliers.set(
          c.supplier,
          settings?.Supplier?.Supplier?.find((s: any) => s.id === c.supplier)?.nname || c.supplier
        );
      }
      (c.productsData || []).forEach((p: any) => p.description && materials.add(p.description));
      (c.invoicesData || []).forEach((g: any[]) =>
        (g || []).forEach((inv: any) => {
          const n = resolveClientName(inv.client, settings);
          if (n) clients.add(n);
        })
      );
    });
    return {
      suppliers: [...suppliers].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      clients: [...clients].sort().map((v) => ({ value: v, label: v })),
      materials: [...materials].sort().map((v) => ({ value: v, label: v })),
    };
  }, [query.data, settings]);

  return { data, options, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch, enabled };
}
