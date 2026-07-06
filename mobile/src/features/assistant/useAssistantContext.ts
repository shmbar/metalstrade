import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadAllStockData } from '@/data/firestore';
import { groupInvoices, resolveInvoiceDate, effectiveDueDate, num } from '@shared/finance';
import { arr } from '@/lib/guard';

// Net in-stock summary per warehouse+material — TS port of the web helper
// utils/pureHelpers.computeStockNetSummary (same math as the Stocks page):
// 'in' lots add |qnty| with final-settlement corrections, 'out' lots subtract,
// original-vs-final invoice rows dedup per invoice number, resolved unit labels.
function computeStockNetSummary(stockDocs: any[], settings: any) {
  const lots = (Array.isArray(stockDocs) ? stockDocs : []).filter(Boolean)
    .filter((s: any) => s.stock);

  const dedupeFinals = (group: any[]) => {
    const byInvoice: Record<string, any[]> = {};
    group.forEach(l => { (byInvoice[l.invoice] ||= []).push(l); });
    return Object.values(byInvoice).flatMap(g => {
      const distinct = new Set(g.map(l => parseInt(l.invType, 10)));
      if (distinct.size <= 1) return g;
      const maxType = Math.max(...distinct);
      return g.filter(l => parseInt(l.invType, 10) === maxType);
    });
  };

  const quantityList = settings?.Quantity?.Quantity || [];
  const warehouseList = settings?.Stocks?.Stocks || [];

  const groups: Record<string, any[]> = {};
  lots.forEach((s: any) => {
    const matKey = s.description || s.descriptionId;
    if (!matKey) return;
    (groups[`${s.stock}|${matKey}`] ||= []).push(s);
  });

  const rows: any[] = [];
  Object.values(groups).forEach(groupLots => {
    const filtered = dedupeFinals(groupLots);
    let qty = 0;
    filtered.forEach((l: any) => {
      const q = parseFloat(l.qnty) || 0;
      if (l.type === 'in') {
        qty += Math.abs(q) +
          ((l.finalqnty && l.finalqnty * 1 !== l.qnty * 1) ? (l.qnty * 1 - l.finalqnty * 1) * -1 : 0);
      } else {
        qty -= q;
      }
    });
    if (qty <= 0.1) return;

    const first: any = filtered[0] || groupLots[0];
    const resolvedDesc =
      (first.type === 'in' && first.description
        ? first.productsData?.find((y: any) => y.id === first.description)?.description
        : (first.mtrlStatus === 'select' || first.isSelection)
          ? first.productsData?.find((y: any) => y.id === first.descriptionId)?.description
          : (first.type === 'out' && first.moveType === 'out')
            ? first.descriptionName
            : first.descriptionText) || first.descriptionName || 'Unknown';

    rows.push({
      description: resolvedDesc,
      qnty: Math.round(qty * 1000) / 1000,
      unit: quantityList.find((u: any) => u.id === first.qTypeTable)?.qTypeTable || '',
      warehouse: warehouseList.find((w: any) => w.id === first.stock)?.nname
        || warehouseList.find((w: any) => w.id === first.stock)?.stock || '',
    });
  });

  return rows.sort((a, b) => b.qnty - a.qnty);
}

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
    status: con.conStatus || (con.completed ? 'Completed' : 'Open'),
    products: con.productsData?.length || 0,
    totalValue: (con.productsData || []).reduce((s: number, p: any) => s + num(p.unitPrc) * num(p.qnty), 0),
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
    margins: [] as any[],
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
      const [contracts, invoices, expenses, stocks] = await Promise.all([
        loadData<any>(uid, 'contracts', dateSelect),
        loadData<any>(uid, 'invoices', dateSelect),
        loadData<any>(uid, 'expenses', dateSelect),
        loadAllStockData(uid),
      ]);
      return buildContext({ contracts, invoices, expenses, stocks }, settings, compData);
    },
  });

  return {
    currentData: query.data || { contracts: [], invoices: [], expenses: [], stocks: [], margins: [], marginAlertThreshold: 5 },
    dateRange: { startDate: dateSelect.start, endDate: dateSelect.end },
    isLoading: query.isLoading,
  };
}
