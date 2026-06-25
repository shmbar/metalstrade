import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex, loadStockDataByIds } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { num } from '@shared/finance';
import { lotIsSold, computeLineSold, aggregateRollups, lineStatus } from '@shared/soldStatus';

// Per-contract: keep, for each invoice number, only the highest-invType invoice id
// (so an original isn't counted alongside its credit/final note). Port of getInvArray.
function getInvArray(contract: Contract): string[] {
  const out: string[] = [];
  const invoices = contract.invoices || [];
  invoices.forEach((ref: any) => {
    const same = invoices.filter((x: any) => x.invoice === ref.invoice);
    if (same.length === 1) out.push(same[0].id);
    else out.push(same.reduce((p: any, c: any) => (p.invType > c.invType ? p : c)).id);
  });
  return [...new Set(out)];
}

export interface ReviewRow {
  id: string;
  order: string;
  supplierName: string;
  cur: string;
  poWeight: number;
  shippedWeight: number;
  remaining: number;
  statusKey: string;
  statusLabel: string;
}

export interface StatementTotal {
  supplier: string;
  cur: string;
  poWeight: number;
  shippedWeight: number;
  remaining: number;
}

export function useContractsReview() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['contracts-review', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const contracts = await loadData<Contract>(uid, 'contracts', dateSelect);
      const index = await buildInvoiceIndex(uid, contracts);
      const enriched = await Promise.all(
        contracts.map(async (c) => ({
          contract: c,
          invoicesData: contractInvoicesFromIndex(c, index, false) as Invoice[],
          stock: await loadStockDataByIds(uid, c.stock || []),
        }))
      );
      return enriched;
    },
  });

  const data = useMemo(() => {
    if (!query.data) return { rows: [] as ReviewRow[], statement: [] as StatementTotal[] };

    const rows: ReviewRow[] = query.data.map(({ contract, invoicesData, stock }) => {
      const invIds = getInvArray(contract);
      const products = contract.productsData || [];
      const materialIds = [...new Set(products.map((p) => p.id))];

      let poWeight = 0;
      let shippedWeight = 0;
      const lineRollups: any[] = [];

      materialIds.forEach((mid) => {
        const product = products.find((p) => p.id === mid);
        const contractQty = num(product?.qnty);
        let shipped = 0;
        invoicesData.forEach((z) => {
          if (!invIds.includes(z.id)) return;
          (z.productsDataInvoice || []).forEach((f: any) => {
            if (f.descriptionId === mid) shipped += num(f.qnty);
          });
        });
        const lots = (stock || [])
          .filter((c: any) => c.description === mid && num(c.qnty) !== 0)
          .map((l: any) => ({ qnty: num(l.qnty), sold: lotIsSold(l) }));
        lineRollups.push(computeLineSold({ contractQty, shippedQty: shipped, lots }));
        poWeight += contractQty;
        shippedWeight += shipped;
      });

      const rollup = aggregateRollups(lineRollups);
      const status = lineStatus({ shipmentStatus: (contract as any).shipmentStatus, rollup });

      return {
        id: contract.id,
        order: contract.order || '—',
        supplierName: settings?.Supplier?.Supplier?.find((s: any) => s.id === contract.supplier)?.nname || '—',
        cur: contract.cur === 'eu' ? 'eu' : 'us',
        poWeight,
        shippedWeight,
        remaining: poWeight - shippedWeight,
        statusKey: status.key,
        statusLabel: status.label,
      };
    });

    // Per-supplier statement totals (per currency).
    const map = new Map<string, StatementTotal>();
    rows.forEach((r) => {
      const key = `${r.supplierName}|${r.cur}`;
      const e = map.get(key) || { supplier: r.supplierName, cur: r.cur, poWeight: 0, shippedWeight: 0, remaining: 0 };
      e.poWeight += r.poWeight;
      e.shippedWeight += r.shippedWeight;
      e.remaining = e.poWeight - e.shippedWeight;
      map.set(key, e);
    });

    return { rows: rows.sort((a, b) => a.order.localeCompare(b.order)), statement: [...map.values()] };
  }, [query.data, settings]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

export const statusTone = (key: string): 'positive' | 'warn' | 'info' | 'negative' | 'neutral' => {
  if (key === 'shipped' || key === 'Completed' || key === 'sold') return 'positive';
  if (key === 'partial' || key === 'pending' || key === 'Pending') return 'warn';
  if (key === 'unsold' || key === 'On Hold') return 'negative';
  if (key === 'none') return 'neutral';
  return 'info';
};
