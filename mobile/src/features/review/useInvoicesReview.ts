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

    // Client receivables (issued, balance > 0), per currency.
    const receivablesByCur: Record<string, number> = {};
    const clientMap = new Map<string, PartyStatement>();
    grouped.filter(isIssued).forEach((inv) => {
      const bal = invoiceBalance(inv);
      if (bal <= 0.01) return;
      const cur = resolveCur(inv);
      addCur(receivablesByCur, cur, bal);
      const name = resolveClientName(inv.client, settings) || '—';
      const e = clientMap.get(name) || { name, byCur: {} };
      addCur(e.byCur, cur, bal);
      clientMap.set(name, e);
    });

    // Supplier payables (contract poInvoices balances), per currency.
    const supMap = new Map<string, PartyStatement>();
    contracts.forEach((con) => {
      const cur = con.cur === 'eu' ? 'eu' : 'us';
      (con.poInvoices || []).forEach((po: any) => {
        const blnc = num(po.blnc);
        if (blnc === 0) return;
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
