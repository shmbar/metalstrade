import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { forgetSavedFilter } from '../components/table/useTablePrefs.js';

/* A table remembers its column filters per route in localStorage. On 2026-10-07 the Invoices
   Status filter's words changed meaning — "Draft" had been every invoice, and became only the
   invoices whose Draft box is ticked — so a tick left over from before would have hidden all
   but a handful of rows. forgetSavedFilter drops that one column's saved filter. */
describe('forgetSavedFilter — one column\'s saved filter, dropped from a route\'s setup', () => {
    const KEY = 'ims.table.v1./invoices.filters';
    let store;
    beforeEach(() => {
        store = new Map();
        globalThis.window = {
            localStorage: {
                getItem: (k) => (store.has(k) ? store.get(k) : null),
                setItem: (k, v) => { store.set(k, String(v)); },
            },
        };
    });
    afterEach(() => { delete globalThis.window; });
    const saved = () => JSON.parse(store.get(KEY));

    it('drops that column and leaves the other filters as they were', () => {
        store.set(KEY, JSON.stringify([{ id: 'invoiceStatus', value: ['Draft'] }, { id: 'client', value: ['SJM'] }]));
        forgetSavedFilter('/invoices', 'invoiceStatus');
        expect(saved()).toEqual([{ id: 'client', value: ['SJM'] }]);
    });

    it('writes nothing when the column has no saved filter, or nothing is saved at all', () => {
        store.set(KEY, JSON.stringify([{ id: 'client', value: ['SJM'] }]));
        const before = store.get(KEY);
        forgetSavedFilter('/invoices', 'invoiceStatus');
        expect(store.get(KEY)).toBe(before);
        store.delete(KEY);
        forgetSavedFilter('/invoices', 'invoiceStatus');
        expect(store.has(KEY)).toBe(false);
    });

    it('touches only the route it is given — and a second table on a route by its suffix', () => {
        const other = 'ims.table.v1./contracts.filters';
        const shared = 'ims.table.v1./stocks:shared.filters';
        store.set(other, JSON.stringify([{ id: 'invoiceStatus', value: ['Draft'] }]));
        store.set(shared, JSON.stringify([{ id: 'invoiceStatus', value: ['Draft'] }]));
        forgetSavedFilter('/invoices', 'invoiceStatus');
        expect(JSON.parse(store.get(other))).toHaveLength(1);
        forgetSavedFilter('/stocks', 'invoiceStatus', 'shared');
        expect(JSON.parse(store.get(shared))).toEqual([]);
    });

    it('a saved value that is not a list, or storage that throws, is left alone without an error', () => {
        store.set(KEY, '{"oops":true}');
        expect(() => forgetSavedFilter('/invoices', 'invoiceStatus')).not.toThrow();
        expect(store.get(KEY)).toBe('{"oops":true}');
        globalThis.window.localStorage.getItem = () => { throw new Error('blocked'); };
        expect(() => forgetSavedFilter('/invoices', 'invoiceStatus')).not.toThrow();
    });
});
