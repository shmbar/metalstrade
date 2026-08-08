import React, { useEffect, useContext, useState } from 'react';
import { SettingsContext } from "../contexts/useSettingsContext";
import { CheckCircle2, XCircle } from 'lucide-react';

const Toast = () => {
    const { setToast, toast } = useContext(SettingsContext);
    const [secondaryToast, setSecondaryToast] = useState(false);

    useEffect(() => {
        if (toast?.show) {
            const timer = setTimeout(() => {
                setToast({ ...toast, show: false });
                setSecondaryToast(true);
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [toast?.show]);

    useEffect(() => {
        if (secondaryToast) {
            const secondaryTimer = setTimeout(() => {
                setSecondaryToast(false);
            }, 10000);

            return () => clearTimeout(secondaryTimer);
        }
    }, [secondaryToast]);

    return (
        <div>
            {toast?.show && (
                <div className={`bottom-4 right-4 z-toast fixed rounded-2xl overflow-hidden border bg-[var(--bg-card)] text-[var(--ink)]
                ${toast?.clr === 'success' ? 'border-[var(--ok-border)]' : 'border-[var(--bad-border)]'}`}
                    style={{ boxShadow: 'var(--shadow-md)', animation: 'toast-slide-in 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
                    <div className='gap-3 flex responsiveTextTitle font-medium px-4 py-3 items-center'>
                        {toast?.clr === 'success'
                            ? <CheckCircle2 size={18} className='text-[var(--ok-text)] flex-shrink-0' />
                            : <XCircle size={18} className='text-[var(--bad-text)] flex-shrink-0' />}
                        <div>{toast?.text || ''}</div>
                    </div>
                    {/* Auto-dismiss progress — mirrors the notification popups */}
                    <div className='h-[3px] w-full' style={{ background: 'var(--bg-sunken)' }}>
                        <div
                            className='h-full'
                            style={{
                                background: toast?.clr === 'success' ? 'var(--ok-text)' : 'var(--bad-text)',
                                opacity: 0.85,
                                animation: 'toast-bar 5000ms linear forwards',
                            }}
                        />
                    </div>
                </div>
            )}
            {secondaryToast && toast?.clr === 'success' && (
                <div className="gap-3 flex responsiveTextTitle font-medium px-4 py-3 bottom-4 right-4 z-toast fixed rounded-2xl items-center fadeInToast border border-[var(--line)] bg-[var(--bg-card)] text-[var(--ink-secondary)]"
                    style={{ boxShadow: 'var(--shadow-md)' }}>
                    <CheckCircle2 size={16} className='text-[var(--brand)] flex-shrink-0' />
                    <div>Please verify the saved data again!</div>
                </div>
            )}
        </div>
    );
};

export default Toast;
