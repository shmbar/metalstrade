import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { updateInvoiceDoc, saveStockIn, delStock, saveSplit } from '@/data/writes';
import { STOCK_LOTS_KEY } from '@/features/stocks/useAllStockLots';

// Persist an IMS/GIS split on an invoice — the third page web renders SplitControl on.
export function useSaveInvoiceSplit() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, year, split }: { id: string; year: string; split: Record<string, unknown> | null }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveSplit(uidCollection, { kind: 'invoice', id, year }, split);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Patch an existing invoice's editable fields (header + materials). Keeps the
// invoice in its current year bucket (date year unchanged) to avoid doc moves.
//
// Web parity (useInvoiceState.js:350-361): saving an invoice ALSO rewrites the
// stock 'out' movement for every non-service material line, and deletes the stock
// docs of lines that were removed. Mobile used to patch only the invoice doc, so
// editing a quantity on the phone silently desynced the Stocks page — the ledger
// kept the pre-edit movement forever.
export function useEditInvoice() {
  const { uidCollection } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      year,
      patch,
      raw,
      removedLineIds,
    }: {
      id: string;
      year: string;
      patch: Record<string, unknown>;
      /** the invoice doc as loaded — supplies invoice #, type, date, client, cur */
      raw?: any;
      /** ids of material lines removed during this edit */
      removedLineIds?: string[];
    }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await updateInvoiceDoc(uidCollection, id, year, patch);

      if (!raw) return;

      const lines = (patch.productsDataInvoice as any[]) || raw.productsDataInvoice || [];
      // Service lines (qnty === 's') carry no stock movement — web filters them out.
      const movements = lines
        .filter((z: any) => z.qnty !== 's')
        .map((x: any) => ({
          ...x,
          invoice: Number(raw.invoice) || raw.invoice,
          invType: raw.invType,
          date: raw.final ? raw.date : raw.dateRange?.startDate || raw.date,
          type: 'out',
          productsData: raw.productsData,
          client: raw.final
            ? raw.client?.client
            : settings?.Client?.Client?.find((z: any) => z.id === (patch.client ?? raw.client))?.client,
          cur: raw.cur,
        }));

      if (movements.length) await saveStockIn(uidCollection, movements);
      if (removedLineIds?.length) await delStock(uidCollection, removedLineIds);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['contract-invoices'] });
      // The stock ledger moved with the invoice — refresh every stock screen.
      qc.invalidateQueries({ queryKey: [STOCK_LOTS_KEY] });
    },
  });
}
