import { describe, it, expect } from 'vitest';
import {
    activityLeaderboard, weeklyBreakdown, loginCounts, coverageFrom,
    splitPresence, startOfWeek, WEEK_MS, DAY_MS,
} from '@utils/activityStats';

// A fixed Wednesday so week boundaries are unambiguous: 2026-08-26T12:00 local.
const NOW = new Date(2026, 7, 26, 12, 0, 0).getTime();
const MONDAY = startOfWeek(NOW);

const ev = (actorName, atMs, type = 'contract.updated', actorUid = actorName.toLowerCase()) =>
    ({ actorName, actorUid, type, createdAtMs: atMs, entityType: type.split('.')[0] });

describe('startOfWeek', () => {
    it('anchors on Monday, not Sunday', () => {
        expect(new Date(MONDAY).getDay()).toBe(1);
        expect(new Date(MONDAY).getDate()).toBe(24);          // Mon 24 Aug 2026
    });

    it('keeps Sunday in the week that just ended', () => {
        const sunday = new Date(2026, 7, 30, 23, 0, 0).getTime();
        expect(startOfWeek(sunday)).toBe(MONDAY);
    });
});

describe('activityLeaderboard', () => {
    const rows = [
        ...Array.from({ length: 6 }, (_, i) => ev('Anna', MONDAY + i * 1000)),
        ...Array.from({ length: 3 }, (_, i) => ev('Bo', MONDAY + i * 1000)),
        ev('Cyd', MONDAY + 500),
    ];

    it('ranks by event count and reports each share of the total', () => {
        const out = activityLeaderboard(rows, { from: MONDAY, to: NOW });
        expect(out.map(r => r.name)).toEqual(['Anna', 'Bo', 'Cyd']);
        expect(out[0].events).toBe(6);
        expect(out[0].percent).toBeCloseTo(60);
        expect(out[1].percent).toBeCloseTo(30);
        expect(out.reduce((n, r) => n + r.percent, 0)).toBeCloseTo(100);
    });

    it('counts sign-ins separately so they cannot inflate the ranking', () => {
        const withLogins = [...rows, ...Array.from({ length: 20 }, (_, i) => ev('Cyd', MONDAY + i, 'auth.login'))];
        const out = activityLeaderboard(withLogins, { from: MONDAY, to: NOW });
        expect(out[0].name).toBe('Anna');                       // 20 logins do not make Cyd the busiest
        const cyd = out.find(r => r.name === 'Cyd');
        expect(cyd.events).toBe(1);
        expect(cyd.logins).toBe(20);
        expect(out.reduce((n, r) => n + r.percent, 0)).toBeCloseTo(100);
    });

    it('ignores events outside the window', () => {
        const out = activityLeaderboard([...rows, ev('Zed', MONDAY - WEEK_MS)], { from: MONDAY, to: NOW });
        expect(out.find(r => r.name === 'Zed')).toBeUndefined();
    });

    it('groups by uid, so a renamed user is still one person', () => {
        const out = activityLeaderboard([
            { actorUid: 'u1', actorName: 'A Smith', type: 'contract.updated', createdAtMs: MONDAY },
            { actorUid: 'u1', actorName: 'Anna Smith', type: 'contract.updated', createdAtMs: MONDAY + 10 },
        ], { from: MONDAY, to: NOW });
        expect(out).toHaveLength(1);
        expect(out[0].events).toBe(2);
    });

    it('returns an empty list, not NaN percentages, when nothing happened', () => {
        expect(activityLeaderboard([], { from: MONDAY, to: NOW })).toEqual([]);
    });
});

describe('weeklyBreakdown', () => {
    it('buckets by week, most recent first', () => {
        const rows = [
            ev('Anna', MONDAY + DAY_MS),
            ev('Anna', MONDAY - WEEK_MS + DAY_MS),
            ev('Bo', MONDAY - WEEK_MS + 2 * DAY_MS),
        ];
        const out = weeklyBreakdown(rows, { weeks: 3, now: NOW });
        expect(out).toHaveLength(3);
        expect(out[0].weekStartMs).toBe(MONDAY);
        expect(out[0].total).toBe(1);
        expect(out[1].total).toBe(2);
        expect(out[2].total).toBe(0);
    });

    it('does not report the current week as running past now', () => {
        const [thisWeek] = weeklyBreakdown([], { weeks: 1, now: NOW });
        expect(thisWeek.weekEndMs).toBe(NOW);
    });
});

describe('loginCounts', () => {
    const rows = [
        ...Array.from({ length: 12 }, (_, i) => ev('GIS Admin', NOW - i * DAY_MS, 'auth.login')),
        ev('GIS Admin', NOW - 40 * DAY_MS, 'auth.login'),        // older than the window
        ev('Bo', NOW - 2 * DAY_MS, 'auth.login'),
        ev('Bo', NOW - DAY_MS, 'contract.updated'),              // not a login
    ];

    it('answers "how many times did he log in in the last month"', () => {
        const out = loginCounts(rows, { from: NOW - 30 * DAY_MS, to: NOW });
        expect(out[0]).toMatchObject({ name: 'GIS Admin', logins: 12 });
        expect(out[1]).toMatchObject({ name: 'Bo', logins: 1 });
        expect(out[0].lastLoginMs).toBe(NOW);
    });

    it('counts only sign-ins, never other work', () => {
        const out = loginCounts(rows, { from: NOW - 30 * DAY_MS, to: NOW });
        expect(out.find(r => r.name === 'Bo').logins).toBe(1);
    });
});

describe('coverageFrom', () => {
    it('reports the oldest record so a zero can be explained rather than trusted', () => {
        const rows = [ev('Anna', 5000, 'auth.login'), ev('Anna', 9000, 'auth.login'), ev('Bo', 1000)];
        expect(coverageFrom(rows, 'auth.login')).toBe(5000);
        expect(coverageFrom(rows)).toBe(1000);
    });

    it('is null when there is nothing at all', () => {
        expect(coverageFrom([], 'auth.login')).toBeNull();
    });
});

describe('splitPresence', () => {
    it('treats a recent heartbeat as here and a stale one as away', () => {
        const { online, away } = splitPresence([
            { uid: 'a', name: 'Anna', lastSeenMs: NOW - 30_000 },
            { uid: 'b', name: 'Bo', lastSeenMs: NOW - 30 * 60_000 },
        ], { now: NOW });
        expect(online.map(p => p.name)).toEqual(['Anna']);
        expect(away.map(p => p.name)).toEqual(['Bo']);
    });

    it('drops someone straight out of online when they sign out', () => {
        const { online, away } = splitPresence(
            [{ uid: 'a', name: 'Anna', lastSeenMs: 0, signedOut: true }], { now: NOW });
        expect(online).toEqual([]);
        expect(away).toHaveLength(1);
    });

    it('sorts the most recently seen first', () => {
        const { online } = splitPresence([
            { uid: 'a', name: 'Anna', lastSeenMs: NOW - 60_000 },
            { uid: 'b', name: 'Bo', lastSeenMs: NOW - 5_000 },
        ], { now: NOW });
        expect(online.map(p => p.name)).toEqual(['Bo', 'Anna']);
    });
});
