import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex, loadStockDataByIds } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { num } from '@shared/finance';
import { lotIsSold, computeLineSold, aggregateRollups, lineStatus } from '@shared/soldStatus';
import { reviewFinancials, ReviewFinancials, ViewCur } from './reviewFinance';

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
  /** web's 11 money columns for this contract */
  fin: ReviewFinancials;
}

export interface StatementLine {
  key: string;
  order: string;
  supplierName: string;
  date: string;
  description: string;
  unitPrc: number;
  cur: string;
  poWeight: number;
  shippedWeight: number;
  remaining: number;
  qntyReceived: number;
  consignees: string[];
  destinations: string[];
  invoiceNums: any[];
  salesPos: string[];
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
          invoiceGroups: contractInvoicesFromIndex(c, index, true) as Invoice[][],
          stock: await loadStockDataByIds(uid, c.stock || []),
        }))
      );
      return enriched;
    },
  });

  const data = useMemo(() => {
    if (!query.data) return { rows: [] as ReviewRow[], statement: [] as StatementTotal[], statementLines: [] as StatementLine[] };

    // View currency — web has a selector; mobile follows the contract's own currency
    // so each row is shown in the currency it was traded in (no cross-currency sums).
    const statementLines: StatementLine[] = [];
    const rows: ReviewRow[] = query.data.map(({ contract, invoicesData, invoiceGroups, stock }) => {
      const invIds = getInvArray(contract);
      const products = contract.productsData || [];
      const materialIds = [...new Set(products.map((p) => p.id))];

      let poWeight = 0;
      let shippedWeight = 0;
      const lineRollups: any[] = [];
      const supplierName0 = settings?.Supplier?.Supplier?.find((s: any) => s.id === contract.supplier)?.nname || '—';
      const conDate = (contract as any).dateRange?.startDate || (contract as any).date || '';

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
        const lineRollup = computeLineSold({ contractQty, shippedQty: shipped, lots });
        lineRollups.push(lineRollup);
        poWeight += contractQty;
        shippedWeight += shipped;

        // Web renders ONE STATEMENT ROW PER MATERIAL LINE (16 columns). Mobile used
        // to compute this loop and keep only the summed weights, so the statement
        // table itself did not exist.
        const consignees: string[] = [];
        const destinations: string[] = [];
        const invoiceNums: any[] = [];
        invoicesData.forEach((z: any) => {
          if (!invIds.includes(z.id)) return;
          (z.productsDataInvoice || []).forEach((f: any) => {
            if (f.descriptionId !== mid) return;
            const clnt = z.final
              ? z.client?.nname
              : settings?.Client?.Client?.find((c: any) => c.id === z.client)?.nname;
            const pod = z.final ? z.pod : settings?.POD?.POD?.find((c: any) => c.id === z.pod)?.pod;
            if (clnt) consignees.push(clnt);
            if (pod) destinations.push(pod);
            if (z.invoice != null) invoiceNums.push(z.invoice);
          });
        });
        const lotRows = (stock || []).filter((c: any) => c.description === mid && num(c.qnty) !== 0);
        const st = lineStatus({ shipmentStatus: (contract as any).shipmentStatus, rollup: lineRollup });
        statementLines.push({
          key: contract.id + '|' + mid,
          order: contract.order || '—',
          supplierName: supplierName0,
          date: conDate,
          description: product?.description || '—',
          unitPrc: num(product?.unitPrc),
          cur: contract.cur === 'eu' ? 'eu' : 'us',
          poWeight: contractQty,
          shippedWeight: shipped,
          remaining: contractQty - shipped,
          qntyReceived: lotRows.reduce((t: number, o: any) => t + num(o.qnty), 0),
          consignees: [...new Set(consignees)],
          destinations: [...new Set(destinations)],
          invoiceNums: [...new Set(invoiceNums)],
          salesPos: [...new Set(lotRows.map((l: any) => String(l.salesPo || '').trim()).filter(Boolean))],
          statusKey: st.key,
          statusLabel: st.label,
        });
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
        fin: reviewFinancials(contract, invoiceGroups, { cur: (contract.cur === 'eu' ? 'eu' : 'us') } as ViewCur, settings),
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

    return {
      rows: rows.sort((a, b) => a.order.localeCompare(b.order)),
      statement: [...map.values()],
      statementLines: statementLines.sort((a, b) => a.order.localeCompare(b.order)),
    };
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
