import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadData, loadActivity } from '@/data/firestore';
import { updateContractField, logEvent } from '@/data/writes';
import { Contract, Invoice } from '@/data/types';
import { normalizeStatus } from '@shared/shipmentStatus';
import { matchesAllWords, searchWords } from '@shared/search';

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
//
// The status passed in MUST already be normalized: web normalizes the whole contract
// array at load (page.js:285), so by the time this runs a legacy 'Delivered' is
// 'Completed' and is therefore exempt.
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
  /** every shipment booked against the contract, oldest first (web's getShipments) */
  shipments: ShipmentLine[];
  /** contracted quantity in MT — web's getPoQty */
  poQty: number;
  /** shipped so far, summed over the contract's shipments — web's getShippedQty */
  shippedQty: number;
  /** PO − shipped, or null when the contract carries no quantity at all */
  remainingQty: number | null;
  /** NORMALIZED — web normalizes at load, so this is the vocabulary everything uses */
  status: string;
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

/** What one contract's FIRST original ('1111') sales invoice contributes to its row. */
/** One shipment under a contract — web page.js:598-628. */
export interface ShipmentLine {
  id: string;
  invoice: string;
  invType: string;
  date: string;
  /** MT shipped on this invoice; a cancelled invoice shipped nothing */
  qnty: number;
  canceled: boolean;
}

/**
 * Quantity a unit label represents in MT — web page.js:50-62. A contract priced in
 * KGS or LB states its quantity in that unit, and the PO figure is read in MT.
 */
const W_PER_MT: Record<string, number> = { mt: 1, kg: 1000, lb: 2204.6226218 };
const unitFromLabel = (label: string): string => {
  const l = String(label || '').toLowerCase();
  if (l.includes('kg')) return 'kg';
  if (l.includes('lb') || l.includes('pound')) return 'lb';
  return 'mt';
};

/**
 * Every shipment booked against each contract, keyed by contract id — web's shipMap
 * (page.js:580-635). One document per invoice NUMBER: a credit/final note supersedes
 * the original (invType compares as a string, exactly as web does), and a cancelled
 * invoice contributes 0 MT the way the Inventory tab treats it.
 */
export function buildShipmentQtyMap(invoices: any[]): Record<string, { shipped: number; shipments: ShipmentLine[] }> {
  const byContract: Record<string, Map<string, any>> = {};
  (invoices || []).filter(Boolean).forEach((d: any) => {
    const cid = d.poSupplier?.id;
    if (!cid) return;
    if (!byContract[cid]) byContract[cid] = new Map();
    const key = String(d.invoice ?? d.id);
    const prev = byContract[cid].get(key);
    // web page.js:63 'supersedes' — a STRING comparison on invType, kept verbatim.
    if (!prev || String(d.invType || '') > String(prev.invType || '')) byContract[cid].set(key, d);
  });

  const out: Record<string, { shipped: number; shipments: ShipmentLine[] }> = {};
  Object.entries(byContract).forEach(([cid, groups]) => {
    const shipments: ShipmentLine[] = [...groups.values()]
      .map((d: any) => ({
        id: d.id,
        invoice: String(d.invoice ?? ''),
        invType: d.invType || '',
        date: String(d.date || '').substring(0, 10),
        qnty: d.canceled
          ? 0
          : (d.productsDataInvoice || []).reduce((sum: number, l: any) => sum + (parseFloat(l?.qnty) || 0), 0),
        canceled: !!d.canceled,
      }))
      .sort((a, b) => {
        const da = new Date(a.date).getTime() || 0;
        const db = new Date(b.date).getTime() || 0;
        if (da !== db) return da - db;
        return String(a.invoice).localeCompare(String(b.invoice), undefined, { numeric: true });
      });
    out[cid] = { shipped: shipments.reduce((sum, x) => sum + x.qnty, 0), shipments };
  });
  return out;
}

/**
 * Contracted quantity in MT — web's getPoQty (page.js:842-852). 'import: true'
 * products are the hidden entries the supplier-invoice reader creates for unmatched
 * lines; the PO table, the PO PDF and its totals all exclude them, so this does too.
 */
export function poQtyOf(contract: any, settings: any): number {
  const label =
    settings?.Quantity?.Quantity?.find((q: any) => q.id === contract?.qTypeTable)?.qTypeTable || '';
  const factor = W_PER_MT[unitFromLabel(label)] || 1;
  const raw = (contract?.productsData || [])
    .filter((p: any) => p && !p.import)
    .reduce((sum: number, p: any) => sum + (parseFloat(p.qnty) || 0), 0);
  return raw / factor;
}

export interface ShipmentInvoiceInfo {
  client: any;
  etd: string;
  eta: string;
  pol: any;
  pod: any;
  shpType: any;
}

// ── pure core (extracted so the parity suite can exercise it without a hook) ──
// Nothing below touches Firestore, React or a device API; the hook is a thin
// wrapper that feeds these the query result.

/**
 * Contract id → its FIRST original sales invoice's shipment fields.
 * Web parity (page.js:329-342): only `invType === '1111'` qualifies and only the
 * first one encountered wins — later invoices for the same contract are ignored.
 */
export function buildShipmentInvoiceMap(invoices: any[]): Record<string, ShipmentInvoiceInfo> {
  const map: Record<string, ShipmentInvoiceInfo> = {};
  (invoices || []).filter(Boolean).forEach((inv: any) => {
    const cid = inv.poSupplier?.id;
    if (cid && inv.invType === '1111' && !map[cid]) {
      map[cid] = {
        client: inv.client,
        etd: inv.shipData?.etd?.startDate || '',
        eta: inv.shipData?.eta?.startDate || '',
        pol: inv.pol || null,
        pod: inv.pod || null,
        shpType: inv.shpType || null,
      };
    }
  });
  return map;
}

/**
 * The invoice-loading window: Jan 1 of the earliest linked invoice year through
 * Dec 31 of the latest, so delivered contracts whose sales invoice sits outside
 * the selected period still resolve ETD/ETA (web page.js:313-327).
 *
 * Web takes ANY non-empty 4-char `date` prefix — it does NOT sanity-check the year.
 * Narrowing that here (e.g. dropping years <= 2000) would shrink the window below
 * web's and silently blank dates web resolves, so the prefix is used verbatim.
 */
export function shipmentInvoiceRange<T extends { start: string; end: string }>(
  contracts: any[],
  fallback: T
): { start: string; end: string } {
  const invYears = (contracts || [])
    .flatMap((c: any) => (c.invoices || []).map((i: any) => String(i.date || '').substring(0, 4)))
    .filter(Boolean);
  if (!invYears.length) return fallback;
  return {
    start: `${invYears.reduce((a, b) => (a < b ? a : b))}-01-01`,
    end: `${invYears.reduce((a, b) => (a > b ? a : b))}-12-31`,
  };
}

/**
 * Contracts → shipment rows. Everything web's table derives is derived here: the
 * client, POL, POD and ship type all come off the contract's FIRST original sales
 * invoice (with the contract's own field as the fallback), and the last-update
 * timestamp is topped up from the activity feed the way web's loader does.
 *
 * The status is NORMALIZED once, here, and every downstream consumer reads that —
 * web does the same at load (page.js:285). Reading the raw value downstream flagged
 * a legacy 'Delivered' contract as overdue, counted it under a chip that does not
 * exist, and hid it from the Completed chip its own pill already showed.
 */
export function buildShipmentRows(
  contracts: any[],
  invMap: Record<string, ShipmentInvoiceInfo>,
  actMap: Record<string, number>,
  settings: any,
  qtyMap: Record<string, { shipped: number; shipments: ShipmentLine[] }> = {}
): ShipmentRow[] {
  const sups = settings?.Supplier?.Supplier || [];
  const clts = settings?.Client?.Client || [];
  const gQ = (list: any[], id: any, field: string) => list.find((x: any) => x.id === id)?.[field];

  return (contracts || []).map((c: any) => {
    const inv = invMap[c.id];
    const status = normalizeStatus(c.shipmentStatus);
    const eta = c.shipmentEta || inv?.eta || '';
    const shpTypeId = inv?.shpType || c.shpType;
    const polId = inv?.pol || c.pol;
    const podId = inv?.pod || c.pod;
    const shipments = qtyMap[c.id]?.shipments || [];
    const poQty = poQtyOf(c, settings);
    const shippedQty = qtyMap[c.id]?.shipped || 0;
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
      shipments,
      poQty,
      shippedQty,
      /* What is still owed under the PO. Null when the contract carries no quantity
         at all (nothing to measure against), so the cell reads '—' not a fake 0. */
      remainingQty: poQty ? poQty - shippedQty : null,
      status,
      etd: c.shipmentEtd || inv?.etd || '',
      eta,
      pol: gQ(settings?.POL?.POL || [], polId, 'pol') || '—',
      pod: gQ(settings?.POD?.POD || [], podId, 'pod') || '—',
      shpType: shpTypeId ? SHP_TYPE_MAP[shpTypeId] || String(shpTypeId) : '—',
      // NORMALIZED status, not the raw one — see the doc comment above.
      urgency: getUrgency(status, eta),
      updatedAt: Math.max(c.shipmentUpdatedAt || 0, actMap[c.id] || 0),
      raw: c,
    };
  });
}

/**
 * Web's chip counts and the attention strip are computed over ALL loaded contracts,
 * deliberately ignoring the other active filters (page.js:589-595), and keyed on the
 * NORMALIZED vocabulary — so there is no 'Delivered' or 'At Port' bucket.
 */
export function computeShipmentCounts(all: ShipmentRow[]) {
  const byStatus: Record<string, number> = {};
  let overdue = 0;
  let soon = 0;
  let inTransit = 0;
  (all || []).forEach((r) => {
    const s = r.status || '';
    byStatus[s] = (byStatus[s] || 0) + 1;
    if (r.urgency === 'overdue') overdue += 1;
    if (r.urgency === 'soon') soon += 1;
    if (s === 'In Transit') inTransit += 1;
  });
  return { all: (all || []).length, byStatus, overdue, soon, inTransit };
}

/**
 * Filter + sort — web's `filtered` (page.js:598-617) then its default sort
 * (sortCol 'updated', sortDir 'desc' — page.js:253-254).
 *
 * Web compares raw ids for supplier/client/ship-type because its dropdowns carry
 * ids; mobile's chips carry the resolved NAME, so it compares names. Same contracts
 * either way — and the options come from shipmentFilterOptions, which emits exactly
 * the values this predicate accepts. (They once disagreed: the options were names
 * while the predicate compared ids, so every supplier chip produced an empty list.)
 *
 * The contract-date tiebreak makes web's implicit order explicit: web's sort is
 * stable over a list already ordered by date, so equal timestamps keep date order.
 */
export function filterShipmentRows(all: ShipmentRow[], filters: ShipmentFilters = {}): ShipmentRow[] {
  const { status = '', supplier = '', client = '', shipType = '', urgency = '', search = '' } = filters;
  const words = searchWords(search);
  return (all || [])
    .filter((r) => {
      if (status && r.status !== status) return false;
      if (supplier && r.supplierName !== supplier) return false;
      if (client && r.clientName !== client) return false;
      if (shipType && r.shpType !== shipType) return false;
      if (urgency && r.urgency !== urgency) return false;
      // Web's predicate, field for field (page.js:1054-1063): the PO, both party
      // names, the main invoice, and EVERY shipment's invoice — searching for the
      // second shipment's number used to return nothing.
      return matchesAllWords(
        [r.order, r.supplierName, r.clientName, r.invoiceNo, r.shipments.map((s) => s.invoice)],
        words
      );
    })
    .sort(
      (a, b) =>
        b.updatedAt - a.updatedAt ||
        // ASCENDING, and on the contract's own `date` — web sorts baseContracts
        // date-ascending (page.js:286) and its sort is stable, so untouched rows
        // (updatedAt 0) keep oldest-first. The display `date` above prefers
        // dateRange.startDate, which web never orders on, so read raw.date here.
        String((a.raw as any)?.date || '').localeCompare(String((b.raw as any)?.date || ''))
    );
}

/** The chip values — exactly the strings filterShipmentRows accepts. */
export function shipmentFilterOptions(all: ShipmentRow[]) {
  const uniq = (vals: string[]) => [...new Set(vals.filter((v) => v && v !== '—'))].sort();
  return {
    suppliers: uniq((all || []).map((r) => r.supplierName)),
    clients: uniq((all || []).map((r) => r.clientName)),
    shipTypes: uniq((all || []).map((r) => r.shpType)),
  };
}

/**
 * Which year bucket a shipment patch is written to. Web uses contract.date
 * (updateContractField -> contracts_{date.slice(0,4)}). Preferring
 * dateRange.startDate targets a DIFFERENT collection for any legacy contract where
 * the two disagree, and the update then fails with no visible error — so dateRange
 * is only a last resort.
 */
export function shipmentWriteDate(contract: any): string {
  return contract?.date || contract?.dateRange?.startDate || '';
}

// ── hook ─────────────────────────────────────────────────────────────────────

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

      const invRange = shipmentInvoiceRange(contracts, dateSelect);
      const invoices = await loadData<Invoice>(uid, 'invoices', invRange);
      return {
        contracts,
        invMap: buildShipmentInvoiceMap(invoices),
        qtyMap: buildShipmentQtyMap(invoices),
        actMap,
      };
    },
  });

  const all: ShipmentRow[] = useMemo(() => {
    if (!query.data) return [];
    const { contracts, invMap, qtyMap, actMap } = query.data;
    return buildShipmentRows(contracts, invMap, actMap, settings, qtyMap);
  }, [query.data, settings]);

  const counts = useMemo(() => computeShipmentCounts(all), [all]);

  // Destructured into primitives so the memo doesn't re-run on every render just
  // because the caller passed a fresh object literal.
  const { status = '', supplier = '', client = '', shipType = '', urgency = '', search = '' } = filters;
  const rows = useMemo(
    () => filterShipmentRows(all, { status, supplier, client, shipType, urgency, search }),
    [all, status, supplier, client, shipType, urgency, search]
  );

  const options = useMemo(() => shipmentFilterOptions(all), [all]);

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
      const date = shipmentWriteDate(contract);
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
