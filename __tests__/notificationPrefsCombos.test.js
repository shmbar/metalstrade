import { describe, expect, it } from 'vitest';
import {
    CATEGORY_KEYS, allCategories, categoryOf, enabledCategoryCount, isCategoryEnabled,
    isNotificationEnabled, shouldDeliverPush, PUSH_CATEGORIES, unreadCountFor,
} from '../utils/notificationPrefs';

// Every combination of the notification switches — 2^9 = 512 — against one real notification
// of every kind. A category that is off must hide its notifications, drop out of the badge and
// stop its push; every other category must be untouched by it.
const SAMPLE = {
    payments: { type: 'payment.recorded' },
    splits: { type: 'invoice.splitPending' },
    invoices: { type: 'invoice.finalized' },
    shipments: { type: 'shipment.eta' },
    contractCreated: { type: 'contract.created' },
    contracts: { type: 'contract.delayed' },
    storage: { type: 'stock.aging' },
    comments: { type: 'comment.added' },
    other: { type: 'something.new' },
};

describe('notification preferences — every combination', () => {
    it('each sample lands in the category it stands for', () => {
        expect(Object.keys(SAMPLE).sort()).toEqual([...CATEGORY_KEYS].sort());
        for (const [key, n] of Object.entries(SAMPLE)) expect(categoryOf(n)).toBe(key);
    });

    const combos = [];
    for (let mask = 0; mask < 1 << CATEGORY_KEYS.length; mask++) {
        combos.push(Object.fromEntries(CATEGORY_KEYS.map((k, i) => [k, !!(mask & (1 << i))])));
    }

    it(`all ${combos.length} combinations: list, badge and push follow exactly the switches`, () => {
        const uid = 'u1';
        const list = Object.entries(SAMPLE).map(([k, n]) => ({ id: k, readBy: [], ...n }));
        const readList = list.map((n) => ({ ...n, readBy: [uid] }));
        for (const categories of combos) {
            const prefs = { categories };
            const on = CATEGORY_KEYS.filter((k) => categories[k]);
            for (const [key, n] of Object.entries(SAMPLE)) {
                expect(isCategoryEnabled(prefs, key)).toBe(categories[key]);
                expect(isNotificationEnabled(prefs, n)).toBe(categories[key]);
            }
            // badge: one unread per category → exactly the categories that are on
            expect(unreadCountFor(list, uid, prefs)).toBe(on.length);
            // nothing read counts, whatever the switches
            expect(unreadCountFor(readList, uid, prefs)).toBe(0);
            expect(enabledCategoryCount(prefs)).toBe(on.length);
            // push: the overdue digest follows the Invoices switch only
            const push = shouldDeliverPush([{ userUid: uid, categories }], { userUid: uid }, PUSH_CATEGORIES.overdueReceivables);
            expect(push).toBe(categories[PUSH_CATEGORIES.overdueReceivables]);
        }
    });

    it('"All notifications" on / off', () => {
        expect(enabledCategoryCount({ categories: allCategories(true) })).toBe(CATEGORY_KEYS.length);
        expect(enabledCategoryCount({ categories: allCategories(false) })).toBe(0);
        expect(Object.keys(allCategories(true)).sort()).toEqual([...CATEGORY_KEYS].sort());
    });

    it('no document yet = everything on (a new user misses nothing)', () => {
        expect(enabledCategoryCount(null)).toBe(CATEGORY_KEYS.length);
        expect(unreadCountFor([{ id: 'a', type: 'payment.recorded' }], 'u1', null)).toBe(1);
    });

    it('badge ignores notifications meant for someone else and ones snoozed right now', () => {
        const now = 1_000_000;
        const list = [
            { id: 'a', type: 'payment.recorded', audience: ['u2'] },
            { id: 'b', type: 'payment.recorded', snoozedBy: { u1: now + 60_000 } },
            { id: 'c', type: 'payment.recorded', snoozedBy: { u1: now - 1 } },
            { id: 'd', type: 'payment.recorded' },
        ];
        expect(unreadCountFor(list, 'u1', null, now)).toBe(2); // c (snooze over) + d
    });
});
