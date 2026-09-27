import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isTradingWorkspace } from '@/store/auth';
import { isTradingAccount as webIsTrading } from '../utils/activeAccount.js';

// The shared area (SHARED_STOCK: joint stock + the grade registry) is IMS and GIS only —
// firestore.rules refuses it to anyone else, so the app must not show it or try to read it.
const IMS = 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2';
const GIS = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS';
const REVIEW = '1wD74Rzav1PZ40MxXStjn9WgtJm2'; // App Review / demo workspace

describe('trading workspaces', () => {
  it('IMS and GIS are trading companies; the review workspace and no workspace are not', () => {
    expect(isTradingWorkspace(IMS)).toBe(true);
    expect(isTradingWorkspace(GIS)).toBe(true);
    expect(isTradingWorkspace(REVIEW)).toBe(false);
    expect(isTradingWorkspace('')).toBe(false);
    expect(isTradingWorkspace(null)).toBe(false);
  });

  it('firestore.rules names the same two workspaces — a mismatch would lock real users out', () => {
    const rules = fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8');
    const ims = rules.match(/function imsWorkspace\(\) \{ return '([^']+)'; \}/)?.[1];
    const gis = rules.match(/function gisWorkspace\(\) \{ return '([^']+)'; \}/)?.[1];
    expect([ims, gis]).toEqual([IMS, GIS]);
    expect(isTradingWorkspace(ims)).toBe(true);
    expect(isTradingWorkspace(gis)).toBe(true);
  });

  it('web (utils/activeAccount) agrees with mobile and with the rules', () => {
    for (const ws of [IMS, GIS, REVIEW, '', null]) expect(webIsTrading(ws)).toBe(isTradingWorkspace(ws));
  });
});
