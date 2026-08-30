'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UserAuth } from '../contexts/useAuthContext';
import { loadPresence, PRESENCE_ONLINE_MS, PRESENCE_HEARTBEAT_MS } from '../utils/utils';
import { splitPresence } from '../utils/activityStats';
import { NameCell } from './Avatar';
import { TONES, toneChipStyle } from './statusUtils';
import { RefreshCw, Loader2, Users } from 'lucide-react';

const relative = (ms) => {
    if (!ms) return 'never';
    const s = Math.floor((Date.now() - ms) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
    return new Date(ms).toLocaleDateString();
};

const Dot = ({ on }) => (
    <span
        aria-hidden
        className='inline-block rounded-full shrink-0'
        style={{
            width: 7, height: 7,
            background: on ? 'var(--ok-text)' : 'var(--ink-muted)',
            // The ring reads as "live" without needing an animation, which would
            // pull the eye away from the table on every repaint.
            boxShadow: on ? '0 0 0 2.5px var(--ok-soft)' : 'none',
        }}
    />
);

/**
 * Who is in the workspace right now.
 *
 * "Here now" means a heartbeat within the last PRESENCE_ONLINE_MS. A browser that
 * is closed or crashes stops beating without announcing it, so this is judged by
 * the age of the stamp rather than by any flag a client might never get to write —
 * which is also why someone can show as here for up to a few minutes after closing
 * the tab. A deliberate sign-out zeroes the stamp and moves them immediately.
 */
const PresencePanel = () => {
    const { uidCollection, currentUser } = UserAuth();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);      // re-renders the relative times

    const load = useCallback(async () => {
        if (!uidCollection) return;
        setLoading(true);
        setRows(await loadPresence(uidCollection));
        setLoading(false);
    }, [uidCollection]);

    useEffect(() => { load(); }, [load]);

    // Poll on the same cadence the writers beat at — a slower refresh would show
    // someone as away while they are typing.
    useEffect(() => {
        const id = setInterval(() => { load(); setTick(t => t + 1); }, PRESENCE_HEARTBEAT_MS);
        return () => clearInterval(id);
    }, [load]);

    const { online, away } = useMemo(
        () => splitPresence(rows, { onlineMs: PRESENCE_ONLINE_MS }),
        [rows, tick]        // eslint-disable-line react-hooks/exhaustive-deps -- tick re-times the split
    );

    const Row = ({ p, on }) => (
        <tr>
            <td>
                <span className='inline-flex items-center gap-2'>
                    <Dot on={on} />
                    <NameCell name={p.name || p.email || 'Unknown'} />
                    {p.uid === currentUser?.uid && (
                        <span className='px-1.5 py-0.5 rounded-lg responsiveTextTable'
                            style={toneChipStyle(TONES.gray)}>you</span>
                    )}
                </span>
            </td>
            <td style={{ color: 'var(--ink-secondary)' }}>{p.email || ''}</td>
            <td className='numeric'>{on ? 'Here now' : relative(p.lastSeenMs)}</td>
            <td className='numeric'>{p.loginAtMs ? relative(p.loginAtMs) : '—'}</td>
        </tr>
    );

    return (
        <div className='p-3'>
            <div className='flex flex-wrap items-center gap-2 mb-3'>
                <span className='inline-flex items-center gap-1.5 px-2 py-1 rounded-lg responsiveText'
                    style={toneChipStyle(online.length ? TONES.green : TONES.gray)}>
                    <Users className='w-3.5 h-3.5' />
                    {online.length} {online.length === 1 ? 'person' : 'people'} here now
                </span>
                <button
                    onClick={load}
                    aria-label='Refresh who is online'
                    className='flex items-center gap-1 h-8 px-2.5 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors'
                    style={{ fontSize: 'var(--fs-input)' }}
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <span className='ml-auto pr-1' style={{ fontSize: 'var(--fs-table)', color: 'var(--ink-muted)' }}>
                    Updates every {Math.round(PRESENCE_HEARTBEAT_MS / 60000)} min
                </span>
            </div>

            {loading && !rows.length ? (
                <div className='flex items-center justify-center gap-2 py-8'>
                    <Loader2 className='w-4 h-4 animate-spin' style={{ color: 'var(--brand)' }} />
                    <span style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-secondary)' }}>Loading…</span>
                </div>
            ) : !rows.length ? (
                <p className='py-8 text-center' style={{ fontSize: 'var(--fs-input)', color: 'var(--ink-muted)' }}>
                    Nobody has signed in since this was switched on. Presence is recorded from the
                    first sign-in after the update.
                </p>
            ) : (
                <div className='overflow-x-auto'>
                    <table className='cashflow-detail-table w-full'>
                        <thead>
                            <tr>
                                <th style={{ width: 240 }}>User</th>
                                <th style={{ width: 240 }}>Email</th>
                                <th style={{ width: 130 }}>Last seen</th>
                                <th style={{ width: 130 }}>Signed in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {online.map(p => <Row key={p.uid} p={p} on />)}
                            {away.length > 0 && (
                                <tr>
                                    <td colSpan={4} className='responsiveTextTable'
                                        style={{ color: 'var(--ink-muted)', background: 'var(--bg-subtle)' }}>
                                        Not here now
                                    </td>
                                </tr>
                            )}
                            {away.map(p => <Row key={p.uid} p={p} on={false} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PresencePanel;
