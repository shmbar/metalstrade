import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings, selectTermDays, selectCompanyRate } from '@/store/settings';
import { loadData, loadFlatByDate, buildInvoiceIndex, contractInvoicesFromIndex } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import {
  receivables as financeReceivables,
  agingBuckets,
  invoiceRevenue,
  contractPurchaseValue,
  toMT,
  num,
  groupInvoices,
  isIssued,
  resolveInvoiceDate,
  resolveCur,
  ReceivablesSlot,
  AgingBucket,
} from '@shared/finance';
import { computePnl } from './pnlChain';

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
}

// Loads everything the dashboard needs in parallel, then derives KPIs. The
// financial aggregates come straight from the shared finance.js so they match
// the web CRM to the cent.
export function useDashboard() {
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

      return { enriched, periodInvoices, recvInvoices, misc: misc.filter(Boolean) };
    },
  });

  const data = useMemo<DashboardData | null>(() => {
    if (!query.data) return null;
    const { enriched, periodInvoices, recvInvoices, misc } = query.data;

    // Purchase value + tonnage from contracts.
    const purchaseByCur: Record<string, number> = {};
    let totalMT = 0;
    const supplierTotals: Record<string, number> = {};
    enriched.forEach((c) => {
      const pv = contractPurchaseValue(c, { base: 'us' });
      Object.entries(pv.byCur).forEach(([cur, v]) => (purchaseByCur[cur] = (purchaseByCur[cur] || 0) + v));
      // Web's DASHBOARD counts EVERY productsData row — its contracts page filters
      // import-flagged breakdown helpers, the dashboard does not. Mobile filtered
      // them, so MT Purchased read 2,407 against web's 3,178 and, worse, the smaller
      // soldFrac denominator inflated COGS and shrank Unsold Stock. Matching web so
      // the whole dashboard ties out; the inconsistency is web's own (recorded).
      (c.productsData || []).forEach((p) => {
        totalMT += toMT(num(p.qnty), c, settings);
      });
      const supName =
        settings.Supplier?.Supplier?.find((s) => s.id === c.supplier)?.nname || c.supplier || '—';
      // Supplier ranking value — web's rule (dashboard/funcs.js): a EUR contract
      // converts at the COMPANY standard rate when one is set, else its own
      // euroToUSD, else 1:1. contractPurchaseValue().base routes through fx(), which
      // never consults the company rate — so on a EUR-heavy book both the values and
      // the ranking ORDER drifted from web.
      const cCur = c.cur === 'eu' ? 'eu' : 'us';
      const cRate = num((c as any).euroToUSD);
      const cMult = cCur === 'us' ? 1 : companyRate > 0 ? companyRate : cRate > 0 ? cRate : 1;
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
        const mult = companyRate > 0 ? companyRate : rate > 0 ? rate : 1;
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
    const pnl = computePnl(enriched, settings, companyRate);
    const profitByMonth = pnl.purchaseByMonth.map(
      (_v, i) => revenueByMonth[i] - pnl.cogsByMonth[i] - pnl.expensesByMonth[i]
    );
    const netProfit = profitByMonth.reduce((s2, v) => s2 + v, 0);

    const topSuppliers = Object.entries(supplierTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      contractCount: enriched.length,
      purchaseByCur,
      totalMT,
      revenueByCur: revenue.byCur,
      revenueUsd,
      revenueByMonth,
      receivables: recv.byCur,
      aging,
      miscByCur,
      miscCount: misc.length,
      topSuppliers,
      netProfit,
      cogs: pnl.cogs,
      expensesTotal: pnl.expensesTotal,
      storageTotal: pnl.storageTotal,
      shippedMT: pnl.shippedMT,
      avgProfitPerMT: pnl.shippedMT > 0 ? netProfit / pnl.shippedMT : 0,
      unsoldValue: pnl.unsoldValue,
      freightTotal: pnl.freightTotal,
      missingRate: pnl.missingRate,
      cogsByMonth: pnl.cogsByMonth,
      expensesByMonth: pnl.expensesByMonth,
      profitByMonth,
      dealRevenue: pnl.dealRevenue,
      dealRevenueByMonth: pnl.dealRevenueByMonth,
      pendingMT: Math.max(0, pnl.totalMT - pnl.shippedMT),
      avgCostPerMT: pnl.totalMT > 0 ? pnl.purchaseByMonth.reduce((a, b) => a + b, 0) / pnl.totalMT : 0,
      avgExpensePerMT: pnl.totalMT > 0 ? pnl.expensesTotal / pnl.totalMT : 0,
      avgFreightPerMT: pnl.totalMT > 0 ? pnl.freightTotal / pnl.totalMT : 0,
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
  }, [query.data, settings, termDays, companyRate]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch, enabled };
}
