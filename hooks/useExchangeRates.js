'use client';

import { useState, useEffect, useCallback } from 'react';

// Free API - no key required for basic usage
// Can be replaced with XE API or other providers later
const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

const CURRENCIES = ['EUR', 'ILS', 'GBP', 'RUB', 'AED', 'CNY'];

export default function useExchangeRates(refreshInterval = 30 * 60 * 1000) {
    const [rates, setRates] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchRates = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('Failed to fetch exchange rates');
            }

            const data = await response.json();

            // Extract only the currencies we need
            const filteredRates = {
                USD: 1,
                ...CURRENCIES.reduce((acc, cur) => {
                    acc[cur] = data.rates[cur];
                    return acc;
                }, {})
            };

            setRates(filteredRates);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err.message);
            console.error('Exchange rate fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and interval refresh
    useEffect(() => {
        fetchRates();

        const interval = setInterval(fetchRates, refreshInterval);
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
        refresh: fetchRates,
        convert,
        formatRate,
        currencies: ['USD', ...CURRENCIES]
    };
}
