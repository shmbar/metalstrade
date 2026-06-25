import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData } from '@/data/firestore';
import { updateContractField } from '@/data/writes';
import { Contract, Invoice } from '@/data/types';
import { normalizeStatus } from '@shared/shipmentStatus';

export interface ShipmentRow {
  id: string;
  date: string;
  order: string;
  supplierName: string;
  status: string; // normalized
  etd: string;
  eta: string;
  raw: Contract;
}

// Contracts as shipment rows — status from the contract, ETD/ETA falling back to the
// linked invoice's shipData (mirrors the web Shipment page).
export function useShipment() {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['shipment', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const [contracts, invoices] = await Promise.all([
        loadData<Contract>(uid, 'contracts', dateSelect),
        loadData<Invoice>(uid, 'invoices', dateSelect),
      ]);
      const invMap: Record<string, { etd: string; eta: string }> = {};
      invoices.forEach((inv) => {
        const cid = inv.poSupplier?.id;
        if (cid && !invMap[cid]) {
          invMap[cid] = {
            etd: (inv.shipData?.etd as any)?.startDate || '',
            eta: (inv.shipData?.eta as any)?.startDate || '',
          };
        }
      });
      return { contracts, invMap };
    },
  });

  const rows: ShipmentRow[] = useMemo(() => {
    if (!query.data) return [];
    const { contracts, invMap } = query.data;
    return contracts
      .map((c) => ({
        id: c.id,
        date: c.dateRange?.startDate || c.date || '',
        order: c.order || '',
        supplierName: settings?.Supplier?.Supplier?.find((s: any) => s.id === c.supplier)?.nname || '—',
        status: normalizeStatus((c as any).shipmentStatus),
        etd: (c as any).shipmentEtd || invMap[c.id]?.etd || '',
        eta: (c as any).shipmentEta || invMap[c.id]?.eta || '',
        raw: c,
      }))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [query.data, settings]);

  return { rows, isLoading: query.isLoading, isError: query.isError, error: query.error, refetch: query.refetch };
}

export function useSetShipmentStatus() {
  const { uidCollection } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contract, status }: { contract: Contract; status: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      const date = contract.dateRange?.startDate || contract.date || '';
      await updateContractField(uidCollection, contract.id, date, { shipmentStatus: status });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
    },
  });
}
