'use client';

import { useState } from 'react';
import useExchangeRates from '../../hooks/useExchangeRates';
import { HiRefresh } from 'react-icons/hi';
import { FaDollarSign, FaEuroSign, FaPoundSign, FaRubleSign } from 'react-icons/fa';
import { TbCurrencyShekel } from 'react-icons/tb';

const currencyIcons = {
    USD: FaDollarSign,
    EUR: FaEuroSign,
    GBP: FaPoundSign,
    ILS: TbCurrencyShekel,
    RUB: FaRubleSign,
};

const currencyColors = {
    USD: 'from-green-500 to-emerald-600',
    EUR: 'from-blue-500 to-indigo-600',
    GBP: 'from-purple-500 to-violet-600',
    ILS: 'from-cyan-500 to-teal-600',
    RUB: 'from-red-500 to-rose-600',
};

const currencyNames = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    ILS: 'Israeli Shekel',
    RUB: 'Russian Ruble',
};

export default function CurrencyWidget() {
    const { rates, loading, error, lastUpdated, refresh, formatRate } = useExchangeRates();
    const [baseCurrency, setBaseCurrency] = useState('USD');

    const getRate = (currency) => {
        if (!rates || !rates[currency]) return null;
        if (baseCurrency === 'USD') {
            return rates[currency];
        }
        // Convert: 1 baseCurrency = X currency
        return rates[currency] / rates[baseCurrency];
    };

    const formatTime = (date) => {
        if (!date) return '';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (error) {
        return (
            <div className="bg-[#f8fbff] rounded-2xl border border-[#b8ddf8] p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold font-poppins text-[var(--chathams-blue)]">Exchange Rates</h3>
                    <button onClick={refresh} className="p-2 hover:bg-[var(--selago)] rounded-lg transition-colors">
                        <HiRefresh className="w-5 h-5 text-[var(--regent-gray)]" />
                    </button>
                </div>
                <div className="text-red-500 text-sm">Failed to load rates. Click refresh to try again.</div>
            </div>
        );
    }

    return (
        <div className="bg-[#f8fbff] rounded-2xl border border-[#b8ddf8] overflow-hidden transition-all duration-300">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[var(--endeavour)] to-[var(--chathams-blue)] rounded-xl flex items-center justify-center">
                            <FaDollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold font-poppins text-[var(--chathams-blue)]">Exchange Rates</h3>
                            <p className="text-xs text-[var(--regent-gray)]">
                                Base: {currencyNames[baseCurrency]}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {lastUpdated && (
                            <span className="text-xs text-[var(--regent-gray)]">
                                {formatTime(lastUpdated)}
                            </span>
                        )}
                        <button
                            onClick={refresh}
                            disabled={loading}
                            className={`p-2 hover:bg-[var(--selago)] rounded-lg transition-colors ${loading ? 'animate-spin' : ''}`}
                        >
                            <HiRefresh className="w-5 h-5 text-[var(--regent-gray)]" />
                        </button>
                    </div>
                </div>

                {/* Base Currency Selector */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {['USD', 'EUR', 'GBP', 'ILS', 'RUB'].map((cur) => {
                        const Icon = currencyIcons[cur];
                        return (
                            <button
                                key={cur}
                                onClick={() => setBaseCurrency(cur)}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    baseCurrency === cur
                                        ? 'bg-[var(--endeavour)] text-white shadow-md'
                                        : 'bg-[var(--selago)] text-[var(--port-gore)] hover:bg-[var(--rock-blue)]/30'
                                }`}
                            >
                                <Icon className="w-3 h-3" />
                                {cur}
                            </button>
                        );
                    })}
                </div>

                {/* Currency Cards */}
                <div className="space-y-3">
                    {['USD', 'EUR', 'GBP', 'ILS', 'RUB']
                        .filter((cur) => cur !== baseCurrency)
                        .map((currency) => {
                            const Icon = currencyIcons[currency];
                            const rate = getRate(currency);
                            return (
                                <div
                                    key={currency}
                                    className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#d8e8f5] hover:bg-[#f0f7ff] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 bg-gradient-to-br ${currencyColors[currency]} rounded-lg flex items-center justify-center shadow`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--chathams-blue)]">{currency}</p>
                                            <p className="text-xs text-[var(--regent-gray)]">{currencyNames[currency]}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {loading ? (
                                            <div className="w-16 h-5 bg-[var(--selago)] animate-pulse rounded"></div>
                                        ) : (
                                            <>
                                                <p className="text-lg font-bold text-[var(--chathams-blue)]">
                                                    {formatRate(rate)}
                                                </p>
                                                <p className="text-xs text-[var(--regent-gray)]">
                                                    1 {baseCurrency} = {formatRate(rate)} {currency}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        </div>
    );
}
