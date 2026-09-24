// Notification preferences — one definition for web and mobile.
//
// Copied byte-for-byte to mobile/src/shared/notificationPrefs.js; the parity suite
// (__tests__/parity/shared-modules.test.ts) fails if the two ever differ.
//
// Each person chooses which kinds of notification they receive. The choice is stored ONCE,
// in Firestore at {workspace}/data/notificationPrefs/{userUid}, and read by everything
// that notifies: the web bell and its arrival chime/pop-ups, the mobile feed and badge, and
// the daily push sender. There is no second copy that could disagree — the web bell's old
// per-browser "mute" (localStorage) is migrated into this document and then dropped.
//
// A category that is off is suppressed everywhere: no badge count, no chime, no pop-up, no
// push, and it is left out of the main feed. It is not deleted — opening that category on
// its own still lists what happened, so turning a category off never hides a record.

// Order matters: the first match wins, so the narrow rules sit above the broad ones.
export const NOTIFICATION_CATEGORIES = [
    {
        key: 'payments',
        label: 'Payments',
        description: 'Payments recorded, and settlements coming due',
        match: (n) => /^(payment|settlement)/.test(n.type || ''),
    },
    {
        key: 'splits',
        label: 'IMS/GIS split',
        description: 'Invoices waiting for their IMS/GIS split',
        match: (n) => /\.splitPending$/.test(n.type || ''),
    },
    {
        key: 'invoices',
        label: 'Invoices',
        description: 'Invoices finalised, and invoices unpaid or overdue',
        match: (n) => (n.type || '').startsWith('invoice'),
    },
    {
        key: 'shipments',
        label: 'Shipments',
        description: 'Shipment status, ETD and ETA changes',
        match: (n) => (n.type || '').startsWith('shipment'),
    },
    {
        key: 'contractCreated',
        label: 'Contract created',
        description: 'A new purchase contract is added',
        match: (n) => n.type === 'contract.created',
    },
    {
        key: 'contracts',
        label: 'Contracts',
        description: 'Delayed contracts and other contract alerts',
        match: (n) => (n.type || '').startsWith('contract'),
    },
    {
        key: 'storage',
        label: 'Storage / Demurrage',
        description: 'Stock sitting too long in a warehouse',
        match: (n) => (n.type || '').startsWith('stock') || n.entityType === 'stock',
    },
    {
        key: 'comments',
        label: 'Comments',
        description: 'New comments on contracts and invoices',
        match: (n) => (n.type || '').startsWith('comment'),
    },
];

export const OTHER_CATEGORY = { key: 'other', label: 'Other', description: 'Everything else' };

export const CATEGORY_KEYS = [...NOTIFICATION_CATEGORIES.map((c) => c.key), OTHER_CATEGORY.key];

/** Which category a notification belongs to. */
export const categoryOf = (n) => NOTIFICATION_CATEGORIES.find((c) => c.match(n || {}))?.key || OTHER_CATEGORY.key;

export const categoryLabel = (key) =>
    (NOTIFICATION_CATEGORIES.find((c) => c.key === key) || OTHER_CATEGORY).label;

/** Everything on — what a person who has never opened the settings receives. */
export const defaultNotificationPrefs = () => ({
    categories: Object.fromEntries(CATEGORY_KEYS.map((k) => [k, true])),
});

/**
 * A stored document → a complete preference set. A category added after someone saved
 * their choices is ON for them (they could not have turned off something that did not
 * exist), and anything that is not literally `false` counts as on.
 */
export const normalizeNotificationPrefs = (raw) => {
    const base = defaultNotificationPrefs();
    const stored = (raw && typeof raw === 'object' && raw.categories) || {};
    CATEGORY_KEYS.forEach((k) => {
        base.categories[k] = stored[k] !== false;
    });
    return base;
};

export const isCategoryEnabled = (prefs, key) => normalizeNotificationPrefs(prefs).categories[key] !== false;

/** Should this person be notified about this notification? */
export const isNotificationEnabled = (prefs, n) => isCategoryEnabled(prefs, categoryOf(n));

/** Where the preference document lives, as path segments. */
export const notificationPrefsPath = (uidCollection, userUid) => [uidCollection, 'data', 'notificationPrefs', userUid];

/** The push the server sends each morning, and the category that controls it. */
export const PUSH_CATEGORIES = {
    overdueReceivables: 'invoices',
};

/**
 * Server side: does this device's owner want this push? Devices are matched to their
 * owner by user id, or by email for devices registered before the id was recorded. A
 * device whose owner has no stored preferences receives everything (the default).
 */
export const shouldDeliverPush = (prefsByUser, device, category) => {
    const list = Array.isArray(prefsByUser) ? prefsByUser : [];
    const email = String(device?.userEmail || '').toLowerCase();
    const mine = list.find(
        (p) => (device?.userUid && p.userUid === device.userUid) || (email && String(p.userEmail || '').toLowerCase() === email)
    );
    return isCategoryEnabled(mine, category);
};
