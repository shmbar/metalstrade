// What a stock lot is worth (utils/lotPrice.js, byte-identical on the phone).
//
// Client, 2026-10-07, on Hf Ni VAR (IMS PO 190626-2-TIM): the $3,950 is per kg of hafnium
// CONTENT — "check the Hf content in the assay". The lot is 660 kg, spec "89.06Hf 10.1Ni",
// and Shalex's invoice 1SHX1026-IMSTIMPFI is $2,321,794.20 = 660 × 89.06% × $3,950. Every
// screen valued it at 660 × $3,950 = $2,607,000. Its sister lot (49.96 kg at $400, spec
// "32.7Hf 62.57Ni Var") is priced per kg of material and its invoice is 49.96 × $400.
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS module
import * as web from '../utils/lotPrice.js';
// @ts-ignore — plain JS module, the phone's copy
import * as phone from '../mobile/src/shared/lotPrice.js';

const hfLot = { qnty: '660', unitPrc: '3950', spec: '89.06Hf  10.1Ni', analysis: '', priceOn: 'Hf' };
const sisterLot = { qnty: '49.96', unitPrc: '400', spec: '32.7Hf 62.57Ni Var', analysis: '' };

describe.each([['web', web], ['phone', phone]])('lot price (%s copy)', (_app, s: any) => {
  it('a lot priced per Hf content is worth exactly what Shalex invoiced', () => {
    expect(s.contentPct(hfLot, 'Hf')).toBe(89.06);
    expect(s.priceShare(hfLot)).toBeCloseTo(0.8906, 10);
    expect(s.lotLineTotal(hfLot)).toBe(2321794.2);
    expect(s.effectiveUnitPrice(hfLot) * 660).toBeCloseTo(2321794.2, 6);
  });

  it('a lot priced per unit of material is unchanged', () => {
    expect(s.priceShare(sisterLot)).toBe(1);
    expect(s.lotLineTotal(sisterLot)).toBe(19984);
    expect(s.effectiveUnitPrice(sisterLot)).toBe(400);
  });

  it('the certificate analysis wins over the spec when both state the element', () => {
    expect(s.contentPct({ ...hfLot, analysis: '88.5Hf 11.2Ni' }, 'Hf')).toBe(88.5);
    expect(s.contentPct({ ...hfLot, analysis: '11.2Ni' }, 'Hf')).toBe(89.06); // not in the analysis → spec
  });

  it('a content price whose element is nowhere in the chemistry keeps the old value rather than zero', () => {
    const lost = { ...hfLot, priceOn: 'Re' };
    expect(s.contentPct(lost, 'Re')).toBeNull();
    expect(s.priceShare(lost)).toBe(1);
    expect(s.lotLineTotal(lost)).toBe(2607000);
  });

  it('takes a quantity and price other than the lot\'s own (the Materials Breakdown, mid-edit)', () => {
    expect(s.lotLineTotal(hfLot, '100', '4000')).toBe(356240);
    expect(s.lotLineTotal(hfLot, '', '4000')).toBe(0);
    expect(s.effectiveUnitPrice(hfLot, 'abc')).toBe(0);
  });
});
