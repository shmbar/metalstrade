import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { qk } from '@/query/client';
import { contractPurchaseValue, toMT, num } from '@shared/finance';
import { curSymbol, fmtMoney, fmtMT } from '@/lib/format';
import { arr } from '@/lib/guard';

// All contracts in the active period, enriched with their linked invoices.
export function useContracts() {
  const { uidCollection } = useAuth();
  const { dateSelect, loaded } = useSettings();

  return useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: qk.contracts(uidCollection || '', dateSelect.start, dateSelect.end),
    queryFn: async () => {
      const uid = uidCollection as string;
      const contracts = await loadData<Contract>(uid, 'contracts', dateSelect);
      const index = await buildInvoiceIndex(uid, contracts);
      return contracts
        .map((c): Contract => ({ ...c, invoicesData: contractInvoicesFromIndex(c, index, true) as Invoice[][] }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
  });
}

export interface ContractView {
  supplierName: string;
  currency: string;
  /** Σ poInvoices.pmnt — money actually PAID to the supplier (web "Purchase Value"). */
  totalValue: number;
  valueLabel: string;
  /** Σ poInvoices.invValue — what the supplier BILLED; the denominator for progress. */
  invoicedValue: number;
  totalMT: number;
  mtLabel: string;
  productNames: string[];
  status: string;
  invoiceCount: number;
}

// import-flagged products are breakdown/merge helpers created by the warehouse PDF
// import, not PO lines — web excludes them from EVERY quantity roll-up, because
// counting them double-counts the contract. Mobile must do the same.
export const ownProducts = (c: Contract): any[] => arr<any>(c.productsData).filter((p) => !p?.import);

// Derive the display fields a contract card/detail needs. Settings resolve the
// supplier id → name; finance.js gives the canonical purchase value + tonnage.
export function deriveContract(c: Contract, settings: any): ContractView {
  const supplierName = settings?.Supplier?.Supplier?.find((s: any) => s.id === c.supplier)?.nname || '—';
  const cur = c.cur === 'eu' ? 'eu' : 'us';
  const pv = contractPurchaseValue(c, { base: 'us' });
  const totalValue = pv.byCur[cur] || 0;

  // Denominator for the payment-progress bar. Σ invValue is what the supplier
  // billed; when no purchase invoice has been recorded yet, fall back to the
  // contract's own line value (qnty × unitPrc) so the bar still means something.
  const own = ownProducts(c);
  const billed = arr<any>(c.poInvoices).reduce((s, z) => s + num(z?.invValue), 0);
  const lineValue = own.reduce((s, p) => s + num(p.qnty) * num(p.unitPrc), 0);
  const invoicedValue = billed > 0 ? billed : lineValue;

  const totalMT = own.reduce((s, p) => s + toMT(num(p.qnty), c, settings), 0);
  const productNames = [...new Set(own.map((p) => p.description).filter(Boolean))] as string[];
  const invoiceCount = (c.invoicesData || []).length;

  return {
    supplierName,
    currency: cur,
    totalValue,
    valueLabel: `${curSymbol(cur)}${fmtMoney(totalValue)}`,
    invoicedValue,
    totalMT,
    mtLabel: fmtMT(totalMT),
    productNames,
    status: c.conStatus || '',
    invoiceCount,
  };
}
