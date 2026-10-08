// Search and sort for the records behind a Dashboard card (client, 2026-10-08: "when opening
// cards, should be able to filter, and sort"). Web: app/(root)/dashboard/detailRows.js, used
// by the card pop-ups (DetailModal, ExpenseDrillModal). Phone:
// mobile/src/features/dashboard/detailRows.ts, used by the dashboard's DetailSheet. Both read
// the shared keyword search (utils/search.js — every word anywhere, a comma = either).
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS module
import * as web from '../app/(root)/dashboard/detailRows.js';
// Through the phone's own alias, as the parity tests do: a relative path would pull the phone
// module (and its @shared imports) into the web build's type check.
import * as phone from '@/features/dashboard/detailRows';

const supName: Record<string, string> = { s1: 'Shalex', s2: 'Lobis', s3: 'DMT' };
// Shaped like the Dashboard's supplier-contract rows and columns (page.js SUPPLIER_COLS).
const rows = [
  { order: '10', date: '2026-09-14', supplier: 's1', value: 315670, paid: 0, invoices: 1 },
  { order: '9', date: '03-Feb-2026', supplier: 's2', value: 1200, paid: 1200, invoices: 2 },
  { order: '', date: '', supplier: 's3', value: 0, paid: 0, invoices: 0 }, // not invoiced yet
  { order: '11', date: '2025-12-31', supplier: 's1', value: 1200, paid: 600, invoices: 1 },
];
const muted = (t: string) => createElement('span', { className: 'muted' }, t);
const cols = [
  { key: 'order', label: 'PO', render: (r: any) => r.order || '—' },
  { key: 'date', label: 'Date' },
  { key: 'supplier', label: 'Vendor', render: (r: any) => supName[r.supplier] },
  { key: 'value', label: 'Invoiced', right: true, sort: (r: any) => (r.invoices === 0 ? null : r.value),
    render: (r: any) => (r.invoices === 0 ? muted('Not invoiced yet') : `$${(r.value / 1000).toFixed(2)}K`) },
  { key: 'balance', label: 'Balance', right: true, sort: (r: any) => (r.invoices === 0 ? null : r.value - r.paid),
    render: (r: any) => createElement('span', null, `$${r.value - r.paid}`) },
];
const col = (k: string) => cols.find((c) => c.key === k)!;
const orders = (rs: any[]) => rs.map((r) => r.order || '(none)');

describe('web — a card pop-up\'s search', () => {
  it('finds a row by any word it shows, a name for an id included', () => {
    expect(orders(web.visibleRows(rows, cols, 'shalex', web.NO_SORT))).toEqual(['10', '11']);
    expect(orders(web.visibleRows(rows, cols, 'not invoiced', web.NO_SORT))).toEqual(['(none)']);
    expect(orders(web.visibleRows(rows, cols, 'shalex 2025', web.NO_SORT))).toEqual(['11']); // every word
  });

  it('a comma means either', () => {
    expect(orders(web.visibleRows(rows, cols, 'lobis, dmt', web.NO_SORT))).toEqual(['9', '(none)']);
  });

  it('finds a figure typed in full though the cell shows it compact', () => {
    // The cell reads "$315.67K"; the client types the amount as it is on the invoice.
    expect(orders(web.visibleRows(rows, cols, '315,670', web.NO_SORT))).toEqual(['10']);
    expect(orders(web.visibleRows(rows, cols, '315670.00', web.NO_SORT))).toEqual(['10']);
  });

  it('finds a date typed the way the screens write it', () => {
    expect(orders(web.visibleRows(rows, cols, '14.09.26', web.NO_SORT))).toEqual(['10']);
  });

  it('never finds a row by a stored id it does not show — a Vendor cell stores a uuid and shows a name', () => {
    // 's1' is Shalex's id; with real uuids, "dec", "708" or "db" pulled in rows showing none of it.
    expect(orders(web.visibleRows(rows, cols, 's1', web.NO_SORT))).toEqual([]);
  });

  it('finds a computed figure (Balance = invoiced − paid) typed in full', () => {
    expect(orders(web.visibleRows(rows, cols, '600.00', web.NO_SORT))).toEqual(['11']); // 1,200 − 600
  });

  it('reads the words inside a rendered cell', () => {
    expect(web.textOf(createElement('span', null, 'Paid ', createElement('b', null, '$1.2K')))).toBe('Paid  $1.2K');
    expect(web.textOf(null)).toBe('');
  });
});

describe('web — a card pop-up\'s sort', () => {
  it('a figures column sorts on the figure, and a row with none goes last either way', () => {
    expect(orders(web.sortByCol(rows, col('value'), 'asc'))).toEqual(['9', '11', '10', '(none)']);
    expect(orders(web.sortByCol(rows, col('value'), 'desc'))).toEqual(['10', '9', '11', '(none)']);
  });

  it('rows that tie keep the order the card gave them', () => {
    // 9 and 11 are both $1,200 — asc and desc both keep 9 before 11.
    const asc = orders(web.sortByCol(rows, col('value'), 'asc'));
    const desc = orders(web.sortByCol(rows, col('value'), 'desc'));
    expect(asc.indexOf('9')).toBeLessThan(asc.indexOf('11'));
    expect(desc.indexOf('9')).toBeLessThan(desc.indexOf('11'));
  });

  it('a computed column sorts on its own value (Balance = invoiced − paid)', () => {
    expect(orders(web.sortByCol(rows, col('balance'), 'desc'))).toEqual(['10', '11', '9', '(none)']);
  });

  it('dates sort as dates, whatever way they were stored', () => {
    expect(orders(web.sortByCol(rows, col('date'), 'asc'))).toEqual(['11', '9', '10', '(none)']);
  });

  it('text sorts as it reads — a name, not its id; numbers in it as numbers', () => {
    expect(orders(web.sortByCol(rows, col('supplier'), 'asc'))).toEqual(['(none)', '9', '10', '11']); // DMT, Lobis, Shalex×2
    expect(orders(web.sortByCol(rows, col('order'), 'asc'))).toEqual(['9', '10', '11', '(none)']); // '—' last
  });

  it('a first click sorts ascending, the next turns it round, another column starts over', () => {
    let s = web.nextSort(web.NO_SORT, 'value');
    expect(s).toEqual({ key: 'value', dir: 'asc' });
    s = web.nextSort(s, 'value');
    expect(s).toEqual({ key: 'value', dir: 'desc' });
    expect(web.nextSort(s, 'date')).toEqual({ key: 'date', dir: 'asc' });
  });

  it('search and sort together', () => {
    expect(orders(web.visibleRows(rows, cols, 'shalex', { key: 'value', dir: 'asc' }))).toEqual(['11', '10']);
  });
});

// The phone sheet's rows, as the dashboard builds them (index.tsx openDetail).
const sheet = [
  { key: 'a', title: 'PO 10', meta: '14-Sep-2026 · 12.0 MT', value: '$315.67K', amount: 315670, date: '2026-09-14' },
  { key: 'b', title: 'PO 9', meta: '03-Feb-2026 · 1.0 MT', value: '$1.20K', valueSub: 'Paid $1.20K', amount: 1200, date: '03-Feb-2026' },
  { key: 'c', title: '—', value: 'Not invoiced yet', amount: undefined, date: '' },
  { key: 'd', title: 'PO 11', meta: 'Shalex', value: '$1.20K', amount: 1200, date: '2025-12-31' },
];
const keys = (rs: any[]) => rs.map((r) => r.key);

describe('phone — the dashboard sheet\'s search and sort', () => {
  it('searches everything a row shows, its full figure and its date', () => {
    expect(keys(phone.visibleSheetRows(sheet, 'shalex', phone.NO_SHEET_SORT))).toEqual(['d']);
    expect(keys(phone.visibleSheetRows(sheet, 'not invoiced, shalex', phone.NO_SHEET_SORT))).toEqual(['c', 'd']);
    expect(keys(phone.visibleSheetRows(sheet, '315,670', phone.NO_SHEET_SORT))).toEqual(['a']);
    expect(keys(phone.visibleSheetRows(sheet, '14.09.26', phone.NO_SHEET_SORT))).toEqual(['a']);
  });

  it('Amount starts largest first and turns round; a row with no figure goes last', () => {
    let s = phone.nextSheetSort(phone.NO_SHEET_SORT, 'amount');
    expect(s).toEqual({ key: 'amount', dir: 'desc' });
    expect(keys(phone.visibleSheetRows(sheet, '', s))).toEqual(['a', 'b', 'd', 'c']);
    s = phone.nextSheetSort(s, 'amount');
    expect(keys(phone.visibleSheetRows(sheet, '', s))).toEqual(['b', 'd', 'a', 'c']);
  });

  it('Date starts newest first; Name A–Z, numbers as numbers — a row with no name ("—") last both ways, as on web', () => {
    expect(keys(phone.visibleSheetRows(sheet, '', phone.nextSheetSort(phone.NO_SHEET_SORT, 'date')))).toEqual(['a', 'b', 'd', 'c']);
    const az = phone.nextSheetSort(phone.NO_SHEET_SORT, 'name');
    expect(keys(phone.visibleSheetRows(sheet, '', az))).toEqual(['b', 'a', 'd', 'c']);
    expect(keys(phone.visibleSheetRows(sheet, '', phone.nextSheetSort(az, 'name')))).toEqual(['d', 'a', 'b', 'c']);
  });

  it('finds a figure the row shows only compact (Paid $1.23K) typed in full', () => {
    const paid = [{ ...sheet[1], figures: [1234.5] }, sheet[3]];
    expect(keys(phone.visibleSheetRows(paid, '1,234.50', phone.NO_SHEET_SORT))).toEqual(['b']);
  });

  it('offers only the orders the rows can take', () => {
    const clients = [{ title: 'Acme', value: '$1K', amount: 1000 }, { title: 'Zeta', value: '$2K', amount: 2000 }];
    expect(phone.sortsFor(clients).map((s) => s.key)).toEqual(['amount', 'name']);
    expect(phone.sortsFor(sheet).map((s) => s.key)).toEqual(['amount', 'date', 'name']);
  });
});
