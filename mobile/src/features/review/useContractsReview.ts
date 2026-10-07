import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex, loadStockDataByIds } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { num, heldDraftIds } from '@shared/finance';
import { lotIsSold, computeLineSold, aggregateRollups, lineStatus, toShip, unsoldLeft } from '@shared/soldStatus';
import { reviewFinancials, ReviewFinancials, ViewCur } from './reviewFinance';
import { useShallow } from 'zustand/react/shallow';

// Per-contract: keep, for each invoice number, only the highest-invType invoice id
// (so an original isn't counted alongside its credit/final note). Port of getInvArray.
// A note still saved as a draft does not stand in for the invoice it would replace —
// what shipped is what was issued, which is also what left the stock (shared
// heldDraftIds over the contract's invoice documents, 2026-10-07).
function getInvArray(contract: Contract, docs: Invoice[] = []): string[] {
  const out: string[] = [];
  const held = heldDraftIds(docs);
  const invoices = (contract.invoices || []).filter((x: any) => !held.has(x.id));
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
  /** what there is to ship: the contract until the goods are in, then what arrived (toShip) */
  shipBasis: number;
  remaining: number;
  statusKey: string;
  statusLabel: string;
  /** "Completed" with weight still to ship — shown amber, as web does */
  statusWarn?: boolean;
  /** the VIEW currency the money columns are expressed in (web's valCur) */
  finCur: string;
  /** web's 11 money columns for this contract, converted into finCur */
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
  shipBasis: number;
  remaining: number;
  qntyReceived: number;
  consignees: string[];
  destinations: string[];
  invoiceNums: any[];
  salesPos: string[];
  statusKey: string;
  statusLabel: string;
  statusWarn?: boolean;
}

export interface StatementTotal {
  supplier: string;
  cur: string;
  poWeight: number;
  shippedWeight: number;
  remaining: number;
}

export function useContractsReview(viewCur: 'us' | 'eu' = 'us') {
  const uidCollection = useAuth((s) => s.uidCollection);
  const { settings, dateSelect, loaded } = useSettings(useShallow((s) => ({ settings: s.settings, dateSelect: s.dateSelect, loaded: s.loaded })));

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
      const invIds = getInvArray(contract, invoicesData);
      const products = contract.productsData || [];
      const materialIds = [...new Set(products.map((p) => p.id))];

      let poWeight = 0;
      let shippedWeight = 0;
      let receivedWeight = 0;
      let leftByLine = 0;     // each line's leftover, none below zero (web poFigures)
      let unsoldWeight = 0;   // weight left on lots with no buyer (unsoldLeft)
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
        // A helper line (split off another line, or brought in from another PO) repeats
        // weight already on a line of its own — web ContractsReview&Statement, same fix:
        // PO 210426-1 read 150.838 MT against a real 102.216.
        const isHelper = !!(product as any)?.import;
        if (!isHelper) poWeight += contractQty;
        shippedWeight += shipped;
        const received = lots.reduce((t: number, l: any) => t + l.qnty, 0);
        receivedWeight += received;
        // What there is to ship: the contract until the goods are in, then what arrived
        // (soldStatus.js toShip — web's statement, PO 191125-1).
        const ship = toShip({ contractQty: isHelper ? 0 : contractQty, receivedQty: received, shippedQty: shipped, shipmentStatus: (contract as any).shipmentStatus });
        const unsold = unsoldLeft({ remaining: ship.remaining, lots });
        leftByLine += Math.max(0, ship.remaining);
        unsoldWeight += unsold;

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
        const st = lineStatus({ shipmentStatus: (contract as any).shipmentStatus, rollup: lineRollup, unsold });
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
          shipBasis: ship.basis,
          remaining: ship.remaining,
          qntyReceived: received,
          consignees: [...new Set(consignees)],
          destinations: [...new Set(destinations)],
          invoiceNums: [...new Set(invoiceNums)],
          salesPos: [...new Set(lotRows.map((l: any) => String(l.salesPo || '').trim()).filter(Boolean))],
          statusKey: st.key,
          statusLabel: st.label,
          statusWarn: !!st.warn,
        });
      });

      const rollup = aggregateRollups(lineRollups);
      // The PO as a whole (web poFigures): contract less shipped until the goods are in; then
      // each line's leftover on its own, so an over-invoiced line cannot cancel unsold containers.
      const po = toShip({ contractQty: poWeight, receivedQty: receivedWeight, shippedQty: shippedWeight, shipmentStatus: (contract as any).shipmentStatus });
      const poRemaining = po.byReceived ? Math.round(leftByLine * 1000) / 1000 : po.remaining;
      const status = lineStatus({ shipmentStatus: (contract as any).shipmentStatus, rollup, unsold: Math.round(unsoldWeight * 1000) / 1000 });

      return {
        id: contract.id,
        order: contract.order || '—',
        supplierName: settings?.Supplier?.Supplier?.find((s: any) => s.id === contract.supplier)?.nname || '—',
        cur: contract.cur === 'eu' ? 'eu' : 'us',
        poWeight,
        shippedWeight,
        shipBasis: po.basis,
        remaining: poRemaining,
        statusKey: status.key,
        statusLabel: status.label,
        statusWarn: !!status.warn,
        // Web has ONE global currency selector (page.js:215 valCur, default 'us')
        // and converts every contract into it at that contract's own euroToUSD.
        // Mobile was passing each contract's OWN currency, so a EUR contract's
        // money columns stayed in EUR and never converted — and the totals were
        // bucketed per currency instead of summing into one view currency.
        finCur: viewCur,
        fin: reviewFinancials(contract, invoiceGroups, { cur: viewCur } as ViewCur, settings),
      };
    });

    // Per-supplier statement totals (per currency).
    const map = new Map<string, StatementTotal>();
    rows.forEach((r) => {
      const key = `${r.supplierName}|${r.cur}`;
      const e = map.get(key) || { supplier: r.supplierName, cur: r.cur, poWeight: 0, shippedWeight: 0, remaining: 0 };
      e.poWeight += r.poWeight;
      e.shippedWeight += r.shippedWeight;
      // PO by PO, as each row reads it (toShip) — not contract less shipped across them.
      e.remaining += r.remaining;
      map.set(key, e);
    });

    return {
      rows: rows.sort((a, b) => a.order.localeCompare(b.order)),
      statement: [...map.values()],
      statementLines: statementLines.sort((a, b) => a.order.localeCompare(b.order)),
    };
  }, [query.data, settings, viewCur]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

export const statusTone = (key: string, warn = false): 'positive' | 'warn' | 'info' | 'negative' | 'neutral' => {
  // "Completed · 45.04 MT not shipped" — a finished status with weight still to ship.
  if (warn) return 'warn';
  if (key === 'shipped' || key === 'Completed' || key === 'sold') return 'positive';
  if (key === 'partial' || key === 'pending' || key === 'Pending') return 'warn';
  if (key === 'unsold' || key === 'On Hold') return 'negative';
  if (key === 'none') return 'neutral';
  return 'info';
};
