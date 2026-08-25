// Which of the two company accounts the user is currently looking at.
//
// `uidCollection` has two writers that used to disagree. The token claim carries a
// member's HOME account, and the selector in the header carries the account they
// deliberately switched to. The claim is re-read on sign-in, after the super-admin
// self-heal, and whenever the tab regains focus (throttled to 2 minutes) — and each
// of those re-reads overwrote the switch, snapping the user back to their home
// account mid-work with nothing on screen to say so. Both directions were reported:
// a GIS member sent back to GIS while working in IMS, an IMS member back to IMS.
// Worse than the annoyance, a save made after the snap wrote into the account the
// user was no longer looking at.
//
// So the deliberate choice is remembered here, and it wins over the claim until it
// is changed or the session ends. sessionStorage rather than localStorage is
// deliberate: it is scoped to ONE TAB, so GIS open in one tab and IMS in another
// stop fighting over a single setting.

export const ACCOUNTS = [
    { id: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2', uidCollection: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2', name: 'IMS' },
    { id: 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS', uidCollection: 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS', name: 'GIS' },
];

const KEY = 'ims:activeAccount';

export const accountName = (uid) => ACCOUNTS.find(a => a.id === uid)?.name || '';

// An id that isn't one of ours is treated as no choice at all — storage is
// writable by anything running on the page and must not steer where data lands.
export const readActiveAccount = () => {
    try {
        const v = sessionStorage.getItem(KEY);
        return ACCOUNTS.some(a => a.id === v) ? v : null;
    } catch {
        return null;
    }
};

export const writeActiveAccount = (uid) => {
    try {
        if (ACCOUNTS.some(a => a.id === uid)) sessionStorage.setItem(KEY, uid);
        else sessionStorage.removeItem(KEY);
    } catch {
        // Private mode with storage blocked: the switch still applies to this
        // session in memory, it just won't survive a reload.
    }
};

export const clearActiveAccount = () => {
    try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
};
