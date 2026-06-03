'use client';
import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { UserAuth } from './useAuthContext';
import {
    subscribeNotifications, markNotificationRead, markAllNotificationsRead, snoozeNotification,
} from '../utils/utils';

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
    // Re-render tick so snoozed items reappear when their timer lapses.
    const [, setTick] = useState(0);

    const mutedRef = useRef(false);
    const seenIds = useRef(new Set());
    const primed = useRef(false);

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
            // Chime on genuinely new notifications — not on the initial load, and
            // never for actions the current user performed themselves.
            if (primed.current && !mutedRef.current) {
                const fresh = rows.filter(r => !seenIds.current.has(r.id) && r.actorUid !== uid);
                if (fresh.length) chime();
            }
            rows.forEach(r => seenIds.current.add(r.id));
            primed.current = true;
            setAll(rows);
        });
        return () => { try { unsub && unsub(); } catch { /* ignore */ } };
    }, [uidCollection, uid]);

    // Tick every 30s so snoozed notifications surface again on time.
    useEffect(() => {
        const t = setInterval(() => setTick(x => x + 1), 30000);
        return () => clearInterval(t);
    }, []);

    // Visible = addressed to me (audience) and not currently snoozed by me.
    const notifications = useMemo(() => {
        const now = Date.now();
        return all.filter(n => {
            if (Array.isArray(n.audience) && uid && !n.audience.includes(uid)) return false;
            const until = n.snoozedBy?.[uid];
            if (until && until > now) return false;
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [all, uid]);

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

    const value = { notifications, unread, unreadCount, markRead, markAllRead, snooze, muted, toggleMute };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export default NotificationProvider;

export const useNotifications = () => useContext(NotificationContext);
