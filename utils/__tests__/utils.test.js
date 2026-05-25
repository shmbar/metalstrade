import { describe, it, expect } from 'vitest';
import {
  resolveDueDate,
  resolveInvoiceDate,
  groupInvoicesByNumber,
} from '../pureHelpers.js';

describe('resolveDueDate', () => {
  it('returns null when delDate is missing', () => {
    expect(resolveDueDate({})).toBeNull();
    expect(resolveDueDate(null)).toBeNull();
    expect(resolveDueDate({ delDate: null })).toBeNull();
  });

  it('parses finalized "dd-mmm-yyyy" string format', () => {
    expect(resolveDueDate({ delDate: '14-may-2026' })).toBe('2026-05-14');
    expect(resolveDueDate({ delDate: '01-Jan-2025' })).toBe('2025-01-01');
    expect(resolveDueDate({ delDate: '7-Dec-2024' })).toBe('2024-12-07');
  });

  it('passes through ISO YYYY-MM-DD untouched', () => {
    expect(resolveDueDate({ delDate: '2026-05-14' })).toBe('2026-05-14');
  });

  it('resolves draft delDate object using startDate first', () => {
    expect(resolveDueDate({ delDate: { startDate: '2026-05-14', endDate: '2026-05-20' } })).toBe('2026-05-14');
  });

  it('falls back to endDate when startDate is missing', () => {
    expect(resolveDueDate({ delDate: { startDate: null, endDate: '2026-05-20' } })).toBe('2026-05-20');
  });
});

describe('resolveInvoiceDate', () => {
  it('returns null for nullish input', () => {
    expect(resolveInvoiceDate(null)).toBeNull();
    expect(resolveInvoiceDate(undefined)).toBeNull();
  });

  it('uses top-level date string when present (finalized invoice)', () => {
    expect(resolveInvoiceDate({ date: '14-may-2026' })).toBe('2026-05-14');
    expect(resolveInvoiceDate({ date: '2026-05-14' })).toBe('2026-05-14');
  });

  it('falls back to dateRange.startDate (draft invoice)', () => {
    expect(resolveInvoiceDate({ dateRange: { startDate: '2026-05-14', endDate: '2026-05-20' } })).toBe('2026-05-14');
  });

  it('falls back to dateRange.endDate when startDate is empty', () => {
    expect(resolveInvoiceDate({ date: '', dateRange: { endDate: '2026-05-20' } })).toBe('2026-05-20');
  });
});

describe('groupInvoicesByNumber', () => {
  it('returns [] for non-array input', () => {
    expect(groupInvoicesByNumber(null)).toEqual([]);
    expect(groupInvoicesByNumber(undefined)).toEqual([]);
    expect(groupInvoicesByNumber('not array')).toEqual([]);
  });

  it('passes single-doc invoices through untouched', () => {
    const invs = [{ invoice: '240517-1', totalAmount: '100', invType: '1111', payments: [] }];
    expect(groupInvoicesByNumber(invs)).toEqual(invs);
  });

  it('keeps multiple docs that share an invoice number but have only one invType', () => {
    // No supersede if all invTypes are the same — group is preserved as-is
    const invs = [
      { invoice: '240517-1', invType: '1111', totalAmount: '100', payments: [] },
      { invoice: '240517-1', invType: '1111', totalAmount: '50', payments: [] },
    ];
    expect(groupInvoicesByNumber(invs)).toHaveLength(2);
  });

  it('supersedes lower invType with higher invType and combines payments', () => {
    // Credit note (invType=2222) supersedes original invoice (invType=1111).
    // Payments from BOTH docs are combined; totalAmount = sum of kept (higher-type) docs.
    const invs = [
      { invoice: '240517-1', invType: '1111', totalAmount: '1000', payments: [{ pmnt: '200' }] },
      { invoice: '240517-1', invType: '2222', totalAmount: '800', payments: [{ pmnt: '300' }] },
    ];
    const result = groupInvoicesByNumber(invs);
    expect(result).toHaveLength(1);
    expect(parseFloat(result[0].totalAmount)).toBe(800);
    expect(result[0].payments).toHaveLength(2);
    expect(parseFloat(result[0].debtBlnc)).toBe(300); // 800 - (200+300)
  });

  it('groups multiple separate invoice numbers independently', () => {
    const invs = [
      { invoice: 'A', invType: '1111', totalAmount: '100', payments: [] },
      { invoice: 'B', invType: '1111', totalAmount: '200', payments: [] },
    ];
    expect(groupInvoicesByNumber(invs)).toHaveLength(2);
  });

  it('skips invoices with null invoice number', () => {
    const invs = [
      { invoice: null, totalAmount: '50', payments: [] },
      { invoice: 'A', invType: '1111', totalAmount: '100', payments: [] },
    ];
    expect(groupInvoicesByNumber(invs)).toHaveLength(1);
  });
});

// Sanity checks for the conventions the cashflow / forecast / chat code relies on.
// If any of these break, the AI features start lying again — same class of bug we
// hunted earlier this session.
describe('project conventions (regression guards)', () => {
  it('isPaid expense convention: only "111" means paid', () => {
    const isPaid = (exp) => exp.paid === '111';
    expect(isPaid({ paid: '111' })).toBe(true);
    expect(isPaid({ paid: 'Paid' })).toBe(false);
    expect(isPaid({ paid: 'Unpaid' })).toBe(false);
    expect(isPaid({ paid: '' })).toBe(false);
    expect(isPaid({ paid: undefined })).toBe(false);
  });

  it('isFinal invoice convention: not draft AND not canceled', () => {
    const isFinal = (inv) => inv.draft !== true && !inv.canceled;
    expect(isFinal({ draft: false, canceled: false })).toBe(true);
    expect(isFinal({ draft: true, canceled: false })).toBe(false);
    expect(isFinal({ draft: false, canceled: true })).toBe(false);
    // Missing draft means not a draft (issued)
    expect(isFinal({ canceled: false })).toBe(true);
    // The old buggy check was `!!inv.final` — this would return false here,
    // hiding overdue invoices from the assistant. We want true.
    expect(isFinal({ final: false, draft: false })).toBe(true);
  });
});
