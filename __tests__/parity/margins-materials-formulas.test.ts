/**
 * PARITY: margins · material tables · pricing formulas
 *
 * Every assertion below encodes WEB's rule, with the web file:line it came from, so
 * the suite goes red when mobile drifts — not merely when mobile changes.
 *
 * Tier map for this domain
 * ------------------------
 *  Tier 2  app/(root)/margins/funcs.js            (dataIds, countDecimalDigits, removeNonNumeric)
 *          app/(root)/materialtables/constants.js (element set, unit labels, unit→MT)
 *  Tier 3  app/(root)/margins/page.js:463         handleChange (the whole editing model)
 *          app/(root)/margins/marginTable.js:19   the collapsed month header
 *          app/(root)/margins/thirdpart.js:340    GIS totals decimal rules
 *          app/(root)/materialtables/newTable.js  fmt / footerVal / cost columns
 *          app/(root)/materialtables/page.js:321  cross-table grand totals
 *          app/(root)/formulas/tabs/*.js          solidsPrice / solidsPrice1 / turnings
 *  Tier 4  Stainless reads a stored `fe` the tab never writes (web → NaN);
 *          mobile's finite guards where web produces NaN/Infinity;
 *          mobile stripping non-numerics out of element cells where web stores raw text.
 *
 * The formulas tabs are JSX `.js` React components and cannot be imported (see
 * __tests__/parity/README.md → Known limits), which is why their maths is mirrored
 * and guarded by a hash rather than executed.
 */

import { describe, it, expect } from 'vitest';

// ── mobile ───────────────────────────────────────────────────────────────────
import {
  monthPurchase,
  monthMargin,
  monthOpenShip,
  monthRemaining,
  gisPurchasedDecimals,
  GIS_OUTSTANDING_DECIMALS,
} from '@/features/margins/derive';
import {
  applyItemChange,
  applyItemSelect,
  applyGisToggle,
  addItem as mobileAddItem,
  deleteItem as mobileDeleteItem,
  addMonth as mobileAddMonth,
  orderByIds,
  recomputeItem,
  rollupMonth,
  countDecimalDigits as mobileCountDecimals,
  removeNonNumeric as mobileRemoveNonNumeric,
} from '@/features/margins/marginsModel';
import {
  fmtCell,
  fmtWeight,
  fmtAvg,
  money,
  footerRows,
  totalWeight,
  weightedAvg,
  hasPrices,
  niMultiplier,
  costPmt,
  costTotal,
  footerCostPmt,
  footerCostTotal,
  salesPerMT,
  salesTotal,
  hasSalesPrices,
  footerSalesCol,
  grandTotals,
} from '@/features/materials/tableMath';
import { seedLmeNickel } from '@/features/materials/useMaterials';
import {
  DEFAULT_ELEMENTS as MOBILE_ELEMENTS,
  UNIT_LABELS as MOBILE_UNIT_LABELS,
  UNIT_TO_MT as MOBILE_UNIT_TO_MT,
} from '@/features/materials/constants';
import { cleanElement, cleanKgs, countDecimalDigits as mobileMatDecimals } from '@/features/materials/useMaterials';
import { computeFenicr, computeStainless, computeSuperalloys } from '@/features/formulas/calc';
import { fmtMoney } from '@/lib/format';

// ── web (importable) ─────────────────────────────────────────────────────────
import {
  dataIds as webDataIds,
  countDecimalDigits as webCountDecimals,
  removeNonNumeric as webRemoveNonNumeric,
} from '../../app/(root)/margins/funcs.js';
import {
  DEFAULT_ELEMENTS as WEB_ELEMENTS,
  UNIT_LABELS as WEB_UNIT_LABELS,
  UNIT_TO_MT as WEB_UNIT_TO_MT,
} from '../../app/(root)/materialtables/constants.js';

// ── helpers ──────────────────────────────────────────────────────────────────
import { expectWebUnchanged, repoFileText } from './_helpers/webSource';
import {
  makeMarginItem,
  makeMarginMonth,
  makeMaterialRow,
  makeMaterialTable,
  makeFormulaValue,
} from './_helpers/fixtures';

/** Whole-file text with every whitespace run collapsed — for pinning a formula that
 *  lives inside JSX and therefore has no hashable symbol of its own. */
const collapsed = (rel: string) => repoFileText(rel).replace(/\s+/g, ' ');

// ═════════════════════════════════════════════════════════════════════════════
// 1. INPUT GUARDS  (Tier 2 — web's funcs.js is importable, so compare directly)
// ═════════════════════════════════════════════════════════════════════════════

describe('margins input guards', () => {
  // Web does NOT count the characters after the point: it concatenates the captured
  // fraction with the exponent and strips LEADING zeros before measuring
  // (funcs.js:6-21), so an all-zero fraction measures 0 and "0.001" measures 1.
  const INPUTS = [
    '', '5', '100', '5.1', '5.12', '5.123', '5.1234', '12.3456',
    '1.0', '1.00', '1.0000', '12.500', '0.001', '0.0001', '-3.25', '1e3', '1.5e-4',
  ];

  it('a decimal count strips LEADING zeros, so "1.0000" counts as none and "0.001" as one', () => {
    // This is why web happily accepts "1.0000" under a "max 3 decimals" guard while
    // a naive `length − indexOf('.') − 1` would reject it — funcs.js:17-20.
    expect(webCountDecimals('1.0000')).toBe(0);
    expect(webCountDecimals('0.001')).toBe(1);
    expect(webCountDecimals('0.0001')).toBe(1);
    expect(webCountDecimals('12.500')).toBe(3); // no LEADING zero to strip
    expect(webCountDecimals('5.1234')).toBe(4);
  });

  it('mobile countDecimalDigits agrees with web on every input shape', () => {
    for (const v of INPUTS) {
      expect(mobileCountDecimals(v), `margins countDecimalDigits('${v}')`).toBe(webCountDecimals(v));
      expect(mobileMatDecimals(v), `materials countDecimalDigits('${v}')`).toBe(webCountDecimals(v));
    }
  });

  it('removeNonNumeric keeps digits, dot and minus and drops everything else', () => {
    for (const v of ['1,234.50', '$99', '12 MT', '-3.5', 'abc']) {
      expect(mobileRemoveNonNumeric(v)).toBe(webRemoveNonNumeric(v));
    }
  });

  // Tier 4 — mobile hardening. Web's removeNonNumeric calls num.toString() with no
  // guard (funcs.js:23), so a null field is a TypeError; mobile coalesces to ''.
  it('DIVERGENCE: removeNonNumeric(null) throws on web, returns empty string on mobile', () => {
    expect(() => webRemoveNonNumeric(null as any)).toThrow(TypeError);
    expect(mobileRemoveNonNumeric(null)).toBe('');
    expect(mobileRemoveNonNumeric(undefined)).toBe('');
  });

  it('the id list persisted with a month is the item ORDER, not a sorted set', () => {
    // web margins/funcs.js:2 `dataIds` maps items → ids in place, and page.js saves that
    // array; `orderByIds` restores from it on the next load. An id list that got sorted,
    // or that fell out of step with `items`, silently reorders or drops rows.
    //
    // Driven through MOBILE's own model (addItem), not read off a fixture — a test that
    // only checks makeMarginMonth's builder pins the fixture and nothing shipping.
    let data = [makeMarginMonth({ month: '01', items: [] })] as any[];
    for (const id of ['b', 'a', 'c']) data = mobileAddItem(data, '01', id);
    expect(data[0].ids).toEqual(webDataIds(data[0].items));
    expect(data[0].ids).toEqual(['b', 'a', 'c']);
    // …and that order survives the save → load round trip untouched.
    expect(orderByIds(data).map((m) => m.items.map((i: any) => i.id))).toEqual([['b', 'a', 'c']]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. THE MARGINS EDITING MODEL  (Tier 3 — mirror of margins/page.js handleChange)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Mirror of app/(root)/margins/page.js:463-491 `handleChange`, transcribed verbatim
 * minus the React plumbing (pushUndo / setDirty / setData). Web's early `return`
 * on a rejected keystroke is expressed here as `null` — the same "no state change".
 *
 * Note what web does NOT do: no Number() anywhere in the roll-up, and `purchase`
 * / `openShip` are summed with `* 1` while `remaining` / `totalMargin` are halved
 * for a gis row.
 */
const webHandleChange = (data: any[], month: string, id: string, name: string, raw: string) => {
  if (webCountDecimals(raw) > 3) return null;
  const value = name === 'description' ? raw : webRemoveNonNumeric(raw);

  let monthData = data.map((z: any) =>
    z.month === month ? { ...z, items: z.items.map((x: any) => (x.id === id ? { ...x, [name]: value } : x)) } : z
  );

  monthData = monthData.map((z: any) =>
    z.month === month
      ? {
          ...z,
          items: z.items.map((x: any) =>
            x.id === id
              ? {
                  ...x,
                  totalMargin: x.purchase * x.margin,
                  openShip: x.purchase - x.shipped,
                  remaining: (x.purchase - x.shipped) * x.margin,
                }
              : x
          ),
        }
      : z
  );

  return monthData.map((z: any) =>
    z.month === month
      ? {
          ...z,
          remaining: z.items.reduce((acc: number, cur: any) => acc + (cur.gis ? cur.remaining / 2 || 0 : cur.remaining || 0), 0),
          totalMargin: z.items.reduce((acc: number, cur: any) => acc + (cur.gis ? cur.totalMargin / 2 || 0 : cur.totalMargin || 0), 0),
          purchase: z.items.reduce((acc: number, cur: any) => acc + (cur.purchase * 1 || 0), 0),
          openShip: z.items.reduce((acc: number, cur: any) => acc + (cur.openShip * 1 || 0), 0),
        }
      : z
  );
};

describe('margins editing model', () => {
  it("web's handleChange has not drifted", () => {
    expectWebUnchanged('app/(root)/margins/page.js', 'handleChange', 'bebbb8d3b48b');
  });

  it("web's countDecimalDigits has not drifted", () => {
    expectWebUnchanged('app/(root)/margins/funcs.js', 'countDecimalDigits', '3d728b553eec');
  });

  const world = () => [
    makeMarginMonth({
      month: '01',
      items: [makeMarginItem({ id: 'a' }), makeMarginItem({ id: 'b', purchase: '50', margin: '0.2', shipped: '10' })],
    }),
    makeMarginMonth({ month: '02', items: [makeMarginItem({ id: 'c' })] }),
  ];

  it('editing a quantity re-derives that row and re-totals only its own month', () => {
    const before = world();
    expect(applyItemChange(before, '01', 'a', 'purchase' as any, '200')).toEqual(
      webHandleChange(world(), '01', 'a', 'purchase', '200')
    );
    // the untouched month must come back byte-identical
    const after = applyItemChange(before, '01', 'a', 'purchase' as any, '200')!;
    expect(after[1]).toEqual(before[1]);
  });

  it('total margin is qty x margin and remaining is the UNSHIPPED qty x margin', () => {
    // web page.js:477-479 — remaining uses (purchase − shipped), not purchase.
    const item = recomputeItem(makeMarginItem({ purchase: '100', margin: '0.5', shipped: '40' }) as any);
    expect(item.totalMargin).toBe(50);
    expect(item.openShip).toBe(60);
    expect(item.remaining).toBe(30);
  });

  it('a gis row contributes HALF its margin and remaining but its FULL quantity', () => {
    // web page.js:485-488 — the halving is applied to remaining/totalMargin ONLY.
    const month = makeMarginMonth({
      items: [
        makeMarginItem({ id: 'g', gis: true, purchase: '100', openShip: 60, totalMargin: 10, remaining: 6 }),
        makeMarginItem({ id: 'n', gis: false, purchase: '100', openShip: 60, totalMargin: 10, remaining: 6 }),
      ],
    });
    const rolled = rollupMonth(month as any);
    expect(rolled.totalMargin).toBe(15); // 10/2 + 10
    expect(rolled.remaining).toBe(9); //  6/2 + 6
    expect(rolled.purchase).toBe(200); // NOT halved
    expect(rolled.openShip).toBe(120); // NOT halved
  });

  it('a description edit is stored raw while numeric fields are stripped', () => {
    // web page.js:468 — only `description` bypasses removeNonNumeric.
    const desc = applyItemChange(world(), '01', 'a', 'description' as any, 'Ni Scrap, 304 (18/8)')!;
    expect(desc[0].items[0].description).toBe('Ni Scrap, 304 (18/8)');
    const qty = applyItemChange(world(), '01', 'a', 'purchase' as any, '1,234.5 MT')!;
    expect(qty[0].items[0].purchase).toBe('1234.5');
  });

  it('a keystroke taking a field past 3 significant decimals is dropped entirely', () => {
    // web page.js:464 — `return` before any setState, so the value never lands.
    expect(applyItemChange(world(), '01', 'a', 'purchase' as any, '1.2345')).toBeNull();
    expect(webHandleChange(world(), '01', 'a', 'purchase', '1.2345')).toBeNull();
  });

  it('trailing zeros are NOT decimals, so "1.0000" is accepted like web accepts it', () => {
    // Regression: mobile used `length − indexOf('.') − 1` and silently rejected this,
    // so a figure the web page takes could not be typed on the phone at all.
    const next = applyItemChange(world(), '01', 'a', 'purchase' as any, '1.0000');
    expect(next).not.toBeNull();
    expect(next).toEqual(webHandleChange(world(), '01', 'a', 'purchase', '1.0000'));
    expect(next![0].items[0].purchase).toBe('1.0000');
  });

  it('picking a supplier or a date does NOT re-total the month', () => {
    // web handleChangeSelect (page.js:493-508) writes the value through and stops —
    // no re-derivation and no roll-up, unlike handleChange.
    const before = world();
    const after = applyItemSelect(before, '01', 'a', 'supplier' as any, 'sup-2');
    expect(after[0].items[0].supplier).toBe('sup-2');
    expect(after[0].purchase).toBe(before[0].purchase);
    expect(after[0].totalMargin).toBe(before[0].totalMargin);
  });

  it('toggling gis re-totals the month without touching the row figures', () => {
    // web handleCheckBox (page.js:510-525) — same roll-up as handleChange, no re-derive.
    const before = world();
    const after = applyGisToggle(before, '01', 'a', true);
    expect(after[0].items[0].totalMargin).toBe(before[0].items[0].totalMargin); // row unchanged
    expect(after[0].totalMargin).toBe(
      before[0].items.reduce((s: number, r: any) => s + (r.id === 'a' ? Number(r.totalMargin) / 2 : Number(r.totalMargin)), 0)
    );
  });

  it('a new month is numbered from the COUNT of months, zero-padded to two digits', () => {
    // web addMonth (page.js:449-460) — String(data.length + 1).padStart(2, '0').
    expect(mobileAddMonth([]).map((m) => m.month)).toEqual(['01']);
    expect(mobileAddMonth(world()).at(-1)!.month).toBe('03');
    const nine = Array.from({ length: 9 }, (_, i) => makeMarginMonth({ month: String(i + 1).padStart(2, '0'), items: [] }));
    expect(mobileAddMonth(nine as any).at(-1)!.month).toBe('10');
  });

  it('the new month number is the COUNT even when that re-uses a number already taken', () => {
    // web page.js:451 is `data.length + 1`, NOT "highest existing + 1". Delete a month
    // from the middle and web hands the next new month a number that already exists.
    // Every contiguous fixture ('01','02' → '03') is satisfied by BOTH rules, so this
    // gappy case is the only one that pins which rule mobile implements — and it must
    // be web's, because `month` is the Firestore document key the two apps share
    // (utils/utils.js saveMargins), so renumbering here would write to a different doc.
    const gappy = [
      makeMarginMonth({ month: '01', items: [] }),
      makeMarginMonth({ month: '03', items: [] }),
    ] as any[];
    expect(mobileAddMonth(gappy).at(-1)!.month).toBe('03');
    expect(mobileAddMonth(gappy).map((m) => m.month)).toEqual(['01', '03', '03']);
    // a single month numbered '07' still yields '02', not '08'
    expect(mobileAddMonth([makeMarginMonth({ month: '07', items: [] })] as any).at(-1)!.month).toBe('02');
  });

  it('adding and deleting a row keeps `ids` in step with `items`', () => {
    // web addItem/deleteRow (page.js:426-447) push/filter BOTH arrays; `ids` is what
    // restores on-screen order after a reload, so a drifted pair loses rows.
    const added = mobileAddItem(world(), '01', 'z');
    expect(added[0].ids).toEqual(['a', 'b', 'z']);
    expect(webDataIds(added[0].items)).toEqual(added[0].ids);
    const removed = mobileDeleteItem(added, '01', 'a');
    expect(removed[0].ids).toEqual(['b', 'z']);
    expect(webDataIds(removed[0].items)).toEqual(removed[0].ids);
  });

  it('rows are restored in the saved id order, and an orphaned id is dropped', () => {
    const docs = [
      {
        month: '01',
        ids: ['c', 'a', 'missing'],
        items: [makeMarginItem({ id: 'a' }), makeMarginItem({ id: 'c' })],
      },
    ];
    expect(orderByIds(docs).map((m) => m.items.map((i: any) => i.id))).toEqual([['c', 'a']]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. THE COLLAPSED MONTH HEADER  (Tier 3 — mirror of marginTable.js:19-22)
// ═════════════════════════════════════════════════════════════════════════════

// Transcribed verbatim from app/(root)/margins/marginTable.js:19-22.
const webHeaderPurchase = (data: any[]) => data.reduce((sum, row) => sum + (Number(row.purchase) || 0), 0);
const webHeaderTotalMargin = (data: any[]) =>
  data.reduce((sum, row) => sum + (row?.gis ? Number(row?.totalMargin) / 2 || 0 : Number(row?.totalMargin) || 0), 0);
const webHeaderOpenShip = (data: any[]) => data.reduce((sum, row) => sum + (Number(row.openShip) || 0), 0);
const webHeaderRemaining = (data: any[]) =>
  data.reduce((sum, row) => sum + (row?.gis ? Number(row?.remaining) / 2 || 0 : Number(row?.remaining) || 0), 0);

describe('collapsed month header', () => {
  it("web's month-header reducers have not drifted", () => {
    expectWebUnchanged('app/(root)/margins/marginTable.js', 'purchase', '1dd6f2cdb5e2');
    expectWebUnchanged('app/(root)/margins/marginTable.js', 'totalMargin', '9824ce3c3a03');
    expectWebUnchanged('app/(root)/margins/marginTable.js', 'totalOpenShip', 'b40504a4719a');
    expectWebUnchanged('app/(root)/margins/marginTable.js', 'remaining', '03bf90e0940e');
  });

  const items = [
    makeMarginItem({ id: 'a', purchase: '100', openShip: 60, totalMargin: 1000, remaining: 600, gis: false }),
    makeMarginItem({ id: 'b', purchase: '25.5', openShip: 5.5, totalMargin: 400, remaining: 200, gis: true }),
  ];

  it('the header is derived from the VISIBLE rows, never the persisted aggregate', () => {
    // web marginTable.js:19-22 recomputes from `props.items` on every render, which is
    // why adding or deleting a row updates the header before any save. A month doc
    // carrying a stale aggregate must be ignored.
    const stale = makeMarginMonth({ items, purchase: 999999, totalMargin: 999999, openShip: 999999, remaining: 999999 });
    expect(monthPurchase(stale.items)).toBe(webHeaderPurchase(items));
    expect(monthMargin(stale.items)).toBe(webHeaderTotalMargin(items));
    expect(monthOpenShip(stale.items)).toBe(webHeaderOpenShip(items));
    expect(monthRemaining(stale.items)).toBe(webHeaderRemaining(items));
    expect(monthPurchase(stale.items)).not.toBe(stale.purchase);
  });

  it('the header halves a gis row in Total Margin and Remaining only', () => {
    expect(monthMargin(items)).toBe(1200); // 1000 + 400/2
    expect(monthRemaining(items)).toBe(700); // 600 + 200/2
    expect(monthPurchase(items)).toBe(125.5); // full
    expect(monthOpenShip(items)).toBe(65.5); // full
  });

  it('an unparseable row figure contributes zero rather than poisoning the header', () => {
    // `Number(x) || 0` in all four reducers — marginTable.js:19-22.
    const junk = [...items, makeMarginItem({ id: 'x', purchase: 'n/a', openShip: undefined, totalMargin: '', remaining: null })];
    expect(monthPurchase(junk)).toBe(webHeaderPurchase(junk));
    expect(monthMargin(junk)).toBe(webHeaderTotalMargin(junk));
    expect(Number.isFinite(monthPurchase(junk))).toBe(true);
  });

  it('the header prints Qty to 3 decimals and Total Margin to 2', () => {
    // web marginTable.js:92-98 (decimalScale={3} fixedDecimalScale) and :120-127
    // (decimalScale={2} prefix="$"). Mobile renders the same figures through fmtMoney.
    const src = collapsed('app/(root)/margins/marginTable.js');
    expect(src).toContain('value={purchase} displayType="text" thousandSeparator allowNegative decimalScale={3} fixedDecimalScale');
    expect(src).toContain('value={totalMargin} displayType="text" thousandSeparator allowNegative prefix="$" decimalScale={2} fixedDecimalScale');
    expect(fmtMoney(monthPurchase(items), 3)).toBe('125.500');
    expect(fmtMoney(monthMargin(items), 2)).toBe('1,200.00');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. GIS TOTALS DECIMAL RULES  (Tier 3 — mirror of thirdpart.js)
// ═════════════════════════════════════════════════════════════════════════════

describe('GIS totals decimal rules', () => {
  it("web's thirdpart decimal props have not drifted", () => {
    const src = collapsed('app/(root)/margins/thirdpart.js');
    // :340 — Purchased quantity total. `false` DISABLES NumericFormat's decimal
    // limit, so a whole number renders with no decimal part at all.
    expect(src).toContain("decimalScale={!Number.isInteger(purchase) && '2'}");
    // :399-406 — Outstanding shipment total is unconditionally two decimals.
    expect(src).toContain(
      'value={outStandingShip} displayType="text" thousandSeparator allowNegative={true} decimalScale="2"'
    );
  });

  it('GIS Purchased quantity drops the decimals on a whole number', () => {
    expect(gisPurchasedDecimals(1200)).toBe(0);
    expect(fmtMoney(1200, gisPurchasedDecimals(1200))).toBe('1,200');
  });

  it('GIS Purchased quantity shows exactly 2 decimals when it is not whole', () => {
    expect(gisPurchasedDecimals(1200.5)).toBe(2);
    expect(fmtMoney(1200.5, gisPurchasedDecimals(1200.5))).toBe('1,200.50');
  });

  it('GIS Outstanding shipment is always 2 decimals, whole number or not', () => {
    expect(GIS_OUTSTANDING_DECIMALS).toBe(2);
    expect(fmtMoney(1200, GIS_OUTSTANDING_DECIMALS)).toBe('1,200.00');
    expect(fmtMoney(1200.5, GIS_OUTSTANDING_DECIMALS)).toBe('1,200.50');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. MATERIAL TABLE CONSTANTS  (Tier 2 — web's constants.js is importable)
// ═════════════════════════════════════════════════════════════════════════════

describe('material table constants', () => {
  it('the element set and its ORDER match web exactly', () => {
    // Order drives the column order AND which nine elements the cross-table total
    // rolls up (materialtables/page.js:335) — a reordering silently changes both.
    expect(MOBILE_ELEMENTS.map((e: any) => ({ ...e }))).toEqual(WEB_ELEMENTS);
    expect(WEB_ELEMENTS.find((e: any) => e.key === 'fe').autoCalc).toBe(true);
  });

  it('unit labels and the unit→MT factors match web', () => {
    expect(MOBILE_UNIT_LABELS).toEqual(WEB_UNIT_LABELS);
    expect(MOBILE_UNIT_TO_MT).toEqual(WEB_UNIT_TO_MT);
    expect(WEB_UNIT_TO_MT.kgs).toBe(0.001);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. MATERIAL TABLE FOOTER + COST COLUMNS  (Tier 3 — mirror of newTable.js)
// ═════════════════════════════════════════════════════════════════════════════

// Transcribed verbatim from app/(root)/materialtables/newTable.js:175-186 (`fmt`),
// with the TanStack `row.getValue(k)` accessor replaced by a plain property read.
const webFmt = (val: any, colId: string, unit: string) => {
  if (colId === 'material' || colId === 'container') return val ?? '';
  if (val === '' || val == null) return '';
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  if (colId === 'kgs') {
    if (unit === 'mt') return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
  }
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

// Transcribed verbatim from newTable.js:200-209 — the footer's row filter.
const webFooterRows = (allRows: any[], elements: any[]) =>
  allRows.filter((r) => {
    const mat = r.material;
    if (mat && String(mat).trim() !== '') return true;
    return elements.some((el) => {
      const v = parseFloat(r[el.key]);
      return !isNaN(v) && v !== 0;
    });
  });

// Transcribed verbatim from newTable.js:107-111 / :122-131 (accessorFn bodies).
const webCostPmt = (row: any, elements: any[], prices: any, niMult: number) =>
  elements.reduce((sum, el) => {
    const price = parseFloat(prices[el.key]) || 0;
    if (!price) return sum;
    const mult = el.key === 'ni' ? niMult : 1;
    return sum + ((parseFloat(row[el.key]) || 0) / 100) * price * mult;
  }, 0);
const webCostTotal = (row: any, elements: any[], prices: any, niMult: number, unit: string) =>
  webCostPmt(row, elements, prices, niMult) * ((parseFloat(row.kgs) || 0) * (WEB_UNIT_TO_MT[unit] || 0.001));

describe('material table footer', () => {
  it("web's fmt / footerVal / cost columns have not drifted", () => {
    expectWebUnchanged('app/(root)/materialtables/newTable.js', 'fmt', '68aede0d2941');
    expectWebUnchanged('app/(root)/materialtables/newTable.js', 'footerVal', '29b9b76b6a38');
    // Re-recorded 2026-08-17: the ONLY change was a colour literal,
    // var(--chathams-blue) -> TONES.green.text. fmt, footerVal, hasPrices and niMult
    // were confirmed byte-identical, so no cost/footer formula moved.
    expectWebUnchanged('app/(root)/materialtables/newTable.js', 'enhancedColumns', '38b8cfc2f4e3');
    expectWebUnchanged('app/(root)/materialtables/newTable.js', 'hasPrices', '693a64e82c2a');
    expectWebUnchanged('app/(root)/materialtables/newTable.js', 'niMult', '39476216c4bf');
  });

  const elements = MOBILE_ELEMENTS.map((e: any) => ({ key: e.key, label: e.label }));

  it('a blank placeholder row is excluded, but a blank-material row with chemistry is not', () => {
    // newTable.js:200-209 — the exclusion needs BOTH a blank material AND all-zero
    // elements. Mobile used to sum placeholders, shifting the weight total, every
    // weighted average and the item count.
    const real = makeMaterialRow({ id: 'r1' });
    const placeholder = makeMaterialRow({ id: 'r2', material: '   ', kgs: '5000', ni: '0', cr: '', mo: '0', co: '', nb: '', w: '', cu: '', fe: '', ti: '' });
    const unnamedButAssayed = makeMaterialRow({ id: 'r3', material: '', kgs: '1000', ni: '4' });
    const rows = [real, placeholder, unnamedButAssayed];

    expect(footerRows(rows, elements).map((r: any) => r.id)).toEqual(['r1', 'r3']);
    expect(footerRows(rows, elements)).toEqual(webFooterRows(rows, elements));
    // …and the excluded row's 5000 kg never reaches the total.
    expect(totalWeight(footerRows(rows, elements))).toBe(21000);
  });

  it('the material column footer counts the INCLUDED rows', () => {
    // newTable.js:210 — `${rows.length} items`, i.e. after the placeholder filter.
    const rows = [makeMaterialRow({ id: 'r1' }), makeMaterialRow({ id: 'r2', material: '', kgs: '5000', ni: '0', cr: '0', mo: '0', co: '0', nb: '0', w: '0', cu: '0', fe: '0', ti: '0' })];
    expect(footerRows(rows, elements).length).toBe(1);
  });

  it('MT weights keep 3 decimals while kgs and lbs round to whole units', () => {
    // newTable.js:180-184 — the rule is per TABLE UNIT, not per value.
    expect(fmtWeight('12.3456', 'mt')).toBe(webFmt('12.3456', 'kgs', 'mt'));
    expect(fmtWeight('12.3456', 'mt')).toBe('12.346');
    expect(fmtWeight('20000.6', 'kgs')).toBe(webFmt('20000.6', 'kgs', 'kgs'));
    expect(fmtWeight('20000.6', 'kgs')).toBe('20,001');
    expect(fmtWeight('44092.5', 'lbs')).toBe('44,093');
  });

  it('an unparseable cell renders blank rather than echoing the raw text', () => {
    // newTable.js:178-179 — isNaN → '' (mobile used to print the raw string).
    for (const v of ['', null, undefined, 'n/a']) {
      expect(fmtCell(v)).toBe(webFmt(v, 'ni', 'kgs'));
      expect(fmtCell(v)).toBe('');
    }
    expect(fmtCell('8.5')).toBe('8.50');
  });

  it('a weighted average of zero renders EMPTY, so "no data" never reads as a measured 0', () => {
    // newTable.js:249 — `avg === 0 ? '' : format(avg)`.
    const rows = [makeMaterialRow({ id: 'r1', ni: '10', ti: '0' })];
    const tw = totalWeight(rows);
    expect(weightedAvg(rows, 'ti', tw)).toBe(0);
    expect(fmtAvg(weightedAvg(rows, 'ti', tw))).toBe('');
    expect(fmtAvg(weightedAvg(rows, 'ni', tw))).toBe('10.00');
  });

  it('an element footer is weighted by row weight, not a plain mean', () => {
    // newTable.js:244-248 — Σ(kgs × value) / Σ(kgs).
    const rows = [
      makeMaterialRow({ id: 'r1', kgs: '1000', ni: '10' }),
      makeMaterialRow({ id: 'r2', kgs: '9000', ni: '20' }),
    ];
    const tw = totalWeight(rows);
    expect(weightedAvg(rows, 'ni', tw)).toBe(19); // a plain mean would be 15
    const mirror =
      rows.reduce((s, r: any) => s + (parseFloat(r.kgs) || 0) * (parseFloat(r.ni) || 0), 0) /
      rows.reduce((s, r: any) => s + (parseFloat(r.kgs) || 0), 0);
    expect(weightedAvg(rows, 'ni', tw)).toBe(mirror);
  });

  it('an empty table averages to zero instead of dividing by zero', () => {
    // newTable.js:248 — `totalW > 0 ? wSum / totalW : 0`.
    expect(weightedAvg([], 'ni', 0)).toBe(0);
    expect(footerCostPmt([], elements, { ni: '16000' }, 1, 0)).toBe(0);
  });

  it('a row with no usable weight adds ZERO to the weight total, never a default', () => {
    // newTable.js:211 — `s + (parseFloat(r.getValue('kgs')) || 0)`. The total is the
    // denominator of every weighted average and of the footer $/MT, so substituting
    // any non-zero default for an unweighed row skews the whole footer, not just the
    // weight cell. A half-typed row (chemistry entered, weight not yet) is the common
    // real case and it must count for nothing until a weight lands.
    const rows = [
      makeMaterialRow({ id: 'r1', kgs: '1000', ni: '10' }),
      makeMaterialRow({ id: 'r2', kgs: '', ni: '90' }),
      makeMaterialRow({ id: 'r3', kgs: 'n/a', ni: '90' }),
    ];
    expect(totalWeight(rows)).toBe(1000);
    expect(totalWeight(rows)).toBe(
      rows.reduce((s, r: any) => s + (parseFloat(r.kgs) || 0), 0) // mirror of newTable.js:211
    );
    // the unweighed rows therefore cannot move the weighted average either
    expect(weightedAvg(rows, 'ni', totalWeight(rows))).toBe(10);
  });
});

describe('material table cost columns', () => {
  const elements = MOBILE_ELEMENTS.map((e: any) => ({ key: e.key, label: e.label }));
  const prices = { ni: '16000', cr: '1200', mo: '30000' };

  it('cost PMT is the per-element percentage priced out, with Ni scaled by the payable %', () => {
    const row = makeMaterialRow({ ni: '10', cr: '20', mo: '1' });
    expect(costPmt(row, elements, prices, 1)).toBe(webCostPmt(row, elements, prices, 1));
    expect(costPmt(row, elements, prices, 1)).toBeCloseTo(0.1 * 16000 + 0.2 * 1200 + 0.01 * 30000, 10);
    // 85% payable Ni only discounts the Ni term — newTable.js:109.
    expect(costPmt(row, elements, prices, 0.85)).toBeCloseTo(0.1 * 16000 * 0.85 + 0.2 * 1200 + 0.01 * 30000, 10);
  });

  it('a price counts when it is TRUTHY, not when it is positive — a negative price still prices', () => {
    // newTable.js:108-109 — `parseFloat(prices[el.key]) || 0` then `if (!price) return sum`.
    // The three cases that separate web's rule from the plausible `parseFloat(p) > 0`:
    const row = makeMaterialRow({ ni: '10', cr: '20', fe: '70' });
    // (a) Fe carries 70% and has no price at all → contributes nothing.
    expect(costPmt(row, elements, { ni: '16000' }, 1)).toBe(0.1 * 16000);
    // (b) an unparseable price is the same as no price (`|| 0` then `!price`).
    expect(costPmt(row, elements, { ni: '16000', cr: 'n/a' }, 1)).toBe(0.1 * 16000);
    // (c) a NEGATIVE price is truthy, so it IS applied and pulls the cost down. A
    //     `> 0` gate would silently drop it and over-state the row.
    const neg = { ni: '16000', cr: '-500' };
    expect(costPmt(row, elements, neg, 1)).toBe(webCostPmt(row, elements, neg, 1));
    expect(costPmt(row, elements, neg, 1)).toBeCloseTo(0.1 * 16000 + 0.2 * -500, 10);
    expect(costPmt(row, elements, neg, 1)).toBeLessThan(costPmt(row, elements, { ni: '16000' }, 1));
  });

  it('cost total converts the row weight to MT, so a kgs table is not 1000x out', () => {
    // newTable.js:123 — `(parseFloat(row.kgs) || 0) * UNIT_TO_MT[unit]`. The price row
    // is $/MT; without the conversion a 20,000 kg row would cost like 20,000 MT.
    const row = makeMaterialRow({ kgs: '20000', ni: '10', cr: '0', mo: '0' });
    const asKgs = costTotal(row, elements, prices, 1, 'kgs');
    const asMt = costTotal(row, elements, prices, 1, 'mt');
    expect(asKgs).toBe(webCostTotal(row, elements, prices, 1, 'kgs'));
    expect(asMt / asKgs).toBeCloseTo(1000, 6);
    expect(asKgs).toBeCloseTo(0.1 * 16000 * 20, 6); // 20,000 kg = 20 MT
  });

  it('an lbs table converts through 0.000453592 MT per lb', () => {
    const row = makeMaterialRow({ kgs: '44092.5', ni: '10', cr: '0', mo: '0' });
    expect(costTotal(row, elements, prices, 1, 'lbs')).toBe(webCostTotal(row, elements, prices, 1, 'lbs'));
    expect(costTotal(row, elements, prices, 1, 'lbs')).toBeCloseTo(0.1 * 16000 * (44092.5 * 0.000453592), 6);
  });

  it('the footer $/MT is weighted by row weight, and the footer total is a plain sum', () => {
    // newTable.js:218-227 (weighted) vs :232-241 (sum).
    const rows = [
      makeMaterialRow({ id: 'r1', kgs: '1000', ni: '10', cr: '0', mo: '0' }),
      makeMaterialRow({ id: 'r2', kgs: '9000', ni: '20', cr: '0', mo: '0' }),
    ];
    const tw = totalWeight(rows);
    expect(footerCostPmt(rows, elements, prices, 1, tw)).toBeCloseTo(0.19 * 16000, 6); // weighted, not 0.15
    expect(footerCostTotal(rows, elements, prices, 1, 'kgs')).toBeCloseTo(
      rows.reduce((s, r) => s + webCostTotal(r, elements, prices, 1, 'kgs'), 0),
      10
    );
  });

  it('an Fe-only price does NOT switch the cost columns on, but a price of "0" does', () => {
    // newTable.js:93-96 — the gate excludes Fe and tests for "not undefined and not
    // empty string", NOT for a positive number. Mobile used `parseFloat(p) > 0`,
    // which showed the columns on tables web hides them on and vice versa.
    expect(hasPrices(elements, { fe: '500' })).toBe(false);
    expect(hasPrices(elements, { ni: '0' })).toBe(true);
    expect(hasPrices(elements, { ni: '' })).toBe(false);
    expect(hasPrices(elements, {})).toBe(false);
    expect(hasPrices(elements, { ni: '16000' })).toBe(true);
  });

  it('a blank or zero payable % falls back to 100%, it does not zero out the Ni cost', () => {
    // newTable.js:98 — `(niPercent || 100) / 100`.
    expect(niMultiplier('')).toBe(1);
    expect(niMultiplier(0)).toBe(1);
    expect(niMultiplier(null)).toBe(1);
    expect(niMultiplier(undefined)).toBe(1);
    expect(niMultiplier(100)).toBe(1);
    expect(niMultiplier('85')).toBe(0.85);
  });

  // Tier 4 — mobile hardening. Web's `(niPercent || 100) / 100` yields NaN for a
  // non-numeric percentage (its input is unfiltered text), poisoning every cost
  // cell; mobile's Number() coercion falls back to 100%.
  it('DIVERGENCE: a non-numeric payable % is NaN on web, 100% on mobile', () => {
    expect(('abc' as any || 100) / 100).toBeNaN();
    expect(niMultiplier('abc')).toBe(1);
  });

  it('money formatting is two fixed decimals with a $ prefix', () => {
    // newTable.js:116 / :136 — Intl minimumFractionDigits 2, maximumFractionDigits 2.
    expect(money(1234.5)).toBe('$1,234.50');
    expect(money(0)).toBe('$0.00');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. CROSS-TABLE GRAND TOTALS  (Tier 3 — mirror of materialtables/page.js:321-344)
// ═════════════════════════════════════════════════════════════════════════════

describe('cross-table grand totals', () => {
  it("web's grand-total effect and its per-table twin have not drifted", () => {
    // The roll-up lives in an anonymous useEffect, so it has no hashable symbol —
    // pin the exact statements instead. `runPdf` carries the identical per-table
    // weighted-average block and IS hashable.
    expectWebUnchanged('app/(root)/materialtables/page.js', 'runPdf', 'cf7b88345ded');
    const src = collapsed('app/(root)/materialtables/page.js');
    expect(src).toContain(
      "const ws = table.data.reduce((s, row) => s + (parseFloat(row[el.key] || 0) * Number(row.kgs)), 0) obj[el.key] = totalKgs > 0 ? (ws / totalKgs).toFixed(2) : '0.00'"
    );
    expect(src).toContain(
      "DEFAULT_ELEMENTS.forEach(el => { const valid = arr.filter(item => !isNaN(parseFloat(item[el.key]))) const sum = valid.reduce((acc, item) => acc + parseFloat(item[el.key] || 0), 0) result[el.key] = valid.length > 0 ? (sum / valid.length).toFixed(2) : '0.00' })"
    );
    // page.js:408 — the whole row is hidden when any value is unparseable.
    expect(src).toContain('!Object.values(totals).some(v => isNaN(v))');
  });

  it('the grand total is an UNWEIGHTED mean of per-table averages, so a tiny table counts as much as a huge one', () => {
    // page.js:335-339 — `sum / valid.length` over the PER-TABLE averages. A
    // weight-weighted roll-up would give ~20 here; web gives 15.
    const tables = [
      makeMaterialTable({ id: 't1', data: [makeMaterialRow({ kgs: '10', ni: '10' })] }),
      makeMaterialTable({ id: 't2', data: [makeMaterialRow({ kgs: '1000000', ni: '20' })] }),
    ];
    const result = grandTotals(tables)!;
    expect(result.ni).toBe('15.00');
    expect(result.kgs).toBe('1000010.00');
  });

  it('only the nine DEFAULT elements are rolled up — a custom column never appears', () => {
    // page.js:335 iterates DEFAULT_ELEMENTS, not the table's own element list.
    const withCustom = makeMaterialTable({
      id: 't1',
      elements: [...MOBILE_ELEMENTS.map((e: any) => ({ ...e })), { key: 'al', label: 'Al' }],
      data: [makeMaterialRow({ kgs: '1000', ni: '10', al: '5' } as any)],
    });
    const result = grandTotals([withCustom])!;
    expect(Object.keys(result).sort()).toEqual(['co', 'cr', 'cu', 'fe', 'kgs', 'mo', 'nb', 'ni', 'ti', 'w'].sort());
    expect(result).not.toHaveProperty('al');
  });

  it('a table with no weight contributes 0.00, not a division by zero', () => {
    // page.js:329 — `totalKgs > 0 ? … : '0.00'`.
    const tables = [
      makeMaterialTable({ id: 't1', data: [makeMaterialRow({ kgs: '0', ni: '10' })] }),
      makeMaterialTable({ id: 't2', data: [makeMaterialRow({ kgs: '1000', ni: '20' })] }),
    ];
    expect(grandTotals(tables)!.ni).toBe('10.00'); // (0.00 + 20.00) / 2
  });

  it('the whole Total row is withheld when any figure is unparseable', () => {
    // page.js:408 — web renders nothing rather than a row of NaN.
    const tables = [makeMaterialTable({ id: 't1', data: [makeMaterialRow({ kgs: 'n/a', ni: '10' })] })];
    expect(grandTotals(tables)).toBeNull();
    expect(grandTotals([])).toBeNull();
  });

  it('the grand total uses EVERY stored row — the placeholder filter is footer-only', () => {
    // page.js:325-330 reads table.data directly; the blank-row filter is a
    // newTable.js footer rule and is deliberately NOT applied here.
    const placeholder = makeMaterialRow({ id: 'p', material: '', kgs: '1000', ni: '0', cr: '0', mo: '0', co: '0', nb: '0', w: '0', cu: '0', fe: '0', ti: '0' });
    const real = makeMaterialRow({ id: 'r', kgs: '1000', ni: '10' });
    const table = makeMaterialTable({ id: 't1', data: [real, placeholder] });
    expect(grandTotals([table])!.ni).toBe('5.00'); // (10×1000 + 0×1000) / 2000
    expect(footerRows([real, placeholder], MOBILE_ELEMENTS as any)).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. MATERIAL CELL INPUT GUARD
// ═════════════════════════════════════════════════════════════════════════════

describe('material cell input guard', () => {
  it("web's materialtables countDecimalDigits has not drifted", () => {
    expectWebUnchanged('app/(root)/materialtables/page.js', 'countDecimalDigits', 'f45cad6ad689');
  });

  it('an element cell rejects a third decimal, but an all-zero fraction is not a decimal', () => {
    // web editCell (page.js:265-267) — `countDecimalDigits(value) > 2` → return.
    // The leading-zero strip means "8.00" measures 0 and is accepted, while "8.500"
    // measures 3 (nothing leading to strip) and is rejected — page.js:19-24.
    expect(cleanElement('8.123')).toBeNull();
    expect(cleanElement('8.500')).toBeNull();
    expect(cleanElement('8.12')).toBe('8.12');
    expect(cleanElement('8.00')).toBe('8.00');
    for (const v of ['8.123', '8.500', '8.12', '8.00']) {
      expect(cleanElement(v) === null).toBe(webCountDecimals(v) > 2);
    }
  });

  it('the weight cell is stripped to digits, dot and minus', () => {
    // web editCell (page.js:277) — kgs is the only column web cleans.
    expect(cleanKgs('20,000 kg')).toBe('20000');
    expect(cleanKgs(null as any)).toBe('');
  });

  // Tier 4 — deliberate. Web stores an element cell's raw text (only `kgs` is
  // cleaned, page.js:277), so "1,5" lands in Firestore verbatim and renders as
  // 1.00 via parseFloat. Mobile strips first, so the SAME keystroke stores "15".
  // Mobile is the safer side of this and both apps read the same document, so the
  // strip is kept — but it is a real difference and is recorded here, not hidden.
  it('DIVERGENCE: mobile strips non-numerics out of an element cell, web stores the raw text', () => {
    // web page.js:277 — the strip is guarded on `colId === 'kgs'`, so every other
    // column takes `value` unchanged. Pinned against the source, not assumed.
    const src = collapsed('app/(root)/materialtables/page.js');
    expect(src).toContain("const clean = colId === 'kgs' ? value.replace(/[^0-9.-]/g, '') : value");
    expect(cleanElement('1,5')).toBe('15');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. PRICING FORMULAS  (Tier 3 — mirrors of the formulas tabs)
// ═════════════════════════════════════════════════════════════════════════════

const V = makeFormulaValue();
const num = (v: any) => parseFloat(v);

// Transcribed verbatim from app/(root)/formulas/tabs/fenicr.js:899-909.
// Left-to-right associativity is preserved exactly as web wrote it.
const webFenicr = (value: any) => {
  const fe: any = (100 - value?.fenicr?.ni - value?.fenicr?.cr - value?.fenicr?.mo).toFixed(2);
  const solidsPrice =
    (value?.fenicr?.ni * value?.general?.nilme * value?.fenicr?.formulaNiCost) / 10000 +
    (value?.fenicr?.cr * value?.fenicr?.crPrice) / 100 +
    (value?.fenicr?.mo * value?.fenicr?.moPrice) / 100 +
    (fe * value?.fenicr?.fePrice) / 100;
  const solidsPrice1 =
    (((value?.fenicr?.ni * value?.general?.nilme) / 100) * value?.fenicr?.formulaNiPrice) / 100 +
    (((value?.fenicr?.cr / 100) * value.general?.chargeCrLb * value.general?.mt * value?.fenicr?.crPriceArgus) / 100) +
    (value?.fenicr?.mo / 100) * ((value.general?.MoOxideLb * value?.fenicr?.moPriceArgus * value.general?.mt) / 100) +
    (fe * value?.fenicr?.fePrice1) / 100;
  return { fe, solidsPrice, solidsPrice1 };
};

// Transcribed verbatim from app/(root)/formulas/tabs/supperalloys.js:638-649.
const webSuperalloys = (value: any) => {
  const s = value.supperalloys;
  const fe: any = (100 - (s?.ni || 0) - (s?.cr || 0) - (s?.mo || 0) - (s?.nb || 0) - (s?.co || 0) - (s?.w || 0) - (s?.hf || 0) - (s?.ta || 0)).toFixed(2);
  const solidsPrice =
    ((s?.ni || 0) * (value.general.nilme / value.general.mt)) / 100 +
    ((s?.cr || 0) * (s?.crPrice || 0)) / 100 +
    ((s?.mo || 0) * (s?.moPrice || 0)) / 100 +
    ((s?.nb || 0) * (s?.nbPrice || 0)) / 100 +
    ((s?.co || 0) * (s?.coPrice || 0)) / 100 +
    ((s?.w || 0) * (s?.wPrice || 0)) / 100 +
    ((s?.hf || 0) * (s?.hfPrice || 0)) / 100 +
    ((s?.ta || 0) * (s?.taPrice || 0)) / 100;
  return { fe, solidsPrice };
};

describe('pricing formulas', () => {
  it("web's solidsPrice blocks have not drifted", () => {
    /* Re-recorded 2026-08-17. The tabs were rebuilt into shared cards and the
       turnings discount became editable state; Stainless also started DERIVING Fe,
       closing a divergence mobile had recorded against it. Every behavioural test in
       this block was made to pass against the new web code first — these hashes were
       not bumped to silence the alarm. */
    expectWebUnchanged('app/(root)/formulas/tabs/fenicr.js', 'fe', 'b01aed1a4a4f');
    expectWebUnchanged('app/(root)/formulas/tabs/fenicr.js', 'solidsPrice', '79184365368e');
    expectWebUnchanged('app/(root)/formulas/tabs/fenicr.js', 'solidsPrice1', '3e5ac9bba818');
    expectWebUnchanged('app/(root)/formulas/tabs/stainless.js', 'fe', 'bab0674ce6f8');
    expectWebUnchanged('app/(root)/formulas/tabs/stainless.js', 'solidsPrice', '9b7e0476b2ce');
    expectWebUnchanged('app/(root)/formulas/tabs/stainless.js', 'solidsPrice1', '63b9afe7857f');
    expectWebUnchanged('app/(root)/formulas/tabs/supperalloys.js', 'solidsPrice', '877b29907463');
  });

  it('Fe is DERIVED as 100 − the entered elements, rounded to 2dp — never stored', () => {
    // fenicr.js:899. The tab has no Fe input; the figure shown and the figure priced
    // are both computed. Mobile's feOf does the same rounding before the price maths.
    expect(computeFenicr(V).fe).toBe(Number(webFenicr(V).fe));
    expect(computeFenicr(makeFormulaValue({ fenicr: { ni: '8.5', cr: '18', mo: '0.5' } })).fe).toBe(73);
    // an over-100 assay goes negative rather than clamping — web does not clamp.
    expect(computeFenicr(makeFormulaValue({ fenicr: { ni: '60', cr: '50', mo: '0' } })).fe).toBe(-10);
  });

  it('FeNiCr cost and sales reproduce the web solidsPrice / solidsPrice1 expressions', () => {
    const web = webFenicr(V);
    const m = computeFenicr(V);
    // Exact equality, not toBeCloseTo: mobile reproduces web's left-to-right division
    // grouping term by term, so the two must agree to the last floating-point bit.
    expect(m.cost).toBe(web.solidsPrice);
    expect(m.sales).toBe(web.solidsPrice1);
  });

  it('the Cr Argus term keeps web\'s a/100*b*c*d/100 grouping, to the last bit', () => {
    // fenicr.js:907 is `cr / 100 * chargeCrLb * mt * crPriceArgus / 100`, i.e.
    // ((((cr/100)*chargeCrLb)*mt)*crPriceArgus)/100. Re-grouping it as
    // (cr/100) * ((chargeCrLb*mt*crPriceArgus)/100) is the same number in real
    // arithmetic but a different double: with the default fixture it is
    // 433.53852299999994 vs 433.5385229999999.
    //
    // On the default fixture that 1-ulp gap is ABSORBED by the much larger Ni term
    // when the four terms are summed, so the test above cannot see it. Isolate the
    // Cr term — zero Ni, zero Mo, no sales Fe price — and the grouping is pinned.
    const crOnly = makeFormulaValue({ fenicr: { ni: '0', mo: '0', fePrice1: '0' } });
    const m = computeFenicr(crOnly);
    const web = webFenicr(crOnly);
    expect(m.sales).toBe(web.solidsPrice1);
    // and it really is the term under test, not a coincidence of zeros
    expect(m.sales).toBeCloseTo((18 / 100) * 1.15 * 2204.62 * 95 / 100, 6);
    expect(m.sales).not.toBe((18 / 100) * ((1.15 * 2204.62 * 95) / 100));
  });

  it('Fe is rounded to 2dp and subtracted in WEB\'S ORDER, so the cent matches', () => {
    // fenicr.js:899 / stainless.js:588 / supperalloys.js:637 all subtract each element
    // from 100 one at a time and THEN round. Summing the elements first and taking
    // 100 − sum is identical in real arithmetic but not in IEEE-754: mobile used to do
    // that and printed Fe 72.98 where the web page shows 72.99, a cent that flows into
    // the Fe term of both the cost and the sales price. The formulas page strips input
    // to /[^0-9.]/ with no decimal cap (formulas/page.js:87), so 3dp assays are typeable.
    const awkward = makeFormulaValue({ fenicr: { ni: '8.505', cr: '18.005', mo: '0.505' } });
    expect(100 - (8.505 + 18.005 + 0.505)).not.toBe(100 - 8.505 - 18.005 - 0.505); // the trap
    expect(computeFenicr(awkward).fe).toBe(Number(webFenicr(awkward).fe));
    expect(computeFenicr(awkward).fe).toBe(72.99);
    // …and the rounded Fe, not the raw remainder, is what gets priced.
    expect(computeFenicr(awkward).cost).toBe(webFenicr(awkward).solidsPrice);
    const unrounded = makeFormulaValue({ fenicr: { ni: '8.555', cr: '18', mo: '0.5' } });
    expect(computeFenicr(unrounded).fe).toBe(72.94); // NOT the raw 72.945
    expect(computeFenicr(unrounded).cost).toBe(webFenicr(unrounded).solidsPrice);
  });

  it('FeNiCr turnings default to 92 cost / 90 price, and both are editable', () => {
    // The discount was a bare 0.92 / 0.9 in web's source with nothing on screen
    // saying so, so it could not be checked or changed without a deploy
    // (Zak, 2026-08-25). It reads from saved state now (fenicr.js:87-90) with a
    // PER-SIDE fallback, which is how the tab's long-standing 92/90 asymmetry
    // survives untouched for data saved before the change.
    const src = repoFileText('app/(root)/formulas/tabs/fenicr.js');
    expect(src).toContain("turnPct('turningsCost', 92)");
    expect(src).toContain("turnPct('turningsPrice', 90)");
    // unset -> exactly the old hard-coded numbers
    const m = computeFenicr(V);
    expect(m.costTurnings).toBeCloseTo((m.cost * 92) / 100, 9);
    expect(m.salesTurnings).toBeCloseTo((m.sales * 90) / 100, 9);
    // a stored value wins, per side
    const e = computeFenicr({ ...V, fenicr: { ...V.fenicr, turningsCost: 85, turningsPrice: 95 } });
    expect(e.costTurnings).toBeCloseTo((e.cost * 85) / 100, 9);
    expect(e.salesTurnings).toBeCloseTo((e.sales * 95) / 100, 9);
    // an empty box is "unset", not zero — otherwise clearing it would price
    // turnings at nothing
    const blank = computeFenicr({ ...V, fenicr: { ...V.fenicr, turningsCost: '' } });
    expect(blank.costTurnings).toBeCloseTo((blank.cost * 92) / 100, 9);
  });

  it('Stainless defaults BOTH turnings sides to 92, unlike FeNiCr', () => {
    // stainless.js:95 has ONE TURNINGS_DEFAULT for both sides where FeNiCr passes a
    // fallback per side. Mobile once applied 0.90 to the Stainless SALES side and
    // read 2.174% low against the web page.
    const src = repoFileText('app/(root)/formulas/tabs/stainless.js');
    expect(src).toContain('TURNINGS_DEFAULT = 92');
    expect(src).toContain("turnPct('turningsCost')");
    expect(src).toContain("turnPct('turningsPrice')");
    const m = computeStainless(V);
    expect(m.costTurnings).toBeCloseTo((m.cost * 92) / 100, 9);
    expect(m.salesTurnings).toBeCloseTo((m.sales * 92) / 100, 9);
    // the two tabs still disagree on identical inputs, via their defaults
    expect(computeFenicr(V).salesTurnings).not.toBe(computeStainless(V).salesTurnings);
    // and a stored value overrides
    const e = computeStainless({ ...V, stainless: { ...V.stainless, turningsPrice: 88 } });
    expect(e.salesTurnings).toBeCloseTo((e.sales * 88) / 100, 9);
  });

  it('Stainless shares the FeNiCr expression structure, so identical inputs give identical cost/sales', () => {
    // stainless.js:590-598 is the FeNiCr block with the namespace swapped, so with
    // the same numbers under both keys the two tabs must price the same.
    const m1 = computeFenicr(V);
    const m2 = computeStainless(V);
    expect(m2.cost).toBe(m1.cost);
    expect(m2.sales).toBe(m1.sales);
  });

  // Tier 4 — web bug, mobile deliberately correct.
  it('Stainless derives Fe, like FeNiCr — the stored-fe divergence is closed', () => {
    // This WAS a recorded divergence. stainless.js used to read `value.stainless.fe`
    // in its solidsPrice, but the tab has no Fe input — it only ever DISPLAYS the
    // derived value — so the field was undefined and web's figure came out NaN as
    // soon as an Fe price was entered. Mobile derived Fe on both tabs instead.
    // Web has since adopted the same rule (stainless.js:39, used at :45 and :51), so
    // the two agree and this is a parity test now.
    const webSrc = repoFileText('app/(root)/formulas/tabs/stainless.js');
    expect(webSrc).toContain('const fe = ');
    expect(webSrc).not.toContain('value?.stainless?.fe * value?.stainless?.fePrice');
    expect(repoFileText('app/(root)/formulas/tabs/fenicr.js')).toContain('const fe = ');

    // and the figure is finite on both sides, with Fe the remainder
    const m = computeStainless(V);
    expect(Number.isFinite(m.cost)).toBe(true);
    expect(m.fe).toBe(73);
  });

  it('SuperAlloys prices Ni off the LME per-MT rate and derives Fe from all eight elements', () => {
    // supperalloys.js:638-649 — `ni * (nilme / mt) / 100`, and Fe subtracts every
    // element including Nb/Co/W/Hf/Ta.
    const web = webSuperalloys(V);
    const m = computeSuperalloys(V);
    expect(m.fe).toBe(Number(web.fe));
    expect(m.fe).toBe(11); // 100 − (55+20+9+3.5+1+0.5+0+0)
    expect(m.base).toBe(web.solidsPrice);
  });

  it('SuperAlloys cost and price are the base scaled by the Ints percentages', () => {
    // Web rebuilt this tab into two real cards off one `side(formulaField)` helper,
    // and deleted the 640 lines of commented-out pre-2026-08 markup this test used to
    // have to steer around. The ARITHMETIC is untouched - web's own comment says so -
    // so the pin moves to the live helper rather than the old per-tile markup.
    const src = collapsed('app/(root)/formulas/tabs/supperalloys.js');
    expect(src).toContain('const base = solidsPrice * n(a[formulaField]) / 100;');
    expect(src).toContain("side('formulaIntsCost')");
    expect(src).toContain("side('formulaIntsPrice')");
    // per-MT still scales the UNROUNDED base
    expect(src).toContain('fmt((base * n(g.mt)).toFixed(2))');

    // Mirror of those four expressions, built from the FIXTURE and web's own base,
    // not from mobile's return value.
    const web = webSuperalloys(V);
    const pctCost = num(V.supperalloys.formulaIntsCost);
    const pctPrice = num(V.supperalloys.formulaIntsPrice);
    const mt = num(V.general.mt);
    const m = computeSuperalloys(V);
    expect(m.base).toBe(web.solidsPrice);
    expect(m.cost).toBe((web.solidsPrice * pctCost) / 100);
    expect(m.price).toBe((web.solidsPrice * pctPrice) / 100);
    // "per MT" scales the UNROUNDED figure — web multiplies before its toFixed(2).
    expect(m.costPerMT).toBe(((web.solidsPrice * pctCost) / 100) * mt);
    expect(m.pricePerMT).toBe(((web.solidsPrice * pctPrice) / 100) * mt);
    // the two percentages differ in the fixture, so a cost/sales mix-up cannot hide
    expect(pctCost).not.toBe(pctPrice);
    expect(m.cost).not.toBe(m.price);
  });

  it('Stainless and SuperAlloys derive Fe in web\'s subtraction order too', () => {
    // Same IEEE-754 trap as the FeNiCr case above — stainless.js:588 and
    // supperalloys.js:637 both subtract element by element before rounding.
    const awkward = makeFormulaValue({
      stainless: { ni: '8.505', cr: '18.005', mo: '0.505' },
      supperalloys: { ni: '8.505', cr: '18.005', mo: '0.505', nb: '0.005', co: '0', w: '0', hf: '0', ta: '0' },
    });
    const webStainlessFe = (100 - ('8.505' as any) - ('18.005' as any) - ('0.505' as any)).toFixed(2);
    expect(computeStainless(awkward).fe).toBe(Number(webStainlessFe));
    expect(computeStainless(awkward).fe).toBe(72.99);
    expect(computeSuperalloys(awkward).fe).toBe(Number(webSuperalloys(awkward).fe));
  });

  it('the euro figures divide by the EUR rate', () => {
    const m = computeFenicr(V);
    expect(m.costEuro).toBeCloseTo(m.cost / num(V.general.euroRate), 9);
    expect(m.salesEuro).toBeCloseTo(m.sales / num(V.general.euroRate), 9);
  });

  // Tier 4 — mobile hardening. Web divides unguarded (fenicr.js:1023), so a missing
  // or zero rate prints Infinity/NaN; mobile shows 0.
  it('DIVERGENCE: a zero EUR rate is Infinity on web and 0 on mobile', () => {
    const zeroRate = makeFormulaValue({ general: { euroRate: '0' } });
    const m = computeFenicr(zeroRate);
    expect(m.cost / 0).toBe(Infinity);
    expect(m.costEuro).toBe(0);
    expect(m.salesEuro).toBe(0);
  });

  // Tier 4 — mobile hardening. Web multiplies undefined state straight into the
  // formula, so an unfilled tab is NaN everywhere; mobile's n() coerces to 0.
  it('DIVERGENCE: an empty formulas document is NaN on web and 0 on mobile', () => {
    expect((undefined as any) * 10).toBeNaN();
    const m = computeFenicr({});
    expect(m.cost).toBe(0);
    expect(m.sales).toBe(0);
    expect(m.fe).toBe(100); // 100 − nothing entered
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SALES COLUMNS — ported 2026-08-17. Web gained a second price bar (a "sales"
// twin of the cost bar) and mobile had none of it, so a table could show what the
// material COST but never what it would SELL for — the margin the page exists to
// support. These pin the port against web's own rules.
// ═════════════════════════════════════════════════════════════════════════════
describe('material table sales columns', () => {
  const elements = MOBILE_ELEMENTS.map((e: any) => ({ key: e.key, label: e.label }));

  it('sales price per MT is the cost formula against the SALES price map', () => {
    // newTable.js:167-172 — identical to costPmt but reading salesPrices and its own
    // Ni percentage. Mobile aliases the same function rather than copying it.
    const row = makeMaterialRow({ ni: '10', cr: '20', mo: '0' });
    const salesPrices = { ni: '16000', cr: '2000' };
    // (10/100)*16000*1 + (20/100)*2000 = 1600 + 400
    expect(salesPerMT(row, elements, salesPrices, 1)).toBeCloseTo(2000, 6);
    // …and the Ni percentage scales ONLY nickel
    expect(salesPerMT(row, elements, salesPrices, 0.9)).toBeCloseTo(1600 * 0.9 + 400, 6);
    // identical to the cost helper fed the same map — that is the point of the alias
    expect(salesPerMT(row, elements, salesPrices, 0.9)).toBe(costPmt(row, elements, salesPrices, 0.9));
  });

  it('sales total converts the row weight to MT first', () => {
    // A kgs table would be 1000x out otherwise (newTable.js:187-191).
    const row = makeMaterialRow({ ni: '10', kgs: '1000' });
    const p = { ni: '16000' };
    expect(salesTotal(row, elements, p, 1, 'kgs')).toBeCloseTo(1600 * 1, 6); // 1000 kgs = 1 MT
    expect(salesTotal(row, elements, p, 1, 'mt')).toBeCloseTo(1600 * 1000, 6);
  });

  it('the sales gate ignores an Fe-only price but accepts a literal zero', () => {
    // Same rule as the cost gate (newTable.js:161-163): Fe is the derived remainder.
    expect(hasSalesPrices(elements, { fe: '500' })).toBe(false);
    expect(hasSalesPrices(elements, { ni: '0' })).toBe(true);
    expect(hasSalesPrices(elements, {})).toBe(false);
  });

  it('QUIRK: the Sales Total footer is a weighted AVERAGE, not a sum', () => {
    // footerVal has explicit branches for costPmt and costTotal but NONE for the
    // sales columns, so they fall through to the generic element branch at
    // newTable.js:296-301 — a weight-weighted average, no '$', blank at zero.
    // It reads oddly beside Cost Total (which IS a sum) and looks like a web
    // oversight, but it is what the web page prints. Pinned so nobody "fixes" it
    // into a number that matches neither app.
    const rows = [
      makeMaterialRow({ id: 'a', ni: '10', kgs: '1000' }),
      makeMaterialRow({ id: 'b', ni: '10', kgs: '3000' }),
    ];
    const p = { ni: '16000' };
    const totalW = totalWeight(rows);
    const valueOf = (r: any) => salesTotal(r, elements, p, 1, 'kgs');
    // per-row totals are 1600 and 4800; the SUM would be 6400
    expect(valueOf(rows[0])).toBeCloseTo(1600, 6);
    expect(valueOf(rows[1])).toBeCloseTo(4800, 6);
    // weighted average = (1000*1600 + 3000*4800) / 4000 = 4000 — deliberately NOT 6400
    expect(footerSalesCol(rows, valueOf, totalW)).toBeCloseTo(4000, 6);
    expect(footerSalesCol(rows, valueOf, totalW)).not.toBeCloseTo(6400, 6);
  });

  it('a zero-weight table gives a zero footer rather than dividing by zero', () => {
    expect(footerSalesCol([makeMaterialRow({ kgs: '0' })], () => 5, 0)).toBe(0);
  });
});

describe('live LME nickel seeding', () => {
  it('refreshes a price we wrote, and NEVER one the user typed', () => {
    // page.js:106-129. "Ours" means empty, or still equal to the last live value we
    // wrote. A negotiated price has to outlive the next tick — resetting it 60
    // seconds later would quietly wrong the margin.
    const typed = { id: 't1', prices: { ni: '15000' }, salesPrices: { ni: '15500' } };
    const ourOld = { id: 't2', prices: { ni: '16000' }, salesPrices: { ni: '16000' } };
    const blank = { id: 't3', prices: {}, salesPrices: {} };

    const out = seedLmeNickel([typed, ourOld, blank], '16670', '16000');
    expect(out[0].prices.ni).toBe('15000'); // typed — untouched
    expect(out[0].salesPrices.ni).toBe('15500'); // typed — untouched
    expect(out[1].prices.ni).toBe('16670'); // ours, stale — refreshed
    expect(out[1].salesPrices.ni).toBe('16670');
    expect(out[2].prices.ni).toBe('16670'); // blank — seeded
  });

  it('returns the SAME array reference when nothing changed', () => {
    // The poll fires on a timer with a fresh price object even when the rounded
    // value has not moved; a new array each time would re-render every table and
    // re-run the totals for nothing.
    const tables = [{ id: 't1', prices: { ni: '16670' }, salesPrices: { ni: '16670' } }];
    expect(seedLmeNickel(tables, '16670', '16670')).toBe(tables);
    expect(seedLmeNickel(tables, null as any, '16670')).toBe(tables);
  });

  it('seeds both bars independently', () => {
    const t = { id: 't1', prices: { ni: '9999' }, salesPrices: {} };
    const out = seedLmeNickel([t], '16670', null);
    expect(out[0].prices.ni).toBe('9999'); // typed, kept
    expect(out[0].salesPrices.ni).toBe('16670'); // blank, seeded
  });
});
