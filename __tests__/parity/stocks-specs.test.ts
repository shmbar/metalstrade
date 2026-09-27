import { describe, expect, it } from 'vitest';
// web's Spec column module (c99657c4 / 901910a5) — pure: it only reads utils/grades.js.
import { rowSpecs as webRowSpecs, specText as webSpecText } from '../../app/(root)/stocks/specs.js';
import { rowSpecs, specText, specCellText } from '@/features/stocks/specs';

// A Stocks row: a stock line (warehouse × PO line) carrying its lots in `data` — the shape
// both web's page and mobile's aggregate.ts build. Fresh objects per call: both modules
// cache per row object.
const lot = (over: Record<string, unknown>) => ({ type: 'in', qnty: '10', unitPrc: '1000', description: 'l-1', ...over });
const row = (over: Record<string, unknown> = {}) => ({
  descriptionName: 'Ta Ingots',
  qnty: 20,
  total: 20000,
  data: [lot({ id: 'a', spec: 'UMZ' }), lot({ id: 'b', spec: 'Silmet' })],
  ...over,
});

describe('Stocks spec — mobile port of web specs.js', () => {
  it('reads the same specs web does, typed spec first', () => {
    expect(specText(row())).toBe(webSpecText(row()));
    expect(specText(row())).toBe('UMZ · Silmet');
  });

  it('a lot known only by its name adds nothing beside the description', () => {
    const r = () => row({ data: [lot({ id: 'a' })] });
    expect(specText(r())).toBe(webSpecText(r()));
    expect(specText(r())).toBe('');
    expect(specCellText(r())).toBe('');
  });

  it('once part of the line has sold, what is left is shared by what was received — and marked ≈', () => {
    const r = () => row({ qnty: 10, total: 10000, data: [lot({ id: 'a', spec: 'UMZ', qnty: '15' }), lot({ id: 'b', spec: 'Silmet', qnty: '5' })] });
    const mobile = rowSpecs(r());
    const web = webRowSpecs(r());
    expect(mobile.map((p) => [p.label, +p.qnty.toFixed(6), p.estimated])).toEqual(web.map((p: any) => [p.label, +p.qnty.toFixed(6), p.estimated]));
    expect(specCellText(r())).toBe('UMZ ≈7.500 · Silmet ≈2.500');
  });

  it('sale rows (type out) are not lots of the spec', () => {
    const r = () => row({ data: [lot({ id: 'a', spec: 'UMZ' }), lot({ id: 's', type: 'out', spec: 'Other', qnty: '5' })] });
    expect(specText(r())).toBe(webSpecText(r()));
    expect(specText(r())).toBe('UMZ');
  });

  it('more than two specs: two shown, "+N" after', () => {
    const r = () => row({ data: ['A1', 'B2', 'C3'].map((s, i) => lot({ id: `l${i}`, spec: s })), qnty: 30, total: 30000 });
    expect(specCellText(r())).toMatch(/ \+1$/);
  });
});
