// Contract P&L tab — the pure core of usePnl(), extracted so it can be exercised
// without a React tree. Port of app/(root)/contracts/modals/tabs/pnl.js.
//
// Purchase Value − Expenses against the sale value gives Profit; Freight/MT
// allocates the contract's FREIGHT-type expenses over its contracted tonnage.
// Freight detection and currency conversion match the rest of the web tab exactly,
// so the figure lines up with the Expenses total shown beside it.

import { contractsValue, totalArrsExp, ViewCur } from '@/features/review/reviewFinance';
import { ownProducts } from './useContracts';

export interface ShipmentRow {
  id: string;
  invoice: any;
  year: string;
  rcvd: any;
  outrnamnt: any;
  fnlzing: any;
  status: any;
  etd: any;
  eta: any;
}

export interface ContractPnl {
  purchaseValue: number;
  expenses: number;
  saleValue: number;
  profit: number;
  contractMT: number;
  freightTotal: number;
  freightPerMT: number;
  shipments: ShipmentRow[];
}

const mlt = (rowCur: string, val: ViewCur, mult: number) =>
  rowCur === val.cur ? 1 : rowCur === 'us' && val.cur === 'eu' ? 1 / mult : mult;

/**
 * Sale value for the P&L tab — port of web pnl.js:27 Total().
 *
 * Web:  acc += group.length === 1 ? num : obj.invType !== '1111' ? num : 0
 *
 * TWO points where this differs from the Contracts REVIEW page's Total()
 * (ContractsReview&Statement/page.js:129), and both are deliberate:
 *
 *  1. A group of ONE counts whatever it is. A lone Credit/Final note means the
 *     original was issued in a previous period, so dropping it wipes out the whole
 *     deal. Web's pnl.js and web's dashboard (dashboard/funcs.js:21) both count it;
 *     only the Review page insists a singleton be an original. Mobile follows the
 *     P&L tab it is porting.
 *  2. For a MULTI-doc group mobile tests `['1111','Invoice'].includes(invType)`
 *     where web's pnl.js tests only `invType !== '1111'`. A FINALIZED original
 *     stores invType as the LABEL 'Invoice', so web's test is true for it and the
 *     original is counted ALONGSIDE its superseding note — double-counting the
 *     sale. Web's own Review page (page.js:141-147) and Dashboard
 *     (dashboard/funcs.js:22) both use the label-inclusive form; pnl.js is the
 *     outlier. Mobile matches the other two rather than reproducing the double count.
 */
export function pnlSaleValue(groups: any[][], val: ViewCur, mult: number, settings: any): number {
  let acc = 0;
  (groups || []).forEach((group) =>
    (group || []).forEach((obj: any) => {
      if (!obj || isNaN(obj.totalAmount)) return;
      const currentCur = !obj.final
        ? obj.cur
        : settings?.Currency?.Currency?.find((x: any) => x.cur === obj.cur?.cur)?.id;
      const num = obj.canceled ? 0 : obj.totalAmount * 1 * mlt(currentCur, val, mult);
      const isOriginal = ['1111', 'Invoice'].includes(obj.invType);
      acc += group.length === 1 ? num : isOriginal ? 0 : num;
    })
  );
  return acc;
}

/**
 * P&L Expenses — port of web pnl.js:64 TotalArrsExp().
 *
 * Web's P&L reads the expense arrays stored on the SALES-INVOICE docs, NOT the
 * contract's own `expenses` field. The two drift — the contract copy is what the
 * Contracts Review page uses — so mobile was showing a different Expenses figure,
 * and a different Profit, than web for the same contract.
 */
export function pnlExpenses(groups: any[][], val: ViewCur, mult: number): number {
  return (groups || []).reduce(
    (s, g) =>
      s +
      (g || []).reduce(
        (s2: number, inv: any) => s2 + totalArrsExp(Array.isArray(inv?.expenses) ? inv.expenses : [], val, mult),
        0
      ),
    0
  );
}

/** One contract's full P&L row. `contract.invoicesData` must already be grouped. */
export function contractPnl(contract: any, viewCur: 'us' | 'eu', settings: any): ContractPnl | null {
  if (!contract) return null;
  const val: ViewCur = { cur: viewCur };
  const mult = parseFloat(contract.euroToUSD) || 1;

  const purchaseValue = contractsValue(contract, 'pmnt', val, mult);
  const groups: any[][] = Array.isArray(contract.invoicesData) ? contract.invoicesData : [];

  const expenses = pnlExpenses(groups, val, mult);
  const saleValue = pnlSaleValue(groups, val, mult, settings);

  // Freight allocation — expense types whose label contains "freight" (pnl.js:153).
  const freightIds = new Set(
    (settings?.Expenses?.Expenses || [])
      .filter((e: any) => String(e.expType || '').toLowerCase().includes('freight'))
      .map((e: any) => e.id)
  );
  // import-flagged products are breakdown helpers — excluded from the tonnage.
  const contractMT = ownProducts(contract).reduce((s, p: any) => s + (parseFloat(p.qnty) || 0), 0);
  const freightTotal = (contract.expenses || []).reduce((s: number, exp: any) => {
    if (!exp || !freightIds.has(exp.expType)) return s;
    const amt = parseFloat(exp.amount);
    if (isNaN(amt)) return s;
    return s + amt * mlt(exp.cur, val, mult);
  }, 0);
  const freightPerMT = contractMT > 0 ? freightTotal / contractMT : 0;

  // One row per linked sales invoice (the shipment grid).
  const shipments: ShipmentRow[] = groups.flatMap((g) =>
    (g || []).map((inv: any) => ({
      id: inv.id,
      invoice: inv.invoice,
      year: String(inv.__yr || (inv.dateRange?.startDate || inv.date || '').substring(0, 4)),
      rcvd: inv.shipData?.rcvd ?? '',
      outrnamnt: inv.shipData?.outrnamnt ?? '',
      fnlzing: inv.shipData?.fnlzing ?? '',
      status: inv.shipData?.status ?? '',
      etd: inv.shipData?.etd ?? null,
      eta: inv.shipData?.eta ?? null,
    }))
  );

  return {
    purchaseValue,
    expenses,
    saleValue,
    profit: saleValue - purchaseValue - expenses,
    contractMT,
    freightTotal,
    freightPerMT,
    shipments,
  };
}
