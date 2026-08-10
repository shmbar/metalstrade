import { describe, it, expect } from 'vitest';
import { statusTone, amountToneClass, amountToneColor, TONES } from '../statusUtils.js';

describe('statusTone', () => {
    it('maps positive / done statuses to green', () => {
        ['Paid', 'Final', 'Finished', 'Closed', 'Shipped', 'Completed', 'Delivered', 'Active', 'Approved']
            .forEach(s => expect(statusTone(s), s).toBe('green'));
    });

    it('maps negative / alert statuses to red', () => {
        ['Unpaid', 'Not Shipped', 'Unsold', 'Canceled', 'Cancelled', 'Overdue', 'Delayed', 'Rejected', 'Failed', 'Stale']
            .forEach(s => expect(statusTone(s), s).toBe('red'));
    });

    it('maps partial / in-progress statuses to amber', () => {
        ['Partially Paid', 'Partly Shipped', 'Pending', 'Open', 'On Hold', 'In Transit', 'Processing', 'In Progress', 'Ongoing']
            .forEach(s => expect(statusTone(s), s).toBe('amber'));
    });

    it('maps Draft to blue', () => {
        expect(statusTone('Draft')).toBe('blue');
    });

    // Ordering guards — the tricky cases the regex order exists to protect.
    it('keeps "Not Shipped" red, not green via the "shipped" keyword', () => {
        expect(statusTone('Not Shipped')).toBe('red');
    });
    it('keeps "Partly Shipped" amber, not green', () => {
        expect(statusTone('Partly Shipped')).toBe('amber');
    });
    it('keeps "Partially Paid" amber, not green via "paid"', () => {
        expect(statusTone('Partially Paid')).toBe('amber');
    });

    it('is case-insensitive', () => {
        expect(statusTone('paid')).toBe('green');
        expect(statusTone('UNPAID')).toBe('red');
        expect(statusTone('  Final  ')).toBe('green');
    });

    it('falls back to gray for empty / unknown', () => {
        expect(statusTone('')).toBe('gray');
        expect(statusTone(null)).toBe('gray');
        expect(statusTone(undefined)).toBe('gray');
        expect(statusTone('Xyzzy')).toBe('gray');
    });
});

describe('amountToneClass', () => {
    it('returns the danger token for negatives (number or formatted string)', () => {
        expect(amountToneClass(-5)).toBe('text-[var(--danger-text)]');
        expect(amountToneClass('-1,234.50')).toBe('text-[var(--danger-text)]');
        expect(amountToneClass('-$2,000')).toBe('text-[var(--danger-text)]');
    });
    // Changed 2026-08-08 with the palette revision: positives are the normal case
    // in a ledger and are no longer flagged green. Only the exception is coloured.
    it('leaves positives uncoloured (default ink)', () => {
        expect(amountToneClass(10)).toBe('');
        expect(amountToneClass('$1,000.00')).toBe('');
    });
    it('returns empty for zero and non-numbers', () => {
        expect(amountToneClass(0)).toBe('');
        expect(amountToneClass('0.00')).toBe('');
        expect(amountToneClass('')).toBe('');
        expect(amountToneClass('abc')).toBe('');
        expect(amountToneClass(null)).toBe('');
        expect(amountToneClass(undefined)).toBe('');
    });
    // No raw Tailwind palette name may leak out of this module — that is the
    // whole point of centralising here rather than in tailwind.config.
    it('never returns a raw palette class', () => {
        [-5, 10, 0, 'abc', null].forEach(v => {
            expect(amountToneClass(v)).not.toMatch(/(red|green|amber|orange|emerald|rose|pink)-[0-9]/);
        });
    });
});

describe('amountToneColor', () => {
    it('mirrors amountToneClass as a style value', () => {
        expect(amountToneColor(-5)).toBe('var(--danger-text)');
        expect(amountToneColor('-$2,000')).toBe('var(--danger-text)');
        expect(amountToneColor(10)).toBeUndefined();
        expect(amountToneColor(0)).toBeUndefined();
        expect(amountToneColor('abc')).toBeUndefined();
    });
});

describe('TONES', () => {
    // Every tone must be built from tokens, or chips stop following the colour
    // preset and stop flipping in dark mode.
    it('is entirely token-valued', () => {
        Object.entries(TONES).forEach(([name, t]) => {
            ['bg', 'text', 'border'].forEach(k => {
                expect(t[k], `${name}.${k}`).toMatch(/^var\(--[a-z-]+\)$/);
            });
        });
    });
    it('keeps the five tones visually distinct (no two share a text token)', () => {
        const texts = Object.values(TONES).map(t => t.text);
        expect(new Set(texts).size).toBe(texts.length);
    });
});
