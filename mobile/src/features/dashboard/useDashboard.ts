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
  ReceivablesSlot,
  AgingBucket,
} from '@shared/finance';
import { getCur } from '@/data/writes';
import { computePnl, computeMarginsSummary, SupplierContractRow } from './pnlChain';
import { resolveClientName } from '@/features/invoices/useInvoices';
import { entityName } from '@/lib/entityName';
import { useShallow } from 'zustand/react/shallow';

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

  // ── the records behind each card and tile (web TILE_DETAILS) ──────────────────
  /** web invoiceRevAgg.byClientMonth — client → 12 monthly USD buckets (sparklines) */
  consigneeSeries: Record<string, number[]>;
  /** web invoiceRevAgg.byClientDetails — the invoices behind each client tile */
  consigneeDetails: Record<string, { invoice: string | number; date: string; usd: number; amount: number; cur: string }[]>;
  /** web conAgg.suppSeries — supplier → 12 monthly purchase buckets */
  supplierSeries: Record<string, number[]>;
  /** web supplierContracts(name) — the contracts behind each supplier tile */
  supplierContracts: Record<string, SupplierContractRow[]>;
  /** every contract expense in the period, largest first — GIS commission excluded */
  expenseRows: ExpenseRow[];
  /** the same rows per expense type — web expDetails */
  expDetails: Record<string, ExpenseRow[]>;
  /** web coExpRows */
  companyExpenseRows: CompanyExpenseRow[];
  companyExpenseCount: number;
  /** Margins worksheet rows — web marginsSummary.items */
  marginsItems: number;
  /** web miscRows */
  miscRows: MiscRow[];
  /** web miscInvoices.byCat */
  miscCategories: Record<string, { byCur: Record<string, number>; count: number }>;
}

export interface ExpenseRow {
  type: string;
  supplierName: string;
  order: string;
  usd: number;
  amount: number;
  cur: string;
  date: string;
  ref: string;
  paid: string;
  comments: string;
}

export interface CompanyExpenseRow {
  supplierName: string;
  ref: string;
  date: string;
  paid: string;
  comments: string;
  amount: number;
  cur: string;
  usd: number;
}

export interface MiscRow {
  date: string;
  category: string;
  cur: string;
  amount: number;
  invoice: string;
  company: string;
  description: string;
  order: string;
  paid: string;
}

// Loads everything the dashboard needs in parallel, then derives KPIs. The
// financial aggregates come straight from the shared finance.js so they match
// the web CRM to the cent.
export function useDashboard(filters: DashboardFilters = { supplier: '', client: '', material: '' }) {
  const uidCollection = useAuth((s) => s.uidCollection);
  const { settings, dateSelect, loaded } = useSettings(useShallow((s) => ({ settings: s.settings, dateSelect: s.dateSelect, loaded: s.loaded })));
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
    enriched.forEach((c) => {
      const pv = contractPurchaseValue(c, { base: 'us' });
      Object.entries(pv.byCur).forEach(([cur, v]) => (purchaseByCur[cur] = (purchaseByCur[cur] || 0) + v));
    });

    const revenue = invoiceRevenue(periodInvoices, { base: 'us' });

    /* SALES REVENUE, invoice-dated — web page.js invoiceRevAgg, line for line. Every sales
       invoice DATED in the period (whatever year its PO was bought), from the 4-year invoice
       window, grouped by number so an original superseded by its Credit/Final note counts
       once. The Consignees card splits THIS total per client, so card and headline cannot
       disagree — mobile used to rank clients by pnl.clientTotals, the contract-dated basis,
       under an invoice-dated Total Value. */
    const revenueByMonth = Array(12).fill(0);
    const byClient: Record<string, number> = {};
    const consigneeSeries: Record<string, number[]> = {};
    const consigneeDetails: DashboardData['consigneeDetails'] = {};
    let revenueUsd = 0;
    {
      const start = dateSelect.start;
      const end = dateSelect.end;
      const groups: Record<string, any[]> = {};
      (allRecv || []).forEach((inv: any) => {
        const d = !inv?.final ? inv?.dateRange?.startDate : inv?.date;
        if (typeof d !== 'string' || d < start || d > end) return;
        if (inv.invoice != null) (groups[String(inv.invoice)] ||= []).push(inv);
      });
      Object.values(groups).forEach((g) =>
        g.forEach((inv: any) => {
          if (inv.canceled || inv.draft === true) return;
          const isOriginal = ['1111', 'Invoice'].includes(inv.invType);
          if (!(g.length === 1 || !isOriginal)) return; // original superseded by its note
          const clientName = resolveClientName(inv.client, settings) || 'Unassigned';
          if (fClient && clientName !== fClient) return;
          if (allowedPO && !allowedPO.has(inv.poSupplier?.id)) return;
          const amt = parseFloat(inv.totalAmount);
          if (isNaN(amt)) return;
          const curId = !inv.final ? inv.cur : settings?.Currency?.Currency?.find((x: any) => x.cur === inv.cur?.cur)?.id;
          const rate = parseFloat(inv.euroToUSD);
          const mult = companyRate > 0 ? companyRate : rate > 0 ? rate : liveRate > 0 ? liveRate : 1;
          const usd = curId === 'us' ? amt : amt * mult;
          const d = !inv.final ? inv.dateRange.startDate : inv.date;
          const m = Number(String(d).substring(5, 7));
          if (m >= 1 && m <= 12) {
            revenueByMonth[m - 1] += usd;
            revenueUsd += usd;
            byClient[clientName] = (byClient[clientName] || 0) + usd;
            (consigneeSeries[clientName] ||= Array(12).fill(0))[m - 1] += usd;
            (consigneeDetails[clientName] ||= []).push({ invoice: inv.invoice ?? '', date: d, usd, amount: amt, cur: curId === 'us' ? 'us' : 'eu' });
          }
        })
      );
    }

    const recv = financeReceivables(recvInvoices, { asOf: new Date(), termDays });
    const aging = agingBuckets(recvInvoices, { asOf: new Date() });

    // Misc invoices by CATEGORY — web shows shipments/personal/random/uncategorized
    // amounts, counts and share.
    // web page.js miscInvoices — per currency, and per category with its own count.
    const miscByCur: Record<string, number> = {};
    const miscCategories: DashboardData['miscCategories'] = {
      personal: { byCur: {}, count: 0 },
      random: { byCur: {}, count: 0 },
      shipments: { byCur: {}, count: 0 },
      uncategorized: { byCur: {}, count: 0 },
    };
    misc.forEach((r: any) => {
      const cur = r.cur || 'us';
      const amt = parseFloat(r.total) || 0;
      miscByCur[cur] = (miscByCur[cur] || 0) + amt;
      const cat = ['personal', 'random', 'shipments'].includes(r.category) ? r.category : 'uncategorized';
      miscCategories[cat].byCur[cur] = (miscCategories[cat].byCur[cur] || 0) + amt;
      miscCategories[cat].count += 1;
    });
    const miscByCat: Record<string, { amount: number; count: number }> = {};
    Object.entries(miscCategories).forEach(([name, c]) => {
      if (c.count) miscByCat[name] = { amount: Object.values(c.byCur).reduce((a, v) => a + v, 0), count: c.count };
    });
    const miscRows: MiscRow[] = misc
      .map((r: any) => ({
        date: r?.date || '',
        category: r?.category || 'uncategorized',
        cur: r?.cur || 'us',
        amount: parseFloat(r?.total) || 0,
        invoice: r?.invoice || '',
        company: r?.compName || '',
        description: r?.description || '',
        order: r?.order || '',
        paid: r?.paidNotPaid || '',
      }))
      .sort((a: MiscRow, b: MiscRow) => b.amount - a.amount);

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

    // web coExpRows — the whole overhead record, not three fields of it.
    const supName = (id: string) => settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || '—';
    const companyExpenseRows: CompanyExpenseRow[] = (companyExpenses || [])
      .map((r: any) => {
        const amt = parseFloat(r?.amount) || 0;
        const rate = parseFloat(r?.euroToUSD);
        const mult = companyRate > 0 ? companyRate : rate > 0 ? rate : liveRate > 0 ? liveRate : 1;
        return {
          supplierName: supName(r?.supplier || ''),
          ref: r?.expense || '',
          date: r?.date || '',
          paid: r?.paid === '111' ? 'Paid' : r?.paid ? 'Unpaid' : '',
          comments: r?.comments || '',
          amount: amt,
          cur: r?.cur || 'us',
          usd: r?.cur === 'us' ? amt : amt * mult,
        };
      })
      .sort((a: CompanyExpenseRow, b: CompanyExpenseRow) => b.usd - a.usd);

    // Purchase value behind the "Contracts — $" ranking's own headline — web's
    // TotalCell now leads that card instead of a separate standalone figure
    // (page.js "Total Value is the headline"). Same accumulatedPmnt sum either way.
    const totalContracts = pnl.purchaseByMonth.reduce((a, b) => a + b, 0);

    // web setPieArrs(arrTmp): every supplier with a non-zero value, largest first. The card
    // folds its own tail ("N more"), so nothing is cut here.
    const topSuppliers = Object.entries(pnl.supplierTotals)
      .filter(([, value]) => value !== 0)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    // web supplierContracts(name): matched by RESOLVED name, as the card is keyed.
    const supplierContracts: Record<string, SupplierContractRow[]> = {};
    Object.entries(pnl.supplierDetails).forEach(([id, rows]) => {
      const name = settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || 'Unknown supplier';
      (supplierContracts[name] ||= []).push(...rows);
    });
    const expDetails: Record<string, ExpenseRow[]> = {};
    Object.entries(pnl.expDetails).forEach(([type, rows]) => {
      expDetails[type] = rows
        .map((r) => ({ ...r, type, supplierName: supName(r.supplier) }))
        .sort((a, b) => (b.usd || 0) - (a.usd || 0));
    });
    const expenseDetailRows = Object.values(expDetails)
      .flat()
      .sort((a, b) => (b.usd || 0) - (a.usd || 0));

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
      consigneeSeries,
      consigneeDetails,
      supplierSeries: pnl.suppSeries,
      supplierContracts,
      expenseRows: expenseDetailRows,
      expDetails,
      companyExpenseRows,
      companyExpenseCount: (companyExpenses || []).length,
      // web marginsSummary.items — every worksheet row across the loaded months
      marginsItems: (margins || []).reduce((n: number, mo: any) => n + ((mo?.items || []).length || 0), 0),
      miscRows,
      miscCategories,
      miscByCat: Object.entries(miscByCat)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.amount - a.amount),
      // Live alerts — web pills. Counts come straight off the receivables slots.
      dueCount: Object.values(recv.byCur).reduce((s2, x) => s2 + (x.dueCount || 0), 0),
      balanceCount: Object.values(recv.byCur).reduce((s2, x) => s2 + (x.balanceCount || 0), 0),
      // web clientRank: invoice-dated, every client above $0.50, largest first.
      consignees: Object.entries(byClient)
        .filter(([, value]) => Math.abs(value) > 0.5)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      materialSold: Object.entries(pnl.materialSold)
        .map(([name, value]) => ({ name, value }))
        .filter((r) => r.value > 0.0005)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      // web: entries above $0.50, largest first; the card folds the tail.
      expByType: Object.entries(pnl.expByType)
        .filter(([, value]) => Math.abs(value) > 0.5)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [query.data, settings, termDays, companyRate, filters.supplier, filters.client, filters.material, dateSelect.start, dateSelect.end]);

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
          entityName(settings?.Supplier?.Supplier, c.supplier, 'supplier')
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
