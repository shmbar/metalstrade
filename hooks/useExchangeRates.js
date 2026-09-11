'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* Exchange rates for the dashboard: the ticker strip, and the EUR→USD figure the
   dashboard converts euro totals with.

   Primary: the `fx` block of /api/metal-prices — metals-api, the same paid,
   minute-updated plan as the metal prices, fetched in the same upstream call so
   it costs no extra quota. Fallback: exchangerate-api's open feed, which is what
   this hook used to call directly. That feed publishes ONCE a day (00:00 UTC), so
   the strip was showing a day's rate with no date on it and no way to refresh.

   The shape is unchanged: `rates` is USD-based (rates.EUR = euros per 1 USD).
   `rateTime` is when the provider stamped the rates; `source` is 'live' or
   'daily'; `stale` means these are the last good rates, not current ones.

   Not the rate contracts are saved at — that is /api/fx (ECB reference rates),
   deliberately separate. */
const FALLBACK_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

const CURRENCIES = ['EUR', 'ILS', 'GBP', 'RUB', 'AED', 'CNY'];

const pickRates = (all) => ({ USD: 1, ...Object.fromEntries(CURRENCIES.map((c) => [c, Number(all?.[c])])) });
const isComplete = (r) => CURRENCIES.every((c) => r[c] > 0);

async function fromLive(manual) {
    const res = await fetch(manual ? '/api/metal-prices?fresh=1' : '/api/metal-prices', { cache: 'no-store' });
    const json = await res.json();
    const rates = pickRates(json?.fx);
    if (!isComplete(rates)) throw new Error(json?.error || 'live FX unavailable');
    return {
        rates,
        time: json.timestamp ? new Date(json.timestamp * 1000) : null,
        source: 'live',
        stale: !!json.stale,
    };
}

async function fromDaily() {
    const res = await fetch(FALLBACK_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch exchange rates');
    const data = await res.json();
    return {
        rates: pickRates(data.rates),
        time: data.time_last_updated ? new Date(data.time_last_updated * 1000) : null,
        source: 'daily',
        stale: false,
    };
}

export default function useExchangeRates(refreshInterval = 60 * 1000) {
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [rateTime, setRateTime] = useState(null);
    const [source, setSource] = useState(null);
    const [stale, setStale] = useState(false);
    const hasRatesRef = useRef(false);

    const fetchRates = useCallback(async (manual = false) => {
        if (manual) setLoading(true);
        try {
            const got = await fromLive(manual).catch(() => fromDaily());
            setRates(got.rates);
            setRateTime(got.time);
            setSource(got.source);
            setStale(got.stale);
            setError(null);
            setLastUpdated(new Date());
            hasRatesRef.current = true;
        } catch (err) {
            if (hasRatesRef.current) setStale(true);
            setError(err.message);
            console.error('Exchange rate fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(() => fetchRates(true), [fetchRates]);

    // Initial fetch and interval refresh
    useEffect(() => {
        fetchRates(false);
        const interval = setInterval(() => fetchRates(false), refreshInterval);
        return () => clearInterval(interval);
    }, [fetchRates, refreshInterval]);

    // Convert amount from one currency to another
    const convert = useCallback((amount, from, to) => {
        if (!rates || !rates[from] || !rates[to]) return null;

        // Convert to USD first, then to target currency
        const inUSD = from === 'USD' ? amount : amount / rates[from];
        return to === 'USD' ? inUSD : inUSD * rates[to];
    }, [rates]);

    // Format rate for display
    const formatRate = useCallback((rate, decimals = 4) => {
        if (rate === null || rate === undefined) return '—';
        return rate.toFixed(decimals);
    }, []);

    return {
        rates,
        loading,
        error,
        lastUpdated,
        rateTime,
        source,
        stale,
        refresh,
        convert,
        formatRate,
        currencies: ['USD', ...CURRENCIES]
    };
}
