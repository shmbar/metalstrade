import React, { useEffect, useContext, useRef, useState } from 'react';
import { SettingsContext } from "../contexts/useSettingsContext";
import { CheckCircle2, XCircle } from 'lucide-react';
import { BtnIcon } from './buttonIcons';

// Bottom-LEFT, not bottom-right: every page's action row (Save, PDF, Duplicate,
// + Invoice from…) lives bottom-right, and so do the chat launcher and the ⌘K
// hint, so a toast there covers the buttons you just pressed. --sidebar-w keeps
// it off the nav — the sidebar's bottom-left corner holds the fixed user pill.
const TOAST_LEFT = 'calc(var(--sidebar-w) + 1rem)';

// Long enough to READ. A flat 5s suited "Saved!" but not a two-line stock warning
// naming two materials and a quantity — that one was gone before it could be read.
// ~200 words a minute plus a beat to find it; an error, which has to be acted on,
// never goes in under 7s. Hovering holds it, and × dismisses it.
const readingTime = (text, clr) => {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
    return Math.min(20000, Math.max(clr === 'success' ? 5000 : 7000, 2000 + words * 300));
};

const Toast = () => {
    const { setToast, toast } = useContext(SettingsContext);
    const [secondaryToast, setSecondaryToast] = useState(false);
    const [run, setRun] = useState(null);       // { ms, n } for the message on screen
    const [paused, setPaused] = useState(false);
    const seq = useRef(0);                      // never repeats, so the bar restarts on every message
    const left = useRef({ n: 0, ms: 0 });       // time still owed to message n

    // Every setToast call is a new object, so the same message raised twice starts over.
    useEffect(() => {
        if (!toast?.show) return;
        setRun({ ms: readingTime(toast.text, toast.clr), n: ++seq.current });
        setSecondaryToast(false);
    }, [toast]);

    // The clock only runs while nobody is reading: hovering pauses it and the bar together.
    useEffect(() => {
        if (!run || !toast?.show || paused) return;
        if (left.current.n !== run.n) left.current = { n: run.n, ms: run.ms };
        const owed = left.current;
        const start = Date.now();
        const timer = setTimeout(() => {
            setToast(t => ({ ...t, show: false }));
            setRun(null);
            setSecondaryToast(true);
        }, owed.ms);
        return () => { clearTimeout(timer); owed.ms -= Date.now() - start; };
    }, [run, paused, toast?.show]);

    useEffect(() => {
        if (secondaryToast) {
            const secondaryTimer = setTimeout(() => {
                setSecondaryToast(false);
            }, 10000);

            return () => clearTimeout(secondaryTimer);
        }
    }, [secondaryToast]);

    const dismiss = () => {
        setToast(t => ({ ...t, show: false }));
        setRun(null);
        setPaused(false);
    };

    const ok = toast?.clr === 'success';
    return (
        <div>
            {toast?.show && (
                <div role={ok ? 'status' : 'alert'}
                    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
                    className={`bottom-4 z-toast fixed rounded-2xl overflow-hidden border bg-[var(--bg-card)] text-[var(--ink)]
                ${ok ? 'border-[var(--ok-border)]' : 'border-[var(--bad-border)]'}`}
                    style={{ left: TOAST_LEFT, boxShadow: 'var(--shadow-md)', animation: 'toast-slide-in 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                    <div className='gap-3 flex responsiveTextTitle font-medium pl-4 pr-2 py-3 items-center'>
                        {ok
                            ? <CheckCircle2 size={18} className='text-[var(--ok-text)] flex-shrink-0' />
                            : <XCircle size={18} className='text-[var(--bad-text)] flex-shrink-0' />}
                        <div>{toast?.text || ''}</div>
                        <button type='button' aria-label='Dismiss' onClick={dismiss}
                            className='field-clear cursor-pointer self-start'>
                            <BtnIcon action='close' />
                        </button>
                    </div>
                    {/* Time left — mirrors the notification popups; stands still while hovered */}
                    <div className='h-[3px] w-full' style={{ background: 'var(--bg-sunken)' }}>
                        {run && (
                            <div
                                key={run.n}
                                className='h-full'
                                style={{
                                    background: ok ? 'var(--ok-text)' : 'var(--bad-text)',
                                    opacity: 0.85,
                                    animation: `toast-bar ${run.ms}ms linear forwards`,
                                    animationPlayState: paused ? 'paused' : 'running',
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
            {secondaryToast && ok && (
                <div className="gap-3 flex responsiveTextTitle font-medium px-4 py-3 bottom-4 z-toast fixed rounded-2xl items-center fadeInToast border border-[var(--line)] bg-[var(--bg-card)] text-[var(--ink-secondary)]"
                    style={{ left: TOAST_LEFT, boxShadow: 'var(--shadow-md)' }}>
                    <CheckCircle2 size={16} className='text-[var(--brand)] flex-shrink-0' />
                    <div>Please verify the saved data again!</div>
                </div>
            )}
        </div>
    );
};

export default Toast;
