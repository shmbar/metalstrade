import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { loadMaterials } from '@/data/firestore';
import { saveMaterials, deleteMaterialTable, newId } from '@/data/writes';
import { DEFAULT_ELEMENTS } from './constants';

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
    data: [] as any[],
  };
}

export function blankRow(elements: any[]) {
  const row: any = { id: newId(), material: '', kgs: '', container: '', _feManual: false };
  (elements || DEFAULT_ELEMENTS).forEach((el: any) => (row[el.key] = ''));
  return row;
}

// Web's element-cell guard: at most 2 decimals; kgs is stripped to digits/-/.
export const countDecimalDigits = (v: string) => {
  const s = String(v ?? '');
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
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
      setTables(query.data.map((t: any) => ({ ...t })));
      setDirty(false);
    }
  }, [query.data]);

  const nilmePrice = Number((settings as any)?.formulasCalc?.general?.nilme) || undefined;

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
