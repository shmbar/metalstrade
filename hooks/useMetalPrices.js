'use client';

import { useState, useEffect, useCallback } from 'react';

export default function useMetalPrices(refreshInterval = 30 * 60 * 1000) {
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
            setPrices(json.prices || {});
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
