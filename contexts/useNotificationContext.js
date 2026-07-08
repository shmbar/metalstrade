'use client';
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { UserAuth } from './useAuthContext';
import {
    subscribeNotifications, markNotificationRead, markAllNotificationsRead, snoozeNotification,
} from '../utils/utils';
import { sortByPriority } from '../utils/notificationPriority';
import NotificationPopups from '../components/NotificationPopups';

const NotificationContext = createContext();
const MUTE_KEY = 'ims_notif_muted';

// Short WebAudio chime — avoids shipping an audio asset. Browsers may block this
// until the first user gesture; that's fine (mute exists, and it's best-effort).
function chime() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(880, ctx.currentTime);
        o.frequency.setValueAtTime(1175, ctx.currentTime + 0.1);
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        o.start();
        o.stop(ctx.currentTime + 0.36);
        o.onended = () => ctx.close?.();
    } catch { /* best-effort */ }
}

const NotificationProvider = ({ children }) => {
    const { uidCollection, currentUser } = UserAuth() || {};
    const uid = currentUser?.uid || '';
    const name = currentUser?.name || '';

    const [all, setAll] = useState([]);
    const [muted, setMuted] = useState(false);
    // Arrival pop-up cards (visual sibling of the chime). Capped stack, newest first.
    const [popups, setPopups] = useState([]);

    const mutedRef = useRef(false);
    const seenIds = useRef(new Set());
    const primed = useRef(false);
    const popupSeq = useRef(0);

    // Load mute preference once.
    useEffect(() => {
        try { const m = localStorage.getItem(MUTE_KEY) === '1'; setMuted(m); mutedRef.current = m; } catch { /* ignore */ }
    }, []);

    // Live subscription. Re-subscribes only when the account or user changes.
    useEffect(() => {
        seenIds.current = new Set();
        primed.current = false;
        if (!uidCollection) { setAll([]); return; }
        const unsub = subscribeNotifications(uidCollection, (rows) => {
            // Genuinely new notifications — not the initial load, never the current
            // user's own actions, and only ones addressed to me. Chime + pop-up card.
            if (primed.current) {
                const fresh = rows.filter(r =>
                    !seenIds.current.has(r.id) && r.actorUid !== uid &&
                    (!Array.isArray(r.audience) || !uid || r.audience.includes(uid)));
                if (fresh.length) {
                    if (!mutedRef.current) chime();
                    setPopups(prev => [
                        ...fresh.map(r => ({ ...r, popupId: `${r.id}:${++popupSeq.current}` })),
                        ...prev,
                    ].slice(0, 4)); // keep at most 4 cards on screen
                }
            }
            rows.forEach(r => seenIds.current.add(r.id));
            primed.current = true;
            setAll(rows);
        });
        return () => { try { unsub && unsub(); } catch { /* ignore */ } };
    }, [uidCollection, uid]);

    // Targeted snooze wake-up: one timer aimed exactly at the EARLIEST snooze
    // expiry among my snoozed items, bumping snoozeTick so the memo below
    // recomputes and the lapsed item reappears on time. (Replaces an old blanket
    // 30s tick that never worked — it didn't change the memo's deps at all.)
    const [snoozeTick, setSnoozeTick] = useState(0);
    useEffect(() => {
        const now = Date.now();
        const next = all.reduce((min, n) => {
            const until = n.snoozedBy?.[uid];
            return until && until > now ? Math.min(min, until) : min;
        }, Infinity);
        if (!isFinite(next)) return;
        const t = setTimeout(() => setSnoozeTick(x => x + 1), Math.max(250, next - now + 50));
        return () => clearTimeout(t);
    }, [all, uid, snoozeTick]);

    // Visible = addressed to me (audience) and not currently snoozed by me,
    // ordered by priority (High → Medium → Low) then newest first.
    // snoozeTick re-evaluates the Date.now() comparison when a snooze lapses.
    const notifications = useMemo(() => {
        const now = Date.now();
        const mine = all.filter(n => {
            if (Array.isArray(n.audience) && uid && !n.audience.includes(uid)) return false;
            const until = n.snoozedBy?.[uid];
            if (until && until > now) return false;
            return true;
        });
        return sortByPriority(mine);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [all, uid, snoozeTick]);

    const unread = useMemo(
        () => notifications.filter(n => !(n.readBy || []).includes(uid)),
        [notifications, uid]
    );
    const unreadCount = unread.length;

    const markRead = useCallback((id) => markNotificationRead(uidCollection, id, uid, name), [uidCollection, uid, name]);
    const markAllRead = useCallback(
        () => markAllNotificationsRead(uidCollection, unread.map(n => n.id), uid, name),
        [uidCollection, unread, uid, name]
    );
    const snooze = useCallback(
        (id, ms) => snoozeNotification(uidCollection, id, uid, Date.now() + ms),
        [uidCollection, uid]
    );
    const toggleMute = useCallback(() => {
        setMuted(prev => {
            const nv = !prev;
            mutedRef.current = nv;
            try { localStorage.setItem(MUTE_KEY, nv ? '1' : '0'); } catch { /* ignore */ }
            return nv;
        });
    }, []);

    const dismissPopup = useCallback((popupId) => {
        setPopups(prev => prev.filter(p => p.popupId !== popupId));
    }, []);

    // Memoized: consumers (the bell) only re-render when the notification data or
    // callbacks actually change.
    const value = useMemo(
        () => ({ notifications, unread, unreadCount, markRead, markAllRead, snooze, muted, toggleMute }),
        [notifications, unread, unreadCount, markRead, markAllRead, snooze, muted, toggleMute]
    );

    return (
        <NotificationContext.Provider value={value}>
            {children}
            {/* Arrival pop-ups render globally (top-right) alongside whatever page is open */}
            <NotificationPopups popups={popups} dismissPopup={dismissPopup} markRead={markRead} />
        </NotificationContext.Provider>
    );
};

export default NotificationProvider;

export const useNotifications = () => useContext(NotificationContext);
