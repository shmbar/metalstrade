import { useQuery } from '@tanstack/react-query';
import { getJson, apiConfigured } from '@/lib/api';

export interface MetalPrice {
  key: string;
  name: string;
  symbol: string;
  price: number;
  change: number | null;
  order: number;
}

// Live LME / metal prices from the web app's /api/metal-prices (cached server-side).
export function useMetalPrices() {
  const query = useQuery({
    enabled: apiConfigured(),
    queryKey: ['metal-prices'],
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
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
          order: Number(v.order) || 99,
        }))
        .sort((a, b) => a.order - b.order);
      return rows;
    },
  });
  return { prices: query.data || [], isLoading: query.isLoading, configured: apiConfigured() };
}
