import { describe, it, expect } from 'vitest';
import { PRIORITY, PRIORITY_ORDER, priorityOf, sortByPriority } from '../notificationPriority.js';

describe('priorityOf', () => {
    it('classifies past-due settlements as High', () => {
        expect(priorityOf({ type: 'settlement.overdue' })).toBe('high');
    });
    it('classifies contract readiness + ETA follow-up as High', () => {
        expect(priorityOf({ type: 'contract.delayed' })).toBe('high');
        expect(priorityOf({ type: 'shipment.eta14' })).toBe('high');
    });
    it('classifies money-in and early unpaid nags as Medium (not alarms)', () => {
        expect(priorityOf({ type: 'payment.recorded' })).toBe('medium');
        expect(priorityOf({ type: 'invoice.unpaid' })).toBe('medium');
    });
    it('classifies created records, warehouse/storage and comments as Low', () => {
        expect(priorityOf({ type: 'contract.created' })).toBe('low');
        expect(priorityOf({ type: 'stock.stale' })).toBe('low');
        expect(priorityOf({ type: 'anything', entityType: 'stock' })).toBe('low');
        expect(priorityOf({ type: 'comment.added' })).toBe('low');
        expect(priorityOf({ type: 'activity' })).toBe('low');
        expect(priorityOf({})).toBe('low'); // no type
    });
    it('defaults the rest to Medium', () => {
        expect(priorityOf({ type: 'invoice.finalized' })).toBe('medium');
        expect(priorityOf({ type: 'shipment.updated' })).toBe('medium');
        expect(priorityOf({ type: 'invoice.splitPending' })).toBe('medium');
        expect(priorityOf({ type: 'contract.updated' })).toBe('medium');
    });
    it('lets an explicit priority field override the type', () => {
        expect(priorityOf({ type: 'contract.created', priority: 'high' })).toBe('high');
        expect(priorityOf({ type: 'payment.recorded', priority: 'low' })).toBe('low');
        expect(priorityOf({ type: 'x', priority: 'bogus' })).toBe('medium'); // invalid priority → fall through to type rules (unknown type → medium)
        expect(priorityOf({ type: 'stock.stale', priority: 'bogus' })).toBe('low'); // invalid priority → type rule (stock → low)
    });
});

describe('priorityRank / PRIORITY', () => {
    it('ranks High < Medium < Low', () => {
        expect(PRIORITY.high.rank).toBeLessThan(PRIORITY.medium.rank);
        expect(PRIORITY.medium.rank).toBeLessThan(PRIORITY.low.rank);
    });
    it('PRIORITY_ORDER is High → Medium → Low', () => {
        expect(PRIORITY_ORDER).toEqual(['high', 'medium', 'low']);
    });
});

describe('sortByPriority', () => {
    it('sorts by priority (High→Low) then newest first', () => {
        const rows = [
            { id: 'a', type: 'contract.created', createdAtMs: 100 },    // low, old
            { id: 'b', type: 'settlement.overdue', createdAtMs: 200 },  // high, older
            { id: 'c', type: 'settlement.overdue', createdAtMs: 300 },  // high, newer
            { id: 'd', type: 'invoice.finalized', createdAtMs: 250 },   // medium
            { id: 'e', type: 'stock.stale', createdAtMs: 400 },         // low, newest
        ];
        expect(sortByPriority(rows).map(r => r.id)).toEqual(['c', 'b', 'd', 'e', 'a']);
    });
    it('does not mutate the input', () => {
        const rows = [{ id: '1', type: 'stock.stale', createdAtMs: 1 }, { id: '2', type: 'payment.recorded', createdAtMs: 2 }];
        const copy = [...rows];
        sortByPriority(rows);
        expect(rows).toEqual(copy);
    });
});
