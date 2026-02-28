import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../../../components/ui/popover"
import { Button } from "../../../../components/ui/button";
import dateFormat from "dateformat";
import { ImCancelCircle } from "react-icons/im";
import { MdOutlineDateRange } from "react-icons/md";
import { Calendar } from "../../../../components/ui/calendar"

const DatePicker = ({ props, handleChangeDate, month, handleCancelDate }) => {
    return (
        <div className="flex relative w-20 rounded-md bg-white border-0 border-blue-100 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200 transition">
            <Popover className='flex'>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-6 p-1 justify-start text-left font-normal text-[#005b9f] text-[11px] bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        {props.value?.startDate ? dateFormat(props.value.startDate, 'dd.mm.yy') :
                            <span className=''>DD.MM.YY</span>}
                        {!props.value?.startDate &&
                            <MdOutlineDateRange className="font-bold scale-110 mr-1 text-slate-500 cursor-pointer" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0 z-50 bg-white rounded-xl shadow-lg border border-blue-100"
                    align="start"
                    sideOffset={4}
                    style={{ minWidth: 180, overflow: 'visible' }}
                >
                    <Calendar
                        mode="single"
                        selected={props.value?.startDate}
                        onSelect={(e) => handleChangeDate(e, props.row.index, month)}
                        initialFocus
                        className="rounded-xl bg-white p-2 text-gray-800"
                        dayClassName="rounded-md px-2 py-1 hover:bg-blue-100 transition cursor-pointer"
                        selectedDayClassName="bg-blue-500 text-white font-bold"
                        todayClassName="border border-blue-400"
                        headerClassName="font-semibold text-lg py-2"
                        navButtonClassName="rounded-full bg-blue-100 hover:bg-blue-300 text-blue-700 px-2 py-1"
                    />
                </PopoverContent>
            </Popover>
            {props.value?.startDate &&
                <ImCancelCircle className="absolute right-0 top-1 mr-1 text-slate-500 cursor-pointer text-xs"
                    onClick={(e) => handleCancelDate(e, props.row.index, month)} />}
        </div>
    )
}

export default DatePicker
