import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { qk } from '@/query/client';
import { contractPurchaseValue, toMT, num } from '@shared/finance';
import { curSymbol, fmtMoney, fmtMT } from '@/lib/format';

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
  totalValue: number;
  valueLabel: string;
  totalMT: number;
  mtLabel: string;
  productNames: string[];
  status: string;
  invoiceCount: number;
}

// Derive the display fields a contract card/detail needs. Settings resolve the
// supplier id → name; finance.js gives the canonical purchase value + tonnage.
export function deriveContract(c: Contract, settings: any): ContractView {
  const supplierName = settings?.Supplier?.Supplier?.find((s: any) => s.id === c.supplier)?.nname || '—';
  const cur = c.cur === 'eu' ? 'eu' : 'us';
  const pv = contractPurchaseValue(c, { base: 'us' });
  const totalValue = pv.byCur[cur] || 0;
  const totalMT = (c.productsData || []).reduce((s, p) => s + toMT(num(p.qnty), c, settings), 0);
  const productNames = [...new Set((c.productsData || []).map((p) => p.description).filter(Boolean))] as string[];
  const invoiceCount = (c.invoicesData || []).length;

  return {
    supplierName,
    currency: cur,
    totalValue,
    valueLabel: `${curSymbol(cur)}${fmtMoney(totalValue)}`,
    totalMT,
    mtLabel: fmtMT(totalMT),
    productNames,
    status: c.conStatus || '',
    invoiceCount,
  };
}
