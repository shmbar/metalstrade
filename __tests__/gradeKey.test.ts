// The grade key (app/(root)/stocks/sumtables/gradeKey.js, byte-identical on the phone) —
// which stock lines Stocks "By grade" and the Avg Cost per Grade card fold together.
//
// Client, 2026-10-07: ELG Utica's "R88 off spec Turnings" / "R88 off specs Turnings",
// "718 off spec" / "718 off specs" and "IN100" / "IN 100" off spec Turnings each listed as
// two grades. Three spelling rules now fold them: a plural is its singular, a short letter
// prefix joins the number after it, and a hyphen between two words is a space. In real IMS
// stock that folds 11 groups (742 Turning(s), Mix Turnings / Turnings Mix, B28 / B 28,
// A 286 / A286 …); GIS has none.
import { describe, expect, it } from 'vitest';
// @ts-ignore — plain JS module
import * as web from '../app/(root)/stocks/sumtables/gradeKey.js';
// @ts-ignore — plain JS module, the phone's copy
import * as phone from '../mobile/src/shared/gradeKey.js';

const same = [
  ['R88 off spec Turnings', 'R88 off specs Turnings'],
  ['718 off spec Turnings', '718 off specs Turnings'],
  ['IN100 off spec Turnings', 'IN 100 off spec Turnings'],
  ['718 off-spec Turnings', '718 off spec Turnings'],
  ['IN 718 Chips (51Ni 21Cr 3Mo)', 'IN718 Chips'],
  ['742 Turnings', '742 Turning'],
  ['A 286', 'A286'],
  ['B 28 Solids (19Ni)', 'B28 Solids'],
  ['718 off grade Turnings', '718 Turnings off grade'], // word order — as before
  ['16.41Ni 9.05Cr 0.81Mo Ingots', '31.14Ni 16.5Cr 2.4Mo Ingot'], // the NiCrMo family — as before
];
const apart = [
  ['20Ni20Cr Turnings', '55Ni10Cr Turnings'],
  ['718 plus Ingots', '718 off spec Turnings'],
  ['IN100 off spec Turnings', 'IN 625 off spec Turnings'],
  ['SS 304 Solids', 'SS 316 Solids'],
  ['Hast X', 'Hast W'],
  ['Ti 6-4 Powder', 'Ti 6-2 Powder'],
];

describe.each([['web', web], ['phone', phone]])('grade key (%s copy)', (_app, g: any) => {
  it.each(same)('"%s" and "%s" are one grade', (a, b) => {
    expect(g.gradeKeyOf(a).key).toBe(g.gradeKeyOf(b).key);
  });
  it.each(apart)('"%s" and "%s" stay two grades', (a, b) => {
    expect(g.gradeKeyOf(a).key).not.toBe(g.gradeKeyOf(b).key);
  });
  it('keeps "ss" and short words as typed', () => {
    expect(g.gradeKeyOf('SS Scrap').key).toBe('scrap ss');
    expect(g.gradeKeyOf('Gas Bus').key).toBe('bus gas');
  });
});
