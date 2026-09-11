'use client';

import { useMemo } from 'react';
import HeadlineTicker from './HeadlineTicker';
import useExchangeRates from '../../hooks/useExchangeRates';
import useMetalPrices from '../../hooks/useMetalPrices';
import { BtnIcon } from '../buttonIcons';
import { HiCube, HiCurrencyDollar } from 'react-icons/hi';
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

const makeFlagIcon = (cc) => {
    const code = (cc || 'un').toLowerCase();
    const FlagIcon = ({ className = '' }) => {
        if (code === 'eu') {
            return (
                <div className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 12, background: 'var(--brand-deep)', borderRadius: 2 }}>
                    <FaEuroSign style={{ color: 'var(--warn-text)', width: 12, height: 12 }} />
                </div>
            );
        }
        return <div className={className} style={{ lineHeight: 0 }}><Flag code={code} style={{ width: 18, height: 12 }} /></div>;
    };
    FlagIcon.displayName = `FlagIcon(${code})`;
    return FlagIcon;
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

// How old a rate may be before the strip calls it delayed. The feed updates every
// minute; half an hour leaves room for a quiet market without crying wolf.
const DELAYED_AFTER_MS = 30 * 60 * 1000;

const STAMP = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

/* The right-hand side of each strip: WHEN these numbers are from, in the viewer's
   own clock, whether they are current, and a way to fetch them now.

   The metals strip used to print the provider's `date` alone — a UTC calendar
   date with no time, so it read yesterday for a UAE user until 04:00, and it said
   nothing at all when the route was handing back a copy from before an outage.
   The FX strip had no date and no refresh. */
function FeedStatus({ label, time, stale, loading, error, onRefresh, what, note }) {
    const delayed = !!time && (stale || Date.now() - time.getTime() > DELAYED_AFTER_MS);
    const text = time ? `${label} · ${STAMP.format(time)}` : loading ? 'Loading…' : error ? 'Unavailable' : '';
    const title = !time
        ? (error || '')
        : [
            delayed
                ? (stale ? 'Delayed — the provider is not responding; these are the last rates received' : 'Delayed — no newer rate has been published')
                : 'Live',
            `as of ${STAMP.format(time)} (your time)`,
            note,
        ].filter(Boolean).join(' · ');

    return (
        <div className="flex items-center gap-2" title={title}>
            {time && (
                <span
                    aria-hidden="true"
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: delayed ? 'var(--warn-text)' : 'var(--ok-text)' }}
                />
            )}
            {text && (
                <span className="responsiveTextInput font-medium tabular-nums whitespace-nowrap" style={{ color: 'var(--endeavour)' }}>
                    {text}
                </span>
            )}
            {delayed && (
                <span className="responsiveTextTable font-medium whitespace-nowrap" style={{ color: 'var(--warn-text)' }}>
                    Delayed
                </span>
            )}
            <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title={`Refresh ${what}`}
                aria-label={`Refresh ${what}`}
                className="inline-flex text-[var(--endeavour)] hover:opacity-70 transition disabled:opacity-50"
            >
                <BtnIcon action="refresh" spin={loading} />
            </button>
        </div>
    );
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
                change: m.change,
                change_pct: m.change_pct,
            }));
    }, [metals.prices, metals.formatPrice]);

    return (
        <div className={['mt-3 mb-2 space-y-3', className].join(' ')}>

            {/* ===== FX ===== */}
            <HeadlineTicker
                variant="fx"
                title="Exchange Rates"
                leftIcon={HiCurrencyDollar}
                rightSlot={
                    <FeedStatus
                        label={fx.source === 'daily' ? 'Daily FX' : 'FX'}
                        time={fx.rateTime}
                        stale={fx.stale}
                        loading={fx.loading}
                        error={fx.error}
                        onRefresh={fx.refresh}
                        what="exchange rates"
                        note={fx.source === 'daily' ? 'live feed unavailable, showing the once-a-day rate' : null}
                    />
                }
                items={fxItems}
                speed={50}
                pauseOnHover
                rightToLeft
                gap={18}
            />

            {/* ===== METALS ===== */}
            <HeadlineTicker
                variant="metal"
                title="Metal Prices"
                leftIcon={HiCube}
                rightSlot={
                    <FeedStatus
                        label="LME"
                        time={metals.rateTime}
                        stale={metals.stale}
                        loading={metals.loading}
                        error={metals.error}
                        onRefresh={metals.refresh}
                        what="metal prices"
                    />
                }
                items={metalItems}
                speed={50}
                pauseOnHover
                rightToLeft
                gap={22}
            />
        </div>
    );
}
