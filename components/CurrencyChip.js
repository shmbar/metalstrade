'use client';
import React from 'react';
import { TONES, toneChipStyle } from './statusUtils';
import { curSymbol, curTone } from '../utils/currency';

// The currency chip. One definition, used by every table that has a currency
// column (/contracts, /salescontracts, /invoices, /expenses, /accstatement,
// /companyexpenses) so the same value looks the same on all of them.
//
// Built from TONES + toneChipStyle like every other chip in the app, so it follows
// the colour preset and flips correctly in dark mode. Sizing matches the status
// chips: rounded-full pill, table type size, 2px/12px padding.
export default function CurrencyChip({ cur, className = '', style }) {
    // curSymbol pads an unrecognised code ("GBP ") for the split badge's inline
    // prefix use; a centred chip wants the bare label.
    const symbol = curSymbol(cur).trim();
    if (!symbol) return null;

    return (
        <span
            className={`rounded-full responsiveTextTable font-medium ${className}`}
            style={{
                ...toneChipStyle(TONES[curTone(cur)]),
                padding: '2px 12px',
                minWidth: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
                ...style,
            }}
        >
            {symbol}
        </span>
    );
}
