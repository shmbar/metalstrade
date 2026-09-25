import { describe, it, expect } from 'vitest';
import { duplicateEntries, entryNameKey, foldEntries, safeMerges } from '../utils/productEntries.js';

// PO 110926-1 as it stood on 2026-09-25: the lot was renamed on the breakdown (a hidden
// rename-split took it), then the PO line itself was corrected to the same name.
const po110926 = () => [
    { id: 'ti64', description: 'Ti - 6Al-4V Powder' },
    { id: 'cpti', description: 'CpTi Powder' },
    { id: 'wire', description: 'Ti 6Al-4V Wire' },
    { id: 'copy', description: 'CpTi Powder', import: true, importedFrom: { sourceProduct: 'cpti', doc: 'rename-split' } },
];
const lots = () => [
    { id: 'lot1', description: 'ti64', qnty: 22.313 },
    { id: 'lot2', description: 'copy', qnty: 0.352 },
    { id: 'lot3', description: 'wire', qnty: 0.591 },
];

describe('duplicate hidden entries — folded back into their PO line', () => {
    it('finds the renamed lot whose PO line now carries the same name', () => {
        expect(duplicateEntries(po110926())).toEqual([{ from: 'copy', to: 'cpti' }]);
    });

    it('ignores case and spacing, not the words', () => {
        expect(entryNameKey('  CpTi   powder ')).toBe(entryNameKey('CpTi Powder'));
        const p = po110926();
        p[3].description = 'CpTi Powdr';                       // still different: a real rename
        expect(duplicateEntries(p)).toEqual([]);
    });

    it('only into the line it came from — never onto another line that shares the name', () => {
        const p = po110926();
        p[3].importedFrom = { sourceProduct: 'wire', doc: 'rename-split' };   // split off the wire line
        expect(duplicateEntries(p)).toEqual([]);
    });

    it('a supplier-invoice entry folds into a single-line PO of the same name, not a multi-line one', () => {
        const single = [{ id: 'l1', description: 'Ni Scrap' }, { id: 'h1', description: 'ni scrap', import: true, importedFrom: { doc: 'supplier-invoice' } }];
        expect(duplicateEntries(single)).toEqual([{ from: 'h1', to: 'l1' }]);
        const multi = [...single, { id: 'l2', description: 'Ni Scrap' }];
        expect(duplicateEntries(multi)).toEqual([]);
    });

    it('is held back while anything else in the ledger names the hidden entry', () => {
        const merges = duplicateEntries(po110926());
        const ledger = [{ id: 'lot2', description: 'copy' }];
        expect(safeMerges(merges, ledger, ['lot1', 'lot2', 'lot3'])).toEqual(merges);
        const sold = [...ledger, { id: 'sale9', type: 'out', descriptionId: 'copy' }];
        expect(safeMerges(merges, sold, ['lot1', 'lot2', 'lot3'])).toEqual([]);
        const deletedLot = [{ id: 'lot9', description: 'copy' }];          // a lot removed from the breakdown but not yet deleted
        expect(safeMerges(merges, deletedLot, ['lot1', 'lot2', 'lot3'])).toEqual([]);
    });

    it('re-points the lots and drops the entry; nothing else moves', () => {
        const { productsData, rows } = foldEntries(po110926(), lots(), [{ from: 'copy', to: 'cpti' }]);
        expect(productsData.map(p => p.id)).toEqual(['ti64', 'cpti', 'wire']);
        expect(rows.map(r => r.description)).toEqual(['ti64', 'cpti', 'wire']);
        expect(rows[1].qnty).toBe(0.352);
        const same = foldEntries(po110926(), lots(), []);
        expect(same.rows).toEqual(lots());
    });
});
