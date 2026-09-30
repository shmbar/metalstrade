// PO save — the tidy step and the exchange-rate fallback (web 4e46da90, 2026-09-30).
//
// Web's PO save (hooks/useContractsState.js) tidies the PO's own invoices / expenses lists
// — id-less entries dropped, each id once — so a duplicate stops counting twice in the
// PO's totals (PO 050626: a blank expense entry, B1049000 listed twice). It also keeps the
// PO's existing EUR rate when the lookup fails, instead of writing an invented one. The
// phone's saveContract (mobile/src/data/writes.ts) did neither. These tests run web's own
// tidyRefs beside the phone's port, and pin the phone's save to both behaviours.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { webFnSource, expectWebUnchanged } from './_helpers/webSource';
import { tidyRefs as mobileTidyRefs } from '../../mobile/src/lib/contractRefs';

const HOOK = 'hooks/useContractsState.js';
const webTidyRefs = (() => {
  const src = webFnSource(HOOK, 'tidyRefs');
  // eslint-disable-next-line no-new-func
  return new Function(`${src}; return tidyRefs;`)() as (list: unknown) => any[];
})();

const MESSY = [
  { id: 'B1049000', date: '2026-06-05', n: 1 },
  { id: '', date: '2026-06-05' }, // the blank entry "Move to shipment" wrote
  {},
  null,
  { id: 'B1049000', date: '2026-06-05', n: 2 }, // listed twice
  { id: 'X-7', date: '2026-06-09' },
  undefined,
];

describe('PO save — tidy the PO’s own invoice / expense lists (web parity)', () => {
  it("web's tidyRefs has not drifted", () => expectWebUnchanged(HOOK, 'tidyRefs', WEB_TIDY_HASH));

  it('drops id-less entries and keeps each id once — its first entry, in order', () => {
    expect(webTidyRefs(MESSY)).toEqual([{ id: 'B1049000', date: '2026-06-05', n: 1 }, { id: 'X-7', date: '2026-06-09' }]);
    expect(mobileTidyRefs(MESSY as any)).toEqual(webTidyRefs(MESSY));
  });

  it('agrees with web on the edge cases', () => {
    for (const input of [undefined, null, [], 'not a list', [{ id: 'a' }, { id: 'a' }, { id: 'a' }], [{ id: 'b' }, { id: 'c' }]]) {
      expect(mobileTidyRefs(input as any)).toEqual(webTidyRefs(input));
    }
  });

  it('the phone’s saveContract writes and re-stamps the tidied lists', () => {
    const src = readFileSync(join(__dirname, '../../mobile/src/data/writes.ts'), 'utf8');
    const save = src.slice(src.indexOf('export async function saveContract('), src.indexOf('// ── invoice creation'));
    expect(save).toContain('tidyRefs(value.invoices)');
    expect(save).toContain('tidyRefs(value.expenses)');
    expect(save).toContain('{ ...value, ...lists, lstSaved');
    expect(save).toContain('{ ...value, ...lists, id: newId()');
    expect(save).toContain('updatePoSupplierInv(uidCollection, { ...value, ...lists })');
    expect(save).toContain('updatePoSupplierExp(uidCollection, { ...value, ...lists })');
  });

  it('a failed rate lookup keeps the PO’s own rate on the phone, as on web', () => {
    const src = readFileSync(join(__dirname, '../../mobile/src/data/writes.ts'), 'utf8');
    const save = src.slice(src.indexOf('export async function saveContract('), src.indexOf('// ── invoice creation'));
    expect(save).toContain('(await poRate(startDate)) ?? value.euroToUSD ?? null');
    expect(readFileSync(join(__dirname, '../../hooks/useContractsState.js'), 'utf8'))
      .toContain('(await getCur(valueCon.dateRange.startDate)) ?? valueCon.euroToUSD ?? null');
  });
});

// Recorded 2026-09-30 from web 4e46da90.
const WEB_TIDY_HASH = '5565b5eb35af';
