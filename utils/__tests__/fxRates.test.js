import { describe, it, expect } from 'vitest';
import { convert } from '../fxRates.js';

// `rates` is keyed by foreign currency, where rates[FOREIGN] = "how many FOREIGN
// units equal 1 of base." So to convert FOREIGN amount → base, divide by rate.
// We use a synthetic rates table so the test is hermetic (no network).
const ratesAgainstUSD = { EUR: 0.92, GBP: 0.79, JPY: 152 };

describe('convert (FX)', () => {
  it('returns the amount unchanged when from === to', () => {
    expect(convert(100, 'USD', 'USD', ratesAgainstUSD)).toBe(100);
    expect(convert(100, 'eur', 'EUR', ratesAgainstUSD)).toBe(100); // case-insensitive
  });

  it('returns 0 for non-finite amounts', () => {
    expect(convert(NaN, 'EUR', 'USD', ratesAgainstUSD)).toBe(0);
    expect(convert(Infinity, 'EUR', 'USD', ratesAgainstUSD)).toBe(0);
    expect(convert(null, 'EUR', 'USD', ratesAgainstUSD)).toBe(0);
    expect(convert(undefined, 'EUR', 'USD', ratesAgainstUSD)).toBe(0);
  });

  it('converts EUR → USD correctly (100 EUR / 0.92 ≈ 108.7 USD)', () => {
    const result = convert(100, 'EUR', 'USD', ratesAgainstUSD);
    expect(result).toBeCloseTo(108.6956, 3);
  });

  it('converts JPY → USD correctly', () => {
    const result = convert(1520, 'JPY', 'USD', ratesAgainstUSD);
    expect(result).toBeCloseTo(10, 3); // 1520 / 152
  });

  it('falls back to amount when rate is missing (graceful degradation)', () => {
    // If we don't have a rate for the from-currency, don't silently zero it out.
    expect(convert(100, 'XYZ', 'USD', ratesAgainstUSD)).toBe(100);
  });

  it('falls back to amount when rate is zero', () => {
    expect(convert(100, 'EUR', 'USD', { EUR: 0 })).toBe(100);
  });

  it('handles missing toBase by defaulting to USD', () => {
    expect(convert(100, 'EUR', null, ratesAgainstUSD)).toBeCloseTo(108.6956, 3);
  });

  it('handles missing fromCur by treating it as base (no conversion)', () => {
    expect(convert(100, null, 'USD', ratesAgainstUSD)).toBe(100);
  });
});
