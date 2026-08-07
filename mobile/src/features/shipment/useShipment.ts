import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadActivity } from '@/data/firestore';
import { updateContractField, logEvent } from '@/data/writes';
import { Contract, Invoice } from '@/data/types';
import { normalizeStatus } from '@shared/shipmentStatus';

// web page.js:476 — the ids are stored, the labels are not.
const SHP_TYPE_MAP: Record<string, string> = {
  '323': 'Container',
  '434': 'Truck',
  '565': 'Container+',
  '787': 'Flight',
};

// web page.js:63-71 — 'YYYY-MM-DD' → 'DD.MM.YY'. Mobile was printing the raw ISO.
export const fmtShipDate = (d?: string): string => {
  if (!d) return '—';
  const [y, m, day] = String(d).split('-');
  if (!y || !m || !day) return '—';
  return `${day}.${m}.${y.slice(2)}`;
};

export type Urgency = 'overdue' | 'soon' | null;

// web page.js:397-409, reproduced exactly — including that it compares a UTC-midnight
// `new Date('YYYY-MM-DD')` against a local Date.now(), which is why an ETA of today
// classifies as 'soon' and never 'overdue'.
export function getUrgency(status: string, etaStr: string): Urgency {
  if ((status || '') === 'Completed') return null;
  if (!etaStr) return null;
  const eta = new Date(etaStr);
  if (isNaN(eta.getTime())) return null;
  const days = Math.floor((Date.now() - eta.getTime()) / 86400000);
  if (days > 0) return 'overdue';
  if (days >= -7) return 'soon';
  return null;
}

export interface ShipmentRow {
  id: string;
  date: string;
  order: string;
  supplierName: string;
  clientName: string;
  /** main invoice number — web's getMainInvoice */
  invoiceNo: string;
  status: string; // normalized
  etd: string;
  eta: string;
  pol: string;
  pod: string;
  shpType: string;
  urgency: Urgency;
  /** shipmentUpdatedAt, topped up from the activity feed like web does */
  updatedAt: number;
  raw: Contract;
}

export interface ShipmentFilters {
  status?: string;
  supplier?: string;
  client?: string;
  shipType?: string;
  urgency?: '' | 'overdue' | 'soon';
  search?: string;
}

// Contracts as shipment rows. Everything web's table derives is derived here: the
// client, POL, POD and ship type all come off the contract's FIRST original sales
// invoice (with the contract's own field as the fallback), and the last-update
// timestamp is topped up from the activity feed the way web's loader does.
export function useShipment(filters: ShipmentFilters = {}) {
  const { uidCollection } = useAuth();
  const { settings, dateSelect, loaded } = useSettings();

  const query = useQuery({
    enabled: !!uidCollection && loaded,
    queryKey: ['shipment', uidCollection, dateSelect.start, dateSelect.end],
    queryFn: async () => {
      const uid = uidCollection as string;
      const contracts = await loadData<Contract>(uid, 'contracts', dateSelect);

      // Web's "Last Update" is max(stored timestamp, newest shipment.* activity row)
      // — page.js:294-310. Without this a contract touched through the activity feed
      // reads as never-updated, and the default sort puts it in the wrong place.
      const actMap: Record<string, number> = {};
      try {
        const rows = await loadActivity(uid, { entityType: 'contract', max: 500 });
        rows.forEach((r: any) => {
          if (
            String(r.type || '').startsWith('shipment.') &&
            r.entityId &&
            (!actMap[r.entityId] || r.createdAtMs > actMap[r.entityId])
          ) {
            actMap[r.entityId] = r.createdAtMs;
          }
        });
      } catch {
        /* the activity feed is optional — fall back to the stored timestamps */
      }

      // Web parity: invoices are loaded across the FULL year-span of every contract's
      // linked invoice dates (page.js:313-326), so ETD/ETA still resolve when the
      // sales invoice sits outside the selected period. Web accepts ANY non-empty
      // 4-char prefix; filtering to plausible years here would narrow the window and
      // silently drop a contract's dates that web resolves.
      const invYears = contracts
        .flatMap((c: any) => (c.invoices || []).map((i: any) => String(i.date || '').substring(0, 4)))
        .filter(Boolean);
      const invRange = invYears.length
        ? {
            start: `${invYears.reduce((a, b) => (a < b ? a : b))}-01-01`,
            end: `${invYears.reduce((a, b) => (a > b ? a : b))}-12-31`,
          }
        : dateSelect;
      const invoices = await loadData<Invoice>(uid, 'invoices', invRange);

      const invMap: Record<string, any> = {};
      invoices.filter(Boolean).forEach((inv: any) => {
        const cid = inv.poSupplier?.id;
        // Web parity: only the FIRST original sales invoice ('1111') feeds the row.
        if (cid && inv.invType === '1111' && !invMap[cid]) {
          invMap[cid] = {
            client: inv.client,
            etd: inv.shipData?.etd?.startDate || '',
            eta: inv.shipData?.eta?.startDate || '',
            pol: inv.pol || null,
            pod: inv.pod || null,
            shpType: inv.shpType || null,
          };
        }
      });
      return { contracts, invMap, actMap };
    },
  });

  const all: ShipmentRow[] = useMemo(() => {
    if (!query.data) return [];
    const { contracts, invMap, actMap } = query.data;
    const sups = settings?.Supplier?.Supplier || [];
    const clts = settings?.Client?.Client || [];
    const gQ = (list: any[], id: any, field: string) => list.find((x: any) => x.id === id)?.[field];

    return contracts.map((c: any) => {
      const inv = invMap[c.id];
      const status = normalizeStatus(c.shipmentStatus);
      const eta = c.shipmentEta || inv?.eta || '';
      const shpTypeId = inv?.shpType || c.shpType;
      const polId = inv?.pol || c.pol;
      const podId = inv?.pod || c.pod;
      return {
        id: c.id,
        date: c.dateRange?.startDate || c.date || '',
        order: c.order || '',
        // Web falls back to the legal `supplier` name when there is no short name;
        // mobile printed '—' and the row became unsearchable by supplier.
        supplierName: gQ(sups, c.supplier, 'nname') || gQ(sups, c.supplier, 'supplier') || '—',
        clientName: inv ? gQ(clts, inv.client, 'nname') || gQ(clts, inv.client, 'client') || '—' : '—',
        invoiceNo: String(
          ((c.invoices || []).find((i: any) => i.invType === '1111') || (c.invoices || [])[0])?.invoice ?? ''
        ),
        status,
        etd: c.shipmentEtd || inv?.etd || '',
        eta,
        pol: gQ(settings?.POL?.POL || [], polId, 'pol') || '—',
        pod: gQ(settings?.POD?.POD || [], podId, 'pod') || '—',
        shpType: shpTypeId ? SHP_TYPE_MAP[shpTypeId] || String(shpTypeId) : '—',
        urgency: getUrgency(c.shipmentStatus || '', eta),
        updatedAt: Math.max(c.shipmentUpdatedAt || 0, actMap[c.id] || 0),
        raw: c,
      };
    });
  }, [query.data, settings]);

  // Web's chip counts and the attention strip are computed over ALL loaded contracts,
  // deliberately ignoring the other active filters (page.js:589-594).
  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let overdue = 0;
    let soon = 0;
    let inTransit = 0;
    all.forEach((r) => {
      const s = (r.raw as any).shipmentStatus || '';
      byStatus[s] = (byStatus[s] || 0) + 1;
      if (r.urgency === 'overdue') overdue += 1;
      if (r.urgency === 'soon') soon += 1;
      if (s === 'In Transit') inTransit += 1;
    });
    return { all: all.length, byStatus, overdue, soon, inTransit };
  }, [all]);

  // Destructured into primitives so the memo doesn't re-run on every render just
  // because the caller passed a fresh object literal.
  const { status = '', supplier = '', client = '', shipType = '', urgency = '', search = '' } = filters;
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((r) => {
        const raw: any = r.raw;
        if (status && (raw.shipmentStatus || '') !== status) return false;
        if (supplier && raw.supplier !== supplier) return false;
        if (client && r.clientName !== client) return false;
        if (shipType && r.shpType !== shipType) return false;
        if (urgency && r.urgency !== urgency) return false;
        if (!q) return true;
        // Web searches four fields — mobile covered only two, so a client name or
        // an invoice number matched on web and found nothing here.
        return (
          r.order.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.clientName.toLowerCase().includes(q) ||
          r.invoiceNo.includes(q)
        );
      })
      // Web's default sort is last-touched, descending (sortCol 'updated'), NOT the
      // contract date mobile was using — the same data listed in a different order.
      .sort((a, b) => b.updatedAt - a.updatedAt || (b.date || '').localeCompare(a.date || ''));
  }, [all, status, supplier, client, shipType, urgency, search]);

  const options = useMemo(() => {
    const uniq = (vals: string[]) => [...new Set(vals.filter((v) => v && v !== '—'))].sort();
    return {
      suppliers: uniq(all.map((r) => r.supplierName)),
      clients: uniq(all.map((r) => r.clientName)),
      shipTypes: uniq(all.map((r) => r.shpType)),
    };
  }, [all]);

  return {
    rows,
    counts,
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSetShipmentStatus() {
  const { uidCollection, currentUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contract, status }: { contract: Contract; status: string }) => {
      if (!uidCollection) throw new Error('Not authenticated');
      // Web writes to contracts_{contract.date.slice(0,4)}. Preferring
      // dateRange.startDate targets a DIFFERENT year bucket for any legacy contract
      // where the two disagree, and the update then fails with no visible error.
      const date = contract.date || contract.dateRange?.startDate || '';
      // shipmentUpdatedAt is what web's "Last Update" column shows AND its default
      // sort key — omitting it left a mobile-changed status looking stale on web.
      const ts = Date.now();
      await updateContractField(uidCollection, contract.id, date, {
        shipmentStatus: status,
        shipmentUpdatedAt: ts,
      });
      // Notify the team when cargo moves through the pipeline (skip when cleared) —
      // identical payload to web so both apps produce the same feed entry.
      if (status) {
        await logEvent(uidCollection, {
          type: 'shipment.status',
          entityType: 'contract',
          entityId: contract.id || '',
          entityLabel: `PO ${contract.order ?? ''}`,
          action: 'status',
          message: `Cargo (PO ${contract.order ?? ''}) marked "${status}"`,
          notify: true,
          severity: status === 'Completed' ? 'success' : status === 'On Hold' ? 'warning' : 'info',
          actorUid: currentUser?.uid,
          actorName: currentUser?.name,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shipment'] });
      qc.invalidateQueries({ queryKey: ['contracts'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['activity'] });
    },
  });
}
