'use client';

// Floating autosave status pill (top-center, under the header) — visible
// wherever the user is on the page, unlike the section-top save icons/badges.
// Modes: 'pending' (countdown + Save now / Cancel), 'info' (passive "autosaving…"),
// 'saving', 'saved', or null/undefined to render nothing.
import { Loader2, AlertTriangle } from 'lucide-react';
import { TONES } from './statusUtils';

export default function AutosavePill({ mode, text, countdown, onSaveNow, onCancel }) {
    if (!mode) return null;

    // Top centre, just under the fixed header (72px, the same offset every page
    // uses for its own top margin).
    //
    // It used to sit bottom-centre, which is the busiest edge in the app: the toast
    // comes up bottom-left, the ⌘K hint sits bottom-4 right-20 and the chat
    // launcher bottom-4 right-4, so a save status appeared in the one gap between
    // them and was easy to miss (client, 1 Sep 2026). Nothing else is fixed below
    // the header, and it is where the eye already is.
    // Brand-filled for the three passive states — the ones that only report where
    // the save got to, and which a white card at the top of a white page made too
    // easy to miss (client, 1 Sep 2026).
    //
    // 'pending' and 'paused' keep the light shell on purpose: those are the payment
    // countdown, they carry Save now / Cancel, and ticking one marks money as PAID.
    // Painting them the same colour as a routine "Saved" would flatten a decision
    // that has consequences into a status message, and the brand-filled Save now
    // button inside would disappear against a brand-filled pill.
    const solid = mode === 'info' || mode === 'saving' || mode === 'saved';
    const onSolid = 'var(--on-brand)';

    return (
        <div className="fixed top-[80px] left-1/2 -translate-x-1/2 z-toast pointer-events-none">
            <div className={`flex items-center gap-2 rounded-full pl-3 pr-2 py-1.5 pointer-events-auto ${solid ? '' : 'bg-[var(--bg-card)] border border-[var(--line)]'}`}
                style={{
                    fontSize: 'var(--fs-input)',
                    boxShadow: 'var(--shadow-sm)',
                    // Brand fill on the states that just report progress — a white
                    // card at the top of a white page was easy to look straight past.
                    ...(solid ? { background: 'var(--brand)', border: '1px solid var(--brand)' } : {}),
                }}>
                {mode === 'pending' && (
                    <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: TONES.amber.text }} />
                        <span className="font-medium whitespace-nowrap" style={{ color: 'var(--ink)' }}>
                            {text}{countdown != null ? ` in ${countdown}s` : ''}
                        </span>
                        <button onClick={onSaveNow} className="rounded-full px-2.5 py-1 text-[var(--on-brand)] font-semibold hover:brightness-110"
                            style={{ background: 'var(--brand)', fontSize: 'var(--fs-body)' }}>
                            Save now
                        </button>
                        <button onClick={onCancel} className="rounded-full px-2.5 py-1 font-semibold hover:brightness-95"
                            style={{ color: 'var(--ink-secondary)', background: 'var(--bg-subtle)', fontSize: 'var(--fs-body)' }}>
                            Cancel
                        </button>
                    </>
                )}
                {mode === 'paused' && (
                    <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--warn-strong)' }} />
                        <span className="font-medium whitespace-nowrap" style={{ color: 'var(--chathams-blue)' }}>
                            {text || 'Autosave paused'}
                        </span>
                        <button onClick={onSaveNow} className="rounded-full px-2.5 py-1 text-[var(--on-brand)] font-semibold hover:brightness-110"
                            style={{ background: 'var(--endeavour)', fontSize: 'var(--fs-body)' }}>
                            Save now
                        </button>
                    </>
                )}
                {mode === 'info' && (
                    <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: onSolid }} />
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: onSolid }}>{text || 'Unsaved — autosaving…'}</span>
                    </>
                )}
                {mode === 'saving' && (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: onSolid }} />
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: onSolid }}>{text || 'Saving…'}</span>
                    </>
                )}
                {mode === 'saved' && (
                    <>
                        <span style={{ color: onSolid }}>✓</span>
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: onSolid }}>{text || 'Saved'}</span>
                    </>
                )}
            </div>
        </div>
    );
}
