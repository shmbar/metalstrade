import { describe, it, expect } from 'vitest';
import { statusTone, amountToneClass } from '../statusUtils.js';

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
        ['Partially Paid', 'Partly Shipped', 'Pending', 'Open', 'On Hold', 'In Transit', 'Processing']
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
    it('returns red for negatives (number or formatted string)', () => {
        expect(amountToneClass(-5)).toBe('text-red-600');
        expect(amountToneClass('-1,234.50')).toBe('text-red-600');
        expect(amountToneClass('-$2,000')).toBe('text-red-600');
    });
    it('returns green for positives (number or formatted string)', () => {
        expect(amountToneClass(10)).toBe('text-green-700');
        expect(amountToneClass('$1,000.00')).toBe('text-green-700');
    });
    it('returns empty for zero and non-numbers', () => {
        expect(amountToneClass(0)).toBe('');
        expect(amountToneClass('0.00')).toBe('');
        expect(amountToneClass('')).toBe('');
        expect(amountToneClass('abc')).toBe('');
        expect(amountToneClass(null)).toBe('');
        expect(amountToneClass(undefined)).toBe('');
    });
});
