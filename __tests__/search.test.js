import { describe, it, expect } from 'vitest';
import { matchesAllWords, shownAs } from '../utils/search.js';

/* "Search by any word" (client, 2026-09-29): a value is found the way the screen writes
   it, not only the way it is stored. */
describe('shownAs — a stored value as the screens write it', () => {
    it('a date: the table\'s 30.01.26, the long forms and the month name', () => {
        expect(shownAs('2026-01-30')).toEqual(expect.arrayContaining(['2026-01-30', '30.01.26', '30.01.2026', '30/01/2026', '30-jan-2026']));
        expect(shownAs('2024-12-17T12:02:00')).toEqual(expect.arrayContaining(['17.12.24', '12:02']));
    });

    it('the app\'s own "17-Dec-2024, 12:02" (an invoice\'s Operation Time) reads as the table writes it', () => {
        expect(shownAs('17-Dec-2024, 12:02')).toEqual(expect.arrayContaining(['17.12.24', '17.12.2024', '12:02']));
        expect(shownAs('5-Jan-2026')).toEqual(expect.arrayContaining(['05.01.26']));
        expect(shownAs('17-Foo-2024')).toEqual(['17-Foo-2024']);   // not a month: left as text
    });

    it('a figure: with 2 and 3 decimals, with and without its thousands commas', () => {
        expect(shownAs(144131.4)).toEqual(expect.arrayContaining(['144131.40', '144,131.40', '144131.400']));
        expect(shownAs('23')).toEqual(expect.arrayContaining(['23.000', '23.00']));
    });

    it('a flag reads yes / no; blanks and objects give nothing', () => {
        expect(shownAs(true)).toEqual(['yes']);
        expect(shownAs(false)).toEqual(['no']);
        expect(shownAs('')).toEqual([]);
        expect(shownAs(null)).toEqual([]);
        expect(shownAs({ a: 1 })).toEqual([]);
    });

    it('plain text is left as it is', () => {
        expect(shownAs('Ta Bars')).toEqual(['Ta Bars']);
    });
});

describe('matchesAllWords — figures typed as the table shows them', () => {
    it('finds an amount typed with its currency sign and commas', () => {
        const row = shownAs(144131.4);
        expect(matchesAllWords(row, '$144,131.40')).toBe(true);
        expect(matchesAllWords(row, '€144,131.40')).toBe(true);
        expect(matchesAllWords(row, '144131')).toBe(true);
        expect(matchesAllWords(row, '$144,131.41')).toBe(false);
    });

    it('still needs every word somewhere', () => {
        const row = ['Triart', ...shownAs('2026-01-30'), ...shownAs(20.495)];
        expect(matchesAllWords(row, 'triart 30.01.26 20.495')).toBe(true);
        expect(matchesAllWords(row, 'triart 31.01.26')).toBe(false);
    });
});
