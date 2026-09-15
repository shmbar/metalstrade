import { useMutation, useQueryClient } from '@tanstack/react-query';
import { STOCK_LOTS_KEY } from '@/features/stocks/useAllStockLots';
import { useAuth } from '@/store/auth';
import { createInvoiceForContract } from '@/data/writes';
import { Contract, Invoice } from '@/data/types';
import { duplicateLineTrap } from '@shared/stockGuards';
import { loadStockOnHandByLine } from '@/features/stocks/onHand';

// Blank sales invoice prefilled from a contract — mirrors newInvoice + the web's
// createInvoiceFromContract (shipment terms inherited, currency from the contract).
export function blankInvoiceForContract(contract: Contract): Invoice {
  return {
    id: '',
    invoice: undefined,
    date: '',
    dateRange: { startDate: null, endDate: null },
    delDate: { startDate: null, endDate: null },
    client: '',
    cur: contract.cur || '',
    shpType: contract.shpType || '',
    pol: contract.pol || '',
    pod: contract.pod || '',
    // web useInvoiceState blank invoice header keys
    origin: '',
    delTerm: '',
    packing: '',
    bankNname: '',
    hs1: '',
    hs2: '',
    clientContractNo: '',
    salesContractId: '',
    ttlGross: '',
    ttlPackages: '',
    invType: '1111',
    totalAmount: '',
    final: false,
    canceled: false,
    productsDataInvoice: [],
    payments: [],
    poSupplier: { id: contract.id, order: contract.order || '', date: contract.dateRange?.startDate || contract.date || '' },
    shipData: { rcvd: '', outrnamnt: '', fnlzing: '2587', status: '', etd: '', eta: '' },
    comments: '',
  } as Invoice;
}

export function useCreateInvoice() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contract, invoice, clientName }: { contract: Contract; invoice: Invoice; clientName: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      // Web's duplicate-line trap (stockGuards.js, 2c2de202): refuse a sale booked on a
      // contract line with nothing in stock while a sibling line of the same contract
      // holds enough — the same material entered twice, which left GIS invoice 46's
      // 5.202 MT stranded under Stocks - UnPaid while a phantom -5.202 hung elsewhere.
      const trap = await duplicateLineTrap(invoice, (contract.productsData || []) as any, (ids, wh) =>
        loadStockOnHandByLine(uidCollection, ids, wh)
      );
      if (trap) throw new Error(trap);
      return createInvoiceForContract(uidCollection, contract, invoice, clientName);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
      qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
