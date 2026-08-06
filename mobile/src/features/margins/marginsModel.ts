// Margins editing model — pure functions ported verbatim from the web page's
// handlers (app/(root)/margins/page.js:426-525). Keeping them pure means the
// month roll-ups can be reasoned about (and reused) without React.
//
// The rule that matters most: a row flagged `gis` is a shared deal, so it
// contributes HALF its totalMargin and HALF its remaining to the month total —
// but its full purchase and openShip.

export interface MarginItem {
  id: string;
  date: any;
  purchase: any;
  description: string;
  supplier: string;
  client: string;
  margin: any;
  totalMargin: any;
  shipped: any;
  openShip: any;
  remaining: any;
  gis?: boolean;
}

export interface MarginMonth {
  month: string;
  openShip: any;
  purchase: any;
  remaining: any;
  totalMargin: any;
  items: MarginItem[];
  ids: string[];
}

export const blankItem = (id: string): MarginItem => ({
  id,
  date: null,
  purchase: '',
  description: '',
  supplier: '',
  client: '',
  margin: '',
  totalMargin: '',
  shipped: '',
  openShip: '',
  remaining: '',
});

// Web's input guards: numeric fields strip everything but digits/-/., and any
// value with more than 3 decimals is REJECTED outright (the keystroke is dropped).
export const removeNonNumeric = (n: any) => (n ?? '').toString().replace(/[^0-9.\-]/g, '');
export const countDecimalDigits = (v: any) => {
  const s = String(v ?? '');
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
};

// Recompute a month's totals from its items — the exact reducer web runs after
// every edit and every GIS toggle.
export function rollupMonth(z: MarginMonth): MarginMonth {
  return {
    ...z,
    remaining: z.items.reduce((acc, cur) => acc + (cur.gis ? (Number(cur.remaining) / 2 || 0) : (Number(cur.remaining) || 0)), 0),
    totalMargin: z.items.reduce((acc, cur) => acc + (cur.gis ? (Number(cur.totalMargin) / 2 || 0) : (Number(cur.totalMargin) || 0)), 0),
    purchase: z.items.reduce((acc, cur) => acc + ((cur.purchase as any) * 1 || 0), 0),
    openShip: z.items.reduce((acc, cur) => acc + ((cur.openShip as any) * 1 || 0), 0),
  };
}

// Derived per-item fields, recomputed on every edit (web does this in a second
// pass right after applying the raw value).
export function recomputeItem(x: MarginItem): MarginItem {
  return {
    ...x,
    totalMargin: (x.purchase as any) * (x.margin as any),
    openShip: (x.purchase as any) - (x.shipped as any),
    remaining: ((x.purchase as any) - (x.shipped as any)) * (x.margin as any),
  };
}

// Apply one field edit to one item, then re-derive that item and the month.
// Returns null when the keystroke must be rejected (>3 decimals), matching web.
export function applyItemChange(
  data: MarginMonth[],
  month: string,
  id: string,
  name: keyof MarginItem,
  raw: string
): MarginMonth[] | null {
  if (countDecimalDigits(raw) > 3) return null;
  const value = name === 'description' ? raw : removeNonNumeric(raw);

  return data.map((z) => {
    if (z.month !== month) return z;
    const items = z.items.map((x) => (x.id === id ? recomputeItem({ ...x, [name]: value }) : x));
    return rollupMonth({ ...z, items });
  });
}

// Non-numeric selects (supplier / client / date) skip the guard + re-derivation:
// web writes the value straight through and does NOT roll the month up.
export function applyItemSelect(
  data: MarginMonth[],
  month: string,
  id: string,
  name: keyof MarginItem,
  value: any
): MarginMonth[] {
  return data.map((z) =>
    z.month === month ? { ...z, items: z.items.map((x) => (x.id === id ? { ...x, [name]: value } : x)) } : z
  );
}

// Toggling GIS changes only the month roll-up (halves this row's contribution).
export function applyGisToggle(data: MarginMonth[], month: string, id: string, value: boolean): MarginMonth[] {
  return data.map((z) => {
    if (z.month !== month) return z;
    const items = z.items.map((x) => (x.id === id ? { ...x, gis: value } : x));
    return rollupMonth({ ...z, items });
  });
}

export function addItem(data: MarginMonth[], month: string, id: string): MarginMonth[] {
  const item = blankItem(id);
  return data.map((z) => (z.month === month ? { ...z, items: [...z.items, item], ids: [...(z.ids || []), id] } : z));
}

export function deleteItem(data: MarginMonth[], month: string, id: string): MarginMonth[] {
  return data.map((z) =>
    z.month === month
      ? { ...z, items: z.items.filter((x) => x.id !== id), ids: (z.ids || []).filter((x) => x !== id) }
      : z
  );
}

export function addMonth(data: MarginMonth[]): MarginMonth[] {
  const month = String(data.length + 1).padStart(2, '0');
  return [...data, { month, openShip: '', purchase: '', remaining: '', totalMargin: '', items: [], ids: [] }];
}

export function deleteMonth(data: MarginMonth[], month: string): MarginMonth[] {
  return data.filter((z) => z.month !== month);
}

// On load, items are ordered by the doc's `ids` array — web reorders them so the
// on-screen row order survives a round trip.
export function orderByIds(docs: any[]): MarginMonth[] {
  return (docs || []).map(({ items, ids, ...rest }: any) => ({
    ...rest,
    ids: ids || [],
    items: (ids || []).map((id: string) => (items || []).find((it: any) => it.id === id)).filter(Boolean),
  }));
}
