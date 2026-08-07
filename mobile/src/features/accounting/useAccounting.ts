import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import {
  loadData,
  loadDocByIdDate,
  loadExpensesForAccounting,
  loadAdditionalCNFN,
} from '@/data/firestore';
import {
  AccountingGroup,
  buildExpenseLines,
  buildInvoiceRows,
  buildPurchaseLines,
  dropOrphanNotes,
  groupAccounting,
  makeGQ,
  selectCnFnRefs,
  sortBy,
} from '@/features/accounting/accountingCore';

export type { AccountingGroup, AccountingLine } from '@/features/accounting/accountingCore';

export function useAccounting() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();
  const gQ = makeGQ(settings);

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['accounting', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async (): Promise<AccountingGroup[]> => {
      const uid = uidCollection as string;
      let dt = await loadData<any>(uid, 'invoices', dateSelect);

      // CN/FN whose original sits in this period but the note may be elsewhere.
      const cnOrfn = selectCnFnRefs(dt);

      // Drop standalone CN/FN with no original in the period.
      dt = dropOrphanNotes(dt);

      const cnfnData = await loadAdditionalCNFN(uid, cnOrfn);
      dt = sortBy([...dt, ...cnfnData], 'invoice');

      // Sales-invoice rows.
      const invArr = buildInvoiceRows(dt, gQ);

      // Purchase invoices from the linked contracts (poInvoices.invRef matching a sale#).
      const poRefs = dt
        .map((z: any) => z.poSupplier)
        .filter(
          (item: any, i: number, self: any[]) =>
            item &&
            i ===
              self.findIndex(
                (t: any) => t?.id === item.id && t?.order === item.order && t?.date === item.date
              )
        );
      const contracts = await Promise.all(
        poRefs.map((ref: any) => loadDocByIdDate<any>(uid, 'contracts', ref))
      );

      const saleNumbers = new Set(invArr.map((z: any) => z.saleInvoice));
      const consArr = buildPurchaseLines(contracts, saleNumbers, gQ);

      // Linked expenses.
      const expRefs = dt
        .filter((x: any) => Array.isArray(x.expenses) && x.expenses.length)
        .flatMap((x: any) => x.expenses);
      const expData = await loadExpensesForAccounting(uid, expRefs);
      const expArr = buildExpenseLines(expData, gQ);

      return groupAccounting(invArr, [...expArr, ...consArr]);
    },
  });

  return { data: query.data, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}
