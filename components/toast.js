import React, { useEffect, useContext, useState } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { FaRegCheckCircle, FaRegTimesCircle } from 'react-icons/fa';

const Toast = () => {
    const { setToast, toast } = useContext(SettingsContext);
    const [secondaryToast, setSecondaryToast] = useState(false);

    useEffect(() => {
        if (toast.show) {
            const timer = setTimeout(() => {
                setToast({ ...toast, show: false });
                setSecondaryToast(true); // Trigger the secondary toast
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [toast.show]);

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
            {toast.show && (
                <div className={`gap-3 flex text-sm px-4 py-3 bottom-2 left-4 z-40 fixed rounded-lg items-center
                ${toast.clr === 'success' ? 'bg-green-700' : 'bg-red-600'} shadow-xl drop-shadow-2xl fadeInToast`}>
                    {toast.clr === 'success' ? <FaRegCheckCircle className='scale-150 text-white' /> :
                        <FaRegTimesCircle className='scale-150 text-white' />}
                    <div className='text-white'>{toast.text}</div>
                </div>
            )}
            {secondaryToast && toast.clr === 'success' && (
                <div className="gap-3 flex text-sm px-4 py-3 bottom-2 left-4 z-40 fixed rounded-lg items-center
                bg-blue-600 shadow-xl drop-shadow-2xl fadeInToast">
                    <div className='text-white'>Please verify the saved data again!</div>
                </div>
            )}
        </div>
    );
};

export default Toast;
