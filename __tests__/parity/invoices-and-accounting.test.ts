/**
 * WEB ↔ MOBILE PARITY — invoices review, accounting, misc invoices, account statement.
 *
 * Covered mobile modules
 *   mobile/src/features/review/reviewCore.ts          (pure core of useInvoicesReview)
 *   mobile/src/features/accounting/accountingCore.ts  (pure core of useAccounting + the screen tiles/chart)
 *   mobile/src/features/misc/useMiscInvoices.ts       (deriveMiscRows / miscTotals)
 *   mobile/src/features/accstatement/useAccStatement.ts (normalizeStatementRows / statementTotals / stmtMoney)
 *
 * Covered web sources
 *   Tier 2  app/(root)/ContractsReview&Statement/funcs.js  → Numcur (the acc-statement total rule)
 *           app/(root)/invoicesstatement/funcs.js          → Numcur (finalized-currency resolution)
 *           app/(root)/accstatement/func.js                → groupedArrayInvoice
 *   Tier 3  app/(root)/InvoicesReview&Statement/page.js    → Total, TotalInvoicePayments, setInvoicesDTStatement
 *           app/(root)/accounting/page.js                  → mergeArrays, totals, chartData, getprefixInv(1)
 *           app/(root)/specialinvoices/page.js             → MISC_CATS, groupedTotals(All)
 *           app/(root)/accstatement/page.js                → fieldOrder, setTtl
 *           app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js → sumUpSuppliers, sumUpClients
 *           utils/utils.js                                 → sortArr (mergeArrays depends on its ordering)
 *
 * Every Tier-3 mirror below is transcribed VERBATIM from the cited file:line and is
 * guarded by a drift-alarm hash. When one of those fires, read
 * __tests__/parity/README.md → "When the drift alarm fires". Do not paste the new hash.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dateFormat from 'dateformat';
import { expectWebUnchanged, webFnSource } from './_helpers/webSource';
import {
  FIXED_NOW,
  makeContract,
  makeCreditNote,
  makeExpense,
  makeFinalNote,
  makeFinalizedInvoice,
  makeInvoice,
  makeMiscInvoice,
  makePayment,
  makePoInvoice,
  makeSettings,
  makeStatementRow,
} from './_helpers/fixtures';

// ── mobile ───────────────────────────────────────────────────────────────────
import {
  computeInvoicesReview,
  groupByInvoiceNumber,
  reduceInvoiceGroups,
} from '@/features/review/reviewCore';
import {
  accountingSummary,
  accountingWeekdayChart,
  buildExpenseLines,
  buildInvoiceRows,
  buildPurchaseLines,
  dayIndex,
  dropOrphanNotes,
  getprefixInv,
  getprefixInv1,
  groupAccounting,
  makeGQ,
  selectCnFnRefs,
} from '@/features/accounting/accountingCore';
import {
  normalizeStatementRows,
  statementTotals,
  stmtDate,
  stmtMoney,
} from '@/features/accstatement/useAccStatement';
import { MISC_CATS, deriveMiscRows, miscTotals } from '@/features/misc/useMiscInvoices';

// ── web (Tier 2 — imported, not transcribed) ─────────────────────────────────
import { Numcur } from '../../app/(root)/ContractsReview&Statement/funcs.js';
import { Numcur as NumcurInvStatement } from '../../app/(root)/invoicesstatement/funcs.js';
import { groupedArrayInvoice } from '../../app/(root)/accstatement/func.js';

const SETTINGS = makeSettings();
const gQ = makeGQ(SETTINGS);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

// ═════════════════════════════════════════════════════════════════════════════
// TIER 3 MIRRORS — transcribed verbatim from web
// ═════════════════════════════════════════════════════════════════════════════

/** Mirror of app/(root)/InvoicesReview&Statement/page.js:51 `Total`. Verbatim. */
const webTotal = (data: any[], name: string, val: any, mult: any, settings: any) => {
  let accumuLastInv = 0;
  let accumuDeviation = 0;

  data.forEach((obj) => {
    if (obj && !isNaN(obj[name])) {
      let num = obj.canceled ? 0 : obj[name] * 1;

      accumuDeviation +=
        (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType)) ||
        (data.length > 1 && ['1111', 'Invoice'].includes(obj.invType))
          ? num
          : 0;

      accumuLastInv +=
        (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType)) ||
        (data.length > 1 && !['1111', 'Invoice'].includes(obj.invType))
          ? num
          : 0;
    }
  });

  return { accumuDeviation, accumuLastInv };
};

/** Mirror of app/(root)/InvoicesReview&Statement/page.js:32 `TotalInvoicePayments`. Verbatim. */
const webTotalInvoicePayments = (data: any[]) => {
  let accumulatedPmnt = 0;
  data.forEach((obj: any) => {
    if (obj && Array.isArray(obj.payments)) {
      obj.payments.forEach((payment: any) => {
        if (payment && !isNaN(parseFloat(payment.pmnt))) {
          accumulatedPmnt += parseFloat((payment.pmnt * 1) as any);
        }
      });
    }
  });
  return accumulatedPmnt;
};

/** Mirror of app/(root)/InvoicesReview&Statement/page.js:142 `setInvoicesDTStatement`. Verbatim. */
const webSetInvoicesDTStatement = (con: any, invArr: number[]) => {
  let arr: any[] = [];
  let custInvArr = [...new Set((con.poInvoices || []).map((x: any) => x.invRef).flat())].map((x: any) =>
    parseFloat(x)
  );

  custInvArr.forEach((invNum) => {
    if (invArr.includes(invNum)) {
      let obj: any = {};
      let totalAmnt = 0;
      let totalPmnt = 0;
      let totalBlnc = 0;
      let poInvArr: any[] = [];
      con.poInvoices.forEach((poInv: any) => {
        if (parseFloat(poInv.invRef[0]) === invNum) {
          totalAmnt += parseFloat((poInv.invValue * 1) as any);
          totalPmnt += parseFloat((poInv.pmnt * 1) as any);
          totalBlnc += parseFloat((poInv.blnc * 1) as any);
          poInvArr.push(poInv.inv);
        }
      });

      obj = { key: invNum, totalAmnt, totalPmnt, totalBlnc, poInvArr };

      arr.push(obj);
    }
  });
  return arr;
};

/** Mirror of app/(root)/InvoicesReview&Statement/page.js:195 `makeGroup`. Verbatim. */
const webMakeGroup = (arr: any[]) => {
  const groupedByInvoiceNum = arr.reduce((acc: any, invoice: any) => {
    const invoiceNum = invoice.invoice;
    if (invoiceNum) {
      if (!acc[invoiceNum]) {
        acc[invoiceNum] = [];
      }
      acc[invoiceNum].push(invoice);
    }
    return acc;
  }, {});
  return groupedByInvoiceNum;
};

/**
 * Mirror of app/(root)/InvoicesReview&Statement/page.js:417 `setCurFilterData` — the
 * METADATA SOURCE only. Every passthrough field of a statement row (client, cur,
 * shipData…) comes from `...x.arr[0]`, i.e. the group's RAW first document, even
 * though the amount is computed from the sorted array. Verbatim extract of :445.
 */
const webRowMetaSource = (group: any[]) => group[0];

/** Mirror of app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js:5 `sumUpSuppliers`. Verbatim. */
const webSumUpSuppliers = (dt: any[], z: any, field: string, cur: string) =>
  dt
    .filter((s) => s.supplier === z && s.cur === cur)
    .reduce((total, obj) => {
      let amnt =
        (obj.type === 'exp' && obj.invData.paid !== '111') ||
        (obj.type === 'con' && (obj.pmntAmount === 0 || obj.pmntAmount === ''))
          ? obj[field]
          : 0;

      return total + amnt * 1;
    }, 0);

/** Mirror of utils/utils.js:143 `sortArr` — mergeArrays orders through it. Verbatim. */
const webSortArr = (arr: any[], name: string) => {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.sort((a, b) => {
    const A = a[name]?.toString()?.toLowerCase();
    const B = b[name]?.toString()?.toLowerCase();
    if (A < B) return -1;
    if (A > B) return 1;
    return 0;
  });
};

/** Mirror of app/(root)/accounting/page.js:48 `mergeArrays`. Verbatim (sortArr → webSortArr). */
const webMergeArrays = (invArr: any[], expArr: any[]) => {
  const expenseMap = expArr.reduce((acc: any, expense: any) => {
    if (!acc[expense.invoice]) {
      acc[expense.invoice] = [];
    }
    acc[expense.invoice].push(expense);
    return acc;
  }, {});

  let mergedArray = invArr.map((invoice: any) => {
    const expenseList = expenseMap[invoice.invoice];
    if (expenseList && expenseList.length > 0) {
      const expense = expenseList.shift();
      return { ...invoice, ...expense };
    } else {
      return invoice;
    }
  });

  Object.values(expenseMap).forEach((expenseList: any) => {
    expenseList.forEach((expense: any) => {
      mergedArray.push({
        ...{ num: null, dateInv: null, saleInvoice: null, clientInv: null, amountInv: null, invType: null },
        ...expense,
      });
    });
  });

  let i = 1;
  mergedArray = webSortArr(mergedArray, 'invoice').map((item: any, k: number, array: any[]) => {
    const previousItem = array[k - 1];

    let numb = k === 0 ? i : item.invoice.toString() === previousItem?.invoice.toString() ? i : i + 1;

    if (item.invoice.toString() !== previousItem?.invoice.toString() && k !== 0) {
      i = i + 1;
    }

    let span = null;
    if (item.invoice.toString() !== previousItem?.invoice.toString()) {
      span = mergedArray.filter((z: any) => z.invoice.toString() === item.invoice.toString()).length;
    }
    return span === null ? { ...item, num: numb } : { ...item, num: numb, span: span };
  });

  let lt = [
    'dateInv', 'saleInvoice', 'clientInv', 'amountInv', 'invType', 'dateExp', 'expInvoice',
    'clientExp', 'amountExp', 'expType',
  ];

  mergedArray.forEach((obj: any) => {
    lt.forEach((key) => {
      if (!(key in obj)) {
        obj[key] = '';
      }
    });
  });

  return mergedArray;
};

/** Mirror of app/(root)/accounting/page.js:414 `totals`. Verbatim (useMemo body). */
const webAccountingTotals = (invoicesAccData: any[]) => {
  const totalIncome = invoicesAccData.reduce((sum, item) => sum + (Number(item.amountInv) || 0), 0);
  const totalExpense = invoicesAccData.reduce((sum, item) => sum + (Number(item.amountExp) || 0), 0);
  const balance = totalIncome - totalExpense;
  return { totalIncome, totalExpense, balance, savings: balance > 0 ? balance * 0.2 : 0 };
};

/** Mirror of app/(root)/accounting/page.js:422 `chartData`. Verbatim (bucket arrays only). */
const webChartBuckets = (invoicesAccData: any[]) => {
  const debitByDay = new Array(7).fill(0);
  const creditByDay = new Array(7).fill(0);

  invoicesAccData.forEach((item) => {
    if (item.amountExp && item.dateExp) {
      const d = new Date(item.dateExp);
      if (!isNaN(d as any)) {
        const day = d.getDay(); // 0=Sun … 6=Sat
        const idx = day === 6 ? 0 : day + 1; // Sat→0, Sun→1 … Fri→6
        debitByDay[idx] += Number(item.amountExp) || 0;
      }
    }
    if (item.amountInv && item.dateInv) {
      const d = new Date(item.dateInv);
      if (!isNaN(d as any)) {
        const day = d.getDay();
        const idx = day === 6 ? 0 : day + 1;
        creditByDay[idx] += Number(item.amountInv) || 0;
      }
    }
  });

  return { debitByDay, creditByDay };
};

/** Mirror of app/(root)/accounting/page.js:38/43 `getprefixInv` / `getprefixInv1`. Verbatim. */
const webGetprefixInv = (x: any) =>
  x.invType === '1111' || x.invType === 'Invoice'
    ? ''
    : x.invType === '2222' || x.invType === 'Credit Note'
      ? 'CN'
      : 'FN';
const webGetprefixInv1 = (x: any) =>
  x.invType === '1111' || x.invType === 'Invoice'
    ? 'Sales Invoice'
    : x.invType === '2222' || x.invType === 'Credit Note'
      ? 'Credit Note'
      : 'Final Note';

/**
 * Mirrors of the sales-invoice row build inside app/(root)/accounting/page.js
 * `Load()` — :177 dateInv, :180 clientInvName, :184 curINV, :188 invoiceDate.
 * These four sit inside a useEffect with no enclosing named symbol, so they are
 * cited by line and carry no drift hash of their own; `mergeArrays`, which consumes
 * the rows they build, is hashed above and lives in the same file.
 */
const webDateInv = (l: any) => (l.final ? l.date : l.dateRange.endDate);
const webClientInvName = (l: any, gq: any) =>
  l.final ? l.client.nname : gq(l.client, 'Client', 'nname');
const webCurINV = (l: any, gq: any) => (l.final ? l.cur.cur : gq(l.cur, 'Currency', 'cur'));
const webInvoiceWriteDate = (l: any) => l.dateRange?.startDate ?? l.date;

/**
 * Mirror of app/(root)/accounting/page.js:208-212 — the CN/FN reference selector.
 * Note the LOWERCASE 'invoice' in web's own list: a FINALIZED original (invType
 * 'Invoice') therefore never has its note chased. Transcribed verbatim, trap included.
 */
const webCnFnRefs = (dt: any[]) =>
  dt
    .filter(
      ({ invoice, invType, cnORfl }: any) =>
        dt.filter((item: any) => item.invoice === invoice).length === 1 &&
        ['1111', 'invoice'].includes(invType) &&
        cnORfl !== undefined &&
        cnORfl !== null
    )
    .map((z: any) => z.cnORfl);

/** Mirror of app/(root)/accounting/page.js:216-217 — drop orphan notes. Verbatim. */
const webDropOrphanNotes = (dt: any[]) =>
  dt.filter(
    (z: any) =>
      dt.find((x: any) => x.invoice === z.invoice && x.invType === '1111') ||
      z.invType === '1111' ||
      z.invType === 'Invoice'
  );

/**
 * Mirror of app/(root)/accounting/page.js:382-389 — the Expense Type column is a
 * select whose options are `{ value: e.id, label: e.expType }`, so the id stored on
 * the row is what the reader sees resolved to a settings label.
 */
const webExpTypeLabel = (id: string, settings: any) =>
  (settings.Expenses?.Expenses?.map((e: any) => ({ value: e.id, label: e.expType })) ?? []).find(
    (o: any) => o.value === id
  )?.label;

/** Mirror of app/(root)/accounting/page.js:861 — the Profit Margin tile. Verbatim. */
const webMarginPct = (t: { totalIncome: number; balance: number }) =>
  t.totalIncome > 0 ? (t.balance / t.totalIncome) * 100 : 0;

/** Mirror of app/(root)/specialinvoices/page.js:94 `groupedTotalsAll`. Verbatim. */
const webGroupedTotalsAll = (filteredData: any[]) =>
  filteredData.reduce(
    (acc: any, { supplier, cur, total }: any) => {
      let key = cur === 'us' ? 'totalsUs' : 'totalsEU';

      acc[key] ??= [];
      let existing = acc[key].find((z: any) => z.supplier === supplier);

      if (existing) {
        existing.total = existing.total * 1 + total * 1;
      } else {
        acc[key].push({ supplier, total, cur });
      }

      return acc;
    },
    { totalsUs: [], totalsEU: [] }
  );

/** Mirror of app/(root)/specialinvoices/page.js:73 `groupedTotals` (unpaid only). Verbatim gate. */
const webGroupedTotalsUnpaid = (filteredData: any[]) =>
  webGroupedTotalsAll(filteredData.filter((x) => x.paidNotPaid !== 'Paid'));

/** Mirror of app/(root)/accstatement/page.js:29 `fieldOrder` + :131 the ordering loop. Verbatim. */
const WEB_FIELD_ORDER = ['invoice', 'date', 'amount', 'cur', 'due', 'paid', 'notPaid'];
const webOrderStatementRows = (data: any[]) =>
  data
    .map((z: any) => ({ ...z, invoice: z.invoice.toString() }))
    .map((item: any) => {
      const orderedItem: any = {};
      WEB_FIELD_ORDER.forEach((key) => {
        orderedItem[key] = item[key] ?? '';
      });
      return orderedItem;
    });

/** Mirror of app/(root)/accstatement/page.js:235 `setTtl`. Verbatim — Numcur is IMPORTED, not copied. */
const webStatementSetTtl = (filteredData: any[], settings: any) => {
  const curArr = ['us', 'eu'];
  let Ttls: any[] = [];
  for (let i = 0; i < curArr.length; i++) {
    const amount = filteredData.reduce((total, obj) => total + Numcur(obj, 'amount', curArr[i], settings), 0);
    const paid = filteredData.reduce((total, obj) => total + Numcur(obj, 'paid', curArr[i], settings), 0);
    const notPaid = filteredData.reduce((total, obj) => total + Numcur(obj, 'notPaid', curArr[i], settings), 0);
    Ttls = [...Ttls, { [curArr[i]]: { amount, paid, notPaid } }];
  }
  return Ttls;
};

// ═════════════════════════════════════════════════════════════════════════════
describe('drift alarm — web sources these mirrors were transcribed from', () => {
  it("InvoicesReview&Statement Total has not drifted", () => {
    expectWebUnchanged('app/(root)/InvoicesReview&Statement/page.js', 'Total', 'aef66744e75c');
  });
  it('InvoicesReview&Statement TotalInvoicePayments has not drifted', () => {
    expectWebUnchanged('app/(root)/InvoicesReview&Statement/page.js', 'TotalInvoicePayments', '4501b24bd7b1');
  });
  it('InvoicesReview&Statement setInvoicesDTStatement has not drifted', () => {
    expectWebUnchanged('app/(root)/InvoicesReview&Statement/page.js', 'setInvoicesDTStatement', '6071327bc314');
  });
  it('InvoicesReview&Statement makeGroup has not drifted', () => {
    expectWebUnchanged('app/(root)/InvoicesReview&Statement/page.js', 'makeGroup', '139a15bd7a40');
  });
  it('InvoicesReview&Statement setCurFilterData has not drifted (row metadata source)', () => {
    expectWebUnchanged('app/(root)/InvoicesReview&Statement/page.js', 'setCurFilterData', 'b7616c033c78');
  });
  it('accounting mergeArrays has not drifted', () => {
    expectWebUnchanged('app/(root)/accounting/page.js', 'mergeArrays', 'e77b57c1c2e0');
  });
  it('accounting totals has not drifted', () => {
    expectWebUnchanged('app/(root)/accounting/page.js', 'totals', 'd16395f7b56e');
  });
  it('accounting chartData has not drifted', () => {
    expectWebUnchanged('app/(root)/accounting/page.js', 'chartData', '37689c8ecf64');
  });
  it('accounting getprefixInv / getprefixInv1 have not drifted', () => {
    expectWebUnchanged('app/(root)/accounting/page.js', 'getprefixInv', '00b2461e33d6');
    expectWebUnchanged('app/(root)/accounting/page.js', 'getprefixInv1', '31f64c1ba354');
  });
  it('utils sortArr has not drifted (mergeArrays orders through it)', () => {
    expectWebUnchanged('utils/utils.js', 'sortArr', '9c686eb8a0e8');
  });
  it('invoicesstatement sumUpSuppliers / sumUpClients have not drifted', () => {
    expectWebUnchanged('app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js', 'sumUpSuppliers', '4627652b4491');
    expectWebUnchanged('app/(root)/invoicesstatement/sumtables/sumTablesFuncs.js', 'sumUpClients', 'e546c411aec3');
  });
  it('specialinvoices MISC_CATS / groupedTotals / groupedTotalsAll have not drifted', () => {
    expectWebUnchanged('app/(root)/specialinvoices/page.js', 'MISC_CATS', '2a738aa26fdf');
    expectWebUnchanged('app/(root)/specialinvoices/page.js', 'groupedTotals', 'f0cd092eb63c');
    expectWebUnchanged('app/(root)/specialinvoices/page.js', 'groupedTotalsAll', '67c77ab71c6f');
  });
  it('accstatement fieldOrder / setTtl have not drifted', () => {
    expectWebUnchanged('app/(root)/accstatement/page.js', 'fieldOrder', 'e4bb5f513ad2');
    expectWebUnchanged('app/(root)/accstatement/page.js', 'setTtl', 'f47669a47bcf');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('invoices review — the amount shown for an invoice number (web Total)', () => {
  // Web sorts each group by invType rank before totalling (sortedData, page.js:92),
  // which cannot change a sum; the mirror is fed the same docs in fixture order.
  const totalOf = (docs: any[]) => webTotal(docs, 'totalAmount', { cur: 'us' }, 1.1, SETTINGS).accumuLastInv;
  const mobileTotalOf = (docs: any[]) => reduceInvoiceGroups(docs as any)[0].totalAmount;

  it('a lone original invoice shows its own amount', () => {
    const docs = [makeInvoice()];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs)); // 12000
    expect(mobileTotalOf(docs)).toBe(12000);
  });

  it('an original plus a credit note shows the NOTE alone — the note supersedes, it does not net', () => {
    // page.js:64-66 — in a group of >1 only the non-'1111'/'Invoice' docs accumulate.
    const docs = [makeInvoice(), makeCreditNote()];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs));
    expect(mobileTotalOf(docs)).toBe(-2000);
  });

  it('an original plus a credit note plus a final note sums BOTH notes', () => {
    // The reason this screen cannot use finance.groupInvoices: that keeps only the
    // max-rank doc (the FN) and would report 11500 instead of 9500.
    const docs = [makeInvoice(), makeCreditNote(), makeFinalNote()];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs));
    expect(mobileTotalOf(docs)).toBe(-2000 + 11500);
  });

  it('two originals sharing one number total to zero — neither supersedes the other', () => {
    const docs = [makeInvoice({ id: 'a' }), makeInvoice({ id: 'b', totalAmount: 3000 })];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs));
    expect(mobileTotalOf(docs)).toBe(0);
  });

  it('a lone credit note (its original outside the period) totals zero — a single doc only counts when it IS the original', () => {
    // page.js:64 `data.length === 1 && ['1111','Invoice'].includes(obj.invType)`.
    const docs = [makeCreditNote()];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs));
    expect(mobileTotalOf(docs)).toBe(0);
  });

  it('a canceled document contributes zero to the amount', () => {
    // page.js:58 `let num = obj.canceled ? 0 : obj[name] * 1`.
    const docs = [makeInvoice({ canceled: true })];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs));
    expect(mobileTotalOf(docs)).toBe(0);
  });

  it('the finalized shape (invType label "Invoice") is treated as an original, exactly like "1111"', () => {
    const docs = [makeFinalizedInvoice(), makeCreditNote()];
    expect(mobileTotalOf(docs)).toBe(totalOf(docs));
    expect(mobileTotalOf(docs)).toBe(-2000);
  });

  it('payments are summed across EVERY document in the group, including the superseded original', () => {
    // page.js:32 TotalInvoicePayments walks the whole group, unlike Total.
    const docs = [
      makeInvoice({ payments: [makePayment({ pmnt: '5000' })] }),
      makeCreditNote({ payments: [makePayment({ pmnt: '250' })] }),
    ];
    const r = reduceInvoiceGroups(docs as any)[0];
    expect(r.paid).toBe(webTotalInvoicePayments(docs));
    expect(r.paid).toBe(5250);
  });

  it('the debt balance is the superseded amount minus every payment in the group', () => {
    const docs = [
      makeInvoice({ payments: [makePayment({ pmnt: '5000' })] }),
      makeCreditNote({ payments: [makePayment({ pmnt: '250' })] }),
    ];
    // web setCurFilterData:432 — debtBlnc = totalAmount − payments.
    const expected = totalOf(docs) - webTotalInvoicePayments(docs);
    expect(reduceInvoiceGroups(docs as any)[0].bal).toBe(expected);
    expect(expected).toBe(-2000 - 5250);
  });

  it('documents are grouped by invoice NUMBER, matching web makeGroup and accstatement groupedArrayInvoice', () => {
    // Tier 2 against app/(root)/accstatement/func.js groupedArrayInvoice.
    const docs = [
      makeInvoice({ id: 'a', invoice: 1001 }),
      makeInvoice({ id: 'b', invoice: 1002 }),
      makeCreditNote({ id: 'c', invoice: 1001 }),
    ];
    const mobile = groupByInvoiceNumber(docs as any).map((g) => g.map((d: any) => d.id).sort());
    const web = groupedArrayInvoice([...docs]).map((g: any[]) => g.map((d: any) => d.id).sort());
    expect(mobile.sort()).toEqual(web.sort());
  });

  it('a document with no invoice number is dropped, as web makeGroup requires a truthy number', () => {
    // page.js:197 `if (invoiceNum) { … }` — a TRUTHY test, so null, '' and 0 all go.
    const docs = [
      makeInvoice(),
      makeInvoice({ id: 'null-num', invoice: null }),
      makeInvoice({ id: 'blank-num', invoice: '' }),
      makeInvoice({ id: 'zero-num', invoice: 0 }),
    ];
    expect(groupByInvoiceNumber(docs as any)).toHaveLength(
      Object.keys(webMakeGroup(docs)).length
    );
    expect(groupByInvoiceNumber(docs as any)).toHaveLength(1);
    // …and the unnumbered drafts do not invent a receivable either.
    expect(computeInvoicesReview(docs as any, [], SETTINGS).receivablesByCur).toEqual({ us: 7000 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('invoices review — the row list itself', () => {
  it('a row carries the GROUP figures, not the base document\'s own amount and payments', () => {
    const docs = [
      makeInvoice({ payments: [makePayment({ pmnt: '5000' })] }),
      makeCreditNote({ payments: [makePayment({ pmnt: '250' })] }),
    ];
    const [row] = computeInvoicesReview(docs as any, [], SETTINGS).rows;
    expect(row.total).toBe(webTotal(docs, 'totalAmount', { cur: 'us' }, 1, SETTINGS).accumuLastInv);
    expect(row.total).toBe(-2000); // the credit note supersedes
    expect(row.paid).toBe(webTotalInvoicePayments(docs));
    expect(row.paid).toBe(5250); // BOTH documents' payments
    expect(row.balance).toBe(-2000 - 5250);
  });

  it('DIVERGENCE: mobile takes row metadata from the SUPERSEDING note, web from the group\'s first document', () => {
    // web setCurFilterData:445 spreads `...x.arr[0]` — the RAW first doc of the group
    // — for client, currency and shipData, while computing the amount off the sorted
    // array. Mobile uses the superseding doc (reviewCore.ts:89) so the row's currency
    // matches the figure it is displaying. On real data a note inherits its
    // original's client and currency, so the two agree; they only part when a note
    // was stored with a different one, and then mobile labels the amount it shows.
    const original = makeInvoice({ cur: 'us', client: 'cli-1', payments: [] });
    const note = makeCreditNote({ cur: 'eu', client: 'cli-2', payments: [] });
    const [row] = computeInvoicesReview([original, note] as any, [], SETTINGS).rows;

    expect(webRowMetaSource([original, note]).cur).toBe('us'); // web would label it USD
    expect(row.cur).toBe('eu'); // mobile labels the note it is actually showing
    expect(row.clientName).toBe('Southgate Trading');
    // The FIGURE is identical either way — only the label moves.
    expect(row.total).toBe(webTotal([original, note], 'totalAmount', {}, 1, SETTINGS).accumuLastInv);
  });

  it('DIVERGENCE: mobile lists the newest invoice number first, web\'s statement sorts ascending', () => {
    // web page.js:375 `newArr.sort((a, b) => a.key - b.key)`. Mobile reverses it so
    // the invoice a user just raised is at the top of a phone list. Display order
    // only — no figure changes.
    const docs = [
      makeInvoice({ id: 'a', invoice: 1001, payments: [] }),
      makeInvoice({ id: 'b', invoice: 1003, payments: [] }),
      makeInvoice({ id: 'c', invoice: 1002, payments: [] }),
    ];
    const mobileOrder = computeInvoicesReview(docs as any, [], SETTINGS).rows.map((r) => r.number);
    expect(mobileOrder).toEqual([1003, 1002, 1001]);
    const webOrder = [...docs].map((d: any) => d.invoice).sort((a, b) => a - b);
    expect(webOrder).toEqual([1001, 1002, 1003]);
    expect(mobileOrder).toEqual([...webOrder].reverse());
  });

  it('a client that resolves to nothing renders the em-dash placeholder, never "undefined"', () => {
    const docs = [makeInvoice({ client: 'cli-gone', payments: [] })];
    const r = computeInvoicesReview(docs as any, [], SETTINGS);
    expect(r.rows[0].clientName).toBe('—');
    expect(r.clients.map((c) => c.name)).toEqual(['—']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('invoices review — client receivables', () => {
  const review = (invoices: any[], contracts: any[] = []) =>
    computeInvoicesReview(invoices as any, contracts as any, SETTINGS);

  it('a NEGATIVE balance (over-credited client) is kept, not clamped away', () => {
    // Mobile keeps |bal| >= 0.1 including negatives; sumTablesFuncs.js:102 filters on
    // Math.abs(inDebt), so an over-credit is a real (negative) receivable on web too.
    const docs = [makeInvoice(), makeCreditNote({ payments: [] })];
    const { receivablesByCur, clients } = review(docs);
    expect(receivablesByCur.us).toBe(-2000 - 5000); // note supersedes, original's payment still counts
    expect(clients[0].byCur.us).toBe(-7000);
  });

  it('a residual below 0.1 is dropped from receivables', () => {
    const docs = [makeInvoice({ totalAmount: 5000.05, payments: [makePayment({ pmnt: '5000' })] })];
    expect(review(docs).clients).toHaveLength(0);
    expect(review(docs).receivablesByCur).toEqual({});
  });

  it('a DRAFT invoice still counts as a receivable — this screen has no draft filter', () => {
    // Cashflow filters drafts; InvoicesReview&Statement never looks at `draft`
    // (page.js:227-300 loads and groups every invoice in the period).
    const docs = [makeInvoice({ draft: true, payments: [] })];
    expect(review(docs).receivablesByCur.us).toBe(12000);
  });

  it('receivables are kept per currency and never summed across them', () => {
    const docs = [
      makeInvoice({ id: 'us1', invoice: 1001, payments: [] }),
      makeInvoice({ id: 'eu1', invoice: 1002, cur: 'eu', totalAmount: 8000, payments: [] }),
    ];
    expect(review(docs).receivablesByCur).toEqual({ us: 12000, eu: 8000 });
  });

  it('a finalized invoice (cur as an object) is bucketed by its resolved currency id', () => {
    // finance.resolveCur — the same rule web applies via
    // settings.Currency.Currency.find(x => x.cur === obj.cur.cur).id (invoicesstatement/funcs.js:66).
    const doc = makeFinalizedInvoice({ cur: { id: 'eu', cur: 'EUR' }, payments: [] });
    expect(review([doc]).receivablesByCur).toEqual({ eu: 12000 });
    // Tier 2 cross-check: web's Numcur assigns the same doc to 'eu' and not to 'us'.
    expect(NumcurInvStatement(doc, 'totalAmount', { cur: 'eu' }, 1, SETTINGS)).toBe(12000);
  });

  it('receivables are grouped by client display name resolved from settings', () => {
    const docs = [
      makeInvoice({ id: 'a', invoice: 1001, client: 'cli-1', payments: [] }),
      makeInvoice({ id: 'b', invoice: 1002, client: 'cli-2', totalAmount: 1000, payments: [] }),
    ];
    expect(review(docs).clients.map((c) => c.name)).toEqual(['Northwind Steel', 'Southgate Trading']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('invoices review — supplier payables (web setInvoicesDTStatement)', () => {
  const review = (invoices: any[], contracts: any[]) =>
    computeInvoicesReview(invoices as any, contracts as any, SETTINGS);

  it('a purchase invoice counts only when invRef[0] is an invoice number LOADED in the period', () => {
    // page.js:154 `if (parseFloat(poInv.invRef[0]) === invNum)`, and :147
    // `if (invArr.includes(invNum))` — invArr is the loaded invoice numbers.
    const con = makeContract({
      poInvoices: [
        makePoInvoice({ id: 'po-a', invRef: ['1001'], invValue: '10000', pmnt: '4000', blnc: '6000' }),
        makePoInvoice({ id: 'po-b', invRef: ['9999'], invValue: '7000', pmnt: '0', blnc: '7000' }),
      ],
    });
    const invoices = [makeInvoice({ invoice: 1001 })];

    const mirror = webSetInvoicesDTStatement(con, [1001]);
    expect(mirror).toHaveLength(1);
    expect(mirror[0].totalBlnc).toBe(6000); // the 9999 purchase is excluded

    expect(review(invoices, [con]).suppliers[0].byCur.us).toBe(mirror[0].totalBlnc);
  });

  it('an invRef beyond position 0 does not attract the purchase balance', () => {
    // custInvArr is built from the FLATTENED invRef, but the sum only matches
    // invRef[0] (page.js:144 vs :154), so a secondary reference contributes nothing.
    const con = makeContract({
      poInvoices: [makePoInvoice({ invRef: ['9999', '1001'], invValue: '7000', pmnt: '0', blnc: '7000' })],
    });
    const invoices = [makeInvoice({ invoice: 1001 })];

    const mirror = webSetInvoicesDTStatement(con, [1001]);
    expect(mirror.reduce((s: number, o: any) => s + o.totalBlnc, 0)).toBe(0);
    expect(review(invoices, [con]).suppliers).toHaveLength(0);
  });

  it('a supplier whose currency balance nets to zero is dropped entirely', () => {
    // sumTablesFuncs.js:61 `newArrUSD.filter(z => z.blnc != 0)`.
    const con = makeContract({
      poInvoices: [
        makePoInvoice({ id: 'po-a', invRef: ['1001'], blnc: '500' }),
        makePoInvoice({ id: 'po-b', invRef: ['1001'], blnc: '-500' }),
      ],
    });
    expect(review([makeInvoice({ invoice: 1001 })], [con]).suppliers).toHaveLength(0);
  });

  it('a purchase invoice hidden from Cashflow (draft) still counts here — the statement has no draft filter', () => {
    const con = makeContract({
      poInvoices: [makePoInvoice({ invRef: ['1001'], blnc: '6000', draft: true })],
    });
    expect(review([makeInvoice({ invoice: 1001 })], [con]).suppliers[0].byCur.us).toBe(6000);
  });

  it("payables are bucketed by the CONTRACT's currency, not the invoice's", () => {
    const con = makeContract({ cur: 'eu', poInvoices: [makePoInvoice({ invRef: ['1001'], blnc: '6000' })] });
    const inv = makeInvoice({ invoice: 1001, cur: 'us' });
    expect(review([inv], [con]).suppliers[0].byCur).toEqual({ eu: 6000 });
  });

  it('DIVERGENCE: mobile reports the open BALANCE; web sumSuppliers reports the full invoice value and only for zero-prepayment groups', () => {
    // web sumTablesFuncs.js:5-13 — a 'con' statement row contributes ONLY when its
    // pmntAmount is 0 or '', and then its whole invAmount is counted (pmntAmount adds
    // 0), so a partially prepaid purchase reads as fully settled. Web also folds
    // UNPAID EXPENSE rows into the same figure, which this screen has no feed for on
    // mobile. Mobile therefore sums poInvoice.blnc — the quantity the card actually
    // claims to show ("Open purchase balances"). Asserted, not silently equalised:
    // this is the one figure in this suite where the two apps disagree by design.
    const con = makeContract({
      poInvoices: [makePoInvoice({ invRef: ['1001'], invValue: '10000', pmnt: '4000', blnc: '6000' })],
    });
    const stmt = webSetInvoicesDTStatement(con, [1001]);
    const webRows = stmt.map((o: any) => ({
      ...o, type: 'con', supplier: con.supplier, cur: con.cur,
      invAmount: o.totalAmnt, pmntAmount: o.totalPmnt, blnc: o.totalBlnc,
    }));
    const webPayable =
      webSumUpSuppliers(webRows, con.supplier, 'invAmount', 'us') -
      webSumUpSuppliers(webRows, con.supplier, 'pmntAmount', 'us');

    expect(webPayable).toBe(0); // prepayment 4000 ≠ 0 ⇒ web counts nothing at all
    expect(computeInvoicesReview([makeInvoice({ invoice: 1001 })] as any, [con] as any, SETTINGS)
      .suppliers[0].byCur.us).toBe(6000);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('accounting — one merged row per invoice DOCUMENT (web mergeArrays)', () => {
  // Both sides are fed the SAME invArr/expArr, produced by mobile's builders; the
  // web mirror then reproduces mergeArrays' row expansion exactly.
  const mergedRows = (invArr: any[], expArr: any[]) =>
    webMergeArrays(
      invArr.map((x) => ({ ...x })),
      expArr.map((x) => ({ ...x }))
    );

  const world = (invoices: any[], expenses: any[] = [], contracts: any[] = []) => {
    const invArr = buildInvoiceRows(invoices, gQ);
    const saleNumbers = new Set<string>(invArr.map((z: any) => z.saleInvoice));
    const lines = [...buildExpenseLines(expenses, gQ), ...buildPurchaseLines(contracts, saleNumbers, gQ)];
    return { invArr, lines, groups: groupAccounting(invArr, lines) };
  };

  it('an invoice with a credit note and no expenses is TWO transactions, not one', () => {
    // mergeArrays maps over invArr (one entry per DOCUMENT, page.js:59) — the netted
    // group is never a row on web, so max(1, lines) undercounted every noted invoice.
    const { invArr, lines, groups } = world([makeInvoice(), makeCreditNote()]);
    expect(accountingSummary(groups).txCount).toBe(mergedRows(invArr, lines).length);
    expect(accountingSummary(groups).txCount).toBe(2);
  });

  it('an invoice with more expense lines than documents is one row per EXPENSE', () => {
    // Each invoice row consumes at most one expense (`shift()`, page.js:62); the rest
    // are pushed as their own rows (page.js:70-74) ⇒ max(documents, lines).
    const expenses = [
      makeExpense({ id: 'e1', salesInv: '1001', amount: '100' }),
      makeExpense({ id: 'e2', salesInv: '1001', amount: '200' }),
      makeExpense({ id: 'e3', salesInv: '1001', amount: '300' }),
    ];
    const { invArr, lines, groups } = world([makeInvoice()], expenses);
    expect(accountingSummary(groups).txCount).toBe(mergedRows(invArr, lines).length);
    expect(accountingSummary(groups).txCount).toBe(3);
  });

  it('documents and expenses pair off one-for-one before any spill over', () => {
    const expenses = [makeExpense({ id: 'e1', salesInv: '1001', amount: '100' })];
    const { invArr, lines, groups } = world([makeInvoice(), makeCreditNote()], expenses);
    expect(accountingSummary(groups).txCount).toBe(mergedRows(invArr, lines).length);
    expect(accountingSummary(groups).txCount).toBe(2); // 2 docs, 1 line ⇒ max = 2
  });

  it('an expense whose sales invoice is not in the period becomes its own transaction row', () => {
    const expenses = [makeExpense({ id: 'e9', salesInv: '9999', amount: '400' })];
    const { invArr, lines, groups } = world([makeInvoice()], expenses);
    expect(accountingSummary(groups).txCount).toBe(mergedRows(invArr, lines).length);
    expect(accountingSummary(groups).txCount).toBe(2);
  });

  it('a purchase referencing the SUFFIXED number 1001CN buckets under 1001CN, not under 1001', () => {
    // consArr keys on the raw invRef string (page.js:227), which is the suffixed
    // saleInvoice — so it never merges into the original's row.
    const contracts = [
      makeContract({ poInvoices: [makePoInvoice({ inv: 'SUP-9', invRef: ['1001CN'], invValue: '900' })] }),
    ];
    const { invArr, lines, groups } = world([makeInvoice(), makeCreditNote()], [], contracts);
    expect(lines.map((l: any) => l.invoice)).toEqual(['1001CN']);
    expect(groups.map((g) => g.invoice)).toEqual(['1001', '1001CN']);
    expect(accountingSummary(groups).txCount).toBe(mergedRows(invArr, lines).length);
  });

  it('income, costs and savings match web totals over the merged rows', () => {
    const expenses = [makeExpense({ id: 'e1', salesInv: '1001', amount: '2500' })];
    const { invArr, lines, groups } = world([makeInvoice(), makeCreditNote()], expenses);
    const web = webAccountingTotals(mergedRows(invArr, lines));
    const mobile = accountingSummary(groups);
    expect(mobile.income).toBe(web.totalIncome); // 12000 + (−2000)
    expect(mobile.expense).toBe(web.totalExpense);
    expect(mobile.balance).toBe(web.balance);
    expect(mobile.savings).toBe(web.savings); // 20% of a positive balance
  });

  it('savings are zero when the balance is negative', () => {
    const expenses = [makeExpense({ id: 'e1', salesInv: '1001', amount: '99999' })];
    const { invArr, lines, groups } = world([makeInvoice()], expenses);
    expect(accountingSummary(groups).savings).toBe(webAccountingTotals(mergedRows(invArr, lines)).savings);
    expect(accountingSummary(groups).savings).toBe(0);
  });

  it('the average transaction divides by the MERGED ROW count, not the group count', () => {
    // page.js:851 `(totalIncome + totalExpense) / invoicesAccData.length`.
    const expenses = [makeExpense({ id: 'e1', salesInv: '1001', amount: '2500' })];
    const { invArr, lines, groups } = world([makeInvoice(), makeCreditNote()], expenses);
    const merged = mergedRows(invArr, lines);
    const web = webAccountingTotals(merged);
    expect(accountingSummary(groups).avgTx).toBe((web.totalIncome + web.totalExpense) / merged.length);
  });

  it('the profit margin is zero when there is no income (web guards totalIncome > 0)', () => {
    // page.js:861 — otherwise a costs-only period renders -Infinity%.
    const { groups } = world([], [makeExpense({ id: 'e1', salesInv: '9999', amount: '400' })]);
    expect(accountingSummary(groups).marginPct).toBe(0);
  });

  it('the profit margin is balance / income as a PERCENT, matching web point for point', () => {
    // page.js:861 `formatPercent(totals.balance / totals.totalIncome * 100)`. Without
    // the ×100 the tile reads 0.75% on a 75% month.
    const expenses = [makeExpense({ id: 'e1', salesInv: '1001', amount: '3000' })];
    const { invArr, lines, groups } = world([makeInvoice()], expenses);
    const web = webAccountingTotals(mergedRows(invArr, lines));
    expect(accountingSummary(groups).marginPct).toBe(webMarginPct(web));
    expect(accountingSummary(groups).marginPct).toBe(75); // (12000 − 3000) / 12000
  });

  it('a costs-only period gives a negative margin rather than a guard of zero', () => {
    // The guard is on INCOME, not on the sign of the balance: 12000 income against
    // 18000 of cost must read −50%, not 0%.
    const expenses = [makeExpense({ id: 'e1', salesInv: '1001', amount: '18000' })];
    const { invArr, lines, groups } = world([makeInvoice()], expenses);
    expect(accountingSummary(groups).marginPct).toBe(webMarginPct(webAccountingTotals(mergedRows(invArr, lines))));
    expect(accountingSummary(groups).marginPct).toBe(-50);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('accounting — document labelling, linking and write targets', () => {
  it('the invoice-number suffix and the type label follow web for both invType shapes', () => {
    const docs = [
      makeInvoice(), makeCreditNote(), makeFinalNote(),
      makeFinalizedInvoice(),
      makeFinalizedInvoice({ id: 'f2', invType: 'Credit Note' }),
      makeFinalizedInvoice({ id: 'f3', invType: 'Final Note' }),
    ];
    docs.forEach((d) => {
      expect(getprefixInv(d)).toBe(webGetprefixInv(d));
      expect(getprefixInv1(d)).toBe(webGetprefixInv1(d));
    });
    expect(docs.map(getprefixInv)).toEqual(['', 'CN', 'FN', '', 'CN', 'FN']);
    expect(getprefixInv1(makeFinalNote())).toBe('Final Note');
  });

  it('a credit note nets into its number but stays a separate document', () => {
    const invArr = buildInvoiceRows([makeInvoice(), makeCreditNote()], gQ);
    const [g] = groupAccounting(invArr, []);
    expect(g.amountInv).toBe(10000); // 12000 − 2000
    expect(g.invDocs.map((d) => d.saleInvoice)).toEqual(['1001', '1001CN']);
    expect(g.invDocs.map((d) => d.amountInv)).toEqual([12000, -2000]);
  });

  it('an expense links to its sales invoice by DIGITS ONLY, so "INV-1001" still matches 1001', () => {
    // page.js:252 `String(l.salesInv || '').replace(/\D/g, '')`.
    const lines = buildExpenseLines([makeExpense({ salesInv: 'INV-1001' })], gQ);
    expect(lines[0].invoice).toBe('1001');
    expect(groupAccounting(buildInvoiceRows([makeInvoice()], gQ), lines)[0].lines).toHaveLength(1);
  });

  it('an expense line carries the id and date it must be written back through', () => {
    // Web stores expenseId/expenseDate on every expense row (page.js:254-255) and
    // onCellUpdate refuses the edit without them (page.js:576). Mobile dropped both,
    // so useAccountingEdit could only ever throw "Missing expense mapping".
    const [line] = groupAccounting(
      buildInvoiceRows([makeInvoice()], gQ),
      buildExpenseLines([makeExpense({ id: 'exp-77', salesInv: '1001' })], gQ)
    )[0].lines;
    expect(line.expenseId).toBe('exp-77');
    expect(line.expenseDate).toBe('2026-04-05');
  });

  it('a purchase line carries NO expense write target — web blocks editing Purchase rows', () => {
    // page.js:560 `if (row.expType === 'Purchase') return;`
    const contracts = [makeContract({ poInvoices: [makePoInvoice({ invRef: ['1001'] })] })];
    const invArr = buildInvoiceRows([makeInvoice()], gQ);
    const lines = buildPurchaseLines(contracts, new Set(invArr.map((z: any) => z.saleInvoice)), gQ);
    expect(lines[0].expType).toBe('Purchase');
    expect(lines[0].expenseId).toBeUndefined();
  });

  it('a standalone credit note with no original in the period is dropped before grouping', () => {
    // page.js:166-167 verbatim.
    const kept = dropOrphanNotes([makeInvoice(), makeCreditNote({ invoice: 2002 })]);
    expect(kept.map((z: any) => z.id)).toEqual(['inv-1']);
  });

  it('a note reference is chased only when the original is ALONE in the period', () => {
    // page.js:159-162 — `dt.filter(item => item.invoice === invoice).length === 1`.
    expect(selectCnFnRefs([makeInvoice({ cnORfl: { invoice: 1001 } })])).toEqual([{ invoice: 1001 }]);
    expect(
      selectCnFnRefs([makeInvoice({ cnORfl: { invoice: 1001 } }), makeCreditNote()])
    ).toEqual([]);
  });

  it('DIVERGENCE: mobile orders invoice numbers numerically, web orders them as lowercased strings', () => {
    // utils/utils.js:143 sortArr is a plain string compare, so web lists 1001, 1002,
    // 999. Mobile uses localeCompare({numeric:true}) because invoice numbers read as
    // numbers. Display order only — no figure changes.
    const invArr = buildInvoiceRows(
      [makeInvoice({ id: 'a', invoice: 1001 }), makeInvoice({ id: 'b', invoice: 999 })],
      gQ
    );
    expect(groupAccounting(invArr, []).map((g) => g.invoice)).toEqual(['999', '1001']);
    expect(webSortArr(invArr.map((x) => ({ ...x })), 'invoice').map((x: any) => String(x.invoice)))
      .toEqual(['1001', '999']);
  });

  it('DIVERGENCE: on a finalized invoice mobile writes back through `date`, web through dateRange.startDate', () => {
    // Web reads the invoice DATE as `l.final ? l.date : l.dateRange.endDate`
    // (page.js:179) but the WRITE TARGET as `l.dateRange?.startDate ?? l.date`
    // (page.js:188) — inconsistent with itself. Mobile stays final-aware for both, so
    // a finalized doc whose dateRange disagrees with its date targets `date`.
    const doc = makeFinalizedInvoice({ date: '2026-07-01', dateRange: { startDate: '2026-04-10', endDate: '2026-04-11' } });
    const [row] = buildInvoiceRows([doc], gQ);
    expect(row.invoiceDate).toBe('2026-07-01');
    expect(webInvoiceWriteDate(doc)).toBe('2026-04-10'); // web's :188 mirror, not the fixture
    expect(row.invoiceDate).not.toBe(webInvoiceWriteDate(doc));
    // …and on the DISPLAYED date, which web IS final-aware about (:177), they agree.
    expect(row.dateInv).toBe(webDateInv(doc));
    expect(row.dateInv).toBe('2026-07-01');
  });

  it('the displayed invoice date is final-aware on both sides — dateRange.endDate on a draft', () => {
    // page.js:177 `dateInv: l.final ? l.date : l.dateRange.endDate`.
    const draft = makeInvoice({ date: '2026-07-01' }); // dateRange.endDate 2026-04-10
    const [row] = buildInvoiceRows([draft], gQ);
    expect(row.dateInv).toBe(webDateInv(draft));
    expect(row.dateInv).toBe('2026-04-10'); // the stored `date` is NOT used on a draft
  });

  it('the client name and currency are final-aware — the embedded entity, not a settings lookup', () => {
    // page.js:180 clientInvName and :184 curINV both branch on `l.final`. A finalized
    // doc carries the client as an OBJECT and the currency as { id, cur }, so a
    // settings lookup on them resolves to '' and the row would render blank.
    const fin = makeFinalizedInvoice();
    const draft = makeInvoice();
    const [rf] = buildInvoiceRows([fin], gQ);
    const [rd] = buildInvoiceRows([draft], gQ);

    expect(rf.clientInvName).toBe(webClientInvName(fin, gQ));
    expect(rf.curINV).toBe(webCurINV(fin, gQ));
    expect(rd.clientInvName).toBe(webClientInvName(draft, gQ));
    expect(rd.curINV).toBe(webCurINV(draft, gQ));

    // Both shapes must land on the SAME reader-visible values — that is the point.
    expect(rf.clientInvName).toBe('Northwind Steel');
    expect(rd.clientInvName).toBe('Northwind Steel');
    expect(rf.curINV).toBe('USD');
    expect(rd.curINV).toBe('USD');
  });

  it('an expense type id is resolved to the settings label web\'s select shows, and an unknown id falls through raw', () => {
    // page.js:382-389 — the cell is a select over { value: e.id, label: e.expType }.
    const [known] = buildExpenseLines([makeExpense({ expType: 'exp-freight' })], gQ);
    expect(known.expType).toBe(webExpTypeLabel('exp-freight', SETTINGS));
    expect(known.expType).toBe('Freight');
    // Nothing in settings matches, so web's select renders nothing; mobile keeps the
    // stored string rather than showing an empty cell.
    const [unknown] = buildExpenseLines([makeExpense({ expType: 'Demurrage' })], gQ);
    expect(webExpTypeLabel('Demurrage', SETTINGS)).toBeUndefined();
    expect(unknown.expType).toBe('Demurrage');
  });

  it('a FINALIZED original never has its note chased — web tests the LOWERCASE "invoice"', () => {
    // page.js:210 `['1111', 'invoice'].includes(invType)`. 'Invoice' (the finalized
    // label) is NOT in that list, so web silently skips the extra load. Mobile
    // reproduces the trap verbatim rather than "fixing" it out of parity.
    const draft = [makeInvoice({ cnORfl: { invoice: 1001 } })];
    const finalized = [makeFinalizedInvoice({ cnORfl: { invoice: 1001 } })];
    expect(selectCnFnRefs(draft)).toEqual(webCnFnRefs(draft));
    expect(selectCnFnRefs(draft)).toEqual([{ invoice: 1001 }]);
    expect(selectCnFnRefs(finalized)).toEqual(webCnFnRefs(finalized));
    expect(selectCnFnRefs(finalized)).toEqual([]); // the trap
  });

  it('a note whose original is FINALIZED survives the orphan filter', () => {
    // page.js:216-217 — the third clause `z.invType === 'Invoice'` keeps a finalized
    // original, and the first clause only recognises a '1111' original, so a note
    // sitting under a finalized original is dropped. Both apps, same rule.
    const world = [makeFinalizedInvoice(), makeCreditNote()];
    expect(dropOrphanNotes(world).map((z: any) => z.id)).toEqual(
      webDropOrphanNotes(world).map((z: any) => z.id)
    );
    expect(dropOrphanNotes(world).map((z: any) => z.id)).toEqual(['inv-f1']);
    // A finalized original on its own is still kept.
    expect(dropOrphanNotes([makeFinalizedInvoice()])).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('accounting — debit vs credit by weekday', () => {
  const world = (invoices: any[], expenses: any[] = []) => {
    const invArr = buildInvoiceRows(invoices, gQ);
    const lines = buildExpenseLines(expenses, gQ);
    return { merged: webMergeArrays(invArr.map((x) => ({ ...x })), lines.map((x) => ({ ...x }))), groups: groupAccounting(invArr, lines) };
  };

  it('the buckets match web bucket-for-bucket over the merged rows', () => {
    const { merged, groups } = world(
      [makeInvoice(), makeCreditNote({ dateRange: { startDate: '2026-04-13', endDate: '2026-04-13' } })],
      [makeExpense({ salesInv: '1001', amount: '2500' })]
    );
    const web = webChartBuckets(merged);
    const mobile = accountingWeekdayChart(groups);
    expect(mobile.credit).toEqual(web.creditByDay);
    expect(mobile.debit).toEqual(web.debitByDay);
  });

  it('a credit note buckets on ITS OWN date, not the original invoice date', () => {
    // Each document is its own merged row on web, carrying its own dateInv
    // (page.js:436-443). Bucketing the netted group put the whole net on one bar.
    const { groups } = world([
      makeInvoice(), // dateRange.endDate 2026-04-10
      makeCreditNote({ dateRange: { startDate: '2026-04-13', endDate: '2026-04-13' } }),
    ]);
    const { credit } = accountingWeekdayChart(groups);
    // Weekday indices are derived, never hard-coded: the runner's timezone decides how
    // an ISO date lands, and both apps read it the same way.
    expect(credit[dayIndex('2026-04-10')]).toBe(12000);
    expect(credit[dayIndex('2026-04-13')]).toBe(-2000);
    expect(dayIndex('2026-04-10')).not.toBe(dayIndex('2026-04-13'));
  });

  it('an undated or unparseable document contributes to no bucket at all', () => {
    const { groups } = world([makeInvoice({ dateRange: { startDate: '', endDate: '' } })]);
    expect(accountingWeekdayChart(groups).credit.reduce((s, v) => s + v, 0)).toBe(0);
    expect(dayIndex('not-a-date')).toBe(-1);
    expect(dayIndex(undefined)).toBe(-1);
  });

  it('expense lines feed the debit bars on the EXPENSE date, not the invoice date', () => {
    const { merged, groups } = world(
      [makeInvoice()],
      [makeExpense({ dateRange: { startDate: '2026-06-02', endDate: '2026-06-02' }, amount: '2500' , salesInv: '1001' })]
    );
    expect(accountingWeekdayChart(groups).debit).toEqual(webChartBuckets(merged).debitByDay);
    expect(accountingWeekdayChart(groups).debit[dayIndex('2026-06-02')]).toBe(2500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('account statement — per-currency totals (web setTtl via Numcur)', () => {
  const totalsOf = (rows: any[]) => {
    const web = webStatementSetTtl(rows, SETTINGS);
    return { us: web[0].us, eu: web[1].eu };
  };

  it('each currency is totalled by EQUALITY against its id, never by an else-branch', () => {
    const rows = normalizeStatementRows([
      makeStatementRow({ invoice: '1001', cur: 'us' }),
      makeStatementRow({ invoice: '1002', cur: 'eu', amount: 8000, paid: 1000, notPaid: 7000 }),
    ]);
    const web = totalsOf(rows);
    const mobile = statementTotals(rows);
    expect(mobile.us).toEqual({ amount: web.us.amount, paid: web.us.paid, notPaid: web.us.notPaid });
    expect(mobile.eu).toEqual({ amount: web.eu.amount, paid: web.eu.paid, notPaid: web.eu.notPaid });
    expect(mobile.us.amount).toBe(12000);
    expect(mobile.eu.amount).toBe(8000);
  });

  it('a THIRD currency lands in neither bucket — it is not swept into USD', () => {
    // Numcur (ContractsReview&Statement/funcs.js:115) is `currentCur === cur ? 1 : 0`.
    const rows = normalizeStatementRows([
      makeStatementRow({ invoice: '1001', cur: 'us' }),
      makeStatementRow({ invoice: '1003', cur: 'gb', amount: 5000, paid: 0, notPaid: 5000 }),
    ]);
    const web = totalsOf(rows);
    const mobile = statementTotals(rows);
    expect(web.us.amount).toBe(12000);
    expect(web.eu.amount).toBe(0);
    expect(mobile.us.amount).toBe(web.us.amount);
    expect(mobile.eu.amount).toBe(web.eu.amount);
  });

  it('a blank currency lands in neither bucket', () => {
    const rows = normalizeStatementRows([makeStatementRow({ cur: '' })]);
    expect(statementTotals(rows)).toEqual({
      us: { amount: 0, paid: 0, notPaid: 0 },
      eu: { amount: 0, paid: 0, notPaid: 0 },
    });
    expect(totalsOf(rows).us.amount).toBe(0);
  });

  it('an overpaid invoice leaves a NEGATIVE unpaid total, which is not clamped', () => {
    const rows = normalizeStatementRows([makeStatementRow({ paid: 13000, notPaid: -1000 })]);
    expect(statementTotals(rows).us.notPaid).toBe(totalsOf(rows).us.notPaid);
    expect(statementTotals(rows).us.notPaid).toBe(-1000);
  });

  it('a missing column is normalised to "" so no total can go NaN', () => {
    // web accstatement/page.js:131-134 does exactly this before totalling with `* 1`.
    const raw = [{ invoice: 1001, date: '2026-04-10', cur: 'us' }];
    const mobile = normalizeStatementRows(raw);
    expect(mobile).toEqual(webOrderStatementRows(raw.map((r) => ({ ...r }))));
    expect(mobile[0].amount).toBe('');
    expect(Number.isFinite(statementTotals(mobile).us.amount)).toBe(true);
    expect(totalsOf(mobile).us.amount).toBe(0);
  });

  it('the invoice number is stringified, matching web before the column order is applied', () => {
    expect(normalizeStatementRows([{ invoice: 1001 }])[0].invoice).toBe('1001');
  });

  it('the COLUMN ORDER is web\'s fieldOrder, not the order the fields arrived in', () => {
    // accstatement/page.js:29 fieldOrder + :131 `fieldOrder.forEach(key => …)` — the
    // ordered object is what the table iterates, so a reshuffle silently reorders the
    // statement columns. toEqual ignores key order, so this has to assert Object.keys.
    const scrambled = [{ notPaid: 7000, cur: 'us', invoice: 1001, amount: 12000, paid: 5000, due: '2026-04-15', date: '2026-04-10' }];
    expect(Object.keys(normalizeStatementRows(scrambled)[0])).toEqual(WEB_FIELD_ORDER);
    expect(Object.keys(webOrderStatementRows(scrambled.map((r) => ({ ...r })))[0])).toEqual(WEB_FIELD_ORDER);
  });

  it('a statement date renders dd.mm.yy, the mask web passes to dateFormat', () => {
    // accstatement/page.js:289 (Date) and :306 (DuePayment) both render
    // `dateFormat(props.getValue(), 'dd.mm.yy')`. Cross-checked against the very same
    // `dateformat` package web imports, fed a LOCAL date so no timezone can move it.
    expect(stmtDate('2026-04-10')).toBe(dateFormat(new Date(2026, 3, 10), 'dd.mm.yy'));
    expect(stmtDate('2026-04-10')).toBe('10.04.26'); // day, month, 2-digit year
    expect(stmtDate('2026-11-02')).toBe(dateFormat(new Date(2026, 10, 2), 'dd.mm.yy'));
    expect(stmtDate('2026-11-02')).toBe('02.11.26'); // zero-padded, and not mm.dd
  });

  it('DIVERGENCE: mobile reads the ISO string, web reads it through Date and can shift a day', () => {
    // web's dateFormat parses '2026-04-10' as UTC midnight and prints it in the
    // BROWSER's timezone, so a user west of Greenwich sees 09.04.26. Mobile slices
    // the ISO string, which cannot shift. Asserted so the difference is on the record.
    expect(stmtDate('2026-04-10')).toBe('10.04.26');
    expect(dateFormat(new Date('2026-04-10T00:00:00Z'), 'UTC:dd.mm.yy')).toBe('10.04.26');
    // Unusable input falls back to a placeholder rather than 'Invalid Date'.
    expect(stmtDate('')).toBe('—');
    expect(stmtDate(undefined)).toBe('—');
  });

  it('money is rendered with web\'s hard $/€ ternary — an unknown currency shows €', () => {
    // accstatement/page.js:268 `x.row.original.cur === 'us' ? 'USD' : 'EUR'`.
    expect(stmtMoney(12000, 'us')).toBe('$12,000.00');
    expect(stmtMoney(12000, 'eu')).toBe('€12,000.00');
    expect(stmtMoney(12000, '')).toBe('€12,000.00');
    expect(stmtMoney(-1000, 'us')).toBe('-$1,000.00'); // Intl puts the minus outside
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe('misc invoices — per-supplier and per-currency summaries', () => {
  const nameOf = (id: string) => gQ(id, 'Supplier', 'nname');

  it('the category buckets are exactly web\'s three', () => {
    expect(MISC_CATS.map((c) => c.id)).toEqual(['personal', 'random', 'shipments']);
    expect(MISC_CATS.map((c) => c.label)).toEqual(['Personal', 'Random', 'Shipments']);
    expect(webFnSource('app/(root)/specialinvoices/page.js', 'MISC_CATS')).toContain("id: 'shipments'");
  });

  it('an unrecognised stored category collapses to unset, as web renders "—"', () => {
    // page.js:34 — anything not in MISC_CATS is treated as 'none'.
    expect(deriveMiscRows([makeMiscInvoice({ category: 'legacy-tag' })], SETTINGS)[0].category).toBe('');
  });

  it('the per-supplier summary matches web group for group', () => {
    const raw = [
      makeMiscInvoice({ id: 'm1', supplier: 'sup-1', total: '1000' }),
      makeMiscInvoice({ id: 'm2', supplier: 'sup-1', total: '250' }),
      makeMiscInvoice({ id: 'm3', supplier: 'sup-2', total: '400' }),
    ];
    const web = webGroupedTotalsAll(raw.map((r) => ({ ...r })));
    const mobile = miscTotals(deriveMiscRows(raw, SETTINGS)).bySupplier;

    expect(web.totalsUs.map((g: any) => [nameOf(g.supplier), Number(g.total)])).toEqual([
      ['Acme Metals', 1250],
      ['Bravo Alloys', 400],
    ]);
    expect(mobile.map((g) => [g.supplier, g.byCur.us])).toEqual([
      ['Acme Metals', 1250],
      ['Bravo Alloys', 400],
    ]);
  });

  it('the unpaid summary keeps everything whose status is not the literal string "Paid"', () => {
    // page.js:73 `filteredData.filter(x => x.paidNotPaid !== 'Paid')` — a blank status
    // counts as unpaid.
    const raw = [
      makeMiscInvoice({ id: 'm1', paidNotPaid: 'Paid', total: '1000' }),
      makeMiscInvoice({ id: 'm2', paidNotPaid: 'Not Paid', total: '250' }),
      makeMiscInvoice({ id: 'm3', paidNotPaid: '', total: '400' }),
    ];
    const web = webGroupedTotalsUnpaid(raw.map((r) => ({ ...r })));
    const mobile = miscTotals(deriveMiscRows(raw, SETTINGS));
    expect(Number(web.totalsUs[0].total)).toBe(650);
    expect(mobile.unpaid.us).toBe(650);
    expect(mobile.all.us).toBe(1650);
  });

  it('the currency tiles are per currency and carry the weight sum with the money', () => {
    // `qnty` is one of the few columns web does NOT mark excludeFromQuickSum
    // (page.js:186), so it is summed alongside `total`. Two rows per currency so a
    // tile that returned the FIRST row rather than the sum cannot pass.
    const raw = [
      makeMiscInvoice({ id: 'm1', cur: 'us', total: '1000', qnty: '2.5' }),
      makeMiscInvoice({ id: 'm2', cur: 'us', total: '250', qnty: '0.75' }),
      makeMiscInvoice({ id: 'm3', cur: 'eu', total: '400', qnty: '1.5' }),
    ];
    const rows = deriveMiscRows(raw, SETTINGS);
    const t = miscTotals(rows);
    expect(t.usd).toEqual({ amount: 1250, qnty: 3.25 });
    expect(t.eur).toEqual({ amount: 400, qnty: 1.5 });
    // Conservation: the tiles account for every us/eu row and double-count none.
    expect(t.usd.qnty + t.eur.qnty).toBe(raw.reduce((s, r) => s + Number(r.qnty), 0));
    expect(t.usd.amount + t.eur.amount).toBe(t.all.us + t.all.eu);
  });

  it('the per-supplier UNPAID summary is web\'s second table — the Paid rows are gone from it', () => {
    // page.js:73 groupedTotals (unpaid) and :94 groupedTotalsAll feed two separate
    // Summary tables. Mobile must expose both; comparing only the currency roll-up
    // let bySupplierUnpaid silently equal bySupplier.
    const raw = [
      makeMiscInvoice({ id: 'm1', supplier: 'sup-1', paidNotPaid: 'Paid', total: '1000' }),
      makeMiscInvoice({ id: 'm2', supplier: 'sup-1', paidNotPaid: 'Not Paid', total: '250' }),
      makeMiscInvoice({ id: 'm3', supplier: 'sup-2', paidNotPaid: 'Paid', total: '400' }),
    ];
    const t = miscTotals(deriveMiscRows(raw, SETTINGS));
    const web = webGroupedTotalsUnpaid(raw.map((r) => ({ ...r })));

    expect(web.totalsUs.map((g: any) => [nameOf(g.supplier), Number(g.total)])).toEqual([
      ['Acme Metals', 250],
    ]);
    expect(t.bySupplierUnpaid.map((g) => [g.supplier, g.byCur.us])).toEqual([['Acme Metals', 250]]);
    // sup-2 is fully paid ⇒ it must not appear at all, and the two tables differ.
    expect(t.bySupplier.map((g) => g.supplier)).toEqual(['Acme Metals', 'Bravo Alloys']);
    expect(t.bySupplierUnpaid).not.toEqual(t.bySupplier);
  });

  it('the category roll-up buckets by web\'s MISC_CATS membership and conserves the currency totals', () => {
    // page.js:204 `row.category || 'none'` and :331 an unrecognised tag renders
    // 'Uncategorized' — so anything outside MISC_CATS shares ONE bucket, and the
    // buckets must still add back up to the per-currency totals.
    const raw = [
      makeMiscInvoice({ id: 'm1', category: 'personal', total: '1000' }),
      makeMiscInvoice({ id: 'm2', category: 'shipments', total: '250' }),
      makeMiscInvoice({ id: 'm3', category: 'legacy-tag', total: '400' }),
      makeMiscInvoice({ id: 'm4', category: '', total: '100' }),
    ];
    const t = miscTotals(deriveMiscRows(raw, SETTINGS));
    expect(Object.keys(t.byCat).sort()).toEqual(['personal', 'shipments', 'uncategorized']);
    expect(t.byCat.personal.us).toBe(1000);
    expect(t.byCat.shipments.us).toBe(250);
    expect(t.byCat.uncategorized.us).toBe(500); // the unknown tag joins the blank one
    expect(Object.values(t.byCat).reduce((s, m) => s + m.us, 0)).toBe(t.all.us);
  });

  it('a row with no supplier falls back to the company name web shows in its own column', () => {
    // page.js:167 renders compName; mobile uses it when the supplier id resolves to nothing.
    const rows = deriveMiscRows([makeMiscInvoice({ supplier: 'sup-unknown' })], SETTINGS);
    expect(rows[0].supplierName).toBe('Acme Metals BV');
  });

  it('DIVERGENCE: a third currency is reported under EUR by web, and under its own id by mobile', () => {
    // page.js:96 `let key = cur === "us" ? "totalsUs" : "totalsEU"` is a CATCH-ALL, so
    // anything that is not 'us' is filed as euro. Mobile keys by the raw currency and
    // leaves an unknown id out of both the $ and the € tile rather than mislabelling
    // it as euro.
    const raw = [makeMiscInvoice({ cur: 'gb', total: '400' })];
    const web = webGroupedTotalsAll(raw.map((r) => ({ ...r })));
    const mobile = miscTotals(deriveMiscRows(raw, SETTINGS));
    expect(web.totalsEU).toHaveLength(1);
    expect(web.totalsUs).toHaveLength(0);
    expect(mobile.all).toEqual({ gb: 400 });
    expect(mobile.eur.amount).toBe(0);
    expect(mobile.usd.amount).toBe(0);
  });
});
