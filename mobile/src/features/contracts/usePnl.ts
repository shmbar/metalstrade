import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { updateContractField, updateInvoiceDoc, logEvent } from '@/data/writes';
import { contractsValue, total as invTotal, totalArrsExp, ViewCur } from '@/features/review/reviewFinance';
import { ownProducts } from './useContracts';
import { num } from '@shared/finance';

// Contract P&L / Shipments Tracking — the tab mobile had no counterpart for.
//
// Purchase Value − Expenses against the sale value gives Profit; Freight/MT
// allocates the contract's FREIGHT-type expenses over its contracted tonnage.
// Freight detection and currency conversion match the rest of the web tab exactly,
// so the figure lines up with the Expenses total shown beside it.

export const CONTRACT_STATUSES = [
  { id: 'A1234', label: 'In Progress' },
  { id: 'B5674', label: 'Shipped' },
  { id: 'C6567', label: 'Finished' },
  { id: 'D8456', label: 'Closed' },
  { id: 'E34656', label: 'Unsold' },
] as const;

export interface ShipmentRow {
  id: string;
  invoice: any;
  year: string;
  rcvd: any;
  outrnamnt: any;
  fnlzing: any;
  status: any;
  etd: any;
  eta: any;
}

export function usePnl(contract: any, viewCur: 'us' | 'eu') {
  const { settings } = useSettings();

  return useMemo(() => {
    if (!contract) return null;
    const val: ViewCur = { cur: viewCur };
    const mult = parseFloat(contract.euroToUSD) || 1;

    const purchaseValue = contractsValue(contract, 'pmnt', val, mult);
    const expenses = totalArrsExp(contract.expenses || [], val, mult);

    // Sale value uses the SAME supersede rule as everywhere else: within an invoice
    // number, notes replace the original.
    const groups: any[][] = Array.isArray(contract.invoicesData) ? contract.invoicesData : [];
    const saleValue = invTotal(groups, 'totalAmount', val, mult, settings).accumuLastInv;

    // Freight allocation — expense types whose label contains "freight".
    const freightIds = new Set(
      (settings?.Expenses?.Expenses || [])
        .filter((e: any) => String(e.expType || '').toLowerCase().includes('freight'))
        .map((e: any) => e.id)
    );
    // import-flagged products are breakdown helpers — excluded from the tonnage.
    const contractMT = ownProducts(contract).reduce((s, p: any) => s + (parseFloat(p.qnty) || 0), 0);
    const freightTotal = (contract.expenses || []).reduce((s: number, exp: any) => {
      if (!exp || !freightIds.has(exp.expType)) return s;
      const amt = parseFloat(exp.amount);
      if (isNaN(amt)) return s;
      const m = exp.cur === val.cur ? 1 : exp.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult;
      return s + amt * m;
    }, 0);
    const freightPerMT = contractMT > 0 ? freightTotal / contractMT : 0;

    // One row per linked sales invoice (the shipment grid).
    const shipments: ShipmentRow[] = groups.flatMap((g) =>
      (g || []).map((inv: any) => ({
        id: inv.id,
        invoice: inv.invoice,
        year: String(inv.__yr || (inv.dateRange?.startDate || inv.date || '').substring(0, 4)),
        rcvd: inv.shipData?.rcvd ?? '',
        outrnamnt: inv.shipData?.outrnamnt ?? '',
        fnlzing: inv.shipData?.fnlzing ?? '',
        status: inv.shipData?.status ?? '',
        etd: inv.shipData?.etd ?? null,
        eta: inv.shipData?.eta ?? null,
      }))
    );

    return {
      purchaseValue,
      expenses,
      saleValue,
      profit: saleValue - purchaseValue - expenses,
      contractMT,
      freightTotal,
      freightPerMT,
      shipments,
    };
  }, [contract, viewCur, settings]);
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
