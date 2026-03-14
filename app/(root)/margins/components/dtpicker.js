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
        <div className="w-24">
            <Datepicker
                asSingle={true}
                useRange={false}
                value={value}
                onChange={handleChange}
                displayFormat="DD.MM.YY"
                placeholder="DD.MM.YY"
                primaryColor="blue"
                readOnly={true}
                inputClassName="text-[11px] h-6 py-0 pl-6 pr-1 w-full bg-white rounded-md border-0 outline-none cursor-pointer text-[var(--endeavour)]"
                containerClassName="relative"
                popoverDirection="down"
                popupClassName="fixed z-[99999] mt-[1px] text-sm lg:text-xs 2xl:text-sm translate-y-4 opacity-0 hidden transition-all ease-out duration-300"
            />
        </div>
    );
};

export default DatePicker;
