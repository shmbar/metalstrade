import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { marketsQueryClient } from '@/query/client';

// Exchange rates for the dashboard ticker — the same source, currencies, pairs,
// cross-rate formula and 30-minute refresh as web (hooks/useExchangeRates.js and
// components/Dashboard/MarketsTicker.js), so both apps show the same rate for the
// same pair at the same moment. Client report 2026-09-11: "App missing the
// currency rates" — mobile had no FX at all.
//
// Lives on marketsQueryClient, never the persisted app client: see query/client.ts.

const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';
const CURRENCIES = ['EUR', 'ILS', 'GBP', 'RUB', 'AED', 'CNY'];

/** [base, quote] — rate = units of quote per 1 base. Web's FIXED_PAIRS, same order. */
export const FX_PAIRS: [string, string][] = [
  ['EUR', 'USD'],
  ['USD', 'ILS'],
  ['EUR', 'ILS'],
  ['USD', 'RUB'],
  ['GBP', 'USD'],
  ['EUR', 'RUB'],
  ['GBP', 'EUR'],
  ['GBP', 'ILS'],
  ['USD', 'AED'],
  ['USD', 'CNY'],
];

/**
 * Web's getCrossRate, verbatim: `rates` are USD-base (rates[X] = X per 1 USD),
 * so cross A/B = rates[B] / rates[A], with USD itself implicitly 1.
 */
export function crossRate(
  rates: Record<string, number> | null | undefined,
  base: string,
  quote: string
): number | null {
  if (!rates) return null;
  const rBase = base === 'USD' ? 1 : rates[base];
  const rQuote = quote === 'USD' ? 1 : rates[quote];
  if (!rBase || !rQuote) return null;
  return rQuote / rBase;
}

export interface FxPair {
  key: string;
  base: string;
  quote: string;
  label: string;
  rate: number | null;
}

export function useExchangeRates() {
  const query = useQuery(
    {
      queryKey: ['fx-rates'],
      staleTime: 30 * 60 * 1000,
      refetchInterval: 30 * 60 * 1000,
      queryFn: async () => {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error('Failed to fetch exchange rates');
        const data = await res.json();
        const rates: Record<string, number> = { USD: 1 };
        CURRENCIES.forEach((c) => {
          if (data?.rates?.[c] != null) rates[c] = Number(data.rates[c]);
        });
        return { rates, date: (data?.date as string) || null };
      },
    },
    marketsQueryClient
  );

  const rates = query.data?.rates;
  const pairs = useMemo<FxPair[]>(
    () =>
      FX_PAIRS.map(([base, quote]) => ({
        key: `fx-${base}-${quote}`,
        base,
        quote,
        label: `${base}/${quote}`,
        rate: crossRate(rates, base, quote),
      })),
    [rates]
  );

  return {
    pairs,
    date: query.data?.date || null,
    isLoading: query.isLoading,
    isError: query.isError,
    refresh: () => query.refetch(),
  };
}
