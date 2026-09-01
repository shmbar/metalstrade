/**
 * PARITY SUITE — Contracts Review / Statement + Contract P&L + the dashboard P&L chain.
 *
 * Web pages covered:
 *   app/(root)/ContractsReview&Statement/page.js   (+ funcs.js)
 *   app/(root)/contracts/modals/tabs/pnl.js
 *   app/(root)/contracts/modals/poInvModal.js
 *   app/(root)/dashboard/funcs.js
 *   app/(root)/contracts/page.js                   (the QTY column)
 *
 * Mobile modules under test:
 *   mobile/src/features/review/reviewFinance.ts
 *   mobile/src/features/contracts/pnlModel.ts      (the pure core of usePnl)
 *   mobile/src/features/contracts/poInvoiceModel.ts
 *   mobile/src/features/dashboard/pnlChain.ts
 *   mobile/src/features/contracts/useContracts.ts  (deriveContract)
 *
 * Every assertion encodes WEB's rule — either by importing web's own module
 * (Tier 2), or by a verbatim mirror with a file:line citation and a drift alarm
 * (Tier 3). Where mobile deliberately differs, the DIFFERENCE is asserted with the
 * reason (Tier 4). Nothing here restates "what mobile currently returns".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── mobile ───────────────────────────────────────────────────────────────────
import {
  contractsValue,
  totalInvoicePayments,
  totalArrsExp,
  total as reviewTotal,
  reviewFinancials,
  sumReviewFinancials,
  ReviewFinancials,
  ViewCur,
} from '@/features/review/reviewFinance';
import { contractPnl, pnlSaleValue, pnlExpenses } from '@/features/contracts/pnlModel';
import {
  removeNonNumeric,
  countDecimalDigits,
  setInvoiceField,
  setPaymentPerc,
  setPaymentAmount,
  deletePayment,
  addPayment,
  blankPoInvoice,
  toggleDraft,
  PoInvoice,
} from '@/features/contracts/poInvoiceModel';
import { computePnl, dealRevenue, sumInvProductsMT, DASHBOARD_PNL_CAVEATS } from '@/features/dashboard/pnlChain';
import { deriveContract, ownProducts } from '@/features/contracts/useContracts';

// ── web (Tier 2 — imported directly) ─────────────────────────────────────────
import {
  ContractsValue as webContractsValue,
  SumAllPayments as webSumAllPayments,
  SumAllExp as webSumAllExp,
} from '../../app/(root)/ContractsReview&Statement/funcs.js';
import { calContracts as webCalContracts, setMonthsInvoices as webSetMonthsInvoices } from '../../app/(root)/dashboard/funcs.js';
import { countDecimalDigits as webCountDecimalDigits } from '../../app/(root)/margins/funcs.js';

// ── helpers ──────────────────────────────────────────────────────────────────
import { expectWebUnchanged, repoFileText, webFnSource } from './_helpers/webSource';
import {
  FIXED_NOW,
  makeSettings,
  makeContract,
  makeProduct,
  makeImportProduct,
  makePoInvoice,
  makePoPayment,
  makeContractExpense,
  makeInvoice,
  makeFinalizedInvoice,
  makeCreditNote,
  makeFinalNote,
  makeInvoiceProduct,
  makePayment,
  scenario,
} from './_helpers/fixtures';

const REVIEW_PAGE = 'app/(root)/ContractsReview&Statement/page.js';
const PNL_TAB = 'app/(root)/contracts/modals/tabs/pnl.js';
const PO_MODAL = 'app/(root)/contracts/modals/poInvModal.js';
const DASH_FUNCS = 'app/(root)/dashboard/funcs.js';
const CONTRACTS_PAGE = 'app/(root)/contracts/page.js';

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

/** Sorted keys whose value is a non-zero number — web's setPieArrs drops the zeros. */
const nonZeroKeys = (o: Record<string, number>) =>
  Object.keys(o)
    .filter((k) => o[k] !== 0)
    .sort();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 3 MIRRORS — transcribed verbatim from web, with drift alarms below.
// ═════════════════════════════════════════════════════════════════════════════

/** Mirror of ContractsReview&Statement/page.js:89 TotalInvoicePayments. Verbatim. */
const webTotalInvoicePayments = (data: any[][], val: any, mult: any) => {
  let accumulatedPmnt = 0;
  data.forEach((innerArray) => {
    innerArray.forEach((obj: any) => {
      if (obj && Array.isArray(obj.payments)) {
        obj.payments.forEach((payment: any) => {
          const mltTmp = obj.cur === val.cur ? 1 : obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult;
          if (payment && !isNaN(parseFloat(payment.pmnt))) {
            accumulatedPmnt += parseFloat((payment.pmnt * 1 * mltTmp) as any);
          }
        });
      }
    });
  });
  return accumulatedPmnt;
};

/** Mirror of ContractsReview&Statement/page.js:110 TotalArrsExp. Verbatim. */
const webTotalArrsExp = (data: any[], val: any, mult: any) => {
  let accumulatedExp = 0;
  data.forEach((obj: any) => {
    if (obj) {
      const mltTmp = obj.cur === val.cur ? 1 : obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult;
      if (obj && !isNaN(parseFloat(obj.amount))) {
        accumulatedExp += parseFloat((obj.amount * 1 * mltTmp) as any);
      }
    }
  });
  return accumulatedExp;
};

/** Mirror of ContractsReview&Statement/page.js:129 Total. Verbatim, redundant branches and all. */
const webTotal = (data: any[][], name: string, val: any, mult: any, settings: any) => {
  let accumuLastInv = 0;
  let accumuDeviation = 0;
  data.forEach((innerArray) => {
    innerArray.forEach((obj: any) => {
      if (obj && !isNaN(obj[name])) {
        const currentCur = !obj.final
          ? obj.cur
          : settings.Currency.Currency.find((x: any) => x.cur === obj.cur.cur)['id'];
        const mltTmp = currentCur === val.cur ? 1 : currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult;
        const num = obj.canceled ? 0 : obj[name] * 1 * mltTmp;
        accumuDeviation +=
          (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType)) ||
          (innerArray.length > 1 && ['1111', 'Invoice'].includes(obj.invType))
            ? num
            : 0;
        accumuLastInv +=
          (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType)) ||
          (innerArray.length > 1 && !['1111', 'Invoice'].includes(obj.invType))
            ? num
            : 0;
      }
    });
  });
  return { accumuDeviation, accumuLastInv };
};

/**
 * Mirror of ContractsReview&Statement/page.js:343 setCurFilterData — the 11 money
 * columns of ONE review row. Verbatim except that `valCur`/`settings` are
 * parameters instead of component state.
 */
const webSetCurFilterRow = (x: any, valCur: any, settings: any) => {
  const conValue = webContractsValue(x, 'pmnt', valCur, x.euroToUSD);
  const totalInvoices = webTotal(x.invoicesData, 'totalAmount', valCur, x.euroToUSD, settings).accumuLastInv;
  const deviation = totalInvoices - webTotal(x.invoicesData, 'totalAmount', valCur, x.euroToUSD, settings).accumuDeviation;
  const totalPrepayment1 = webTotal(x.invoicesData, 'totalPrepayment', valCur, x.euroToUSD, settings).accumuLastInv;
  const prepaidPer = isNaN(totalPrepayment1 / totalInvoices)
    ? '-'
    : ((totalPrepayment1 / totalInvoices) * 100).toFixed(1) + '%';
  const inDebt = totalInvoices - totalPrepayment1;
  const payments = webTotalInvoicePayments(x.invoicesData, valCur, x.euroToUSD);
  const debtaftr = totalPrepayment1 - payments;
  const debtBlnc = totalInvoices - payments;
  const expenses1 = webTotalArrsExp(x.expenses, valCur, x.euroToUSD);
  const profit = totalInvoices - conValue - expenses1;
  return { conValue, totalInvoices, deviation, prepaidPer, totalPrepayment1, inDebt, payments, debtaftr, debtBlnc, expenses1, profit };
};

/**
 * Mirror of ContractsReview&Statement/page.js:469 setTtl — the totals ROW.
 * Note it is a SINGLE object with `cur: 'us'`; there is no per-currency bucketing.
 */
const webSetTtl = (filteredData: any[], valCur: any, settings: any) => {
  const totalContracts = filteredData.reduce((total, obj) => total + webContractsValue(obj, 'pmnt', valCur, obj.euroToUSD), 0);
  const totalInvoices1 = filteredData.reduce(
    (total, obj) => total + webTotal(obj.invoicesData, 'totalAmount', valCur, obj.euroToUSD, settings).accumuLastInv,
    0
  );
  const totalPrepayment2 = filteredData.reduce(
    (total, obj) => total + webTotal(obj.invoicesData, 'totalPrepayment', valCur, obj.euroToUSD, settings).accumuLastInv,
    0
  );
  const expenses2 = webSumAllExp(filteredData, valCur);
  const payments1 = webSumAllPayments(filteredData, valCur);
  return [
    {
      date: '',
      order: '',
      supplier: '',
      conValue: totalContracts,
      totalInvoices: totalInvoices1,
      deviation: filteredData.reduce((total, obj) => total + obj.deviation, 0),
      prepaidPer: isNaN(totalPrepayment2 / totalInvoices1) ? '-' : ((totalPrepayment2 / totalInvoices1) * 100).toFixed(2) + '%',
      totalPrepayment1: totalPrepayment2,
      inDebt: totalInvoices1 - totalPrepayment2,
      payments: payments1,
      debtaftr: totalPrepayment2 - payments1,
      debtBlnc: totalInvoices1 - payments1,
      expenses1: expenses2,
      profit: totalInvoices1 - totalContracts - expenses2,
      cur: 'us',
    },
  ];
};

/** Mirror of contracts/modals/tabs/pnl.js:27 Total — the P&L tab's sale value. Verbatim. */
const webPnlTotal = (data: any[][], name: string, val: any, mult: any, settings: any) => {
  let accumulatedTotalAmount = 0;
  data.forEach((innerArray) => {
    innerArray.forEach((obj: any) => {
      if (obj && !isNaN(obj[name])) {
        const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find((x: any) => x.cur === obj.cur.cur)['id'];
        const mltTmp = currentCur === val.cur ? 1 : currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult;
        const num = obj.canceled ? 0 : obj[name] * 1 * mltTmp;
        accumulatedTotalAmount += innerArray.length === 1 ? num : obj.invType !== '1111' ? num : 0;
      }
    });
  });
  return accumulatedTotalAmount;
};

/** Mirror of contracts/modals/tabs/pnl.js:64 TotalArrsExp — expenses off the INVOICE docs. Verbatim. */
const webPnlArrsExp = (data: any[][], val: any, mult: any) => {
  let accumulatedExp = 0;
  data.forEach((innerArray) => {
    innerArray.forEach((obj: any) => {
      if (obj && Array.isArray(obj.expenses)) {
        obj.expenses.forEach((exp: any) => {
          const mltTmp = exp.cur === val.cur ? 1 : exp.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult;
          if (exp && !isNaN(parseFloat(exp.amount))) {
            accumulatedExp += parseFloat((exp.amount * 1 * mltTmp) as any);
          }
        });
      }
    });
  });
  return accumulatedExp;
};

/** Mirror of contracts/modals/tabs/pnl.js:160-170 contractMT / freightTotal / freightPerMT. Verbatim. */
const webPnlFreight = (valueCon: any, valCur: any, settings: any) => {
  const freightIds = new Set(
    (settings.Expenses?.Expenses || [])
      .filter((e: any) => String(e.expType || '').toLowerCase().includes('freight'))
      .map((e: any) => e.id)
  );
  const contractMT = (valueCon.productsData || [])
    .filter((p: any) => !p.import)
    .reduce((s: number, p: any) => s + (parseFloat(p.qnty) || 0), 0);
  const freightTotal = (valueCon.expenses || []).reduce((s: number, exp: any) => {
    if (!exp || !freightIds.has(exp.expType)) return s;
    const amt = parseFloat(exp.amount);
    if (isNaN(amt)) return s;
    const mltTmp =
      exp.cur === valCur.cur ? 1 : exp.cur === 'us' && valCur.cur === 'eu' ? 1 / valueCon.euroToUSD : valueCon.euroToUSD;
    return s + amt * mltTmp;
  }, 0);
  const freightPerMT = contractMT > 0 ? freightTotal / contractMT : 0;
  return { contractMT, freightTotal, freightPerMT };
};

/** Mirror of dashboard/funcs.js:4 Total — the deal-basis revenue rule. Verbatim (not exported by web). */
const webDashTotal = (data: any[][], name: string, mult: number, settings: any) => {
  let accumuLastInv = 0;
  data.forEach((innerArray) => {
    innerArray.forEach((obj: any) => {
      if (obj && !isNaN(obj[name])) {
        const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find((x: any) => x.cur === obj.cur.cur)['id'];
        const mltTmp = currentCur === 'us' ? 1 : mult;
        const num = obj.canceled || obj.draft === true ? 0 : obj[name] * 1 * mltTmp;
        accumuLastInv += innerArray.length === 1 || !['1111', 'Invoice'].includes(obj.invType) ? num : 0;
      }
    });
  });
  return accumuLastInv;
};

/** Mirror of dashboard/funcs.js:100 sumInvProductsMT. Verbatim (not exported by web). */
const webSumInvProductsMT = (invoicesData: any[]) => {
  let mt = 0;
  (invoicesData || []).forEach((innerArray: any) => {
    if (!Array.isArray(innerArray)) return;
    innerArray.forEach((obj: any) => {
      if (!obj || obj.canceled) return;
      const isInvoice = ['1111', 'Invoice'].includes(obj.invType);
      const counts = innerArray.length === 1 || !isInvoice;
      if (!counts) return;
      (obj.productsDataInvoice || []).forEach((p: any) => {
        if (p && p.qnty !== 's' && p.qnty !== '' && !isNaN(parseFloat(p.qnty))) {
          mt += parseFloat(p.qnty);
        }
      });
    });
  });
  return mt;
};

/** Mirror of contracts/page.js:152 gQ — the settings lookup showQTY's label comes from. Verbatim. */
const webGQ = (settings: any, z: any, y: string, x: string) => settings[y][y].find((q: any) => q.id === z)?.[x] || '';

/**
 * Mirror of contracts/page.js:154 showQTY INCLUDING its gQ label lookup, so the
 * unresolved-label case is exercised too. Verbatim: web appends `' ' + gQ(...)`
 * unconditionally, which leaves a TRAILING SPACE when the lookup misses.
 */
const webShowQTYFull = (c: any, settings: any) => {
  const own = c.productsData.filter((p: any) => !p.import);
  return own.length !== 0
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).format(
        own.reduce((sum: number, item: any) => sum + parseInt(item.qnty, 10), 0)
      ) +
        ' ' +
        webGQ(settings, c.qTypeTable, 'Quantity', 'qTypeTable')
    : '-';
};

/** Mirror of contracts/page.js:154 showQTY (the QTY column). Verbatim — parseInt truncation and all. */
const webShowQTY = (c: any, qLabel: string) => {
  const own = c.productsData.filter((p: any) => !p.import);
  return own.length !== 0
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).format(
        own.reduce((sum: number, item: any) => sum + parseInt(item.qnty, 10), 0)
      ) +
        ' ' +
        qLabel
    : '-';
};

/** Mirror of poInvModal.js:99 removeNonNumeric. Verbatim. */
const webRemoveNonNumeric = (num: any) =>
  num
    .toString()
    .replace(/[^0-9.-]/g, '')
    .replace(/(?!^)-/g, '')
    .replace(/(\..*?)\..*/g, '$1');

/** Mirror of poInvModal.js:107 handleValue, for name === 'invValue'. Verbatim. */
const webHandleInvValue = (item: any, raw: string) => {
  const newInvValue = webRemoveNonNumeric(raw);
  const payments = item.payments.map((z: any) => ({ ...z, pmnt: (newInvValue as any) * z.pmntPerc / 100 }));
  const tmp = payments.reduce((t: number, obj: any) => t + (parseFloat(obj.pmnt) || 0), 0);
  return { ...item, invValue: newInvValue, payments, pmnt: tmp, blnc: Math.round(((newInvValue as any) - tmp) * 100) / 100 };
};

/** Mirror of poInvModal.js:149 handleValuePerc. Verbatim — including the two early returns. */
const webHandleValuePerc = (item: any, pmntId: string, raw: string) => {
  const isValidNumberWithOneDot = (str: string) => /^[0-9]*\.?[0-9]*$/.test(str);
  if (!isValidNumberWithOneDot(raw)) return null;
  if (raw.length > 4) return null;
  const payments = item.payments.map((z: any) =>
    z.pmntId === pmntId ? { ...z, pmntPerc: raw, pmnt: (item.invValue * (raw as any)) / 100 } : z
  );
  const tmp = payments.reduce((t: number, obj: any) => t + (parseFloat(obj.pmnt) || 0), 0);
  return { ...item, payments, pmnt: tmp, blnc: Math.round((parseFloat(item.invValue) - tmp) * 100) / 100 };
};

/** Mirror of poInvModal.js:180 handleValuePmnt. Verbatim — including the >2-decimal early return. */
const webHandleValuePmnt = (item: any, pmntId: string, raw: string) => {
  if (webCountDecimalDigits(raw) > 2) return null;
  const payments = item.payments.map((z: any) =>
    z.pmntId === pmntId
      ? {
          ...z,
          pmnt: webRemoveNonNumeric(raw),
          pmntPerc: parseFloat((((webRemoveNonNumeric(raw) as any) * 100) / item.invValue).toFixed(2)),
        }
      : z
  );
  const tmp = payments.reduce((t: number, obj: any) => t + (parseFloat(obj.pmnt) || 0), 0);
  return { ...item, payments, pmnt: tmp, blnc: Math.round((parseFloat(item.invValue) - tmp) * 100) / 100 };
};

// ═════════════════════════════════════════════════════════════════════════════
// DRIFT ALARMS — every mirror above is guarded. A red here means web's formula
// moved and the mirror (plus, probably, the mobile port) is now stale.
// ═════════════════════════════════════════════════════════════════════════════

describe('web drift alarms for every mirrored formula', () => {
  it.each([
    [REVIEW_PAGE, 'TotalInvoicePayments', '8019cd2e204a'],
    [REVIEW_PAGE, 'TotalArrsExp', 'da5d1073acf6'],
    [REVIEW_PAGE, 'Total', '69ae0d7d30da'],
    [REVIEW_PAGE, 'setCurFilterData', '57b95d4f7cf5'],
    [REVIEW_PAGE, 'setTtl', '083e57eddb48'],
    [PNL_TAB, 'Total', '1546deb9844d'],
    [PNL_TAB, 'TotalArrsExp', '1e5e583766cc'],
    [PNL_TAB, 'contractMT', 'fa56b921037b'],
    [PNL_TAB, 'freightTotal', '13fcbba67f06'],
    [PNL_TAB, 'freightPerMT', '9448092b4d37'],
    [PO_MODAL, 'removeNonNumeric', 'c9104f21909c'],
    [PO_MODAL, 'countDecimalDigits', '0827dad18455'],
    [PO_MODAL, 'handleValue', 'ed51097cf12f'],
    [PO_MODAL, 'handleValuePerc', 'b95b134406df'],
    [PO_MODAL, 'handleValuePmnt', '521fce105164'],
    [DASH_FUNCS, 'Total', '95bda821d823'],
    /* Re-recorded 2026-08-17, after porting the four dashboard changes web made:
       the live-rate FX fallback, the shared IMS/GIS revenue split, the tonnage cap at
       PO value / average unit price, and expenses read from the canonical rows rather
       than each contract's stale embedded copy. Every behavioural test in this file
       was made to pass against the NEW web code before these were touched — the
       hashes were not bumped to silence the alarm. */
    [DASH_FUNCS, 'sumInvProductsMT', '378e398a6f57'],
    [DASH_FUNCS, 'calContracts', '98b37546200f'],
    [DASH_FUNCS, 'setMonthsInvoices', '14a676c70ca8'],
    [CONTRACTS_PAGE, 'showQTY', 'ce8934870ea0'],
    [CONTRACTS_PAGE, 'gQ', '7d3d74cf3746'],
  ])('%s :: %s is unchanged', (file, symbol, hash) => {
    expectWebUnchanged(file as string, symbol as string, hash as string);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// THE REVIEW WORLD — one settings object, five contracts that between them
// exercise every branch of the money columns.
// ═════════════════════════════════════════════════════════════════════════════

const SETTINGS = makeSettings();
const USD: ViewCur = { cur: 'us' };
const EUR: ViewCur = { cur: 'eu' };

/**
 * Contracts carry BOTH shapes of invoice doc and every superseding combination.
 * Freshly built per call so a mutating test cannot poison the next one.
 */
function reviewContracts() {
  // A — USD contract, invoice superseded by a credit note, payments on both docs.
  //     Prepayment goes NEGATIVE on the note, and payments exceed it, so debtaftr
  //     must come out negative.
  const a = makeContract({
    id: 'con-a',
    order: 'PO-A',
    cur: 'us',
    euroToUSD: 1.1,
    poInvoices: [makePoInvoice({ pmnt: '10000' }), makePoInvoice({ id: 'po-a2', pmnt: '2500' })],
    expenses: [
      makeContractExpense({ amount: '500', cur: 'us' }),
      makeContractExpense({ id: 'cex-a2', expType: 'exp-storage', amount: '300', cur: 'eu' }),
    ],
    invoicesData: [
      [
        makeInvoice({ id: 'a-orig', totalAmount: 12000, totalPrepayment: 3000, payments: [makePayment({ pmnt: '5000' })] }),
        makeCreditNote({ id: 'a-cn', totalAmount: -2000, totalPrepayment: -500, payments: [makePayment({ pmnt: '250' })] }),
      ],
    ],
  });

  // B — EUR contract whose FINALIZED invoice is billed in USD (cur is an OBJECT).
  //     Over-prepaid, so prepaidPer > 100% and debtaftr is strongly positive.
  const b = makeContract({
    id: 'con-b',
    order: 'PO-B',
    cur: 'eu',
    euroToUSD: 1.08,
    poInvoices: [makePoInvoice({ id: 'po-b1', pmnt: '8000' })],
    expenses: [makeContractExpense({ id: 'cex-b1', amount: '400', cur: 'eu' })],
    invoicesData: [
      [
        makeFinalizedInvoice({
          id: 'b-fin',
          totalAmount: 9000,
          totalPrepayment: 9500,
          payments: [makePayment({ pmnt: '200' })],
        }),
      ],
    ],
  });

  // C — plain singleton original: the ordinary happy path.
  const c = makeContract({
    id: 'con-c',
    order: 'PO-C',
    cur: 'us',
    euroToUSD: 1.2,
    poInvoices: [makePoInvoice({ id: 'po-c1', pmnt: '15000' })],
    expenses: [],
    invoicesData: [
      [makeInvoice({ id: 'c-orig', totalAmount: 20000, totalPrepayment: 6000, payments: [makePayment({ pmnt: '2000' })] })],
    ],
  });

  // D — negative prepayment against a positive sale: prepaidPer must go NEGATIVE.
  const d = makeContract({
    id: 'con-d',
    order: 'PO-D',
    cur: 'us',
    euroToUSD: 1.05,
    poInvoices: [makePoInvoice({ id: 'po-d1', pmnt: '3000' })],
    expenses: [],
    invoicesData: [
      [makeInvoice({ id: 'd-orig', totalAmount: 5000, totalPrepayment: -1000, payments: [] })],
    ],
  });

  // E — no linked invoices at all, plus a CANCELED doc on a second number.
  const e = makeContract({
    id: 'con-e',
    order: 'PO-E',
    cur: 'us',
    euroToUSD: 1.0,
    poInvoices: [makePoInvoice({ id: 'po-e1', pmnt: '1000' })],
    expenses: [],
    invoicesData: [
      [makeInvoice({ id: 'e-cancel', invoice: 1099, canceled: true, totalAmount: 7000, totalPrepayment: 4000, payments: [] })],
    ],
  });

  return [a, b, c, d, e];
}

// ═════════════════════════════════════════════════════════════════════════════
// TIER 2 — web's own exported helpers vs mobile's ports
// ═════════════════════════════════════════════════════════════════════════════

describe('Tier 2 — purchase value converts at the CONTRACT currency, into the view currency', () => {
  it('matches web ContractsValue for every contract in both view currencies', () => {
    for (const c of reviewContracts()) {
      for (const val of [USD, EUR]) {
        // web funcs.js:1 ContractsValue — mult is the contract's own euroToUSD.
        close(contractsValue(c, 'pmnt', val, parseFloat(c.euroToUSD) || 1), webContractsValue(c, 'pmnt', val, c.euroToUSD));
      }
    }
  });

  it('sums EVERY poInvoice, skipping rows whose field is not a number (web funcs.js:10)', () => {
    const c = makeContract({
      poInvoices: [makePoInvoice({ pmnt: '1000' }), makePoInvoice({ id: 'po-2', pmnt: '' }), makePoInvoice({ id: 'po-3', pmnt: 'n/a' })],
    });
    close(contractsValue(c, 'pmnt', USD, 1.1), webContractsValue(c, 'pmnt', USD, 1.1));
    close(contractsValue(c, 'pmnt', USD, 1.1), 1000);
  });
});

describe('Tier 2 — the totals row aggregates payments and expenses exactly like web', () => {
  it('Σ payments across all contracts equals web SumAllPayments (funcs.js:19)', () => {
    const contracts = reviewContracts();
    for (const val of [USD, EUR]) {
      const mobile = contracts.reduce(
        (s, c) => s + totalInvoicePayments(c.invoicesData, val, parseFloat(c.euroToUSD) || 1),
        0
      );
      close(mobile, webSumAllPayments(contracts, val));
    }
  });

  it('Σ contract expenses across all contracts equals web SumAllExp (funcs.js:46)', () => {
    const contracts = reviewContracts();
    for (const val of [USD, EUR]) {
      const mobile = contracts.reduce((s, c) => s + totalArrsExp(c.expenses, val, parseFloat(c.euroToUSD) || 1), 0);
      close(mobile, webSumAllExp(contracts, val));
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 3 — the review row (setCurFilterData) and the totals row (setTtl)
// ═════════════════════════════════════════════════════════════════════════════

describe('Tier 3 — one review row reproduces web setCurFilterData exactly', () => {
  it.each([
    ['USD view', USD],
    ['EUR view', EUR],
  ])('%s: all 11 money columns match the mirrored web row', (_label, val) => {
    for (const c of reviewContracts()) {
      const mob = reviewFinancials(c, c.invoicesData, val as ViewCur, SETTINGS);
      const web = webSetCurFilterRow(c, val, SETTINGS);
      close(mob.conValue, web.conValue);
      close(mob.totalInvoices, web.totalInvoices);
      close(mob.deviation, web.deviation);
      close(mob.totalPrepayment1, web.totalPrepayment1);
      close(mob.inDebt, web.inDebt);
      close(mob.payments, web.payments);
      close(mob.debtaftr, web.debtaftr);
      close(mob.debtBlnc, web.debtBlnc);
      close(mob.expenses1, web.expenses1);
      close(mob.profit, web.profit);
      // web renders prepaidPer as a 1-dp string, or '-' when 0/0. Mobile keeps the
      // raw number (null when web would render '-') and formats at the edge.
      expect(mob.prepaidPer === null ? '-' : mob.prepaidPer.toFixed(1) + '%').toBe(web.prepaidPer);
    }
  });

  it('the group rule: an original that stands ALONE is the current value (page.js:145)', () => {
    const c = reviewContracts()[2]; // PO-C, singleton original of 20000
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.totalInvoices).toBe(20000);
    expect(fin.originalInvoices).toBe(20000);
    expect(fin.deviation).toBe(0);
  });

  it('the supersede rule: with a note in the group the NOTE is current, the ORIGINAL is the deviation base (page.js:141-147)', () => {
    const c = reviewContracts()[0]; // PO-A: 12000 original + -2000 credit note
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    // accumuLastInv counts the note only; accumuDeviation counts the original only.
    expect(fin.totalInvoices).toBe(-2000);
    expect(fin.originalInvoices).toBe(12000);
    expect(fin.deviation).toBe(-14000);
    close(fin.totalInvoices, webTotal(c.invoicesData, 'totalAmount', USD, c.euroToUSD, SETTINGS).accumuLastInv);
    close(fin.originalInvoices, webTotal(c.invoicesData, 'totalAmount', USD, c.euroToUSD, SETTINGS).accumuDeviation);
  });

  it('a CANCELED doc contributes 0 to both the current and the original value (page.js:140)', () => {
    const c = reviewContracts()[4]; // PO-E, single canceled invoice worth 7000
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.totalInvoices).toBe(0);
    expect(fin.originalInvoices).toBe(0);
    // …but its PAYMENTS are NOT zeroed — TotalInvoicePayments has no canceled check.
    close(fin.payments, webTotalInvoicePayments(c.invoicesData, USD, c.euroToUSD));
  });

  it('payments are never superseded — every doc in every group contributes (page.js:89)', () => {
    const c = reviewContracts()[0]; // 5000 on the original + 250 on the credit note
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.payments).toBe(5250);
    close(fin.payments, webTotalInvoicePayments(c.invoicesData, USD, c.euroToUSD));
  });

  it('debt after prepayment is prepayment MINUS payments, not clamped at zero (page.js:354)', () => {
    const c = reviewContracts()[0]; // prepayment -500, payments 5250
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.debtaftr).toBe(-5750);
    expect(fin.debtaftr).toBe(fin.totalPrepayment1 - fin.payments);
    close(fin.debtaftr, webSetCurFilterRow(c, USD, SETTINGS).debtaftr);
    // The old mobile formula clamped: inDebt − max(0, payments − prepayment).
    const clamped = fin.inDebt - Math.max(0, fin.payments - fin.totalPrepayment1);
    expect(fin.debtaftr).not.toBe(clamped);
  });

  it('an OVER-prepaid contract keeps its positive credit after prepayment', () => {
    const c = reviewContracts()[1]; // PO-B: prepaid 9500 against a 9000 sale, 200 paid
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.totalPrepayment1).toBe(9500);
    expect(fin.debtaftr).toBeGreaterThan(0);
    expect(fin.debtaftr).toBe(fin.totalPrepayment1 - fin.payments);
    expect(fin.inDebt).toBe(-500); // sale − prepayment, legitimately negative
    close(fin.debtaftr, webSetCurFilterRow(c, USD, SETTINGS).debtaftr);
  });

  it('TIER 4 — a FINALIZED doc\'s PAYMENTS are converted by the raw `cur` object, unlike its value', () => {
    // page.js:96 TotalInvoicePayments compares `obj.cur === val.cur` directly, with
    // no `!obj.final` branch and no settings.Currency lookup — so on a finalized doc
    // (cur = { id:'us', cur:'USD' }) the comparison can never match and the payment
    // is multiplied by the contract's euroToUSD even when it was billed in the view
    // currency. page.js:136 Total DOES resolve the id. Mobile reproduces both, so the
    // screens agree; the inconsistency is web's and is recorded here rather than fixed.
    const c = reviewContracts()[1]; // EUR contract @1.08, finalized USD invoice, 200 paid
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    close(fin.payments, 200 * 1.08); // NOT 200, despite the doc being billed in USD
    close(fin.totalInvoices, 9000); // …while the VALUE is correctly left unconverted
    close(fin.payments, webTotalInvoicePayments(c.invoicesData, USD, c.euroToUSD));
  });

  it('prepaid % is null when there is no sale to divide by — web renders "-", never "0%" (page.js:351)', () => {
    const c = makeContract({ id: 'con-empty', invoicesData: [], expenses: [] });
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.totalInvoices).toBe(0);
    expect(fin.prepaidPer).toBeNull();
    expect(webSetCurFilterRow(c, USD, SETTINGS).prepaidPer).toBe('-'); // isNaN(0/0)
  });

  it('prepaid % may be NEGATIVE — a credit note legitimately drives it below zero', () => {
    const c = reviewContracts()[3]; // PO-D: prepayment -1000 against a 5000 sale
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    expect(fin.prepaidPer).toBeCloseTo(-20, 9);
    expect(webSetCurFilterRow(c, USD, SETTINGS).prepaidPer).toBe('-20.0%');
  });

  it('a FINALIZED doc resolves its currency id through settings.Currency before converting (page.js:136)', () => {
    const c = reviewContracts()[1]; // EUR contract, finalized invoice with cur = { id:'us', cur:'USD' }
    // Viewed in EUR the USD-billed sale is divided by the contract's euroToUSD…
    const inEur = reviewFinancials(c, c.invoicesData, EUR, SETTINGS);
    close(inEur.totalInvoices, 9000 / 1.08);
    // …and viewed in USD it is left alone.
    const inUsd = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    close(inUsd.totalInvoices, 9000);
    close(inEur.totalInvoices, webTotal(c.invoicesData, 'totalAmount', EUR, c.euroToUSD, SETTINGS).accumuLastInv);
  });

  it('an expense converts by its OWN currency flag, not the contract\'s (page.js:115)', () => {
    const c = reviewContracts()[0]; // 500 USD + 300 EUR on a USD contract @1.1
    const fin = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    close(fin.expenses1, 500 + 300 * 1.1);
    close(fin.expenses1, webTotalArrsExp(c.expenses, USD, c.euroToUSD));
  });
});

describe('Tier 3 — the totals row is a SINGLE row in one view currency (setTtl, page.js:469)', () => {
  it('every money total equals web setTtl for the same contracts', () => {
    for (const val of [USD, EUR]) {
      const contracts = reviewContracts();
      const rows: ReviewFinancials[] = contracts.map((c) => reviewFinancials(c, c.invoicesData, val, SETTINGS));
      const mob = sumReviewFinancials(rows);
      // web's setTtl reads obj.deviation off the row setCurFilterData already wrote.
      const enriched = contracts.map((c) => ({ ...c, ...webSetCurFilterRow(c, val, SETTINGS) }));
      const web = webSetTtl(enriched, val, SETTINGS)[0];

      close(mob.conValue, web.conValue);
      close(mob.totalInvoices, web.totalInvoices);
      close(mob.deviation, web.deviation);
      close(mob.totalPrepayment1, web.totalPrepayment1);
      close(mob.inDebt, web.inDebt);
      close(mob.payments, web.payments);
      close(mob.debtaftr, web.debtaftr);
      close(mob.debtBlnc, web.debtBlnc);
      close(mob.expenses1, web.expenses1);
      close(mob.profit, web.profit);
      // web formats the totals-row percentage to TWO decimals (rows use one).
      expect(mob.prepaidPer === null ? '-' : mob.prepaidPer.toFixed(2) + '%').toBe(web.prepaidPer);
    }
  });

  it('EUR and USD contracts land in ONE row — there is no per-currency bucket', () => {
    const contracts = reviewContracts();
    const rows = contracts.map((c) => reviewFinancials(c, c.invoicesData, USD, SETTINGS));
    const mob = sumReviewFinancials(rows);
    // The EUR contract's 8000 purchase is converted at ITS OWN 1.08 and added to
    // the USD contracts' purchases in the same scalar. Bucketing would keep them apart.
    close(mob.conValue, 10000 + 2500 + 8000 * 1.08 + 15000 + 3000 + 1000);
    // …and mobile really does return ONE object, not a map keyed by currency.
    expect(Array.isArray(mob)).toBe(false);
    expect(mob).not.toHaveProperty('us');
    expect(mob).not.toHaveProperty('eu');
    // web's own setTtl builds a single-element array literal tagged 'us' (page.js:497).
    // Asserted against web's SOURCE, not against the local mirror — the mirror is a
    // literal `return [{…}]` and could never fail this.
    const ttlSrc = webFnSource(REVIEW_PAGE, 'setTtl');
    expect(ttlSrc).toContain("cur: 'us'");
    expect(ttlSrc.match(/let Ttls = \[\{/g)).toHaveLength(1);
  });

  it("web's review page never imports the per-currency bucketing helpers", () => {
    // funcs.js also exports Numcur/SumValuesSupplier, whose multiplier is 1-or-ZERO
    // (funcs.js:102,115) — those bucket by currency. The Review page imports only the
    // converting trio, which is why ONE global valCur is the correct model.
    const src = repoFileText(REVIEW_PAGE);
    expect(src).toContain("import { ContractsValue, SumAllPayments, SumAllExp } from './funcs'");
    expect(src).not.toContain('Numcur');
    expect(src).not.toContain('SumValuesSupplier');
    // and the selector defaults to USD (page.js:215)
    expect(src).toContain("useState({ cur: 'us' })");
  });

  it('the totals percentage is recomputed from the totals, not averaged across rows', () => {
    const contracts = reviewContracts();
    const rows = contracts.map((c) => reviewFinancials(c, c.invoicesData, USD, SETTINGS));
    const mob = sumReviewFinancials(rows);
    close(mob.prepaidPer as number, (mob.totalPrepayment1 / mob.totalInvoices) * 100);
    const meanOfRows =
      rows.reduce((s, r) => s + (r.prepaidPer ?? 0), 0) / rows.filter((r) => r.prepaidPer !== null).length;
    expect(mob.prepaidPer).not.toBeCloseTo(meanOfRows, 6);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONTRACT P&L TAB (pnl.js)
// ═════════════════════════════════════════════════════════════════════════════

/** A contract whose SALES-INVOICE docs carry expenses that differ from the contract's own. */
function pnlContract() {
  return makeContract({
    id: 'con-pnl',
    cur: 'us',
    euroToUSD: 1.25,
    productsData: [makeProduct({ qnty: '20' }), makeImportProduct({ qnty: '8' })],
    poInvoices: [makePoInvoice({ pmnt: '18000' })],
    // contract-level expenses: what the REVIEW page sums, and what freight/MT uses
    expenses: [
      makeContractExpense({ id: 'cex-f', expType: 'exp-freight', amount: '1200', cur: 'us' }),
      makeContractExpense({ id: 'cex-f2', expType: 'exp-freight', amount: '400', cur: 'eu' }),
      makeContractExpense({ id: 'cex-o', expType: 'exp-other', amount: '900', cur: 'us' }),
    ],
    invoicesData: [
      [
        makeInvoice({
          id: 'p-orig',
          totalAmount: 25000,
          // invoice-level expenses: what the P&L tab sums
          expenses: [
            { id: 'ie-1', expType: 'exp-commission', amount: '750', cur: 'us' },
            { id: 'ie-2', expType: 'exp-storage', amount: '200', cur: 'eu' },
          ],
        }),
      ],
    ],
  });
}

describe('Contract P&L tab — sale, expenses, profit and freight/MT', () => {
  it('P&L Expenses come from the SALES-INVOICE docs, NOT contract.expenses (pnl.js:64)', () => {
    const c = pnlContract();
    const pnl = contractPnl(c, 'us', SETTINGS)!;
    close(pnl.expenses, webPnlArrsExp(c.invoicesData, USD, c.euroToUSD));
    close(pnl.expenses, 750 + 200 * 1.25);
    // …and that is a DIFFERENT number from the contract's own expenses, which is
    // what the Contracts Review page shows for the same contract.
    const review = reviewFinancials(c, c.invoicesData, USD, SETTINGS);
    close(review.expenses1, 1200 + 400 * 1.25 + 900);
    expect(pnl.expenses).not.toBeCloseTo(review.expenses1, 6);
  });

  it('purchase value, sale value and profit reproduce the web tab', () => {
    for (const val of [USD, EUR]) {
      const c = pnlContract();
      const pnl = contractPnl(c, val.cur, SETTINGS)!;
      const mult = parseFloat(c.euroToUSD) || 1;
      close(pnl.purchaseValue, webContractsValue(c, 'pmnt', val, c.euroToUSD));
      close(pnl.saleValue, webPnlTotal(c.invoicesData, 'totalAmount', val, c.euroToUSD, SETTINGS));
      close(pnl.expenses, webPnlArrsExp(c.invoicesData, val, mult));
      // pnl.js:218 — Profit = Sale − Purchase − Expenses
      close(
        pnl.profit,
        webPnlTotal(c.invoicesData, 'totalAmount', val, c.euroToUSD, SETTINGS) -
          webContractsValue(c, 'pmnt', val, c.euroToUSD) -
          webPnlArrsExp(c.invoicesData, val, mult)
      );
    }
  });

  it('freight/MT allocates FREIGHT-labelled expenses over the non-import tonnage (pnl.js:160-170)', () => {
    for (const val of [USD, EUR]) {
      const c = pnlContract();
      const pnl = contractPnl(c, val.cur, SETTINGS)!;
      const web = webPnlFreight(c, val, SETTINGS);
      close(pnl.contractMT, web.contractMT);
      close(pnl.freightTotal, web.freightTotal);
      close(pnl.freightPerMT, web.freightPerMT);
    }
    // 20 MT of PO lines; the 8 MT import-flagged breakdown row is excluded.
    expect(contractPnl(pnlContract(), 'us', SETTINGS)!.contractMT).toBe(20);
    // exp-other is not freight-labelled and must not be allocated.
    close(contractPnl(pnlContract(), 'us', SETTINGS)!.freightTotal, 1200 + 400 * 1.25);
  });

  it('freight/MT is 0 rather than Infinity when the contract has no tonnage (pnl.js:170)', () => {
    const c = makeContract({ productsData: [], expenses: [makeContractExpense({ expType: 'exp-freight', amount: '500' })] });
    const pnl = contractPnl(c, 'us', SETTINGS)!;
    expect(pnl.contractMT).toBe(0);
    expect(pnl.freightPerMT).toBe(0);
    expect(webPnlFreight(c, USD, SETTINGS).freightPerMT).toBe(0);
  });

  it('a group of ONE counts whatever it is — a lone Final Note is still the sale (pnl.js:38)', () => {
    // This is the case mobile used to drop: the Review page's rule demands a
    // singleton be an ORIGINAL, so a contract whose only linked doc is a note read
    // as sale 0 and profit = −purchase. pnl.js and dashboard/funcs.js:21 both count it.
    const c = makeContract({
      id: 'con-lone-note',
      invoicesData: [[makeFinalNote({ id: 'lone-fn', totalAmount: 11500 })]],
      expenses: [],
    });
    const pnl = contractPnl(c, 'us', SETTINGS)!;
    expect(pnl.saleValue).toBe(11500);
    close(pnl.saleValue, webPnlTotal(c.invoicesData, 'totalAmount', USD, c.euroToUSD, SETTINGS));
    // The Review page's rule really is different — that is not a bug there, it is
    // what page.js:145 says, and mobile reproduces it on the Review screen.
    expect(reviewFinancials(c, c.invoicesData, USD, SETTINGS).totalInvoices).toBe(0);
  });

  it('in a multi-doc group the note supersedes the original (pnl.js:38, draft-shape docs)', () => {
    const c = makeContract({
      id: 'con-pair',
      invoicesData: [[makeInvoice({ id: 'x-o', totalAmount: 12000 }), makeCreditNote({ id: 'x-cn', totalAmount: -2000 })]],
      expenses: [],
    });
    const pnl = contractPnl(c, 'us', SETTINGS)!;
    expect(pnl.saleValue).toBe(-2000);
    close(pnl.saleValue, webPnlTotal(c.invoicesData, 'totalAmount', USD, c.euroToUSD, SETTINGS));
  });

  it('TIER 4 — mobile refuses web pnl.js\'s double count of a FINALIZED original beside its note', () => {
    // pnl.js:38 tests `obj.invType !== '1111'`. A finalized original stores invType
    // as the LABEL 'Invoice', so that test is TRUE for it and web adds the original
    // AND the note. Web's own Review page (page.js:141-147) and Dashboard
    // (dashboard/funcs.js:22) both use ['1111','Invoice'].includes(...); pnl.js is the
    // outlier. Mobile follows the other two. Asserted as a divergence, not silently.
    const c = makeContract({
      id: 'con-final-pair',
      invoicesData: [
        [
          makeFinalizedInvoice({ id: 'f-o', totalAmount: 12000 }),
          makeFinalizedInvoice({ id: 'f-cn', invType: 'Credit Note', totalAmount: -2000 }),
        ],
      ],
      expenses: [],
    });
    const webValue = webPnlTotal(c.invoicesData, 'totalAmount', USD, c.euroToUSD, SETTINGS);
    expect(webValue).toBe(10000); // 12000 + (−2000): the original was NOT superseded
    expect(contractPnl(c, 'us', SETTINGS)!.saleValue).toBe(-2000); // note supersedes
    // The Review page and the Dashboard agree with mobile here.
    expect(reviewTotal(c.invoicesData, 'totalAmount', USD, 1.1, SETTINGS).accumuLastInv).toBe(-2000);
    expect(webDashTotal(c.invoicesData, 'totalAmount', 1.1, SETTINGS)).toBe(-2000);
  });

  it('pnlSaleValue and pnlExpenses are the two pieces contractPnl is built from', () => {
    const c = pnlContract();
    close(pnlSaleValue(c.invoicesData, USD, 1.25, SETTINGS), contractPnl(c, 'us', SETTINGS)!.saleValue);
    close(pnlExpenses(c.invoicesData, USD, 1.25), contractPnl(c, 'us', SETTINGS)!.expenses);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PURCHASE-INVOICE EDITING MODEL (poInvModal.js)
// ═════════════════════════════════════════════════════════════════════════════

const poRow = (over?: Record<string, any>): PoInvoice =>
  ({
    id: 'po-1',
    inv: 'SUP-INV-001',
    invValue: '10000',
    pmnt: 10000,
    blnc: 0,
    invRef: [],
    payments: [
      makePoPayment({ pmntId: 'p1', pmntPerc: '30', pmnt: '3000' }),
      makePoPayment({ pmntId: 'p2', pmntPerc: '70', pmnt: '7000' }),
    ],
    ...(over || {}),
  }) as PoInvoice;

describe('purchase-invoice editing reproduces the web modal', () => {
  it('removeNonNumeric drops non-leading minus signs and every dot after the first (poInvModal.js:99)', () => {
    for (const raw of ['1.2.3', '1-2', '-5-6', 'US$ 12,345.67', '', '..', '-.5', '3.']) {
      expect(removeNonNumeric(raw)).toBe(webRemoveNonNumeric(raw));
    }
    // Spelled out, because these are the cases the loose margins/funcs.js one-liner
    // (which mobile used to carry) gets wrong:
    expect(removeNonNumeric('1.2.3')).toBe('1.2');
    expect(removeNonNumeric('1-2')).toBe('12');
  });

  it('countDecimalDigits is web\'s exponent-aware, leading-zero-stripping version (margins/funcs.js:6)', () => {
    for (const raw of ['1', '1.5', '1.55', '1.005', '1.0500', '12.30', '1e5', '2.5e-3', '', '0.001']) {
      expect(countDecimalDigits(raw)).toBe(webCountDecimalDigits(raw));
    }
    // The quirk worth pinning: leading zeros are stripped BEFORE counting, so
    // '1.005' is ONE decimal digit by this rule and the >2 guard lets it through.
    expect(countDecimalDigits('1.005')).toBe(1);
    expect(countDecimalDigits('1.234')).toBe(3);
  });

  it('changing the invoice VALUE rescales each payment by its stored percentage (poInvModal.js:120)', () => {
    const next = setInvoiceField([poRow()], 'po-1', 'invValue', '20,000')[0];
    const web = webHandleInvValue(poRow(), '20,000');
    expect(next.invValue).toBe(web.invValue);
    expect(next.payments.map((p) => p.pmnt)).toEqual(web.payments.map((p: any) => p.pmnt));
    close(next.pmnt as number, web.pmnt);
    close(next.blnc as number, web.blnc);
    // invariants web maintains: pmnt = Σ payments, blnc = round2(invValue − pmnt)
    expect(next.pmnt).toBe(20000);
    expect(next.blnc).toBe(0);
  });

  it('editing the invoice NUMBER never touches the payment schedule (poInvModal.js:115)', () => {
    const before = poRow();
    const next = setInvoiceField([before], 'po-1', 'inv', 'SUP-INV-002')[0];
    expect(next.inv).toBe('SUP-INV-002');
    expect(next.payments).toEqual(before.payments);
    expect(next.pmnt).toBe(before.pmnt);
    expect(next.blnc).toBe(before.blnc);
  });

  it('editing a payment PERCENTAGE derives its amount from invValue (poInvModal.js:162)', () => {
    const next = setPaymentPerc([poRow()], 'po-1', 'p1', '40')!;
    const web = webHandleValuePerc(poRow(), 'p1', '40')!;
    expect(next[0].payments.map((p) => p.pmnt)).toEqual(web.payments.map((p: any) => p.pmnt));
    close(next[0].pmnt as number, web.pmnt);
    close(next[0].blnc as number, web.blnc);
    expect(next[0].payments[0].pmnt).toBe(4000);
  });

  it('a percentage keystroke web REJECTS is rejected on mobile too (poInvModal.js:151-153)', () => {
    // web returns before setValueCon, i.e. the row is left exactly as it was.
    for (const raw of ['4o', '1.2.3', '-5', '100.5', '12345']) {
      expect(webHandleValuePerc(poRow(), 'p1', raw)).toBeNull();
      expect(setPaymentPerc([poRow()], 'po-1', 'p1', raw)).toBeNull();
    }
    // …and one it accepts, for contrast.
    expect(setPaymentPerc([poRow()], 'po-1', 'p1', '12.5')).not.toBeNull();
  });

  it('editing a payment AMOUNT derives its percentage of invValue (poInvModal.js:191)', () => {
    const next = setPaymentAmount([poRow()], 'po-1', 'p1', '2500')!;
    const web = webHandleValuePmnt(poRow(), 'p1', '2500')!;
    expect(next[0].payments[0].pmnt).toBe(web.payments[0].pmnt);
    expect(next[0].payments[0].pmntPerc).toBe(web.payments[0].pmntPerc);
    expect(next[0].payments[0].pmntPerc).toBe(25);
    close(next[0].pmnt as number, web.pmnt);
    close(next[0].blnc as number, web.blnc);
    expect(next[0].blnc).toBe(500); // 10000 − (2500 + 7000)
  });

  it('an amount with more than 2 decimal digits is rejected on both sides (poInvModal.js:182)', () => {
    expect(webHandleValuePmnt(poRow(), 'p1', '10.123')).toBeNull();
    expect(setPaymentAmount([poRow()], 'po-1', 'p1', '10.123')).toBeNull();
    // …but web's leading-zero stripping means '10.005' IS allowed.
    expect(webHandleValuePmnt(poRow(), 'p1', '10.005')).not.toBeNull();
    expect(setPaymentAmount([poRow()], 'po-1', 'p1', '10.005')).not.toBeNull();
  });

  it('deleting or adding a payment re-derives pmnt and blnc from the surviving rows', () => {
    const afterDelete = deletePayment([poRow()], 'po-1', 'p2')[0];
    expect(afterDelete.pmnt).toBe(3000);
    expect(afterDelete.blnc).toBe(7000); // round2(10000 − 3000)
    const afterAdd = addPayment([afterDelete], 'po-1', 'p3')[0];
    expect(afterAdd.payments).toHaveLength(2);
    expect(afterAdd.payments[1]).toEqual({ pmntId: 'p3', pmntDate: null, pmntPerc: '', pmnt: '' });
  });

  it('a blank purchase invoice starts settled at zero, and Draft hides it from Cashflow', () => {
    const blank = blankPoInvoice('po-new', 'pay-new');
    expect(blank.pmnt).toBe('0');
    expect(blank.payments).toHaveLength(1);
    expect(toggleDraft([blank], 'po-new', true)[0].draft).toBe(true);
    // web poInvModal.js:222 toggleDraft flips the same flag the cashflow reader skips.
    expect(webFnSource(PO_MODAL, 'toggleDraft')).toContain('draft: !item.draft');
  });

  it('TIER 4 — mobile is NaN-hardened where web propagates NaN through blnc', () => {
    // web (poInvModal.js:174) does Math.round((parseFloat(item.invValue) − tmp) * 100)/100,
    // so an invoice with no value yet yields NaN and the modal renders "NaN".
    // Mobile's round2 coerces the missing value to 0. Asserted, not hidden.
    const empty = poRow({ invValue: '', payments: [makePoPayment({ pmntId: 'p1', pmntPerc: '50', pmnt: '100' })] });
    expect(webHandleValuePerc(empty, 'p1', '50')!.blnc).toBeNaN();
    expect(setPaymentPerc([empty], 'po-1', 'p1', '50')![0].blnc).toBe(0);
  });

  it('TIER 4 — mobile guards the percentage division web leaves to produce Infinity', () => {
    // web: parseFloat((clean * 100 / item.invValue).toFixed(2)) with invValue '0'.
    const zero = poRow({ invValue: '0', payments: [makePoPayment({ pmntId: 'p1', pmntPerc: '0', pmnt: '0' })] });
    expect(webHandleValuePmnt(zero, 'p1', '500')!.payments[0].pmntPerc).toBe(Infinity);
    expect(setPaymentAmount([zero], 'po-1', 'p1', '500')![0].payments[0].pmntPerc).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD P&L CHAIN (dashboard/funcs.js calContracts / setMonthsInvoices)
// ═════════════════════════════════════════════════════════════════════════════

const PNL_SCENARIOS = [
  'singleInvoice',
  'invoicePlusCreditNote',
  'invoicePlusCreditPlusFinal',
  'twoOriginalsSameNumber',
  'eurContractUsdInvoice',
  'overShipped',
  'draftAndCanceled',
  'kgsContractImportRows',
] as const;

describe('Tier 2 — computePnl reproduces web calContracts figure for figure', () => {
  it.each(PNL_SCENARIOS)('%s', (name) => {
    const w = scenario(name);
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    const web = webCalContracts(w.contracts, w.settings, w.companyRate);

    close(mob.totalMT, web.totalMT);
    close(mob.shippedMT, web.shippedMT);
    close(mob.cogs, web.cogs);
    close(mob.unsoldValue, web.unsoldValue);
    close(mob.freightTotal, web.freightTotal);
    expect(mob.missingRate).toBe(web.missingRate);
    // web keys its month maps 1..12; mobile indexes 0..11.
    for (let i = 0; i < 12; i++) {
      close(mob.purchaseByMonth[i], web.accumulatedPmnt[i + 1]);
      close(mob.expensesByMonth[i], web.accumulatedExp[i + 1]);
      close(mob.cogsByMonth[i], web.cogsByMonth[i + 1]);
      close(mob.storageByMonth[i], web.storageByMonth[i + 1]);
    }
    // SYMMETRIC: an extra key on either side is a failure, not a silent pass.
    expect(Object.keys(mob.expByType).sort()).toEqual(Object.keys(web.expByType).sort());
    for (const k of Object.keys(web.expByType)) close(mob.expByType[k], web.expByType[k]);
    expect(Object.keys(mob.materialSold).sort()).toEqual(Object.keys(web.materialSold).sort());
    for (const k of Object.keys(web.materialSold)) close(mob.materialSold[k], web.materialSold[k]);
    // web's pieArrSupps is the same map with ZERO entries dropped and sorted desc
    // (funcs.js:56 setPieArrs), so compare mobile's non-zero keys against it.
    expect(nonZeroKeys(mob.supplierTotals)).toEqual(Object.keys(web.pieArrSupps as object).sort());
    for (const [k, v] of Object.entries(web.pieArrSupps as Record<string, number>)) {
      close(mob.supplierTotals[k], v);
    }
  });

  it('the scalar totals mobile adds are the sums of the monthly series web returns', () => {
    const w = scenario('singleInvoice');
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    const web = webCalContracts(w.contracts, w.settings, w.companyRate);
    const sum = (o: Record<string, number>) => Object.values(o).reduce((s, v) => s + v, 0);
    close(mob.expensesTotal, sum(web.accumulatedExp));
    close(mob.storageTotal, sum(web.storageByMonth));
  });
});

describe('Tier 2 — deal-basis revenue by month matches web setMonthsInvoices', () => {
  it.each(PNL_SCENARIOS)('%s', (name) => {
    const w = scenario(name);
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    const web = webSetMonthsInvoices(w.contracts, w.settings, w.companyRate);
    for (let i = 0; i < 12; i++) close(mob.dealRevenueByMonth[i], web.accumulatedPmnt[i + 1]);
    close(
      mob.dealRevenue,
      Object.values(web.accumulatedPmnt as Record<string, number>).reduce((s, v) => s + v, 0)
    );
    // consignee ranking — web drops zero entries via setPieArrs (funcs.js:56), mobile
    // keeps them, so compare mobile's NON-ZERO keys. Symmetric: a client mobile
    // invents, or one it loses, fails here.
    expect(nonZeroKeys(mob.clientTotals)).toEqual(Object.keys(web.pieArrClnts as object).sort());
    for (const [k, v] of Object.entries(web.pieArrClnts as Record<string, number>)) {
      close(mob.clientTotals[k], v);
    }
  });
});

describe('Tier 3 — dealRevenue mirrors dashboard/funcs.js Total (not exported by web)', () => {
  it.each(PNL_SCENARIOS)('%s: per-contract revenue equals the mirrored web rule', (name) => {
    const w = scenario(name);
    for (const c of w.contracts) {
      const contractRate = parseFloat(c.euroToUSD as any);
      const mult = w.companyRate > 0 ? w.companyRate : contractRate > 0 ? contractRate : 1;
      close(dealRevenue(c.invoicesData, mult, w.settings), webDashTotal(c.invoicesData, 'totalAmount', mult, w.settings));
    }
  });

  it('drafts AND canceled are excluded from revenue, and a lone note still counts (funcs.js:15,21)', () => {
    const w = scenario('draftAndCanceled');
    const c = w.contracts[0];
    // issued 12000, draft 5000, canceled 4000 — only the issued one is revenue.
    close(dealRevenue(c.invoicesData, 1.1, w.settings), 12000);
    close(dealRevenue(c.invoicesData, 1.1, w.settings), webDashTotal(c.invoicesData, 'totalAmount', 1.1, w.settings));
  });
});

describe('Tier 4 — pnlChain reproduces web\'s two shipped-MT traps on purpose', () => {
  it('trap 1: a DRAFT invoice inflates shipped MT even though it earns no revenue', () => {
    // web funcs.js:105 checks `obj.canceled` only. The draft's 3 MT therefore lands
    // in shippedMT while contributing 0 to revenue, so COGS runs high.
    expect(webFnSource(DASH_FUNCS, 'sumInvProductsMT')).toContain('obj.canceled');
    expect(webFnSource(DASH_FUNCS, 'sumInvProductsMT')).not.toContain('draft');

    const w = scenario('draftAndCanceled');
    const c = w.contracts[0];
    expect(sumInvProductsMT(c.invoicesData)).toBe(13); // 10 issued + 3 draft, canceled skipped
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    const web = webCalContracts(w.contracts, w.settings, w.companyRate);
    close(mob.shippedMT, web.shippedMT);
    expect(mob.shippedMT).toBe(13);
    expect(DASHBOARD_PNL_CAVEATS[0]).toMatch(/[Dd]raft/);
  });

  it('trap 2: invoice qty is summed RAW while contract qty is converted to MT', () => {
    // 12,000 KGS = 12 MT of contract, but the invoice's raw 10 is not converted, so
    // soldFrac reads 10/12 instead of 10,000/12,000 → meaningless for KGS/LB.
    const w = scenario('kgsContractImportRows');
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    const web = webCalContracts(w.contracts, w.settings, w.companyRate);
    // The fixture's line values are 401x its PO value, so web's tonnage cap
    // (funcs.js VALUE_TOLERANCE) now fires and rewrites 16 MT to PO value / average
    // unit price. Both apps agree on the capped figure — the assertion below proves
    // it — so the literal records the CAPPED value; the raw 16 lives in dataIssues
    // as `enteredMT`. The trap this test is really about (invoice qty raw, contract
    // qty converted) is unaffected: shippedMT is still an unconverted 10.
    expect(mob.totalMT).toBeCloseTo(web.totalMT, 9);
    expect(mob.dataIssues.find((d: any) => d.kind === 'value')?.enteredMT).toBeCloseTo(16, 9);
    expect(mob.shippedMT).toBe(10); // raw, unconverted
    close(mob.totalMT, web.totalMT);
    close(mob.shippedMT, web.shippedMT);
    close(mob.cogs, web.cogs);
    expect(DASHBOARD_PNL_CAVEATS[1]).toMatch(/raw/);
  });

  it('the dashboard counts import-flagged rows the contracts page excludes (funcs.js:241)', () => {
    const w = scenario('kgsContractImportRows');
    const c = w.contracts[0];
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    close(mob.totalMT, webCalContracts(w.contracts, w.settings, w.companyRate).totalMT);
    // 16 MT on the dashboard vs 12 MT of actual PO lines on the contracts page.
    expect(ownProducts(c).reduce((s: number, p: any) => s + parseFloat(p.qnty) * 0.001, 0)).toBeCloseTo(12, 9);
  });

  it('soldFrac clamps at 1 so an over-shipped contract never books negative unsold stock', () => {
    const w = scenario('overShipped');
    const mob = computePnl(w.contracts, w.settings, w.companyRate);
    const web = webCalContracts(w.contracts, w.settings, w.companyRate);
    close(mob.cogs, web.cogs);
    close(mob.unsoldValue, web.unsoldValue);
    expect(mob.unsoldValue).toBe(0);
    close(mob.cogs, 10000); // the whole purchase becomes cost
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// deriveContract — the QTY column (Tier 3 mirror + Tier 4 divergence)
// ═════════════════════════════════════════════════════════════════════════════

describe('deriveContract — the quantity label mirrors web\'s QTY column', () => {
  it('mtLabel reproduces web showQTY, parseInt truncation included (contracts/page.js:154)', () => {
    const c = makeContract({ productsData: [makeProduct({ qnty: '12.5' })] });
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe(webShowQTY(c, 'MT'));
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe('12.0 MT');
  });

  it('TIER 4 — mtLabel TRUNCATES like web while totalMT stays accurate', () => {
    // The truncation is a genuine web defect (12.5 reads "12.0"). mtLabel reproduces
    // it so the two screens agree; totalMT is what sorting and the exports use.
    const c = makeContract({ productsData: [makeProduct({ qnty: '12.5' }), makeProduct({ id: 'prd-2', qnty: '3.4' })] });
    const view = deriveContract(c as any, SETTINGS);
    expect(view.mtLabel).toBe(webShowQTY(c, 'MT')); // '15.0' — 12 + 3
    expect(view.mtLabel).toBe('15.0 MT');
    expect(view.totalMT).toBeCloseTo(15.9, 9); // NOT truncated
  });

  it('import-flagged breakdown rows are excluded from both label and tonnage', () => {
    const c = makeContract({ productsData: [makeProduct({ qnty: '10' }), makeImportProduct({ qnty: '4' })] });
    const view = deriveContract(c as any, SETTINGS);
    expect(view.mtLabel).toBe(webShowQTY(c, 'MT'));
    expect(view.mtLabel).toBe('10.0 MT');
    expect(view.totalMT).toBe(10);
  });

  it('the label is NOT unit-converted — a KGS contract reads in KGS (page.js:161 gQ)', () => {
    const c = makeContract({ qTypeTable: 'q-kgs', productsData: [makeProduct({ qnty: '12000' })] });
    const view = deriveContract(c as any, SETTINGS);
    expect(view.mtLabel).toBe(webShowQTY(c, 'KGS'));
    expect(view.mtLabel).toBe('12,000.0 KGS');
    expect(view.totalMT).toBeCloseTo(12, 9); // …while totalMT IS converted
  });

  it('a contract with no PO lines renders "-" (page.js:157)', () => {
    const c = makeContract({ productsData: [makeImportProduct()] });
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe(webShowQTY(c, 'MT'));
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe('-');
  });

  it('TIER 4 — a blank quantity makes web\'s label "NaN"; mobile reproduces it so the screens agree', () => {
    const c = makeContract({ productsData: [makeProduct({ qnty: '' })] });
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe(webShowQTY(c, 'MT'));
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe('NaN MT');
    expect(deriveContract(c as any, SETTINGS).totalMT).toBe(0); // the number stays usable
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD EXPENSES — none of the shared SCENARIOS carries a contract expense,
// so every expense figure in computePnl (expByType, storage, freight, the FX rule
// and the label fallback) was passing on 0 === 0. This world exercises all of it.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * settings with TWO extra expense types whose labels merely CONTAIN "freight".
 * web funcs.js:212 and pnl.js:153 both detect freight with
 * `String(e.expType||'').toLowerCase().includes('freight')`, so these must count.
 */
function expenseSettings() {
  const s = structuredClone(makeSettings()) as any;
  s.Expenses.Expenses.push({ id: 'exp-sea-freight', expType: 'Sea Freight' });
  s.Expenses.Expenses.push({ id: 'exp-freight-courier', expType: 'FreightReloadCourier' });
  return s;
}

/** Two contracts in DIFFERENT months, with the full spread of expense types and currencies. */
function expenseWorld() {
  const usdMarch = makeContract({
    id: 'con-x1',
    supplier: 'sup-1',
    cur: 'us',
    euroToUSD: 1.4,
    date: '2026-03-15',
    dateRange: { startDate: '2026-03-15', endDate: '2026-03-15' },
    invoicesData: [[makeInvoice({ id: 'x1-inv' })]],
    expenses: [
      makeContractExpense({ id: 'x1-e1', expType: 'exp-freight', amount: '1000', cur: 'us' }),
      // label "Sea Freight" — freight by SUBSTRING, and a EUR expense on a USD contract
      makeContractExpense({ id: 'x1-e2', expType: 'exp-sea-freight', amount: '600', cur: 'eu' }),
      makeContractExpense({ id: 'x1-e3', expType: 'exp-warehouse', amount: '250', cur: 'us' }),
      makeContractExpense({ id: 'x1-e4', expType: 'exp-storage', amount: '150', cur: 'eu' }),
      // an expType id that is NOT in settings → web labels it 'Unspecified' (funcs.js:214)
      makeContractExpense({ id: 'x1-e5', expType: 'exp-ghost', amount: '75', cur: 'us' }),
      // a blank amount — web skips it via !isNaN(parseFloat(...))
      makeContractExpense({ id: 'x1-e6', expType: 'exp-commission', amount: '', cur: 'us' }),
    ],
  });
  const eurJuly = makeContract({
    id: 'con-x2',
    supplier: 'sup-2',
    cur: 'eu',
    euroToUSD: 1.3,
    date: '2026-07-04',
    dateRange: { startDate: '2026-07-04', endDate: '2026-07-04' },
    poInvoices: [makePoInvoice({ id: 'x2-po', pmnt: '7000' })],
    productsData: [makeProduct({ id: 'x2-p', qnty: '25', description: 'Cr Scrap 430' })],
    invoicesData: [[makeFinalizedInvoice({ id: 'x2-inv', totalAmount: 9000 })]],
    expenses: [
      makeContractExpense({ id: 'x2-e1', expType: 'exp-freight-courier', amount: '400', cur: 'eu' }),
      makeContractExpense({ id: 'x2-e2', expType: 'exp-other', amount: '200', cur: 'us' }),
    ],
  });
  return [usdMarch, eurJuly];
}

/** Every figure computePnl returns, against web calContracts, symmetrically. */
function expectPnlMatchesWeb(contracts: any[], settings: any, companyRate: number) {
  const mob = computePnl(contracts, settings, companyRate);
  const web = webCalContracts(contracts, settings, companyRate);
  close(mob.totalMT, web.totalMT);
  close(mob.shippedMT, web.shippedMT);
  close(mob.cogs, web.cogs);
  close(mob.unsoldValue, web.unsoldValue);
  close(mob.freightTotal, web.freightTotal);
  expect(mob.missingRate).toBe(web.missingRate);
  for (let i = 0; i < 12; i++) {
    close(mob.purchaseByMonth[i], web.accumulatedPmnt[i + 1]);
    close(mob.expensesByMonth[i], web.accumulatedExp[i + 1]);
    close(mob.cogsByMonth[i], web.cogsByMonth[i + 1]);
    close(mob.storageByMonth[i], web.storageByMonth[i + 1]);
  }
  expect(Object.keys(mob.expByType).sort()).toEqual(Object.keys(web.expByType).sort());
  for (const k of Object.keys(web.expByType)) close(mob.expByType[k], web.expByType[k]);
  close(
    mob.expensesTotal,
    Object.values(web.accumulatedExp as Record<string, number>).reduce((s, v) => s + v, 0)
  );
  close(
    mob.storageTotal,
    Object.values(web.storageByMonth as Record<string, number>).reduce((s, v) => s + v, 0)
  );
  return { mob, web };
}

describe('dashboard expenses — the block every SCENARIO left empty', () => {
  it('every expense figure matches web calContracts, at the contract rate', () => {
    const settings = expenseSettings();
    const { mob } = expectPnlMatchesWeb(expenseWorld(), settings, 0);
    // The block is genuinely non-empty — this test would be worthless on 0 === 0.
    expect(mob.expensesTotal).toBeGreaterThan(0);
    expect(Object.keys(mob.expByType).length).toBeGreaterThan(3);
  });

  it('a COMPANY rate overrides every contract\'s own euroToUSD (funcs.js:220)', () => {
    const settings = expenseSettings();
    const { mob } = expectPnlMatchesWeb(expenseWorld(), settings, 1.5);
    // The EUR contract's 7000 purchase converts at the COMPANY 1.5, not its own 1.3.
    close(mob.purchaseByMonth[6], 7000 * 1.5);
    expect(mob.purchaseByMonth[6]).not.toBeCloseTo(7000 * 1.3, 6);
    // …and with no company rate it falls back to the contract's own 1.3.
    close(computePnl(expenseWorld(), settings, 0).purchaseByMonth[6], 7000 * 1.3);
  });

  it('an expense converts by its OWN currency flag at the CONTRACT rate (funcs.js:268)', () => {
    const settings = expenseSettings();
    const { mob } = expectPnlMatchesWeb(expenseWorld(), settings, 0);
    // USD contract @1.4: the 'us' expenses pass through, the 'eu' ones are multiplied.
    // 1000 + 600×1.4 + 250 + 150×1.4 + 75  (the blank amount is skipped)
    close(mob.expensesByMonth[2], 1000 + 600 * 1.4 + 250 + 150 * 1.4 + 75);
    // EUR contract @1.3: mult applies to the 'eu' expense, NOT to the 'us' one —
    // the flag is the EXPENSE's, so keying off the contract currency would be wrong.
    close(mob.expensesByMonth[6], 400 * 1.3 + 200);
  });

  it('freight is detected by SUBSTRING, so "Sea Freight" allocates too (funcs.js:212)', () => {
    const settings = expenseSettings();
    const { mob, web } = expectPnlMatchesWeb(expenseWorld(), settings, 0);
    // 1000 (Freight, USD) + 600×1.4 (Sea Freight, EUR) + 400×1.3 (FreightReloadCourier)
    close(mob.freightTotal, 1000 + 600 * 1.4 + 400 * 1.3);
    close(mob.freightTotal, web.freightTotal);
    // an exact-equality rule would have counted only the plain 'Freight' row
    expect(mob.freightTotal).not.toBeCloseTo(1000, 6);
  });

  it('STORAGE spend buckets both "Storage" and "Warehouse" labels (funcs.js:217)', () => {
    const settings = expenseSettings();
    const { mob } = expectPnlMatchesWeb(expenseWorld(), settings, 0);
    close(mob.storageByMonth[2], 250 + 150 * 1.4); // Warehouse + Storage
    close(mob.storageTotal, 250 + 150 * 1.4);
    // dropping 'warehouse' would leave only the 150×1.4 Storage row
    expect(mob.storageTotal).not.toBeCloseTo(150 * 1.4, 6);
  });

  it('an expType with no settings entry is labelled "Unspecified" (funcs.js:214)', () => {
    const settings = expenseSettings();
    const { mob, web } = expectPnlMatchesWeb(expenseWorld(), settings, 0);
    expect(Object.keys(mob.expByType)).toContain('Unspecified');
    close(mob.expByType['Unspecified'], 75);
    close(mob.expByType['Unspecified'], web.expByType['Unspecified']);
    // the blank-amount Commission row was skipped, so it never got a bucket
    expect(Object.keys(mob.expByType)).not.toContain('Commission');
  });

  it('a EUR contract with no usable rate is counted 1:1 and FLAGGED (funcs.js:222)', () => {
    const settings = expenseSettings();
    const world = [
      makeContract({
        id: 'con-norate',
        cur: 'eu',
        euroToUSD: '',
        supplier: 'sup-1',
        poInvoices: [makePoInvoice({ id: 'nr-po', pmnt: '5000' })],
        expenses: [makeContractExpense({ id: 'nr-e', expType: 'exp-other', amount: '100', cur: 'eu' })],
      }),
    ];
    const { mob } = expectPnlMatchesWeb(world, settings, 0);
    expect(mob.missingRate).toBe(1);
    close(mob.purchaseByMonth[2], 5000); // 1:1, not dropped
    // …and a company rate removes the gap entirely.
    const withRate = expectPnlMatchesWeb(world, settings, 1.5).mob;
    expect(withRate.missingRate).toBe(0);
    close(withRate.purchaseByMonth[2], 5000 * 1.5);
  });

  it('an UNKNOWN supplier id is labelled "Unknown supplier" on both apps', () => {
    // This WAS a Tier-4 divergence: web remapped the id with no fallback, so a contract
    // whose supplier had been deleted landed under the literal key "undefined", and
    // every such id collapsed onto that one key and overwrote itself. Mobile kept the
    // raw id instead. Web has since fixed it — 'Unknown supplier', and ADD rather than
    // assign (funcs.js:477) — so the two agree and this is a parity test now.
    const settings = expenseSettings();
    const world = [
      makeContract({
        id: 'con-nosup',
        supplier: 'sup-deleted',
        poInvoices: [makePoInvoice({ id: 'ns-po', pmnt: '4000' })],
        expenses: [],
      }),
    ];
    const mob = computePnl(world, settings, 0);
    const web = webCalContracts(world, settings, 0);
    expect(Object.keys(web.pieArrSupps as object)).toEqual(['Unknown supplier']);
    expect(nonZeroKeys(mob.supplierTotals)).toEqual(['Unknown supplier']);
    // same label, same money
    close(mob.supplierTotals['Unknown supplier'], (web.pieArrSupps as any)['Unknown supplier']);
    close(mob.supplierTotals['Unknown supplier'], 4000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Remaining rules the SCENARIOS never reached
// ═════════════════════════════════════════════════════════════════════════════

describe('shipped-MT quantity guards (dashboard/funcs.js:100 sumInvProductsMT)', () => {
  it('the "s" sentinel, a blank qnty and a non-numeric qnty are all skipped', () => {
    // web skips `p.qnty !== 's' && p.qnty !== '' && !isNaN(parseFloat(p.qnty))`.
    // 's' is a real sentinel the invoice editor writes for a summary row; without the
    // guard parseFloat('s') is NaN and shippedMT becomes NaN, poisoning COGS.
    const inv = makeInvoice({
      id: 'sent-inv',
      productsDataInvoice: [
        makeInvoiceProduct({ id: 'q-ok', qnty: '7' }),
        makeInvoiceProduct({ id: 'q-s', qnty: 's' }),
        makeInvoiceProduct({ id: 'q-blank', qnty: '' }),
        makeInvoiceProduct({ id: 'q-junk', qnty: 'n/a' }),
      ],
    });
    const groups = [[inv]];
    expect(sumInvProductsMT(groups)).toBe(7);
    expect(sumInvProductsMT(groups)).toBe(webSumInvProductsMT(groups));
    expect(Number.isFinite(sumInvProductsMT(groups))).toBe(true);

    // and it flows through to the dashboard figure
    const world = [makeContract({ id: 'con-sent', invoicesData: groups, expenses: [] })];
    const settings = expenseSettings();
    close(computePnl(world, settings, 0).shippedMT, webCalContracts(world, settings, 0).shippedMT);
    expect(computePnl(world, settings, 0).shippedMT).toBe(7);
  });

  it('a canceled doc contributes no tonnage, and an original beside its note is skipped', () => {
    const canceled = makeInvoice({ id: 'c-inv', canceled: true, productsDataInvoice: [makeInvoiceProduct({ qnty: '99' })] });
    expect(sumInvProductsMT([[canceled]])).toBe(0);
    expect(sumInvProductsMT([[canceled]])).toBe(webSumInvProductsMT([[canceled]]));

    const pair = [
      [
        makeInvoice({ id: 'p-o', productsDataInvoice: [makeInvoiceProduct({ id: 'po-q', qnty: '10' })] }),
        makeCreditNote({ id: 'p-cn', productsDataInvoice: [makeInvoiceProduct({ id: 'pcn-q', qnty: '4' })] }),
      ],
    ];
    expect(sumInvProductsMT(pair)).toBe(4); // the note supersedes; 10 is NOT added
    expect(sumInvProductsMT(pair)).toBe(webSumInvProductsMT(pair));
  });
});

describe('P&L tab — freight detection uses the same SUBSTRING rule as the dashboard', () => {
  it('"Sea Freight" and "FreightReloadCourier" allocate into Freight/MT (pnl.js:153)', () => {
    const settings = expenseSettings();
    const c = makeContract({
      id: 'con-freight',
      cur: 'us',
      euroToUSD: 1.4,
      productsData: [makeProduct({ qnty: '20' }), makeImportProduct({ qnty: '8' })],
      expenses: [
        makeContractExpense({ id: 'f1', expType: 'exp-freight', amount: '1000', cur: 'us' }),
        makeContractExpense({ id: 'f2', expType: 'exp-sea-freight', amount: '600', cur: 'eu' }),
        makeContractExpense({ id: 'f3', expType: 'exp-freight-courier', amount: '300', cur: 'us' }),
        makeContractExpense({ id: 'f4', expType: 'exp-other', amount: '900', cur: 'us' }),
      ],
      invoicesData: [],
    });
    for (const val of [USD, EUR]) {
      const pnl = contractPnl(c, val.cur, settings)!;
      const web = webPnlFreight(c, val, settings);
      close(pnl.freightTotal, web.freightTotal);
      close(pnl.freightPerMT, web.freightPerMT);
      close(pnl.contractMT, web.contractMT);
    }
    const usd = contractPnl(c, 'us', settings)!;
    close(usd.freightTotal, 1000 + 600 * 1.4 + 300); // exp-other excluded
    close(usd.freightPerMT, (1000 + 600 * 1.4 + 300) / 20); // over the 20 MT of PO lines
    // an exact-equality label rule would have found only the plain 'Freight' row
    expect(usd.freightTotal).not.toBeCloseTo(1000, 6);
  });
});

describe('P&L tab — the canceled rule', () => {
  it('a CANCELED sales doc contributes 0 to the P&L sale value (pnl.js:37)', () => {
    const c = makeContract({
      id: 'con-cxl',
      expenses: [],
      invoicesData: [[makeInvoice({ id: 'cx-1', canceled: true, totalAmount: 8000 })], [makeInvoice({ id: 'cx-2', invoice: 1002, totalAmount: 3000 })]],
    });
    const pnl = contractPnl(c, 'us', SETTINGS)!;
    expect(pnl.saleValue).toBe(3000); // the 8000 canceled doc is zeroed, not counted
    close(pnl.saleValue, webPnlTotal(c.invoicesData, 'totalAmount', USD, c.euroToUSD, SETTINGS));
  });
});

describe('purchase-invoice balance rounding', () => {
  it('blnc is rounded to 2dp, so float dust never reaches the field (poInvModal.js:174)', () => {
    // 0.3 − (0.1 + 0.1) is 0.09999999999999998 in IEEE754. web wraps it in
    // Math.round(x*100)/100; without that the modal renders 0.09999999999999998.
    const row = poRow({
      invValue: '0.3',
      payments: [makePoPayment({ pmntId: 'p1', pmntPerc: '', pmnt: '0.1' }), makePoPayment({ pmntId: 'p2', pmntPerc: '', pmnt: '0.1' })],
    });
    const next = setPaymentAmount([row], 'po-1', 'p1', '0.1')!;
    const web = webHandleValuePmnt(row, 'p1', '0.1')!;
    expect(next[0].blnc).toBe(web.blnc);
    expect(next[0].blnc).toBe(0.1);
    // the un-rounded arithmetic is a DIFFERENT number — this is not a no-op wrapper
    expect(parseFloat(row.invValue) - 0.2).not.toBe(0.1);

    const afterDelete = deletePayment([row], 'po-1', 'p2')[0];
    expect(afterDelete.blnc).toBe(0.2); // round2(0.3 − 0.1), not 0.19999999999999998
  });
});

describe('purchase-invoice blank shapes match the web modal exactly', () => {
  it('blankPoInvoice is web addInvoice\'s literal, field for field (poInvModal.js:233-236)', () => {
    const blank = blankPoInvoice('po-new', 'pay-new');
    // web: { id: uuidv4(), pmnt: '0', inv: '', invValue: '', invRef: [], blnc: '',
    //        payments: [{ pmntId: uuidv4(), pmntDate: null, pmntPerc: '', pmnt: '' }] }
    expect(blank).toEqual({
      id: 'po-new',
      pmnt: '0',
      inv: '',
      invValue: '',
      invRef: [],
      blnc: '',
      payments: [{ pmntId: 'pay-new', pmntDate: null, pmntPerc: '', pmnt: '' }],
    });
    // guarded against web moving underneath us
    const src = webFnSource(PO_MODAL, 'addInvoice');
    expect(src).toContain("pmnt: '0'");
    expect(src).toContain("inv: '', invValue: '', invRef: [], blnc: ''");
    expect(src).toContain("pmntDate: null, pmntPerc: '', pmnt: ''");
  });

  it('a new payment row is web addPmnt\'s literal (poInvModal.js:389)', () => {
    const added = addPayment([poRow()], 'po-1', 'p3')[0];
    expect(added.payments[2]).toEqual({ pmntId: 'p3', pmntDate: null, pmntPerc: '', pmnt: '' });
  });
});

describe('deriveContract — the label lookup itself', () => {
  it('TIER 4 — an unresolved quantity type: web leaves a trailing space, mobile omits it', () => {
    // web contracts/page.js:159 appends `' ' + gQ(...)` unconditionally and gQ
    // (page.js:152) returns '' when the id is not in settings.Quantity — so the cell
    // reads "12.0 " with a dangling space. Mobile drops the separator instead
    // (useContracts.ts:87). Cosmetic, mobile is tidier, recorded rather than hidden.
    const c = makeContract({ qTypeTable: 'q-deleted', productsData: [makeProduct({ qnty: '12' })] });
    expect(webShowQTYFull(c, SETTINGS)).toBe('12.0 ');
    expect(deriveContract(c as any, SETTINGS).mtLabel).toBe('12.0');
    // …and where the id DOES resolve, the two agree exactly, separator included.
    const kgs = makeContract({ qTypeTable: 'q-kgs', productsData: [makeProduct({ qnty: '12000' })] });
    expect(deriveContract(kgs as any, SETTINGS).mtLabel).toBe(webShowQTYFull(kgs, SETTINGS));
    expect(deriveContract(kgs as any, SETTINGS).mtLabel).toBe('12,000.0 KGS');
    const mt = makeContract({ productsData: [makeProduct({ qnty: '9' })] });
    expect(deriveContract(mt as any, SETTINGS).mtLabel).toBe(webShowQTYFull(mt, SETTINGS));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Determinism guard
// ═════════════════════════════════════════════════════════════════════════════

describe('determinism', () => {
  it('every figure is stable across a clock change', () => {
    const w = scenario('singleInvoice');
    const first = computePnl(w.contracts, w.settings, w.companyRate);
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
    const second = computePnl(w.contracts, w.settings, w.companyRate);
    expect(second).toEqual(first);

    const contracts = reviewContracts();
    const rows = contracts.map((c) => reviewFinancials(c, c.invoicesData, USD, SETTINGS));
    expect(sumReviewFinancials(rows)).toEqual(
      sumReviewFinancials(reviewContracts().map((c) => reviewFinancials(c, c.invoicesData, USD, SETTINGS)))
    );
  });
});
