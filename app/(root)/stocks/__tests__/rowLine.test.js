import { describe, it, expect } from 'vitest';
import { lineOfRow } from '../rowLine.js';

// The page's own list: raw lines, ids as stored.
const lines = [
    { id: 'a1', stock: 'w1', qnty: '29.044' },
    { id: 'b2', stock: 'w1', qnty: '12.400' },
    { id: 'c3', stock: 'w2', qnty: '0.570' },
];
// What the table hands back on a double-click: a FORMATTED copy (names, not ids).
const shown = (id) => ({ id, stock: 'SH Bell Co' });
const grade = (key, ids) => ({ id: `grade:${key}`, _lineIds: ids, _all: ids.map(shown), _lines: ids.length > 1 ? ids.map(shown) : undefined });

describe('lineOfRow', () => {
    it('a line row opens its own line — the stored one, not the copy the table showed', () => {
        expect(lineOfRow(shown('b2'), lines)).toBe(lines[1]);
    });

    it('a grade that folds a single line opens that line', () => {
        // The crash: this row's id is "grade:…", which is in no list.
        expect(lineOfRow(grade('few|us', ['c3']), lines)).toBe(lines[2]);
    });

    it('a grade that folds several lines opens none — they open from their own rows', () => {
        expect(lineOfRow(grade('718|us', ['a1', 'b2']), lines)).toBeNull();
    });

    it('a line under an opened grade opens like any line', () => {
        expect(lineOfRow(grade('718|us', ['a1', 'b2'])._lines[0], lines)).toBe(lines[0]);
    });

    it('opens nothing rather than a window with no line in it', () => {
        expect(lineOfRow(shown('gone'), lines)).toBeNull();          // reloaded under the click
        expect(lineOfRow(grade('x|us', ['gone']), lines)).toBeNull();
        expect(lineOfRow(grade('x|us', []), lines)).toBeNull();
        expect(lineOfRow(undefined, lines)).toBeNull();
        expect(lineOfRow(shown('a1'), undefined)).toBeNull();
    });
});
