import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { invoiceQtyBySalesContract, salesContractIdsOf, withSalesContractLabels } from '@shared/salesLink';

type Option = { value: string; label: string };

// Tolerant contract-number match (case / spacing / punctuation) — web normalizeNo.
const normalizeNo = (s: unknown) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The sales contracts an invoice can be linked to — a port of web invoiceDetails'
 * header picker (scOptions) and per-line picker (scLineOptions), with the same
 * loading window (the invoice's year ± 1) and the same escape hatches:
 *  - header: hides fully shipped POs and other buyers' POs, but keeps the linked one,
 *    POs with no client, and falls back to every unshipped PO if the client filter
 *    would empty the list;
 *  - lines: does NOT hide shipped POs (lines are tagged while correcting against a
 *    closed PO), same-client first, plus anything a line already points at.
 */
export function useInvoiceSalesContracts(invoice: any) {
  const uidCollection = useAuth((s) => s.uidCollection);
  const settings = useSettings((s) => s.settings);
  const yr = parseInt(String(invoice?.dateRange?.startDate || invoice?.date || '').substring(0, 4), 10);
  const y = Number.isNaN(yr) ? new Date().getFullYear() : yr;
  const invoiceId = String(invoice?.id || '');

  const { data } = useQuery({
    enabled: !!uidCollection,
    queryKey: ['invoice-sales-contracts', uidCollection, y, invoiceId],
    queryFn: async () => {
      const uid = uidCollection as string;
      const range = { start: `${y - 1}-01-01`, end: `${y + 1}-12-31` };
      const [scs, invs] = await Promise.all([loadData<any>(uid, 'salescontracts', range), loadData<any>(uid, 'invoices', range)]);
      // Per LINE, not per invoice (utils/salesLink) — an invoice split across two POs
      // credits each with only its own tonnage.
      const shippedBySc: Record<string, number> = {};
      (invs || [])
        .filter((i: any) => i && !i.canceled && i.id !== invoiceId)
        .forEach((i: any) => {
          const byQty = invoiceQtyBySalesContract(i);
          for (const scId of Object.keys(byQty)) shippedBySc[scId] = (shippedBySc[scId] || 0) + byQty[scId];
        });
      return { salesContracts: scs || [], shippedBySc };
    },
  });

  const client = typeof invoice?.client === 'object' ? invoice?.client?.id : invoice?.client;
  const headerId = String(invoice?.salesContractId || '');
  const lineKey = (invoice?.productsDataInvoice || []).map((r: any) => r?.salesContractId || '').join('|');

  return useMemo(() => {
    const clients = settings?.Client?.Client ?? [];
    const scAll = (data?.salesContracts || [])
      .filter((sc: any) => sc && sc.id)
      .map((sc: any) => ({ ...sc, contractNo: sc.contractNo || '(no number)' }));
    const shipped = data?.shippedBySc || {};
    const scQty = (sc: any) => (sc.productsData || []).reduce((s: number, r: any) => s + (parseFloat(r.qnty) || 0), 0);
    const fullyShipped = (sc: any) => {
      const q = scQty(sc);
      return q > 0 && (shipped[sc.id] || 0) >= q - 0.0001;
    };
    const notShipped = scAll.filter((sc: any) => !fullyShipped(sc) || sc.id === headerId);
    let scOptions = notShipped;
    if (client) {
      const mine = notShipped.filter((sc: any) => !sc.client || sc.client === client || sc.id === headerId);
      scOptions = mine.length ? mine : notShipped;
    }

    const linkedIds = salesContractIdsOf(invoice);
    const scSameClient = scAll.filter((sc: any) => !sc.client || sc.client === client);
    const scLineBase = !client ? scAll : scSameClient.length ? scSameClient : scAll;
    const lineList = [
      ...scLineBase,
      ...linkedIds
        .filter((id) => !scLineBase.some((o: any) => o.id === id))
        .map((id) => scAll.find((sc: any) => sc.id === id))
        .filter(Boolean),
    ];

    const toOptions = (list: any[]): Option[] =>
      withSalesContractLabels(list, clients).map((sc: any) => ({ value: sc.id, label: sc.scLabel || sc.contractNo }));

    /** Typed client contract # → sales contract id, same client preferred (web autoMatchSalesContract). */
    const autoMatch = (typed: string): string => {
      const target = normalizeNo(typed);
      if (!target) return '';
      const pool = scAll.filter((sc: any) => !client || sc.client === client);
      const hit =
        pool.find((sc: any) => normalizeNo(sc.contractNo) === target) ||
        scAll.find((sc: any) => normalizeNo(sc.contractNo) === target);
      return hit?.id || '';
    };
    const contractNoOf = (id: string) => scAll.find((sc: any) => sc.id === id)?.contractNo;

    return { headerOptions: toOptions(scOptions), lineOptions: toOptions(lineList), autoMatch, contractNoOf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, settings, client, headerId, lineKey]);
}
