// Inventory aggregation — a faithful port of the stocks page (app/(root)/stocks/page.js
// loadtStocks + setTotals). Nets `in` (purchases, +) against `out` (sales, −) per
// (warehouse | description), filtering original invoices superseded by a final one,
// applying finalqnty adjustments, and keeping only current on-hand rows (qnty > 0.1).
// Pure: takes raw stock lots + settings, returns display rows + per-group totals.

type Lot = any;

// Port of utils.js filteredArray: within each invoice-number group, when invType
// values differ, keep only the highest invType (final/credit supersedes original).
export function filteredArray(arr: Lot[]): Lot[] {
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

// Verbatim port of web cashflow/funcs.js isNumber (:314). Deliberately STRICT:
// a non-string is not a number, and the whole trimmed string must be numeric.
// runStocks gates its contract-line unit-price override on exactly this, so a
// looser check (e.g. !isNaN(parseFloat(x))) silently accepts a numeric literal,
// or accepts '1,200' as 1, where web rejects both and keeps the lot's own price.
function isNumber(str: any): boolean {
  if (typeof str !== 'string') return false;
  return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(str.trim());
}

/**
 * Web's runStocks pre-filters the raw ledger before aggregating anything
 * (cashflow/funcs.js:189-190): zero-value settlement rows and draft lots never
 * reach the cashflow paid/unpaid split. The STOCKS page has no such filter, so
 * this is applied by the cashflow caller only, never inside computeInventory.
 */
export const cashflowStockLots = (lots: Lot[]): Lot[] =>
  (lots || [])
    .filter((z: any) => z.total !== 0)
    .filter((x: any) => x.draft === undefined || x.draft === false);

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
  /** DISTINCT suppliers behind the row — more than one means the row is mixed */
  supplierIds: string[];
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

export interface InventoryOpts {
  /**
   * Rows below this net quantity are dropped. The STOCKS page hides sub-0.1
   * residual lots (web stocks/page.js:224); the CASHFLOW page keeps everything
   * above zero (web cashflow/funcs.js:364). Default is the stocks behaviour, so
   * the five screens already sharing this function are untouched.
   */
  minQnty?: number;
  /**
   * Cashflow mode. Web's runStocks differs from its stocks page in two ways that
   * change money: it copies the representative in-lot's fields with NO qnty>0
   * guard, and it overrides unitPrc from the contract's productsData when that
   * line has one (funcs.js:342, 352-356). Applying either on the stocks page
   * would break a currently-correct screen, so both are opt-in.
   */
  cashflow?: boolean;
}

export function computeInventory(
  rawStockData: Lot[],
  settings: any,
  opts: InventoryOpts = {}
): { rows: InventoryRow[]; totals: InventoryTotal[] } {
  const { minQnty = 0.1, cashflow = false } = opts;
  const stockData: Lot[] = (rawStockData || []).map((x) => ({
    ...x,
    descriptionName: resolveDescriptionName(x),
  }));

  // Unique (warehouse | description) keys. The STOCKS page skips lots with no
  // warehouse assigned (page.js:157 `q.stock !== ''`), but runStocks keys off
  // EVERY distinct stock value including '' (funcs.js:314), so on the cashflow
  // side an unassigned lot still contributes to the paid/unpaid split. Dropping
  // it there made mobile's Stocks (Paid/UnPaid) totals lower than web's.
  let tempArr = stockData
    .filter((q) => cashflow || q.stock !== '')
    .map((x) => ({ stock: x.stock, description: x.description || x.descriptionId }));
  tempArr = Array.from(
    new Map(tempArr.map((item) => [`${item.stock}|${item.description}`, item])).values()
  );

  const newArr: InventoryRow[] = [];

  // ── group index ────────────────────────────────────────────────────────────
  // The original code re-scanned the WHOLE ledger once per group:
  //     tempArr.forEach(item => stockData.filter(x => …))
  // Measured on production data that is 670 groups x 3,249 lots = 2.18 MILLION
  // passes, and it accounted for 1,129 ms of computeInventory's 1,130 ms. Both
  // modes run per screen, so a phone (3-6x slower than a laptop) spent the better
  // part of ten seconds unable to answer a touch — the "getting stuck" the client
  // reported. This index does the same work in ONE pass.
  //
  // The subtlety that must survive: the original predicate matched
  //     x.description === key || x.descriptionId === key
  // so a lot whose two fields DISAGREE legitimately belongs to TWO groups. A plain
  // group-by on one key would silently drop those memberships and change the
  // figures. Each lot is therefore registered under BOTH of its keys (once, when
  // they are equal), which reproduces the predicate exactly.
  //
  // Insertion order is ascending, so each bucket already matches the order
  // Array.prototype.filter would have produced. No sort — and none may be added,
  // because downstream `group[0]` picks the representative lot.
  const byStock = new Map<any, Map<any, Lot[]>>();
  stockData.forEach((x) => {
    let byDesc = byStock.get(x.stock);
    if (!byDesc) byStock.set(x.stock, (byDesc = new Map()));
    const push = (k: any) => {
      const bucket = byDesc!.get(k);
      if (bucket) bucket.push(x);
      else byDesc!.set(k, [x]);
    };
    push(x.description);
    if (x.descriptionId !== x.description) push(x.descriptionId);
  });

  tempArr.forEach((item, key) => {
    let group = byStock.get(item.stock)?.get(item.description) ?? [];
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
        } else if (
          currentObj.type === 'in' &&
          currentObj.description &&
          // web's stocks page guards on qnty>0 here; runStocks does not.
          (cashflow || f(currentObj.qnty) > 0)
        ) {
          totalObj[k] = currentObj[k];
        }
      });
      totalObj.id = currentObj.id;
      totalObj.qTypeTable = currentObj.qTypeTable || '';
    });

    if (cashflow) {
      // web funcs.js:352-356 — prefer the contract product line's unit price, and
      // compute total from the RAW qnty (before the toFixed(3) below).
      const first: any = group[0];
      const untPrc = first?.productsData?.find(
        (z: any) => z.id === (first.descriptionId || first.description)
      )?.unitPrc;
      // funcs.js:354 — `isNumber(untPrc) ? untPrc : totalObj.unitPrc`, not a
      // parseFloat check. See isNumber above for why the difference is material.
      if (isNumber(untPrc)) {
        totalObj.unitPrc = untPrc;
      }
      totalObj.total = f(totalObj.qnty) * f(totalObj.unitPrc);
    } else {
      totalObj.total =
        totalObj.qnty === 0 && !group.some((it) => 'finalqnty' in it && it.type === 'in')
          ? totalObj.unitPrc
          : f(totalObj.qnty) * f(totalObj.unitPrc);
    }
    totalObj.data = group; // web parity: kept for supplier-less description fallback
    /* The DISTINCT suppliers behind this row (web funcs.js:365). Grouping is
       warehouse x description, so a row can legitimately hold lots from more than one
       supplier — and naming just one of them is wrong. PO 240726 read "GIS OU" while
       its contract said Stachow, because the label came from whichever lot happened
       to sort last. Keeping the set lets the caller say the row is mixed instead of
       picking one at random; it is usually the sign of a duplicated lot, so it should
       be visible rather than silent. */
    totalObj.supplierIds = [
      ...new Set(group.filter((z: any) => z.type === 'in' && z.supplier).map((z: any) => z.supplier)),
    ];
    totalObj.date = fmtDateDDMMYY(group.find((z) => z.contractData)?.contractData?.date);
    totalObj.arrivalIso = arrivalIsoOf(group);
    totalObj.cur = group[0]?.cur;
    totalObj.sType = settings?.Stocks?.Stocks?.find((x: any) => x.id === totalObj.stock)?.sType || '';
    totalObj.qnty = totalObj.qnty === 0 ? 0 : f(parseFloat(totalObj.qnty).toFixed(3));

    newArr.push(totalObj as InventoryRow);
  });

  let rows = newArr.filter((x) => Number(x.qnty) > minQnty);

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
// Exported so a screen can recompute it from its own FILTERED rows — web recomputes
// the Summary-Stocks table on every globalFilter/columnFilter change (newTable.js:119-123
// -> page.js:255-260), so the card must track the search box.
export function setTotals(rows: InventoryRow[]): InventoryTotal[] {
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
  // Same shape of waste as the group loop above: one full scan of `rows` per unique
  // (stock, qTypeTable, cur) triple. Smaller in absolute terms — rows is hundreds,
  // not thousands — but it runs on every keystroke of the inventory search, so it
  // is on the interactive path. One pass, keyed identically to sumArr's own
  // JSON.stringify identity, gives the same sums.
  // Keyed with JSON.stringify over a fixed field order — the same identity sumArr
  // itself is built from above, so the two cannot disagree. (A plain delimiter would
  // need a character that can never appear in a settings id; borrowing the existing
  // stringify is both safer and self-evidently consistent.)
  const keyOf = (o: { stock: any; qTypeTable: any; cur: any }) =>
    JSON.stringify([o.stock, o.qTypeTable, o.cur]);
  const bucket = new Map<string, InventoryTotal>();
  sumArr.forEach((z) => bucket.set(keyOf(z), z));
  rows.forEach((item) => {
    const z = bucket.get(keyOf(item));
    if (!z) return;
    z.qnty += f(item.qnty);
    z.total += item.total === '-' ? 0 : f(item.total as number);
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
    // web page.js:321 resolves this too — it is a hidden column, but a hidden column
    // still participates in the global filter, so the search has to see the name.
    originSupplierName: gQ(row.originSupplier, 'Supplier', 'nname'),
    warehouseName: gQ(row.stock, 'Stocks', 'nname'),
    curLabel: gQ(row.cur, 'Currency', 'cur'),
    qTypeLabel: gQ(row.qTypeTable, 'Quantity', 'qTypeTable'),
  };
}
