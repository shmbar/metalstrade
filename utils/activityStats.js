// Summaries over the activity feed: who is most active, and how often people sign in.
//
// Pure functions over the rows loadActivity already returns, so the Activity page can
// answer "who did the most this week" and "how many times did GIS Admin log in last
// month" without a second collection or a Firestore aggregation.
//
// One thing every caller has to keep in mind: LOGIN HISTORY ONLY EXISTS FROM THE DAY
// sign-in logging shipped. Firebase Auth keeps `lastSignInTime` and nothing before it,
// so a count over a window that predates the feature is a real zero, not a bug. Use
// `coverageFrom` to say so in the UI rather than showing a confident 0.

export const DAY_MS = 86_400_000;
export const WEEK_MS = 7 * DAY_MS;

export const LOGIN_TYPE = 'auth.login';
export const LOGOUT_TYPE = 'auth.logout';

// Monday 00:00 of the week containing `ms`. Weeks are Monday-based because the
// client's working week is, and "most active this week" should not reset on Sunday.
export const startOfWeek = (ms) => {
    const d = new Date(ms);
    const day = (d.getDay() + 6) % 7;               // Mon = 0 … Sun = 6
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
};

export const startOfDay = (ms) => {
    const d = new Date(ms);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

const inWindow = (r, from, to) => {
    const t = r?.createdAtMs || 0;
    return t >= from && t <= to;
};

/**
 * Per-user activity share over a window.
 *
 * Percentages are of the total events in the window, so they sum to 100 — "40% of
 * what happened this week was Anna". They are NOT a share of the workspace's users,
 * and a single very busy day can carry a week; the raw count is shown alongside for
 * exactly that reason.
 *
 * @returns [{ uid, name, events, logins, percent, lastAtMs }] busiest first
 */
export const activityLeaderboard = (rows = [], { from = 0, to = Date.now() } = {}) => {
    const win = (rows || []).filter(r => inWindow(r, from, to));
    // Sign-ins are counted separately: they are not work, and letting them into the
    // total would rank whoever logs in most rather than whoever does the most.
    const work = win.filter(r => r.type !== LOGIN_TYPE && r.type !== LOGOUT_TYPE);
    const total = work.length;

    const by = new Map();
    const bucket = (r) => {
        const key = r.actorUid || r.actorName || 'unknown';
        if (!by.has(key)) {
            by.set(key, { uid: r.actorUid || '', name: r.actorName || 'Unknown', events: 0, logins: 0, lastAtMs: 0 });
        }
        return by.get(key);
    };

    work.forEach(r => {
        const e = bucket(r);
        e.events += 1;
        e.lastAtMs = Math.max(e.lastAtMs, r.createdAtMs || 0);
    });
    win.filter(r => r.type === LOGIN_TYPE).forEach(r => {
        const e = bucket(r);
        e.logins += 1;
        e.lastAtMs = Math.max(e.lastAtMs, r.createdAtMs || 0);
    });

    return [...by.values()]
        .map(e => ({ ...e, percent: total ? (e.events / total) * 100 : 0 }))
        .sort((a, b) => b.events - a.events || b.logins - a.logins || a.name.localeCompare(b.name));
};

/**
 * The same leaderboard, one entry per week, most recent week first.
 * @returns [{ weekStartMs, weekEndMs, total, rows: [...leaderboard] }]
 */
export const weeklyBreakdown = (rows = [], { weeks = 8, now = Date.now() } = {}) => {
    const thisWeek = startOfWeek(now);
    const out = [];
    for (let i = 0; i < weeks; i++) {
        const from = thisWeek - i * WEEK_MS;
        const to = from + WEEK_MS - 1;
        const leaders = activityLeaderboard(rows, { from, to });
        out.push({
            weekStartMs: from,
            weekEndMs: Math.min(to, now),
            total: leaders.reduce((n, r) => n + r.events, 0),
            rows: leaders,
        });
    }
    return out;
};

/**
 * Sign-in counts per user over a window — the "how many times did he log in in the
 * last month" question.
 * @returns [{ uid, name, logins, lastLoginMs }] most logins first
 */
export const loginCounts = (rows = [], { from = 0, to = Date.now() } = {}) => {
    const by = new Map();
    (rows || [])
        .filter(r => r.type === LOGIN_TYPE && inWindow(r, from, to))
        .forEach(r => {
            const key = r.actorUid || r.actorName || 'unknown';
            if (!by.has(key)) by.set(key, { uid: r.actorUid || '', name: r.actorName || 'Unknown', logins: 0, lastLoginMs: 0 });
            const e = by.get(key);
            e.logins += 1;
            e.lastLoginMs = Math.max(e.lastLoginMs, r.createdAtMs || 0);
        });
    return [...by.values()].sort((a, b) => b.logins - a.logins || a.name.localeCompare(b.name));
};

/**
 * The oldest event we hold. A count over a window starting before this is reporting
 * on time we have no records for, and the UI should say "since <date>" instead of
 * implying the zero is real.
 */
export const coverageFrom = (rows = [], type = null) => {
    const pool = type ? (rows || []).filter(r => r.type === type) : (rows || []);
    const times = pool.map(r => r.createdAtMs || 0).filter(Boolean);
    return times.length ? Math.min(...times) : null;
};

/** Split presence rows into who is here now and who is not. */
export const splitPresence = (presence = [], { onlineMs = 300_000, now = Date.now() } = {}) => {
    const online = [];
    const away = [];
    (presence || []).forEach(p => {
        const seen = p?.lastSeenMs || 0;
        // signedOut zeroes the stamp, so an explicit logout lands in `away`
        // immediately instead of lingering for the rest of the window.
        (seen && now - seen <= onlineMs ? online : away).push(p);
    });
    online.sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0));
    away.sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0));
    return { online, away };
};
