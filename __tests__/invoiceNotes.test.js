import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { originalRefsOf, relinkOriginal } from '../utils/invoiceNotes.js';

// A Credit / Final Note re-dated or saved from the contract window refreshes its original
// invoice's link (`cnORfl`). GIS #40 (2026-10-07): the original could not be found that way,
// the save threw, and the Save button stayed on "Saving" — the note's new date never saved.

const original = { id: 'orig-40', invoice: 40, date: '2026-05-12', invType: '1111' };
const finalNote = { id: 'fn-40', invoice: 40, date: '2026-09-30', invType: '3333' };

describe('originalRefsOf — where a note\'s original might be', () => {
    it('tries the note\'s own pointer first, then the contract\'s entry under the same number', () => {
        const note = { ...finalNote, originalInvoice: { id: 'orig-40', date: '2026-05-12' } };
        const contract = { invoices: [{ ...original, id: 'other-40' }, finalNote] };
        expect(originalRefsOf(note, contract).map(r => r.id)).toEqual(['orig-40', 'other-40']);
    });

    it('finds the contract entry whether the number is text or a number, and whether the type is a code or a label', () => {
        expect(originalRefsOf({ invoice: '40' }, { invoices: [original] }).map(r => r.id)).toEqual(['orig-40']);
        const labelled = { ...original, invType: 'Invoice' };
        expect(originalRefsOf({ invoice: 40 }, { invoices: [labelled] }).map(r => r.id)).toEqual(['orig-40']);
    });

    it('never takes another note under the same number for the original', () => {
        expect(originalRefsOf({ invoice: 40 }, { invoices: [finalNote, { ...finalNote, id: 'cn-40', invType: '2222' }] })).toEqual([]);
    });

    it('keeps only references that can address a record, each once', () => {
        const note = { invoice: 40, originalInvoice: { id: 'orig-40', date: '2026-05-12' } };
        expect(originalRefsOf(note, { invoices: [original] }).map(r => r.id)).toEqual(['orig-40']);
        expect(originalRefsOf({ invoice: 40, originalInvoice: { id: 'orig-40' } }, { invoices: [] })).toEqual([]);
        expect(originalRefsOf({ invoice: 40 }, { invoices: [{ ...original, date: '' }] })).toEqual([]);
        expect(originalRefsOf({ invoice: 40 }, undefined)).toEqual([]);
    });
});

describe('relinkOriginal — never stops the note\'s save', () => {
    it('points the original at the note through the first reference that finds it', async () => {
        const update = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(2026);
        const note = { ...finalNote, originalInvoice: { id: 'stale', date: '2025-01-01' } };
        const pointer = { id: 'fn-40', date: '2026-10-07' };
        await expect(relinkOriginal(update, note, { invoices: [original] }, pointer)).resolves.toBe(true);
        expect(update).toHaveBeenCalledTimes(2);
        expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'orig-40' }), { cnORfl: pointer });
    });

    it('resolves false — instead of throwing — when the original is nowhere to be found (the GIS #40 hang)', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const update = vi.fn();
        // The note has no pointer and the contract lists no original under its number:
        // the old code passed `undefined` to updateDocument and the save threw.
        await expect(relinkOriginal(update, { ...finalNote }, { invoices: [finalNote] }, { id: 'fn-40', date: '2026-10-07' }))
            .resolves.toBe(false);
        expect(update).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    it('carries on past a write that fails, and reports false if none succeeds', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const update = vi.fn().mockRejectedValue(Object.assign(new Error('No document to update'), { code: 'not-found' }));
        const note = { ...finalNote, originalInvoice: { id: 'orig-40', date: '2026-05-12' } };
        await expect(relinkOriginal(update, note, { invoices: [{ ...original, id: 'other-40' }] }, { id: 'fn-40', date: '2026-10-07' }))
            .resolves.toBe(false);
        expect(update).toHaveBeenCalledTimes(2);
        warn.mockRestore();
    });

    it('passes a deleteField sentinel through untouched when a note is deleted', async () => {
        const sentinel = { _methodName: 'deleteField' };
        const update = vi.fn().mockResolvedValue(2026);
        await relinkOriginal(update, { ...finalNote }, { invoices: [original] }, sentinel);
        expect(update).toHaveBeenCalledWith(expect.objectContaining({ id: 'orig-40' }), { cnORfl: sentinel });
    });
});

// The hook itself pulls React and a JSX module, so these two are read as source.
describe('hooks/useInvoiceState.js — the save paths', () => {
    const src = readFileSync(new URL('../hooks/useInvoiceState.js', import.meta.url), 'utf8');
    const body = (name, next) => src.slice(src.indexOf(`${name}: async`), src.indexOf(next, src.indexOf(`${name}: async`)));

    it('no longer hands a looked-up original straight to updateDocument', () => {
        expect(src).not.toMatch(/updateDocument\(\s*uidCollection,\s*'invoices',\s*'cnORfl'/);
        expect(src).not.toMatch(/delField\(\s*uidCollection,\s*'invoices',\s*'cnORfl'/);
    });

    it('saving from the contract window reports a failure instead of leaving the button on "Saving"', () => {
        const save = body('saveData_InvoiceInContracts', 'saveData_InvoiceInInvoices: async');
        expect(save).toMatch(/try\s*\{/);
        expect(save).toMatch(/catch\s*\(e\)\s*\{[\s\S]*setToast[\s\S]*return false;/);
    });

    it('a re-dated invoice is written into its new year before the copy in the old year is removed', () => {
        const save = body('saveData_InvoiceInInvoices', 'copy_Invoice: async');
        const written = save.indexOf("await saveData(uidCollection, 'invoices', tmpValue)");
        const removed = save.indexOf('await delDoc(');
        expect(written).toBeGreaterThan(-1);
        expect(removed).toBeGreaterThan(written);
    });
});
