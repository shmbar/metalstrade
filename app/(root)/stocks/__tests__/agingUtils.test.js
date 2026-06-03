import { describe, it, expect } from 'vitest';
import { dStr, arrivalOf, daysStored, bucketOf } from '../agingUtils.js';

describe('dStr', () => {
    it('returns string dates as-is', () => expect(dStr('2026-01-15')).toBe('2026-01-15'));
    it('extracts startDate from objects', () => expect(dStr({ startDate: '2026-02-01', endDate: '2026-02-10' })).toBe('2026-02-01'));
    it('falls back to endDate when no startDate', () => expect(dStr({ endDate: '2026-03-01' })).toBe('2026-03-01'));
    it('returns null for null / empty / garbage', () => {
        expect(dStr(null)).toBeNull();
        expect(dStr('')).toBeNull();
        expect(dStr({})).toBeNull();
        expect(dStr(123)).toBeNull();
    });
});

describe('arrivalOf', () => {
    it('returns the earliest arrival across in-records (string + object dates)', () => {
        const row = {
            data: [
                { type: 'in', indDate: '2026-03-10' },
                { type: 'in', indDate: { startDate: '2026-01-05' } },
                { type: 'out', indDate: '2025-12-01' }, // out-record ignored
            ],
        };
        expect(arrivalOf(row).toISOString().slice(0, 10)).toBe('2026-01-05');
    });

    it('ignores out-records when picking arrival', () => {
        const row = { data: [{ type: 'out', indDate: '2025-01-01' }, { type: 'in', indDate: '2026-06-01' }] };
        expect(arrivalOf(row).toISOString().slice(0, 10)).toBe('2026-06-01');
    });

    it('treats records without a type as in-records', () => {
        expect(arrivalOf({ data: [{ indDate: '2026-05-05' }] }).toISOString().slice(0, 10)).toBe('2026-05-05');
    });

    it('falls back to contractData.date when no indDate present', () => {
        const row = { data: [{ type: 'in', contractData: { date: '2026-04-01' } }] };
        expect(arrivalOf(row).toISOString().slice(0, 10)).toBe('2026-04-01');
    });

    it('returns null when nothing usable', () => {
        expect(arrivalOf({ data: [] })).toBeNull();
        expect(arrivalOf({})).toBeNull();
        expect(arrivalOf(null)).toBeNull();
        expect(arrivalOf({ data: [{ type: 'in', indDate: 'not-a-date' }] })).toBeNull();
    });
});

describe('daysStored', () => {
    it('computes whole days from arrival to now', () => {
        const arrival = new Date('2026-01-01T00:00:00Z');
        const now = new Date('2026-01-11T00:00:00Z').getTime();
        expect(daysStored(arrival, now)).toBe(10);
    });
    it('floors partial days', () => {
        const arrival = new Date('2026-01-01T00:00:00Z');
        const now = new Date('2026-01-02T18:00:00Z').getTime(); // 1.75 days
        expect(daysStored(arrival, now)).toBe(1);
    });
    it('returns null when no arrival', () => expect(daysStored(null, Date.now())).toBeNull());
});

describe('bucketOf', () => {
    it('buckets ages at the right boundaries', () => {
        expect(bucketOf(0)).toBe('0-30');
        expect(bucketOf(30)).toBe('0-30');
        expect(bucketOf(31)).toBe('31-60');
        expect(bucketOf(60)).toBe('31-60');
        expect(bucketOf(61)).toBe('61-90');
        expect(bucketOf(90)).toBe('61-90');
        expect(bucketOf(91)).toBe('90+');
        expect(bucketOf(500)).toBe('90+');
    });
    it('returns unknown for null age', () => expect(bucketOf(null)).toBe('unknown'));
});
