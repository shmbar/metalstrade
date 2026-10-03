import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { loadMaterials, loadDataSettings } from '@/data/firestore';
import { saveMaterials, deleteMaterialTable, newId } from '@/data/writes';
import { DEFAULT_ELEMENTS, moveFeLast } from './constants';
import { useMetalPrices } from '@/features/prices/useMetalPrices';

// Material tables with an editable local working copy — port of the web page's
// data/setData model (app/(root)/materialtables/page.js). Web keeps every table in
// component state, mutates it in place as the user types, and persists the WHOLE
// set with one batched "Save". Mobile was read-only.

/**
 * A blank table — web page.js makeBlankTable.
 *
 * The Ni seed is stored as a STRING, as web stores it: the LME poll recognises its own
 * value by `===`, so a numeric 16670 next to a live '16670' read as a typed price and
 * was frozen for good.
 */
export function blankTable(nilme?: string | number | null) {
  const ni = nilme ? String(nilme) : '';
  return {
    id: newId(),
    name: '',
    unit: 'kgs',
    elements: DEFAULT_ELEMENTS.map((e) => ({ ...e })),
    prices: ni ? { ni } : {},
    containerNo: '',
    showContainer: false,
    containerLabel: 'Container',
    showCosts: false,
    costLabel: 'Price',
    niPercent: 100,
    priceKeys: null,
    // Sales bar — the cost bar's twin (web page.js:154). Seeded with the live LME
    // nickel price the same way, so a new table opens ready to price a sale.
    salesPrices: ni ? { ni } : {},
    showSales: false,
    salesLabel: 'Sales Price',
    salesNiPercent: 100,
    salesPriceKeys: null,
    data: [] as any[],
  };
}

/**
 * A saved table as the page works on it — web page.js loadData's `normalized`.
 *
 * Defaults for every field a table saved before it existed lacks, Fe moved last (a
 * table saved before Fe moved carries the old order in its own `elements`), and both
 * price bars seeded with the Formulas page's Ni price where the table has none of its
 * own. A saved price always wins over the seed.
 */
export function normalizeTable(t: any, nilme?: string | null) {
  const ni = nilme ? String(nilme) : '';
  return {
    ...t,
    name: t.name || '',
    unit: t.unit || 'kgs',
    elements: moveFeLast(t.elements),
    prices: { ...(ni ? { ni } : {}), ...(t.prices || {}) },
    containerNo: t.containerNo || '',
    showContainer: t.showContainer || false,
    containerLabel: t.containerLabel || 'Container',
    showCosts: t.showCosts || false,
    costLabel: t.costLabel || 'Price',
    niPercent: t.niPercent != null ? t.niPercent : 100,
    priceKeys: t.priceKeys || null,
    salesPrices: { ...(ni ? { ni } : {}), ...(t.salesPrices || {}) },
    showSales: t.showSales || false,
    salesLabel: t.salesLabel || 'Sales Price',
    salesNiPercent: t.salesNiPercent != null ? t.salesNiPercent : 100,
    salesPriceKeys: t.salesPriceKeys || null,
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

/**
 * The working copy built from what the server holds — web's load followed by its first
 * LME poll: every table normalised, Ni seeded from the Formulas price (web sets
 * lastLmeRef to that price on load, so the seed counts as "ours"), then moved to the
 * live print wherever it still is ours.
 */
export function workingCopy(rows: any[], nilme: string, liveNi: string | null): any[] {
  const base = (rows || []).map((t) => normalizeTable(t, nilme));
  return liveNi ? seedLmeNickel(base, liveNi, nilme || null) : base;
}

export function blankRow(elements: any[]) {
  const row: any = { id: newId(), material: '', kgs: '', container: '', _feManual: false };
  (elements || DEFAULT_ELEMENTS).forEach((el: any) => (row[el.key] = ''));
  return row;
}

/**
 * Fe as the balance — web page.js autoFe: 100 − the sum of every other element,
 * floored at 0, two decimals with trailing zeros dropped. '' while the row carries no
 * analysis yet, so a new row does not open reading "Fe 100".
 */
export function autoFe(row: any, elements: any[]): string {
  const nonFe = (elements || []).filter((el: any) => el.key !== 'fe');
  const hasAny = nonFe.some((el: any) => parseFloat(row?.[el.key]) > 0);
  if (!hasAny) return '';
  const sum = nonFe.reduce((s: number, el: any) => s + (parseFloat(row?.[el.key]) || 0), 0);
  return parseFloat(Math.max(0, 100 - sum).toFixed(2)).toString();
}

/**
 * One cell edit on one row — the per-row body of web page.js editCell.
 *
 * The phone used to write the typed value and nothing else, so Fe never moved: change
 * Ni from 50 to 60 and the row still said Fe 30 where the web page says 20, and that
 * stale Fe was what Save wrote. Now, as on web:
 *  · editing any other ELEMENT recomputes Fe, unless Fe was typed by hand;
 *  · typing Fe marks it manual, so it survives later edits — on either app;
 *  · clearing Fe hands it back to the auto balance;
 *  · material, weight and container never touch Fe.
 * When the row has no analysis left, the balance is '' and Fe keeps its last value —
 * web's rule, kept as is.
 *
 * `value` arrives already cleaned (cleanElement / cleanKgs at the cell).
 */
export function editRow(row: any, colId: string, value: any, elements: any[]): any {
  const elems = elements || DEFAULT_ELEMENTS;
  const hasFe = elems.some((el: any) => el.key === 'fe');
  const newRow = { ...row, [colId]: value };
  if (colId === 'fe') {
    if (value === '') {
      newRow._feManual = false;
      const computed = autoFe(newRow, elems);
      if (computed !== '') newRow.fe = computed;
    } else {
      newRow._feManual = true;
    }
  } else if (hasFe && colId !== 'kgs' && colId !== 'material' && colId !== 'container') {
    if (!row?._feManual) {
      const computed = autoFe(newRow, elems);
      if (computed !== '') newRow.fe = computed;
    }
  }
  return newRow;
}

/**
 * Web page.js delTable: only an EMPTY table can be deleted — one that still holds rows
 * is refused with "Table contains materials!". The phone deleted it outright behind a
 * confirm, rows and all, and the delete is immediate (it does not wait for Save).
 */
export const canDeleteTable = (t: any): boolean => (t?.data || []).length === 0;

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
  const uidCollection = useAuth((s) => s.uidCollection);
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!uidCollection,
    queryKey: ['materials', uidCollection],
    queryFn: () => loadMaterials(uidCollection as string),
  });

  // The Ni price a new or unpriced table starts from: the Formulas page's LME nickel.
  // Web reads the formulasCalc document beside the tables (page.js loadData). This
  // used to look for it on the settings document, where it has never been, so the
  // seed was always empty. Same cache entry as the Formulas screen; a failed read
  // just means no seed, as on web (`.catch(() => ({}))`).
  const formulas = useQuery({
    enabled: !!uidCollection,
    queryKey: ['formulas', uidCollection],
    queryFn: () => loadDataSettings(uidCollection as string, 'formulasCalc').catch(() => ({})),
  });
  const rawNilme = (formulas.data as any)?.general?.nilme;
  const nilme = rawNilme ? String(rawNilme) : '';

  // Live LME nickel, rounded the way web rounds it (page.js:108).
  const { prices: metalPrices } = useMetalPrices();
  const liveNi = useMemo(() => {
    const ni = metalPrices.find((m) => m.key === 'LME-NI' || m.symbol === 'Ni');
    return ni?.price == null ? null : String(Math.round(ni.price));
  }, [metalPrices]);
  // `lastLive` is the last print WE wrote into a table, so seedLmeNickel can tell
  // "our" price from a typed one — without it, every poll would overwrite a
  // negotiated price. `liveNow` is the current print, for building a working copy.
  const lastLive = useRef<string | null>(null);
  const liveNow = useRef<string | null>(null);

  // Local working copy — seeded from the server, then edited freely until Save.
  const [tables, setTables] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  // Read inside effects and mutation callbacks, which must see the latest value.
  const dirtyRef = useRef(false);
  // Bumped on every edit, so Save can tell whether anything was typed while it ran.
  const editSeq = useRef(0);

  const markClean = () => {
    dirtyRef.current = false;
    setDirty(false);
  };

  const fromServer = (rows: any[]) => {
    setTables(workingCopy(rows, nilme, liveNow.current));
    lastLive.current = liveNow.current ?? (nilme || null);
  };

  // Another workspace (the IMS ↔ GIS switch) is another set of tables. The working
  // copy belongs to the workspace it was loaded from: with unsaved edits kept across
  // the switch, the old company's tables stayed on screen and Save would have written
  // them into the new one. Dropped here, before the load below runs for the new
  // workspace. A Save still in flight writes to the workspace it started in, and the
  // sequence bump stops it from marking this one clean.
  const owner = useRef(uidCollection);
  useEffect(() => {
    if (owner.current === uidCollection) return;
    owner.current = uidCollection;
    editSeq.current += 1;
    dirtyRef.current = false;
    setDirty(false);
    setTables([]);
  }, [uidCollection]);

  // Never over unsaved edits. A refetch — switching tab and coming back after two
  // minutes, a pull-to-refresh, the refetch after a delete — used to replace the
  // working copy whenever the server's copy had changed in the meantime, silently
  // dropping everything typed since the last Save. Web loads once and keeps what is
  // typed; so does the phone now, until Save or an explicit discard().
  useEffect(() => {
    if (!query.data || !formulas.isFetched) return;
    if (dirtyRef.current) return;
    fromServer(query.data);
    // fromServer reads nilme and the refs; nilme is listed, the refs need not be.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, formulas.isFetched, nilme]);

  // Roll each new live print into both bars of every table, where the price is still ours.
  useEffect(() => {
    liveNow.current = liveNi;
    if (liveNi == null) return;
    const prev = lastLive.current;
    lastLive.current = liveNi;
    setTables((prevTables) => seedLmeNickel(prevTables, liveNi, prev));
  }, [liveNi]);

  const mutate = (fn: (prev: any[]) => any[]) => {
    setTables(fn);
    editSeq.current += 1;
    dirtyRef.current = true;
    setDirty(true);
  };

  /** Drop every unsaved edit and show what the server holds. */
  const discard = () => {
    markClean();
    if (query.data) fromServer(query.data);
  };

  // Seeded with the live LME print, as web's Add Table is (its nilmePrice follows the
  // poll); the Formulas price only until the first print arrives.
  const addTable = () => mutate((prev) => [...prev, blankTable(liveNow.current ?? nilme)]);
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
          ? {
              ...t,
              data: (t.data || []).map((r: any) =>
                r.id === rowId ? editRow(r, key, value, t.elements || DEFAULT_ELEMENTS) : r
              ),
            }
          : t
      )
    );
  const setTableField = (tableId: string, key: string, value: any) =>
    mutate((prev) => prev.map((t) => (t.id === tableId ? { ...t, [key]: value } : t)));

  const save = useMutation({
    meta: { success: 'Saved successfully!' },
    mutationFn: async () => {
      if (!uidCollection) throw new Error('Not authenticated');
      const seq = editSeq.current;
      await saveMaterials(uidCollection, tables);
      return seq;
    },
    onSuccess: (seq) => {
      // Only what was on screen when Save was pressed is on the server now. A cell
      // typed while it was saving is still unsaved: keep it, and keep Save lit.
      if (seq === editSeq.current) markClean();
      qc.invalidateQueries({ queryKey: ['materials'] });
    },
  });

  const removeTable = useMutation({
    meta: { success: 'Table deleted!' },
    mutationFn: async (table: any) => {
      if (!uidCollection) throw new Error('Not authenticated');
      // The screen checks first; this is the backstop for any other caller.
      if (!canDeleteTable(table)) throw new Error('Table contains materials — remove its rows first.');
      await deleteMaterialTable(uidCollection, table.id);
      return table.id as string;
    },
    onSuccess: (id) => {
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
    discard,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
