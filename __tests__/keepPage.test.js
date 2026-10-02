import { describe, it, expect } from 'vitest';
import { rowKeys, isSameList, nextPageIndex } from '../components/table/keepPage.js';

/* Stocks, 2026-10-02: on page 3, a save in Materials Breakdown threw the table back to
   page 1 — TanStack resets the page on any new data, and a save is new data. */
const rows = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ id: `r${from + i}` }));

describe('isSameList — the same records refreshed, or different ones', () => {
    const before = rowKeys(rows(201));

    it('a save hands back the same records: same list', () => {
        expect(isSameList(before, rowKeys(rows(201).map(r => ({ ...r, spec: 'UMZ' }))))).toBe(true);
    });

    it('a record added or removed is still the same list', () => {
        expect(isSameList(before, rowKeys(rows(202)))).toBe(true);
        expect(isSameList(before, rowKeys(rows(200)))).toBe(true);
    });

    it('another view of the stock is a different list', () => {
        // Lines → By grade: none of the ids survive
        expect(isSameList(before, rowKeys(rows(105).map((r, i) => ({ id: `grade:${i}` }))))).toBe(false);
        // one warehouse of 115, or a find-by-spec that keeps 9
        expect(isSameList(before, rowKeys(rows(115)))).toBe(false);
        expect(isSameList(before, rowKeys(rows(9)))).toBe(false);
        // a new date range: the same length, other records
        expect(isSameList(before, rowKeys(rows(201, 500)))).toBe(false);
    });

    it('rows without ids are matched by position, so a refresh of the same length keeps the page', () => {
        const noIds = (n) => Array.from({ length: n }, () => ({ total: 1 }));
        expect(isSameList(rowKeys(noIds(80)), rowKeys(noIds(80)))).toBe(true);
        expect(isSameList(rowKeys(noIds(80)), rowKeys(noIds(20)))).toBe(false);
        // a blank id is not an id: two blank-id rows are not one record
        expect(rowKeys([{ id: '' }, { id: '' }]).size).toBe(2);
    });

    it('the first rows to arrive are not "the same list" as nothing', () => {
        expect(isSameList(rowKeys([]), rowKeys(rows(50)))).toBe(false);
        expect(isSameList(null, rowKeys(rows(50)))).toBe(false);
    });
});

describe('nextPageIndex — where the table goes', () => {
    it('stays on page 3 when the same rows are refreshed', () => {
        expect(nextPageIndex({ sameList: true, pageIndex: 2, pageCount: 5 })).toBeNull();
    });

    it('goes back to page 1 for a new search, filter or sort, or a different list', () => {
        expect(nextPageIndex({ viewChanged: true, pageIndex: 2, pageCount: 5 })).toBe(0);
        expect(nextPageIndex({ sameList: false, pageIndex: 2, pageCount: 3 })).toBe(0);
        expect(nextPageIndex({ viewChanged: true, pageIndex: 0, pageCount: 5 })).toBeNull();   // already there
    });

    it('a page that no longer exists becomes the last one that does', () => {
        expect(nextPageIndex({ sameList: true, pageIndex: 4, pageCount: 4 })).toBe(3);
        expect(nextPageIndex({ sameList: true, pageIndex: 2, pageCount: 0 })).toBe(0);         // nothing left
        expect(nextPageIndex({ sameList: true, pageIndex: 0, pageCount: 0 })).toBeNull();
    });
});
