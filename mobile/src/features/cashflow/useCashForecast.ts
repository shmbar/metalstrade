import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadData } from '@/data/firestore';
import { postJson, apiConfigured } from '@/lib/api';

export interface ForecastResult {
  inflow: Record<string, number>;
  outflow: Record<string, number>;
  net: Record<string, number>;
  baseTotals?: { inflow: number; outflow: number; net: number; overdueInflow?: number; overdueOutflow?: number };
  confidence?: 'high' | 'medium' | 'low';
  assumptions?: string[];
  risks?: string[];
}

// AI cash-flow forecast (web /api/ai/cash-forecast). Loads the outstanding
// invoices + expenses and posts them; the server projects inflow/outflow over the
// horizon and adds a GPT confidence/assumptions/risks summary.
export function useCashForecast(horizon: 30 | 60 | 90, enabled: boolean) {
  const { uidCollection } = useAuth();

  return useQuery({
    enabled: enabled && apiConfigured() && !!uidCollection,
    queryKey: ['cash-forecast', uidCollection, horizon],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<ForecastResult> => {
      const uid = uidCollection as string;
      const curYr = new Date().getFullYear();
      const [invoices, expenses] = await Promise.all([
        loadData<any>(uid, 'invoices', { start: `${curYr - 1}-01-01`, end: `${curYr}-12-31` }),
        loadData<any>(uid, 'expenses', { start: `${curYr - 1}-01-01`, end: `${curYr}-12-31` }),
      ]);
      return postJson<ForecastResult>('/api/ai/cash-forecast', {
        horizon,
        invoices,
        expenses,
        uid,
        baseCurrency: 'USD',
      });
    },
  });
}
