import { useQuery } from '@tanstack/react-query';
import { getJson, apiConfigured } from '@/lib/api';
import { marketsQueryClient } from '@/query/client';
import { EUR_USD_FALLBACK } from '@shared/finance';

/*
 * Today's EUR→USD as ONE number, for Cashflow — the twin of web hooks/useExchangeRates.js
 * fetchEurUsd: the same two feeds in the same order. First the live minute feed (the `fx`
 * block of /api/metal-prices — the paid metals-api plan the price strip already uses), then
 * the daily open feed if that fails. Every euro amount on Cashflow goes into the dollar
 * totals at this rate (2026-10-07; before, euros went in at face value, at each PO's rate
 * or at a fixed 1.08 depending on the section).
 *
 * It never throws and never hangs: each feed is given `timeoutMs`. `rate` is dollars per
 * euro, 0 when neither feed answered — `usableRate` then puts EUR_USD_FALLBACK in its place
 * with no source, and the screen says a fixed rate was used.
 *
 * Lives on marketsQueryClient, never the persisted app client: see query/client.ts.
 */
export interface EurUsd {
  rate: number;
  source: 'live' | 'daily' | null;
  stale: boolean;
}

const DAILY_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

const within = <T>(p: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timed out')), ms);
    }),
  ]).finally(() => clearTimeout(timer));
};

async function fromLive(): Promise<EurUsd> {
  if (!apiConfigured()) throw new Error('no API in this build');
  const d = await getJson<any>('/api/metal-prices');
  const eurPerUsd = Number(d?.fx?.EUR);
  if (!(eurPerUsd > 0)) throw new Error(d?.error || 'live FX unavailable');
  return { rate: 1 / eurPerUsd, source: 'live', stale: !!d?.stale };
}

async function fromDaily(): Promise<EurUsd> {
  const res = await fetch(DAILY_URL);
  if (!res.ok) throw new Error('daily FX unavailable');
  const d = await res.json();
  const eurPerUsd = Number(d?.rates?.EUR);
  if (!(eurPerUsd > 0)) throw new Error('daily FX unavailable');
  return { rate: 1 / eurPerUsd, source: 'daily', stale: false };
}

export async function fetchEurUsd(timeoutMs = 4000): Promise<EurUsd> {
  for (const feed of [fromLive, fromDaily]) {
    try {
      return await within(feed(), timeoutMs);
    } catch {
      /* the next feed */
    }
  }
  return { rate: 0, source: null, stale: false };
}

/** The rate Cashflow converts with: the fetched one, or EUR_USD_FALLBACK (no source) when none answered. */
export const usableRate = (r: EurUsd | null | undefined): EurUsd =>
  r && r.rate > 0 ? r : { rate: EUR_USD_FALLBACK, source: null, stale: false };

/** Asked once per Cashflow visit (web: once per page load); a revisit within ten minutes reuses it. */
export function useEurUsd() {
  return useQuery(
    {
      queryKey: ['eur-usd'],
      queryFn: () => fetchEurUsd(),
      staleTime: 10 * 60 * 1000,
    },
    marketsQueryClient
  );
}
