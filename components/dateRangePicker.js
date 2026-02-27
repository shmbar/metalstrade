
'use client'

import React, { useContext, useState, useEffect } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "../contexts/useSettingsContext";
import dateFormat from "dateformat";
import { FaRegCalendarAlt } from "react-icons/fa";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return isMobile;
}

// string (yyyy-mm-dd) -> Date
const toDate = (val) => (val ? new Date(val) : null);

// Date -> string (yyyy-mm-dd)
const toStr = (val) => (val ? dateFormat(val, "yyyy-mm-dd") : null);

const DateRangePicker = ({ displayLabel }) => {
    const { setDateSelect, dateSelect } = useContext(SettingsContext);

    // Keep picker value as Date objects
    const [value, setValue] = useState({
        startDate: toDate(dateSelect.start),
        endDate: toDate(dateSelect.end),
    });

    // Sync when context changes
    useEffect(() => {
        setValue({
            startDate: toDate(dateSelect.start),
            endDate: toDate(dateSelect.end),
        });
    }, [dateSelect]);

    // Handle value change
    const handleValueChange = (newValue) => {
        setValue(newValue);
        setDateSelect({
            start: toStr(newValue.startDate),
            end: toStr(newValue.endDate),
        });
    };

    // Shortcut Dates
    const today = new Date();
    const yr = today.getFullYear();
    const firstDayOfMonth = new Date(yr, today.getMonth(), 1);
    const lastDayOfMonth = new Date(yr, today.getMonth() + 1, 0);

    // Inject custom styles for datepicker
    useEffect(() => {
        const styleId = "datepicker-low-zindex";
        if (document.getElementById(styleId)) return;

        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            /* Force LOW z-index for datepicker dropdown */
            .react-tailwindcss-datepicker > div[class*="absolute"],
            .react-tailwindcss-datepicker [role="dialog"],
            .react-tailwindcss-datepicker [data-testid="dropdown"] {
                z-index: 10 !important;
            }

            /* Remove ALL borders from datepicker input */
            .react-tailwindcss-datepicker input,
            .react-tailwindcss-datepicker input:focus,
            .react-tailwindcss-datepicker input:active,
            .react-tailwindcss-datepicker input:hover,
            .react-tailwindcss-datepicker > div,
            .react-tailwindcss-datepicker > div:focus-within {
                border: none !important;
                box-shadow: none !important;
                outline: none !important;
                ring: none !important;
            }

            /* Force text color and font size */
            .react-tailwindcss-datepicker input {
                color: #11497c !important;
                font-size: 0.75rem !important;
            }

            /* Remove ring/focus styles */
            .react-tailwindcss-datepicker .focus\\:ring-2,
            .react-tailwindcss-datepicker .focus\\:ring,
            .react-tailwindcss-datepicker [class*="ring"] {
                --tw-ring-shadow: none !important;
                --tw-ring-color: transparent !important;
                box-shadow: none !important;
            }

            /* When any popup/chat/modal is open */
            .ims-chat-open .react-tailwindcss-datepicker [data-testid="dropdown"],
            .ims-chat-open .react-tailwindcss-datepicker [role="dialog"] {
                display: none !important;
                pointer-events: none !important;
                opacity: 0 !important;
            }

            /* --- Custom styling for datepicker shortcuts --- */
            .react-tailwindcss-datepicker .rdrDefinedRangesWrapper {
                background: #f8f5ff !important;
                border-radius: 1rem 0 0 1rem !important;
                padding: 0.5rem 0.5rem 0.5rem 0.5rem !important;
                min-width: 120px;
            }
            .react-tailwindcss-datepicker .rdrStaticRange {
                margin-bottom: 0.25rem !important;
            }
            .react-tailwindcss-datepicker .rdrStaticRangeLabel {
                font-weight: 700 !important;
                font-size: 0.75rem !important;
                color: #5b21b6 !important;
                border-radius: 0.5rem !important;
                padding: 0.4rem 1rem 0.4rem 1rem !important;
                margin: 0.1rem 0.2rem !important;
                transition: background 0.15s, color 0.15s;
                cursor: pointer;
                border-left: 4px solid transparent;
            }
            .react-tailwindcss-datepicker .rdrStaticRangeLabel:hover {
                background: #ede9fe !important;
                color: #7c3aed !important;
            }
            .react-tailwindcss-datepicker .rdrStaticRangeSelected .rdrStaticRangeLabel {
                background: #c7d2fe !important;
                color: #1e40af !important;
                border-left: 4px solid #7c3aed !important;
            }
            /* Add a dot for selected shortcut */
            .react-tailwindcss-datepicker .rdrStaticRangeSelected .rdrStaticRangeLabel::before {
                content: '';
                display: inline-block;
                width: 0.5em;
                height: 0.5em;
                background: #7c3aed;
                border-radius: 50%;
                margin-right: 0.6em;
                vertical-align: middle;
            }
        `;
        document.head.appendChild(style);

        return () => {
            const s = document.getElementById(styleId);
            if (s) s.remove();
        }
    }, []);

    return (
        <div
            className="relative flex items-center transition-all duration-200 group w-full max-w-[240px]"
            style={{ zIndex: 5 }}
        >
            {displayLabel && (
                <span className="text-[10px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded shadow-sm whitespace-nowrap mr-2">
                    {displayLabel}
                </span>
            )}
            <div className="relative w-full flex-1">
                <Datepicker
                    inputClassName="
                        text-xs py-1.5 pl-7 pr-2
                        rounded-lg
                        font-normal
                        w-full
                        bg-white
                        cursor-pointer
                        hover:border-[#005b9f]
                        focus:outline-none
                        focus:ring-1 focus:ring-blue-200
                        border border-[#005b9f]
                        shadow-sm transition-all duration-200
                        placeholder:text-gray-400
                        tracking-normal
                        leading-tight
                    "
                    useRange={false}
                    value={value}
                    onChange={handleValueChange}
                    displayFormat="DD-MMM-YY"
                    placeholder="Select range"
                    showShortcuts={true}
                    readOnly={true}
                 
                    popoverDirection="down"
                    containerClassName="relative z-[5]"
                    configs={{
                        shortcuts: {
                            customToday: {
                                text: "Today",
                                period: {
                                    start: today,
                                    end: today,
                                },
                            },
                            customMonth: {
                                text: "This month",
                                period: {
                                    start: firstDayOfMonth,
                                    end: lastDayOfMonth,
                                },
                            },
                            custom: {
                                text: "This year",
                                period: {
                                    start: new Date(yr, 0, 1),
                                    end: new Date(yr, 11, 31),
                                },
                            },
                            custom1: {
                                text: "Last year",
                                period: {
                                    start: new Date(yr - 1, 0, 1),
                                    end: new Date(yr - 1, 11, 31),
                                },
                            },
                        },
                    }}
                />
                <FaRegCalendarAlt 
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none transition-colors" 
                    style={{ color: '#11497c' }}
                />
            </div>
        </div>
    );
};

export default DateRangePicker;