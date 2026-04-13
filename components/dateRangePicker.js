'use client'

import React, { useContext, useState, useEffect } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "../contexts/useSettingsContext";
import dateFormat from "dateformat";
import { FaRegCalendarAlt } from "react-icons/fa";

// string (yyyy-mm-dd) -> Date
const toDate = (val) => (val ? new Date(val) : null);

// Date -> string (yyyy-mm-dd)
const toStr = (val) => (val ? dateFormat(val, "yyyy-mm-dd") : null);

const DateRangePicker = ({ displayLabel }) => {
    const { setDateSelect, dateSelect } = useContext(SettingsContext);
    const [menuOpen, setMenuOpen] = useState(false);

    const [value, setValue] = useState({
        startDate: toDate(dateSelect.start),
        endDate: toDate(dateSelect.end),
    });

    useEffect(() => {
        const handler = (e) => setMenuOpen(e.detail?.isOpen ?? false);
        window.addEventListener('ims:menuToggle', handler);
        return () => window.removeEventListener('ims:menuToggle', handler);
    }, []);

    useEffect(() => {
        setValue({
            startDate: toDate(dateSelect.start),
            endDate: toDate(dateSelect.end),
        });
    }, [dateSelect]);

    const handleValueChange = (newValue) => {
        setValue(newValue);
        setDateSelect({
            start: toStr(newValue.startDate),
            end: toStr(newValue.endDate),
        });
    };

    const today = new Date();
    const yr = today.getFullYear();
    const firstDayOfMonth = new Date(yr, today.getMonth(), 1);
    const lastDayOfMonth = new Date(yr, today.getMonth() + 1, 0);

    // Inject custom styles
    useEffect(() => {
        const styleId = "datepicker-rounded-style";
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            /* ── Toggle icon: move to left side ── */
            .react-tailwindcss-datepicker-container button {
                position: absolute !important;
                left: 0.5rem !important;
                right: auto !important;
                top: 50% !important;
                transform: translateY(-50%) !important;
                padding: 0 !important;
                background: transparent !important;
                border: none !important;
            }

            /* ── Popup wrapper: rounded + themed border + shadow + compact size ── */
            .react-tailwindcss-datepicker-container > div:not(:first-child),
            .shadow-sm.border.border-gray-300.px-1.py-0\\.5.bg-white.rounded-lg {
                border-radius: 1.25rem !important;
                border: 1px solid #b8ddf8 !important;
                box-shadow: 0 8px 32px rgba(3,102,174,0.13) !important;
                overflow: hidden !important;
                z-index: 9999 !important;
                transform-origin: top right !important;
            }

            /* ── Input: remove shadow on focus ── */
            .react-tailwindcss-datepicker-container input {
                box-shadow: none !important;
                color: var(--chathams-blue) !important;
                font-size: 0.75rem !important;
            }

            /* ── Month/Year header pill ── */
            .flex.items-center.space-x-1\\.5.border.border-gray-300.rounded-md.px-2.py-1\\.5 {
                background: #dbeeff !important;
                border: 1px solid #b8ddf8 !important;
                border-radius: 999px !important;
                color: var(--chathams-blue) !important;
            }

            /* ── Nav chevron buttons ── */
            .rounded-full.p-\\[0\\.45rem\\] {
                border-radius: 999px !important;
            }
            .rounded-full.p-\\[0\\.45rem\\]:hover {
                background: #dbeeff !important;
            }

            /* ── Month/Year text buttons (uppercase label) ── */
            .tracking-wide.px-3.py-\\[0\\.55rem\\].uppercase.hover\\:bg-gray-100.rounded-md {
                border-radius: 999px !important;
                color: var(--chathams-blue) !important;
            }
            .tracking-wide.px-3.py-\\[0\\.55rem\\].uppercase.hover\\:bg-gray-100.rounded-md:hover {
                background: #dbeeff !important;
            }

            /* ── Week header row ── */
            .grid.grid-cols-7.border-b.border-gray-300.py-2 {
                border-color: #e8f0f8 !important;
            }
            .grid.grid-cols-7.border-b.border-gray-300.py-2 > div {
                color: var(--chathams-blue) !important;
                font-size: 11px !important;
                font-weight: 600 !important;
            }

            /* ── Day cells container ── */
            .grid.grid-cols-7.gap-y-0\\.5.my-1 > div {
                border-radius: 999px !important;
            }

            /* ── Individual day buttons ── */
            .flex.items-center.justify-center.w-12.h-12,
            .flex.items-center.justify-center.w-10.h-10,
            .flex.items-center.justify-center.lg\\:w-10.lg\\:h-10 {
                border-radius: 999px !important;
                font-size: 12px !important;
            }
            .flex.items-center.justify-center.w-12.h-12:hover,
            .flex.items-center.justify-center.lg\\:w-10.lg\\:h-10:hover {
                background: #dbeeff !important;
                color: var(--chathams-blue) !important;
            }

            /* ── Selected day (start/end) — override rounded-r-full / rounded-l-full to full circle ── */
            .rounded-r-full, .rounded-l-full {
                border-radius: 999px !important;
            }

            /* ── Range highlight days ── */
            .bg-blue-100 {
                background-color: #dbeeff !important;
            }

            /* ── Shortcuts list items ── */
            .whitespace-nowrap.w-1\\/2.transition-all.duration-300.hover\\:bg-gray-100.p-2.rounded,
            .whitespace-nowrap.lg\\:w-auto.transition-all.duration-300.hover\\:bg-gray-100.p-2.rounded {
                border-radius: 999px !important;
                color: var(--endeavour) !important;
                font-size: 12px !important;
            }
            .whitespace-nowrap.w-1\\/2.transition-all.duration-300.hover\\:bg-gray-100.p-2.rounded:hover,
            .whitespace-nowrap.lg\\:w-auto.transition-all.duration-300.hover\\:bg-gray-100.p-2.rounded:hover {
                background: #dbeeff !important;
            }

            /* ── Divider between shortcuts and calendar ── */
            .md\\:border-b.mb-3.border-gray-300 {
                border-color: #e8f0f8 !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            const s = document.getElementById(styleId);
            if (s) s.remove();
        };
    }, []);

    if (menuOpen) return null;

    return (
        <div className="relative flex items-center w-full max-w-[200px] rounded-2xl">
            {displayLabel && (
                <span className="text-[10px] font-medium text-[var(--port-gore)] bg-gray-100 px-2 py-0.5 rounded-2xl shadow-sm whitespace-nowrap mr-2">
                    {displayLabel}
                </span>
            )}

            <div className="relative w-full">
                <Datepicker
                    toggleIcon={() => (
                        <FaRegCalendarAlt className="text-xs" style={{ color: 'var(--chathams-blue)' }} />
                    )}
                    inputClassName="
                        text-[11px] h-7 py-0 pl-7 pr-4
                        w-full
                        bg-white
                        rounded-2xl
                        border border-[#d8e8f5]
                        shadow-sm
                        cursor-pointer
                        hover:border-[#d8e8f5]
                        focus:outline-none
                        focus:ring-1 focus:ring-blue-200
                        tracking-normal
                        leading-tight
                    "
                    primaryColor="blue"
                    useRange={false}
                    value={value}
                    onChange={handleValueChange}
                    displayFormat="DD.MM.YY"
                    placeholder="Select range"
                    showShortcuts={true}
                    readOnly={true}
                    popoverDirection="down"
                    containerClassName="relative z-[50]"
                    configs={{
                        shortcuts: {
                            today: {
                                text: "Today",
                                period: { start: today, end: today },
                            },
                            thisMonth: {
                                text: "This month",
                                period: { start: firstDayOfMonth, end: lastDayOfMonth },
                            },
                            thisYear: {
                                text: "This year",
                                period: {
                                    start: new Date(yr, 0, 1),
                                    end: new Date(yr, 11, 31),
                                },
                            },
                            lastYear: {
                                text: "Last year",
                                period: {
                                    start: new Date(yr - 1, 0, 1),
                                    end: new Date(yr - 1, 11, 31),
                                },
                            },
                        },
                    }}
                />

            </div>
        </div>
    );
};

export default DateRangePicker;