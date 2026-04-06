'use client';

import { useMemo } from 'react';
import HeadlineTicker from './HeadlineTicker';
import useExchangeRates from '../../hooks/useExchangeRates';
import useMetalPrices from '../../hooks/useMetalPrices';
import { HiCube, HiRefresh } from 'react-icons/hi';
import { FaEuroSign } from 'react-icons/fa';
import Flag from 'react-world-flags';

const currencyCountry = { USD: 'US', EUR: 'EU', GBP: 'GB', ILS: 'IL', RUB: 'RU', AED: 'AE', CNY: 'CN' };

// 10 fixed pairs: [base, quote] — rate = how many quote per 1 base
const FIXED_PAIRS = [
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

const makeFlagIcon = (cc) => ({ className = '' }) => {
    const code = (cc || 'un').toLowerCase();
    if (code === 'eu') {
        return (
            <div className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 12, background: '#003399', borderRadius: 2 }}>
                <FaEuroSign style={{ color: '#FFD700', width: 12, height: 12 }} />
            </div>
        );
    }
    return <div className={className} style={{ lineHeight: 0 }}><Flag code={code} style={{ width: 18, height: 12 }} /></div>;
};

// rates are USD-base (rates[X] = units of X per 1 USD)
// cross-pair A/B = rates[B] / rates[A]
// rates[USD] = 1
function getCrossRate(rates, base, quote) {
    if (!rates) return null;
    const rBase = base === 'USD' ? 1 : rates[base];
    const rQuote = quote === 'USD' ? 1 : rates[quote];
    if (!rBase || !rQuote) return null;
    return rQuote / rBase;
}

export default function MarketsTicker({ className = '' }) {
    const fx = useExchangeRates();
    const metals = useMetalPrices();

    const fxItems = useMemo(() => {
        return FIXED_PAIRS.map(([base, quote]) => {
            const rate = getCrossRate(fx.rates, base, quote);
            return {
                key: `fx-${base}-${quote}`,
                icon: makeFlagIcon(currencyCountry[base] || 'UN'),
                label: `${base}/${quote}`,
                value: rate != null ? fx.formatRate(rate) : '—',
            };
        });
    }, [fx.rates, fx.formatRate]);

    const metalItems = useMemo(() => {
        if (!metals.prices) return [];
        // Sort by order field defined in METAL_META
        return Object.entries(metals.prices)
            .sort((a, b) => (a[1].order ?? 99) - (b[1].order ?? 99))
            .map(([sym, m]) => ({
                key: `m-${sym}`,
                icon: HiCube,
                label: `${m.name} (${m.unit || 'USD/MT'})`,
                value: metals.formatPrice(m.price),
            }));
    }, [metals.prices, metals.formatPrice]);

    // Format last-updated timestamp
    const updatedLabel = useMemo(() => {
        if (metals.loading) return 'Loading…';
        if (metals.error) return 'Failed to load';
        if (!metals.lastUpdated) return '';
        const d = metals.lastUpdated;
        const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${date} · ${time}`;
    }, [metals.lastUpdated, metals.loading, metals.error]);

    return (
        <div className={['mt-3 mb-2 space-y-2', className].join(' ')}>

            {/* ===== FX ===== */}
            <div className="flex items-center gap-2 px-1 mb-1">
                <span className="font-semibold text-[var(--endeavour)] text-base flex items-center">
                    Exchange Rates
                </span>
            </div>
            <HeadlineTicker variant="fx" leftIcon={null} items={fxItems} speed={50} pauseOnHover rightToLeft gap={22} />

            {/* ===== METALS ===== */}
            <div className="flex items-center justify-between px-1 mb-1 mt-2">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--endeavour)] text-base flex items-center">
                        <HiCube className="mr-2" />
                        Metal Prices
                    </span>
                    <button
                        onClick={metals.refresh}
                        title="Refresh metal prices"
                        className="text-[var(--endeavour)] hover:opacity-70 transition"
                    >
                        <HiRefresh className="w-4 h-4" />
                    </button>
                </div>
                {updatedLabel && (
                    <span style={{ fontSize: '11px', color: '#6b8fb5' }}>
                        {metals.apiDate ? `LME · ${metals.apiDate}` : ''}{metals.apiDate && metals.lastUpdated ? ' · ' : ''}{metals.lastUpdated ? updatedLabel.split('·')[1]?.trim() || '' : updatedLabel}
                    </span>
                )}
            </div>
            <HeadlineTicker variant="metal" leftIcon={null} items={metalItems} speed={40} pauseOnHover rightToLeft gap={26} />
        </div>
    );
}
