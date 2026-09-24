import { describe, expect, it } from 'vitest';
import {
    CATEGORY_KEYS,
    categoryOf,
    defaultNotificationPrefs,
    isCategoryEnabled,
    isNotificationEnabled,
    normalizeNotificationPrefs,
    PUSH_CATEGORIES,
    shouldDeliverPush,
} from '../utils/notificationPrefs';

// One preference document per person, read by the web bell, the mobile app and the push
// sender. These pin the rules all three depend on.

describe('notification categories', () => {
    // Every notification type the code base emits today (grep 'type:' in logEvent /
    // ensureNotification callers), and the switch that controls it.
    const cases = [
        ['payment.recorded', 'payments'],
        ['settlement.overdue', 'payments'],
        ['invoice.finalized', 'invoices'],
        ['invoice.unpaid', 'invoices'],
        ['invoice.saved', 'invoices'],
        ['invoice.splitPending', 'splits'],
        ['shipment.status', 'shipments'],
        ['shipment.updated', 'shipments'],
        ['shipment.etd', 'shipments'],
        ['shipment.eta', 'shipments'],
        ['contract.created', 'contractCreated'],
        ['contract.delayed', 'contracts'],
        ['contract.updated', 'contracts'],
        ['stock.stale', 'storage'],
        ['comment.added', 'comments'],
        ['auth.login', 'other'],
    ];
    it.each(cases)('%s → %s', (type, key) => {
        expect(categoryOf({ type })).toBe(key);
    });

    it('a stock-related notification without a stock.* type is still Storage', () => {
        expect(categoryOf({ type: 'activity', entityType: 'stock' })).toBe('storage');
    });

    it('"Contract created" can be switched off without silencing contract delays', () => {
        const prefs = { categories: { contractCreated: false } };
        expect(isNotificationEnabled(prefs, { type: 'contract.created' })).toBe(false);
        expect(isNotificationEnabled(prefs, { type: 'contract.delayed' })).toBe(true);
    });
});

describe('preference documents', () => {
    it('someone who never opened the settings receives everything', () => {
        const d = defaultNotificationPrefs();
        CATEGORY_KEYS.forEach((k) => expect(d.categories[k]).toBe(true));
        expect(isNotificationEnabled(null, { type: 'shipment.eta' })).toBe(true);
    });

    it('only an explicit false switches a category off; a newly added category defaults on', () => {
        const n = normalizeNotificationPrefs({ categories: { shipments: false, payments: 'no', legacyKey: false } });
        expect(n.categories.shipments).toBe(false);
        expect(n.categories.payments).toBe(true);
        expect(n.categories.comments).toBe(true);
        expect(n.categories).not.toHaveProperty('legacyKey');
    });

    it('a disabled category is actually suppressed; the rest still arrive', () => {
        const prefs = { categories: { shipments: false } };
        expect(isNotificationEnabled(prefs, { type: 'shipment.status' })).toBe(false);
        expect(isNotificationEnabled(prefs, { type: 'payment.recorded' })).toBe(true);
    });
});

describe('push delivery', () => {
    const cat = PUSH_CATEGORIES.overdueReceivables;
    const prefs = [
        { userUid: 'u1', userEmail: 'anna@x.com', categories: { invoices: false } },
        { userUid: 'u2', userEmail: 'ben@x.com', categories: { shipments: false } },
    ];

    it('the overdue push is controlled by the Invoices switch', () => {
        expect(cat).toBe('invoices');
    });

    it('matches a device to its owner by user id', () => {
        expect(shouldDeliverPush(prefs, { userUid: 'u1' }, cat)).toBe(false);
        expect(shouldDeliverPush(prefs, { userUid: 'u2' }, cat)).toBe(true);
    });

    it('falls back to email for devices registered before the id was stored', () => {
        expect(shouldDeliverPush(prefs, { userEmail: 'ANNA@x.com' }, cat)).toBe(false);
    });

    it('a device whose owner has no preferences receives the push', () => {
        expect(shouldDeliverPush(prefs, { userUid: 'u9', userEmail: 'zed@x.com' }, cat)).toBe(true);
        expect(shouldDeliverPush([], {}, cat)).toBe(true);
    });

    it('isCategoryEnabled is the single switch both surfaces read', () => {
        expect(isCategoryEnabled({ categories: { storage: false } }, 'storage')).toBe(false);
    });
});
