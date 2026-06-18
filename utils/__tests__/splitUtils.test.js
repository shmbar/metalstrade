import { describe, it, expect } from 'vitest';
import {
  SPLIT_DEFAULT_RATIO, splitStatusOf, computeShares, splitNotifId, curSymbol,
} from '../splitUtils';

describe('splitStatusOf', () => {
  it('returns none when there is no split or no status', () => {
    expect(splitStatusOf(undefined)).toBe('none');
    expect(splitStatusOf({})).toBe('none');
    expect(splitStatusOf({ split: {} })).toBe('none');
    expect(splitStatusOf({ split: { status: 'whatever' } })).toBe('none');
  });
  it('passes through the two real states', () => {
    expect(splitStatusOf({ split: { status: 'pending' } })).toBe('pending');
    expect(splitStatusOf({ split: { status: 'done' } })).toBe('done');
  });
});

describe('computeShares', () => {
  it('defaults to a 50/50 split', () => {
    expect(computeShares(100)).toEqual({ imsShare: 50, gisShare: 50 });
    expect(SPLIT_DEFAULT_RATIO).toBe(50);
  });
  it('honors an arbitrary ratio', () => {
    expect(computeShares(100, 70)).toEqual({ imsShare: 70, gisShare: 30 });
    expect(computeShares(100, 0)).toEqual({ imsShare: 0, gisShare: 100 });
    expect(computeShares(100, 100)).toEqual({ imsShare: 100, gisShare: 0 });
  });
  it('rounds to cents and GIS always takes the remainder (no drift)', () => {
    const { imsShare, gisShare } = computeShares(100.05, 33); // 33.0165 → 33.02
    expect(imsShare).toBe(33.02);
    expect(gisShare).toBe(67.03);
    expect(Math.round((imsShare + gisShare) * 100) / 100).toBe(100.05);
  });
  it('clamps out-of-range ratios and tolerates junk amounts', () => {
    expect(computeShares(100, 150)).toEqual({ imsShare: 100, gisShare: 0 });
    expect(computeShares(100, -20)).toEqual({ imsShare: 0, gisShare: 100 });
    expect(computeShares('abc')).toEqual({ imsShare: 0, gisShare: 0 });
  });
});

describe('splitNotifId', () => {
  it('builds a stable, type-scoped id', () => {
    expect(splitNotifId('invoice', 'X1')).toBe('split:invoice:X1');
    expect(splitNotifId('companyexpense', 'C9')).toBe('split:companyexpense:C9');
  });
});

describe('curSymbol', () => {
  it('normalizes the various currency encodings used across pages', () => {
    expect(curSymbol('us')).toBe('$');
    expect(curSymbol('USD')).toBe('$');
    expect(curSymbol('$')).toBe('$');
    expect(curSymbol('eu')).toBe('€');
    expect(curSymbol('EUR')).toBe('€');
    expect(curSymbol('')).toBe('');
  });
});
