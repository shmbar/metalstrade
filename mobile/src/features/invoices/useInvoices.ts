import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadInvoicesTagged } from '@/data/firestore';
import { Invoice } from '@/data/types';
import {
  groupInvoices,
  isIssued,
  isFinalized,
  invoiceBalance,
  invoicePaid,
  resolveCur,
  resolveInvoiceDate,
  num,
} from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';

// Resolve a client display name from either an id (draft invoices) or an object
// (finalized invoices store { nname }). Mirrors the dashboard's resolveClientName.
export function resolveClientName(client: any, settings: any): string {
  if (client && typeof client === 'object') return client.nname || client.client || '';
  return settings?.Client?.Client?.find((c: any) => c.id === client)?.nname || '';
}

export interface InvoiceView {
  id: string;
  year: string;
  number?: number;
  clientName: string;
  cur: string;
  total: number;
  paid: number;
  balance: number;
  totalLabel: string;
  balanceLabel: string;
  dateIso: string | null;
  finalized: boolean;
  issued: boolean;
  status: 'Paid' | 'Partial' | 'Unpaid';
  raw: Invoice;
}

export function deriveInvoice(inv: Invoice, settings: any): InvoiceView {
  const cur = resolveCur(inv);
  const total = num(inv.totalAmount);
  const paid = invoicePaid(inv);
  const balance = invoiceBalance(inv);
  const status: InvoiceView['status'] = balance <= 0.01 ? 'Paid' : paid > 0.01 ? 'Partial' : 'Unpaid';
  return {
    id: inv.id,
    year: String((inv as any).__yr || (resolveInvoiceDate(inv) || '').substring(0, 4) || ''),
    number: inv.invoice,
    clientName: resolveClientName(inv.client, settings) || '—',
    cur,
    total,
    paid,
    balance,
    totalLabel: `${curSymbol(cur)}${fmtMoney(total)}`,
    balanceLabel: `${curSymbol(cur)}${fmtMoney(balance)}`,
    dateIso: resolveInvoiceDate(inv),
    finalized: isFinalized(inv),
    issued: isIssued(inv),
    status,
    raw: inv,
  };
}

// All invoices in the active period, deduped to canonical entries (an invoice and
// its credit/final note count once, payments combined — finance.groupInvoices),
// newest first.
export function useInvoices() {
  const { uidCollection } = useAuth();
  const { dateSelect, loaded } = useSettings();

  return useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['invoices', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      // Tagged docs keep their __yr through grouping (groupInvoices returns kept[0]
      // for note groups, preserving its __yr) so the payment write targets the
      // right bucket.
      const list = await loadInvoicesTagged(uidCollection as string, dateSelect);
      return groupInvoices(list).sort(
        (a, b) => (resolveInvoiceDate(b) || '').localeCompare(resolveInvoiceDate(a) || '')
      ) as Invoice[];
    },
  });
}
