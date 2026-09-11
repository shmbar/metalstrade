import { useQuery } from '@tanstack/react-query';
import { getJson, apiConfigured } from '@/lib/api';
import { marketsQueryClient } from '@/query/client';

export interface MetalPrice {
  key: string;
  name: string;
  symbol: string;
  price: number;
  /** Absolute 24h change in USD/MT — the server's `change`. */
  change: number | null;
  /**
   * 24h change in percent — the server's `change_pct`, which is what web's ticker
   * pill shows. Mobile used to print `change` (a dollar amount) with a % sign
   * after it, so a $150.50/MT move read as "▲ 150.5%".
   */
  changePct: number | null;
  unit: string;
  order: number;
}

// Live LME / metal prices from the web app's /api/metal-prices (cached server-side
// for 30 min). Polled every 60 s — web's useMetalPrices interval — so a price the
// server has refreshed shows up here within a minute of web, not five.
//
// Lives on marketsQueryClient, never the persisted app client: see query/client.ts.
export function useMetalPrices() {
  const query = useQuery(
    {
      enabled: apiConfigured(),
      queryKey: ['metal-prices'],
      staleTime: 55 * 1000,
      refetchInterval: 60 * 1000,
      queryFn: async () => {
        const data = await getJson<any>('/api/metal-prices');
        const prices = data?.prices || data || {};
        const rows: MetalPrice[] = Object.entries(prices)
          .filter(([, v]: any) => v && typeof v === 'object' && v.price != null)
          .map(([key, v]: any) => ({
            key,
            name: v.name || key,
            symbol: v.symbol || key,
            price: Number(v.price) || 0,
            change: v.change != null ? Number(v.change) : null,
            changePct: v.change_pct != null ? Number(v.change_pct) : null,
            unit: v.unit || 'USD/MT',
            order: Number(v.order) || 99,
          }))
          .sort((a, b) => a.order - b.order);
        // `date` is the LME publication date web labels the strip with ("LME · …").
        return { rows, date: (data?.date as string) || null };
      },
    },
    marketsQueryClient
  );

  return {
    prices: query.data?.rows || [],
    date: query.data?.date || null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refresh: () => query.refetch(),
    configured: apiConfigured(),
  };
}
