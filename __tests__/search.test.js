import { describe, it, expect } from 'vitest';
import { matchesAllWords, shownAs, searchWords, searchHint } from '../utils/search.js';

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

/* Client, 2026-09-30: "tried searching 2 grades together, didn't allow" — "708 202" asks
   for rows holding BOTH, and no row is both. A comma asks for either. */
describe('matchesAllWords — a comma lists either side', () => {
    const r708 = ['310826', 'Triart', '708 Solids'];
    const r202 = ['290126', 'Seagull', '202 Turnings'];
    const r330 = ['110926', 'Triart', '330 Turnings'];
    const keep = (q) => [r708, r202, r330].filter((r) => matchesAllWords(r, q)).map((r) => r[0]);

    it('"708, 202" lists both grades; "708 202" (every word) lists neither', () => {
        expect(keep('708, 202')).toEqual(['310826', '290126']);
        expect(keep('708,202 ')).toEqual([]);            // digit,digit is one figure: 708,202
        expect(keep('708 202')).toEqual([]);
        expect(keep('708 ; 202')).toEqual(['310826', '290126']);
        expect(keep('708|202')).toEqual(['310826', '290126']);
    });

    it('words beside a comma still narrow their own side', () => {
        expect(keep('triart turnings, 202')).toEqual(['290126', '110926']);
        expect(keep('triart 708, seagull')).toEqual(['310826', '290126']);
        expect(keep('triart 202, seagull 708')).toEqual([]);
    });

    it('a figure keeps its thousands commas', () => {
        const row = shownAs(144131.4);
        expect(matchesAllWords(row, '$144,131.40')).toBe(true);
        expect(matchesAllWords(row, '$144,131.41')).toBe(false);   // not "144" or "131.41"
        expect(searchWords('3,343.00')).toEqual(['3,343.00']);
    });

    it('stray commas are not an empty alternative that matches everything', () => {
        expect(searchWords(' , ; | ')).toEqual([]);
        expect(keep('708, ')).toEqual(['310826']);
        expect(keep(', 202,')).toEqual(['290126']);
    });
});

describe('searchHint — what an empty table says', () => {
    it('several words, nothing found: say how to list either', () => {
        expect(searchHint('708 202')).toBe('No row has all of 708 + 202. To list either, separate them with a comma: 708, 202');
    });
    it('"708,202" reads as one figure: say how to ask for two numbers', () => {
        expect(searchHint('708,202')).toBe('Nothing shows 708,202. To list 708 or 202, type 708, 202');
    });
    it('no hint for one word, a blank box, or a search that already uses a comma', () => {
        expect(searchHint('708')).toBeNull();
        expect(searchHint('')).toBeNull();
        expect(searchHint(null)).toBeNull();
        expect(searchHint('708, 202')).toBeNull();
    });
});
