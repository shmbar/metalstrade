import { describe, it, expect } from 'vitest';
import { duplicateEntries, entryNameKey, foldEntries, safeMerges, renameLots } from '../utils/productEntries.js';

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

/* Renaming a stock row from the Stocks page's own window — the Materials Breakdown ✎
   rule, applied to the row's lots. IMS PO 110926: one line, "MoW Oxide", one lot. */
describe('renameLots — a stock row renamed from the Stocks page', () => {
    const mow = () => [{ id: 'mow', description: 'MoW Oxide', qnty: 54.716, unitPrc: 41442.37 }];
    const lot = (id, line) => ({ id, description: line, qnty: 54.716 });

    it('the PO\'s own line keeps its name; the lot gets an entry of its own', () => {
        const r = renameLots({ productsData: mow(), lots: [lot('l1', 'mow')], lotIds: ['l1'], name: 'MoW Oxide 40Mo 30W', newId: 'n1' });
        expect(r.mode).toBe('split');
        expect(r.productsData.find(p => p.id === 'mow').description).toBe('MoW Oxide');
        expect(r.productsData.find(p => p.id === 'n1')).toMatchObject({ description: 'MoW Oxide 40Mo 30W', import: true, importedFrom: { doc: 'rename-split', sourceProduct: 'mow' } });
        expect(r.lots[0].description).toBe('n1');
        expect(r.entryId).toBe('n1');
    });

    it('a hidden entry only these lots use is renamed in place', () => {
        const pd = [...mow(), { id: 'h1', description: 'MoW Oxide 40Mo', import: true, importedFrom: { doc: 'rename-split', sourceProduct: 'mow' } }];
        const r = renameLots({ productsData: pd, lots: [lot('l1', 'h1')], lotIds: ['l1'], name: 'MoW Oxide 40Mo 30W', newId: 'n1' });
        expect(r.mode).toBe('renamed');
        expect(r.productsData).toHaveLength(2);
        expect(r.productsData.find(p => p.id === 'h1').description).toBe('MoW Oxide 40Mo 30W');
        expect(r.lots[0].description).toBe('h1');
    });

    it('a hidden entry other lots share is split, so those lots keep their name', () => {
        const pd = [...mow(), { id: 'h1', description: 'Mixed', import: true, importedFrom: { doc: 'supplier-invoice' } }];
        const r = renameLots({ productsData: pd, lots: [lot('l1', 'h1'), lot('l2', 'h1')], lotIds: ['l1'], name: 'MoW Oxide fines', newId: 'n1' });
        expect(r.mode).toBe('split');
        expect(r.lots.find(l => l.id === 'l2').description).toBe('h1');
        expect(r.productsData.find(p => p.id === 'h1').description).toBe('Mixed');
    });

    it('named back to the PO line it came from, it is one line again', () => {
        const pd = [...mow(), { id: 'h1', description: 'MoW Oxid', import: true, importedFrom: { doc: 'rename-split', sourceProduct: 'mow' } }];
        const r = renameLots({ productsData: pd, lots: [lot('l1', 'h1')], lotIds: ['l1'], name: ' MoW Oxide ', newId: 'n1' });
        expect(r.mode).toBe('folded');
        expect(r.productsData.map(p => p.id)).toEqual(['mow']);
        expect(r.lots[0].description).toBe('mow');
        // …unless something else still names that entry: then it is only renamed
        const kept = renameLots({ productsData: pd, lots: [lot('l1', 'h1')], lotIds: ['l1'], name: 'MoW Oxide', newId: 'n1', canFold: false });
        expect(kept.mode).toBe('renamed');
        expect(kept.lots[0].description).toBe('h1');
    });

    it('changes nothing for the same name, an empty one, or lots on two different lines', () => {
        expect(renameLots({ productsData: mow(), lots: [lot('l1', 'mow')], lotIds: ['l1'], name: 'MoW Oxide ', newId: 'n1' }).mode).toBe('none');
        expect(renameLots({ productsData: mow(), lots: [lot('l1', 'mow')], lotIds: ['l1'], name: '  ', newId: 'n1' }).mode).toBe('none');
        const two = [...mow(), { id: 'x', description: 'Other' }];
        expect(renameLots({ productsData: two, lots: [lot('l1', 'mow'), lot('l2', 'x')], lotIds: ['l1', 'l2'], name: 'New', newId: 'n1' }).mode).toBe('none');
    });
});
