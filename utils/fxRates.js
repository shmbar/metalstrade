// Server-side FX rate fetcher.
// Uses frankfurter.app — free, no key, official ECB rates updated daily.
// Caches in memory for 24 hours to avoid hitting the API on every forecast call.

const RATES_TTL = 24 * 60 * 60 * 1000;
let cache = null; // { base: 'USD', rates: { EUR: 0.92, ... }, ts: number }

/**
 * Returns an object mapping foreign currency codes to their rate vs `base`.
 * `rates[base]` is implicitly 1. Codes the API doesn't know are returned as 1
 * (so amounts in that currency stay at face value rather than being lost).
 */
export async function getRates(base = 'USD') {
    const baseUC = (base || 'USD').toUpperCase();
    if (cache && cache.base === baseUC && Date.now() - cache.ts < RATES_TTL) {
        return cache.rates;
    }
    try {
        const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(baseUC)}`;
        const res = await fetch(url, { next: { revalidate: 0 } });
        if (!res.ok) throw new Error('FX API failed');
        const data = await res.json();
        const rates = { ...(data.rates || {}), [baseUC]: 1 };
        cache = { base: baseUC, rates, ts: Date.now() };
        return rates;
    } catch {
        // Network or API failure — return a usable fallback so the forecast still renders
        if (cache?.rates) return cache.rates;
        return { [baseUC]: 1 };
    }
}

/**
 * Converts an amount from `fromCur` to `toBase` using a rates table that's
 * already in the shape `getRates(toBase)` returns. If the rate is unknown,
 * returns the original amount unchanged (better than dropping it silently).
 */
export function convert(amount, fromCur, toBase, rates) {
    if (!Number.isFinite(amount)) return 0;
    const from = (fromCur || toBase).toUpperCase();
    const to = (toBase || 'USD').toUpperCase();
    if (from === to) return amount;
    const rate = rates?.[from];
    if (!rate || rate === 0) return amount;
    // frankfurter returns "from base to X" rates. We have rates(toBase) so rates[from]
    // is "how many `from` units equal 1 toBase". Convert: amount / rate.
    return amount / rate;
}
