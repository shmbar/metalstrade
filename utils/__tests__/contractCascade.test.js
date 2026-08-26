import { describe, it, expect } from 'vitest';
import { planContractDeletion, yearBucketOf } from '../contractCascadePlan.js';

describe('planContractDeletion', () => {
  it('counts every kind of record a contract holds', () => {
    const plan = planContractDeletion({
      invoices: [{ id: 'i1', invoice: '0032' }, { id: 'i2', invoice: '0033' }],
      expenses: [{ id: 'e1', expense: 'Freight' }],
      stock: ['s1', 's2', 's3'],
      poInvoices: [{ id: 'p1', inv: '0032FN' }],
    });
    expect(plan.invoices).toHaveLength(2);
    expect(plan.expenses).toHaveLength(1);
    expect(plan.stockIds).toHaveLength(3);
    expect(plan.poInvoices).toHaveLength(1);
    expect(plan.total).toBe(7);
  });

  it('is empty for an untouched contract, so the dialog shows no list', () => {
    expect(planContractDeletion({}).total).toBe(0);
    expect(planContractDeletion({ invoices: [], expenses: [], stock: [], poInvoices: [] }).total).toBe(0);
  });

  it('ignores entries with no id — there is nothing to delete', () => {
    const plan = planContractDeletion({
      invoices: [{ invoice: '0032' }, { id: 'i2' }],
      stock: ['s1', '', null],
    });
    expect(plan.invoices).toHaveLength(1);
    expect(plan.stockIds).toEqual(['s1']);
  });
});

describe('yearBucketOf', () => {
  it('reads the year from every date shape a record carries', () => {
    expect(yearBucketOf('2026-04-09')).toBe('2026');
    expect(yearBucketOf('14-May-2026')).toBe('2026');   // finalized form
    expect(yearBucketOf({ startDate: '2025-12-31' })).toBe('2025');
    expect(yearBucketOf({ date: '2024-01-02' })).toBe('2024');
  });

  it('returns empty rather than guessing — a wrong year deletes nothing silently', () => {
    expect(yearBucketOf('')).toBe('');
    expect(yearBucketOf(null)).toBe('');
    expect(yearBucketOf(undefined)).toBe('');
    expect(yearBucketOf({})).toBe('');
    expect(yearBucketOf('not a date')).toBe('');
  });
});
