import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadMargins } from '@/data/firestore';
import { num } from '@shared/finance';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthName = (m: any) => {
  const n = parseInt(String(m), 10);
  return n >= 1 && n <= 12 ? MONTHS[n - 1] : String(m);
};

export interface MarginMonth {
  month: string;
  monthLabel: string;
  purchase: number; // Qty (MT)
  openShip: number;
  totalMargin: number; // profit $
  remaining: number;
  shipped: number;
}

export interface MarginTotals {
  incoming: number; // remaining
  outstandingShip: number; // openShip
  quantity: number; // purchase (MT)
  profit: number; // totalMargin
  shipped: number; // purchase - openShip
  profitGIS: number;
}

// Monthly margins for the selected year + headline totals. Mirrors the web margins
// page aggregation (incoming=remaining, outstanding=openShip, shipped=purchase-openShip).
export function useMargins() {
  const { uidCollection } = useAuth();
  const { dateSelect, loaded } = useSettings();
  const year = parseInt(dateSelect.start.substring(0, 4)) || new Date().getFullYear();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['margins', uidCollection, year],
    queryFn: () => loadMargins(uidCollection as string, year),
  });

  const data = useMemo(() => {
    const rows: MarginMonth[] = (query.data || [])
      .map((z: any) => {
        const purchase = num(z.purchase);
        const openShip = num(z.openShip);
        return {
          month: String(z.month ?? ''),
          monthLabel: monthName(z.month),
          purchase,
          openShip,
          totalMargin: num(z.totalMargin),
          remaining: num(z.remaining),
          shipped: purchase - openShip,
        };
      })
      .sort((a, b) => parseInt(a.month) - parseInt(b.month));

    const sum = (k: keyof MarginMonth) => rows.reduce((s, r) => s + (r[k] as number), 0);
    const profitGIS = (query.data || []).reduce(
      (s: number, z: any) => s + (z.items || []).reduce((a: number, c: any) => a + (c.gis ? num(c.totalMargin) : 0), 0),
      0
    );
    const totals: MarginTotals = {
      incoming: sum('remaining'),
      outstandingShip: sum('openShip'),
      quantity: sum('purchase'),
      profit: sum('totalMargin'),
      shipped: sum('purchase') - sum('openShip'),
      profitGIS,
    };

    // Items at/below the alert threshold (0 = loss/zero-profit), for the AI analyzer.
    const alertedItems: any[] = [];
    (query.data || []).forEach((m: any) =>
      (m.items || []).forEach((it: any) => {
        if (it.margin !== '' && it.margin != null && num(it.totalMargin) <= 0) {
          alertedItems.push({ ...it, month: m.month });
        }
      })
    );

    return { rows, totals, year, alertedItems };
  }, [query.data]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
