'use client'
import { useRef, useEffect, useCallback } from 'react';
import Datepicker from "react-tailwindcss-datepicker";

const getDateValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

const DatePicker = ({ props, handleChangeDate, month, handleCancelDate }) => {
    const dateVal = getDateValue(props);
    const containerRef = useRef(null);
    const popupRef = useRef(null);
    const rafRef = useRef(null);

    const value = {
        startDate: dateVal?.startDate || null,
        endDate: dateVal?.startDate || null,
    };

    const handleChange = (newValue) => {
        if (newValue?.startDate) {
            handleChangeDate(new Date(newValue.startDate), props.row.index, month);
        } else {
            handleCancelDate(null, props.row.index, month);
        }
    };

    const repositionPopup = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const popup = popupRef.current || container.querySelector('div[class*="absolute"][class*="z-"]');
        if (!popup || popup.offsetWidth === 0) { popupRef.current = null; return; }
        popupRef.current = popup;
        const input = container.querySelector('input');
        if (!input) return;
        const rect = input.getBoundingClientRect();
        popup.style.position = 'fixed';
        popup.style.top = `${rect.bottom + 4}px`;
        popup.style.left = `${rect.left}px`;
        popup.style.zIndex = '99999';
        popup.style.width = 'auto';
    }, []);

    // Detect popup open/close via MutationObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let scrollCleanup = null;

        const onMutation = () => {
            const popup = container.querySelector('div[class*="absolute"][class*="z-"]');
            const isOpen = popup && popup.offsetWidth > 0;

            if (isOpen) {
                popupRef.current = popup;
                repositionPopup();

                // Attach scroll listener on all scrollable ancestors + window
                if (!scrollCleanup) {
                    const onScroll = () => {
                        if (rafRef.current) cancelAnimationFrame(rafRef.current);
                        rafRef.current = requestAnimationFrame(repositionPopup);
                    };
                    window.addEventListener('scroll', onScroll, true);
                    scrollCleanup = () => {
                        window.removeEventListener('scroll', onScroll, true);
                        if (rafRef.current) cancelAnimationFrame(rafRef.current);
                    };
                }
            } else {
                popupRef.current = null;
                if (scrollCleanup) { scrollCleanup(); scrollCleanup = null; }
            }
        };

        const observer = new MutationObserver(onMutation);
        observer.observe(container, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style'],
        });

        return () => {
            observer.disconnect();
            if (scrollCleanup) scrollCleanup();
        };
    }, [repositionPopup]);

    return (
        <div className="flex items-center gap-1" ref={containerRef}>
            <div className="w-fit">
                <Datepicker
                    asSingle={true}
                    useRange={false}
                    value={value}
                    onChange={handleChange}
                    displayFormat="DD.MM.YY"
                    placeholder="DD.MM.YY"
                    primaryColor="blue"
                    readOnly={true}
                    showShortcuts={false}
                    inputClassName="text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem] h-7 py-0 px-1 w-[72px] bg-transparent border-0 outline-none cursor-pointer text-[var(--endeavour)] text-center"
                    containerClassName="relative [&>div]:border-0 [&>div]:shadow-none [&>div]:rounded-none [&>div]:bg-transparent"
                    toggleClassName="hidden"
                    popoverDirection="down"
                />
            </div>
        </div>
    );
};

export default DatePicker;
