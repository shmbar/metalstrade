import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { updateContractField, updateInvoiceDoc, logEvent } from '@/data/writes';
import { contractPnl, ShipmentRow } from './pnlModel';
import { num } from '@shared/finance';

// Contract P&L / Shipments Tracking — the tab mobile had no counterpart for.
// All of the arithmetic lives in ./pnlModel.ts so it can be tested without a React
// tree; this hook only wires settings in and memoises.

export const CONTRACT_STATUSES = [
  { id: 'A1234', label: 'In Progress' },
  { id: 'B5674', label: 'Shipped' },
  { id: 'C6567', label: 'Finished' },
  { id: 'D8456', label: 'Closed' },
  { id: 'E34656', label: 'Unsold' },
] as const;

export type { ShipmentRow } from './pnlModel';

export function usePnl(contract: any, viewCur: 'us' | 'eu') {
  const { settings } = useSettings();
  return useMemo(() => contractPnl(contract, viewCur, settings), [contract, viewCur, settings]);
}

// Save the contract status (web has this editor on the same tab).
export function useSetContractStatus() {
  const { uidCollection, currentUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contract, conStatus }: { contract: any; conStatus: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      const date = contract.dateRange?.startDate || contract.date || '';
      await updateContractField(uidCollection, contract.id, date, { conStatus });
      await logEvent(uidCollection, {
        type: 'contract.status',
        entityType: 'contract',
        entityId: contract.id,
        entityLabel: `PO ${contract.order ?? ''}`,
        action: 'status',
        message: `Contract (PO ${contract.order ?? ''}) marked "${
          CONTRACT_STATUSES.find((s) => s.id === conStatus)?.label ?? conStatus
        }"`,
        notify: true,
        actorUid: currentUser?.uid,
        actorName: currentUser?.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['contracts-review'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Save one invoice's shipment details — the per-invoice row of the web grid.
export function useSaveShipmentRow() {
  const { uidCollection, currentUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ row, contract }: { row: ShipmentRow; contract: any }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await updateInvoiceDoc(uidCollection, row.id, row.year, {
        shipData: {
          rcvd: row.rcvd,
          outrnamnt: row.outrnamnt,
          fnlzing: row.fnlzing,
          status: row.status,
          etd: row.etd,
          eta: row.eta,
        },
      });
      await logEvent(uidCollection, {
        type: 'shipment.details',
        entityType: 'invoice',
        entityId: row.id,
        entityLabel: `Invoice #${row.invoice ?? ''}`,
        action: 'updated',
        message: `Shipment details updated for Invoice #${row.invoice ?? ''} (ETD ${
          (row.etd as any)?.startDate || row.etd || '—'
        }, ETA ${(row.eta as any)?.startDate || row.eta || '—'})`,
        notify: true,
        actorUid: currentUser?.uid,
        actorName: currentUser?.name,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['shipment'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export const num_ = num;
