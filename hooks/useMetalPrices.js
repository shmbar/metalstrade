'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'metal-prices-history';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveHistory(history) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(history)); } catch {}
}

function getPrice24hAgo(history, sym) {
    const target = Date.now() - DAY_MS;
    let closest = null;
    let closestDiff = Infinity;
    for (const entry of history) {
        if (entry.prices?.[sym]?.price == null) continue;
        const diff = Math.abs(entry.ts - target);
        if (diff < closestDiff) {
            closestDiff = diff;
            closest = entry.prices[sym].price;
        }
    }
    return closest;
}

/* Polls /api/metal-prices every 60 s — the route's own TTL, so each poll can land
   on a new minute's prices.

   `rateTime` is when metals-api stamped the prices, as a Date in the viewer's
   clock. The ticker prints that, not the provider's `date`, which is a UTC
   calendar date and so read yesterday for a UAE user until 04:00 local.
   `stale` means the prices are the last good ones — the route's provider is
   failing, or this browser could not reach the route.

   `loading` is the first load and a manual refresh only. It used to flip on every
   60 s poll, which blinked the ticker label to "Loading…" once a minute.
   `refresh()` asks the route to skip its cache (?fresh=1). */
export default function useMetalPrices(refreshInterval = 60 * 1000) {
    const [prices, setPrices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [apiDate, setApiDate] = useState(null);
    const [rateTime, setRateTime] = useState(null);
    const [stale, setStale] = useState(false);
    const hasPricesRef = useRef(false);

    const fetchPrices = useCallback(async (manual = false) => {
        if (manual) setLoading(true);
        try {
            const res = await fetch(manual ? '/api/metal-prices?fresh=1' : '/api/metal-prices', { cache: 'no-store' });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json.prices) throw new Error(json.error || `HTTP ${res.status}`);

            const incoming = json.prices || {};

            const history = loadHistory();

            Object.entries(incoming).forEach(([sym, m]) => {
                if (m.change == null && m.price != null) {
                    const prev = getPrice24hAgo(history, sym);
                    if (prev != null) {
                        m.change = Math.round((m.price - prev) * 100) / 100;
                        m.change_pct = prev !== 0
                            ? Math.round(((m.price - prev) / prev) * 10000) / 100
                            : null;
                    }
                }
            });

            const now = Date.now();
            const snapshot = Object.fromEntries(
                Object.entries(incoming).map(([sym, m]) => [sym, { price: m.price }])
            );

            const lastEntry = history[history.length - 1];
            if (!lastEntry || now - lastEntry.ts >= 10 * 60 * 1000) {
                history.push({ ts: now, prices: snapshot });
            }

            const cutoff = now - MAX_AGE_MS;
            const trimmed = history.filter(e => e.ts >= cutoff);
            saveHistory(trimmed);

            setPrices(incoming);
            setApiDate(json.date || null);
            setRateTime(json.timestamp ? new Date(json.timestamp * 1000) : null);
            setStale(!!json.stale);
            setError(json.stale ? (json.error || 'Price provider unavailable') : null);
            setLastUpdated(new Date());
            hasPricesRef.current = true;
        } catch (err) {
            // Keep the prices already on screen, but stop calling them current.
            if (hasPricesRef.current) setStale(true);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const refresh = useCallback(() => fetchPrices(true), [fetchPrices]);

    useEffect(() => {
        fetchPrices(false);
        const interval = setInterval(() => fetchPrices(false), refreshInterval);
        return () => clearInterval(interval);
    }, [fetchPrices, refreshInterval]);

    const formatPrice = useCallback((price) => {
        if (price == null) return '—';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
    }, []);

    return { prices, loading, error, lastUpdated, apiDate, rateTime, stale, refresh, formatPrice };
}
