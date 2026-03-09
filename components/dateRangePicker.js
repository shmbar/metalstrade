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

    const [value, setValue] = useState({
        startDate: toDate(dateSelect.start),
        endDate: toDate(dateSelect.end),
    });

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
            /* Popup container — rounded, shadow, themed */
            .react-tailwindcss-datepicker [role="dialog"] {
                border-radius: 1.25rem !important;
                border: 1px solid #b8ddf8 !important;
                box-shadow: 0 8px 32px rgba(3,102,174,0.12) !important;
                overflow: hidden !important;
                z-index: 10 !important;
            }

            /* Input wrapper */
            .react-tailwindcss-datepicker > div {
                border-radius: 1rem !important;
            }
            .react-tailwindcss-datepicker input,
            .react-tailwindcss-datepicker input:focus,
            .react-tailwindcss-datepicker > div:focus-within {
                box-shadow: none !important;
                outline: none !important;
            }
            .react-tailwindcss-datepicker input {
                color: var(--chathams-blue) !important;
                font-size: 0.75rem !important;
            }

            /* Month/year header — pill shape with light blue bg */
            .react-tailwindcss-datepicker [role="dialog"] .font-semibold.text-lg,
            .react-tailwindcss-datepicker [role="dialog"] h5 {
                background: #dbeeff !important;
                border-radius: 999px !important;
                padding: 4px 16px !important;
                color: var(--chathams-blue) !important;
                font-size: 13px !important;
            }

            /* Nav prev/next buttons — rounded */
            .react-tailwindcss-datepicker [role="dialog"] button[type="button"] {
                border-radius: 999px !important;
            }
            .react-tailwindcss-datepicker [role="dialog"] button[type="button"]:hover {
                background: #dbeeff !important;
            }

            /* Day-of-week header row */
            .react-tailwindcss-datepicker [role="dialog"] .grid.grid-cols-7 > div:first-child,
            .react-tailwindcss-datepicker [role="dialog"] .text-center.font-medium {
                color: var(--chathams-blue) !important;
                font-size: 11px !important;
            }

            /* Individual day cells */
            .react-tailwindcss-datepicker [role="dialog"] button[role="button"],
            .react-tailwindcss-datepicker [role="dialog"] .day-btn {
                border-radius: 999px !important;
                font-size: 12px !important;
                color: #1F2937 !important;
            }
            .react-tailwindcss-datepicker [role="dialog"] button[role="button"]:hover {
                background: #dbeeff !important;
                color: var(--chathams-blue) !important;
            }

            /* Selected / today day */
            .react-tailwindcss-datepicker [role="dialog"] .bg-blue-500,
            .react-tailwindcss-datepicker [role="dialog"] [class*="bg-blue-5"] {
                background-color: var(--endeavour) !important;
                border-radius: 999px !important;
                color: #fff !important;
            }

            /* Range highlight */
            .react-tailwindcss-datepicker [role="dialog"] .bg-blue-100,
            .react-tailwindcss-datepicker [role="dialog"] [class*="bg-blue-1"] {
                background-color: #dbeeff !important;
                color: var(--chathams-blue) !important;
            }

            /* Shortcuts panel */
            .react-tailwindcss-datepicker [role="dialog"] ul li button {
                border-radius: 999px !important;
                font-size: 12px !important;
                color: var(--endeavour) !important;
                padding: 4px 12px !important;
            }
            .react-tailwindcss-datepicker [role="dialog"] ul li button:hover {
                background: #dbeeff !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            const s = document.getElementById(styleId);
            if (s) s.remove();
        };
    }, []);

    return (
        <div className="relative flex items-center w-full max-w-[240px] rounded-2xl">
            {displayLabel && (
                <span className="text-[10px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-2xl shadow-sm whitespace-nowrap mr-2">
                    {displayLabel}
                </span>
            )}

            <div className="relative w-full">
                <Datepicker
                    inputClassName="
                        text-xs py-2 pl-7 pr-8
                        w-full
                        bg-white
                        rounded-2xl
                        border border-[var(--endeavour)]
                        shadow-sm
                        cursor-pointer
                        hover:border-[var(--endeavour)]
                        focus:outline-none
                        focus:ring-1 focus:ring-blue-200
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
                    containerClassName="relative"
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

                <FaRegCalendarAlt
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                    style={{ color: "var(--chathams-blue)" }}
                />
            </div>
        </div>
    );
};

export default DateRangePicker;