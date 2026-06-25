import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import {
  loadData,
  loadDocByIdDate,
  loadExpensesForAccounting,
  loadAdditionalCNFN,
} from '@/data/firestore';
import { num } from '@shared/finance';

const getprefixInv = (x: any) =>
  x.invType === '1111' || x.invType === 'Invoice' ? '' : x.invType === '2222' || x.invType === 'Credit Note' ? 'CN' : 'FN';
const getprefixInv1 = (x: any) =>
  x.invType === '1111' || x.invType === 'Invoice' ? 'Sales Invoice' : x.invType === '2222' || x.invType === 'Credit Note' ? 'Credit Note' : 'Final Note';

const sortBy = (arr: any[], key: string) =>
  [...arr].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, { numeric: true }));

export interface AccountingLine {
  dateExp: string;
  expInvoice: string;
  supplierName: string;
  amountExp: number;
  expType: string;
  curEX: string;
}
export interface AccountingGroup {
  invoice: string;
  saleInvoice: string;
  dateInv: string;
  clientInvName: string;
  amountInv: number;
  curINV: string;
  invType: string;
  lines: AccountingLine[];
}

export function useAccounting() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();
  const gQ = (id: string, cat: string, field: string) => settings?.[cat]?.[cat]?.find((q: any) => q.id === id)?.[field] || '';

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['accounting', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async (): Promise<AccountingGroup[]> => {
      const uid = uidCollection as string;
      let dt = await loadData<any>(uid, 'invoices', dateSelect);

      // CN/FN whose original sits in this period but the note may be elsewhere.
      const cnOrfn = dt
        .filter(
          ({ invoice, invType, cnORfl }: any) =>
            dt.filter((item: any) => item.invoice === invoice).length === 1 &&
            ['1111', 'invoice'].includes(invType) &&
            cnORfl !== undefined &&
            cnORfl !== null
        )
        .map((z: any) => z.cnORfl);

      // Drop standalone CN/FN with no original in the period.
      dt = dt.filter(
        (z: any) =>
          dt.find((x: any) => x.invoice === z.invoice && x.invType === '1111') ||
          z.invType === '1111' ||
          z.invType === 'Invoice'
      );

      const cnfnData = await loadAdditionalCNFN(uid, cnOrfn);
      dt = sortBy([...dt, ...cnfnData], 'invoice');

      // Sales-invoice rows.
      const invArr = dt.map((l: any) => ({
        dateInv: l.final ? l.date : l.dateRange?.endDate,
        saleInvoice: l.invoice + getprefixInv(l),
        clientInvName: l.final ? l.client?.nname : gQ(l.client, 'Client', 'nname'),
        amountInv: num(l.totalAmount),
        invType: getprefixInv1(l),
        invoice: l.invoice,
        curINV: l.final ? l.cur?.cur : gQ(l.cur, 'Currency', 'cur'),
      }));

      // Purchase invoices from the linked contracts (poInvoices.invRef matching a sale#).
      const poRefs = dt
        .map((z: any) => z.poSupplier)
        .filter((item: any, i: number, self: any[]) => item && i === self.findIndex((t: any) => t?.id === item.id && t?.order === item.order && t?.date === item.date));
      const contracts = await Promise.all(poRefs.map((ref: any) => loadDocByIdDate<any>(uid, 'contracts', ref)));

      const saleNumbers = new Set(invArr.map((z: any) => z.saleInvoice));
      const consArr: any[] = [];
      contracts.forEach((contract: any) => {
        if (!contract || !Array.isArray(contract.poInvoices)) return;
        contract.poInvoices.forEach((po: any) => {
          if (!po || !Array.isArray(po.invRef)) return;
          po.invRef.forEach((ref: any) => {
            if (saleNumbers.has(ref)) {
              consArr.push({
                dateExp: contract.dateRange?.endDate,
                expInvoice: po.inv,
                supplierName: gQ(contract.supplier, 'Supplier', 'nname'),
                amountExp: num(po.invValue),
                expType: 'Purchase',
                invoice: ref,
                curEX: gQ(contract.cur, 'Currency', 'cur'),
              });
            }
          });
        });
      });

      // Linked expenses.
      const expRefs = dt.filter((x: any) => Array.isArray(x.expenses) && x.expenses.length).flatMap((x: any) => x.expenses);
      const expData = await loadExpensesForAccounting(uid, expRefs);
      const expArr = expData.map((l: any) => ({
        dateExp: l.dateRange?.endDate,
        expInvoice: l.expense,
        supplierName: gQ(l.supplier, 'Supplier', 'nname'),
        amountExp: num(l.amount),
        expType: gQ(l.expType, 'Expenses', 'expType') || l.expType,
        invoice: String(l.salesInv || '').replace(/\D/g, ''),
        curEX: gQ(l.cur, 'Currency', 'cur'),
      }));

      const allLines = [...expArr, ...consArr];

      // Group sales invoices by number, attaching their purchase/expense lines.
      const byInvoice: Record<string, AccountingGroup> = {};
      invArr.forEach((s: any) => {
        const key = String(s.invoice);
        if (!byInvoice[key]) {
          byInvoice[key] = {
            invoice: key,
            saleInvoice: s.saleInvoice,
            dateInv: s.dateInv || '',
            clientInvName: s.clientInvName || '—',
            amountInv: s.amountInv,
            curINV: s.curINV || '',
            invType: s.invType,
            lines: [],
          };
        }
      });
      allLines.forEach((e) => {
        const key = String(e.invoice);
        (byInvoice[key] ||= {
          invoice: key,
          saleInvoice: '',
          dateInv: '',
          clientInvName: '—',
          amountInv: 0,
          curINV: '',
          invType: '',
          lines: [],
        }).lines.push({
          dateExp: e.dateExp || '',
          expInvoice: String(e.expInvoice ?? ''),
          supplierName: e.supplierName || '—',
          amountExp: e.amountExp,
          expType: e.expType || '',
          curEX: e.curEX || '',
        });
      });

      return Object.values(byInvoice).sort((a, b) => String(a.invoice).localeCompare(String(b.invoice), undefined, { numeric: true }));
    },
  });

  return { data: query.data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
