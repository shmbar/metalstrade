import { describe, it, expect } from 'vitest';
import {
    parseAssay, formatAssay, assayOf, assayRange, formatRange, aliasKey, buildGradeIndex,
    resolveGrade, assignAliases, assignGradeToLine, parseSpecQuery, assayMatches, describeSpec,
    findGradeByName, makeGrade,
} from '../utils/grades.js';

// Every string here is a real description or analysis from the IMS/GIS stock.
describe('parseAssay — chemistry out of the way it is actually written', () => {
    it('reads a typed assay', () => {
        expect(parseAssay('42Ni 12Cr 3Mo 3Nb 6Co 2Ti')).toEqual({ Ni: 42, Cr: 12, Mo: 3, Nb: 3, Co: 6, Ti: 2 });
        expect(parseAssay('28.31Ni 18.25Cr 1.27Mo Ingots')).toEqual({ Ni: 28.31, Cr: 18.25, Mo: 1.27 });
    });

    it('reads the assay out of a bracket annotation', () => {
        expect(parseAssay('IN 718 Turnings (51Ni 21Cr 3Mo)')).toEqual({ Ni: 51, Cr: 21, Mo: 3 });
    });

    it('does not let a cut-off bound lend its figure to the next element', () => {
        // a naive number-first scan reads "W>3 Co" as 3% cobalt
        expect(parseAssay('40Ni 16Cr 3.5Mo W>3 Co>2,5 Cu >0,3 Ingots'))
            .toEqual({ Ni: 40, Cr: 16, Mo: 3.5, W: 3, Co: 2.5, Cu: 0.3 });
    });

    it('reads a certificate written with min/max and percentages', () => {
        expect(parseAssay('Ni min 42%, Cr min 12%, Mo min 3.5%; Cu max 0.5%, P max 0.03%, Co max 6%'))
            .toEqual({ Ni: 42, Cr: 12, Mo: 3.5, Cu: 0.5, P: 0.03, Co: 6 });
        expect(parseAssay('Nickel 42%, Chromium 12%')).toEqual({ Ni: 42, Cr: 12 });
    });

    it('treats Cb as niobium and a Cyrillic С as a Latin C', () => {
        expect(parseAssay('30Ni 18Cr 2Mo 2.25Cb Turnings')).toEqual({ Ni: 30, Cr: 18, Mo: 2, Nb: 2.25 });
        expect(parseAssay('13.26Сr')).toEqual({ Cr: 13.26 });   // Cyrillic С
    });

    it('reads a tin line whose figures lost their decimal separators', () => {
        expect(parseAssay('Tin Granules 1,88C 010S 1,00Co 022Nb 040Ni 2,81P 5,57Sn 01Ta 6,58W'))
            .toEqual({ C: 1.88, S: 0.1, Co: 1, Nb: 0.22, Ni: 0.4, P: 2.81, Sn: 5.57, Ta: 0.1, W: 6.58 });
    });

    it('reads a figure written without its leading zero', () => {
        // real: a tungsten granule line. Read as whole numbers this said 76% nickel,
        // and answered a "Ni 70-80" search with a bag of tungsten.
        expect(parseAssay('W Granules (2.08C .12S 1.23Co .4Nb .76Ni 2.16P 3.86Sn .1Ta 5W)'))
            .toEqual({ C: 2.08, S: 0.12, Co: 1.23, Nb: 0.4, Ni: 0.76, P: 2.16, Sn: 3.86, Ta: 0.1, W: 5 });
        expect(parseAssay('Cu max .5%, P max .03%')).toEqual({ Cu: 0.5, P: 0.03 });
    });

    it('reads a capital O typed where a zero belongs', () => {
        // real: "… 0.7Co O.37Cu 0.44S …" — as written this was 37% copper.
        expect(parseAssay('14.5Ni 6.3Cr 0.85Mo 1.1W 0.7Co O.37Cu 0.44S 0.03P Ingots'))
            .toEqual({ Ni: 14.5, Cr: 6.3, Mo: 0.85, W: 1.1, Co: 0.7, Cu: 0.37, S: 0.44, P: 0.03 });
    });

    it('finds no chemistry where there is none — never a guess', () => {
        for (const s of ['Ti 6-4 Powder', '718 plus Ingots', '718 Turnings with ~10% R65', 'C 103 Turnings',
            '202 Turnings', 'Fines Mix', 'Hf (8064) (1.9815)', '', null, undefined]) {
            expect(parseAssay(s)).toEqual({});
        }
    });

    it('formats in a fixed element order so two lots line up', () => {
        expect(formatAssay({ Ti: 2, Ni: 42, Cr: 12 })).toBe('42Ni 12Cr 2Ti');
    });
});

describe('assayOf — a lot’s own analysis before its description', () => {
    it('prefers the recorded analysis and says where the figure came from', () => {
        const lot = { analysis: 'Ni 51.2%, Cr 18.9%, Sn 4.1%' };
        expect(assayOf(lot, 'IN 718 Turnings (51Ni 21Cr 3Mo)')).toEqual({ assay: { Ni: 51.2, Cr: 18.9, Sn: 4.1 }, source: 'analysis' });
        expect(assayOf({}, '42Ni 12Cr')).toEqual({ assay: { Ni: 42, Cr: 12 }, source: 'description' });
        expect(assayOf({}, 'Fines Mix')).toEqual({ assay: {}, source: null });
    });

    it('ranges several lots per element — the 718 Offspec Sn case', () => {
        const r = assayRange([{ Ni: 51, Sn: 3.2 }, { Ni: 52, Sn: 5.6 }, { Ni: 51.5, Sn: 4 }]);
        expect(r.Sn).toEqual({ min: 3.2, max: 5.6 });
        expect(formatRange(r)).toBe('51–52Ni 3.2–5.6Sn');
    });
});

describe('the registry — spellings, exceptions, and what resolves', () => {
    const grades = () => [
        { ...makeGrade('g40', { name: '40Ni', spec: '42Ni 12Cr 3Mo 3Nb 6Co 2Ti' }), aliases: ['40Ni Refinery Turnings'] },
        { ...makeGrade('g30', { name: '30Ni' }), aliases: ['30Ni 18Cr 2Mo Turnings'] },
        { ...makeGrade('gx', { name: 'Old' }), aliases: ['31Ni Ti Turnings'], deleted: true },
    ];

    it('matches a spelling blind to case, spacing, decimal commas and keyboard layout', () => {
        expect(aliasKey('IN 718 Turnings (51Ni 21Cr 3Mo)')).toBe(aliasKey('in 718 turnings (51Ni21Cr 3Mo)'));
        expect(aliasKey('2,5Co')).toBe(aliasKey('2.5Co'));
        // …but not blind to the figures: that is how 30Ni and 40Ni would merge
        expect(aliasKey('30Ni 18Cr 2Mo Turnings')).not.toBe(aliasKey('40Ni 16Cr 3.5Mo Turnings'));
    });

    it('an explicit PO-line assignment beats the spelling; a deleted grade resolves nothing', () => {
        const g = grades();
        g[1].lineIds = ['line-7'];
        const idx = buildGradeIndex(g);
        expect(resolveGrade(idx, { description: '40Ni Refinery Turnings' })?.name).toBe('40Ni');
        expect(resolveGrade(idx, { description: '40Ni Refinery Turnings', lineId: 'line-7' })?.name).toBe('30Ni');
        expect(resolveGrade(idx, { description: '31Ni Ti Turnings' })).toBeNull();
        expect(resolveGrade(idx, { description: 'Unnamed ingot' })).toBeNull();
    });

    it('a spelling belongs to one grade — merging takes it off the old one, in one change set', () => {
        const changed = assignAliases(grades(), 'g30', ['40Ni Refinery Turnings', '31Ni 12Cr Ti Turnings', ' 40ni refinery  turnings ']);
        const g30 = changed.find(g => g.id === 'g30');
        const g40 = changed.find(g => g.id === 'g40');
        expect(g30.aliases).toEqual(['30Ni 18Cr 2Mo Turnings', '40Ni Refinery Turnings', '31Ni 12Cr Ti Turnings']);
        expect(g40.aliases).toEqual([]);
        expect(changed).toHaveLength(2);
    });

    describe('assignGradeToLine', () => {
        it('an unclaimed spelling becomes an alias, so next month fills itself', () => {
            const changed = assignGradeToLine(grades(), 'g40', { lineId: 'L1', description: '42Ni 12Cr 3Mo Turnings' });
            expect(changed).toHaveLength(1);
            expect(changed[0].aliases).toContain('42Ni 12Cr 3Mo Turnings');
            expect(changed[0].lineIds).toEqual([]);
        });

        it('a spelling already meaning this grade stores nothing', () => {
            expect(assignGradeToLine(grades(), 'g40', { lineId: 'L1', description: '40Ni Refinery Turnings' })).toEqual([]);
        });

        it('a spelling that means another grade makes this line the exception', () => {
            const changed = assignGradeToLine(grades(), 'g30', { lineId: 'L1', description: '40Ni Refinery Turnings' });
            expect(changed).toHaveLength(1);
            expect(changed[0].id).toBe('g30');
            expect(changed[0].lineIds).toEqual(['L1']);
            expect(changed[0].aliases).toEqual(['30Ni 18Cr 2Mo Turnings']);   // did not steal the spelling
        });

        it('moving a line clears its old exception; clearing removes it', () => {
            const g = grades();
            g[1].lineIds = ['L1'];
            const moved = assignGradeToLine(g, 'g40', { lineId: 'L1', description: '40Ni Refinery Turnings' });
            expect(moved.find(x => x.id === 'g30').lineIds).toEqual([]);
            const cleared = assignGradeToLine(g, null, { lineId: 'L1', description: 'x' });
            expect(cleared).toHaveLength(1);
            expect(cleared[0].lineIds).toEqual([]);
        });
    });

    it('finds a grade by name case-insensitively, skipping deleted ones', () => {
        expect(findGradeByName(grades(), ' 40ni ')?.id).toBe('g40');
        expect(findGradeByName(grades(), 'old')).toBeNull();
    });
});

describe('find by spec', () => {
    it('reads ranges, bounds, single figures and bare symbols', () => {
        const spec = parseSpecQuery('Ni 28-33 Cr 15–20 Ti>0 Mo<=3 Co 6 Sn');
        expect(spec).toEqual({
            Ni: { min: 28, max: 33 }, Cr: { min: 15, max: 20 }, Ti: { min: 0, minStrict: true },
            Mo: { max: 3 }, Co: { min: 5.5, max: 6.5 }, Sn: {},
        });
        expect(describeSpec(spec)).toBe('Ni 28–33 · Cr 15–20 · Mo ≤3 · Co 5.5–6.5 · Ti >0 · Sn');
    });

    it('is no filter at all when nothing names an element', () => {
        expect(parseSpecQuery('')).toBeNull();
        expect(parseSpecQuery('turnings please')).toBeNull();
    });

    it('matches only lots whose chemistry satisfies every constraint', () => {
        const spec = parseSpecQuery('Ni 28-33 Ti>0');
        expect(assayMatches(parseAssay('31Ni 16Cr 1.2Ti Turnings'), spec)).toBe(true);
        expect(assayMatches(parseAssay('30Ni 18Cr 2Mo Turnings'), spec)).toBe(false);   // no Ti
        expect(assayMatches(parseAssay('42Ni 12Cr 2Ti'), spec)).toBe(false);            // Ni out
        expect(assayMatches({}, spec)).toBe(false);                                     // unknown chemistry
        expect(assayMatches(parseAssay('718 Offspec Sn'), parseSpecQuery('Sn'))).toBe(false);
        expect(assayMatches(parseAssay('Ni 51% Sn 4.1%'), parseSpecQuery('Sn'))).toBe(true);
    });
});
