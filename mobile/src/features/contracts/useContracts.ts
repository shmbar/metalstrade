import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex } from '@/data/firestore';
import { Contract, Invoice } from '@/data/types';
import { qk } from '@/query/client';
import { contractPurchaseValue, toMT, num } from '@shared/finance';
import { curSymbol, fmtMoney } from '@/lib/format';
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
  /** unit-converted tonnage — used for sorting, CSV/PDF and any math */
  totalMT: number;
  /** what web's contracts-table QTY column renders, quirks included (see below) */
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

  // The on-screen quantity label mirrors web's contracts-table QTY column
  // (contracts/page.js:154-162), which differs from `totalMT` three ways:
  //   • it does NOT unit-convert — it sums the raw qnty and appends the contract's
  //     own quantity-type label, so a KGS contract reads "1,500.0 KGS", not "1.5 MT";
  //   • it renders '-' when the contract has no non-import lines;
  //   • it sums with parseInt(qnty, 10), TRUNCATING every fractional quantity.
  // That last one is a genuine web defect (12.5 MT reads "12.0", and a blank qnty
  // makes the whole cell "NaN") and it is reported rather than fixed there, but the
  // label reproduces it so the two screens agree. `totalMT` above stays accurate and
  // is what the sort, the CSV export and the PDF use.
  const qLabel =
    settings?.Quantity?.Quantity?.find((q: any) => q.id === c.qTypeTable)?.qTypeTable || '';
  const mtLabel =
    own.length === 0
      ? '-'
      : new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).format(
          own.reduce((s, p: any) => s + parseInt(p.qnty, 10), 0)
        ) + (qLabel ? ` ${qLabel}` : '');
  const productNames = [...new Set(own.map((p) => p.description).filter(Boolean))] as string[];
  const invoiceCount = (c.invoicesData || []).length;

  return {
    supplierName,
    currency: cur,
    totalValue,
    valueLabel: `${curSymbol(cur)}${fmtMoney(totalValue)}`,
    invoicedValue,
    totalMT,
    mtLabel,
    productNames,
    status: c.conStatus || '',
    invoiceCount,
  };
}
