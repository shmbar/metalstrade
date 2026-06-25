import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { createInvoiceForContract } from '@/data/writes';
import { Contract, Invoice } from '@/data/types';

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
      return createInvoiceForContract(uidCollection, contract, invoice, clientName);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
      qc.invalidateQueries({ queryKey: ['stocks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
