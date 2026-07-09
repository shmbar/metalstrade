// Inventory aggregation — a faithful port of the stocks page (app/(root)/stocks/page.js
// loadtStocks + setTotals). Nets `in` (purchases, +) against `out` (sales, −) per
// (warehouse | description), filtering original invoices superseded by a final one,
// applying finalqnty adjustments, and keeping only current on-hand rows (qnty > 0.1).
// Pure: takes raw stock lots + settings, returns display rows + per-group totals.

type Lot = any;

// Port of utils.js filteredArray: within each invoice-number group, when invType
// values differ, keep only the highest invType (final/credit supersedes original).
function filteredArray(arr: Lot[]): Lot[] {
  const groupedByInvoice = arr.reduce((acc: Record<string, Lot[]>, obj) => {
    const invoiceNumber = obj.invoice;
    (acc[invoiceNumber] ||= []).push(obj);
    return acc;
  }, {});
  return Object.values(groupedByInvoice).flatMap((group) => {
    const distinct = new Set(group.map((o) => parseInt(o.invType, 10)));
    if (distinct.size === 1) return group;
    const maxInvType = Math.max(...distinct);
    return group.filter((o) => parseInt(o.invType, 10) === maxInvType);
  });
}

const f = (v: any) => parseFloat(v);

// Normalize a date field (string or { startDate }) to a string, mirroring web agingUtils.dStr.
const dStr = (d: any): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d;
  if (typeof d === 'object') return d.startDate || d.endDate || null;
  return null;
};

// Earliest arrival of a cargo group: min indDate among 'in' records, else contract date.
function arrivalIsoOf(group: Lot[]): string | null {
  const inDates = group
    .filter((r) => r.type === 'in' || !r.type)
    .map((r) => dStr(r.indDate))
    .filter(Boolean)
    .map((s) => new Date(s as string))
    .filter((d) => !isNaN(d.getTime()));
  if (inDates.length) return new Date(Math.min(...inDates.map((d) => d.getTime()))).toISOString();
  const cd = group.map((r) => r.contractData?.date).find(Boolean);
  if (cd) {
    const d = new Date(cd);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}
const fmtDateDDMMYY = (iso?: string) => {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(-2)}`;
};

// descriptionName resolution — mirrors page.js lines 137-145.
function resolveDescriptionName(x: Lot): string {
  if (x.type === 'in' && x.description) {
    return x.productsData?.find((y: any) => y.id === x.description)?.description || '';
  }
  if (x.mtrlStatus === 'select' || x.isSelection) {
    return x.productsData?.find((y: any) => y.id === x.descriptionId)?.description || '';
  }
  if (x.type === 'out' && x.moveType === 'out') return x.descriptionName;
  return x.descriptionText;
}

export interface InventoryRow {
  id: string;
  order: string;
  supplier: string; // raw id (or '-')
  originSupplier: string;
  stock: string; // warehouse id
  descriptionName: string;
  qnty: number;
  qTypeTable: string; // raw id
  unitPrc: number;
  total: number | '-';
  cur: string; // raw id ('us'/'eu')
  sType: string;
  date: string;
  arrivalIso: string | null; // earliest arrival (for storage aging)
}

export interface InventoryTotal {
  stock: string;
  qTypeTable: string;
  cur: string;
  qnty: number;
  total: number;
}

const FIELD_KEYS = [
  'order',
  'date',
  'supplier',
  'originSupplier',
  'stock',
  'descriptionName',
  'qnty',
  'qTypeTable',
  'unitPrc',
  'total',
  'sType',
];

export function computeInventory(
  rawStockData: Lot[],
  settings: any
): { rows: InventoryRow[]; totals: InventoryTotal[] } {
  const stockData: Lot[] = (rawStockData || []).map((x) => ({
    ...x,
    descriptionName: resolveDescriptionName(x),
  }));

  // Unique (warehouse | description) keys among lots with a warehouse assigned.
  let tempArr = stockData
    .filter((q) => q.stock !== '')
    .map((x) => ({ stock: x.stock, description: x.description || x.descriptionId }));
  tempArr = Array.from(
    new Map(tempArr.map((item) => [`${item.stock}|${item.description}`, item])).values()
  );

  const newArr: InventoryRow[] = [];

  tempArr.forEach((item, key) => {
    let group = stockData.filter(
      (x) =>
        (x.description === item.description || x.descriptionId === item.description) &&
        x.stock === item.stock
    );
    group = filteredArray(group); // drop originals superseded by a final invoice

    const totalObj: any = {};
    group.forEach((currentObj) => {
      FIELD_KEYS.forEach((k) => {
        if (k === 'qnty') {
          totalObj[k] =
            (f(totalObj[k]) || 0) +
            (currentObj.type === 'in'
              ? (Math.abs(f(currentObj[k])) || 0) +
                (currentObj.finalqnty && f(currentObj.finalqnty) !== f(currentObj.qnty)
                  ? (f(currentObj.qnty) - f(currentObj.finalqnty)) * -1
                  : 0)
              : f(currentObj[k]) * -1 || 0);
        } else if (currentObj.type === 'in' && currentObj.description && f(currentObj.qnty) > 0) {
          totalObj[k] = currentObj[k];
        }
      });
      totalObj.id = currentObj.id;
      totalObj.qTypeTable = currentObj.qTypeTable || '';
    });

    totalObj.total =
      totalObj.qnty === 0 && !group.some((it) => 'finalqnty' in it && it.type === 'in')
        ? totalObj.unitPrc
        : f(totalObj.qnty) * f(totalObj.unitPrc);
    totalObj.data = group; // web parity: kept for supplier-less description fallback
    totalObj.date = fmtDateDDMMYY(group.find((z) => z.contractData)?.contractData?.date);
    totalObj.arrivalIso = arrivalIsoOf(group);
    totalObj.cur = group[0]?.cur;
    totalObj.sType = settings?.Stocks?.Stocks?.find((x: any) => x.id === totalObj.stock)?.sType || '';
    totalObj.qnty = totalObj.qnty === 0 ? 0 : f(parseFloat(totalObj.qnty).toFixed(3));

    newArr.push(totalObj as InventoryRow);
  });

  let rows = newArr.filter((x) => Number(x.qnty) > 0.1);

  // Fill missing supplier so rows still render (page.js parity).
  rows = rows.map((r) => {
    if (!r.supplier) {
      const description = Array.isArray((r as any)?.data?.[0]?.productsData)
        ? (r as any).data[0].productsData[0]?.description
        : '-';
      return { ...r, supplier: '-', descriptionName: description ?? '-', total: '-' };
    }
    return r;
  });

  return { rows, totals: setTotals(rows) };
}

// Per (warehouse, qTypeTable, currency) sum of qnty + total. Port of page.js setTotals.
function setTotals(rows: InventoryRow[]): InventoryTotal[] {
  const tmp = rows.map((x) => ({
    cur: x.cur,
    qTypeTable: x.qTypeTable,
    stock: x.stock,
    qnty: 0,
    total: 0,
  }));
  const sumArr: InventoryTotal[] = Array.from(new Set(tmp.map((i) => JSON.stringify(i)))).map((i) =>
    JSON.parse(i)
  );
  sumArr.forEach((z) => {
    rows
      .filter((q) => q.stock === z.stock && q.qTypeTable === z.qTypeTable && q.cur === z.cur)
      .forEach((item) => {
        z.qnty += f(item.qnty);
        z.total += item.total === '-' ? 0 : f(item.total as number);
      });
  });
  return sumArr;
}

// Resolve raw ids → display names (page.js getFormatted).
export function formatInventoryRow(row: InventoryRow, settings: any) {
  const gQ = (id: string, cat: string, field: string) =>
    settings?.[cat]?.[cat]?.find((q: any) => q.id === id)?.[field] || '';
  return {
    ...row,
    supplierName: row.supplier !== '-' ? gQ(row.supplier, 'Supplier', 'nname') : '-',
    warehouseName: gQ(row.stock, 'Stocks', 'nname'),
    curLabel: gQ(row.cur, 'Currency', 'cur'),
    qTypeLabel: gQ(row.qTypeTable, 'Quantity', 'qTypeTable'),
  };
}
