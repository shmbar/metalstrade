'use client';

// Floating autosave status pill (bottom-center, like the Ctrl+K hint bubble) — visible
// wherever the user is on the page, unlike the section-top save icons/badges.
// Modes: 'pending' (countdown + Save now / Cancel), 'info' (passive "autosaving…"),
// 'saving', 'saved', or null/undefined to render nothing.
import { Loader2, AlertTriangle } from 'lucide-react';

export default function AutosavePill({ mode, text, countdown, onSaveNow, onCancel }) {
    if (!mode) return null;
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-white shadow-xl border border-[#dbeeff] pl-3 pr-2 py-1.5 pointer-events-auto"
                style={{ fontSize: '0.72rem' }}>
                {mode === 'pending' && (
                    <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#b45309' }} />
                        <span className="font-medium whitespace-nowrap" style={{ color: 'var(--chathams-blue)' }}>
                            {text}{countdown != null ? ` in ${countdown}s` : ''}
                        </span>
                        <button onClick={onSaveNow} className="rounded-full px-2.5 py-1 text-white font-semibold hover:brightness-110"
                            style={{ background: 'var(--endeavour)', fontSize: '0.66rem' }}>
                            Save now
                        </button>
                        <button onClick={onCancel} className="rounded-full px-2.5 py-1 font-semibold hover:brightness-95"
                            style={{ color: 'var(--regent-gray)', background: '#f1f5fb', fontSize: '0.66rem' }}>
                            Cancel
                        </button>
                    </>
                )}
                {mode === 'info' && (
                    <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#b45309' }} />
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: 'var(--chathams-blue)' }}>{text || 'Unsaved — autosaving…'}</span>
                    </>
                )}
                {mode === 'saving' && (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: 'var(--endeavour)' }} />
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: 'var(--chathams-blue)' }}>{text || 'Saving…'}</span>
                    </>
                )}
                {mode === 'saved' && (
                    <>
                        <span style={{ color: '#15803d' }}>✓</span>
                        <span className="font-medium pr-1 whitespace-nowrap" style={{ color: '#15803d' }}>{text || 'Saved'}</span>
                    </>
                )}
            </div>
        </div>
    );
}
