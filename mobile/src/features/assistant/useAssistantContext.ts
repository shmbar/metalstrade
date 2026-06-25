import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadAllStockData } from '@/data/firestore';

// Loads the same data context the web Assistant passes to the API tools
// (contracts / invoices / expenses for the period + all stock). Margins are left
// empty here; the API tools surface "not loaded" guidance just like the web when a
// period outside the loaded range is asked about.
export function useAssistantContext() {
  const { uidCollection } = useAuth();
  const { dateSelect, loaded } = useSettings();

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
      return { contracts, invoices, expenses, stocks, margins: [] as any[] };
    },
  });

  return {
    currentData: query.data || { contracts: [], invoices: [], expenses: [], stocks: [], margins: [] },
    dateRange: { startDate: dateSelect.start, endDate: dateSelect.end },
    isLoading: query.isLoading,
  };
}
