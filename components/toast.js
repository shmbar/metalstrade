import React from 'react'
import { useEffect, useContext } from 'react';
import { SettingsContext } from "@contexts/useSettingsContext";
import { FaRegCheckCircle } from 'react-icons/fa';
import { FaRegTimesCircle } from 'react-icons/fa';

const Toast = () => {
    const { setToast, toast } = useContext(SettingsContext);


    useEffect(() => {
        const timer = setTimeout(() => {
            setToast({ ...toast, show: false })
        }, 5000);

        return () => clearTimeout(timer); // Clear the timeout on component unmount
    }, [toast.show]);

    return (
        <div>
            {toast.show && <div className={`gap-3 flex text-sm px-4 py-3 bottom-2 left-4 z-40 fixed rounded-lg items-center
            ${toast.clr === 'success' ? 'bg-green-700' : 'bg-red-600'} shadow-xl drop-shadow-2xl fadeInToast`}>

                {toast.clr === 'success' ? < FaRegCheckCircle className='scale-150 text-white' /> :
                    < FaRegTimesCircle className='scale-150 text-white' />}
                <div className='text-white'>{toast.text}</div>


            </div>}
        </div>
    )
}

export default Toast;
