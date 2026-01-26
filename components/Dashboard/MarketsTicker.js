'use client';

import { useMemo, useState } from 'react';
import HeadlineTicker from './HeadlineTicker';
import useExchangeRates from '../../hooks/useExchangeRates';
import useMetalPrices from '../../hooks/useMetalPrices';
import { HiRefresh, HiCube, HiCubeTransparent } from 'react-icons/hi';
import {
  FaDollarSign,
  FaEuroSign,
  FaPoundSign,
  FaRubleSign,
} from 'react-icons/fa';
import { TbCurrencyShekel } from 'react-icons/tb';
import Flag from 'react-world-flags';

const currencyNames = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  ILS: 'Israeli Shekel',
  RUB: 'Russian Ruble',
};

const currencyIcons = {
  USD: FaDollarSign,
  EUR: FaEuroSign,
  GBP: FaPoundSign,
  ILS: TbCurrencyShekel,
  RUB: FaRubleSign,
};

const currencySymbols = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  ILS: '₪',
  RUB: '₽',
};

// use emoji flags as lightweight country icons matching the currency
const currencyCountry = {
  USD: 'US',
  EUR: 'EU',
  GBP: 'GB',
  ILS: 'IL',
  RUB: 'RU',
};

const makeFlagIcon = (cc) => ({ className = '' }) => {
  const code = (cc || 'un').toLowerCase();
  // react-world-flags may not include an 'eu' asset everywhere — provide a simple fallback
  if (code === 'eu') {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 18,
          height: 12,
          background: '#003399',
          borderRadius: 2,
          lineHeight: 0,
        }}
      >
        <FaEuroSign style={{ color: '#FFD700', width: 12, height: 12 }} />
      </div>
    );
  }

  return (
    <div className={className} style={{ lineHeight: 0 }}>
      <Flag code={code} style={{ width: 18, height: 12 }} />
    </div>
  );
};

const metalIcons = {
  nickel: HiCube,
  copper: HiCubeTransparent,
};

export default function MarketsTicker({ className = '' }) {
  const fx = useExchangeRates();
  const metals = useMetalPrices();

  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [fxRefreshing, setFxRefreshing] = useState(false);

  const getFxRate = (rates, currency) => {
    if (!rates || !rates[currency]) return null;
    if (baseCurrency === 'USD') return rates[currency];
    return rates[currency] / rates[baseCurrency];
  };

  const fxItems = useMemo(() => {
    const list = ['USD', 'EUR', 'GBP', 'ILS', 'RUB'].filter((c) => c !== baseCurrency);

    return list.map((c) => {
      const r = getFxRate(fx.rates, c);
      const pairLabel = `${c}/${baseCurrency}`;
      const cc = currencyCountry[c] || 'UN';
      const FlagIcon = makeFlagIcon(cc);

      return {
        key: `fx-${c}`,
        icon: FlagIcon,
        label: pairLabel,
        value: r ? `${fx.formatRate(r)} ${currencySymbols[c] || ''}` : '—',
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx.rates, baseCurrency]);

  const metalItems = useMemo(() => {
    return ['nickel', 'copper'].map((k) => {
      const m = metals.prices?.[k];
      if (!m) {
        return {
          key: `m-${k}`,
          icon: metalIcons[k],
          label: k.toUpperCase(),
          value: '—',
          subValue: '',
        };
      }

      const ch = m.change ?? null;
      const pct = m.changePercent ?? null;
      const sign = ch !== null ? (ch >= 0 ? '+' : '') : '';

      return {
        key: `m-${k}`,
        icon: metalIcons[k],
        label: `${m.name || k} (${m.unit || 'USD/MT'})`,
        value: metals.formatPrice(m.price),
        subValue: ch !== null ? `${sign}${ch.toFixed(2)} (${(pct ?? 0).toFixed(2)}%)` : '',
      };
    });
  }, [metals.prices, metals]);

  const fxSubtitle = fx.error
    ? 'Failed to load'
    : fx.loading
    ? 'Loading…'
    : `Base: ${baseCurrency}`;

  const metalSubtitle = metals.error
    ? 'Failed to load'
    : metals.loading
    ? 'Loading…'
    : 'LME Spot Prices';

  const refreshFx = async () => {
    try {
      setFxRefreshing(true);
      const res = fx.refresh?.();
      if (res && typeof res.then === 'function') await res;
    } finally {
      setTimeout(() => setFxRefreshing(false), 400);
    }
  };

  const refreshMetals = () => metals.refresh?.();

  const BaseIcon = makeFlagIcon(currencyCountry[baseCurrency] || 'UN');

  return (
    <div className={['mt-3 mb-2 space-y-2', className].join(' ')}>
      {/* ===== FX ===== */}
      <div className="flex items-center gap-2 px-1 mb-1">
        <span className="font-semibold text-[var(--endeavour)] text-base flex items-center">
          {/* Flag icon for base currency */}
          <span style={{ display: "inline-flex", alignItems: "center", marginRight: 8 }}>
            {makeFlagIcon(currencyCountry[baseCurrency] || 'UN')({})}
          </span>
          Exchange Rates
        </span>
        {/* base selector INLINE with heading (desktop) */}
        <div className="hidden md:flex items-center gap-1 ml-3">
          {['USD', 'EUR', 'GBP', 'ILS', 'RUB'].map((cur) => (
            <button
              key={cur}
              onClick={() => setBaseCurrency(cur)}
              className={[
                'px-3 py-1 rounded-full text-xs font-semibold transition',
                baseCurrency === cur
                  ? 'bg-[var(--endeavour)] text-white'
                  : 'bg-[var(--selago)] text-[var(--port-gore)] hover:bg-[var(--rock-blue)]/30',
              ].join(' ')}
            >
              {cur}
            </button>
          ))}
        </div>
      </div>
      <HeadlineTicker
        variant="fx"
       
        leftIcon={null}
        
       
        items={fxItems}
        speed={50}
        pauseOnHover
        rightToLeft
        gap={22}
      />

      {/* base selector (mobile) */}
      <div className="flex md:hidden items-center gap-2 px-1 -mt-1 mb-1">
        {['USD', 'EUR', 'GBP', 'ILS', 'RUB'].map((cur) => (
          <button
            key={cur}
            onClick={() => setBaseCurrency(cur)}
            className={[
              'px-3 py-1 rounded-full text-xs font-semibold transition',
              baseCurrency === cur
                ? 'bg-[var(--endeavour)] text-white'
                : 'bg-[var(--selago)] text-[var(--port-gore)] hover:bg-[var(--rock-blue)]/30',
            ].join(' ')}
          >
            {cur}
          </button>
        ))}
      </div>

      {/* ===== METALS ===== */}
      <div className="flex items-center gap-2 px-1 mb-1 mt-2">
        <span className="font-semibold text-[var(--endeavour)] text-base flex items-center">
          <HiCube className="mr-2" />
          Metal Prices
        </span>
      </div>
      <HeadlineTicker
        variant="metal"
        
        leftIcon={null}
       
        items={metalItems}
        speed={50}
        pauseOnHover
        rightToLeft
        gap={26} // increased spacing so metals don't feel cramped
      />
    </div>
  );
}
