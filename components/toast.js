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

    return (
        <div>
            {toast?.show && (
                <div className={`gap-3 flex text-sm px-4 py-3 bottom-4 left-4 z-40 fixed rounded-xl items-center shadow-lg fadeInToast border
                ${toast?.clr === 'success'
                    ? 'bg-[var(--endeavour)] border-[#0255a3] text-white'
                    : 'bg-white border-red-200 text-red-700'}`}>
                    {toast?.clr === 'success'
                        ? <FaRegCheckCircle className='scale-150 text-white flex-shrink-0' />
                        : <FaRegTimesCircle className='scale-150 text-red-500 flex-shrink-0' />}
                    <div>{toast?.text || ''}</div>
                </div>
            )}
            {secondaryToast && toast?.clr === 'success' && (
                <div className="gap-3 flex text-sm px-4 py-3 bottom-4 left-4 z-40 fixed rounded-xl items-center shadow-lg fadeInToast border border-[#b8ddf8] bg-[#ebf2fc] text-[var(--chathams-blue)]">
                    <FaRegCheckCircle className='scale-125 text-[var(--endeavour)] flex-shrink-0' />
                    <div>Please verify the saved data again!</div>
                </div>
            )}
        </div>
    );
};

export default Toast;
