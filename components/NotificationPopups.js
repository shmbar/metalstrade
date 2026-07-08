'use client';
// Arrival pop-ups: when a NEW notification lands (same trigger as the chime —
// after initial load, never for the current user's own actions), a card slides
// in top-right, auto-dismisses after 8s, and clicking it jumps to the record
// (same routing as the bell) and marks it read. Rendered by NotificationProvider.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, BellRing } from 'lucide-react';
import { routeFor } from '../utils/notificationRouting';

const SEVERITY_DOT = { success: '#16a34a', warning: '#d97706', error: '#dc2626', info: 'var(--endeavour)' };
const AUTO_DISMISS_MS = 8000;

function PopupCard({ n, onDismiss, onOpen }) {
    useEffect(() => {
        const t = setTimeout(() => onDismiss(n.popupId), AUTO_DISMISS_MS);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [n.popupId]);

    return (
        <div
            className='pointer-events-auto w-[320px] bg-white rounded-xl shadow-lg border border-[#b8ddf8] overflow-hidden cursor-pointer hover:shadow-xl transition-shadow'
            style={{ animation: 'notifPopIn 0.25s ease-out' }}
            onClick={() => onOpen(n)}
            role='alert'
        >
            <div className='flex items-start gap-2 p-3'>
                <span className='mt-0.5 flex items-center justify-center rounded-full shrink-0'
                    style={{ width: 26, height: 26, background: '#dbeeff' }}>
                    <BellRing className='w-3.5 h-3.5' style={{ color: 'var(--endeavour)' }} />
                </span>
                <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5'>
                        <span className='rounded-full shrink-0' style={{ width: 7, height: 7, background: SEVERITY_DOT[n.severity] || SEVERITY_DOT.info }} />
                        <span className='font-semibold truncate' style={{ fontSize: '0.7rem', color: 'var(--chathams-blue)' }}>
                            {n.entityLabel || 'Notification'}
                        </span>
                    </div>
                    <p className='mt-0.5' style={{ fontSize: '0.66rem', color: 'var(--port-gore)', lineHeight: 1.35 }}>
                        {n.message || n.type}
                    </p>
                    <p className='mt-0.5' style={{ fontSize: '0.56rem', color: 'var(--regent-gray)' }}>
                        {n.actorName && n.actorName !== 'System' ? `by ${n.actorName} · ` : ''}click to open
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(n.popupId); }}
                    className='p-0.5 rounded-full hover:bg-[#dbeeff] shrink-0'
                    aria-label='Dismiss notification'
                >
                    <X className='w-3.5 h-3.5' style={{ color: 'var(--regent-gray)' }} />
                </button>
            </div>
        </div>
    );
}

export default function NotificationPopups({ popups, dismissPopup, markRead }) {
    const router = useRouter();
    if (!popups?.length) return null;

    const onOpen = (n) => {
        dismissPopup(n.popupId);
        markRead?.(n.id);
        const route = routeFor(n.entityType, n.entityId);
        if (route) router.push(route);
    };

    return (
        <div className='fixed right-3 z-[9998] flex flex-col gap-2 pointer-events-none'
            style={{ top: 'clamp(64px, 8vh, 92px)' }}>
            <style jsx global>{`
                @keyframes notifPopIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
            {popups.map(n => (
                <PopupCard key={n.popupId} n={n} onDismiss={dismissPopup} onOpen={onOpen} />
            ))}
        </div>
    );
}
