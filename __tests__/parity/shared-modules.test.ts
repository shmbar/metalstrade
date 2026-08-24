/**
 * PARITY SUITE — mobile/src/shared/* (Tier 1) + the shipmentStatus divergence (Tier 4).
 *
 * `mobile/src/shared/*` is not a "port": every file is a VERBATIM COPY of a web module, so the
 * financial math is provably the same code. This suite defends that claim on two independent axes:
 *
 *   AXIS 1 — file identity (Tier 1). Each mobile file must be byte-identical to its web twin
 *            (newline endings normalised, nothing else). A one-character edit on either side fails.
 *
 *   AXIS 2 — behaviour, asserted against WEB'S RULE. Identity alone is not enough: someone can
 *            copy a regression across both files and identity still passes. So every behavioural
 *            test does BOTH of the following:
 *              (a) runs the web export and the mobile export on the SAME input and demands the
 *                  same output, and
 *              (b) pins that output to a golden value derived by reading web's source, with a
 *                  `file:line` citation. (b) is what makes the test fail when the RULE changes.
 *
 * AXIS 3 — Tier 4: `shipmentStatus.js` is the one deliberate exception. React Native has no CSS
 *          custom properties, so the colour tokens became literals. The suite asserts the
 *          structure is identical, that ONLY colour values differ, and that the difference is
 *          confined to presentation (`lineStatus` still agrees across the two).
 *
 * Determinism: no `Date.now()`, no `Math.random()`, no argless `new Date()`. The clock is frozen
 * to FIXED_NOW throughout (several web helpers default `asOf = new Date()`).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT, expectWebUnchanged, repoFileText, webFnLine } from './_helpers/webSource';
import {
  FIXED_NOW,
  INV_TYPE,
  makeContract,
  makeCreditNote,
  makeFinalNote,
  makeFinalizedInvoice,
  makeInvoice,
  makePayment,
  makePoInvoice,
  makeProduct,
  makeSettings,
  makeStockLot,
  makeStockOutLot,
  scenario,
} from './_helpers/fixtures';

// Both sides are imported by RELATIVE path (never the `@shared` alias): the repo-root tsconfig
// excludes `mobile/`, so an alias import here would break `next build`'s type-check.
import * as webFinance from '../../utils/finance.js';
import * as mobFinance from '../../mobile/src/shared/finance.js';
import * as webPure from '../../utils/pureHelpers.js';
import * as mobPure from '../../mobile/src/shared/pureHelpers.js';
import * as webSplit from '../../utils/splitUtils.js';
import * as mobSplit from '../../mobile/src/shared/splitUtils.js';
import * as webSold from '../../app/(root)/contractsstatement/soldStatus.js';
import * as mobSold from '../../mobile/src/shared/soldStatus.js';
import * as webStorage from '../../app/(root)/storagecosts/storageUtils.js';
import * as mobStorage from '../../mobile/src/shared/storageUtils.js';
import * as webPrio from '../../utils/notificationPriority.js';
import * as mobPrio from '../../mobile/src/shared/notificationPriority.js';
import * as webRoute from '../../utils/notificationRouting.js';
import * as mobRoute from '../../mobile/src/shared/notificationRouting.js';
import * as webShip from '../../app/(root)/contractsstatement/shipmentStatus.js';
import * as mobShip from '../../mobile/src/shared/shipmentStatus.js';
import * as webFx from '../../utils/fxRates.js';
import * as mobFx from '../../mobile/src/shared/fxRates.js';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

/**
 * Runs the same input through the web export and the mobile export, asserts they agree, and hands
 * the (single, agreed) result back so the caller can pin it to web's documented rule.
 *
 * Using this everywhere means a behavioural test can never accidentally check only one side.
 */
const both = <T>(webFn: (...a: any[]) => T, mobFn: (...a: any[]) => T, ...args: any[]): T => {
  const w = webFn(...args);
  const m = mobFn(...args);
  // toStrictEqual, not toEqual: toEqual treats `{ a: 1 }` and `{ a: 1, b: undefined }` as equal,
  // so a mobile port that dropped a field to undefined would slip through.
  expect(m).toStrictEqual(w);
  return w;
};

// ─────────────────────────────────────────────────────────────────────────────
// TIER 1 — file identity
// ─────────────────────────────────────────────────────────────────────────────

/** Every shared module that must be a byte-for-byte copy of its web twin. */
const IDENTICAL_PAIRS: Array<[mobile: string, web: string]> = [
  ['mobile/src/shared/finance.js', 'utils/finance.js'],
  ['mobile/src/shared/pureHelpers.js', 'utils/pureHelpers.js'],
  ['mobile/src/shared/splitUtils.js', 'utils/splitUtils.js'],
  ['mobile/src/shared/storageUtils.js', 'app/(root)/storagecosts/storageUtils.js'],
  ['mobile/src/shared/soldStatus.js', 'app/(root)/contractsstatement/soldStatus.js'],
  ['mobile/src/shared/notificationPriority.js', 'utils/notificationPriority.js'],
  ['mobile/src/shared/notificationRouting.js', 'utils/notificationRouting.js'],
  ['mobile/src/shared/fxRates.js', 'utils/fxRates.js'],
  ['mobile/src/shared/languages.js', 'utils/languages.js'],
  ['mobile/src/shared/salesLink.js', 'utils/salesLink.js'],
];

/** The deliberate exception — see the Tier 4 block at the bottom of this file. */
const DIVERGENT_PAIRS: Array<[mobile: string, web: string]> = [
  ['mobile/src/shared/shipmentStatus.js', 'app/(root)/contractsstatement/shipmentStatus.js'],
];

describe('Tier 1 — mobile/src/shared is a verbatim copy of the web modules', () => {
  it.each(IDENTICAL_PAIRS)('%s is byte-identical to %s', (mobileRel, webRel) => {
    // repoFileText normalises CRLF -> LF and NOTHING else: a whitespace or comment edit on
    // either side is a real divergence and must fail here.
    expect(repoFileText(mobileRel)).toBe(repoFileText(webRel));
  });

  it('every .js in mobile/src/shared is registered as a parity pair (no unguarded copies)', () => {
    // Guards against the real failure mode: someone copies a tenth web module into shared/ and
    // nothing ever checks it again. Adding a file here forces adding it to a pair list.
    const onDisk = fs
      .readdirSync(path.join(REPO_ROOT, 'mobile', 'src', 'shared'))
      .filter((f) => f.endsWith('.js'))
      .sort();
    const registered = [...IDENTICAL_PAIRS, ...DIVERGENT_PAIRS].map(([m]) => path.basename(m)).sort();
    expect(onDisk).toEqual(registered);
  });

  it('shipmentStatus.js is the ONLY shared module allowed to differ', () => {
    // Stated as an inequality on purpose: if someone "fixes" the divergence by re-copying web's
    // CSS-variable version into mobile, this fails and the Tier 4 block below must be revisited.
    const [mobileRel, webRel] = DIVERGENT_PAIRS[0];
    expect(repoFileText(mobileRel)).not.toBe(repoFileText(webRel));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// finance.js
// ─────────────────────────────────────────────────────────────────────────────

describe('finance.num — junk coerces to 0 and a total can never be poisoned to NaN', () => {
  it('parses leading numerics, exactly as parseFloat does', () => {
    // utils/finance.js:36-39 — parseFloat, not Number: trailing junk is tolerated.
    expect(both(webFinance.num, mobFinance.num, '12.5')).toBe(12.5);
    expect(both(webFinance.num, mobFinance.num, '12.5 MT')).toBe(12.5);
    expect(both(webFinance.num, mobFinance.num, '1e3')).toBe(1000);
    expect(both(webFinance.num, mobFinance.num, -7)).toBe(-7);
  });

  it('unparseable, empty, null and undefined all become 0 — never NaN', () => {
    // utils/finance.js:38 — Number.isFinite(n) ? n : 0.
    for (const junk of ['', '   ', 'abc', null, undefined, {}, [], NaN, true]) {
      expect(both(webFinance.num, mobFinance.num, junk)).toBe(0);
    }
  });

  it('Infinity becomes 0 — this is the hardening a bare `parseFloat(v) || 0` does NOT give you', () => {
    // utils/finance.js:38. The trap being defended against: `parseFloat('Infinity') || 0` yields
    // Infinity, which blows up every downstream total. The finite guard is the whole point.
    // (Asserting `parseFloat('Infinity') || 0 === Infinity` here would be a statement about
    // JavaScript, not about this repo, and could never fail — so it is stated in prose instead.)
    expect(both(webFinance.num, mobFinance.num, 'Infinity')).toBe(0);
    expect(both(webFinance.num, mobFinance.num, -Infinity)).toBe(0);
    expect(both(webFinance.num, mobFinance.num, '1e400')).toBe(0); // overflows to Infinity on parse
  });
});

describe('finance.resolveCur — always returns the id form, from both the draft and finalized shapes', () => {
  it('a draft invoice stores the id string directly', () => {
    // utils/finance.js:46 — c === 'eu' ? 'eu' : 'us'.
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, makeInvoice())).toBe('us');
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, makeInvoice({ cur: 'eu' }))).toBe('eu');
  });

  it('a finalized invoice stores cur as an OBJECT and is matched case-insensitively on .cur', () => {
    // utils/finance.js:45 — String(c.cur||'').toUpperCase() === 'EUR' ? 'eu' : 'us'.
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, makeFinalizedInvoice())).toBe('us');
    expect(
      both(webFinance.resolveCur, mobFinance.resolveCur, makeFinalizedInvoice({ cur: { id: 'eu', cur: 'EUR' } }))
    ).toBe('eu');
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, { cur: { cur: 'eur' } })).toBe('eu');
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, { cur: { cur: null } })).toBe('us');
  });

  it('a TOP-LEVEL string is read as an id, so the string "EUR" resolves to us — not eu', () => {
    // utils/finance.js:46. Deliberately pinned: the ISO code is only understood in the OBJECT
    // shape. A caller that flattens `cur` to 'EUR' silently books the amount as USD.
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, { cur: 'EUR' })).toBe('us');
  });

  it('defaults to us for a missing entity or a missing cur', () => {
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, null)).toBe('us');
    expect(both(webFinance.resolveCur, mobFinance.resolveCur, {})).toBe('us');
  });
});

describe('finance.invoiceBalance — recomputed from payments; the stored debtBlnc is only a cache', () => {
  it('is totalAmount minus the sum of payments', () => {
    // utils/finance.js:50-54.
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, makeInvoice())).toBe(7000); // 12000 - 5000
  });

  it('ignores a stale stored debtBlnc that disagrees with the payment rows', () => {
    // utils/finance.js:52-54 ("stored debtBlnc is a cache"). The stored 999999 must NOT win.
    const stale = makeInvoice({ debtBlnc: 999999, balanceDue: 999999 });
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, stale)).toBe(7000);
  });

  it('is NOT clamped at zero — an overpayment reports a negative balance', () => {
    // utils/finance.js:54 is a bare subtraction; the sign carries information (client credit).
    const overpaid = makeInvoice({ totalAmount: 1000, payments: [makePayment({ pmnt: '1500' })] });
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, overpaid)).toBe(-500);
  });

  it('survives junk in a payment row and a missing payments array', () => {
    // utils/finance.js:50 — num() per row, and `(inv?.payments || [])`.
    const junk = makeInvoice({ payments: [makePayment({ pmnt: 'n/a' }), makePayment({ pmnt: '2000' })] });
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, junk)).toBe(10000);
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, makeInvoice({ payments: undefined }))).toBe(12000);
  });
});

describe('finance.isIssued — a doc counts unless it is a draft or canceled', () => {
  it('an ordinary invoice is issued', () => {
    expect(both(webFinance.isIssued, mobFinance.isIssued, makeInvoice())).toBe(true);
    expect(both(webFinance.isIssued, mobFinance.isIssued, {})).toBe(true);
  });

  it('draft === true and any truthy canceled both exclude it', () => {
    // utils/finance.js:57 — inv?.draft !== true && !inv?.canceled.
    expect(both(webFinance.isIssued, mobFinance.isIssued, makeInvoice({ draft: true }))).toBe(false);
    expect(both(webFinance.isIssued, mobFinance.isIssued, makeInvoice({ canceled: true }))).toBe(false);
    expect(both(webFinance.isIssued, mobFinance.isIssued, makeInvoice({ canceled: 'yes' }))).toBe(false);
  });

  it('the draft test is STRICT, so the string "true" still counts as issued', () => {
    // utils/finance.js:57 uses !== true, not a truthiness test (DECISION #2 in that file).
    // Pinned because a Firestore doc written by an older screen can hold the string.
    expect(both(webFinance.isIssued, mobFinance.isIssued, makeInvoice({ draft: 'true' }))).toBe(true);
  });
});

describe('finance.isFinalized — the Finalizing flag OR a Final Note', () => {
  it('the shipData.fnlzing sentinel finalizes the shipment', () => {
    // utils/finance.js:62 — shipData?.fnlzing === FINALIZED_FLAG ('4568', line 14).
    expect(both(webFinance.isFinalized, mobFinance.isFinalized, makeFinalizedInvoice())).toBe(true);
    expect(webFinance.FINALIZED_FLAG).toBe('4568');
    expect(mobFinance.FINALIZED_FLAG).toBe(webFinance.FINALIZED_FLAG);
  });

  it('issuing a Final Note finalizes it even when the manual flag was never switched', () => {
    // utils/finance.js:61-62 — the "0018FN showed Final: No" client bug. Both shapes of invType.
    const fnById = makeFinalNote(); // invType '3333', shipData.fnlzing ''
    expect(fnById.shipData.fnlzing).toBe('');
    expect(both(webFinance.isFinalized, mobFinance.isFinalized, fnById)).toBe(true);
    expect(
      both(webFinance.isFinalized, mobFinance.isFinalized, makeInvoice({ invType: INV_TYPE.finalLabel }))
    ).toBe(true);
  });

  it('a plain invoice and a credit note are NOT finalized', () => {
    expect(both(webFinance.isFinalized, mobFinance.isFinalized, makeInvoice())).toBe(false);
    expect(both(webFinance.isFinalized, mobFinance.isFinalized, makeCreditNote())).toBe(false);
  });
});

describe('finance.groupInvoices — a credit/final note SUPERSEDES the original it shares a number with', () => {
  it("web's groupInvoices has not drifted", () => {
    // Tier 1 file identity already proves mobile === web character-for-character. This alarm is
    // the second axis: it fires when WEB changes the supersede rule, i.e. when the goldens below
    // stop describing the product even though both files still match each other.
    expectWebUnchanged('utils/finance.js', 'groupInvoices', '9e2ee7aa676b');
  });

  it('a lone invoice passes through untouched', () => {
    const { invoices } = scenario('singleInvoice');
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, invoices);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(invoices[0]); // utils/finance.js:112 returns the group as-is
  });

  it('the credit note wins outright: the total becomes the NOTE amount, not original + note', () => {
    // utils/finance.js:116-119 — kept = only the max-rank docs, and totalAmount sums KEPT docs
    // only. So 12000 credited by -2000 leaves -2000, not 10000. Pinned because it is the single
    // most surprising line in the module.
    const { invoices } = scenario('invoicePlusCreditNote');
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, invoices);
    expect(out).toHaveLength(1);
    expect(out[0].invType).toBe(INV_TYPE.creditId);
    expect(out[0].totalAmount).toBe(-2000);
  });

  it('payments are combined across ALL docs in the group, including the superseded original', () => {
    // utils/finance.js:117-119 — allPayments = group.flatMap, debtBlnc = totalAmount - paid.
    const { invoices } = scenario('invoicePlusCreditNote');
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, invoices);
    expect(out[0].payments).toHaveLength(1); // the original's 5000 survives the supersede
    expect(out[0].debtBlnc).toBe(-7000); // -2000 - 5000
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, out[0])).toBe(out[0].debtBlnc);
  });

  it('the HIGHEST rank wins when an original, a credit note and a final note share a number', () => {
    // utils/finance.js:27-31 rank 1111/Invoice=1, 2222/Credit Note=2, 3333/Final Note=3; line 113.
    const { invoices } = scenario('invoicePlusCreditPlusFinal');
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, invoices);
    expect(out).toHaveLength(1);
    expect(out[0].invType).toBe(INV_TYPE.finalId);
    expect(out[0].totalAmount).toBe(11500);
    expect(out[0].debtBlnc).toBe(6500); // 11500 - 5000 carried over
  });

  it('ranks the label shape identically to the id shape', () => {
    // utils/finance.js:28-30 maps 'Invoice'/'Credit Note'/'Final Note' onto the same ranks, so a
    // finalized doc and a draft doc supersede each other correctly.
    const orig = makeFinalizedInvoice({ id: 'f-o', invoice: 7, totalAmount: 12000, payments: [makePayment()] });
    const note = makeFinalizedInvoice({ id: 'f-n', invoice: 7, invType: INV_TYPE.finalLabel, totalAmount: 9000, payments: [] });
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, [orig, note]);
    expect(out).toHaveLength(1);
    expect(out[0].totalAmount).toBe(9000);
  });

  it('two docs of the SAME rank are not an original+note pair, so BOTH survive', () => {
    // utils/finance.js:115 — new Set(ranks).size === 1 returns the group untouched. Anything that
    // assumes a group always collapses to one doc double-counts or drops money here.
    const { invoices } = scenario('twoOriginalsSameNumber');
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, invoices);
    expect(out).toHaveLength(2);
    expect(out.reduce((s: number, i: any) => s + i.totalAmount, 0)).toBe(15000);
  });

  it('keeps docs numbered 0 but drops docs with no invoice number, and tolerates a non-array', () => {
    // utils/finance.js:105 (Array.isArray guard) and :108 (inv.invoice == null, loose — so 0 stays).
    expect(both(webFinance.groupInvoices, mobFinance.groupInvoices, null)).toEqual([]);
    expect(both(webFinance.groupInvoices, mobFinance.groupInvoices, undefined)).toEqual([]);
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, [
      makeInvoice({ id: 'zero', invoice: 0 }),
      makeInvoice({ id: 'none', invoice: null }),
      makeInvoice({ id: 'undef', invoice: undefined }),
    ]);
    expect(out.map((i: any) => i.id)).toEqual(['zero']);
  });

  it('groups on the STRING form of the number, so 1001 and "1001" are one invoice', () => {
    // utils/finance.js:109 — String(inv.invoice) is the key.
    const out = both(webFinance.groupInvoices, mobFinance.groupInvoices, [
      makeInvoice({ id: 'num', invoice: 1001 }),
      makeCreditNote({ id: 'str', invoice: '1001' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('str');
  });
});

describe('finance.contractPurchaseValue — Σ poInvoices.pmnt, kept per currency and converted to base', () => {
  it('a USD contract reports the same figure in byCur and in base', () => {
    // utils/finance.js:182-186.
    const c = makeContract();
    const out = both(webFinance.contractPurchaseValue, mobFinance.contractPurchaseValue, c);
    expect(out).toEqual({ byCur: { us: 10000 }, base: 10000 });
  });

  it('a EUR contract keeps EUR in byCur and multiplies by the contract rate for the USD base', () => {
    // utils/finance.js:185 -> fx() at :87-92: base 'us' => amount * rate.
    const c = makeContract({ cur: 'eu', euroToUSD: 1.08 });
    const out = both(webFinance.contractPurchaseValue, mobFinance.contractPurchaseValue, c);
    expect(out.byCur).toEqual({ eu: 10000 });
    expect(out.base).toBeCloseTo(10800, 6);
  });

  it('sums every purchase invoice on the contract, junk rows included as 0', () => {
    const c = makeContract({
      poInvoices: [makePoInvoice(), makePoInvoice({ id: 'po-2', pmnt: '2500' }), makePoInvoice({ id: 'po-3', pmnt: '' })],
    });
    const out = both(webFinance.contractPurchaseValue, mobFinance.contractPurchaseValue, c);
    expect(out.byCur.us).toBe(12500);
  });

  it('a missing or zero FX rate falls back to 1:1 rather than producing NaN or 0', () => {
    // utils/finance.js:91 — (r > 0 ? r : 1). A contract saved before the rate field existed must
    // still show its face value, never a hole in the report.
    for (const rate of [undefined, 0, '', 'abc']) {
      const out = both(webFinance.contractPurchaseValue, mobFinance.contractPurchaseValue, makeContract({ cur: 'eu', euroToUSD: rate }));
      expect(out.base).toBe(10000);
    }
  });

  it('converting INTO the eu base divides by the rate instead of multiplying', () => {
    // utils/finance.js:91 — base === 'us' ? a * r : a / r.
    const out = both(webFinance.contractPurchaseValue, mobFinance.contractPurchaseValue, makeContract({ euroToUSD: 1.25 }), { base: 'eu' });
    expect(out.byCur).toEqual({ us: 10000 });
    expect(out.base).toBeCloseTo(8000, 6);
  });

  it('a contract with no purchase invoices is 0, not NaN', () => {
    const out = both(webFinance.contractPurchaseValue, mobFinance.contractPurchaseValue, makeContract({ poInvoices: undefined }));
    expect(out).toEqual({ byCur: { us: 0 }, base: 0 });
  });
});

describe('finance.toMT — quantity is converted through the contract\'s own unit setting', () => {
  it('exposes the unit factors the Inventory tab uses', () => {
    // utils/finance.js:22 — { MT: 1, KGS: 0.001, LB: 0.0005 }.
    expect(webFinance.UNIT_TO_MT).toEqual({ MT: 1, KGS: 0.001, LB: 0.0005 });
    expect(mobFinance.UNIT_TO_MT).toEqual(webFinance.UNIT_TO_MT);
  });

  it('resolves the unit label through settings.Quantity, not off the contract', () => {
    // utils/finance.js:95-96 — settings.Quantity.Quantity.find(q => q.id === contract.qTypeTable).
    const s = makeSettings();
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract(), s)).toBe('MT');
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract({ qTypeTable: 'q-kgs' }), s)).toBe('KGS');
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract({ qTypeTable: 'q-lb' }), s)).toBe('LB');
  });

  it('12000 on a KGS contract is 12 MT', () => {
    // utils/finance.js:98. Uses the KGS scenario so the fixture and the rule stay in step.
    const { contracts, settings } = scenario('kgsContractImportRows');
    const c = contracts[0];
    expect(c.qTypeTable).toBe('q-kgs');
    expect(both(webFinance.toMT, mobFinance.toMT, c.productsData[0].qnty, c, settings)).toBe(12);
    expect(both(webFinance.toMT, mobFinance.toMT, '2000', c, settings)).toBe(2);
  });

  it('an LB contract converts at 0.0005 and an MT contract passes through', () => {
    const s = makeSettings();
    expect(both(webFinance.toMT, mobFinance.toMT, '2000', makeContract({ qTypeTable: 'q-lb' }), s)).toBe(1);
    expect(both(webFinance.toMT, mobFinance.toMT, '10', makeContract(), s)).toBe(10);
  });

  it('an unknown or missing unit id falls back to MT rather than zeroing the tonnage', () => {
    // utils/finance.js:96 — `|| 'MT'`. Dropping to 0 would silently delete inventory from a report.
    //
    // The unitOf assertions are the load-bearing ones. Asserting only toMT() === 10 does NOT pin
    // this rule: with the `|| 'MT'` fallback deleted, unitOf returns undefined, toMT's own
    // `?? 1` catches it and the answer is still 10. Both fallbacks must be pinned separately.
    const s = makeSettings();
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract({ qTypeTable: 'q-bogus' }), s)).toBe('MT');
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract({ qTypeTable: undefined }), s)).toBe('MT');
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract(), undefined)).toBe('MT');
    expect(both(webFinance.unitOf, mobFinance.unitOf, undefined, undefined)).toBe('MT');
    expect(both(webFinance.toMT, mobFinance.toMT, '10', makeContract({ qTypeTable: 'q-bogus' }), s)).toBe(10);
    expect(both(webFinance.toMT, mobFinance.toMT, '10', makeContract({ qTypeTable: undefined }), s)).toBe(10);
    expect(both(webFinance.toMT, mobFinance.toMT, '10', makeContract(), undefined)).toBe(10);
  });

  it("a unit LABEL outside the factor table converts 1:1 — toMT's own `?? 1` guard", () => {
    // utils/finance.js:98 — `UNIT_TO_MT[unitOf(...)] ?? 1`. Reachable whenever the account has a
    // Quantity row whose label is not MT/KGS/LB (e.g. 'TONNES', 'ST'). `?? 0` there would report
    // every such contract as 0 MT — inventory silently vanishing from the Stocks and P&L rollups.
    const s = makeSettings({ Quantity: { Quantity: [{ id: 'q-ton', qTypeTable: 'TONNES' }] } });
    expect(both(webFinance.unitOf, mobFinance.unitOf, makeContract({ qTypeTable: 'q-ton' }), s)).toBe('TONNES');
    expect(webFinance.UNIT_TO_MT).not.toHaveProperty('TONNES'); // the branch really is unmapped
    expect(both(webFinance.toMT, mobFinance.toMT, '10', makeContract({ qTypeTable: 'q-ton' }), s)).toBe(10);
  });

  it('junk quantity yields 0 MT, never NaN', () => {
    expect(both(webFinance.toMT, mobFinance.toMT, 'n/a', makeContract(), makeSettings())).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// finance.js — the date-driven and collection-level exports.
//
// These were the suite's biggest hole: `receivables`, `agingBuckets`, `invoiceRevenue`,
// `isOverdue`, `effectiveDueDate` and `pnl` are the money functions the dashboard, cashflow
// and alert screens actually read, and NOTHING here exercised them. Tier 1 identity would
// still catch a mobile-only edit, but a rule change made on web and re-copied to mobile (the
// normal way these files are maintained) would have sailed through — which is exactly what
// axis 2 exists to prevent. Every golden below is derived from web's source, with a citation.
//
// The clock is frozen to FIXED_NOW (2026-08-07T12:00:00Z) by the beforeEach at the top of the
// file — `isOverdue` and `agingBuckets` both default `asOf = new Date()` (finance.js:77, :160).
// ─────────────────────────────────────────────────────────────────────────────

describe('finance.invoicePaid / isFinalNote — the two primitives the aggregates are built on', () => {
  it('sums every payment row and tolerates junk and a missing array', () => {
    // utils/finance.js:50 — reduce over num(p?.pmnt).
    expect(both(webFinance.invoicePaid, mobFinance.invoicePaid, makeInvoice())).toBe(5000);
    expect(
      both(webFinance.invoicePaid, mobFinance.invoicePaid, makeInvoice({
        payments: [makePayment(), makePayment({ pmnt: '2500' }), makePayment({ pmnt: 'n/a' }), null],
      }))
    ).toBe(7500);
    expect(both(webFinance.invoicePaid, mobFinance.invoicePaid, makeInvoice({ payments: undefined }))).toBe(0);
    expect(both(webFinance.invoicePaid, mobFinance.invoicePaid, undefined)).toBe(0);
  });

  it('recognises a Final Note in BOTH invType shapes, and nothing else', () => {
    // utils/finance.js:61 — '3333' (draft id) or 'Final Note' (finalized label). A doc written by
    // the finalize flow carries the label; one written by the draft screen carries the id.
    expect(both(webFinance.isFinalNote, mobFinance.isFinalNote, makeFinalNote())).toBe(true);
    expect(both(webFinance.isFinalNote, mobFinance.isFinalNote, { invType: INV_TYPE.finalLabel })).toBe(true);
    for (const inv of [makeInvoice(), makeCreditNote(), makeFinalizedInvoice(), {}, undefined, { invType: 3333 }]) {
      expect(both(webFinance.isFinalNote, mobFinance.isFinalNote, inv)).toBe(false); // strict ===
    }
  });
});

describe('finance.fx — the NaN-safe converter every currency total runs through', () => {
  it('leaves an amount already in the base currency alone', () => {
    // utils/finance.js:89 — resolveCur({ cur }) === base short-circuits before touching the rate.
    expect(both(webFinance.fx, mobFinance.fx, 100, 'us', 1.08, 'us')).toBe(100);
    expect(both(webFinance.fx, mobFinance.fx, 100, 'eu', 1.08, 'eu')).toBe(100);
  });

  it('multiplies into a USD base and divides into a EUR base', () => {
    // utils/finance.js:91 — base === 'us' ? a * r : a / r.
    expect(both(webFinance.fx, mobFinance.fx, 100, 'eu', 1.08, 'us')).toBeCloseTo(108, 9);
    expect(both(webFinance.fx, mobFinance.fx, 108, 'us', 1.08, 'eu')).toBeCloseTo(100, 9);
  });

  it('defaults the base to us, and a bad rate to 1:1 rather than NaN or 0', () => {
    // utils/finance.js:87 (`base = 'us'`) and :91 (`r > 0 ? r : 1`).
    expect(both(webFinance.fx, mobFinance.fx, 100, 'eu', 1.08)).toBeCloseTo(108, 9);
    for (const rate of [undefined, null, 0, -1, '', 'abc', NaN]) {
      expect(both(webFinance.fx, mobFinance.fx, 100, 'eu', rate, 'us')).toBe(100);
      expect(both(webFinance.fx, mobFinance.fx, 100, 'eu', rate, 'eu')).toBe(100);
    }
    expect(both(webFinance.fx, mobFinance.fx, 'junk', 'eu', 1.08, 'us')).toBe(0);
  });
});

describe('finance.effectiveDueDate — an explicit due date, else invoice date + the term', () => {
  it('exposes a 30-day default term', () => {
    // utils/finance.js:19 — DEFAULT_TERM_DAYS = 30. Pinned as a literal: changing it silently
    // moves every invoice's overdue date, and nothing else in the app re-states the number.
    expect(webFinance.DEFAULT_TERM_DAYS).toBe(30);
    expect(mobFinance.DEFAULT_TERM_DAYS).toBe(30);
  });

  it('the explicit delivery/due date WINS over the derived one', () => {
    // utils/finance.js:67-68. The fixture's delDate (2026-05-10) is deliberately replaced here:
    // 2026-04-10 + 30 days IS 2026-05-10, so the default fixture cannot tell the branches apart.
    const inv = makeInvoice({ delDate: { startDate: '2026-07-01', endDate: '2026-07-01' } });
    expect(both(webFinance.effectiveDueDate, mobFinance.effectiveDueDate, inv)).toBe('2026-07-01');
  });

  it('falls back to invoice date + DEFAULT_TERM_DAYS when no due date was entered', () => {
    // utils/finance.js:69-73 — date 2026-04-10 + 30d.
    const noDue = makeInvoice({ delDate: undefined });
    expect(both(webFinance.effectiveDueDate, mobFinance.effectiveDueDate, noDue)).toBe('2026-05-10');
    expect(both(webFinance.effectiveDueDate, mobFinance.effectiveDueDate, noDue, 60)).toBe('2026-06-09');
    expect(both(webFinance.effectiveDueDate, mobFinance.effectiveDueDate, noDue, 0)).toBe('2026-04-10');
  });

  it('is null when there is no date to work from at all', () => {
    // utils/finance.js:70 — no invoice date means no due date can be invented.
    expect(both(webFinance.effectiveDueDate, mobFinance.effectiveDueDate, { invoice: 1 })).toBe(null);
    expect(both(webFinance.effectiveDueDate, mobFinance.effectiveDueDate, undefined)).toBe(null);
  });
});

describe('finance.isOverdue — issued, still owing, and past the effective due date', () => {
  it('a genuinely late unpaid invoice is overdue as of the frozen clock', () => {
    // utils/finance.js:77-81. Due 2026-05-10, now 2026-08-07, balance 7000.
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, makeInvoice())).toBe(true);
  });

  it('an invoice whose due date is still in the future is not overdue', () => {
    // utils/finance.js:80 — new Date(due) < asOf. 2026-12-01 is after FIXED_NOW.
    const future = makeInvoice({ delDate: { startDate: '2026-12-01', endDate: '2026-12-01' } });
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, future)).toBe(false);
  });

  it('a settled invoice is never overdue, and the cut-off is one cent — not zero', () => {
    // utils/finance.js:78 — `invoiceBalance(inv) <= 0.01`, so a rounding-dust residue does not
    // keep an otherwise-paid invoice screaming in the alert feed.
    const paid = makeInvoice({ payments: [makePayment({ pmnt: '12000' })] });
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, paid)).toBe(false);
    const dust = makeInvoice({ payments: [makePayment({ pmnt: '11999.995' })] }); // balance 0.005
    expect(both(webFinance.invoiceBalance, mobFinance.invoiceBalance, dust)).toBeCloseTo(0.005, 9);
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, dust)).toBe(false);
    const owed = makeInvoice({ payments: [makePayment({ pmnt: '11999.9' })] }); // balance 0.1 > 0.01
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, owed)).toBe(true);
  });

  it('a draft or canceled invoice is never overdue however late it is', () => {
    // utils/finance.js:78 — the isIssued gate comes first.
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, makeInvoice({ draft: true }))).toBe(false);
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, makeInvoice({ canceled: true }))).toBe(false);
  });

  it('honours an explicit asOf and term, so a report can be run "as of" any date', () => {
    // utils/finance.js:77 — both are parameters; only their DEFAULTS read the clock.
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, makeInvoice(), new Date('2026-05-09T00:00:00Z'))).toBe(false);
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, makeInvoice(), new Date('2026-05-11T00:00:00Z'))).toBe(true);
    // With no due date at all: invoice date 2026-04-10, a 200-day term pushes it past FIXED_NOW.
    const noDue = makeInvoice({ delDate: undefined });
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, noDue, FIXED_NOW, 200)).toBe(false);
    expect(both(webFinance.isOverdue, mobFinance.isOverdue, noDue, FIXED_NOW, 30)).toBe(true);
  });
});

describe('finance.invoiceRevenue — deduped, issued-only, per currency plus a base total', () => {
  it('sums issued invoices per currency and converts the base total at each doc rate', () => {
    // utils/finance.js:128-134 — byCur is RAW per currency, base is fx()-converted.
    const list = [
      makeInvoice(),
      makeInvoice({ id: 'inv-2', invoice: 1002, totalAmount: 5000 }),
      makeInvoice({ id: 'inv-3', invoice: 1003, cur: 'eu', totalAmount: 10000, euroToUSD: 1.08 }),
    ];
    const out = both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, list);
    expect(out.byCur).toEqual({ us: 17000, eu: 10000 });
    expect(out.base).toBeCloseTo(17000 + 10800, 6);
  });

  it('EXCLUDES drafts and canceled docs — this is the isIssued filter, not a sum of everything', () => {
    // utils/finance.js:128 — `.filter(isIssued)`. Counting a draft inflates reported revenue.
    const list = [
      makeInvoice(),
      makeInvoice({ id: 'd', invoice: 2001, totalAmount: 99999, draft: true }),
      makeInvoice({ id: 'c', invoice: 2002, totalAmount: 88888, canceled: true }),
    ];
    expect(both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, list).byCur).toEqual({ us: 12000 });
  });

  it('dedupes through groupInvoices first, so a credited invoice reports the NOTE amount', () => {
    // utils/finance.js:128 — groupInvoices(list) runs before the filter. 12000 credited by -2000
    // is revenue of -2000, not 10000 and not 12000.
    const { invoices } = scenario('invoicePlusCreditNote');
    expect(both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, invoices).byCur).toEqual({ us: -2000 });
  });

  it('honours an eu base and a rateOf override, and survives an empty list', () => {
    // utils/finance.js:125, :132 — `rateOf ? rateOf(inv) : inv.euroToUSD`.
    const eur = [makeInvoice({ cur: 'eu', totalAmount: 10000 })];
    expect(both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, eur, { rateOf: () => 1.25 }).base).toBeCloseTo(12500, 6);
    expect(both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, [makeInvoice({ totalAmount: 10000 })], { base: 'eu' }).base)
      .toBeCloseTo(10000, 6); // us -> eu at the fixture's absent rate: 1:1, never NaN
    expect(both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, [])).toEqual({ byCur: {}, base: 0 });
    expect(both(webFinance.invoiceRevenue, mobFinance.invoiceRevenue, null)).toEqual({ byCur: {}, base: 0 });
  });
});

describe('finance.receivables — outstanding money, kept PER CURRENCY and split two ways', () => {
  // Currencies are never summed together (finance.js:137-138): a EUR balance and a USD balance
  // are different money. Each currency slot is split BOTH by due-ness and by finalized-ness, so
  // the same balance appears in exactly one of due/balance AND one of finalized/provisional.
  const overdueUsd = makeInvoice(); // due 2026-05-10, balance 7000, provisional
  const futureUsd = makeInvoice({ id: 'r2', invoice: 1002, delDate: { startDate: '2026-12-01', endDate: '2026-12-01' } });
  const finalizedEur = makeFinalizedInvoice({
    id: 'r3', invoice: 1003, cur: { id: 'eu', cur: 'EUR' }, totalAmount: 9000,
    payments: [makePayment({ pmnt: '1000' })], delDate: { startDate: '2026-12-01', endDate: '2026-12-01' },
  });

  it('splits due vs not-yet-due by the effective due date', () => {
    // utils/finance.js:149-150.
    const { byCur } = both(webFinance.receivables, mobFinance.receivables, [overdueUsd, futureUsd, finalizedEur]);
    expect(byCur.us.due).toBe(7000);
    expect(byCur.us.dueCount).toBe(1);
    expect(byCur.us.balance).toBe(7000);
    expect(byCur.us.balanceCount).toBe(1);
  });

  it('splits finalized vs provisional over the SAME balances, not as a second bucket', () => {
    // utils/finance.js:151-152 — an unconditional second classification of the same `bal`.
    // Dropping it would leave the Cashflow page unable to show what is contractually settled.
    const { byCur } = both(webFinance.receivables, mobFinance.receivables, [overdueUsd, futureUsd, finalizedEur]);
    expect(byCur.us.provisional).toBe(14000); // both USD docs are provisional
    expect(byCur.us.finalized).toBe(0);
    expect(byCur.us.provisionalCount).toBe(2);
    expect(byCur.eu.finalized).toBe(8000); // 9000 - 1000, and shipData.fnlzing === '4568'
    expect(byCur.eu.provisional).toBe(0);
    expect(byCur.eu.due + byCur.eu.balance).toBe(8000);
  });

  it('never merges currencies into one figure', () => {
    // utils/finance.js:140-144 — a slot per resolveCur(inv).
    const { byCur } = both(webFinance.receivables, mobFinance.receivables, [overdueUsd, futureUsd, finalizedEur]);
    expect(Object.keys(byCur).sort()).toEqual(['eu', 'us']);
    expect(byCur.us.due + byCur.us.balance).toBe(14000);
  });

  it('omits settled invoices entirely — a currency with nothing owing gets no slot at all', () => {
    // utils/finance.js:147 — `if (bal <= 0.01) return;` happens BEFORE slot() is called, so a
    // fully-paid book returns {} rather than a row of zeroes.
    const settled = makeInvoice({ payments: [makePayment({ pmnt: '12000' })] });
    expect(both(webFinance.receivables, mobFinance.receivables, [settled])).toEqual({ byCur: {} });
    expect(both(webFinance.receivables, mobFinance.receivables, [])).toEqual({ byCur: {} });
  });

  it('excludes drafts and canceled docs', () => {
    // utils/finance.js:145 — the same isIssued gate as invoiceRevenue.
    const list = [makeInvoice({ id: 'd', draft: true }), makeInvoice({ id: 'c', invoice: 1002, canceled: true })];
    expect(both(webFinance.receivables, mobFinance.receivables, list)).toEqual({ byCur: {} });
  });

  it('honours an explicit asOf, so nothing depends on the wall clock', () => {
    // utils/finance.js:139 — asOf is a parameter; only its default reads the clock.
    const early = both(webFinance.receivables, mobFinance.receivables, [overdueUsd], { asOf: new Date('2026-05-01T00:00:00Z') });
    expect(early.byCur.us).toMatchObject({ due: 0, balance: 7000, dueCount: 0, balanceCount: 1 });
  });
});

describe('finance.agingBuckets — standard AR aging by INVOICE date, no due date required', () => {
  const at = (invoice: number, date: string, total: number) =>
    makeInvoice({ id: `a-${invoice}`, invoice, date, dateRange: { startDate: date, endDate: date }, totalAmount: total, payments: [] });

  it('labels the four buckets in order', () => {
    // utils/finance.js:161-166.
    const out = both(webFinance.agingBuckets, mobFinance.agingBuckets, []);
    expect(out.map((b: any) => b.label)).toEqual(['0–30', '31–60', '61–90', '90+']);
    expect(out.map((b: any) => b.maxDays)).toEqual([30, 60, 90, Infinity]);
    expect(out.every((b: any) => b.count === 0)).toBe(true);
    expect(out).toHaveLength(4); // `.every` above is only meaningful because the array is non-empty
  });

  it('buckets each balance by days since the invoice date, against the frozen clock', () => {
    // utils/finance.js:172-173 — ageDays = floor((asOf - invoiceDate)/86400000), first bucket
    // whose maxDays it does not exceed. asOf is FIXED_NOW = 2026-08-07T12:00:00Z.
    const out = both(webFinance.agingBuckets, mobFinance.agingBuckets, [
      at(1, '2026-08-01', 100), // 6 days
      at(2, '2026-07-01', 200), // 37 days
      at(3, '2026-06-01', 400), // 67 days
      at(4, '2026-01-01', 800), // 218 days
    ]);
    expect(out.map((b: any) => b.byCur.us)).toEqual([100, 200, 400, 800]);
    expect(out.map((b: any) => b.count)).toEqual([1, 1, 1, 1]);
  });

  it('puts the 30/31-day boundary exactly where web puts it', () => {
    // utils/finance.js:173 — `ageDays <= x.maxDays`. 2026-07-08 is 30 days before FIXED_NOW and
    // 2026-07-07 is 31, so these two rows must land in DIFFERENT buckets.
    const out = both(webFinance.agingBuckets, mobFinance.agingBuckets, [at(1, '2026-07-08', 100), at(2, '2026-07-07', 200)]);
    expect(out[0].byCur.us).toBe(100);
    expect(out[1].byCur.us).toBe(200);
  });

  it('keeps currencies apart inside a bucket and ages the OUTSTANDING balance, not the invoice', () => {
    // utils/finance.js:168-175 — bal = invoiceBalance(inv), and b.byCur is per currency.
    const part = makeInvoice({ date: '2026-08-01', dateRange: { startDate: '2026-08-01', endDate: '2026-08-01' } }); // 12000 - 5000
    const eur = at(2, '2026-08-01', 500);
    const out = both(webFinance.agingBuckets, mobFinance.agingBuckets, [part, { ...eur, cur: 'eu' }]);
    expect(out[0].byCur).toEqual({ us: 7000, eu: 500 });
  });

  it('skips settled invoices and rows with no usable date rather than guessing one', () => {
    // utils/finance.js:169 (bal <= 0.01) and :170-171 (`if (!invDate) return;`). Substituting
    // today for a missing date would park real debt in the 0–30 bucket forever.
    const settled = makeInvoice({ payments: [makePayment({ pmnt: '12000' })] });
    const undated = makeInvoice({ id: 'u', invoice: 9, date: '', dateRange: undefined });
    const out = both(webFinance.agingBuckets, mobFinance.agingBuckets, [settled, undated]);
    expect(out.map((b: any) => b.count)).toEqual([0, 0, 0, 0]);
    expect(out.map((b: any) => b.byCur)).toEqual([{}, {}, {}, {}]);
  });
});

describe('finance.pnl — nets pre-aggregated totals and stays basis-agnostic', () => {
  it('profit is revenue MINUS cost MINUS expense', () => {
    // utils/finance.js:191-193.
    expect(both(webFinance.pnl, mobFinance.pnl, { revenue: 100000, cost: 60000, expense: 12000 }))
      .toEqual({ revenue: 100000, cost: 60000, expense: 12000, profit: 28000 });
  });

  it('coerces junk to 0 and defaults every field, so a partial call is still a number', () => {
    // utils/finance.js:191-192 — num() on each, and `= {}` on the argument.
    expect(both(webFinance.pnl, mobFinance.pnl, { revenue: '5000', cost: 'n/a' }))
      .toEqual({ revenue: 5000, cost: 0, expense: 0, profit: 5000 });
    expect(both(webFinance.pnl, mobFinance.pnl)).toEqual({ revenue: 0, cost: 0, expense: 0, profit: 0 });
  });

  it('reports a loss as a negative number rather than clamping it at zero', () => {
    expect(both(webFinance.pnl, mobFinance.pnl, { revenue: 100, cost: 400 }).profit).toBe(-300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pureHelpers.js — date resolution + the OTHER grouping helper
// ─────────────────────────────────────────────────────────────────────────────

describe('pureHelpers.toIsoDate — the two stored date shapes normalise to one', () => {
  it('passes an ISO string through, trimming any time component', () => {
    // utils/pureHelpers.js:16 — `.slice(0, 10)`.
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '2026-05-14')).toBe('2026-05-14');
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '2026-05-14T09:30:00Z')).toBe('2026-05-14');
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '  2026-05-14  ')).toBe('2026-05-14');
  });

  it('converts the finalized "dd-mmm-yyyy" shape, zero-padding a single-digit day', () => {
    // utils/pureHelpers.js:17-21 — MONTH_MAP is case-insensitive and the day is padStart'ed.
    // Without the pad this yields '2026-01-4', which every later new Date() then misreads.
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '14-May-2026')).toBe('2026-05-14');
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '14-may-2026')).toBe('2026-05-14');
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '4-Jan-2026')).toBe('2026-01-04');
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '31-Dec-2025')).toBe('2025-12-31');
  });

  it('returns null — never a bogus date — for anything unparseable or non-string', () => {
    // utils/pureHelpers.js:13-15, :24. A Firestore Timestamp or a number must not become a date.
    for (const bad of ['', '   ', 'zzz', 'not a date', null, undefined, 20260101, {}, { seconds: 1 }]) {
      expect(both(webPure.toIsoDate, mobPure.toIsoDate, bad)).toBe(null);
    }
    expect(both(webPure.toIsoDate, mobPure.toIsoDate, '14-Foo-2026')).toBe(null); // unknown month
  });
});

describe('pureHelpers.resolveDueDate / resolveInvoiceDate — draft object vs finalized string', () => {
  it('reads the due date out of the draft object shape and the finalized string shape', () => {
    // utils/pureHelpers.js:32-36 — delDate is { startDate, endDate } on drafts, 'dd-mmm-yyyy' once
    // finalized; startDate wins over endDate.
    expect(both(webPure.resolveDueDate, mobPure.resolveDueDate, makeInvoice())).toBe('2026-05-10');
    expect(both(webPure.resolveDueDate, mobPure.resolveDueDate, makeFinalizedInvoice({ delDate: '10-May-2026' }))).toBe('2026-05-10');
    expect(both(webPure.resolveDueDate, mobPure.resolveDueDate, { delDate: { startDate: '', endDate: '2026-06-01' } })).toBe('2026-06-01');
    expect(both(webPure.resolveDueDate, mobPure.resolveDueDate, makeInvoice({ delDate: undefined }))).toBe(null);
    expect(both(webPure.resolveDueDate, mobPure.resolveDueDate, undefined)).toBe(null);
  });

  it('the top-level string date OUTRANKS dateRange', () => {
    // utils/pureHelpers.js:45-46 — `inv.date` is checked first. Both fields are populated on real
    // docs and they can disagree after an edit, so the precedence is load-bearing, not cosmetic.
    const conflicting = makeInvoice({ date: '2026-04-10', dateRange: { startDate: '2026-01-01', endDate: '2026-01-01' } });
    expect(both(webPure.resolveInvoiceDate, mobPure.resolveInvoiceDate, conflicting)).toBe('2026-04-10');
  });

  it('falls back to dateRange (startDate, then endDate) and finally to null', () => {
    // utils/pureHelpers.js:45-46 — an empty string date is falsy, so the range is consulted.
    expect(both(webPure.resolveInvoiceDate, mobPure.resolveInvoiceDate, makeInvoice({ date: '' }))).toBe('2026-04-10');
    expect(both(webPure.resolveInvoiceDate, mobPure.resolveInvoiceDate, { dateRange: { startDate: '', endDate: '2026-02-02' } })).toBe('2026-02-02');
    expect(both(webPure.resolveInvoiceDate, mobPure.resolveInvoiceDate, { date: 20260410 })).toBe(null); // non-string
    expect(both(webPure.resolveInvoiceDate, mobPure.resolveInvoiceDate, undefined)).toBe(null);
  });
});

describe('pureHelpers.groupInvoicesByNumber — the OLDER grouping rule, which only understands numeric invType', () => {
  it('a credit note supersedes the original and payments are combined', () => {
    // utils/pureHelpers.js:73-85 — same shape of answer as finance.groupInvoices.
    const { invoices } = scenario('invoicePlusCreditNote');
    const out = both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, invoices);
    expect(out).toHaveLength(1);
    expect(out[0].totalAmount).toBe(-2000);
    expect(out[0].debtBlnc).toBe(-7000);
    expect(out[0].payments).toHaveLength(1);
  });

  it('CANNOT dedupe the finalized LABEL shape — and finance.groupInvoices can', () => {
    // utils/pureHelpers.js:68-69 — parseInt('Invoice') is NaN, so `types` empties out and the
    // `types.length < 2` guard returns the group untouched. utils/finance.js:27-31 maps the labels
    // onto ranks and collapses the same pair. This is a REAL behavioural difference between the two
    // helpers, pinned so nobody swaps one for the other assuming they agree.
    const pair = [
      makeFinalizedInvoice({ id: 'g-o', invoice: 7, totalAmount: 12000, payments: [] }),
      makeFinalizedInvoice({ id: 'g-n', invoice: 7, invType: INV_TYPE.finalLabel, totalAmount: 9000, payments: [] }),
    ];
    const older = both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, pair);
    expect(older).toHaveLength(2);
    expect(older.reduce((s: number, i: any) => s + i.totalAmount, 0)).toBe(21000); // double-counted
    const newer = both(webFinance.groupInvoices, mobFinance.groupInvoices, pair);
    expect(newer).toHaveLength(1);
    expect(newer[0].totalAmount).toBe(9000);
  });

  it('leaves a lone doc, same-type docs, and a non-array alone', () => {
    // utils/pureHelpers.js:57 (Array.isArray), :66 (length 1), :69 (one distinct type).
    const { invoices } = scenario('singleInvoice');
    expect(both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, invoices)).toHaveLength(1);
    expect(both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, scenario('twoOriginalsSameNumber').invoices)).toHaveLength(2);
    expect(both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, null)).toEqual([]);
    expect(both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, undefined)).toEqual([]);
  });

  it('drops docs with no invoice number but keeps number 0', () => {
    // utils/pureHelpers.js:60 — `inv.invoice == null` is loose, so 0 survives.
    const out = both(webPure.groupInvoicesByNumber, mobPure.groupInvoicesByNumber, [
      makeInvoice({ id: 'zero', invoice: 0 }),
      makeInvoice({ id: 'none', invoice: null }),
      makeInvoice({ id: 'undef', invoice: undefined }),
    ]);
    expect(out.map((i: any) => i.id)).toEqual(['zero']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// pureHelpers.js — computeStockNetSummary
// ─────────────────────────────────────────────────────────────────────────────

describe('pureHelpers.computeStockNetSummary — what is actually IN the warehouse, not a sum of lots', () => {
  const settings = makeSettings();

  it('nets out-lots off in-lots and resolves the material, unit and warehouse labels', () => {
    // utils/pureHelpers.js:133-143 (in adds |qnty|, out subtracts) and :146-162 (label resolution:
    // an in-lot's description is a PRODUCT ID looked up in productsData).
    const rows = both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot(), makeStockOutLot()], settings);
    expect(rows).toEqual([{ description: 'Ni Scrap 304', qnty: 6, unit: 'MT', warehouse: 'Rotterdam' }]);
  });

  it('drops a line whose out-lots consumed it entirely, and any residue at or below 0.1', () => {
    // utils/pureHelpers.js:144 — `if (qty <= 0.1) return`. A raw sum would still show 10 MT of
    // sold material sitting in the warehouse.
    const { stockLots, settings: s } = scenario('zeroQtyLot');
    const rows = both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, stockLots, s);
    expect(rows).toEqual([]);
  });

  it('ignores lots that were never assigned to a warehouse', () => {
    // utils/pureHelpers.js:103 — .filter(s => s.stock).
    const rows = both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot({ stock: '' }), null, undefined], settings);
    expect(rows).toEqual([]);
  });

  it('nets the final-settlement correction off an in-lot when the settled quantity differs', () => {
    // utils/pureHelpers.js:138-139 — |q| + ((finalqnty && finalqnty*1 !== qnty*1) ? (qnty-finalqnty)*-1 : 0),
    // i.e. 10 booked but 9 settled leaves 9 in stock.
    const rows = both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot({ finalqnty: '9' })], settings);
    expect(rows[0].qnty).toBe(9);
  });

  it('applies no correction when finalqnty is blank or equal to qnty', () => {
    // Same line: the guard is `l.finalqnty &&` plus a numeric (not string) inequality, so the
    // string '10' against the number 10 must NOT trigger a correction.
    expect(both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot({ finalqnty: '' })], settings)[0].qnty).toBe(10);
    expect(both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot({ qnty: 10, finalqnty: '10' })], settings)[0].qnty).toBe(10);
  });

  it('keeps only the highest invType within one invoice number, so a final row replaces the original', () => {
    // utils/pureHelpers.js:107-116 — the same dedupe rule as utils.filteredArray. Without it the
    // original and its settlement would both be counted and the stock would read double.
    const original = makeStockLot({ id: 'l-orig', invoice: 1001, invType: INV_TYPE.invoiceId, qnty: '10' });
    const settled = makeStockLot({ id: 'l-final', invoice: 1001, invType: INV_TYPE.finalId, qnty: '9.5' });
    const rows = both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [original, settled], settings);
    expect(rows).toHaveLength(1);
    expect(rows[0].qnty).toBe(9.5);
  });

  it('groups on warehouse + material, so the same material in two warehouses stays two rows', () => {
    // utils/pureHelpers.js:126 — key is `${s.stock}|${matKey}`.
    const rows = both(
      webPure.computeStockNetSummary,
      mobPure.computeStockNetSummary,
      [makeStockLot(), makeStockLot({ id: 'l-2', stock: 'wh-2', invoice: 2002 })],
      settings
    );
    expect(rows.map((r: any) => r.warehouse).sort()).toEqual(['Antwerp', 'Rotterdam']);
  });

  it('sorts heaviest first', () => {
    // utils/pureHelpers.js:165 — .sort((a, b) => b.qnty - a.qnty).
    const rows = both(
      webPure.computeStockNetSummary,
      mobPure.computeStockNetSummary,
      [
        makeStockLot({ id: 'small', description: 'prd-s', descriptionId: 'prd-s', qnty: '3', productsData: [makeProduct({ id: 'prd-s', description: 'Small' })] }),
        makeStockLot({ id: 'big', description: 'prd-b', descriptionId: 'prd-b', qnty: '40', productsData: [makeProduct({ id: 'prd-b', description: 'Big' })] }),
      ],
      settings
    );
    expect(rows.map((r: any) => [r.description, r.qnty])).toEqual([['Big', 40], ['Small', 3]]);
  });

  it('rounds the reported quantity to exactly 3 decimals — not 2, not 4', () => {
    // utils/pureHelpers.js:158 — Math.round(qty * 1000) / 1000.
    // Two cases are needed to pin the DIGIT COUNT. '10.00049' alone proves only that some
    // rounding happens: 2-decimal rounding also yields 10, so it cannot detect a coarsening.
    const q = (v: string) =>
      both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot({ qnty: v })], settings)[0].qnty;
    expect(q('10.0006')).toBe(10.001); // survives 3dp; a 2dp rounding would flatten this to 10
    expect(q('10.00049')).toBe(10); //     dropped by 3dp; a 4dp rounding would keep 10.0005
    expect(q('10.4995')).toBe(10.5); //    the .0005 boundary rounds up (Math.round, not trunc)
  });

  it('falls back to "Unknown" rather than blank when no label can be resolved', () => {
    // utils/pureHelpers.js:147-154 — the `|| first.descriptionName || 'Unknown'` tail.
    const rows = both(
      webPure.computeStockNetSummary,
      mobPure.computeStockNetSummary,
      [makeStockLot({ description: 'prd-missing', productsData: [], descriptionName: '', descriptionText: '' })],
      settings
    );
    expect(rows[0].description).toBe('Unknown');
  });

  it('tolerates a non-array input and empty settings', () => {
    // utils/pureHelpers.js:102 / :118-119 — the AI assistant calls this with whatever it has.
    expect(both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, null, settings)).toEqual([]);
    const rows = both(webPure.computeStockNetSummary, mobPure.computeStockNetSummary, [makeStockLot()], undefined);
    expect(rows).toEqual([{ description: 'Ni Scrap 304', qnty: 10, unit: '', warehouse: '' }]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// splitUtils.js
// ─────────────────────────────────────────────────────────────────────────────

describe('splitUtils — the IMS/GIS expense-split lifecycle', () => {
  it('recognises only pending and done; anything else is "not under control"', () => {
    // utils/splitUtils.js:12-15.
    expect(both(webSplit.splitStatusOf, mobSplit.splitStatusOf, { split: { status: 'pending' } })).toBe('pending');
    expect(both(webSplit.splitStatusOf, mobSplit.splitStatusOf, { split: { status: 'done' } })).toBe('done');
    for (const row of [{}, null, undefined, { split: null }, { split: {} }, { split: { status: 'DONE' } }, { split: { status: 'x' } }]) {
      expect(both(webSplit.splitStatusOf, mobSplit.splitStatusOf, row)).toBe('none');
    }
  });

  it('splits 50/50 by default', () => {
    // utils/splitUtils.js:9 SPLIT_DEFAULT_RATIO = 50, :19-25.
    expect(webSplit.SPLIT_DEFAULT_RATIO).toBe(50);
    expect(mobSplit.SPLIT_DEFAULT_RATIO).toBe(webSplit.SPLIT_DEFAULT_RATIO);
    expect(both(webSplit.computeShares, mobSplit.computeShares, 1000)).toEqual({ imsShare: 500, gisShare: 500 });
  });

  it('gives GIS the remainder, so the two shares always add back to the original amount', () => {
    // utils/splitUtils.js:22-23 — gisShare is `round2(total - imsShare)`, NOT an independent
    // `round2(total * (100-r) / 100)`. That is what stops a rounding cent from being created.
    //
    // The first four amounts below cannot tell the two formulas apart (only one half ever rounds
    // up), so they are NOT sufficient on their own — 0.05 and 0.15 are the cases where BOTH halves
    // round up, which is the only place the bug shows. Do not drop them.
    for (const [amount, ratio] of [
      [1000, 33], [0.01, 33], [1234.56, 17], [99.99, 1], [7, 3],
      [0.05, 50], [0.15, 50], [0.05, 33], [0.25, 50],
    ] as Array<[number, number]>) {
      const { imsShare, gisShare } = both(webSplit.computeShares, mobSplit.computeShares, amount, ratio);
      expect(imsShare + gisShare).toBeCloseTo(amount, 10);
    }
    expect(both(webSplit.computeShares, mobSplit.computeShares, 100, 33)).toEqual({ imsShare: 33, gisShare: 67 });
    // 0.05 split evenly: 0.025 rounds UP to 0.03 for IMS, so GIS must take the 0.02 that is left —
    // an independent percentage would also round up and hand out 0.06 in total.
    expect(both(webSplit.computeShares, mobSplit.computeShares, 0.05, 50)).toEqual({ imsShare: 0.03, gisShare: 0.02 });
    expect(both(webSplit.computeShares, mobSplit.computeShares, 0.15, 50)).toEqual({ imsShare: 0.08, gisShare: 0.07 });
  });

  it('clamps the ratio to 0..100 instead of inventing money', () => {
    // utils/splitUtils.js:21 — Math.min(100, Math.max(0, Number(ratioToIms))).
    expect(both(webSplit.computeShares, mobSplit.computeShares, 1000, 150)).toEqual({ imsShare: 1000, gisShare: 0 });
    expect(both(webSplit.computeShares, mobSplit.computeShares, 1000, -20)).toEqual({ imsShare: 0, gisShare: 1000 });
  });

  it('hardens the AMOUNT against junk but not the RATIO — a non-numeric ratio yields NaN on both apps', () => {
    // utils/splitUtils.js:20 uses `Number(amount) || 0` while :21 does not guard the ratio.
    // Documented, not excused: a caller must never hand computeShares a free-text ratio.
    expect(both(webSplit.computeShares, mobSplit.computeShares, 'abc', 50)).toEqual({ imsShare: 0, gisShare: 0 });
    const shares = both(webSplit.computeShares, mobSplit.computeShares, 1000, 'abc');
    expect(Number.isNaN(shares.imsShare)).toBe(true);
    expect(Number.isNaN(shares.gisShare)).toBe(true);
  });

  it('derives the notification id from the entity, so raising and clearing are idempotent', () => {
    // utils/splitUtils.js:29.
    expect(both(webSplit.splitNotifId, mobSplit.splitNotifId, 'expense', 'exp-1')).toBe('split:expense:exp-1');
    expect(both(webSplit.splitNotifId, mobSplit.splitNotifId, 'contract', 'con-1')).toBe('split:contract:con-1');
  });

  it('maps every currency encoding used across the app to one symbol', () => {
    // utils/splitUtils.js:33-38 — 'us'/'usd'/'$' and 'eu'/'eur'/'€', case-insensitive.
    for (const usd of ['us', 'US', 'usd', 'USD', '$']) {
      expect(both(webSplit.curSymbol, mobSplit.curSymbol, usd)).toBe('$');
    }
    for (const eur of ['eu', 'EU', 'eur', 'EUR', '€']) {
      expect(both(webSplit.curSymbol, mobSplit.curSymbol, eur)).toBe('€');
    }
  });

  it('shows an unknown currency code verbatim, and nothing at all when there is none', () => {
    // utils/splitUtils.js:37 — `${cur} ` (note the trailing space) / '' for a falsy value.
    expect(both(webSplit.curSymbol, mobSplit.curSymbol, 'GBP')).toBe('GBP ');
    expect(both(webSplit.curSymbol, mobSplit.curSymbol, '')).toBe('');
    expect(both(webSplit.curSymbol, mobSplit.curSymbol, null)).toBe('');
    expect(both(webSplit.curSymbol, mobSplit.curSymbol, undefined)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// soldStatus.js
// ─────────────────────────────────────────────────────────────────────────────

describe('soldStatus.lotIsSold — allocation to a buyer counts as sold, not just the manual flag', () => {
  it('a consignee or a sales PO makes the lot sold even when the dropdown was never touched', () => {
    // app/(root)/contractsstatement/soldStatus.js:15-18. This IS the client-reported bug (698
    // Solids/Turnings, Thormet): genuinely sold material kept reading "Unsold".
    expect(both(webSold.lotIsSold, mobSold.lotIsSold, { client: 'cli-1' })).toBe(true);
    expect(both(webSold.lotIsSold, mobSold.lotIsSold, { salesPo: 'SO-77' })).toBe(true);
    expect(both(webSold.lotIsSold, mobSold.lotIsSold, { status: 'Sold' })).toBe(true); // case-insensitive
  });

  it('an unallocated lot is not sold, and whitespace does not count as an allocation', () => {
    // soldStatus.js:10 — hasVal trims before testing.
    for (const lot of [{}, undefined, { status: 'unsold' }, { client: '   ' }, { salesPo: '' }, { client: null }]) {
      expect(both(webSold.lotIsSold, mobSold.lotIsSold, lot)).toBe(false);
    }
  });
});

describe('soldStatus.computeLineSold — the basis is the CONTRACTED quantity', () => {
  it('takes the larger of shipped and allocated, never their sum', () => {
    // soldStatus.js:36-38 — Math.max(shipped, allocatedQty), then Math.min(basis, …). Summing
    // would double-count a lot that was both allocated to a client and then shipped to them.
    const out = both(webSold.computeLineSold, mobSold.computeLineSold, {
      contractQty: 10,
      shippedQty: 4,
      lots: [{ sold: true, qnty: 6 }],
    });
    expect(out).toEqual({ tone: 'partial', soldQty: 6, receivedQty: 10, shippedQty: 4 });
  });

  it('caps sold at the contracted quantity when more shipped than was contracted', () => {
    // soldStatus.js:38 — Math.min(basis, …).
    const out = both(webSold.computeLineSold, mobSold.computeLineSold, { contractQty: 10, shippedQty: 14, lots: [] });
    expect(out.soldQty).toBe(10);
    expect(out.tone).toBe('sold');
  });

  it('an untouched contracted line is unsold against its full contracted quantity', () => {
    // soldStatus.js:39 — receivedQty carries the basis so the label denominator is right.
    const out = both(webSold.computeLineSold, mobSold.computeLineSold, { contractQty: 10 });
    expect(out).toEqual({ tone: 'unsold', soldQty: 0, receivedQty: 10, shippedQty: 0 });
  });

  it('a line with no contracted quantity has no tone at all', () => {
    // soldStatus.js:22 — rollupTone returns 'none' unless basisQty > 0.0001.
    expect(both(webSold.computeLineSold, mobSold.computeLineSold, { contractQty: 0, shippedQty: 5 }).tone).toBe('none');
  });

  it('ignores unallocated lots in the allocated total', () => {
    // soldStatus.js:36 — only `l.sold` lots contribute.
    const out = both(webSold.computeLineSold, mobSold.computeLineSold, {
      contractQty: 10,
      lots: [{ sold: false, qnty: 8 }, { sold: true, qnty: 2 }],
    });
    expect(out.soldQty).toBe(2);
  });

  it('treats the tone boundaries with a 0.0001 tolerance so float noise does not read as partial', () => {
    // soldStatus.js:21-26 — soldQty < basisQty - 0.0001 is 'partial'; at/above it is 'sold'.
    expect(both(webSold.rollupTone, mobSold.rollupTone, 9.99995, 10)).toBe('sold');
    expect(both(webSold.rollupTone, mobSold.rollupTone, 9.9, 10)).toBe('partial');
    expect(both(webSold.rollupTone, mobSold.rollupTone, 0.00005, 10)).toBe('unsold');
  });
});

describe('soldStatus.aggregateRollups — a PO rolls up its lines and re-derives its own tone', () => {
  it('sums the line quantities and tones on the TOTALS, not on the lines', () => {
    // soldStatus.js:43-48 — tone comes from rollupTone(Σsold, Σreceived), so a PO with one sold
    // and one unsold line reads "partial" rather than inheriting either line's tone.
    const out = both(webSold.aggregateRollups, mobSold.aggregateRollups, [
      { tone: 'sold', soldQty: 10, receivedQty: 10, shippedQty: 10 },
      { tone: 'unsold', soldQty: 0, receivedQty: 10, shippedQty: 0 },
    ]);
    expect(out).toEqual({ tone: 'partial', soldQty: 10, receivedQty: 20, shippedQty: 10 });
  });

  it('a PO with nothing under it is toneless rather than "unsold"', () => {
    expect(both(webSold.aggregateRollups, mobSold.aggregateRollups, [])).toEqual({ tone: 'none', soldQty: 0, receivedQty: 0, shippedQty: 0 });
    expect(both(webSold.aggregateRollups, mobSold.aggregateRollups, undefined).tone).toBe('none');
  });

  it('treats a malformed line as zero instead of poisoning the PO total', () => {
    // soldStatus.js:44-46 — `Number(r?.soldQty) || 0` per field.
    const out = both(webSold.aggregateRollups, mobSold.aggregateRollups, [null, { soldQty: 'x', receivedQty: 10 }, { soldQty: 4, receivedQty: 10, shippedQty: 4 }]);
    expect(out).toEqual({ tone: 'partial', soldQty: 4, receivedQty: 20, shippedQty: 4 });
  });
});

describe('soldStatus.lineStatus — the manual shipment status outranks anything derived', () => {
  it('an explicit lifecycle status is shown as-is and flagged as a shipment status', () => {
    // soldStatus.js:55-56 — the set status wins over the sold/shipped derivation entirely.
    const out = both(webSold.lineStatus, mobSold.lineStatus, {
      shipmentStatus: 'Shipped',
      rollup: { tone: 'unsold', soldQty: 0, receivedQty: 10, shippedQty: 0 },
    });
    expect(out).toEqual({ key: 'Shipped', label: 'Shipped', isShipment: true });
  });

  it('a legacy stored status is normalised on read, with no data migration', () => {
    // soldStatus.js:55 -> shipmentStatus.js:8-9 — 'At Port' => 'Arrived', 'Delivered' => 'Completed'.
    expect(both(webSold.lineStatus, mobSold.lineStatus, { shipmentStatus: 'At Port' })).toEqual({ key: 'Arrived', label: 'Arrived', isShipment: true });
    expect(both(webSold.lineStatus, mobSold.lineStatus, { shipmentStatus: 'Delivered' })).toEqual({ key: 'Completed', label: 'Completed', isShipment: true });
  });

  it('falls back to an em dash when there is neither a status nor a contracted quantity', () => {
    // soldStatus.js:58-60.
    expect(both(webSold.lineStatus, mobSold.lineStatus, {})).toEqual({ key: 'none', label: '—', isShipment: false });
    expect(both(webSold.lineStatus, mobSold.lineStatus, undefined).key).toBe('none');
    expect(both(webSold.lineStatus, mobSold.lineStatus, { rollup: { tone: 'unsold', receivedQty: 0 } }).key).toBe('none');
  });

  it('reads "Shipped" once the whole contracted quantity has shipped', () => {
    // soldStatus.js:65 — shipped >= basis - 0.0001.
    expect(both(webSold.lineStatus, mobSold.lineStatus, { rollup: { tone: 'sold', soldQty: 10, receivedQty: 10, shippedQty: 10 } })).toEqual({
      key: 'shipped',
      label: 'Shipped',
      isShipment: false,
    });
  });

  it('shows the shipped fraction against the contracted quantity while it is part-shipped', () => {
    // soldStatus.js:66 — `Shipped ${fmtQty(shipped)} / ${fmtQty(basis)} MT`, fmtQty being
    // en-US with maximumFractionDigits 2 (soldStatus.js:11) — hence the thousands separator.
    expect(both(webSold.lineStatus, mobSold.lineStatus, { rollup: { tone: 'partial', soldQty: 4, receivedQty: 10, shippedQty: 4 } }).label).toBe(
      'Shipped 4 / 10 MT'
    );
    expect(
      both(webSold.lineStatus, mobSold.lineStatus, { rollup: { tone: 'partial', soldQty: 1234.567, receivedQty: 5000, shippedQty: 1234.567 } }).label
    ).toBe('Shipped 1,234.57 / 5,000 MT');
  });

  it('distinguishes sold-but-not-yet-shipped from unsold', () => {
    // soldStatus.js:67-68 — the reason the status column exists: allocated material must not read
    // as Unsold just because it has not physically moved yet.
    expect(both(webSold.lineStatus, mobSold.lineStatus, { rollup: { tone: 'partial', soldQty: 6, receivedQty: 10, shippedQty: 0 } })).toEqual({
      key: 'pending',
      label: 'Sold · pending shipment',
      isShipment: false,
    });
    expect(both(webSold.lineStatus, mobSold.lineStatus, { rollup: { tone: 'unsold', soldQty: 0, receivedQty: 10, shippedQty: 0 } })).toEqual({
      key: 'unsold',
      label: 'Unsold 10 MT',
      isShipment: false,
    });
  });

  it('an empty-string shipment status is not a status, so the derivation still runs', () => {
    // soldStatus.js:55-56 — normalizeStatus('') is '' (falsy), so it does not short-circuit.
    const out = both(webSold.lineStatus, mobSold.lineStatus, { shipmentStatus: '', rollup: { tone: 'unsold', soldQty: 0, receivedQty: 10, shippedQty: 0 } });
    expect(out.isShipment).toBe(false);
    expect(out.label).toBe('Unsold 10 MT');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// storageUtils.js
// ─────────────────────────────────────────────────────────────────────────────

describe('storageUtils — the per-MT storage rate', () => {
  it('only genuine ongoing storage counts, not one-time handling or delay penalties', () => {
    // app/(root)/storagecosts/storageUtils.js:6 STORAGE_LABELS = ['storage','warehouse'] and
    // :33-36 — demurrage / stuffing / freight are deliberately excluded from the rate.
    expect(webStorage.STORAGE_LABELS).toEqual(['storage', 'warehouse']);
    expect(mobStorage.STORAGE_LABELS).toEqual(['storage', 'warehouse']); // pinned on BOTH sides
    // The excluded types are asserted BEHAVIOURALLY (not just by comparing the two constants),
    // so widening the list on either app fails here and not only in the Tier 1 identity check.
    const types = [
      ...makeSettings().Expenses.Expenses,
      { id: 'exp-demurrage', expType: 'Demurrage' },
      { id: 'exp-stuffing', expType: 'Stuffing' },
      { id: 'exp-wh-lower', expType: 'warehouse' }, // :35 lower-cases before comparing
    ];
    for (const id of ['exp-storage', 'exp-warehouse', 'exp-wh-lower']) {
      expect(both(webStorage.isStorageType, mobStorage.isStorageType, { expType: id }, types)).toBe(true);
    }
    for (const id of ['exp-freight', 'exp-demurrage', 'exp-stuffing', 'exp-commission', 'nope']) {
      expect(both(webStorage.isStorageType, mobStorage.isStorageType, { expType: id }, types)).toBe(false);
    }
    expect(both(webStorage.isStorageType, mobStorage.isStorageType, undefined, types)).toBe(false);
    expect(both(webStorage.isStorageType, mobStorage.isStorageType, { expType: 'exp-storage' }, undefined)).toBe(false);
  });

  it('re-expresses a MONTHLY rate per week or per year using fixed factors', () => {
    // storageUtils.js:10-14 — a month is 4.345 weeks; the base unit is the month (factor 1).
    expect(webStorage.UNIT.map((u: any) => u.key)).toEqual(['week', 'month', 'year']);
    expect(mobStorage.UNIT).toEqual(webStorage.UNIT);
    expect(mobStorage.UNIT.map((u: any) => u.label)).toEqual(['per week', 'per month', 'per year']);
    expect(mobStorage.UNIT.find((u: any) => u.key === 'month').factor).toBe(1);
    expect(mobStorage.UNIT.find((u: any) => u.key === 'year').factor).toBe(12);
    expect(mobStorage.UNIT.find((u: any) => u.key === 'week').factor).toBeCloseTo(1 / 4.345, 12);
  });

  it('converts EUR at a fixed 1.08 and passes USD through untouched', () => {
    // storageUtils.js:7 EUR_USD = 1.08, :16 — note the USD branch returns `amt` UNCONVERTED and
    // UNCOERCED, so a string amount survives as a string. Pinned so a caller knows to parse first.
    expect(webStorage.EUR_USD).toBe(1.08);
    expect(mobStorage.EUR_USD).toBe(webStorage.EUR_USD);
    expect(both(webStorage.toUsd, mobStorage.toUsd, 100, 'us')).toBe(100);
    expect(both(webStorage.toUsd, mobStorage.toUsd, 100, 'USD')).toBe(100);
    expect(both(webStorage.toUsd, mobStorage.toUsd, '100', 'us')).toBe('100');
    expect(both(webStorage.toUsd, mobStorage.toUsd, '100', 'eu')).toBeCloseTo(108, 9);
    expect(both(webStorage.toUsd, mobStorage.toUsd, 'junk', 'eu')).toBe(0);
  });

  it('reduces a date to YYYY-MM and refuses to crash on a non-string date', () => {
    // storageUtils.js:19 — a Firestore Timestamp/number would otherwise blow up .substring and
    // white-screen the page.
    expect(both(webStorage.ym, mobStorage.ym, '2026-03-20')).toBe('2026-03');
    for (const bad of [20260320, null, undefined, { seconds: 1 }, new Date('2026-03-20')]) {
      expect(both(webStorage.ym, mobStorage.ym, bad)).toBe('');
    }
  });

  it('takes the arrival date from indDate, in either shape, and falls back to the contract date', () => {
    // storageUtils.js:24-30.
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, makeStockLot())).toBe('2026-03-20');
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, makeStockLot({ indDate: { startDate: '2026-04-01', endDate: '2026-04-09' } }))).toBe('2026-04-01');
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, makeStockLot({ indDate: { startDate: '', endDate: '2026-04-09' } }))).toBe('2026-04-09');
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, makeStockLot({ indDate: {} }))).toBe('2026-03-15'); // contractData.date
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, makeStockLot({ indDate: '' }))).toBe('2026-03-15');
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, makeStockLot({ indDate: 12345, contractData: {} }))).toBe('');
    expect(both(webStorage.arrivalStr, mobStorage.arrivalStr, undefined)).toBe('');
  });

  it('mtInWh nets shipments out, so a warehouse is not billed for material that already left', () => {
    // storageUtils.js:43-52 — Σ in − Σ out, matching the main Stocks page.
    const lots = [makeStockLot(), makeStockOutLot()];
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, lots, 'wh-1')).toBe(6); // 10 in − 4 out
  });

  it('counts material that is sold but not yet shipped — it still physically occupies the shed', () => {
    // storageUtils.js:38-41 — only an actual "out" record (shipment/transfer) removes tonnage.
    const soldNotShipped = makeStockLot({ status: 'sold', client: 'cli-1' });
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, [soldNotShipped], 'wh-1')).toBe(10);
  });

  it('applies a month cut-off: a lot that arrives after the month is not yet on hand', () => {
    // storageUtils.js:46-47 — `if (month && arr && arr > month) return sum`. The out-lot of 4
    // arrives 2026-05, so April sees the full 10 and May sees 6.
    const lots = [makeStockLot(), makeStockOutLot()];
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, lots, 'wh-1', '2026-04')).toBe(10);
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, lots, 'wh-1', '2026-05')).toBe(6);
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, lots, 'wh-1', '2026-02')).toBe(0);
  });

  it('ignores other warehouses, treats an untyped lot as an arrival, and never reports negative MT', () => {
    // storageUtils.js:45 (warehouse filter), :49 ("in" or untyped adds), :51 (Math.max(0, net)).
    const lots = [makeStockLot(), makeStockLot({ id: 'other', stock: 'wh-2', qnty: '99' }), makeStockLot({ id: 'untyped', type: undefined, qnty: '5' })];
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, lots, 'wh-1')).toBe(15);
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, [makeStockOutLot({ qnty: '4' })], 'wh-1')).toBe(0);
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, undefined, 'wh-1')).toBe(0);
  });

  it('a negative stored quantity is floored at 0 per lot rather than subtracting from the shed', () => {
    // storageUtils.js:48 — Math.max(0, parseFloat(l.qnty) || 0).
    expect(both(webStorage.mtInWh, mobStorage.mtInWh, [makeStockLot({ qnty: '-10' }), makeStockLot({ id: 'b', qnty: '3' })], 'wh-1')).toBe(3);
  });

  describe('computeStorageMetric', () => {
    const lots = [makeStockLot(), makeStockOutLot()]; // 10 MT in from 2026-03, 4 MT out in 2026-05
    const whName = (id: string) => makeSettings().Stocks.Stocks.find((w: any) => w.id === id)?.nname || '';
    const tagged = [
      { id: 'e1', storageWh: 'wh-1', storageMonth: '2026-04', amount: '500', cur: 'us' },
      { id: 'e2', storageWh: 'wh-1', storageMonth: '2026-04', amount: '300', cur: 'us' },
      { id: 'e3', storageWh: 'wh-1', storageMonth: '2026-05', amount: '200', cur: 'us' },
      { id: 'e4', storageWh: 'wh-2', storageMonth: '2026-04', amount: '100', cur: 'eu' },
      { id: 'skip-no-wh', storageMonth: '2026-04', amount: '9999', cur: 'us' },
      { id: 'skip-no-month', storageWh: 'wh-1', amount: '9999', cur: 'us' },
    ];

    it('counts each warehouse-month of tonnage ONCE no matter how many invoices arrive for it', () => {
      // storageUtils.js:60-66 — the `months` Set. Two April invoices for the same shed must add
      // their COSTS but must not count April's tonnage twice, or the $/MT rate halves.
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots, whName });
      const wh1 = out.rows.find((r: any) => r.wh === 'wh-1');
      expect(wh1.cost).toBe(1000); // 500 + 300 + 200
      expect(wh1.mt).toBe(16); // April sees 10 on hand, May sees 6 → 16 MT-months
      expect(wh1.rate).toBeCloseTo(62.5, 9);
      expect(wh1.name).toBe('Rotterdam');
    });

    it('skips an expense that is not tagged to both a warehouse and a month', () => {
      // storageUtils.js:59-60 — `if (!wh || !e.storageMonth) return`.
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots, whName });
      expect(out.rows.map((r: any) => r.wh).sort()).toEqual(['wh-1', 'wh-2']);
      expect(out.totalCost).toBeCloseTo(1000 + 108, 6); // the two 9999 rows never entered
    });

    it('converts a EUR storage invoice before adding it to the cost', () => {
      // storageUtils.js:62 — toUsd(parseFloat(e.amount) || 0, e.cur).
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots, whName });
      expect(out.rows.find((r: any) => r.wh === 'wh-2').cost).toBeCloseTo(108, 9);
    });

    it('reports no rate at all — rather than a divide-by-zero — for a shed that held nothing', () => {
      // storageUtils.js:70 — `v.mtMonths > 0 ? cost / mtMonths : null`. wh-2 was billed but empty.
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots, whName });
      expect(out.rows.find((r: any) => r.wh === 'wh-2')).toMatchObject({ mt: 0, rate: null });
    });

    it('sorts the most expensive shed first, with rate-less sheds last', () => {
      // storageUtils.js:71 — .sort((a, b) => (b.rate || 0) - (a.rate || 0)).
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots, whName });
      expect(out.rows.map((r: any) => r.wh)).toEqual(['wh-1', 'wh-2']);
    });

    it('the overall rate is cost-weighted across sheds, not the average of their rates', () => {
      // storageUtils.js:72-74 — Σcost / ΣMT. wh-2's 108 of cost against 0 MT still raises it.
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots, whName });
      expect(out.totalMt).toBe(16);
      expect(out.overall).toBeCloseTo((1000 + 108) / 16, 6);
      expect(out.overall).not.toBeCloseTo(62.5, 3); // i.e. NOT the mean of the per-shed rates
    });

    it('falls back to an em dash when the warehouse name cannot be resolved', () => {
      // storageUtils.js:69 — `whName(wh) || '—'`, and whName defaults to () => ''.
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, { tagged, lots });
      expect(out.rows).toHaveLength(2); // `.every` on an empty array is vacuously true — guard it
      expect(out.rows.map((r: any) => r.name)).toEqual(['—', '—']);
    });

    it('an untagged period returns zeroes and a null rate rather than throwing', () => {
      // storageUtils.js:56 — every argument is defaulted.
      const out = both(webStorage.computeStorageMetric, mobStorage.computeStorageMetric, {});
      expect(out).toEqual({ rows: [], totalCost: 0, totalMt: 0, overall: null });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// notificationPriority.js / notificationRouting.js
// ─────────────────────────────────────────────────────────────────────────────

describe('notificationPriority — only money at risk is allowed to be High', () => {
  it('an explicit priority overrides the derivation', () => {
    // utils/notificationPriority.js:22 — a call site can force a level.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { priority: 'low', type: 'settlement.overdue' })).toBe('low');
  });

  it('an unrecognised explicit priority is ignored and the type decides', () => {
    // utils/notificationPriority.js:22 — the `&& PRIORITY[n.priority]` guard.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { priority: 'urgent', type: 'settlement.overdue' })).toBe('high');
  });

  it('overdue settlements, delayed contracts and stale ETAs are High', () => {
    // utils/notificationPriority.js:27-30.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'settlement.overdue' })).toBe('high');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'settlement.anything' })).toBe('high'); // startsWith
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'contract.delayed' })).toBe('high');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'shipment.eta14' })).toBe('high');
  });

  it('money IN and the early unpaid nag are Medium — they used to be High and buried the real fires', () => {
    // utils/notificationPriority.js:32-36 — the explicit reason given in web's comment.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'payment.recorded' })).toBe('medium');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'payment.deleted' })).toBe('medium');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'invoice.unpaid' })).toBe('medium');
  });

  it('created records, warehouse traffic and comments are Low', () => {
    // utils/notificationPriority.js:39-42.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'contract.created' })).toBe('low');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'stock.aging' })).toBe('low');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'comment.added' })).toBe('low');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'activity' })).toBe('low');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, {})).toBe('low'); // untyped legacy rows
  });

  it('anything on a stock entity is Low even when its type says nothing', () => {
    // utils/notificationPriority.js:40 — `|| et === 'stock'`, which is how demurrage/storage
    // charges written before the type field existed still land in Low.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: '', entityType: 'stock' })).toBe('low');
  });

  it('everything unclassified lands in Medium, so a new type is never silently High', () => {
    // utils/notificationPriority.js:45 — the fallthrough.
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'contract.updated' })).toBe('medium');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'invoice.finalized' })).toBe('medium');
    expect(both(webPrio.priorityOf, mobPrio.priorityOf, { type: 'split.pending' })).toBe('medium');
  });

  it('carries a visual token per level, with rank 0 sorting first', () => {
    // utils/notificationPriority.js:9-13 — the bell/badge reads these. Ranks are pinned as
    // literals because priorityRank(), the sort, and the grouped bell all depend on the ORDER.
    expect(Object.keys(mobPrio.PRIORITY)).toEqual(['high', 'medium', 'low']);
    expect(Object.keys(mobPrio.PRIORITY)).toEqual(Object.keys(webPrio.PRIORITY));
    expect([mobPrio.PRIORITY.high.rank, mobPrio.PRIORITY.medium.rank, mobPrio.PRIORITY.low.rank]).toEqual([0, 1, 2]);
    for (const k of ['high', 'medium', 'low'] as const) {
      expect(mobPrio.PRIORITY[k]).toEqual(webPrio.PRIORITY[k]);
      expect(mobPrio.PRIORITY[k].key).toBe(k);
      expect(Object.keys(mobPrio.PRIORITY[k])).toEqual(['key', 'rank', 'label', 'color', 'bg', 'border']);
    }
    expect([mobPrio.PRIORITY.high.label, mobPrio.PRIORITY.medium.label, mobPrio.PRIORITY.low.label]).toEqual(['High', 'Medium', 'Low']);
  });

  it('ranks High above Medium above Low', () => {
    // utils/notificationPriority.js:9-16, :48.
    expect(webPrio.PRIORITY_ORDER).toEqual(['high', 'medium', 'low']);
    expect(mobPrio.PRIORITY_ORDER).toEqual(['high', 'medium', 'low']); // pinned on BOTH sides
    expect(both(webPrio.priorityRank, mobPrio.priorityRank, { type: 'settlement.overdue' })).toBe(0);
    expect(both(webPrio.priorityRank, mobPrio.priorityRank, { type: 'contract.updated' })).toBe(1);
    expect(both(webPrio.priorityRank, mobPrio.priorityRank, { type: 'contract.created' })).toBe(2);
  });

  it('sorts by priority first and newest-within-priority second', () => {
    // utils/notificationPriority.js:51-52. Timestamps are literals — nothing reads the wall clock.
    const feed = [
      { id: 'lo-new', type: 'contract.created', createdAtMs: 300 },
      { id: 'hi-old', type: 'settlement.overdue', createdAtMs: 100 },
      { id: 'md', type: 'contract.updated', createdAtMs: 200 },
      { id: 'hi-new', type: 'contract.delayed', createdAtMs: 400 },
    ];
    const out = both(webPrio.sortByPriority, mobPrio.sortByPriority, feed);
    expect(out.map((n: any) => n.id)).toEqual(['hi-new', 'hi-old', 'md', 'lo-new']);
  });

  it('does not mutate the caller\'s array — the notification stream is shared state', () => {
    // utils/notificationPriority.js:52 — `[...arr].sort(...)`, not `arr.sort(...)`.
    const feed = [
      { id: 'a', type: 'contract.created', createdAtMs: 1 },
      { id: 'b', type: 'settlement.overdue', createdAtMs: 2 },
    ];
    webPrio.sortByPriority(feed);
    mobPrio.sortByPriority(feed);
    expect(feed.map((n) => n.id)).toEqual(['a', 'b']);
    expect(both(webPrio.sortByPriority, mobPrio.sortByPriority, []).length).toBe(0);
    expect(both(webPrio.sortByPriority, mobPrio.sortByPriority, undefined).length).toBe(0);
  });

  it('a notification with no timestamp sorts last within its level rather than first', () => {
    // utils/notificationPriority.js:52 — `(b.createdAtMs || 0) - (a.createdAtMs || 0)`.
    const out = both(webPrio.sortByPriority, mobPrio.sortByPriority, [
      { id: 'undated', type: 'contract.updated' },
      { id: 'dated', type: 'contract.updated', createdAtMs: 5 },
    ]);
    expect(out.map((n: any) => n.id)).toEqual(['dated', 'undated']);
  });
});

describe('notificationRouting — tapping a notification opens the right record', () => {
  it('entity types that own a record deep-link to it by id', () => {
    // utils/notificationRouting.js:5-7 — the ?openId= contract with each page.
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'contract', 'con-1')).toBe('/contracts?openId=con-1');
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'invoice', 'inv-1')).toBe('/invoices?openId=inv-1');
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'expense', 'exp-1')).toBe('/expenses?openId=exp-1');
  });

  it('entity types with no per-record view open the list page and ignore the id', () => {
    // utils/notificationRouting.js:8-10 — these route functions take no argument.
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'companyexpense', 'x')).toBe('/companyexpenses');
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'stock', 'x')).toBe('/stocks');
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'settings', 'x')).toBe('/settings');
  });

  it('an unknown entity type falls back to the activity feed instead of a dead link', () => {
    // utils/notificationRouting.js:13-14 — `(ROUTES[entityType] || (() => '/activity'))`.
    expect(both(webRoute.routeFor, mobRoute.routeFor, 'wat', 'x')).toBe('/activity');
    expect(both(webRoute.routeFor, mobRoute.routeFor, undefined, undefined)).toBe('/activity');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fxRates.js — only convert() is testable here; getRates() does network I/O and
// caches in module scope, and a parity test that reaches the network is broken by
// definition. Identity is covered by the Tier 1 block above.
// ─────────────────────────────────────────────────────────────────────────────

describe('fxRates.convert — an unknown rate leaves the amount alone rather than dropping it', () => {
  const rates = { EUR: 0.92, GBP: 0.79, USD: 1 };

  it('divides by the rate, because the table is quoted as "foreign units per 1 base unit"', () => {
    // utils/fxRates.js:45-47 — rates come from frankfurter as base->X, so X->base is a division.
    expect(both(webFx.convert, mobFx.convert, 92, 'EUR', 'USD', rates)).toBeCloseTo(100, 9);
    expect(both(webFx.convert, mobFx.convert, 79, 'gbp', 'usd', rates)).toBeCloseTo(100, 9); // case-insensitive
  });

  it('passes an amount already in the base currency straight through', () => {
    // utils/fxRates.js:41-42, and :40 — a missing fromCur is assumed to BE the base.
    expect(both(webFx.convert, mobFx.convert, 250, 'USD', 'USD', rates)).toBe(250);
    expect(both(webFx.convert, mobFx.convert, 250, null, 'USD', rates)).toBe(250);
  });

  it('returns the amount unchanged when the rate is missing or zero, instead of NaN or Infinity', () => {
    // utils/fxRates.js:43-44 — better a face-value figure than a hole in the forecast.
    expect(both(webFx.convert, mobFx.convert, 100, 'JPY', 'USD', rates)).toBe(100);
    expect(both(webFx.convert, mobFx.convert, 100, 'EUR', 'USD', { EUR: 0 })).toBe(100);
    expect(both(webFx.convert, mobFx.convert, 100, 'EUR', 'USD', undefined)).toBe(100);
  });

  it('a non-finite amount is 0, so one bad row cannot poison the forecast', () => {
    // utils/fxRates.js:39 — Number.isFinite guard. Note it rejects numeric STRINGS too.
    expect(both(webFx.convert, mobFx.convert, NaN, 'EUR', 'USD', rates)).toBe(0);
    expect(both(webFx.convert, mobFx.convert, Infinity, 'EUR', 'USD', rates)).toBe(0);
    expect(both(webFx.convert, mobFx.convert, '92', 'EUR', 'USD', rates)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TIER 4 — shipmentStatus.js: the one intentional divergence
// ─────────────────────────────────────────────────────────────────────────────

describe('Tier 4 — shipmentStatus diverges in COLOUR ONLY, because React Native has no CSS variables', () => {
  const KEYS = ['Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold', 'At Port', 'Delivered', ''];

  it('both apps offer the identical status vocabulary, in the identical order', () => {
    // app/(root)/contractsstatement/shipmentStatus.js:5 — the Shipment page picker and the
    // Statement's Status column are driven from this one list.
    expect(mobShip.SHIPMENT_STATUSES).toEqual(webShip.SHIPMENT_STATUSES);
    expect(webShip.SHIPMENT_STATUSES).toEqual(['', 'Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold']);
  });

  it('normalizeStatus behaves identically, legacy aliases included', () => {
    // shipmentStatus.js:8-9 — 'At Port' => 'Arrived', 'Delivered' => 'Completed'; no migration.
    const cases: any[] = ['At Port', 'Delivered', 'Pending', 'Shipped', 'In Transit', 'Arrived', 'Completed', 'On Hold', 'Bogus', '', null, undefined, 0];
    for (const c of cases) both(webShip.normalizeStatus, mobShip.normalizeStatus, c);
    expect(both(webShip.normalizeStatus, mobShip.normalizeStatus, 'At Port')).toBe('Arrived');
    expect(both(webShip.normalizeStatus, mobShip.normalizeStatus, 'Delivered')).toBe('Completed');
    expect(both(webShip.normalizeStatus, mobShip.normalizeStatus, undefined)).toBe('');
    expect(both(webShip.normalizeStatus, mobShip.normalizeStatus, 'Bogus')).toBe('Bogus'); // unknown values survive
  });

  it('hasShipmentStatus behaves identically — the empty default is not a status', () => {
    // shipmentStatus.js:25.
    expect(both(webShip.hasShipmentStatus, mobShip.hasShipmentStatus, '')).toBe(false);
    expect(both(webShip.hasShipmentStatus, mobShip.hasShipmentStatus, undefined)).toBe(false);
    expect(both(webShip.hasShipmentStatus, mobShip.hasShipmentStatus, 'Pending')).toBe(true);
    expect(both(webShip.hasShipmentStatus, mobShip.hasShipmentStatus, 'At Port')).toBe(true);
  });

  it('the style tables have the identical keys, in the identical order, with the identical shape', () => {
    // shipmentStatus.js:11-22 — this is the STRUCTURE half of the divergence: only the values
    // may differ. A missing key on mobile would render an unstyled chip.
    expect(Object.keys(mobShip.SHIPMENT_STATUS_STYLES)).toEqual(Object.keys(webShip.SHIPMENT_STATUS_STYLES));
    expect(Object.keys(webShip.SHIPMENT_STATUS_STYLES)).toEqual(KEYS);
    for (const k of KEYS) {
      expect(Object.keys(mobShip.SHIPMENT_STATUS_STYLES[k])).toEqual(Object.keys(webShip.SHIPMENT_STATUS_STYLES[k]));
      expect(Object.keys(webShip.SHIPMENT_STATUS_STYLES[k])).toEqual(['backgroundColor', 'border', 'color']);
    }
  });

  it('every web colour is a theme token and every mobile colour is a literal RN colour', () => {
    // THE divergence, stated as a rule rather than as a list of hex codes. React Native cannot
    // resolve `var(--x)`, so a leftover CSS variable on the mobile side is a latent crash/no-op —
    // which is exactly what this caught (In Transit.color and ''.color were still var(...)).
    for (const k of KEYS) {
      const w = webShip.SHIPMENT_STATUS_STYLES[k];
      const m = mobShip.SHIPMENT_STATUS_STYLES[k];
      expect(w.backgroundColor).toMatch(/^var\(--[a-z-]+\)$/);
      expect(w.color).toMatch(/^var\(--[a-z-]+\)$/);
      expect(w.border).toMatch(/^1px solid var\(--[a-z-]+\)$/);
      expect(m.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
      expect(m.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(m.border).toMatch(/^1px solid #[0-9a-f]{6}$/);
    }
    expect(JSON.stringify(mobShip.SHIPMENT_STATUS_STYLES)).not.toContain('var(');
  });

  it('the divergence is confined to the palette — the two legacy keys still map to their modern twin', () => {
    // shipmentStatus.js:18-20 — 'At Port' must look like 'Arrived' and 'Delivered' like
    // 'Completed' on BOTH apps, or an un-normalized raw value renders a differently-coloured chip.
    for (const table of [webShip.SHIPMENT_STATUS_STYLES, mobShip.SHIPMENT_STATUS_STYLES]) {
      expect(table['At Port']).toEqual(table.Arrived);
      expect(table.Delivered).toEqual(table.Completed);
    }
  });

  it('the divergence is presentational: soldStatus.lineStatus is unaffected by it', () => {
    // mobile/src/shared/soldStatus.js imports normalizeStatus from ITS OWN shipmentStatus copy
    // (soldStatus.js:8). Because only the colours differ, the derived status is still identical —
    // this is the assertion that makes the colour divergence safe to keep.
    for (const s of ['At Port', 'Delivered', 'On Hold', '', undefined]) {
      both(webSold.lineStatus, mobSold.lineStatus, { shipmentStatus: s, rollup: { tone: 'partial', soldQty: 4, receivedQty: 10, shippedQty: 4 } });
    }
  });

  it('the two files differ ONLY inside the style table, line for line', () => {
    // Proves the divergence has not quietly grown into a logic fork: every differing line must be
    // one of the style entries, and the number of differing lines must not change unnoticed.
    const w = repoFileText('app/(root)/contractsstatement/shipmentStatus.js').split('\n');
    const m = repoFileText('mobile/src/shared/shipmentStatus.js').split('\n');
    expect(m.length).toBe(w.length);
    const differing = w.map((line, i) => (line === m[i] ? -1 : i)).filter((i) => i >= 0);
    expect(differing.every((i) => /backgroundColor:/.test(w[i]))).toBe(true);
    expect(differing).toHaveLength(9); // the 9 style entries, and nothing else
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Meta: coverage completeness + Tier 3 drift alarms.
//
// Tier 1 identity proves mobile === web. It does NOT protect against a rule change made on WEB
// and then re-copied to mobile — which is precisely how these files are maintained. Two things
// guard that: the behavioural goldens above (which state web's rule as a literal), and the drift
// alarms below (which fail the moment web's source for a pinned formula changes at all).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Every exported symbol of every shared module, and whether this suite exercises its BEHAVIOUR.
 *
 * This list exists because the suite's original blind spot was invisible: `receivables`,
 * `agingBuckets`, `invoiceRevenue`, `isOverdue`, `effectiveDueDate`, `pnl`, `toIsoDate`,
 * `resolveDueDate`, `resolveInvoiceDate` and `groupInvoicesByNumber` were all exported, all
 * shipped, and all completely untested — a regression in any of them would have been caught only
 * by byte-identity, i.e. not at all once it was copied. Adding an export to a shared module now
 * fails this test until it is either covered or consciously listed as untestable.
 */
const SHARED_EXPORTS: Record<string, { covered: string[]; untestable?: Record<string, string> }> = {
  finance: {
    covered: [
      'DEFAULT_TERM_DAYS', 'FINALIZED_FLAG', 'UNIT_TO_MT', 'agingBuckets', 'contractPurchaseValue',
      'effectiveDueDate', 'fx', 'groupInvoices', 'invoiceBalance', 'invoicePaid', 'invoiceRevenue',
      'isFinalNote', 'isFinalized', 'isIssued', 'isOverdue', 'num', 'pnl', 'receivables',
      'resolveCur', 'toMT', 'unitOf',
    ],
    untestable: {
      resolveDueDate: 're-export of pureHelpers.resolveDueDate (finance.js:9-11) — covered there',
      resolveInvoiceDate: 're-export of pureHelpers.resolveInvoiceDate — covered there',
      toIsoDate: 're-export of pureHelpers.toIsoDate — covered there',
    },
  },
  pureHelpers: { covered: ['computeStockNetSummary', 'groupInvoicesByNumber', 'resolveDueDate', 'resolveInvoiceDate', 'toIsoDate'] },
  splitUtils: { covered: ['SPLIT_DEFAULT_RATIO', 'computeShares', 'curSymbol', 'splitNotifId', 'splitStatusOf'] },
  soldStatus: { covered: ['aggregateRollups', 'computeLineSold', 'lineStatus', 'lotIsSold', 'rollupTone'] },
  storageUtils: { covered: ['EUR_USD', 'STORAGE_LABELS', 'UNIT', 'arrivalStr', 'computeStorageMetric', 'isStorageType', 'mtInWh', 'toUsd', 'ym'] },
  notificationPriority: { covered: ['PRIORITY', 'PRIORITY_ORDER', 'priorityOf', 'priorityRank', 'sortByPriority'] },
  notificationRouting: { covered: ['routeFor'] },
  fxRates: {
    covered: ['convert'],
    untestable: { getRates: 'does live network I/O and caches in module scope (fxRates.js:13); a parity test that reaches the network is broken by definition' },
  },
  shipmentStatus: { covered: ['SHIPMENT_STATUSES', 'SHIPMENT_STATUS_STYLES', 'hasShipmentStatus', 'normalizeStatus'] },
};

const MOBILE_MODULES: Record<string, any> = {
  finance: mobFinance, pureHelpers: mobPure, splitUtils: mobSplit, soldStatus: mobSold,
  storageUtils: mobStorage, notificationPriority: mobPrio, notificationRouting: mobRoute,
  fxRates: mobFx, shipmentStatus: mobShip,
};

describe('meta — every shared export is accounted for', () => {
  it.each(Object.keys(SHARED_EXPORTS))('%s exports exactly the symbols this suite has classified', (name) => {
    const { covered, untestable = {} } = SHARED_EXPORTS[name];
    const classified = [...covered, ...Object.keys(untestable)].sort();
    // A NEW export makes this fail, which is the point: it forces a covered-or-justified decision
    // instead of shipping an untested money function. A DELETED export fails it too — the mobile
    // copy would then be stale.
    expect(Object.keys(MOBILE_MODULES[name]).sort()).toEqual(classified);
  });

  it('every symbol claimed "untestable" carries a written reason', () => {
    for (const { untestable = {} } of Object.values(SHARED_EXPORTS)) {
      for (const [sym, reason] of Object.entries(untestable)) {
        expect(reason.length, `${sym} needs a reason`).toBeGreaterThan(20);
      }
    }
    // Guard the loop itself: if the register ever empties, the assertion above becomes vacuous.
    expect(Object.values(SHARED_EXPORTS).flatMap((m) => Object.keys(m.untestable || {}))).toHaveLength(4);
  });
});

describe('meta — Tier 3 drift alarms on the rules the goldens above encode', () => {
  // If one of these fires, WEB changed the formula. The goldens in this file then describe the OLD
  // product, and the verbatim mobile copy is stale. Re-derive the expected values from the new web
  // source and re-copy the module. DO NOT paste the new hash in to go green.
  it.each([
    ['utils/finance.js', 'groupInvoices', '9e2ee7aa676b'],
    ['utils/finance.js', 'receivables', 'f9db50cce49f'],
    ['utils/finance.js', 'agingBuckets', 'a4d7615d2d26'],
    ['utils/finance.js', 'invoiceRevenue', '424923215839'],
    ['utils/finance.js', 'effectiveDueDate', '86e58eafcc9e'],
    ['utils/finance.js', 'isOverdue', 'daac1382c17f'],
    ['utils/finance.js', 'pnl', '1d7e01a21253'],
    ['utils/finance.js', 'unitOf', '602b0962d6e5'],
    ['utils/finance.js', 'toMT', '8b7f8afd3ba5'],
    ['utils/finance.js', 'fx', '6496df0764f1'],
    ['utils/pureHelpers.js', 'computeStockNetSummary', 'e9a25fb6868d'],
    ['utils/pureHelpers.js', 'groupInvoicesByNumber', '64cc691e2959'],
    ['utils/pureHelpers.js', 'toIsoDate', 'a4c34e57e905'],
    ['utils/splitUtils.js', 'computeShares', '890c9e7a8b34'],
    ['app/(root)/contractsstatement/soldStatus.js', 'computeLineSold', '7f39e341a1b5'],
    ['app/(root)/contractsstatement/soldStatus.js', 'lineStatus', 'e4008353ac00'],
    ['app/(root)/storagecosts/storageUtils.js', 'computeStorageMetric', 'dd00ae771434'],
    ['app/(root)/storagecosts/storageUtils.js', 'mtInWh', 'fe44f0afab48'],
    ['utils/notificationPriority.js', 'priorityOf', '9607cd8bc88e'],
  ])('%s %s has not drifted', (file, symbol, hash) => {
    expectWebUnchanged(file, symbol, hash);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Meta: the citations in this file point at real code.
// ─────────────────────────────────────────────────────────────────────────────

describe('meta — the symbols these tests cite still exist in web', () => {
  it.each([
    ['utils/finance.js', 'groupInvoices'],
    ['utils/finance.js', 'resolveCur'],
    ['utils/finance.js', 'contractPurchaseValue'],
    ['utils/finance.js', 'toMT'],
    ['utils/pureHelpers.js', 'computeStockNetSummary'],
    ['utils/splitUtils.js', 'computeShares'],
    ['utils/notificationPriority.js', 'priorityOf'],
    ['utils/notificationRouting.js', 'routeFor'],
    ['app/(root)/contractsstatement/soldStatus.js', 'lineStatus'],
    ['app/(root)/storagecosts/storageUtils.js', 'computeStorageMetric'],
    ['app/(root)/contractsstatement/shipmentStatus.js', 'normalizeStatus'],
  ])('%s exports %s', (file, symbol) => {
    // webFnLine throws '[webSource] symbol "X" not found' if web renamed or deleted it — which
    // would mean the verbatim mobile copy is stale, not that the helper is broken.
    expect(webFnLine(file, symbol)).toBeGreaterThan(0);
  });
});
