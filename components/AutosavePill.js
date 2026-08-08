'use client';

// Floating autosave status pill (bottom-center, like the Ctrl+K hint bubble) — visible
// wherever the user is on the page, unlike the section-top save icons/badges.
// Modes: 'pending' (countdown + Save now / Cancel), 'info' (passive "autosaving…"),
// 'saving', 'saved', or null/undefined to render nothing.
import { Loader2, AlertTriangle } from 'lucide-react';
import { TONES } from './statusUtils';

export default function AutosavePill({ mode, text, countdown, onSaveNow, onCancel }) {
    if (!mode) return null;
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-toast pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-[var(--bg-card)] border border-[var(--line)] pl-3 pr-2 py-1.5 pointer-events-auto"
                style={{ fontSize: 'var(--fs-input)', boxShadow: 'var(--shadow-sm)' }}>
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
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: TONES.amber.text }} />
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: 'var(--ink)' }}>{text || 'Unsaved — autosaving…'}</span>
                    </>
                )}
                {mode === 'saving' && (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--brand)' }} />
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: 'var(--ink)' }}>{text || 'Saving…'}</span>
                    </>
                )}
                {mode === 'saved' && (
                    <>
                        <span style={{ color: TONES.green.text }}>✓</span>
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: TONES.green.text }}>{text || 'Saved'}</span>
                    </>
                )}
            </div>
        </div>
    );
}
