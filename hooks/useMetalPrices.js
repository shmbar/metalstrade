'use client';

import { useState, useEffect, useCallback } from 'react';

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

export default function useMetalPrices(refreshInterval = 60 * 1000) {
    const [prices, setPrices] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [apiDate, setApiDate] = useState(null);

    const fetchPrices = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/metal-prices');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);

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
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrices();
        const interval = setInterval(fetchPrices, refreshInterval);
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

    return { prices, loading, error, lastUpdated, apiDate, refresh: fetchPrices, formatPrice };
}
