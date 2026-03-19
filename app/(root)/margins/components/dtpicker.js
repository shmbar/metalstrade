'use client'
import Datepicker from "react-tailwindcss-datepicker";

const getDateValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

const DatePicker = ({ props, handleChangeDate, month, handleCancelDate }) => {
    const dateVal = getDateValue(props);

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

    return (
        <div className="flex items-center gap-1">
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
                    inputClassName="text-[11px] h-6 py-0 pl-2 pr-1 w-[72px] bg-white rounded-md border-0 outline-none cursor-pointer text-[var(--endeavour)]"
                    containerClassName="relative"
                    toggleClassName="hidden"
                    popoverDirection="down"
                    popupClassName="fixed z-[99999] mt-[1px] text-sm lg:text-xs 2xl:text-sm translate-y-4 opacity-0 hidden transition-all ease-out duration-300"
                />
            </div>
        </div>
    );
};

export default DatePicker;
