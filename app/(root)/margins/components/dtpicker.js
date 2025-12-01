import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@components/ui/button";
import dateFormat from "dateformat";
import { ImCancelCircle } from "react-icons/im";
import { MdOutlineDateRange } from "react-icons/md";
import { Calendar } from "@/components/ui/calendar"


const DatePicker = ({ props, handleChangeDate, month, handleCancelDate }) => {

    return (
        <div className="flex relative  w-20 rounded-md">
            <Popover className='flex'>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        className="h-6 p-1 justify-start text-left font-normal text-gray-600 text-xs"
                    >

                        {props.getValue()?.startDate ? dateFormat(props.getValue()?.startDate, 'dd.mm.yy') :
                            <span className=''>DD.MM.YY</span>}
                        {!props.getValue()?.startDate &&
                            <MdOutlineDateRange className=" font-bold scale-110  mr-1 text-slate-500 cursor-pointer" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={props.getValue()?.startDate}
                        onSelect={(e) => handleChangeDate(e, props.row.index, month)}
                        initialFocus
                    />
                </PopoverContent>

            </Popover>
            {props.getValue()?.startDate &&
                <ImCancelCircle className="absolute right-0 top-1 mr-1 text-slate-500 cursor-pointer text-xs"
                    onClick={(e) => handleCancelDate(e, props.row.index, month)} />
            }
        </div>
    )
}

export default DatePicker