import React, { useEffect, useContext, useState } from 'react';
import { SettingsContext } from "../contexts/useSettingsContext";
import { FaRegCheckCircle, FaRegTimesCircle } from 'react-icons/fa';

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

    // z-toast (300), not z-[70]: a toast fired from inside a modal used to appear
    // BEHIND it. Error colours now come from the status tokens, so they follow
    // dark mode like everything else.
    return (
        <div>
            {toast?.show && (
                <div className={`gap-3 flex responsiveTextInput px-4 py-3 bottom-4 right-4 z-toast fixed rounded-2xl items-center shadow-lg fadeInToast border
                ${toast?.clr === 'success'
                    ? 'bg-[var(--endeavour)] border-[var(--endeavour)] text-white'
                    : 'bg-[var(--danger-text)] border-[var(--danger-strong)] text-white'}`}>
                    {toast?.clr === 'success'
                        ? <FaRegCheckCircle className='scale-150 text-white flex-shrink-0' />
                        : <FaRegTimesCircle className='scale-150 text-white flex-shrink-0' />}
                    <div>{toast?.text || ''}</div>
                </div>
            )}
            {secondaryToast && toast?.clr === 'success' && (
                <div className="gap-3 flex responsiveTextInput px-4 py-3 bottom-4 right-4 z-toast fixed rounded-2xl items-center shadow-lg fadeInToast border border-[var(--border-divider)] bg-[var(--selago)] text-[var(--chathams-blue)]">
                    <FaRegCheckCircle className='scale-125 text-[var(--endeavour)] flex-shrink-0' />
                    <div>Please verify the saved data again!</div>
                </div>
            )}
        </div>
    );
};

export default Toast;
