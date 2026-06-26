import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadAllStockData } from '@/data/firestore';
import { groupInvoices, resolveInvoiceDate, effectiveDueDate, num } from '@shared/finance';

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
    const totalPaid = (inv.payments || []).reduce((s: number, p: any) => s + num(p.pmnt), 0);
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

  const stocks = (raw.stocks || []).map((s: any) => {
    const resolvedDesc =
      s.type === 'in' && s.description
        ? s.productsData?.find((y: any) => y.id === s.description)?.description
        : s.mtrlStatus === 'select' || s.isSelection
          ? s.productsData?.find((y: any) => y.id === s.descriptionId)?.description
          : s.type === 'out' && s.moveType === 'out'
            ? s.descriptionName
            : s.descriptionText;
    return {
      description: resolvedDesc || s.descriptionName || s.description || 'Unknown',
      qnty: num(s.qnty),
      unit: s.qTypeTable || '',
      warehouse: s.stock || '',
      date: s.date || '',
    };
  });

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
