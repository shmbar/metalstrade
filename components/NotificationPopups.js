'use client';
// Arrival pop-ups: when a NEW notification lands (same trigger as the chime —
// after initial load, never for the current user's own actions), a card slides
// in top-right, auto-dismisses after 8s (paused while hovered), and clicking it
// jumps to the record (same routing as the bell) and marks it read.
// Rendered globally by NotificationProvider.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, FileText, Receipt, Banknote, Package, Settings as SettingsIcon, Activity } from 'lucide-react';
import { routeFor } from '../utils/notificationRouting';
import { TONES } from './statusUtils';

const AUTO_DISMISS_MS = 8000;

// Same entity iconography + tints as the bell dropdown, so the pop-up reads as
// part of the same system.
const ENTITY_ICON = {
    contract: { Icon: FileText, color: 'var(--brand)', bg: 'var(--brand-soft)' },
    invoice: { Icon: Receipt, color: TONES.green.text, bg: TONES.green.bg },
    expense: { Icon: Banknote, color: TONES.amber.text, bg: TONES.amber.bg },
    companyexpense: { Icon: Banknote, color: TONES.amber.text, bg: TONES.amber.bg },
    stock: { Icon: Package, color: 'var(--violet-text)', bg: 'var(--violet-soft)' },
    settings: { Icon: SettingsIcon, color: TONES.gray.text, bg: TONES.gray.bg },
};
const SEVERITY_ACCENT = { success: TONES.green.text, warning: TONES.amber.text, error: TONES.red.text, info: TONES.blue.text };

function PopupCard({ n, onDismiss, onOpen }) {
    const [hovered, setHovered] = useState(false);
    const remaining = useRef(AUTO_DISMISS_MS);
    const started = useRef(0);

    // Auto-dismiss with hover-pause: the countdown stops while the cursor is on
    // the card and resumes with whatever time was left.
    useEffect(() => {
        if (hovered) return;
        started.current = Date.now();
        const t = setTimeout(() => onDismiss(n.popupId), remaining.current);
        return () => {
            clearTimeout(t);
            remaining.current = Math.max(600, remaining.current - (Date.now() - started.current));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hovered, n.popupId]);

    const { Icon, color, bg } = ENTITY_ICON[n.entityType] || { Icon: Activity, color: TONES.gray.text, bg: TONES.gray.bg };
    const accent = SEVERITY_ACCENT[n.severity] || SEVERITY_ACCENT.info;

    return (
        <div
            className='pointer-events-auto w-[340px] max-w-[92vw] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5'
            style={{
                animation: 'notifPopIn 0.32s cubic-bezier(0.21, 1.02, 0.73, 1)',
                background: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: '1px solid var(--line)',
                boxShadow: 'var(--shadow-md)',
            }}
            onClick={() => onOpen(n)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            role='alert'
        >
            <div className='flex items-stretch'>
                {/* Severity accent bar — the app's signature left-border accent */}
                <div className='w-1 shrink-0 rounded-full my-2 ml-2' style={{ background: accent }} />

                <div className='flex items-start gap-2.5 p-3 pl-2.5 min-w-0 flex-1'>
                    {/* Entity icon tile, same tints as the bell dropdown */}
                    <span className='mt-0.5 flex items-center justify-center rounded-2xl shrink-0'
                        style={{ width: 32, height: 32, background: bg }}>
                        <Icon className='w-4 h-4' style={{ color }} />
                    </span>

                    <div className='min-w-0 flex-1'>
                        <div className='flex items-center justify-between gap-2'>
                            <span className='font-semibold truncate font-sans'
                                style={{ fontSize: 'var(--fs-input)', color: 'var(--ink)' }}>
                                {n.entityLabel || 'Notification'}
                            </span>
                            <span className='shrink-0 rounded-full px-1.5 py-0.5 font-medium uppercase tracking-wide'
                                style={{ fontSize: 'var(--fs-caption)', color: accent, background: `color-mix(in srgb, ${accent} 12%, var(--bg-card))` }}>
                                {n.severity || 'info'}
                            </span>
                        </div>
                        <p className='mt-0.5' style={{ fontSize: 'var(--fs-body)', color: 'var(--ink)', lineHeight: 1.4 }}>
                            {n.message || n.type}
                        </p>
                        <div className='mt-1 flex items-center justify-between'>
                            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--ink-muted)' }}>
                                {n.actorName && n.actorName !== 'System' ? `by ${n.actorName}` : 'System'} · just now
                            </span>
                            <span className='font-medium' style={{ fontSize: 'var(--fs-caption)', color: 'var(--brand)' }}>
                                Open →
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(n.popupId); }}
                        className='p-1 -mt-1 -mr-1 rounded-full hover:bg-[var(--bg-subtle)] shrink-0 transition-colors'
                        aria-label='Dismiss notification'
                    >
                        <X className='w-3.5 h-3.5' style={{ color: 'var(--ink-muted)' }} />
                    </button>
                </div>
            </div>

            {/* Auto-dismiss progress — pauses with the countdown while hovered */}
            <div className='h-[3px] w-full' style={{ background: 'var(--bg-sunken)' }}>
                <div
                    key={hovered ? 'paused' : 'running'}
                    className='h-full'
                    style={{
                        background: accent,
                        opacity: 0.85,
                        width: hovered ? '100%' : undefined,
                        animation: hovered ? 'none' : `notifBar ${remaining.current}ms linear forwards`,
                    }}
                />
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
        <div className='fixed right-3 z-toast flex flex-col gap-2.5 pointer-events-none'
            style={{ top: 'clamp(64px, 8vh, 92px)' }}>
            <style jsx global>{`
                @keyframes notifPopIn {
                    from { opacity: 0; transform: translateX(28px) scale(0.97); }
                    to { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes notifBar { from { width: 100%; } to { width: 0%; } }
            `}</style>
            {popups.map(n => (
                <PopupCard key={n.popupId} n={n} onDismiss={dismissPopup} onOpen={onOpen} />
            ))}
        </div>
    );
}
