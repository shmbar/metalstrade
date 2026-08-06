import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadMargins } from '@/data/firestore';
import { useAllStockLots } from '@/features/stocks/useAllStockLots';
import { groupInvoices, resolveInvoiceDate, effectiveDueDate, num } from '@shared/finance';
// Net in-stock summary per warehouse+material — imported from the verbatim shared
// copy of the web helper (utils/pureHelpers.computeStockNetSummary) rather than
// re-implemented here, so the AI can never drift from the Stocks page math.
import { computeStockNetSummary } from '@shared/pureHelpers';
import { arr } from '@/lib/guard';

// Web's conStatus ID -> label map (FloatingChat.js:336). Kept here verbatim so the
// assistant and the web UI agree on wording.
const CONTRACT_STATUS_LABELS: Record<string, string> = {
  A1234: 'Shipped', B5678: 'Not Shipped', F7546: 'Partly Shipped',
  C6567: 'Finished', D8456: 'Closed', E34656: 'Unsold',
};

// Builds the SAME slim, enriched context the web Assistant sends (FloatingChat
// getCurrentDataContext). Two reasons this projection matters:
//   1. Size — raw Firestore docs (with productsData/payments/stock arrays) blow
//      past the serverless body limit → HTTP 413. These summaries are tiny.
//   2. Correctness — the server tools read enriched fields (inv.client as a name,
//      balanceDue, isFinal, paymentStatus, currency) that don't exist on raw docs.
function buildContext(raw: any, settings: any, compData: any) {
  const clientList = settings?.Client?.Client || [];
  const supplierList = settings?.Supplier?.Supplier || [];
  const currencyList = settings?.Currency?.Currency || [];
  const expTypeList = settings?.Expenses?.Expenses || [];
  const expPmntList = settings?.ExpPmnt?.ExpPmnt || [];

  const resolveClient = (f: any) => (f?.nname ? f.nname : clientList.find((c: any) => c.id === f)?.nname || f || 'Unknown');
  const resolveClientFull = (f: any) => {
    if (f?.client) return f.client;
    const obj = clientList.find((c: any) => c.id === f);
    return obj?.client || obj?.nname || (typeof f === 'string' ? f : '') || '';
  };
  const resolveSupplier = (f: any) => (f?.nname ? f.nname : supplierList.find((s: any) => s.id === f)?.nname || f || 'Unknown');
  const resolveCurrency = (f: any) => (f?.cur ? f.cur : currencyList.find((c: any) => c.id === f)?.cur || f || '');
  const resolveExpType = (id: any) => expTypeList.find((e: any) => e.id === id)?.expType || id || 'Unknown';

  const termDays = parseInt(compData?.defaultTermDays, 10) > 0 ? parseInt(compData.defaultTermDays, 10) : 30;

  const contracts = (raw.contracts || []).map((con: any) => ({
    id: con.id,
    order: con.order,
    supplier: resolveSupplier(con.supplier),
    date: con.date,
    currency: resolveCurrency(con.cur),
    // conStatus stores an ID — resolve it to its label so the assistant never
    // reports raw codes like 'E34656' as if they were statuses.
    status: CONTRACT_STATUS_LABELS[con.conStatus] || con.conStatus || (con.completed ? 'Completed' : 'Open'),
    // import-flagged products are breakdown helpers — counting them would double
    // the contract's line count and value.
    products: (con.productsData || []).filter((p: any) => !p.import).length,
    totalValue: (con.productsData || []).filter((p: any) => !p.import).reduce((s: number, p: any) => s + num(p.unitPrc) * num(p.qnty), 0),
    shipmentEtd: con.shipmentEtd || null,
    shipmentEta: con.shipmentEta || null,
    shipmentStatus: con.shipmentStatus || null,
  }));

  const invoices = groupInvoices(raw.invoices || []).map((inv: any) => {
    const isDraft = inv.draft === true;
    const isCanceled = !!inv.canceled;
    const isIssuedInv = !isDraft && !isCanceled;
    const invoiceStatus = isCanceled ? 'Canceled' : isDraft ? 'Draft' : 'Issued';
    const totalAmt = num(inv.totalAmount);
    const totalPaid = arr<any>(inv.payments).reduce((s: number, p: any) => s + num(p.pmnt), 0);
    const balanceDue = inv.debtBlnc != null ? num(inv.debtBlnc) : totalAmt - totalPaid;
    const paymentStatus = balanceDue <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
    return {
      id: inv.id,
      invoice: inv.invoice,
      client: resolveClient(inv.client),
      clientFull: resolveClientFull(inv.client),
      date: resolveInvoiceDate(inv),
      invoiceStatus,
      paymentStatus,
      totalAmount: totalAmt,
      amountPaid: totalPaid,
      balanceDue: balanceDue > 0 ? balanceDue : 0,
      currency: resolveCurrency(inv.cur),
      dueDate: effectiveDueDate(inv, termDays),
      canceled: isCanceled,
      isFinal: isIssuedInv,
      etd: inv.shipData?.etd?.startDate || null,
      eta: inv.shipData?.eta?.startDate || null,
      reminders: inv.reminders || [],
    };
  });

  const expenses = (raw.expenses || []).map((exp: any) => {
    const isPaid = exp.paid === '111';
    const paidLabel = expPmntList.find((p: any) => p.id === exp.paid)?.paid
      || (exp.paid === '111' ? 'Paid' : exp.paid === '222' ? 'Unpaid' : exp.paid || 'Unknown');
    return {
      id: exp.id,
      kind: exp.kind || 'Supplier',
      vendor: resolveSupplier(exp.supplier) || exp.vendor || (exp.kind === 'Company' ? 'Company expense' : 'Unknown'),
      date: exp.date,
      amount: num(exp.amount),
      currency: resolveCurrency(exp.cur),
      type: resolveExpType(exp.expType) || exp.type || '—',
      paid: paidLabel,
      isPaid,
    };
  });

  // NET in-stock rows — mirrors utils/pureHelpers.computeStockNetSummary on web
  // (copied verbatim per the mobile convention): received − sold, final-settlement
  // quantity corrections, original-vs-final invoice dedup, resolved MT/unit labels.
  // Raw lot rows made the AI count sold material as still in stock and guess units.
  const stocks = computeStockNetSummary(raw.stocks || [], settings);

  return {
    contracts,
    invoices,
    expenses,
    stocks,
    margins: raw.margins || [],
    marginAlertThreshold: settings?.MarginAlert?.threshold != null ? num(settings.MarginAlert.threshold) : 5,
  };
}

export function useAssistantContext() {
  const { uidCollection } = useAuth();
  const { settings, compData, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['assistant-context', uidCollection, dateSelect.start, dateSelect.end],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const uid = uidCollection as string;
      // margins were hardcoded to [] here, so get_profit_info and
      // get_margin_alerts always answered 'no data' no matter what the books said.
      const yr = parseInt(dateSelect.start.substring(0, 4), 10) || new Date().getFullYear();
      const [contracts, invoices, expenses, margins] = await Promise.all([
        loadData<any>(uid, 'contracts', dateSelect),
        loadData<any>(uid, 'invoices', dateSelect),
        loadData<any>(uid, 'expenses', dateSelect),
        loadMargins(uid, yr).catch(() => []),
      ]);
      return { contracts, invoices, expenses, margins };
    },
  });

  // Stock lots come from the SHARED ledger query — the assistant used to trigger a
  // sixth full download of the collection every time it was opened.
  const lotsQuery = useAllStockLots();

  const currentData = useMemo(() => {
    if (!query.data) {
      return { contracts: [], invoices: [], expenses: [], stocks: [], margins: [] as any[], marginAlertThreshold: 5 };
    }
    return buildContext({ ...query.data, stocks: lotsQuery.data || [] }, settings, compData);
  }, [query.data, lotsQuery.data, settings, compData]);

  return {
    currentData,
    dateRange: { startDate: dateSelect.start, endDate: dateSelect.end },
    isLoading: query.isLoading || lotsQuery.isLoading,
  };
}
