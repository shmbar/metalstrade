/**
 * PARITY: Stocks & Storage
 * ────────────────────────────────────────────────────────────────────────────
 * Web side  : app/(root)/stocks/{page.js, newTable.js, whModal.js, stockAudit.js,
 *             storageAging.js, agingUtils.js, sumtables/{sumTable,gradeTable}.js}
 *             app/(root)/cashflow/funcs.js runStocks
 *             app/(root)/storagecosts/{page.js, storageUtils.js}
 * Mobile side: mobile/src/features/stocks/{aggregate,gradeSummary,aging,audit,
 *             display,useStorage}.ts
 *
 * Only agingUtils.js and storageUtils.js are importable (Tier 2). Everything else
 * lives inside a React page, so its formula is transcribed VERBATIM below with a
 * file:line citation and guarded by the drift alarm (Tier 3).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dateFormat from 'dateformat';

import {
  FIXED_NOW,
  INV_TYPE,
  makeSettings,
  makeProduct,
  makeStockLot,
  makeStockOutLot,
  makeExpense,
} from './_helpers/fixtures';
import { repoFileText, expectWebUnchanged } from './_helpers/webSource';

// ── web modules that DO import ───────────────────────────────────────────────
import {
  DAY as WEB_DAY,
  dStr as webDStr,
  arrivalOf as webArrivalOf,
  daysStored as webDaysStored,
  bucketOf as webBucketOf,
} from '../../app/(root)/stocks/agingUtils.js';
import {
  EUR_USD as WEB_EUR_USD,
  STORAGE_LABELS as WEB_STORAGE_LABELS,
  toUsd as webToUsd,
  ym as webYm,
  arrivalStr as webArrivalStr,
  isStorageType as webIsStorageType,
  mtInWh as webMtInWh,
  computeStorageMetric as webComputeStorageMetric,
} from '../../app/(root)/storagecosts/storageUtils.js';
import { labelAwareGlobalFilter } from '../../components/table/filters/labelAwareGlobalFilter.js';

// ── mobile ───────────────────────────────────────────────────────────────────
import {
  computeInventory,
  setTotals as mobileSetTotals,
  formatInventoryRow,
  filteredArray as mobileFilteredArray,
  cashflowStockLots,
} from '@/features/stocks/aggregate';
import { computeGradeSummary as mobileGradeSummary } from '@/features/stocks/gradeSummary';
import {
  DAY as MOBILE_DAY,
  STALE_DAYS as MOBILE_STALE_DAYS,
  DEMURRAGE_DAYS as MOBILE_DEMURRAGE_DAYS,
  daysStored as mobileDaysStored,
  bucketOf as mobileBucketOf,
  computeAging,
} from '@/features/stocks/aging';
import { buildAudit } from '@/features/stocks/audit';
import {
  expenseYear,
  suggestWh,
  defaultMonth,
  makeWhName,
  computePerYear,
  computeActuals,
} from '@/features/stocks/useStorage';
import {
  INVENTORY_FILTER_COLUMNS,
  inventoryFilterValues,
  filterInventoryRows,
  warehouseTotalCell,
  fmtLotPrice,
} from '@/features/stocks/display';
import {
  mtInWh as sharedMtInWh,
  computeStorageMetric as sharedComputeStorageMetric,
  toUsd as sharedToUsd,
  ym as sharedYm,
  arrivalStr as sharedArrivalStr,
  isStorageType as sharedIsStorageType,
  STORAGE_LABELS as SHARED_STORAGE_LABELS,
  EUR_USD as SHARED_EUR_USD,
} from '@shared/storageUtils';

// ═════════════════════════════════════════════════════════════════════════════
// RECORDED WEB HASHES — the drift alarm. See __tests__/parity/README.md.
// ═════════════════════════════════════════════════════════════════════════════
const HASH = {
  loadtStocks: 'fa7444d47770', // app/(root)/stocks/page.js:132  (aggregation core)
  setTotals: '0878395a5db7', // app/(root)/stocks/page.js:263
  getFormatted: 'ce2b9a9845ad', // app/(root)/stocks/page.js:312
  showWeight: 'eff225f4c25c', // app/(root)/stocks/page.js:288
  customtable: '20d8f57fdbb4', // app/(root)/stocks/newTable.js:32 (contains the footer count)
  addComma: '9d2dc43091c5', // app/(root)/stocks/whModal.js:52
  sumShowAmount: '61cca0f1837f', // app/(root)/stocks/sumtables/sumTable.js:8
  gradeSummary: '3c54892bacca', // app/(root)/stocks/sumtables/gradeTable.js:11
  buildAudit: '7e246498a7e0', // app/(root)/stocks/stockAudit.js:35
  resolveDescName: '826bf84cceac', // app/(root)/stocks/stockAudit.js:21
  filteredArray: '2c0d632f5d81', // utils/utils.js:207
  runStocks: '380e94189973', // app/(root)/cashflow/funcs.js:188
  staleDays: 'a2e0c4822268', // app/(root)/stocks/storageAging.js:11
  demurrageDays: 'f6b09c3eafe3', // app/(root)/stocks/storageAging.js:12
  storageExpYear: '07ada9eea708', // app/(root)/storagecosts/page.js:142
  storagePerYear: '9e8c34262df2', // app/(root)/storagecosts/page.js:157
  storageSuggestWh: 'd33cb7953f78', // app/(root)/storagecosts/page.js:193
  storageActuals: '71376076b800', // app/(root)/storagecosts/page.js:178
  storageWhName: '55be7e6bd8bc', // app/(root)/storagecosts/page.js:117
  labelAwareGlobalFilter: '5e023254ef34', // components/table/filters/labelAwareGlobalFilter.js:5
};

// ═════════════════════════════════════════════════════════════════════════════
// TIER 3 MIRRORS — transcribed verbatim from web. Do not "clean these up":
// their warts (parseFloat of a product, `for…in` over an array, string qnty) are
// exactly what mobile has to reproduce.
// ═════════════════════════════════════════════════════════════════════════════

/** utils/utils.js:207 filteredArray — verbatim. */
const webFilteredArray = (arr: any[]): any[] => {
  const groupedByInvoice = arr.reduce((acc: any, obj: any) => {
    const invoiceNumber = obj.invoice;
    if (!acc[invoiceNumber]) {
      acc[invoiceNumber] = [];
    }
    acc[invoiceNumber].push(obj);
    return acc;
  }, {});
  const filteredArray = Object.values(groupedByInvoice).flatMap((group: any) => {
    const distinctInvTypes = new Set(group.map((obj: any) => parseInt(obj.invType, 10)));
    if (distinctInvTypes.size === 1) {
      return group;
    } else {
      const maxInvType = Math.max(...(distinctInvTypes as any));
      return group.filter((obj: any) => parseInt(obj.invType, 10) === maxInvType);
    }
  });
  return filteredArray;
};

/** app/(root)/stocks/page.js:91-129 propDefaults — the columns, in web's order. */
const WEB_STOCK_COLUMNS = [
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

/**
 * app/(root)/stocks/page.js:132-247 loadtStocks — the pure aggregation, verbatim
 * from the point the ledger has been downloaded (:146) to the point it is handed
 * to setData (:245). `dateFormat` is web's own import (:199).
 */
const webLoadStocks = (rawStockData: any[], settings: any): any[] => {
  let newArr: any[] = [];
  const stockData = rawStockData.map((x: any) => ({
    ...x,
    descriptionName:
      x.type === 'in' && x.description // Contract Invoice
        ? x.productsData.find((y: any) => y.id === x.description)?.description
        : x.mtrlStatus === 'select' || x.isSelection
          ? x.productsData.find((y: any) => y.id === x.descriptionId)?.description // Invoice
          : x.type === 'out' && x.moveType === 'out'
            ? x.descriptionName
            : x.descriptionText,
  }));

  let tempArr: any[] = stockData
    .filter((q: any) => q.stock !== '')
    .map((x: any) => ({ stock: x.stock, description: x.description || x.descriptionId }));
  tempArr = Array.from(new Map(tempArr.map((item) => [`${item.stock}|${item.description}`, item])).values());

  const fieldValues = WEB_STOCK_COLUMNS;

  for (const key in tempArr) {
    const item = tempArr[key];
    let filteredstockData = stockData.filter(
      (x: any) => (x.description === item.description || x.descriptionId === item.description) && x.stock === item.stock
    );
    filteredstockData = webFilteredArray(filteredstockData);

    const totalObj: any = {};
    for (const x in filteredstockData) {
      const currentObj: any = filteredstockData[x];
      fieldValues.forEach((k) => {
        if (k === 'qnty') {
          totalObj[k] =
            (parseFloat(totalObj[k]) || 0) +
            (currentObj.type === 'in'
              ? (Math.abs(parseFloat(currentObj[k])) || 0) +
                (currentObj.finalqnty && currentObj.finalqnty * 1 !== currentObj.qnty * 1
                  ? (currentObj.qnty * 1 - currentObj.finalqnty * 1) * -1
                  : 0)
              : parseFloat(currentObj[k]) * -1 || 0);
        } else if (currentObj.type === 'in' && currentObj.description && parseFloat(currentObj.qnty) > 0) {
          totalObj[k] = currentObj[k];
        }
      });
      totalObj['id'] = currentObj.id;
      totalObj['qTypeTable'] = currentObj.qTypeTable || '';
    }

    totalObj['total'] =
      totalObj.qnty === 0 &&
      !filteredstockData.some((it: any) => Object.prototype.hasOwnProperty.call(it, 'finalqnty') && it.type === 'in')
        ? totalObj.unitPrc
        : parseFloat((totalObj.qnty * totalObj.unitPrc) as any);
    totalObj['data'] = filteredstockData;
    totalObj['date'] = dateFormat(filteredstockData.find((z: any) => z.contractData)?.contractData?.date, 'dd.mm.yy');
    totalObj['cur'] = filteredstockData[0]['cur'];
    totalObj['sType'] = settings?.Stocks?.Stocks?.find((x: any) => x.id === totalObj.stock)?.sType || '';
    totalObj['ind'] = parseFloat(key);
    totalObj['qnty'] = totalObj.qnty === 0 ? totalObj.qnty : parseFloat(totalObj.qnty).toFixed(3);

    newArr.push(totalObj);
  }

  newArr = newArr.filter((x) => x.qnty * 1 > 0.1);

  for (let i = 0; i < newArr.length; i++) {
    if (!newArr[i].supplier) {
      const description = Array.isArray(newArr[i]?.data?.[0]?.productsData)
        ? newArr[i].data[0].productsData[0]?.description
        : '-';
      newArr[i] = { ...newArr[i], supplier: '-', descriptionName: description ?? '-', total: '-' };
    }
  }
  return newArr;
};

/** app/(root)/stocks/page.js:263 setTotals — verbatim, minus the setSumData call. */
const webSetTotals = (newArr: any[]): any[] => {
  const tmpArr = newArr.map((x) => ({ cur: x.cur, qTypeTable: x.qTypeTable, stock: x.stock, qnty: 0, total: 0 }));
  const sumArr: any[] = Array.from(new Set(tmpArr.map((item) => JSON.stringify(item)))).map((item) => JSON.parse(item));
  sumArr.forEach((z) => {
    const filteredGroup = newArr.filter((q) => q.stock === z.stock && q.qTypeTable === z.qTypeTable && q.cur === z.cur);
    filteredGroup.forEach((item) => {
      z.qnty += parseFloat(item.qnty);
      z.total += item.total === '-' ? 0 : parseFloat(item.total);
    });
  });
  return sumArr;
};

/** app/(root)/stocks/page.js:312 getFormatted — verbatim. Renames IN PLACE. */
const webGetFormatted = (arr: any[], settings: any): any[] => {
  const newArr: any[] = [];
  const gQ = (z: string, y: string, x: string) => settings[y][y].find((q: any) => q.id === z)?.[x] || '';
  arr.forEach((row) => {
    newArr.push({
      ...row,
      supplier: row.supplier !== '-' ? gQ(row.supplier, 'Supplier', 'nname') : '-',
      originSupplier: gQ(row.originSupplier, 'Supplier', 'nname'),
      cur: gQ(row.cur, 'Currency', 'cur'),
      stock: gQ(row.stock, 'Stocks', 'nname'),
      qTypeTable: gQ(row.qTypeTable, 'Quantity', 'qTypeTable'),
    });
  });
  return newArr;
};

/** app/(root)/cashflow/funcs.js:314 isNumber — verbatim. */
const webIsNumber = (str: any): boolean => {
  if (typeof str !== 'string') return false;
  return /^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(str.trim());
};

/** app/(root)/cashflow/funcs.js:189-190 — runStocks' ledger pre-filter, verbatim. */
const webRunStocksPreFilter = (stockData: any[]): any[] =>
  stockData.filter((z: any) => z.total !== 0).filter((x: any) => x.draft === undefined || x.draft === false);

/**
 * app/(root)/cashflow/funcs.js:314-366 — runStocks' aggregation, verbatim. Differs
 * from the stocks page in four money-relevant ways (all pinned by tests below):
 * it keys off EVERY stock value including '', it has no `qnty > 0` guard when
 * copying the in-lot's fields, it overrides unitPrc from the contract product line,
 * and it keeps every row with qnty > 0 rather than > 0.1.
 */
const webRunStocksRows = (rawStockData: any[], settings: any): any[] => {
  const newArr: any[] = [];
  const stockData = rawStockData.map((x: any) => ({
    ...x,
    descriptionName:
      x.type === 'in' && x.description
        ? x.productsData.find((y: any) => y.id === x.description)?.description
        : x.isSelection || x.mtrlStatus === 'select'
          ? x.productsData.find((y: any) => y.id === x.descriptionId)?.description
          : x.type === 'out' && x.moveType === 'out'
            ? x.descriptionName
            : x.descriptionText,
  }));

  const stocksArrData = [...new Set(stockData.map((x: any) => x.stock))];
  const fieldValues = WEB_STOCK_COLUMNS;

  for (const st in stocksArrData) {
    const filteredstockData = stockData.filter((x: any) => x.stock === stocksArrData[st]);
    const destcriptionArr = [...new Set(filteredstockData.map((x: any) => x.description || x.descriptionId))];

    for (const key in destcriptionArr) {
      let filteredData = filteredstockData.filter(
        (x: any) => x.description === destcriptionArr[key] || x.descriptionId === destcriptionArr[key]
      );
      filteredData = webFilteredArray(filteredData);

      const totalObj: any = {};
      for (const x in filteredData) {
        const currentObj: any = filteredData[x];
        fieldValues.forEach((k) => {
          if (k === 'qnty') {
            totalObj[k] =
              (parseFloat(totalObj[k]) || 0) +
              (currentObj.type === 'in'
                ? (Math.abs(parseFloat(currentObj[k])) || 0) +
                  (currentObj.finalqnty && currentObj.finalqnty * 1 !== currentObj.qnty * 1
                    ? (currentObj.qnty * 1 - currentObj.finalqnty * 1) * -1
                    : 0)
                : parseFloat(currentObj[k]) * -1 || 0);
          } else if (currentObj.type === 'in' && currentObj.description) {
            totalObj[k] = currentObj[k];
          }
        });
        totalObj['id'] = currentObj.id;
        totalObj['qTypeTable'] = currentObj.qTypeTable || '';
      }

      const untPrc = filteredData[0].productsData?.find(
        (z: any) => z.id === (filteredData[0].descriptionId || filteredData[0].description)
      )?.unitPrc;

      totalObj['unitPrc'] = webIsNumber(untPrc) ? untPrc : totalObj.unitPrc;
      totalObj['total'] = totalObj.unitPrc * totalObj.qnty;
      totalObj['data'] = filteredData;
      totalObj['date'] = dateFormat(filteredData.find((z: any) => z.contractData)?.contractData?.date, 'dd.mm.yy');
      totalObj['cur'] = filteredData[0]['cur'];
      totalObj['sType'] = settings?.Stocks?.Stocks?.find((x: any) => x.id === totalObj.stock)?.sType || '';
      totalObj['ind'] = parseFloat(key);
      totalObj['qnty'] = totalObj.qnty === 0 ? totalObj.qnty : parseFloat(totalObj.qnty).toFixed(3);

      if (totalObj.qnty * 1 > 0) newArr.push(totalObj);
    }
  }

  // funcs.js:371-380 — the supplier-less fallback (note: no Array.isArray guard
  // and no `?? '-'` here, unlike page.js:227-240).
  for (let i = 0; i < newArr.length; i++) {
    if (!newArr[i].supplier) {
      newArr[i] = {
        ...newArr[i],
        supplier: '-',
        descriptionName: newArr[i]?.data?.[0]?.productsData?.[0]?.description,
        total: '-',
      };
    }
  }
  return newArr;
};

/** app/(root)/stocks/sumtables/gradeTable.js:11 computeGradeSummary — verbatim. */
const webComputeGradeSummary = (dataTable: any[], settings: any): any[] => {
  if (!dataTable || dataTable.length === 0) return [];
  const gCur = (id: string) => settings?.Currency?.Currency?.find((q: any) => q.id === id)?.cur || id;
  const supName = (id: string) =>
    settings?.Supplier?.Supplier?.find((q: any) => q.id === id)?.nname || (id && id !== '-' ? String(id) : '(no supplier)');

  const groups: any = {};
  dataTable.forEach((row: any) => {
    const name = row.descriptionName || '-';
    const curId = row.cur || '';
    const key = `${name}|${curId}`;
    if (!groups[key]) {
      groups[key] = { descriptionName: name, curId, totalQnty: 0, totalValue: 0, bySupplier: {} };
    }
    const qty = parseFloat(row.qnty) || 0;
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0;
    groups[key].totalQnty += qty;
    groups[key].totalValue += val;
    const sup = supName(row.supplier);
    if (!groups[key].bySupplier[sup]) groups[key].bySupplier[sup] = { supplier: sup, qnty: 0, value: 0 };
    groups[key].bySupplier[sup].qnty += qty;
    groups[key].bySupplier[sup].value += val;
  });

  return Object.values(groups)
    .filter((r: any) => r.totalQnty > 0.1)
    .sort((a: any, b: any) => a.descriptionName.localeCompare(b.descriptionName))
    .map((r: any) => {
      const curCode = gCur(r.curId);
      const isoCode = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD';
      return {
        ...r,
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
        suppliers: Object.values(r.bySupplier)
          .filter((s: any) => s.qnty > 0.0005)
          .sort((a: any, b: any) => b.value - a.value),
      };
    });
};

/** app/(root)/stocks/storageAging.js:11-12 thresholds, and :25-65 byTerminal/staleRows. */
const WEB_STALE_DAYS = 60;
const WEB_DEMURRAGE_DAYS = 90;
const webStorageAging = (data: any[], stockName: (id: string) => string, today: number) => {
  const rows = (data || []).map((r: any) => {
    const arrival = webArrivalOf(r);
    const days = webDaysStored(arrival, today);
    return { ...r, _arrival: arrival, _days: days, _bucket: webBucketOf(days) };
  });

  const groups: any = {};
  rows.forEach((r: any) => {
    const key = r.stock || '—';
    if (!groups[key]) {
      groups[key] = {
        terminal: key,
        name: stockName(r.stock),
        count: 0,
        qty: 0,
        oldest: 0,
        buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, unknown: 0 },
      };
    }
    const g = groups[key];
    g.count += 1;
    g.qty += parseFloat(r.qnty) || 0;
    g.buckets[r._bucket] += 1;
    if (r._days != null && r._days > g.oldest) g.oldest = r._days;
  });

  const stale = rows.filter((r: any) => r._days != null && r._days >= WEB_STALE_DAYS).sort((a: any, b: any) => (b._days || 0) - (a._days || 0));

  return { byTerminal: Object.values(groups).sort((a: any, b: any) => b.oldest - a.oldest), staleRows: stale };
};

/** app/(root)/stocks/stockAudit.js:21 resolveDescName — verbatim. */
const webResolveDescName = (r: any): string => {
  const arr = Array.isArray(r?.productsData) ? r.productsData : [];
  if (r.type === 'in' && r.description) {
    return arr.find((p: any) => p.id === r.description)?.description || '';
  }
  if (r.mtrlStatus === 'select' || r.isSelection) {
    return arr.find((p: any) => p.id === r.descriptionId)?.description || '';
  }
  if (r.type === 'out' && r.moveType === 'out') {
    return r.descriptionName || '';
  }
  return r.descriptionText || r.descriptionName || '';
};

/** app/(root)/stocks/stockAudit.js:35 buildAudit — verbatim. */
const webBuildAudit = (stockData: any[], settings: any) => {
  const stockName = (id: string) => settings?.Stocks?.Stocks?.find((s: any) => s.id === id)?.nname || id || '(none)';
  const supplierName = (id: string) => settings?.Supplier?.Supplier?.find((s: any) => s.id === id)?.nname || '';

  const rows = (stockData || []).filter(Boolean);
  const isInvOut = (r: any) => r.type === 'out' && r.invoice !== undefined && r.invoice !== null && r.invoice !== '';
  const auditSource = [...rows.filter((r: any) => !isInvOut(r)), ...webFilteredArray(rows.filter(isInvOut))];

  const enriched = auditSource.map((r: any) => ({
    raw: r,
    id: r.id,
    type: r.type,
    stockId: r.stock,
    stockNm: stockName(r.stock),
    descId: r.description || r.descriptionId || '',
    descNm: webResolveDescName(r),
    qnty: parseFloat(r.qnty) || 0,
    finalqnty: r.finalqnty != null ? parseFloat(r.finalqnty) : null,
    unitPrc: parseFloat(r.unitPrc) || 0,
    cur: r.cur || '',
    supplier: supplierName(r.supplier),
    order: r.order || '',
    date: r.contractData?.date || r.date || '',
    invoice: r.invoice || '',
  }));

  const dupBuckets: any = {};
  enriched
    .filter((r) => r.type === 'out')
    .forEach((r) => {
      const k = `${r.stockId}|${r.descId}|${r.qnty.toFixed(3)}|${r.unitPrc}`;
      if (!dupBuckets[k]) dupBuckets[k] = [];
      dupBuckets[k].push(r);
    });
  const dupes = Object.values(dupBuckets)
    .filter((g: any) => g.length > 1)
    .flat()
    .sort((a: any, b: any) => (a.descNm || '').localeCompare(b.descNm || ''));

  const groupBuckets: any = {};
  enriched.forEach((r) => {
    const k = `${r.stockId}|${r.descId}`;
    if (!groupBuckets[k]) {
      groupBuckets[k] = {
        stockId: r.stockId,
        stockNm: r.stockNm,
        descId: r.descId,
        names: new Set(),
        inQty: 0,
        outQty: 0,
        inRows: 0,
        outRows: 0,
      };
    }
    if (r.descNm) groupBuckets[k].names.add(r.descNm);
    if (r.type === 'in') {
      const useQ = r.finalqnty != null && r.finalqnty !== r.qnty ? r.finalqnty : r.qnty;
      groupBuckets[k].inQty += Math.abs(useQ);
      groupBuckets[k].inRows += 1;
      if (!groupBuckets[k].rep || (r.unitPrc > 0 && !groupBuckets[k].rep.unitPrc)) {
        groupBuckets[k].rep = {
          unitPrc: r.unitPrc,
          cur: r.raw?.cur || '',
          supplierId: r.raw?.supplier || '',
          supplierNm: r.supplier,
          order: r.order,
        };
      }
    } else {
      groupBuckets[k].outQty += Math.abs(r.qnty);
      groupBuckets[k].outRows += 1;
    }
    const d = String(r.date || '');
    if (d && (!groupBuckets[k].lastDate || String(groupBuckets[k].lastDate) < d)) groupBuckets[k].lastDate = r.date;
  });
  const groupRows = Object.values(groupBuckets).map((g: any) => ({
    ...g,
    names: [...g.names].join(' / '),
    net: +(g.inQty - g.outQty).toFixed(3),
  }));

  const leftovers = groupRows
    .filter((g: any) => g.net > 0.0005 && g.inRows > 0)
    .map((g: any) => ({ ...g, value: g.net * (g.rep?.unitPrc || 0) }))
    .sort((a: any, b: any) => b.value - a.value);

  const over = groupRows
    .filter((g: any) => g.outQty > g.inQty + 0.1 && g.outRows > 0 && g.inRows > 0)
    .sort((a: any, b: any) => b.outQty - b.inQty - (a.outQty - a.inQty));

  const orphan = groupRows.filter((g: any) => g.inRows === 0 && g.outRows > 0 && g.outQty > 0.001).sort((a: any, b: any) => b.outQty - a.outQty);

  const zeroIn = enriched.filter((r) => r.type === 'in' && r.qnty === 0 && r.unitPrc > 0).sort((a, b) => b.unitPrc - a.unitPrc);

  return { left: leftovers, dupes, over, orphan, zeroIn, total: enriched.length };
};

/** app/(root)/stocks/whModal.js:52 addComma — verbatim (the symbol lookup inlined). */
const webAddComma = (nStr: any, addSymbol: boolean, symbol: string): string => {
  nStr += '';
  const x = nStr.split('.');
  let x1 = x[0];
  let x2 = x.length > 1 ? '.' + x[1] : '';
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, '$1,$2');
  }
  x2 = x2.length > 3 ? x2.substring(0, 4) : x2;
  return addSymbol ? symbol + x1 + x2 : x1 + x2;
};

/** app/(root)/stocks/sumtables/sumTable.js:8 showAmount — verbatim (cell value inlined). */
const webSumShowAmount = (value: any, cur: string): any =>
  Number(value)
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: cur, minimumFractionDigits: 2 }).format(value)
    : value;

/** app/(root)/storagecosts/page.js:142 expYear — verbatim. */
const webExpYear = (e: any): string => ((typeof e?.storageMonth === 'string' ? e.storageMonth : '') || webYm(e?.date) || '').slice(0, 4);

/** app/(root)/storagecosts/page.js:193 suggestWh — verbatim (expenses lifted to a param). */
const webSuggestWh = (e: any, expenses: any[]): string =>
  expenses.find((x: any) => x.id !== e.id && x.supplier && x.supplier === e.supplier && x.storageWh)?.storageWh || '';

/** app/(root)/storagecosts/page.js:117 whName — verbatim (`warehouses` lifted to a param). */
const webWhName = (warehouses: any[]) => (id: string): string => {
  const w = warehouses.find((k: any) => k.id === id);
  return w?.stock || w?.nname || '';
};

/** app/(root)/storagecosts/page.js:179-187 actuals — verbatim (memo body only). */
const webActuals = (expenses: any[], lots: any[], warehouses: any[], whName: (id: string) => string) => {
  const tagged = expenses.filter((e: any) => e.storageWh && e.storageMonth);
  const totalSpend = expenses.reduce((s: number, e: any) => s + webToUsd(parseFloat(e.amount) || 0, e.cur), 0);
  const whMt = warehouses
    .map((w: any) => ({ id: w.id, name: whName(w.id), mt: webMtInWh(lots, w.id, '') }))
    .filter((x: any) => x.mt > 0.01)
    .sort((a: any, b: any) => b.mt - a.mt);
  const totalMt = whMt.reduce((s: number, x: any) => s + x.mt, 0);
  return { totalSpend, count: expenses.length, taggedCount: tagged.length, whMt, totalMt };
};

/** app/(root)/storagecosts/page.js:157 perYear — verbatim (memo body only). */
const webPerYear = (allExpenses: any[], lots: any[], whName: (id: string) => string) => {
  const map: any = {};
  allExpenses.forEach((e: any) => {
    const y = webExpYear(e);
    if (y) (map[y] ||= []).push(e);
  });
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([y, list]: any) => {
      const taggedY = list.filter((e: any) => e.storageWh && e.storageMonth);
      const m = webComputeStorageMetric({ tagged: taggedY, lots, whName });
      const spend = list.reduce((s: number, e: any) => s + webToUsd(parseFloat(e.amount) || 0, e.cur), 0);
      return { year: y, spend, count: list.length, taggedCount: taggedY.length, mtMonths: m.totalMt, rate: m.overall };
    });
};

/**
 * newTable.js:105-109 + :548-554 — TanStack ORs the global filter across every
 * filterable column, and the footer's "of N" is the FILTERED row count.
 */
const webGlobalFilterKeeps = (formattedRow: any, term: string): boolean => {
  const cells = WEB_STOCK_COLUMNS.map((id) => ({ column: { id, columnDef: { meta: undefined } } }));
  const row = { getValue: (id: string) => formattedRow[id], getAllCells: () => cells };
  return WEB_STOCK_COLUMNS.some((id) => labelAwareGlobalFilter(row as any, id, term));
};

// ═════════════════════════════════════════════════════════════════════════════
// WORLDS
// ═════════════════════════════════════════════════════════════════════════════

const SETTINGS = makeSettings();

/** A ledger exercising netting, finalqnty, supersession, the 0.1 floor, EUR/KGS and a supplier-less lot. */
const ledger = () => [
  // wh-1 | prd-1 : 10 in − 4 out = 6 @ 1000 USD/MT
  makeStockLot(),
  makeStockOutLot(),
  // wh-1 | prd-2 : 20 in settled at 18
  makeStockLot({
    id: 'lot-2',
    invoice: 1002,
    description: 'prd-2',
    descriptionId: 'prd-2',
    qnty: '20',
    finalqnty: '18',
    unitPrc: '900',
    descriptionText: 'Cr Scrap 430',
    indDate: '2026-04-01',
    productsData: [makeProduct({ id: 'prd-2', description: 'Cr Scrap 430', qnty: '20', unitPrc: '900' })],
  }),
  // wh-2 | prd-3 : EUR / KGS lot with NO supplier → the '-' fallback row
  makeStockLot({
    id: 'lot-3',
    invoice: 1003,
    stock: 'wh-2',
    description: 'prd-3',
    descriptionId: 'prd-3',
    qnty: '5',
    unitPrc: '1500',
    cur: 'eu',
    qTypeTable: 'q-kgs',
    supplier: '',
    originSupplier: 'sup-2',
    descriptionText: 'Mo Scrap',
    indDate: '2026-01-05',
    productsData: [makeProduct({ id: 'prd-3', description: 'Mo Scrap', unitPrc: '1500' })],
  }),
  // wh-1 | prd-4 : 0.05 residual — under the stocks page's 0.1 floor
  makeStockLot({
    id: 'lot-4',
    invoice: 1004,
    description: 'prd-4',
    descriptionId: 'prd-4',
    qnty: '0.05',
    descriptionText: 'Residual',
    productsData: [makeProduct({ id: 'prd-4', description: 'Residual' })],
  }),
  // wh-1 | prd-5 : original invoice (30) superseded by its final note (28)
  makeStockLot({
    id: 'lot-5a',
    invoice: 1005,
    invType: INV_TYPE.invoiceId,
    description: 'prd-5',
    descriptionId: 'prd-5',
    qnty: '30',
    unitPrc: '800',
    descriptionText: 'W Scrap',
    productsData: [makeProduct({ id: 'prd-5', description: 'W Scrap', unitPrc: '800' })],
  }),
  makeStockLot({
    id: 'lot-5b',
    invoice: 1005,
    invType: INV_TYPE.finalId,
    description: 'prd-5',
    descriptionId: 'prd-5',
    qnty: '28',
    unitPrc: '800',
    descriptionText: 'W Scrap',
    productsData: [makeProduct({ id: 'prd-5', description: 'W Scrap', unitPrc: '800' })],
  }),
];

/** The fields both implementations produce for a row, normalised for comparison. */
const rowShape = (r: any) => ({
  id: r.id,
  order: r.order,
  supplier: r.supplier,
  originSupplier: r.originSupplier,
  stock: r.stock,
  descriptionName: r.descriptionName,
  qnty: Number(r.qnty),
  qTypeTable: r.qTypeTable,
  unitPrc: r.unitPrc,
  total: r.total,
  cur: r.cur,
  sType: r.sType,
});
const byId = (a: any, b: any) => String(a.id).localeCompare(String(b.id));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

// ═════════════════════════════════════════════════════════════════════════════
describe('drift alarm — every web formula mirrored below', () => {
  it.each([
    ['app/(root)/stocks/page.js', 'loadtStocks', HASH.loadtStocks],
    ['app/(root)/stocks/page.js', 'setTotals', HASH.setTotals],
    ['app/(root)/stocks/page.js', 'getFormatted', HASH.getFormatted],
    ['app/(root)/stocks/page.js', 'showWeight', HASH.showWeight],
    ['app/(root)/stocks/newTable.js', 'Customtable', HASH.customtable],
    ['app/(root)/stocks/whModal.js', 'addComma', HASH.addComma],
    ['app/(root)/stocks/sumtables/sumTable.js', 'showAmount', HASH.sumShowAmount],
    ['app/(root)/stocks/sumtables/gradeTable.js', 'computeGradeSummary', HASH.gradeSummary],
    ['app/(root)/stocks/stockAudit.js', 'buildAudit', HASH.buildAudit],
    ['app/(root)/stocks/stockAudit.js', 'resolveDescName', HASH.resolveDescName],
    ['utils/utils.js', 'filteredArray', HASH.filteredArray],
    ['app/(root)/cashflow/funcs.js', 'runStocks', HASH.runStocks],
    ['app/(root)/stocks/storageAging.js', 'STALE_DAYS', HASH.staleDays],
    ['app/(root)/stocks/storageAging.js', 'DEMURRAGE_DAYS', HASH.demurrageDays],
    ['app/(root)/storagecosts/page.js', 'expYear', HASH.storageExpYear],
    ['app/(root)/storagecosts/page.js', 'perYear', HASH.storagePerYear],
    ['app/(root)/storagecosts/page.js', 'suggestWh', HASH.storageSuggestWh],
    ['app/(root)/storagecosts/page.js', 'actuals', HASH.storageActuals],
    ['app/(root)/storagecosts/page.js', 'whName', HASH.storageWhName],
    ['components/table/filters/labelAwareGlobalFilter.js', 'labelAwareGlobalFilter', HASH.labelAwareGlobalFilter],
  ])('%s → %s is unchanged', (file, symbol, hash) => {
    expectWebUnchanged(file as string, symbol as string, hash as string);
  });

  it('web still ORs the global filter over the exact 11 stock columns mobile searches', () => {
    // page.js:91-129 propDefaults — the column list drives both the table AND
    // loadtStocks' fieldValues, so adding a column changes what is aggregated and
    // what is searchable. Read live rather than hashed so the failure names the column.
    const text = repoFileText('app/(root)/stocks/page.js');
    const start = text.indexOf('const propDefaults = useMemo(');
    const end = text.indexOf('], [ln]);', start);
    expect(start, 'web renamed/moved stocks propDefaults').toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const keys = [...text.slice(start, end).matchAll(/accessorKey:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(keys).toEqual(WEB_STOCK_COLUMNS);
    expect([...INVENTORY_FILTER_COLUMNS]).toEqual(keys);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 1 — mobile/src/shared/storageUtils.js is a true copy of web', () => {
  it('is byte-identical to app/(root)/storagecosts/storageUtils.js', () => {
    expect(repoFileText('mobile/src/shared/storageUtils.js')).toBe(
      repoFileText('app/(root)/storagecosts/storageUtils.js')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 2 — storage aging primitives (app/(root)/stocks/agingUtils.js)', () => {
  it('a day is 86,400,000 ms on both sides', () => {
    expect(MOBILE_DAY).toBe(WEB_DAY);
  });

  it('days stored counts WHOLE elapsed days, floored — a part-day is 0', () => {
    // agingUtils.js:32 Math.floor((now - arrival) / DAY)
    const now = FIXED_NOW.getTime();
    const partDay = '2026-08-06T23:00:00Z'; // 13h before the frozen clock
    expect(mobileDaysStored(partDay, now)).toBe(0);
    expect(mobileDaysStored(partDay, now)).toBe(webDaysStored(new Date(partDay), now));

    const sixty = '2026-06-08T12:00:00Z';
    expect(mobileDaysStored(sixty, now)).toBe(60);
    expect(mobileDaysStored(sixty, now)).toBe(webDaysStored(new Date(sixty), now));
  });

  it('no arrival means unknown age, not zero', () => {
    // agingUtils.js:32 — `arrival ? … : null`. A null must never read as "arrived today".
    expect(mobileDaysStored(null, FIXED_NOW.getTime())).toBeNull();
    expect(webDaysStored(null, FIXED_NOW.getTime())).toBeNull();
  });

  it.each([
    [null, 'unknown'],
    [0, '0-30'],
    [30, '0-30'],
    [31, '31-60'],
    [60, '31-60'],
    [61, '61-90'],
    [90, '61-90'],
    [91, '90+'],
  ])('an age of %s days falls in bucket %s on both sides', (days, bucket) => {
    // agingUtils.js:35-41 — the boundaries are INCLUSIVE upper bounds.
    expect(mobileBucketOf(days as any)).toBe(bucket);
    expect(webBucketOf(days as any)).toBe(bucket);
  });

  it('arrival is the earliest IN date of the group, ignoring OUT movements', () => {
    // agingUtils.js:17-29 arrivalOf — only `type === 'in'` (or untyped) rows count,
    // so shipping material out does not reset its age.
    const lots = [
      makeStockLot({ id: 'a', indDate: '2026-05-10' }),
      makeStockLot({ id: 'b', invoice: 2001, indDate: '2026-02-01' }),
      makeStockOutLot({ id: 'c', invoice: 2002, indDate: '2020-01-01' }), // must be ignored
    ];
    const { rows } = computeInventory(lots, SETTINGS);
    expect(rows).toHaveLength(1);
    const web = webArrivalOf(rows[0] as any);
    expect(new Date(rows[0].arrivalIso as string).getTime()).toBe(web!.getTime());
    expect(web!.toISOString()).toBe(new Date('2026-02-01').toISOString());
  });

  it('with no IN date at all, arrival falls back to the contract date', () => {
    // agingUtils.js:26-28.
    const lots = [makeStockLot({ indDate: '', contractData: { id: 'con-1', date: '2026-03-15' } })];
    const { rows } = computeInventory(lots, SETTINGS);
    expect(new Date(rows[0].arrivalIso as string).getTime()).toBe(webArrivalOf(rows[0] as any)!.getTime());
  });

  it('a {startDate} date object is normalised the same way as a plain string', () => {
    // agingUtils.js:8-13 dStr — stock dates arrive in both shapes.
    const lots = [makeStockLot({ indDate: { startDate: '2026-02-11', endDate: '2026-02-11' } })];
    const { rows } = computeInventory(lots, SETTINGS);
    expect(webDStr({ startDate: '2026-02-11' })).toBe('2026-02-11');
    expect(new Date(rows[0].arrivalIso as string).getTime()).toBe(webArrivalOf(rows[0] as any)!.getTime());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 4 — mobile hardens agingUtils against an unparseable arrival', () => {
  it('an unparseable arrival date is unknown on mobile where web yields NaN days', () => {
    // Web's daysStored (agingUtils.js:32) does the subtraction unguarded, so an
    // Invalid Date produces NaN, and NaN >= STALE_DAYS is false — the row silently
    // vanishes from the stale list instead of being reported as unknown. Mobile
    // guards with isNaN (aging.ts:10-12) and returns null, which bucketOf maps to
    // 'unknown'. Mobile is correct; this asserts the difference, not a fix to web.
    const now = FIXED_NOW.getTime();
    expect(webDaysStored(new Date('not-a-date'), now)).toBeNaN();
    expect(mobileDaysStored('not-a-date', now)).toBeNull();
    expect(mobileBucketOf(mobileDaysStored('not-a-date', now))).toBe('unknown');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — inventory aggregation (stocks page loadtStocks)', () => {
  it('produces the same rows as web for a ledger with netting, settlement and supersession', () => {
    const lots = ledger();
    const web = webLoadStocks(structuredClone(lots), SETTINGS).map(rowShape).sort(byId);
    const mobile = computeInventory(structuredClone(lots), SETTINGS).rows.map(rowShape).sort(byId);
    expect(mobile).toEqual(web);
  });

  it('an OUT lot is subtracted from its IN lot on the same (warehouse, description)', () => {
    // page.js:178-182 — `in` adds |qnty|, anything else subtracts qnty.
    const { rows } = computeInventory(ledger(), SETTINGS);
    const r = rows.find((x) => x.id === 'lot-1out')!; // last row of the group supplies the id
    expect(r.qnty).toBe(6); // 10 in − 4 out
    expect(r.total).toBe(6000); // 6 × 1000
  });

  it('a settled IN lot counts its finalqnty, not the quantity originally received', () => {
    // page.js:180-181 — |qnty| plus (qnty − finalqnty) × −1, i.e. the settled figure.
    const { rows } = computeInventory(ledger(), SETTINGS);
    expect(rows.find((x) => x.descriptionName === 'Cr Scrap 430')!.qnty).toBe(18); // 20 received, 18 settled
  });

  it('an original invoice is dropped when a final note exists for the same invoice number', () => {
    // page.js:169 filteredArray (utils/utils.js:207): within one invoice number,
    // only the highest invType survives — otherwise the tonnage is counted twice.
    const { rows } = computeInventory(ledger(), SETTINGS);
    const w = rows.find((x) => x.descriptionName === 'W Scrap')!;
    expect(w.qnty).toBe(28); // the final note's 28, NOT 30 and NOT 58
    expect(mobileFilteredArray(ledger().filter((l) => l.invoice === 1005))).toEqual(
      webFilteredArray(ledger().filter((l) => l.invoice === 1005))
    );
  });

  it('a residual under 0.1 is not on-hand stock', () => {
    // page.js:224 `newArr.filter(x => x.qnty * 1 > 0.1)`.
    const { rows } = computeInventory(ledger(), SETTINGS);
    expect(rows.some((x) => x.descriptionName === 'Residual')).toBe(false);
  });

  it('a lot with no supplier renders as "-" and reports no value at all', () => {
    // page.js:227-240 — supplier '-', description taken from the first product line,
    // and total blanked to '-' so a priceless row cannot inflate any sum.
    const { rows } = computeInventory(ledger(), SETTINGS);
    const r = rows.find((x) => x.id === 'lot-3')!;
    expect(r.supplier).toBe('-');
    expect(r.total).toBe('-');
    expect(r.descriptionName).toBe('Mo Scrap');
  });

  it('line value is computed from the unrounded quantity, before the 3-decimal display rounding', () => {
    // page.js:196 computes total, page.js:203 only THEN rounds qnty to 3 dp. Deriving
    // total from the rounded figure would drift by cents on every part-lot.
    const lots = [
      makeStockLot({ id: 'p1', qnty: '3.33335', unitPrc: '1000' }),
      makeStockLot({ id: 'p2', invoice: 1099, qnty: '6.66670', unitPrc: '1000' }),
    ];
    const web = webLoadStocks(structuredClone(lots), SETTINGS);
    const { rows } = computeInventory(structuredClone(lots), SETTINGS);
    expect(rows[0].total).toBe(web[0].total);
    expect(rows[0].total).toBeCloseTo(10000.05, 6); // 10.00005 × 1000, not 10.000 × 1000
    expect(rows[0].qnty).toBe(10); // displayed at 3 dp
  });

  it('a zero-quantity balancing row never overwrites the real unit price', () => {
    // page.js:183 — the field copy is gated on `parseFloat(currentObj.qnty) > 0`,
    // so a 0-qnty settlement row cannot push its invoice total into unitPrc.
    const lots = [
      makeStockLot({ id: 'z1', qnty: '10', unitPrc: '1000' }),
      makeStockLot({ id: 'z2', invoice: 1098, qnty: '0', unitPrc: '999999' }),
    ];
    const web = webLoadStocks(structuredClone(lots), SETTINGS).map(rowShape);
    const mobile = computeInventory(structuredClone(lots), SETTINGS).rows.map(rowShape);
    expect(mobile).toEqual(web);
    expect(mobile[0].unitPrc).toBe('1000');
  });

  it('lots with no warehouse assigned are not inventory on the stocks page', () => {
    // page.js:157 `stockData.filter(q => q.stock !== '')`.
    const lots = [makeStockLot({ id: 'nowh', stock: '' })];
    expect(computeInventory(lots, SETTINGS).rows).toHaveLength(0);
    expect(webLoadStocks(structuredClone(lots), SETTINGS)).toHaveLength(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 4 — the fabricated stock date', () => {
  it('a lot with no contract date renders blank on mobile where web prints TODAY', () => {
    // page.js:199 `dateFormat(undefined, 'dd.mm.yy')` — dateformat substitutes the
    // current date for a missing one, so every undated lot claims to have arrived
    // today. Mobile returns '' (aggregate.ts:52). MOBILE IS CORRECT; this pins the
    // difference so nobody "fixes" mobile into reproducing the fabrication.
    const lots = [makeStockLot({ contractData: undefined })];
    const web = webLoadStocks(structuredClone(lots), SETTINGS);
    const { rows } = computeInventory(structuredClone(lots), SETTINGS);
    expect(web[0].date).toBe(dateFormat(undefined as any, 'dd.mm.yy')); // = today, frozen
    expect(rows[0].date).toBe('');
  });

  it('when the contract date exists both sides print the same dd.mm.yy', () => {
    const lots = [makeStockLot()];
    const web = webLoadStocks(structuredClone(lots), SETTINGS);
    const { rows } = computeInventory(structuredClone(lots), SETTINGS);
    expect(rows[0].date).toBe(web[0].date);
  });

  it('an unresolvable description is blank on mobile where web leaves it undefined', () => {
    // page.js:149-153 has no `|| ''` fallback, so a lot whose description id is not
    // in productsData yields `undefined` and renders as an empty cell anyway; mobile
    // normalises to '' (aggregate.ts:62). Same on screen, different in the search
    // haystack — String(undefined) would be searchable as "undefined".
    const lots = [makeStockLot({ description: 'missing', descriptionId: 'missing' })];
    const web = webLoadStocks(structuredClone(lots), SETTINGS);
    const { rows } = computeInventory(structuredClone(lots), SETTINGS);
    expect(web[0].descriptionName).toBeUndefined();
    expect(rows[0].descriptionName).toBe('');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — Summary Stocks totals (stocks page setTotals)', () => {
  it('sums quantity and value per (warehouse, weight type, currency)', () => {
    const rows = computeInventory(ledger(), SETTINGS).rows;
    expect(mobileSetTotals(rows)).toEqual(webSetTotals(rows));
  });

  it('a valueless "-" row still counts its tonnage but contributes nothing to value', () => {
    // page.js:273 `z.total += item.total === '-' ? 0 : parseFloat(item.total)` while
    // :272 adds the quantity unconditionally.
    const rows = computeInventory(ledger(), SETTINGS).rows;
    const eurRow = mobileSetTotals(rows).find((t) => t.cur === 'eu')!;
    expect(eurRow.qnty).toBe(5); // the supplier-less EUR lot's tonnage is real
    expect(eurRow.total).toBe(0); // its value is not
    expect(mobileSetTotals(rows)).toEqual(webSetTotals(rows));
  });

  it('two currencies in one warehouse stay in separate totals rows', () => {
    // page.js:265-269 keys the group on cur AND qTypeTable AND stock.
    const lots = [
      makeStockLot({ id: 'u', qnty: '10', unitPrc: '100', cur: 'us' }),
      makeStockLot({ id: 'e', invoice: 1200, description: 'prd-9', descriptionId: 'prd-9', qnty: '10', unitPrc: '100', cur: 'eu', descriptionText: 'Alloy', productsData: [makeProduct({ id: 'prd-9', description: 'Alloy' })] }),
    ];
    const rows = computeInventory(lots, SETTINGS).rows;
    const totals = mobileSetTotals(rows);
    expect(totals).toHaveLength(2);
    expect(totals).toEqual(webSetTotals(rows));
  });

  it('totals follow the search box — they are recomputed from the filtered rows', () => {
    // newTable.js:119-123 pushes the filtered row model up to page.js:255-260, which
    // re-runs setTotals on it. A total beside a filtered list must describe that list.
    const rows = computeInventory(ledger(), SETTINGS).rows.map((r) => formatInventoryRow(r, SETTINGS));
    const filtered = filterInventoryRows(rows, 'Antwerp');
    expect(filtered.length).toBeLessThan(rows.length);
    expect(mobileSetTotals(filtered as any)).toEqual(webSetTotals(filtered));
    expect(mobileSetTotals(filtered as any)).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — id → label resolution (stocks page getFormatted)', () => {
  const rows = () => computeInventory(ledger(), SETTINGS).rows;

  it('resolves supplier, original supplier, warehouse, currency and weight type to the same labels as web', () => {
    // page.js:317-325. Mobile keeps the raw ids and adds parallel *Name fields
    // (aggregate.ts:252-265) because setTotals still groups on the ids — so the
    // VALUES must match even though the field names differ.
    const web = webGetFormatted(rows(), SETTINGS).sort(byId);
    const mobile = rows().map((r) => formatInventoryRow(r, SETTINGS)).sort(byId);
    mobile.forEach((m, i) => {
      expect(m.supplierName).toBe(web[i].supplier);
      expect(m.originSupplierName).toBe(web[i].originSupplier);
      expect(m.warehouseName).toBe(web[i].stock);
      expect(m.curLabel).toBe(web[i].cur);
      expect(m.qTypeLabel).toBe(web[i].qTypeTable);
    });
  });

  it('a supplier-less row keeps its literal "-" instead of resolving to a blank name', () => {
    // page.js:320 `row.supplier !== '-' ? gQ(...) : '-'`.
    const r = rows().find((x) => x.id === 'lot-3')!;
    expect(formatInventoryRow(r, SETTINGS).supplierName).toBe('-');
    expect(webGetFormatted([r], SETTINGS)[0].supplier).toBe('-');
  });

  it('an id that is not in settings resolves to an empty label, never to the id', () => {
    // page.js:315 `?.[x] || ''` — showing a raw Firestore id in a cell is the bug
    // this guards against.
    const r = { ...rows()[0], stock: 'wh-gone', originSupplier: 'sup-gone' };
    const m = formatInventoryRow(r as any, SETTINGS);
    expect(m.warehouseName).toBe('');
    expect(m.originSupplierName).toBe('');
    expect(m.warehouseName).toBe(webGetFormatted([r], SETTINGS)[0].stock);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 2 — the search box matches every column web searches', () => {
  const formatted = () => computeInventory(ledger(), SETTINGS).rows.map((r) => formatInventoryRow(r, SETTINGS));
  const webRows = () => webGetFormatted(webLoadStocks(ledger(), SETTINGS), SETTINGS);

  it('mobile keeps exactly the rows web keeps, for every column-targeted term', () => {
    const terms = ['PO-2026-001', 'Acme', 'Bravo Alloys', 'Antwerp', 'Rotterdam', 'Cr Scrap', 'KGS', '1500', 'third', 'own', '18.000', 'nothing-matches-this'];
    for (const term of terms) {
      const mobileIds = filterInventoryRows(formatted(), term).map((r: any) => r.id).sort();
      const webIds = webRows().filter((r) => webGlobalFilterKeeps(r, term)).map((r) => r.id).sort();
      expect(mobileIds, `term "${term}"`).toEqual(webIds);
    }
  });

  it('the two columns hidden by default are still searchable', () => {
    // page.js:307 hides `date` and `originSupplier`, but column VISIBILITY does not
    // remove a column from TanStack's filter model — web finds them, so mobile must.
    const rows = formatted();
    expect(inventoryFilterValues(rows[0])).toHaveLength(WEB_STOCK_COLUMNS.length);
    const byOriginSupplier = filterInventoryRows(rows, 'Bravo Alloys');
    expect(byOriginSupplier.map((r: any) => r.id)).toEqual(['lot-3']);
    expect(webRows().filter((r) => webGlobalFilterKeeps(r, 'Bravo Alloys')).map((r) => r.id)).toEqual(['lot-3']);
  });

  it('quantity is searchable as the 3-decimal figure the table shows', () => {
    // page.js:288 showWeight formats to 3 dp, and the underlying value web filters
    // on is already the :203 toFixed(3) string. Mobile stores a number, so it has to
    // re-derive that string (display.ts inventoryFilterValues).
    const rows = formatted();
    expect(filterInventoryRows(rows, '18.000').map((r: any) => r.descriptionName)).toEqual(['Cr Scrap 430']);
    expect(filterInventoryRows(rows, '18.0').length).toBe(1);
  });

  it('the search is case-insensitive and trims the term', () => {
    // labelAwareGlobalFilter.js:6 `.toLowerCase().trim()`.
    const rows = formatted();
    expect(filterInventoryRows(rows, '  ANTWERP  ').map((r: any) => r.id)).toEqual(
      filterInventoryRows(rows, 'antwerp').map((r: any) => r.id)
    );
  });

  it('an empty search shows everything', () => {
    // labelAwareGlobalFilter.js:7 `if (!search) return true`.
    const rows = formatted();
    expect(filterInventoryRows(rows, '   ')).toHaveLength(rows.length);
  });

  it('the item count reports the filtered row total, not the ledger total', () => {
    // newTable.js:548-554 footer: "…of {getFilteredRowModel().rows.length}". The
    // count must be the FILTERED length for every term, not just a lucky one.
    const rows = formatted();
    expect(rows.length).toBeGreaterThan(1);
    for (const term of ['Antwerp', 'Scrap', 'Acme', 'nothing-matches-this', '']) {
      const mobileCount = filterInventoryRows(rows, term).length;
      const webCount = webRows().filter((r) => webGlobalFilterKeeps(r, term)).length;
      expect(mobileCount, `term "${term}"`).toBe(webCount);
    }
  });

  it('the term must fit inside ONE column — it may not straddle two adjacent columns', () => {
    // labelAwareGlobalFilter.js:17 tests `String(resolved).includes(search)` ONCE PER
    // COLUMN and TanStack ORs the results, so no web row can ever match text that
    // spans a column boundary. Mobile used to join the 11 column values into a single
    // space-separated haystack and substring-match that, which made
    // "rotterdam ni scrap" (warehouse + grade) hit a row web does not return.
    const rows = formatted();
    const spanning = 'rotterdam ni scrap'; // warehouseName then descriptionName
    expect(webRows().filter((r) => webGlobalFilterKeeps(r, spanning))).toHaveLength(0);
    expect(filterInventoryRows(rows, spanning)).toHaveLength(0);
    // …while each half on its own still matches, so this is not just an empty result.
    expect(filterInventoryRows(rows, 'rotterdam').length).toBeGreaterThan(0);
    expect(filterInventoryRows(rows, 'ni scrap').length).toBeGreaterThan(0);
  });

  it('every column value is matched independently, term by term, against web', () => {
    // Exhaustive: for each row, each of the 11 column values, take a substring of it
    // and require mobile and web to agree on which rows survive. This is the general
    // form of the hand-picked term list above — it cannot be satisfied by a haystack.
    const rows = formatted();
    const web = webRows();
    const terms = new Set<string>();
    rows.forEach((r) =>
      inventoryFilterValues(r).forEach((v) => {
        const s = String(v ?? '');
        if (s.length >= 3) {
          terms.add(s);
          terms.add(s.slice(0, 3));
          terms.add(s.slice(-3));
        }
      })
    );
    expect(terms.size).toBeGreaterThan(20); // the loop above really produced work
    for (const term of terms) {
      expect(filterInventoryRows(rows, term).map((r: any) => r.id).sort(), `term "${term}"`).toEqual(
        web.filter((r) => webGlobalFilterKeeps(r, term)).map((r) => r.id).sort()
      );
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — cashflow mode (cashflow/funcs.js runStocks)', () => {
  it('zero-value and draft lots never reach the cashflow paid/unpaid split', () => {
    // funcs.js:189-190 — the ledger is filtered BEFORE aggregation. `total !== 0`
    // is a strict comparison, so the STRING '0' survives it.
    const lots = [
      makeStockLot({ id: 'keep' }),
      makeStockLot({ id: 'zero', total: 0 }),
      makeStockLot({ id: 'strZero', total: '0' }),
      makeStockLot({ id: 'draft', draft: true }),
      makeStockLot({ id: 'notDraft', draft: false }),
    ];
    expect(cashflowStockLots(lots).map((l: any) => l.id)).toEqual(
      webRunStocksPreFilter(lots).map((l: any) => l.id)
    );
    expect(cashflowStockLots(lots).map((l: any) => l.id)).toEqual(['keep', 'strZero', 'notDraft']);
  });

  it('cashflow keeps every positive residual where the stocks page hides sub-0.1 lots', () => {
    // funcs.js:364 `if (totalObj.qnty * 1 > 0)` vs page.js:224 `> 0.1`.
    const lots = [makeStockLot({ id: 'tiny', qnty: '0.05' })];
    expect(computeInventory(lots, SETTINGS).rows).toHaveLength(0);
    expect(computeInventory(lots, SETTINGS, { minQnty: 0, cashflow: true }).rows).toHaveLength(1);
  });

  it('cashflow values a lot at the contract line price, the stocks page at the lot price', () => {
    // funcs.js:352-355 overrides unitPrc from productsData; page.js has no such step.
    const lots = [
      makeStockLot({
        id: 'pr',
        unitPrc: '1000',
        productsData: [makeProduct({ id: 'prd-1', unitPrc: '1250' })],
      }),
    ];
    expect(computeInventory(lots, SETTINGS).rows[0].unitPrc).toBe('1000');
    const cf = computeInventory(lots, SETTINGS, { minQnty: 0, cashflow: true }).rows[0];
    expect(cf.unitPrc).toBe('1250');
    expect(cf.total).toBe(12500);
  });

  it('a contract line price that is not a numeric STRING is rejected, keeping the lot price', () => {
    // funcs.js:354 gates on isNumber (:314), which returns false for a non-string and
    // for anything that is not wholly numeric. A parseFloat-based check would accept
    // the number 1250 and would read '1,250' as 1 — both mis-value the whole lot.
    const numeric = [makeStockLot({ id: 'n', unitPrc: '1000', productsData: [makeProduct({ id: 'prd-1', unitPrc: 1250 as any })] })];
    const grouped = [makeStockLot({ id: 'g', unitPrc: '1000', productsData: [makeProduct({ id: 'prd-1', unitPrc: '1,250' })] })];
    for (const lots of [numeric, grouped]) {
      const web = webRunStocksRows(structuredClone(lots), SETTINGS);
      const mobile = computeInventory(structuredClone(lots), SETTINGS, { minQnty: 0, cashflow: true }).rows;
      expect(mobile[0].unitPrc).toBe(web[0].unitPrc);
      expect(mobile[0].unitPrc).toBe('1000');
    }
  });

  it('cashflow counts lots that have no warehouse assigned; the stocks page does not', () => {
    // funcs.js:314 keys off EVERY distinct `stock` value — '' included — whereas
    // page.js:157 filters those lots out. Dropping them on the cashflow side made
    // mobile's Stocks (Paid/UnPaid) totals lower than web's.
    const lots = [
      makeStockLot({ id: 'nowh', stock: '', qnty: '7', unitPrc: '100', productsData: [makeProduct({ id: 'prd-1', unitPrc: '' })] }),
    ];
    expect(computeInventory(lots, SETTINGS).rows).toHaveLength(0);
    const cf = computeInventory(structuredClone(lots), SETTINGS, { minQnty: 0, cashflow: true }).rows;
    const web = webRunStocksRows(structuredClone(lots), SETTINGS);
    expect(cf).toHaveLength(1);
    expect(cf.map(rowShape)).toEqual(web.map(rowShape));
    expect(cf[0].total).toBe(700);
  });

  it('cashflow copies the in-lot fields with no quantity guard, so a 0-qnty row can set the price', () => {
    // funcs.js:342 has no `parseFloat(currentObj.qnty) > 0` — page.js:183 does. The
    // last in-row wins, whatever its quantity.
    // productsData carries a blank price so the contract-line override (funcs.js:354)
    // stays out of the way; this test is about the field copy only.
    const noPrice = [makeProduct({ id: 'prd-1', unitPrc: '' })];
    const lots = [
      makeStockLot({ id: 'c1', qnty: '10', unitPrc: '1000', productsData: noPrice }),
      makeStockLot({ id: 'c2', invoice: 1097, qnty: '0', unitPrc: '5', productsData: noPrice }),
    ];
    const web = webRunStocksRows(structuredClone(lots), SETTINGS);
    const mobile = computeInventory(structuredClone(lots), SETTINGS, { minQnty: 0, cashflow: true }).rows;
    expect(mobile.map(rowShape)).toEqual(web.map(rowShape));
    expect(mobile[0].unitPrc).toBe('5');
  });

  it('cashflow line value uses the raw summed quantity, before the 3-decimal rounding', () => {
    // funcs.js:355 total, funcs.js:363 qnty toFixed(3) — in that order.
    const noPrice = [makeProduct({ id: 'prd-1', unitPrc: '' })];
    const lots = [
      makeStockLot({ id: 'r1', qnty: '3.33335', unitPrc: '1000', productsData: noPrice }),
      makeStockLot({ id: 'r2', invoice: 1096, qnty: '6.66670', unitPrc: '1000', productsData: noPrice }),
    ];
    const web = webRunStocksRows(structuredClone(lots), SETTINGS);
    const mobile = computeInventory(structuredClone(lots), SETTINGS, { minQnty: 0, cashflow: true }).rows;
    expect(mobile[0].total).toBe(web[0].total);
    expect(mobile[0].total).toBeCloseTo(10000.05, 6);
  });

  it('reproduces web runStocks row-for-row on the full ledger', () => {
    const lots = cashflowStockLots(ledger());
    const web = webRunStocksRows(structuredClone(lots), SETTINGS).map(rowShape).sort(byId);
    const mobile = computeInventory(structuredClone(lots), SETTINGS, { minQnty: 0, cashflow: true }).rows.map(rowShape).sort(byId);
    expect(mobile).toEqual(web);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — avg cost per grade (sumtables/gradeTable.js computeGradeSummary)', () => {
  const rows = () => computeInventory(ledger(), SETTINGS).rows;
  const webPick = (r: any) => ({
    descriptionName: r.descriptionName,
    curId: r.curId,
    totalQnty: r.totalQnty,
    totalValue: r.totalValue,
    avgPrice: r.avgPrice,
    isoCode: r.isoCode,
    suppliers: r.suppliers,
  });

  it('matches web grade for grade on the same rows', () => {
    expect(mobileGradeSummary(rows(), SETTINGS)).toEqual(webComputeGradeSummary(rows(), SETTINGS).map(webPick));
  });

  it('the average cost is value ÷ quantity, weighted across every lot of the grade', () => {
    // gradeTable.js:46 — a straight mean of the lot prices would be wrong whenever
    // the lots differ in size.
    // Two warehouses so they stay two inventory rows of the SAME grade.
    const lots = [
      makeStockLot({ id: 'w1', stock: 'wh-1', qnty: '10', unitPrc: '1000' }),
      makeStockLot({ id: 'w2', stock: 'wh-2', invoice: 1300, qnty: '30', unitPrc: '2000' }),
    ];
    const rws = computeInventory(lots, SETTINGS).rows;
    const g = mobileGradeSummary(rws, SETTINGS)[0];
    expect(g.totalQnty).toBe(40);
    expect(g.avgPrice).toBe(70000 / 40); // 1750, not (1000+2000)/2
    expect(mobileGradeSummary(rws, SETTINGS)).toEqual(webComputeGradeSummary(rws, SETTINGS).map(webPick));
  });

  it('the same grade in two currencies is two grades, never one blended figure', () => {
    // gradeTable.js:24 keys on `${descriptionName}|${curId}`.
    const lots = [
      makeStockLot({ id: 'du', stock: 'wh-1', qnty: '10', unitPrc: '1000', cur: 'us' }),
      makeStockLot({ id: 'de', stock: 'wh-2', invoice: 1301, qnty: '10', unitPrc: '900', cur: 'eu' }),
    ];
    const rws = computeInventory(lots, SETTINGS).rows;
    const g = mobileGradeSummary(rws, SETTINGS);
    expect(g).toHaveLength(2);
    expect(g.map((x) => x.isoCode).sort()).toEqual(['EUR', 'USD']);
    expect(g).toEqual(webComputeGradeSummary(rws, SETTINGS).map(webPick));
  });

  it('a "-" valued lot adds tonnage but no value, dragging the grade average down', () => {
    // gradeTable.js:29 `row.total === '-' ? 0 : …` with :28 counting the quantity.
    const rws = rows();
    const mo = mobileGradeSummary(rws, SETTINGS).find((g) => g.descriptionName === 'Mo Scrap')!;
    expect(mo.totalQnty).toBe(5);
    expect(mo.totalValue).toBe(0);
    expect(mo.avgPrice).toBe(0);
  });

  it('a grade totalling 0.1 or less is not reported', () => {
    // gradeTable.js:39 `.filter(r => r.totalQnty > 0.1)`.
    const rws = [{ descriptionName: 'Dust', cur: 'us', supplier: 'sup-1', qnty: 0.09, total: 90 }];
    expect(mobileGradeSummary(rws as any, SETTINGS)).toEqual([]);
    expect(webComputeGradeSummary(rws, SETTINGS)).toEqual([]);
  });

  it('the supplier split is ordered by value and drops dust-sized contributions', () => {
    // gradeTable.js:48-50 — filter qnty > 0.0005, sort by value descending.
    const rws = [
      { descriptionName: 'Ni Scrap 304', cur: 'us', supplier: 'sup-1', qnty: 5, total: 5000 },
      { descriptionName: 'Ni Scrap 304', cur: 'us', supplier: 'sup-2', qnty: 20, total: 20000 },
      { descriptionName: 'Ni Scrap 304', cur: 'us', supplier: 'sup-1', qnty: 0.0001, total: 1 },
    ];
    const g = mobileGradeSummary(rws as any, SETTINGS)[0];
    expect(g.suppliers.map((s) => s.supplier)).toEqual(['Bravo Alloys', 'Acme Metals']);
    expect(mobileGradeSummary(rws as any, SETTINGS)).toEqual(webComputeGradeSummary(rws, SETTINGS).map(webPick));
  });

  it('an unknown supplier keeps its id while a "-" row is labelled "(no supplier)"', () => {
    // gradeTable.js:15-16.
    const rws = [
      { descriptionName: 'X', cur: 'us', supplier: 'sup-ghost', qnty: 5, total: 500 },
      { descriptionName: 'X', cur: 'us', supplier: '-', qnty: 5, total: 500 },
    ];
    const g = mobileGradeSummary(rws as any, SETTINGS)[0];
    expect(g.suppliers.map((s) => s.supplier).sort()).toEqual(['(no supplier)', 'sup-ghost']);
    expect(mobileGradeSummary(rws as any, SETTINGS)).toEqual(webComputeGradeSummary(rws, SETTINGS).map(webPick));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — storage aging by terminal (stocks/storageAging.js)', () => {
  const stockName = (id: string) => SETTINGS.Stocks.Stocks.find((s: any) => s.id === id)?.nname || id || '—';

  it('uses the same stale and demurrage thresholds as web', () => {
    // storageAging.js:11-12.
    expect(MOBILE_STALE_DAYS).toBe(WEB_STALE_DAYS);
    expect(MOBILE_DEMURRAGE_DAYS).toBe(WEB_DEMURRAGE_DAYS);
  });

  it('groups by terminal with the same counts, tonnage, buckets and oldest age as web', () => {
    const rows = computeInventory(ledger(), SETTINGS).rows;
    const web = webStorageAging(rows, stockName, FIXED_NOW.getTime());
    const mobile = computeAging(rows, stockName, FIXED_NOW.getTime());
    expect(mobile.byTerminal).toEqual(web.byTerminal);
  });

  it('terminals are ordered by their oldest cargo, worst first', () => {
    // storageAging.js:62 `.sort((a, b) => b.oldest - a.oldest)`.
    const rows = computeInventory(ledger(), SETTINGS).rows;
    const mobile = computeAging(rows, stockName, FIXED_NOW.getTime());
    const ages = mobile.byTerminal.map((t) => t.oldest);
    expect([...ages]).toEqual([...ages].sort((a, b) => b - a));
    expect(mobile.byTerminal[0].name).toBe('Antwerp'); // the January arrival
  });

  it('cargo sitting 60 days or more is stale, and the list is oldest first', () => {
    // storageAging.js:45-47.
    const rows = computeInventory(ledger(), SETTINGS).rows;
    const web = webStorageAging(rows, stockName, FIXED_NOW.getTime());
    const mobile = computeAging(rows, stockName, FIXED_NOW.getTime());
    expect(mobile.staleRows.map((r) => r.id)).toEqual(web.staleRows.map((r: any) => r.id));
    expect(mobile.staleRows.map((r) => r.days)).toEqual(web.staleRows.map((r: any) => r._days));
    expect(mobile.staleRows[0].days).toBeGreaterThanOrEqual(MOBILE_STALE_DAYS);
  });

  it('exactly 60 days old IS stale — the threshold is inclusive', () => {
    // storageAging.js:46 `_days >= STALE_DAYS`, not `>`. The boundary is the whole
    // point of the rule: a `>` would let a cargo sit its 60th day unreported, and the
    // ledger above happens to contain nothing at exactly 60 days, so it is built here.
    const lots = [
      makeStockLot({ id: 'day59', indDate: '2026-06-09T12:00:00Z' }), // 59 days
      makeStockLot({
        id: 'day60',
        invoice: 7001,
        description: 'prd-60',
        descriptionId: 'prd-60',
        indDate: '2026-06-08T12:00:00Z', // exactly 60 days before FIXED_NOW
        descriptionText: 'Sixty',
        productsData: [makeProduct({ id: 'prd-60', description: 'Sixty' })],
      }),
    ];
    const rows = computeInventory(lots, SETTINGS).rows;
    expect(rows.map((r) => mobileDaysStored(r.arrivalIso, FIXED_NOW.getTime())).sort()).toEqual([59, 60]);
    const web = webStorageAging(rows, stockName, FIXED_NOW.getTime());
    const mobile = computeAging(rows, stockName, FIXED_NOW.getTime());
    expect(mobile.staleRows.map((r) => r.days)).toEqual([60]); // the 59-day lot is not stale
    expect(mobile.staleRows.map((r) => r.days)).toEqual(web.staleRows.map((r: any) => r._days));
  });

  it('a lot with no arrival at all lands in the unknown bucket and never in the stale list', () => {
    // storageAging.js:41 buckets[r._bucket] with bucketOf(null) === 'unknown', and
    // :46 requires `_days != null`.
    const lots = [makeStockLot({ indDate: '', contractData: undefined })];
    const rows = computeInventory(lots, SETTINGS).rows;
    const web = webStorageAging(rows, stockName, FIXED_NOW.getTime());
    const mobile = computeAging(rows, stockName, FIXED_NOW.getTime());
    expect(mobile.byTerminal[0].buckets.unknown).toBe(1);
    expect(mobile.byTerminal).toEqual(web.byTerminal);
    expect(mobile.staleRows).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — stock audit (stocks/stockAudit.js buildAudit)', () => {
  // `finalqnty: null` = never settled. It matters: stockAudit.js:57 keeps the value
  // when it is `!= null`, and parseFloat('') is NaN, not null — see the empty-string
  // trap test below.
  const auditLedger = () => [
    // real leftover: 10 in, 4 out → 6 remaining @1000
    makeStockLot({ id: 'a-in', finalqnty: null }),
    makeStockOutLot({ id: 'a-out', finalqnty: null }),
    // an invoice and its final note both write off the same line — by design, not a duplicate
    makeStockOutLot({ id: 'b-out-orig', invoice: 5001, invType: INV_TYPE.invoiceId, description: 'prd-2', descriptionId: 'prd-2', qnty: '3', finalqnty: null }),
    makeStockOutLot({ id: 'b-out-final', invoice: 5001, invType: INV_TYPE.finalId, description: 'prd-2', descriptionId: 'prd-2', qnty: '3', finalqnty: null }),
    makeStockLot({ id: 'b-in', invoice: 5000, description: 'prd-2', descriptionId: 'prd-2', qnty: '10', unitPrc: '900', finalqnty: null }),
    // over-shipped: 2 in, 5 out
    makeStockLot({ id: 'c-in', invoice: 5002, description: 'prd-3', descriptionId: 'prd-3', qnty: '2', finalqnty: null }),
    makeStockOutLot({ id: 'c-out', invoice: 5003, description: 'prd-3', descriptionId: 'prd-3', qnty: '5', finalqnty: null }),
    // orphan out: no in at all
    makeStockOutLot({ id: 'd-out', invoice: 5004, description: 'prd-4', descriptionId: 'prd-4', qnty: '4', finalqnty: null }),
    // zero-qnty in with a price
    makeStockLot({ id: 'e-in', invoice: 5005, description: 'prd-5', descriptionId: 'prd-5', qnty: '0', unitPrc: '750', finalqnty: null }),
    // two genuinely identical manual outs (no invoice ⇒ never deduped)
    makeStockOutLot({ id: 'f-out1', invoice: '', description: 'prd-6', descriptionId: 'prd-6', qnty: '2', unitPrc: '100', finalqnty: null }),
    makeStockOutLot({ id: 'f-out2', invoice: '', description: 'prd-6', descriptionId: 'prd-6', qnty: '2', unitPrc: '100', finalqnty: null }),
    makeStockLot({ id: 'f-in', invoice: 5006, description: 'prd-6', descriptionId: 'prd-6', qnty: '10', unitPrc: '100', finalqnty: null }),
  ];

  const stripRaw = (r: any) => {
    const { raw, ...rest } = r;
    return rest;
  };

  it('reproduces web buildAudit on every tab', () => {
    const lots = auditLedger();
    const web = webBuildAudit(structuredClone(lots), SETTINGS);
    const mobile = buildAudit(structuredClone(lots), SETTINGS);
    expect(mobile.total).toBe(web.total);
    expect(mobile.left).toEqual(web.left);
    expect(mobile.over).toEqual(web.over);
    expect(mobile.orphan).toEqual(web.orphan);
    expect(mobile.dupes.map(stripRaw)).toEqual(web.dupes.map(stripRaw));
    expect(mobile.zeroIn.map(stripRaw)).toEqual(web.zeroIn.map(stripRaw));
  });

  it('an invoice and its final note are one write-off, not a duplicate', () => {
    // stockAudit.js:44-46 — invoice-linked OUTs go through filteredArray first, so a
    // by-design original+note pair does not surface as a duplicate or as over-shipped.
    const mobile = buildAudit(auditLedger(), SETTINGS);
    expect(mobile.dupes.map((d: any) => d.id).sort()).toEqual(['f-out1', 'f-out2']);
    expect(mobile.dupes.some((d: any) => String(d.id).startsWith('b-out'))).toBe(false);
  });

  it('a manual OUT with no invoice reference is never deduped away', () => {
    // stockAudit.js:45 isInvOut requires a non-empty invoice.
    const mobile = buildAudit(auditLedger(), SETTINGS);
    const web = webBuildAudit(auditLedger(), SETTINGS);
    expect(mobile.total).toBe(web.total);
    const f = mobile.left.find((g: any) => g.descId === 'prd-6')!;
    expect(f.outRows).toBe(2); // both manual outs survived
    expect(f.net).toBe(6); // 10 in − 2 − 2
  });

  it('leftovers are valued at the representative in-lot price and ordered by value', () => {
    // stockAudit.js:121-124 — net × rep.unitPrc, biggest exposure first.
    const mobile = buildAudit(auditLedger(), SETTINGS);
    const a = mobile.left.find((g: any) => g.descId === 'prd-1')!;
    expect(a.net).toBe(6);
    expect(a.value).toBe(6000);
    const values = mobile.left.map((g: any) => g.value);
    expect([...values]).toEqual([...values].sort((x, y) => y - x));
  });

  it('an unsettled lot whose finalqnty is an empty string vanishes from every audit tab', () => {
    // stockAudit.js:57 keeps finalqnty when it is `!= null`, and parseFloat('') is
    // NaN — so :96 useQ becomes NaN, the group's inQty and net become NaN, and every
    // NaN comparison at :122/:127/:131 is false. Mobile (audit.ts:64,95) reproduces
    // this exactly; pinned here so the trap is visible rather than surprising.
    const lots = [makeStockLot({ id: 'nan-in', qnty: '10' }), makeStockOutLot({ id: 'nan-out', qnty: '4' })];
    const web = webBuildAudit(structuredClone(lots), SETTINGS);
    const mobile = buildAudit(structuredClone(lots), SETTINGS);
    expect(mobile.left).toEqual(web.left);
    expect(mobile.left).toEqual([]);
    expect(mobile.over).toEqual([]);
    expect(mobile.total).toBe(2); // the rows are still audited, just never reported
  });

  it('a settled in-lot is audited at its finalqnty, not the received quantity', () => {
    // stockAudit.js:96 `useQ = finalqnty != null && finalqnty !== qnty ? finalqnty : qnty`.
    const lots = [makeStockLot({ id: 's-in', qnty: '20', finalqnty: '18', unitPrc: '100' })];
    const mobile = buildAudit(lots, SETTINGS);
    expect(mobile.left[0].inQty).toBe(18);
    expect(mobile.left).toEqual(webBuildAudit(structuredClone(lots), SETTINGS).left);
  });

  it('over-shipped needs more than a 0.1 tolerance, so rounding noise is not an alert', () => {
    // stockAudit.js:127 `g.outQty > g.inQty + 0.1`.
    const noise = [
      makeStockLot({ id: 'n-in', qnty: '10', finalqnty: null }),
      makeStockOutLot({ id: 'n-out', invoice: 6001, qnty: '10.05', finalqnty: null }),
    ];
    expect(buildAudit(noise, SETTINGS).over).toEqual([]);
    expect(webBuildAudit(structuredClone(noise), SETTINGS).over).toEqual([]);
    const real = [
      makeStockLot({ id: 'r-in', qnty: '10', finalqnty: null }),
      makeStockOutLot({ id: 'r-out', invoice: 6002, qnty: '12', finalqnty: null }),
    ];
    expect(buildAudit(real, SETTINGS).over).toHaveLength(1);
  });

  it('an orphan OUT is one with no IN at all, and a zero-quantity OUT is not one', () => {
    // stockAudit.js:131 `inRows === 0 && outRows > 0 && outQty > 0.001`.
    const mobile = buildAudit(auditLedger(), SETTINGS);
    expect(mobile.orphan.map((g: any) => g.descId)).toEqual(['prd-4']);
    const zeroOut = [makeStockOutLot({ id: 'z-out', invoice: 6003, qnty: '0', finalqnty: null })];
    expect(buildAudit(zeroOut, SETTINGS).orphan).toEqual([]);
  });

  it('a zero-quantity IN is only reported when it carries a price', () => {
    // stockAudit.js:136 `qnty === 0 && unitPrc > 0`.
    const mobile = buildAudit(auditLedger(), SETTINGS);
    expect(mobile.zeroIn.map((r: any) => r.id)).toEqual(['e-in']);
    const priceless = [makeStockLot({ id: 'p-in', qnty: '0', unitPrc: '0', finalqnty: null })];
    expect(buildAudit(priceless, SETTINGS).zeroIn).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 2 — storage cost metric (app/(root)/storagecosts/storageUtils.js)', () => {
  const lots = () => [
    makeStockLot({ id: 'm1', stock: 'wh-1', qnty: '100', indDate: '2026-01-10' }),
    makeStockLot({ id: 'm2', stock: 'wh-1', qnty: '50', indDate: '2026-04-10' }),
    makeStockOutLot({ id: 'm3', stock: 'wh-1', qnty: '30', indDate: '2026-05-10' }),
    makeStockLot({ id: 'm4', stock: 'wh-2', qnty: '20', indDate: '2026-02-10' }),
  ];
  const whName = (id: string) => SETTINGS.Stocks.Stocks.find((w: any) => w.id === id)?.nname || '';

  it('mobile’s storage screen uses the SHARED copy rather than its own re-implementation', () => {
    // The Tier 1 test above proves mobile/src/shared/storageUtils.js is byte-identical
    // to web's. That only buys parity if the storage FEATURE actually imports it — a
    // local re-implementation inside useStorage.ts would silently defeat both tests.
    expect(sharedMtInWh(lots(), 'wh-1', '')).toBe(webMtInWh(lots(), 'wh-1', ''));
    const src = repoFileText('mobile/src/features/stocks/useStorage.ts');
    expect(src).toContain("from '@shared/storageUtils'");
    for (const sym of ['isStorageType', 'toUsd', 'mtInWh', 'computeStorageMetric', 'ym']) {
      // the import list, not just any mention: a redefinition would not appear here.
      expect(src.match(new RegExp(`import\\s*\\{[^}]*\\b${sym}\\b[^}]*\\}\\s*from '@shared/storageUtils'`)), sym).toBeTruthy();
    }
  });

  it('tonnage in a warehouse is IN minus OUT, and never negative', () => {
    // storageUtils.js:43-52 — `out` subtracts, and the result is clamped at 0 so an
    // over-recorded shipment cannot produce negative storage.
    expect(sharedMtInWh(lots(), 'wh-1', '')).toBe(120); // 100 + 50 − 30
    const overShipped = [makeStockOutLot({ id: 'o', stock: 'wh-1', qnty: '5' })];
    expect(sharedMtInWh(overShipped, 'wh-1', '')).toBe(0);
  });

  it('a month cutoff counts only what had arrived by that month end', () => {
    // storageUtils.js:47 — a record dated after the month is not yet on hand.
    expect(sharedMtInWh(lots(), 'wh-1', '2026-02')).toBe(100); // the April lot has not arrived
    expect(sharedMtInWh(lots(), 'wh-1', '2026-04')).toBe(150); // arrived, nothing shipped yet
    expect(sharedMtInWh(lots(), 'wh-1', '2026-05')).toBe(120);
    expect(sharedMtInWh(lots(), 'wh-1', '2026-02')).toBe(webMtInWh(lots(), 'wh-1', '2026-02'));
  });

  it('EUR storage invoices are converted to USD before the rate is computed', () => {
    // storageUtils.js:16 toUsd — the rate is quoted in $/MT/month, so mixing raw EUR
    // into the numerator understates every terminal billing in euros.
    expect(webToUsd(100, 'eu')).toBe(100 * WEB_EUR_USD);
    expect(webToUsd(100, 'us')).toBe(100);
    const tagged = [
      { id: 'e1', amount: '1080', cur: 'eu', storageWh: 'wh-1', storageMonth: '2026-04' },
    ];
    const m = sharedComputeStorageMetric({ tagged, lots: lots(), whName });
    expect(m.totalCost).toBeCloseTo(1080 * 1.08, 6);
    expect(m).toEqual(webComputeStorageMetric({ tagged, lots: lots(), whName }));
  });

  it('two invoices covering the same month count that month’s tonnage once', () => {
    // storageUtils.js:62-66 — mtMonths is added only for a month not already seen,
    // otherwise a split invoice would double the denominator and halve the rate.
    const tagged = [
      { id: 'a', amount: '500', cur: 'us', storageWh: 'wh-1', storageMonth: '2026-04' },
      { id: 'b', amount: '500', cur: 'us', storageWh: 'wh-1', storageMonth: '2026-04' },
    ];
    const m = sharedComputeStorageMetric({ tagged, lots: lots(), whName });
    expect(m.totalCost).toBe(1000);
    expect(m.totalMt).toBe(150); // April tonnage, counted once
    expect(m.overall).toBeCloseTo(1000 / 150, 9);
    expect(m).toEqual(webComputeStorageMetric({ tagged, lots: lots(), whName }));
  });

  it('an untagged invoice contributes nothing — no warehouse or no month means no rate', () => {
    // storageUtils.js:59 `if (!wh || !e.storageMonth) return`.
    const tagged = [
      { id: 'a', amount: '500', cur: 'us', storageWh: '', storageMonth: '2026-04' },
      { id: 'b', amount: '500', cur: 'us', storageWh: 'wh-1', storageMonth: '' },
    ];
    const m = sharedComputeStorageMetric({ tagged, lots: lots(), whName });
    expect(m.rows).toEqual([]);
    expect(m.overall).toBeNull();
  });

  it('a warehouse billed for a month it held nothing has no rate rather than a rate of zero', () => {
    // storageUtils.js:70 `v.mtMonths > 0 ? v.cost / v.mtMonths : null` — dividing by
    // zero tonnage would otherwise print Infinity.
    const tagged = [{ id: 'a', amount: '500', cur: 'us', storageWh: 'wh-1', storageMonth: '2025-01' }];
    const m = sharedComputeStorageMetric({ tagged, lots: lots(), whName });
    expect(m.rows[0].rate).toBeNull();
    expect(m.overall).toBeNull();
    expect(m).toEqual(webComputeStorageMetric({ tagged, lots: lots(), whName }));
  });

  it('warehouses are listed most expensive first', () => {
    // storageUtils.js:71 `.sort((a, b) => (b.rate || 0) - (a.rate || 0))`.
    const tagged = [
      { id: 'a', amount: '300', cur: 'us', storageWh: 'wh-1', storageMonth: '2026-04' }, // 300/150 = 2
      { id: 'b', amount: '400', cur: 'us', storageWh: 'wh-2', storageMonth: '2026-04' }, // 400/20 = 20
    ];
    const m = sharedComputeStorageMetric({ tagged, lots: lots(), whName });
    expect(m.rows.map((r: any) => r.name)).toEqual(['Antwerp', 'Rotterdam']);
    expect(m).toEqual(webComputeStorageMetric({ tagged, lots: lots(), whName }));
  });

  it('only storage and warehouse expense types are storage cost — freight and demurrage are not', () => {
    // storageUtils.js:6 STORAGE_LABELS — one-time handling (freight, stuffing) and
    // delay penalties (demurrage) are not ongoing rent, so admitting them would
    // overstate the $/MT/month rate for every terminal.
    const expTypes = SETTINGS.Expenses.Expenses;
    expect(WEB_STORAGE_LABELS).toEqual(['storage', 'warehouse']);
    expect([...SHARED_STORAGE_LABELS]).toEqual([...WEB_STORAGE_LABELS]);
    expect(SHARED_EUR_USD).toBe(WEB_EUR_USD);
    for (const [expType, want] of [
      ['exp-storage', true],
      ['exp-warehouse', true],
      ['exp-freight', false],
      ['exp-commission', false],
      ['exp-other', false],
    ] as [string, boolean][]) {
      const e = makeExpense({ expType });
      expect(sharedIsStorageType(e, expTypes), expType).toBe(want);
      expect(sharedIsStorageType(e, expTypes), expType).toBe(webIsStorageType(e, expTypes));
    }
  });

  it('USD is an allowlist — every other currency id is converted at the EUR rate', () => {
    // storageUtils.js:16 `cur === 'us' || cur === 'USD' ? amt : (Number(amt)||0) * EUR_USD`.
    // Note the shape: it is NOT "convert eu, pass everything else through". Anything
    // that is not one of the two USD spellings — including a MISSING currency and a
    // currency the app does not model — is multiplied by 1.08. That is web's rule and
    // mobile ships the same file, so it is pinned here rather than assumed away; if
    // web ever narrows it to an explicit euro check, this test must be the thing that
    // notices, not a silent change in the storage spend figure.
    for (const [amt, cur] of [
      [100, 'eu'], [100, 'us'], [100, 'USD'], [0, 'eu'], [-250, 'eu'],
      [100, 'gbp'], [100, ''], [100, undefined as any],
    ] as [number, any][]) {
      expect(sharedToUsd(amt, cur), `${amt} ${String(cur)}`).toBe(webToUsd(amt, cur));
    }
    expect(sharedToUsd(100, 'us')).toBe(100);
    expect(sharedToUsd(100, 'USD')).toBe(100);
    expect(sharedToUsd(100, 'eu')).toBe(100 * SHARED_EUR_USD);
    expect(sharedToUsd(100, 'gbp')).toBe(100 * SHARED_EUR_USD); // the trap, asserted
    expect(sharedToUsd('abc' as any, 'eu')).toBe(0); // Number(amt)||0 — never NaN
  });

  it('a non-string date cannot crash the month key', () => {
    // storageUtils.js:19/24 — a Firestore Timestamp or number collapses to '' rather
    // than throwing on .substring and white-screening the page (this is the crash
    // fixed in commit 6f0fa09 "make date helpers non-string-safe").
    for (const d of [20260401, null, undefined, { seconds: 1 }, '2026-04-01'] as any[]) {
      expect(sharedYm(d), String(d)).toBe(webYm(d));
    }
    expect(sharedYm(20260401 as any)).toBe('');
    expect(sharedYm('2026-04-01')).toBe('2026-04');
    for (const l of [{ indDate: 12345 }, { indDate: { startDate: '2026-04-01' } }, { indDate: '2026-05-02' }, { contractData: { date: '2026-06-03' } }, {}] as any[]) {
      expect(sharedArrivalStr(l), JSON.stringify(l)).toBe(webArrivalStr(l));
    }
    expect(sharedArrivalStr({ indDate: 12345 } as any)).toBe('');
    expect(sharedArrivalStr({ indDate: { startDate: '2026-04-01' } } as any)).toBe('2026-04-01');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — storage costs page wiring (app/(root)/storagecosts/page.js)', () => {
  const whName = (id: string) => SETTINGS.Stocks.Stocks.find((w: any) => w.id === id)?.nname || '';
  const storageExpenses = () => [
    makeExpense({ id: 'sx1', expType: 'exp-storage', amount: '1200', cur: 'us', date: '2026-03-05', storageWh: 'wh-1', storageMonth: '2026-04' }),
    makeExpense({ id: 'sx2', expType: 'exp-storage', amount: '800', cur: 'us', date: '2025-11-05' }),
    makeExpense({ id: 'sx3', expType: 'exp-warehouse', amount: '600', cur: 'eu', date: '2026-06-05', storageWh: 'wh-2', storageMonth: '2026-06' }),
  ];
  const lots = () => [makeStockLot({ id: 'y1', stock: 'wh-1', qnty: '100', indDate: '2026-01-10' })];

  it('a tagged invoice belongs to the year it COVERS, not the year it was issued', () => {
    // page.js:142 expYear — storageMonth wins over the invoice date, so a January
    // invoice covering the previous December is reported under the previous year.
    const dec = makeExpense({ id: 'x', date: '2027-01-04', storageMonth: '2026-12' });
    expect(expenseYear(dec)).toBe('2026');
    expect(expenseYear(dec)).toBe(webExpYear(dec));
  });

  it('an untagged invoice falls back to its own date', () => {
    const e = makeExpense({ id: 'x', date: '2025-11-05' });
    expect(expenseYear(e)).toBe('2025');
    expect(expenseYear(e)).toBe(webExpYear(e));
  });

  it('an invoice with neither a covered month nor a usable date has no year', () => {
    // page.js:142 — the `.filter(Boolean)` at :146 then drops it from the year picker.
    const e = { id: 'x', date: null, storageMonth: { m: '2026-04' } };
    expect(expenseYear(e)).toBe('');
    expect(expenseYear(e)).toBe(webExpYear(e));
  });

  it('the per-year roll-up reports spend, MT-months and the rate exactly as web', () => {
    // page.js:157-167 — years descending, spend in USD, rate from the tagged subset
    // only. computePerYear is mobile's OWN function (useStorage.ts), lifted out of the
    // hook's useMemo so this runs mobile's code rather than a re-transcription of web's.
    const all = storageExpenses();
    const mobile = computePerYear(all, lots(), whName);
    expect(mobile).toEqual(webPerYear(all, lots(), whName));
    expect(mobile.map((r) => r.year)).toEqual(['2026', '2025']); // newest year first
  });

  it('the per-year rate ignores untagged invoices, which would otherwise inflate it', () => {
    // page.js:161 `list.filter(e => e.storageWh && e.storageMonth)` feeds the metric
    // while :163 sums spend over the WHOLE list — counting an untagged invoice in the
    // numerator of the rate would overstate $/MT for every year with a backlog.
    const all = storageExpenses();
    const y2026 = computePerYear(all, lots(), whName).find((r) => r.year === '2026')!;
    expect(y2026.count).toBe(2); // sx1 (tagged) + sx3 (tagged, EUR)
    expect(y2026.taggedCount).toBe(2);
    const withBacklog = [...all, makeExpense({ id: 'sx4', expType: 'exp-storage', amount: '9999', cur: 'us', date: '2026-07-05' })];
    const b2026 = computePerYear(withBacklog, lots(), whName).find((r) => r.year === '2026')!;
    expect(b2026.count).toBe(3);
    expect(b2026.taggedCount).toBe(2); // the untagged one is counted but not rated
    expect(b2026.rate).toBe(y2026.rate); // …so the $/MT rate is unmoved
    expect(b2026.spend).toBeCloseTo(y2026.spend + 9999, 6); // …while spend does move
    expect(computePerYear(withBacklog, lots(), whName)).toEqual(webPerYear(withBacklog, lots(), whName));
  });

  it('the untagged “actuals” card reports spend and on-hand MT exactly as web', () => {
    // page.js:179-187 actuals — deliberately needs NO tagging: it is the figure a user
    // sees before any invoice has been attributed to a warehouse.
    const warehouses = SETTINGS.Stocks.Stocks;
    const exp = storageExpenses();
    const mobile = computeActuals(exp, lots(), warehouses, whName);
    expect(mobile).toEqual(webActuals(exp, lots(), warehouses, whName));
    expect(mobile.count).toBe(3);
    expect(mobile.taggedCount).toBe(2);
    expect(mobile.totalSpend).toBeCloseTo(1200 + 800 + 600 * WEB_EUR_USD, 6); // EUR converted
    expect(mobile.whMt.map((w) => w.name)).toEqual(['Rotterdam']); // wh-2 holds nothing
    expect(mobile.totalMt).toBe(100);
  });

  it('a warehouse holding less than 0.01 MT is not listed as holding stock', () => {
    // page.js:183 `.filter(x => x.mt > 0.01)` — an emptied terminal must drop off the
    // card entirely rather than linger at 0.00 MT.
    const warehouses = SETTINGS.Stocks.Stocks;
    const dust = [makeStockLot({ id: 'd1', stock: 'wh-1', qnty: '0.005', indDate: '2026-01-10' })];
    const mobile = computeActuals(storageExpenses(), dust, warehouses, whName);
    expect(mobile.whMt).toEqual([]);
    expect(mobile.totalMt).toBe(0);
    expect(mobile).toEqual(webActuals(storageExpenses(), dust, warehouses, whName));
  });

  it('warehouses on the actuals card are ordered by tonnage, fullest first', () => {
    // page.js:184 `.sort((a, b) => b.mt - a.mt)`.
    const warehouses = SETTINGS.Stocks.Stocks;
    const two = [
      makeStockLot({ id: 's1', stock: 'wh-1', qnty: '10', indDate: '2026-01-10' }),
      makeStockLot({ id: 's2', stock: 'wh-2', qnty: '90', indDate: '2026-01-10' }),
    ];
    const mobile = computeActuals(storageExpenses(), two, warehouses, whName);
    expect(mobile.whMt.map((w) => w.name)).toEqual(['Antwerp', 'Rotterdam']);
    expect(mobile.totalMt).toBe(100);
    expect(mobile).toEqual(webActuals(storageExpenses(), two, warehouses, whName));
  });

  it('a warehouse label is its terminal name, falling back to the generic name', () => {
    // page.js:117 `w?.stock || w?.nname || ''`. A terminal that has been given its own
    // `stock` label must show THAT on both platforms, not the settings nname.
    const warehouses = [
      { id: 'wh-1', stock: 'Rotterdam Terminal 4', nname: 'Rotterdam' },
      { id: 'wh-2', nname: 'Antwerp' },
      { id: 'wh-3' },
    ];
    const mobileFn = makeWhName(warehouses);
    const webFn = webWhName(warehouses);
    for (const id of ['wh-1', 'wh-2', 'wh-3', 'wh-gone']) {
      expect(mobileFn(id), `warehouse ${id}`).toBe(webFn(id));
    }
    expect(mobileFn('wh-1')).toBe('Rotterdam Terminal 4'); // stock wins over nname
    expect(mobileFn('wh-2')).toBe('Antwerp');
    expect(mobileFn('wh-gone')).toBe(''); // never the raw id
  });

  it('a warehouse suggestion reuses the one already chosen for the same supplier', () => {
    // page.js:193 suggestWh — never itself, never a supplier-less row, never an
    // untagged one.
    const list = [
      makeExpense({ id: 'a', supplier: 'sup-1', storageWh: 'wh-2' }),
      makeExpense({ id: 'b', supplier: 'sup-1' }),
      makeExpense({ id: 'c', supplier: 'sup-2', storageWh: 'wh-1' }),
    ];
    const target = list[1];
    expect(suggestWh(target, list)).toBe('wh-2');
    expect(suggestWh(target, list)).toBe(webSuggestWh(target, list));
    // a supplier nobody else has tagged yields nothing rather than a wrong warehouse
    const lonely = makeExpense({ id: 'd', supplier: 'sup-9' });
    expect(suggestWh(lonely, list)).toBe('');
    expect(suggestWh(lonely, list)).toBe(webSuggestWh(lonely, list));
  });

  it('an already-tagged invoice is not offered its own warehouse as a suggestion', () => {
    // page.js:193 `x.id !== e.id`. Without the self-exclusion the suggestion is
    // circular — the row proposes what it already has, so re-tagging a mis-filed
    // invoice silently re-suggests the wrong warehouse.
    const list = [
      makeExpense({ id: 'a', supplier: 'sup-1', storageWh: 'wh-2' }),
      makeExpense({ id: 'b', supplier: 'sup-1', storageWh: 'wh-1' }),
    ];
    expect(suggestWh(list[0], list)).toBe('wh-1'); // b's, not its own wh-2
    expect(suggestWh(list[0], list)).toBe(webSuggestWh(list[0], list));
    const alone = [makeExpense({ id: 'z', supplier: 'sup-1', storageWh: 'wh-2' })];
    expect(suggestWh(alone[0], alone)).toBe(''); // only itself to match ⇒ no suggestion
    expect(suggestWh(alone[0], alone)).toBe(webSuggestWh(alone[0], alone));
  });

  it('two invoices that merely share a MISSING supplier do not suggest for each other', () => {
    // page.js:193 `x.supplier &&` — without it, `undefined === undefined` matches and
    // every supplier-less invoice inherits an unrelated terminal's warehouse.
    const list = [
      makeExpense({ id: 'a', supplier: '', storageWh: 'wh-2' }),
      makeExpense({ id: 'b', supplier: '' }),
    ];
    expect(suggestWh(list[1], list)).toBe('');
    expect(suggestWh(list[1], list)).toBe(webSuggestWh(list[1], list));
  });

  it('the default covered month is the invoice’s own month when it is not tagged', () => {
    // page.js:196 `e.storageMonth || ym(e.date)`.
    const untagged = makeExpense({ date: '2026-04-05' });
    const tagged = makeExpense({ date: '2026-04-05', storageMonth: '2026-02' });
    expect(defaultMonth(untagged)).toBe('2026-04');
    expect(defaultMonth(tagged)).toBe('2026-02'); // the covered month wins over the date
    // web's own expression, evaluated on the same inputs (page.js:196 draftOf).
    expect(defaultMonth(untagged)).toBe(untagged.storageMonth || webYm(untagged.date));
    expect(defaultMonth(tagged)).toBe(tagged.storageMonth || webYm(tagged.date));
    expect(defaultMonth({ date: 20260401 } as any)).toBe(''); // non-string date cannot crash
  });

  it('the storage window is the last ten years, independent of the app period selector', () => {
    // page.js:127-129 loads `${thisYr - 9}-01-01` … `${thisYr}-12-31`. Scoping this
    // read to the global dateSelect silently truncated the totals and the $/MT rate.
    const webSrc = repoFileText('app/(root)/storagecosts/page.js');
    expect(webSrc).toContain('${thisYr - 9}-01-01');
    expect(webSrc).toContain('${thisYr}-12-31');
    const mobileSrc = repoFileText('mobile/src/features/stocks/useStorage.ts');
    expect(mobileSrc).toContain('${thisYr - 9}-01-01');
    expect(mobileSrc).toContain('${thisYr}-12-31');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('Tier 3 — number formatting on the stocks screens', () => {
  it('a warehouse total of exactly zero prints as a bare 0, not as $0.00', () => {
    // sumTable.js:8 showAmount only formats when `Number(value)` is truthy.
    expect(warehouseTotalCell(0, 'us')).toBe('0');
    expect(String(webSumShowAmount(0, 'USD'))).toBe('0');
  });

  it('a warehouse total is formatted with its own currency symbol and 2 decimals', () => {
    expect(warehouseTotalCell(1234.5, 'us')).toBe(webSumShowAmount(1234.5, 'USD'));
    expect(warehouseTotalCell(1234.5, 'eu')).toBe(webSumShowAmount(1234.5, 'EUR'));
    expect(warehouseTotalCell(1234.5, 'us')).toBe('$1,234.50');
  });

  it('a negative warehouse total keeps the minus in front of the symbol', () => {
    // Intl currency renders '-$1,234.50'; building symbol + signed number gave
    // '$-1,234.50' on mobile.
    expect(warehouseTotalCell(-1234.5, 'us')).toBe(webSumShowAmount(-1234.5, 'USD'));
    expect(warehouseTotalCell(-1234.5, 'us')).toBe('-$1,234.50');
  });

  it('the lot-sheet price truncates to 3 decimals and never pads', () => {
    // whModal.js:52-66 addComma: the integer part is grouped by the while/regex loop
    // and `x2.substring(0, 4)` on '.5678' TRUNCATES to '.567'. No rounding, no
    // trailing zeros — 1200 prints as '1,200', not '1,200.00'.
    for (const v of ['1234.5678', '1200', '0.5', '1234567.1', '12.34', '999.9999', '-1234.5']) {
      expect(fmtLotPrice(v), `value ${v}`).toBe(webAddComma(v, false, ''));
    }
    expect(fmtLotPrice('1234.5678')).toBe('1,234.567');
    expect(fmtLotPrice('1200')).toBe('1,200');
  });

  it('the lot-sheet price prefixed with a symbol matches web’s addSymbol form', () => {
    // whModal.js:65 — symbol + grouped integer + truncated decimals.
    expect('$' + fmtLotPrice('1234.5678')).toBe(webAddComma('1234.5678', true, '$'));
  });
});
