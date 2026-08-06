// Shared Stock (IMS + GIS) — inventory jointly held by the two companies.
// Faithful port of the web tab (app/(root)/stocks/SharedStock.js): the same fixed
// SHARED_STOCK namespace, the same net-stock picker (invoice supersede applied),
// the same owners / financedBy semantics and the same financing split.

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadSharedStock } from '@/data/firestore';
import { useAllStockLots, STOCK_LOTS_KEY } from './useAllStockLots';
import { saveSharedStock, deleteSharedStock, newId } from '@/data/writes';

export const OWNERS = ['IMS', 'GIS'] as const;
// financedBy = who PAID for the lot ('IMS' | 'GIS' | 'BOTH') — distinct from owners
// (who holds it). Legacy lots without the field derive it from owners.
export const FINANCING = ['IMS', 'GIS', 'BOTH'] as const;
export type Owner = (typeof OWNERS)[number];
export type Financing = (typeof FINANCING)[number];

export const financedOf = (x: any): Financing =>
  x?.financedBy && (FINANCING as readonly string[]).includes(x.financedBy)
    ? x.financedBy
    : Array.isArray(x?.owners) && x.owners.length === 1
      ? x.owners[0]
      : 'BOTH';

export interface SharedLot {
  id: string;
  descriptionText: string;
  descriptionName: string;
  qnty: number | string;
  unitPrc: number | string;
  total?: number;
  stock: string;
  stockName: string;
  supplier: string;
  supplierName: string;
  cur: string;
  status: string;
  owners: string[];
  ownersLabel: string;
  financedBy?: Financing;
  financedLabel: string;
  sharedByAccount?: string;
  sourceId?: string;
  sourceAccount?: string;
  sourcePo?: string;
  date?: string;
  createdAtMs?: number;
}

export interface NetRow {
  id: string;
  name: string;
  stock: string;
  net: number;
  unitPrc: any;
  supplier: string;
  cur: string;
  order: string;
}

export const blankLot = () => ({
  id: '',
  descriptionText: '',
  qnty: '',
  unitPrc: '',
  stock: '',
  supplier: '',
  cur: 'us',
  status: '',
  owners: ['IMS', 'GIS'] as string[],
  financedBy: 'BOTH' as Financing,
  sourceId: '',
  sourceAccount: '',
  sourcePo: '',
});

// Port of utils.js filteredArray — an invoice superseded by its Credit/Final note
// counts once.
const filteredArray = <T extends { invoice?: any; invType?: any }>(arr: T[]): T[] => {
  const byInvoice: Record<string, T[]> = {};
  arr.forEach((obj) => {
    (byInvoice[String(obj.invoice)] ||= []).push(obj);
  });
  return Object.values(byInvoice).flatMap((group) => {
    const distinct = new Set(group.map((o) => parseInt(o.invType as any, 10)));
    if (distinct.size === 1) return group;
    const max = Math.max(...distinct);
    return group.filter((o) => parseInt(o.invType as any, 10) === max);
  });
};

export function useSharedStock() {
  const { uidCollection, gisAccount } = useAuth();
  const { settings, loaded } = useSettings();
  const qc = useQueryClient();
  const accountName = gisAccount ? 'GIS' : 'IMS';

  const warehouses = settings?.Stocks?.Stocks || [];
  const suppliers = settings?.Supplier?.Supplier || [];
  const currencies = settings?.Currency?.Currency || [];
  const whName = (id: string) => {
    const w = warehouses.find((x: any) => x.id === id);
    return w?.stock || w?.nname || '—';
  };
  const supName = (id: string) => suppliers.find((s: any) => s.id === id)?.nname || '—';
  const curSym = (id: string) => currencies.find((c: any) => c.id === id)?.symbol || '';

  // The joint pool has its own namespace; the account's OWN ledger (used only to
  // build the "pick from my current stock" list) comes from the shared query.
  const query = useQuery({
    enabled: loaded,
    queryKey: ['shared-stock', uidCollection],
    queryFn: async () => ({ shared: (await loadSharedStock()).filter(Boolean) }),
  });
  const ownLotsQuery = useAllStockLots();

  const rows: SharedLot[] = useMemo(
    () =>
      (query.data?.shared || []).map((x: any) => ({
        ...x,
        descriptionName: x.descriptionText || x.description || '—',
        stockName: whName(x.stock),
        supplierName: supName(x.supplier),
        ownersLabel: Array.isArray(x.owners) && x.owners.length ? x.owners.join(' + ') : 'IMS + GIS',
        financedLabel: financedOf(x) === 'BOTH' ? 'IMS + GIS' : financedOf(x),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query.data, settings]
  );

  // The account's CURRENT stock (net in − out per material + warehouse, invoice
  // supersede applied) — shared lots are PICKED from this list rather than typed
  // from scratch. One representative in-lot supplies the prefill (price / supplier
  // / PO); the quantity offered is the net left.
  const netRows: NetRow[] = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (ownLotsQuery.data || []).filter((l: any) => l && l.stock).forEach((l: any) => {
      const k = `${l.description || l.descriptionId || ''}|${l.stock}`;
      (groups[k] ||= []).push(l);
    });
    const out: NetRow[] = [];
    Object.values(groups).forEach((g) => {
      const dedup = filteredArray(g);
      let net = 0;
      let firstIn: any = null;
      dedup.forEach((l: any) => {
        const q = Math.abs(parseFloat(l.qnty) || 0);
        if (l.type === 'out') net -= q;
        else {
          net += q;
          if (!firstIn) firstIn = l;
        }
      });
      if (net > 0.0005 && firstIn) {
        const name =
          (firstIn.type === 'in' && firstIn.description
            ? firstIn.productsData?.find((y: any) => y.id === firstIn.description)?.description
            : firstIn.descriptionText || firstIn.descriptionName) || '(unnamed)';
        out.push({
          id: firstIn.id,
          name,
          stock: firstIn.stock,
          net: Math.round(net * 10000) / 10000,
          unitPrc: firstIn.unitPrc,
          supplier: firstIn.supplier,
          cur: firstIn.cur || 'us',
          order: firstIn.order || '',
        });
      }
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [ownLotsQuery.data]);

  const totalMt = rows.reduce((s, r) => s + (parseFloat(String(r.qnty)) || 0), 0);

  // Total stock value and how much each company is financing — driven by the lot's
  // explicit "Financed by" (IMS / GIS / Both 50-50). Kept PER CURRENCY.
  const money = useMemo(() => {
    const totals: Record<string, number> = {};
    const fin: Record<string, Record<string, number>> = { IMS: {}, GIS: {} };
    rows.forEach((r) => {
      const val = (parseFloat(String(r.qnty)) || 0) * (parseFloat(String(r.unitPrc)) || 0);
      if (!val) return;
      const cur = r.cur || 'us';
      totals[cur] = (totals[cur] || 0) + val;
      const f = financedOf(r);
      const payers: string[] = f === 'BOTH' ? [...OWNERS] : [f];
      payers.forEach((o) => {
        if (fin[o]) fin[o][cur] = (fin[o][cur] || 0) + val / payers.length;
      });
    });
    return { totals, fin };
  }, [rows]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shared-stock'] });
    qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] });
  };

  const save = useMutation({
    mutationFn: async (lot: ReturnType<typeof blankLot> & Record<string, any>) => {
      const now = new Date();
      const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const stamp = `${String(now.getDate()).padStart(2, '0')}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;
      const docRow = {
        id: lot.id || newId(),
        shared: true,
        owners: lot.owners.length ? lot.owners : ['IMS', 'GIS'],
        financedBy: (FINANCING as readonly string[]).includes(lot.financedBy) ? lot.financedBy : 'BOTH',
        sharedByAccount: lot.sharedByAccount || accountName,
        type: 'in',
        stock: lot.stock,
        descriptionText: lot.descriptionText,
        qnty: parseFloat(String(lot.qnty)) || 0,
        unitPrc: parseFloat(String(lot.unitPrc)) || 0,
        total: (parseFloat(String(lot.qnty)) || 0) * (parseFloat(String(lot.unitPrc)) || 0),
        supplier: lot.supplier || '',
        cur: lot.cur || 'us',
        status: lot.status || '',
        // Where the lot came from when picked from an account's own inventory —
        // keeps the shared record traceable back to the real stock lot / PO.
        sourceId: lot.sourceId || '',
        sourceAccount: lot.sourceAccount || '',
        sourcePo: lot.sourcePo || '',
        date: lot.date || stamp,
        createdAtMs: lot.createdAtMs || now.getTime(),
      };
      await saveSharedStock([docRow]);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSharedStock(id),
    onSuccess: invalidate,
  });

  return {
    rows, netRows, totalMt, money, accountName,
    warehouses, suppliers, currencies, whName, supName, curSym,
    save, remove,
    isLoading: query.isLoading || ownLotsQuery.isLoading,
    isError: query.isError || ownLotsQuery.isError,
    error: query.error || ownLotsQuery.error,
    refetch: () => { query.refetch(); ownLotsQuery.refetch(); },
  };
}
