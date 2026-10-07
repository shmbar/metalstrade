// Final settlement → supplier invoices (utils/settlement.js, byte-identical on the phone).
//
// Confirming a settlement used to overwrite each supplier invoice's value with the settled
// total of its lots, on its own. Thormet's PO 300126 lots are priced at $9,350–12,350/MT,
// its invoices at $6,400–6,960/MT and paid in full; confirming the settlement on 2026-10-02
// turned them into $337,893.43 "owed" (client, 2026-10-07). Now the window lists what would
// change (settledInvoiceChanges) and the person chooses; applySettledTotals is the old
// behaviour, used only on "Use settled totals". The figures below are PO 300126's.
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS module
import * as web from '../utils/settlement.js';
// @ts-ignore — plain JS module, the phone's copy
import * as phone from '../mobile/src/shared/settlement.js';

// Invoice 27 as it was before the settlement: $78,988.80, paid 100% on 24 Feb.
const inv27 = { id: 'pi-27', inv: '27', invValue: '78988.8', pmnt: '78988.8', blnc: 0 };
// Invoice 32: paid $66,681.60; its lot was settled at 10.375 of 10.419 MT, both at $9,350.
const inv32 = { id: 'pi-32', inv: '32', invValue: '66681.60', pmnt: '66681.60', blnc: 0 };
// V260325.01: the lot is priced at what was invoiced — the settlement agrees with it.
const invV = { id: 'pi-V', inv: 'V260325.01', invValue: 147040.06, pmnt: 147040.06, blnc: 0 };
// An invoice with no lots in this settlement — never touched.
const invOther = { id: 'pi-x', inv: '99', invValue: '500', pmnt: '0', blnc: 500 };
const poInvoices = [inv27, inv32, invV, invOther];
const lots = [
  { id: 'l1', poInvoice: 'pi-27', total: 111513.6, finaltotal: 111513.6 },
  { id: 'l2', poInvoice: 'pi-32', total: 97417.65, finaltotal: 97006.25 },
  { id: 'l3', poInvoice: 'pi-V', total: 147040.06, finaltotal: '147040.06' },
  { id: 'l4', total: 9999, finaltotal: 9999 }, // no supplier invoice named
];

describe.each([['web', web], ['phone', phone]])('settlement (%s copy)', (_app, s: any) => {
  it('adds the settled totals per supplier invoice; a lot naming none is left out', () => {
    expect(s.settledTotalsByInvoice(lots)).toEqual({ 'pi-27': 111513.6, 'pi-32': 97006.25, 'pi-V': 147040.06 });
  });

  it('lists only the invoices whose value would change — with the balance it would leave', () => {
    const changes = s.settledInvoiceChanges(poInvoices, lots);
    expect(changes.map((c: any) => c.inv)).toEqual(['27', '32']); // V260325.01 already agrees; 99 has no lots
    expect(changes[0]).toEqual({ id: 'pi-27', inv: '27', now: 78988.8, settled: 111513.6, paid: 78988.8, balanceNow: 0, balanceAfter: 32524.8 });
    expect(changes[1].balanceAfter).toBeCloseTo(30324.65, 2); // the $30,324.65 the client saw on invoice 32
  });

  it('nothing to ask when the settlement agrees with every invoice', () => {
    expect(s.settledInvoiceChanges([invV, invOther], lots)).toEqual([]);
    expect(s.settledInvoiceChanges(undefined, lots)).toEqual([]);
    expect(s.settledInvoiceChanges(poInvoices, [])).toEqual([]);
  });

  it('"Use settled totals" is the old behaviour: value = settled total, balance = value − paid', () => {
    const out = s.applySettledTotals(poInvoices, lots);
    expect(out[0]).toMatchObject({ id: 'pi-27', invValue: 111513.6, blnc: 32524.8 });
    expect(out[1]).toMatchObject({ invValue: 97006.25 });
    expect(out[1].blnc).toBeCloseTo(30324.65, 2);
    expect(out[3]).toBe(invOther); // untouched, same object
    expect(poInvoices[0].invValue).toBe('78988.8'); // the input is not mutated
  });
});
