import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { resolveClientName, deriveInvoice, InvoiceView } from '@/features/invoices/useInvoices';
import { isIssued, invoiceBalance, resolveCur, num } from '@shared/finance';

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

    // Review CARD rows use web's Total() rule (InvoicesReview&Statement/page.js:51-72),
    // NOT finance.groupInvoices. The two genuinely differ:
    //   • [Invoice, CreditNote, FinalNote] — web sums CN + FN; groupInvoices keeps
    //     only the max-rank doc (FN), so the card read low.
    //   • [Invoice, Invoice] (two same-type originals) — web renders $0.00 because
    //     neither doc qualifies; groupInvoices bails out and rendered BOTH as rows.
    //   • a canceled doc contributes 0 to web's total; groupInvoices counts it.
    // finance.js is byte-identical to web's and also feeds receivables/aging/revenue
    // (all currently true parity on the dashboard), so this is fixed HERE rather
    // than in the shared module.
    const isOriginalDoc = (o: any) => ['1111', 'Invoice'].includes(o.invType);

    // ONE grouping + ONE reduction, shared by the cards and the statement — they
    // apply the same web rule and previously duplicated it, which is how they
    // drifted apart in the first place.
    const groups = new Map<any, Invoice[]>();
    invoices.forEach((inv: any) => {
      if (inv?.invoice == null) return;
      const g = groups.get(inv.invoice) || [];
      g.push(inv);
      groups.set(inv.invoice, g);
    });

    const reduced = [...groups.values()].map((group) => {
      const counted = group.length > 1 ? group.filter((o: any) => !isOriginalDoc(o)) : group;
      const totalAmount = counted.reduce(
        (s: number, o: any) => s + (o.canceled ? 0 : num(o.totalAmount)),
        0
      );
      // Payments come from EVERY doc in the group (web TotalInvoicePayments).
      const payments = group.flatMap((o: any) => o.payments || []);
      const paid = payments.reduce((t: number, p: any) => t + num(p.pmnt), 0);
      // Display metadata from the superseding doc when there is one.
      const base: any = (group.length > 1 ? counted[0] : group[0]) || group[0];
      return { group, base, totalAmount, payments, paid, bal: totalAmount - paid };
    });

    const rows = reduced
      .map((r) => deriveInvoice({ ...r.base, totalAmount: r.totalAmount, payments: r.payments } as Invoice, settings))
      .sort((a, b) => (b.number ?? 0) - (a.number ?? 0));

    // Client receivables — same reduction, then web's statement filter: keep
    // |bal| >= 0.1 INCLUDING negatives (over-paid credits); drafts are NOT excluded.
    const receivablesByCur: Record<string, number> = {};
    const clientMap = new Map<string, PartyStatement>();
    reduced.forEach(({ base, bal }) => {
      if (Math.abs(bal) < 0.1) return;
      const cur = resolveCur(base);
      addCur(receivablesByCur, cur, bal);
      const name = resolveClientName(base.client, settings) || '—';
      const e = clientMap.get(name) || { name, byCur: {} };
      addCur(e.byCur, cur, bal);
      clientMap.set(name, e);
    });

    // Supplier payables — web's InvoicesReview STATEMENT pipeline
    // (page.js:142-169 setInvoicesDTStatement + invoicesstatement sumSuppliers),
    // NOT the Cashflow payables formula mobile was running here.
    //
    // Three differences that all moved money:
    //   • web has NO draft filter on this screen (Cashflow does) — a purchase
    //     invoice marked "Hidden from Cashflow" still counts in the statement.
    //   • web has NO ≤1¢ artifact filter here.
    //   • web only counts a poInvoice whose invRef[0] matches a sales invoice
    //     number that is actually LOADED in the period; mobile counted every
    //     poInvoice on every contract in range.
    // sumSuppliers then keeps a per-currency row only when its balance is non-zero.
    const loadedInvNums = new Set(
      invoices.map((i: any) => parseFloat(i?.invoice)).filter((n) => !isNaN(n))
    );
    const supMap = new Map<string, PartyStatement>();
    contracts.forEach((con) => {
      const cur = con.cur === 'eu' ? 'eu' : 'us';
      const name = settings?.Supplier?.Supplier?.find((s: any) => s.id === con.supplier)?.nname || '—';
      (con.poInvoices || []).forEach((po: any) => {
        const ref = parseFloat((po?.invRef || [])[0]);
        if (isNaN(ref) || !loadedInvNums.has(ref)) return;
        const blnc = num(po.blnc);
        const e = supMap.get(name) || { name, byCur: {} };
        addCur(e.byCur, cur, blnc);
        supMap.set(name, e);
      });
    });
    // sumSuppliers drops a currency row whose balance nets to zero.
    supMap.forEach((e, k) => {
      Object.keys(e.byCur).forEach((c) => {
        if (e.byCur[c] === 0) delete e.byCur[c];
      });
      if (!Object.keys(e.byCur).length) supMap.delete(k);
    });

    const sortByCur = (m: Map<string, PartyStatement>) =>
      [...m.values()].sort((a, b) => Object.values(b.byCur).reduce((s, v) => s + v, 0) - Object.values(a.byCur).reduce((s, v) => s + v, 0));

    return { rows, clients: sortByCur(clientMap), suppliers: sortByCur(supMap), receivablesByCur };
  }, [query.data, settings]);

  return { ...data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
