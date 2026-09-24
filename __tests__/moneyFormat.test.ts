import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fmtAutoKM, fmtCurKM, moneyCompact, moneyFull } from '@/lib/format';
import * as webCurrency from '../utils/currency.js';

// Client, 2026-09-24: "some cells are missing decimals and/or the $ symbol". One money format
// for the whole app: the currency's symbol (or its code), exactly two decimals, thousands
// separators, the minus sign in front of the symbol.

describe('moneyFull', () => {
  it('always shows the symbol and two decimals', () => {
    expect(moneyFull('us', 1234.5)).toBe('$1,234.50');
    expect(moneyFull('eu', 0.05)).toBe('€0.05');
    expect(moneyFull('USD', 12)).toBe('$12.00');
    expect(moneyFull('EUR', 1000000)).toBe('€1,000,000.00');
  });

  it('never prints a bare number for another currency — it uses the code', () => {
    expect(moneyFull('GBP', 1234.5)).toBe('GBP 1,234.50');
  });

  it('puts the minus sign before the symbol', () => {
    expect(moneyFull('us', -12)).toBe('-$12.00');
    expect(moneyFull('eu', -1234.567)).toBe('-€1,234.57');
  });

  it('never mixes currencies: the symbol follows the currency passed in', () => {
    expect(moneyFull('eu', 5).startsWith('€')).toBe(true);
    expect(moneyFull('us', 5).startsWith('$')).toBe(true);
  });

  it('a negative that rounds to zero prints no minus sign', () => {
    expect(moneyFull('us', -0.001)).toBe('$0.00');
    expect(moneyCompact('us', -0.004)).toBe('$0.00');
  });

  it('survives junk input without printing NaN', () => {
    expect(moneyFull('us', NaN)).toBe('$0.00');
    expect(moneyFull('us', '1,234.5')).toBe('$1,234.50');
  });
});

describe('compact amounts', () => {
  it('keep two decimals and the symbol', () => {
    expect(moneyCompact('us', 1_234_567)).toBe('$1.23M');
    expect(moneyCompact('eu', 45_600)).toBe('€45.60K');
    expect(moneyCompact('us', 980)).toBe('$980.00');
  });

  it('put the minus sign before the symbol (was "$-1.23K")', () => {
    expect(moneyCompact('us', -1234)).toBe('-$1.23K');
    expect(fmtAutoKM(-1234)).toBe('-$1.23K');
    expect(fmtCurKM('eu', -2_500_000)).toBe('-€2.50M');
  });

  it('fmtCurKM is the shared compact format', () => {
    expect(fmtCurKM('us', 1234)).toBe(moneyCompact('us', 1234));
  });
});

describe('web and mobile share one implementation', () => {
  it('mobile lib/format prints exactly what web utils/currency prints', () => {
    for (const cur of ['us', 'eu', 'USD', 'EUR', 'GBP', '']) {
      for (const v of [0, 0.05, 12, -12, 1234.567, -1_234_567, 980]) {
        expect(moneyFull(cur, v)).toBe(webCurrency.moneyFull(cur, v));
        expect(moneyCompact(cur, v)).toBe(webCurrency.moneyCompact(cur, v));
      }
    }
  });
});

describe('no hand-rolled money formatting on web', () => {
  const ROOT = path.resolve(__dirname, '..');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (/\.jsx?$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'app'));
  walk(path.join(ROOT, 'components'));

  it('a "$" glued onto a formatted number puts the sign in the wrong place — use utils/currency', () => {
    // "$" + (-1234).toLocaleString() prints "$-1,234.00"; moneyFull prints "-$1,234.00".
    const offenders: string[] = [];
    for (const f of files) {
      const rel = path.relative(ROOT, f).split(path.sep).join('/');
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/['"`][$€]['"`]\s*\+\s*(new Intl|Number\(|\w+\.toLocaleString)/.test(line) || /`[$€]\$\{(new Intl|Number\(|fmt\w*\()/.test(line)) offenders.push(`${rel}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

describe('no hand-rolled money formatting in screens', () => {
  const ROOT = path.resolve(__dirname, '../mobile');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'app'));
  walk(path.join(ROOT, 'src'));

  it('a currency glyph next to Intl.NumberFormat means a private formatter — use lib/format', () => {
    // The three dashboard formatters that dropped decimals or the symbol all looked like this.
    const offenders: string[] = [];
    for (const f of files) {
      const rel = path.relative(ROOT, f).split(path.sep).join('/');
      if (rel === 'src/lib/format.ts' || rel.startsWith('src/lib/pdf') || rel.startsWith('src/shared/')) continue;
      fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (/['"`][$€]['"`]/.test(line) && /Intl\.NumberFormat/.test(line)) offenders.push(`${rel}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});
