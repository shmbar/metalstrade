// fetchEurUsd (hooks/useExchangeRates.js) — the one EUR→USD figure Cashflow converts its
// euro amounts with, once per load. The live minute feed first (/api/metal-prices `fx`),
// the daily feed if that fails, and it says which it used. It must never throw and never
// hang the page: Cashflow waits for it before adding its sections up.
import { afterEach, describe, expect, it, vi } from 'vitest';
// @ts-ignore — plain JS module
import { fetchEurUsd } from '../hooks/useExchangeRates.js';
// @ts-ignore — plain JS module
import { EUR_USD_FALLBACK as webFallback } from '../utils/finance.js';
// @ts-ignore — plain JS module, the phone's byte-identical copy
import { EUR_USD_FALLBACK as phoneFallback } from '../mobile/src/shared/finance.js';
import { fetchEurUsd as phoneFetchEurUsd, usableRate } from '@/features/prices/eurUsd';

const FULL = { EUR: 0.8889, ILS: 3.7, GBP: 0.75, RUB: 80, AED: 3.67, CNY: 7.1 };
const ok = (body: any) => ({ ok: true, json: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe('fetchEurUsd', () => {
  it('reads the live feed: dollars per euro is 1 / euros per dollar', async () => {
    const fetch = vi.fn(async (url: string) => {
      expect(url).toBe('/api/metal-prices');
      return ok({ fx: { USD: 1, ...FULL }, timestamp: 1_791_000_000 });
    });
    vi.stubGlobal('fetch', fetch);
    const got = await fetchEurUsd();
    expect(got.source).toBe('live');
    expect(got.rate).toBeCloseTo(1 / 0.8889, 9);
    expect(got.stale).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('says so when the live feed is serving its last good answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ fx: { USD: 1, ...FULL }, stale: true })));
    expect((await fetchEurUsd()).stale).toBe(true);
  });

  it('falls back to the daily feed when the live one fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url === '/api/metal-prices') return ok({ error: 'metals-api down' });
      return ok({ rates: { ...FULL, EUR: 0.9 }, time_last_updated: 1_791_000_000 });
    }));
    const got = await fetchEurUsd();
    expect(got.source).toBe('daily');
    expect(got.rate).toBeCloseTo(1 / 0.9, 9);
  });

  it('a feed that never answers is given up on, not waited for', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) =>
      url === '/api/metal-prices' ? new Promise(() => {}) : Promise.resolve(ok({ rates: FULL }))));
    const started = Date.now();
    const got = await fetchEurUsd(50);
    expect(got.source).toBe('daily');
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('when neither feed answers it returns 0 and no source — the page then uses the fallback and says so', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await fetchEurUsd()).toEqual({ rate: 0, source: null, time: null, stale: false });
  });
});

describe('EUR_USD_FALLBACK (shared finance)', () => {
  it('is 1.08 on both apps — used only when no feed answered, and the page then says so', () => {
    expect(webFallback).toBe(1.08);
    expect(phoneFallback).toBe(webFallback);
  });
});

describe("the phone's fetchEurUsd (features/prices/eurUsd.ts) — web's twin", () => {
  it('falls back to the daily feed, then to nothing, the way web does', async () => {
    // Every request here answers without an `fx` block (or the build has no API base), so the
    // live feed fails and the phone reads the daily feed — as web does when the live one fails.
    vi.stubGlobal('fetch', vi.fn(async () => ok({ rates: { ...FULL, EUR: 0.9 } })));
    const got = await phoneFetchEurUsd();
    expect(got).toEqual({ rate: 1 / 0.9, source: 'daily', stale: false });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await phoneFetchEurUsd()).toEqual({ rate: 0, source: null, stale: false });
  });

  it('usableRate puts the fallback in when no feed answered, with no source', () => {
    expect(usableRate({ rate: 0, source: null, stale: false })).toEqual({ rate: 1.08, source: null, stale: false });
    expect(usableRate(undefined)).toEqual({ rate: 1.08, source: null, stale: false });
    expect(usableRate({ rate: 1.1249, source: 'live', stale: false })).toEqual({ rate: 1.1249, source: 'live', stale: false });
  });
});
