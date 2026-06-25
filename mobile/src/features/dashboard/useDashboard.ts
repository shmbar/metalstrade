import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings, selectTermDays } from '@/store/settings';
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
  ReceivablesSlot,
  AgingBucket,
} from '@shared/finance';

export interface DashboardData {
  contractCount: number;
  purchaseByCur: Record<string, number>;
  totalMT: number;
  revenueByCur: Record<string, number>;
  revenueByMonth: number[]; // 12 months, base USD-ish (raw totalAmount sum)
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
      (c.productsData || []).forEach((p) => {
        totalMT += toMT(num(p.qnty), c, settings);
      });
      const supName =
        settings.Supplier?.Supplier?.find((s) => s.id === c.supplier)?.nname || c.supplier || '—';
      supplierTotals[supName] = (supplierTotals[supName] || 0) + pv.base;
    });

    const revenue = invoiceRevenue(periodInvoices, { base: 'us' });

    // Monthly revenue series (issued invoices, by invoice month) for the trend chart.
    const revenueByMonth = Array(12).fill(0);
    groupInvoices(periodInvoices)
      .filter(isIssued)
      .forEach((inv) => {
        const iso = resolveInvoiceDate(inv);
        const m = iso ? parseInt(iso.substring(5, 7), 10) - 1 : -1;
        if (m >= 0 && m < 12) revenueByMonth[m] += num(inv.totalAmount);
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
  }, [query.data, settings, termDays]);

  return { data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch, enabled };
}
