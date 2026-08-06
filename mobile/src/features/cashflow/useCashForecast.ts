import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { postJson, apiConfigured } from '@/lib/api';
import { resolveDueDate } from '@shared/pureHelpers';

export interface ForecastResult {
  inflow: Record<string, number>;
  outflow: Record<string, number>;
  net: Record<string, number>;
  baseTotals?: { inflow: number; outflow: number; net: number; overdueInflow?: number; overdueOutflow?: number };
  confidence?: 'high' | 'medium' | 'low';
  assumptions?: string[];
  risks?: string[];
}

// AI cash-flow forecast (web /api/ai/cash-forecast).
//
// The server filters on ENRICHED fields — isFinal / paymentStatus / balanceDue /
// dueDate on invoices, isPaid / currency on expenses. Mobile used to post the RAW
// Firestore documents, which carry none of them, so `!inv.isFinal` rejected every
// invoice (Projected Inflow was structurally always $0) while `!exp.isPaid` passed
// every already-paid expense straight into the outflow, and EUR amounts were
// bucketed as USD because the raw field is `cur`, not `currency`. This is now a
// verbatim port of web's ForecastPanel mapping.
export function useCashForecast(horizon: 30 | 60 | 90, enabled: boolean) {
  const { uidCollection } = useAuth();
  const { settings } = useSettings();

  return useQuery({
    enabled: enabled && apiConfigured() && !!uidCollection,
    queryKey: ['cash-forecast', uidCollection, horizon],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<ForecastResult> => {
      const uid = uidCollection as string;

      // The forecast needs every invoice/expense whose DUE date is within the
      // horizon OR already overdue — a pool independent of the page's date filter
      // (which slices by ISSUE date). Web loads a wide fixed window: 3 years back
      // through 1 year forward. Mobile's old 2-year window missed older open AR/AP
      // and anything dated into next year.
      const todayYr = new Date().getFullYear();
      const forecastRange = { start: `${todayYr - 3}-01-01`, end: `${todayYr + 1}-12-31` };

      const [rawInvoices, rawExpenses] = await Promise.all([
        loadData<any>(uid, 'invoices', forecastRange),
        loadData<any>(uid, 'expenses', forecastRange),
      ]);

      const currencyList = settings?.Currency?.Currency || [];
      const clientList = settings?.Client?.Client || [];
      const resolveCurrency = (f: any) =>
        f?.cur ? f.cur : currencyList.find((c: any) => c.id === f)?.cur || f || 'USD';
      const resolveClient = (f: any) =>
        f?.nname ? f.nname : clientList.find((c: any) => c.id === f)?.nname || f || 'Unknown';

      const invoices = (rawInvoices || []).map((inv: any) => {
        const totalAmt = parseFloat(inv.totalAmount) || 0;
        const totalPaid = (inv.payments || []).reduce((s: number, p: any) => s + (parseFloat(p.pmnt) || 0), 0);
        const balanceDue = inv.debtBlnc != null ? parseFloat(inv.debtBlnc) : totalAmt - totalPaid;
        const paymentStatus = balanceDue <= 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
        // "Issued" = not a draft and not canceled (matches Cashflow debt logic).
        const isCanceled = !!inv.canceled;
        return {
          isFinal: inv.draft !== true && !isCanceled,
          canceled: isCanceled,
          paymentStatus,
          balanceDue: balanceDue > 0 ? balanceDue : 0,
          currency: resolveCurrency(inv.cur),
          dueDate: resolveDueDate(inv),
          client: resolveClient(inv.client),
        };
      });

      // Project convention: expense.paid === '111' means Paid.
      const expenses = (rawExpenses || []).map((exp: any) => ({
        amount: parseFloat(exp.amount) || 0,
        currency: resolveCurrency(exp.cur),
        date: exp.date,
        isPaid: exp.paid === '111',
      }));

      // The user's configured base currency (Company Details) if set, else USD.
      const baseCurrency =
        (settings as any)?.AppSettings?.AppSettings?.[0]?.baseCurrency ||
        currencyList[0]?.cur ||
        'USD';

      return postJson<ForecastResult>('/api/ai/cash-forecast', {
        horizon,
        invoices,
        expenses,
        uid,
        baseCurrency,
      });
    },
  });
}
