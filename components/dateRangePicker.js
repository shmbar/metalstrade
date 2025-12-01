import React, { useContext, useState } from "react";
import Datepicker from "react-tailwindcss-datepicker";
import { SettingsContext } from "@contexts/useSettingsContext";
import dateFormat from 'dateformat';

const DateRangePicker = () => {

    const { setDateSelect, dateSelect } = useContext(SettingsContext);

    const [value, setValue] = useState({
        startDate: dateSelect.start,
        endDate: dateSelect.end
    });

    const yr = new Date().getFullYear();

    const handleValueChange = (newValue) => {
        setValue(newValue);

        setDateSelect({
            ...dateSelect, start: newValue.startDate,
            end: newValue.endDate
        })
    }

    return (
        <Datepicker
            inputClassName='border border-slate-300 text-sm/6 p-1 px-1.5 rounded-lg text-slate-500 w-60
             focus:outline-none cursor-pointer z-0 bg-white'
            useRange={false}
            value={value}
            onChange={handleValueChange}
            displayFormat={"DD-MMM-YY"}
            placeholder="Select range"
            showShortcuts={true}
            //    primaryColor={"indigo"}
            readOnly={true}
            configs={{
                shortcuts: {
                    today: "Today",
                    currentMonth: "This month",
                    custom: {
                        text: "This year",
                        period: {
                            start: `${yr}-01-01`,
                            end: `${yr}-12-31`
                        },
                    },
                    custom1: {
                        text: "Last year",
                        period: {
                            start: `${yr - 1}-01-01`,
                            end: `${yr - 1}-12-31`
                        },
                    },
                }
            }}
            containerClassName="z-20 relative"
        />

    );
};
export default DateRangePicker;