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

export interface DashboardData {
  contractCount: number;
  purchaseByCur: Record<string, number>;
  totalMT: number;
  revenueByCur: Record<string, number>;
  revenueByMonth: number[]; // 12 months, converted to a USD basis (web's companyRate rule)
  receivables: Record<string, ReceivablesSlot>;
  aging: AgingBucket[];
  miscByCur: Record<string, number>;
  miscCount: number;
  topSuppliers: { name: string; value: number }[];
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
      // import-flagged rows are breakdown/merge helpers, not PO lines — web excludes
      // them from every quantity roll-up, so counting them doubled the dashboard MT.
      (c.productsData || []).filter((p: any) => !p?.import).forEach((p) => {
        totalMT += toMT(num(p.qnty), c, settings);
      });
      const supName =
        settings.Supplier?.Supplier?.find((s) => s.id === c.supplier)?.nname || c.supplier || '—';
      supplierTotals[supName] = (supplierTotals[supName] || 0) + pv.base;
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
    const recv = financeReceivables(recvInvoices, { asOf: new Date(), termDays });
    const aging = agingBuckets(recvInvoices, { asOf: new Date() });

    const miscByCur: Record<string, number> = {};
    misc.forEach((r: any) => {
      const cur = r.cur || 'us';
      miscByCur[cur] = (miscByCur[cur] || 0) + (parseFloat(r.total) || 0);
    });

    const topSuppliers = Object.entries(supplierTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return {
      contractCount: enriched.length,
      purchaseByCur,
      totalMT,
      revenueByCur: revenue.byCur,
      revenueByMonth,
      receivables: recv.byCur,
      aging,
      miscByCur,
      miscCount: misc.length,
      topSuppliers,
    };
  }, [query.data, settings, termDays, companyRate]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch, enabled };
}
