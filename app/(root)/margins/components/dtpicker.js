'use client'
import { useRef, useEffect, useCallback } from 'react';
import Datepicker from "react-tailwindcss-datepicker";
import Tltip from "../../../../components/tlTip";

const getDateValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

/* Was w-[72px] with symmetric px-1. "DD.MM.YY" needs roughly 60px at the top
   breakpoint, and the clear button is positioned absolutely OVER the input's
   right edge — so the last character rendered underneath it and read as
   clipped. Wider box, and the asymmetric right padding keeps the centred text
   clear of the button. */
const DATE_INPUT_CLASS =
    'responsiveText h-7 py-0 pl-1 pr-4 w-24 bg-transparent border-0 outline-none cursor-pointer text-[var(--brand)] text-center';

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
            handleChangeDate(new Date(newValue.startDate), props.row.original.id, month);
        }
        // Intentionally ignore null events — the library fires null when clicking
        // an already-selected date (toggle behaviour). We use a separate clear
        // button so the user can always re-pick the same date without it clearing.
    };

    const handleClear = () => {
        handleCancelDate(null, props.row.original.id, month);
    };

    /* Re-entry guard. The MutationObserver below watches `style` on the whole
       subtree, and this function WRITES style on a node in that subtree — so
       every reposition re-triggers the observer, which repositions again. It
       survived before only because the values written were identical each pass;
       the moment a write depended on a measurement it became a hard infinite
       loop and hung the tab. The guard makes that impossible either way. */
    const repositioningRef = useRef(false);

    const repositionPopup = useCallback(() => {
        if (repositioningRef.current) return;
        const container = containerRef.current;
        if (!container) return;
        const popup = popupRef.current || container.querySelector('div[class*="absolute"][class*="z-"]');
        if (!popup || popup.offsetWidth === 0) { popupRef.current = null; return; }
        popupRef.current = popup;
        const input = container.querySelector('input');
        if (!input) return;
        const rect = input.getBoundingClientRect();
        repositioningRef.current = true;
        try {
            popup.style.position = 'fixed';
            popup.style.top = `${rect.bottom + 4}px`;
            popup.style.left = `${rect.left}px`;
            popup.style.zIndex = '99999';
            popup.style.width = 'auto';
        } finally {
            // Release after the observer has drained the records these writes queued.
            requestAnimationFrame(() => { repositioningRef.current = false; });
        }
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
        <div className="relative flex items-center justify-center">
            <div ref={containerRef}>
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
                    inputClassName={DATE_INPUT_CLASS}
                    containerClassName="relative [&>div]:border-0 [&>div]:shadow-none [&>div]:rounded-none [&>div]:bg-transparent"
                    toggleClassName="hidden"
                    popoverDirection="down"
                />
            </div>
            {dateVal?.startDate && (
                <Tltip direction="top" tltpText="Clear date">
                    <button
                        onClick={handleClear}
                        className="absolute top-1/2 -translate-y-1/2 right-0 text-[var(--ink-muted)] hover:text-[var(--bad-text)] transition-colors z-10 font-medium leading-none"
                        style={{ fontSize: 'var(--fs-input)', padding: '1px 2px' }}
                    >
                        ×
                    </button>
                </Tltip>
            )}
        </div>
    );
};

export default DatePicker;
