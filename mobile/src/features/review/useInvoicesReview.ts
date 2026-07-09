import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { resolveClientName, deriveInvoice, InvoiceView } from '@/features/invoices/useInvoices';
import { groupInvoices, isIssued, invoiceBalance, resolveCur, num } from '@shared/finance';

export interface PartyStatement {
  name: string;
  byCur: Record<string, number>;
}

const addCur = (m: Record<string, number>, c: string, v: number) => {
  m[c] = (m[c] || 0) + v;
};

// Invoices Review: review rows (deduped invoices with balances) + a statement of
// client receivables and supplier payables, per currency.
export function useInvoicesReview() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['invoices-review', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const [invoices, contracts] = await Promise.all([
        loadData<Invoice>(uid, 'invoices', dateSelect),
        loadData<Contract>(uid, 'contracts', dateSelect),
      ]);
      return { invoices, contracts };
    },
  });

  const data = useMemo(() => {
    if (!query.data) return { rows: [] as InvoiceView[], clients: [] as PartyStatement[], suppliers: [] as PartyStatement[], receivablesByCur: {} as Record<string, number> };
    const { invoices, contracts } = query.data;

    const grouped = groupInvoices(invoices).sort((a, b) => (b.invoice ?? 0) - (a.invoice ?? 0));
    const rows = grouped.map((inv) => deriveInvoice(inv, settings));

    // Client receivables — WEB STATEMENT RULES (InvoicesReview TotalStatement +
    // sumClients): group by invoice number; when a group has notes, sum EVERY
    // non-original note (CN + FN); canceled contributes 0; drafts are NOT excluded;
    // keep balances with |bal| >= 0.1 INCLUDING negatives (over-paid credits).
    const byNumber = new Map<any, Invoice[]>();
    invoices.forEach((inv: any) => {
      if (inv?.invoice == null) return;
      const g = byNumber.get(inv.invoice) || [];
      g.push(inv);
      byNumber.set(inv.invoice, g);
    });

    const receivablesByCur: Record<string, number> = {};
    const clientMap = new Map<string, PartyStatement>();
    byNumber.forEach((group) => {
      const isOriginal = (o: any) => ['1111', 'Invoice'].includes(o.invType);
      const counted = group.length > 1 ? group.filter((o: any) => !isOriginal(o)) : group;
      const total = counted.reduce(
        (s: number, o: any) => s + (o.canceled ? 0 : num(o.totalAmount)),
        0
      );
      const paid = group.reduce(
        (s: number, o: any) => s + (o.payments || []).reduce((t: number, p: any) => t + num(p.pmnt), 0),
        0
      );
      const bal = total - paid;
      if (Math.abs(bal) < 0.1) return;
      const first: any = group[0];
      const cur = resolveCur(first);
      addCur(receivablesByCur, cur, bal);
      const name = resolveClientName(first.client, settings) || '—';
      const e = clientMap.get(name) || { name, byCur: {} };
      addCur(e.byCur, cur, bal);
      clientMap.set(name, e);
    });

    // Supplier payables (contract poInvoices balances), per currency.
    // Web-consistent filters: drafts excluded, ≤1¢ artifacts treated as settled.
    const supMap = new Map<string, PartyStatement>();
    contracts.forEach((con) => {
      const cur = con.cur === 'eu' ? 'eu' : 'us';
      (con.poInvoices || []).forEach((po: any) => {
        if (po.draft) return;
        const blnc = num(po.blnc);
        if (Math.abs(blnc) <= 0.011) return;
        const name = settings?.Supplier?.Supplier?.find((s: any) => s.id === con.supplier)?.nname || '—';
        const e = supMap.get(name) || { name, byCur: {} };
        addCur(e.byCur, cur, blnc);
        supMap.set(name, e);
      });
    });

    const sortByCur = (m: Map<string, PartyStatement>) =>
      [...m.values()].sort((a, b) => Object.values(b.byCur).reduce((s, v) => s + v, 0) - Object.values(a.byCur).reduce((s, v) => s + v, 0));

    return { rows, clients: sortByCur(clientMap), suppliers: sortByCur(supMap), receivablesByCur };
  }, [query.data, settings]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
