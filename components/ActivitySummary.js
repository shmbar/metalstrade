'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserAuth } from '../contexts/useAuthContext';
import { loadActivity } from '../utils/utils';
import {
    activityLeaderboard, weeklyBreakdown, loginCounts, coverageFrom,
    startOfWeek, DAY_MS, WEEK_MS, LOGIN_TYPE,
} from '../utils/activityStats';
import { NameCell } from './Avatar';
import { TONES, toneChipStyle } from './statusUtils';
import { RefreshCw, Loader2, Info } from 'lucide-react';

const fmtDate = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const fmtFull = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

// The share bar. Deliberately one colour: these are people, not statuses, so the
// status families stay out of it and length alone carries the comparison.
const ShareBar = ({ percent }) => (
    <span className='inline-flex items-center gap-2 w-full'>
        <span className='relative rounded-full overflow-hidden shrink-0'
            style={{ width: 90, height: 6, background: 'var(--bg-sunken)' }}>
            <span className='absolute left-0 top-0 h-full rounded-full'
                style={{ width: `${Math.max(percent, percent > 0 ? 3 : 0)}%`, background: 'var(--brand)' }} />
        </span>
        <span className='numeric' style={{ color: 'var(--ink-secondary)' }}>{percent.toFixed(0)}%</span>
    </span>
);

const RANGES = [
    { id: 'week', label: 'This week', from: (now) => startOfWeek(now) },
    { id: '30d', label: 'Last 30 days', from: (now) => now - 30 * DAY_MS },
    { id: '90d', label: 'Last 90 days', from: (now) => now - 90 * DAY_MS },
];

/**
 * Who is doing the most, and how often people sign in.
 *
 * The honest caveat this panel has to carry: sign-ins have only been recorded since
 * the feature shipped, and Firebase keeps no history before that. A "0 logins" for a
 * window that starts earlier is missing data, not an idle user — so every login
 * figure is shown next to the date records actually begin.
 */
const ActivitySummary = () => {
    const { uidCollection } = UserAuth();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('week');
    const now = Date.now();

    const load = useCallback(async () => {
        if (!uidCollection) return;
        setLoading(true);
        // The feed is capped at 200 by default, which would silently truncate a
        // month's counting; ask for the whole window instead.
        setItems(await loadActivity(uidCollection, { max: 5000 }));
        setLoading(false);
    }, [uidCollection]);

    useEffect(() => { load(); }, [load]);

    const from = useMemo(() => (RANGES.find(r => r.id === range) || RANGES[0]).from(now), [range, now]);
    const leaders = useMemo(() => activityLeaderboard(items, { from, to: now }), [items, from, now]);
    const logins = useMemo(() => loginCounts(items, { from, to: now }), [items, from, now]);
    const weeks = useMemo(() => weeklyBreakdown(items, { weeks: 6, now }), [items, now]);
    const loginSince = useMemo(() => coverageFrom(items, LOGIN_TYPE), [items]);

    const totalEvents = leaders.reduce((n, r) => n + r.events, 0);
    const top = leaders[0];
    // Only a warning when the window actually reaches back past what we hold.
    const loginGap = !loginSince || loginSince > from;

    return (
        <div className='p-3'>
            <div className='flex flex-wrap items-center gap-2 mb-3'>
                <div className='flex items-center bg-[var(--bg-subtle)] border border-[var(--line)] rounded-lg p-0.5'>
                    {RANGES.map(r => (
                        <button key={r.id} type='button' onClick={() => setRange(r.id)}
                            className={`rounded-lg transition-colors ${range === r.id
                                ? 'bg-[var(--bg-card)] text-[var(--ink)] font-medium shadow-card'
                                : 'text-[var(--ink-secondary)]'}`}
                            style={{ fontSize: 'var(--fs-input)', padding: '5px 14px' }}>
                            {r.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={load}
                    aria-label='Refresh summary'
                    className='flex items-center gap-1 h-8 px-2.5 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors'
                    style={{ fontSize: 'var(--fs-input)' }}
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                {!loading && (
                    <span className='ml-auto pr-1 numeric' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                        {totalEvents} {totalEvents === 1 ? 'action' : 'actions'} since {fmtDate(from)}
                    </span>
                )}
            </div>

            {loading ? (
                <div className='flex items-center justify-center gap-2 py-8'>
                    <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--brand)' }} />
                    <span style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-secondary)' }}>Loading summary…</span>
                </div>
            ) : (
                <div className='flex flex-col gap-5'>
                    {top && top.events > 0 && (
                        <p className='responsiveText' style={{ color: 'var(--ink-secondary)' }}>
                            Most active {range === 'week' ? 'this week' : 'in this period'}:{' '}
                            <span className='font-medium' style={{ color: 'var(--ink)' }}>{top.name}</span>{' '}
                            — <span className='numeric'>{top.events}</span> of{' '}
                            <span className='numeric'>{totalEvents}</span> actions
                            (<span className='numeric'>{top.percent.toFixed(0)}%</span>).
                        </p>
                    )}

                    <div>
                        <h2 className='text-title mb-2'>Most active users</h2>
                        {!leaders.length ? (
                            <p className='py-6 text-center' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-muted)' }}>
                                Nothing recorded in this period.
                            </p>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='cashflow-detail-table w-full'>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 220 }}>User</th>
                                            <th style={{ width: 90 }}>Actions</th>
                                            <th style={{ width: 170 }}>Share</th>
                                            <th style={{ width: 90 }}>Sign-ins</th>
                                            <th style={{ width: 130 }}>Last action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {leaders.map(r => (
                                            <tr key={r.uid || r.name}>
                                                <td><NameCell name={r.name} /></td>
                                                <td className='numeric'>{r.events}</td>
                                                <td><ShareBar percent={r.percent} /></td>
                                                <td className='numeric'>{r.logins || 0}</td>
                                                <td className='numeric'>{r.lastAtMs ? fmtFull(r.lastAtMs) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className='text-title mb-2'>Sign-ins</h2>
                        {loginGap && (
                            <p className='flex items-start gap-1.5 mb-2 responsiveTextTable'
                                style={{ color: 'var(--ink-muted)' }}>
                                <Info className='w-3.5 h-3.5 mt-px shrink-0' />
                                <span>
                                    Sign-ins have been recorded {loginSince
                                        ? <>since <span className='numeric'>{fmtFull(loginSince)}</span></>
                                        : 'only from the next sign-in onwards'}.
                                    Anything before that was never stored, so counts covering earlier
                                    dates are incomplete rather than zero.
                                </span>
                            </p>
                        )}
                        {!logins.length ? (
                            <p className='py-6 text-center' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-muted)' }}>
                                No sign-ins recorded in this period yet.
                            </p>
                        ) : (
                            <div className='overflow-x-auto'>
                                <table className='cashflow-detail-table w-full'>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 220 }}>User</th>
                                            <th style={{ width: 110 }}>Sign-ins</th>
                                            <th style={{ width: 160 }}>Last sign-in</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logins.map(r => (
                                            <tr key={r.uid || r.name}>
                                                <td><NameCell name={r.name} /></td>
                                                <td className='numeric'>{r.logins}</td>
                                                <td className='numeric'>{r.lastLoginMs ? fmtFull(r.lastLoginMs) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className='text-title mb-2'>Week by week</h2>
                        <div className='overflow-x-auto'>
                            <table className='cashflow-detail-table w-full'>
                                <thead>
                                    <tr>
                                        <th style={{ width: 170 }}>Week</th>
                                        <th style={{ width: 90 }}>Actions</th>
                                        <th style={{ width: 220 }}>Most active</th>
                                        <th style={{ width: 170 }}>Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeks.map(w => {
                                        const lead = w.rows[0];
                                        return (
                                            <tr key={w.weekStartMs}>
                                                <td className='numeric'>
                                                    {fmtDate(w.weekStartMs)} – {fmtDate(Math.min(w.weekStartMs + WEEK_MS - DAY_MS, w.weekEndMs))}
                                                    {w.weekStartMs === startOfWeek(now) && (
                                                        <span className='ml-1.5 px-1.5 py-0.5 rounded-lg responsiveTextTable'
                                                            style={toneChipStyle(TONES.blue)}>now</span>
                                                    )}
                                                </td>
                                                <td className='numeric'>{w.total}</td>
                                                <td>{lead && lead.events ? <NameCell name={lead.name} /> : <span style={{ color: 'var(--ink-muted)' }}>—</span>}</td>
                                                <td>{lead && lead.events ? <ShareBar percent={lead.percent} /> : ''}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivitySummary;
