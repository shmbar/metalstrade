// react-number-format 5.x ROUNDS a figure only when decimalScale is a NUMBER. Given as text
// (decimalScale='2') it cuts the figure off instead: Cashflow showed Hf Ni VAR's
// 660 kg × $3,517.87 = $2,321,794.1999… as $2,321,794.19 against Shalex's invoice of
// $2,321,794.20, and 19.9765 MT read 19.976 (2026-10-08). Every one of the app's 65 text
// forms (60 decimalScale='N', 5 {cond && '3'} on the Margins totals) was a read-only figure;
// all are numbers now, and this keeps it that way.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NumericFormat } from 'react-number-format';
import { describe, expect, it } from 'vitest';

const ROOTS = ['app', 'components', 'utils', 'hooks', 'contexts'];
const files = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  if (statSync(p).isDirectory()) return n === 'node_modules' || n.startsWith('.') ? [] : files(p);
  return /\.(jsx?|tsx?)$/.test(n) ? [p] : [];
});

describe('NumericFormat rounds figures', () => {
  it('the library rounds a numeric decimalScale and cuts off a text one — the reason for the rule', () => {
    const show = (dp: any) => renderToStaticMarkup(React.createElement(NumericFormat, {
      value: 660 * 3517.87, displayType: 'text', thousandSeparator: true, decimalScale: dp, fixedDecimalScale: true,
    }));
    expect(show(2)).toContain('2,321,794.20');
    expect(show('2')).toContain('2,321,794.19');
  });

  it('no screen passes decimalScale as text — neither decimalScale="3" nor {cond && \'3\'}', () => {
    const asText = /decimalScale=(['"]\d+['"]|\{[^}]*['"]\d+['"][^}]*\})/;
    const offenders = ROOTS.flatMap(files).flatMap((f) =>
      readFileSync(f, 'utf8').split('\n')
        .map((line, i) => (asText.test(line) ? `${f}:${i + 1}` : ''))
        .filter(Boolean));
    expect(offenders).toEqual([]);
  });
});
