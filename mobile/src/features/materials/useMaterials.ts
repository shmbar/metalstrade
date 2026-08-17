import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadMaterials } from '@/data/firestore';
import { saveMaterials, deleteMaterialTable, newId } from '@/data/writes';
import { DEFAULT_ELEMENTS, moveFeLast } from './constants';
import { useMetalPrices } from '@/features/prices/useMetalPrices';

// Material tables with an editable local working copy — port of the web page's
// data/setData model (app/(root)/materialtables/page.js). Web keeps every table in
// component state, mutates it in place as the user types, and persists the WHOLE
// set with one batched "Save". Mobile was read-only.

export function blankTable(nilmePrice?: number) {
  return {
    id: newId(),
    name: '',
    unit: 'kgs',
    elements: DEFAULT_ELEMENTS.map((e) => ({ ...e })),
    prices: nilmePrice ? { ni: nilmePrice } : {},
    containerNo: '',
    showContainer: false,
    containerLabel: 'Container',
    showCosts: false,
    costLabel: 'Price',
    niPercent: 100,
    priceKeys: null,
    // Sales bar — the cost bar's twin (web page.js:154). Seeded with the live LME
    // nickel price the same way, so a new table opens ready to price a sale.
    salesPrices: nilmePrice ? { ni: nilmePrice } : {},
    showSales: false,
    salesLabel: 'Sales Price',
    salesNiPercent: 100,
    salesPriceKeys: null,
    data: [] as any[],
  };
}

/**
 * Refresh a stale LME nickel price without ever overwriting a typed one.
 *
 * Web page.js:106-129, and the rule is subtler than it looks. A price counts as
 * "ours" only when it is empty or still equal to the LAST live value we wrote; once
 * a user types their own number it stops moving, because a negotiated price has to
 * outlive the next tick — silently resetting it 60 seconds later would quietly wrong
 * the margin. Both bars are seeded, independently.
 *
 * Returns the SAME array reference when nothing changed: the poll fires on a timer
 * with a fresh price object even when the rounded value has not moved, and returning
 * a new array each time would re-render every table and re-run the totals for
 * nothing.
 */
export function seedLmeNickel<T extends any[]>(tables: T, liveNi?: string | null, prevLive?: string | null): T {
  if (liveNi == null || liveNi === '') return tables;
  const ours = (v: any) => v == null || v === '' || v === prevLive;
  const stale = (v: any) => ours(v) && v !== liveNi;
  let touched = false;
  const next = (tables || []).map((t: any) => {
    const costStale = stale(t?.prices?.ni);
    const salesStale = stale(t?.salesPrices?.ni);
    if (!costStale && !salesStale) return t;
    touched = true;
    return {
      ...t,
      ...(costStale && { prices: { ...t.prices, ni: liveNi } }),
      ...(salesStale && { salesPrices: { ...t.salesPrices, ni: liveNi } }),
    };
  });
  return (touched ? next : tables) as T;
}

export function blankRow(elements: any[]) {
  const row: any = { id: newId(), material: '', kgs: '', container: '', _feManual: false };
  (elements || DEFAULT_ELEMENTS).forEach((el: any) => (row[el.key] = ''));
  return row;
}

// Web's element-cell guard: at most 2 decimals; kgs is stripped to digits/-/.
// Transcribed from app/(root)/materialtables/page.js:19-24 — the leading-zero strip
// means web counts "12.500" as ONE decimal, so it accepts keystrokes the naive
// `length - indexOf('.') - 1` mobile used to run would have rejected.
export const countDecimalDigits = (v: string) => {
  const match = String(v ?? '').match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) return 0;
  const combined = (match[1] || '') + (match[2] || '');
  return combined.replace(/^0+/, '').length;
};
export const cleanElement = (v: string) => (countDecimalDigits(v) > 2 ? null : v.replace(/[^0-9.\-]/g, ''));
export const cleanKgs = (v: string) => String(v ?? '').replace(/[^0-9.\-]/g, '');

export function useMaterials() {
  const { uidCollection } = useAuth();
  const { settings } = useSettings();
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!uidCollection,
    queryKey: ['materials', uidCollection],
    queryFn: () => loadMaterials(uidCollection as string),
  });

  // Local working copy — seeded from the server, then edited freely until Save.
  const [tables, setTables] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (query.data) {
      // Re-order Fe to last on every loaded table, exactly as web does at
      // page.js:175 — a table saved before Fe moved still carries the old order in
      // its own `elements` array, so the constant alone would not fix it.
      setTables(query.data.map((t: any) => ({ ...t, elements: moveFeLast(t.elements) })));
      setDirty(false);
    }
  }, [query.data]);

  const nilmePrice = Number((settings as any)?.formulasCalc?.general?.nilme) || undefined;

  // Live LME nickel, rounded the way web rounds it (page.js:108). `lastLive` holds
  // the previous value we wrote so seedLmeNickel can tell "our" price from a typed
  // one — without it, every poll would overwrite a negotiated price.
  const { prices: metalPrices } = useMetalPrices();
  const lastLive = useRef<string | null>(null);
  useEffect(() => {
    const ni = metalPrices.find((m) => m.key === 'LME-NI' || m.symbol === 'Ni');
    if (ni?.price == null) return;
    const liveNi = String(Math.round(ni.price));
    const prev = lastLive.current;
    lastLive.current = liveNi;
    setTables((prevTables) => seedLmeNickel(prevTables, liveNi, prev));
  }, [metalPrices]);

  const mutate = (fn: (prev: any[]) => any[]) => {
    setTables(fn);
    setDirty(true);
  };

  const addTable = () => mutate((prev) => [...prev, blankTable(nilmePrice)]);
  const addRow = (tableId: string) =>
    mutate((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, data: [...(t.data || []), blankRow(t.elements)] } : t))
    );
  const removeRow = (tableId: string, rowId: string) =>
    mutate((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, data: (t.data || []).filter((r: any) => r.id !== rowId) } : t))
    );
  const setCell = (tableId: string, rowId: string, key: string, value: any) =>
    mutate((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? { ...t, data: (t.data || []).map((r: any) => (r.id === rowId ? { ...r, [key]: value } : r)) }
          : t
      )
    );
  const setTableField = (tableId: string, key: string, value: any) =>
    mutate((prev) => prev.map((t) => (t.id === tableId ? { ...t, [key]: value } : t)));

  const save = useMutation({
    mutationFn: async () => {
      if (!uidCollection) throw new Error('Not authenticated');
      await saveMaterials(uidCollection, tables);
    },
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const removeTable = useMutation({
    mutationFn: async (id: string) => {
      if (!uidCollection) throw new Error('Not authenticated');
      await deleteMaterialTable(uidCollection, id);
    },
    onSuccess: (_d, id) => {
      setTables((prev) => prev.filter((t) => t.id !== id));
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  return {
    tables,
    dirty,
    addTable,
    addRow,
    removeRow,
    setCell,
    setTableField,
    save,
    removeTable,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
