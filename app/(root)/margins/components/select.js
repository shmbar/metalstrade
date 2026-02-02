import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup
} from "../../../../components/ui/select"
import { sortArr } from "../../../../utils/utils";
import React, { memo } from "react";

const SelectEnt = memo(({ props, data, handleChangeSelect, month, name, plHolder }) => {
    return (
        <div className="relative">
            <Select
                className='h-6'
                value={props.value}
                onValueChange={(e) => handleChangeSelect(e, props.row.index, month, name)}
            >
                <SelectTrigger className="bg-white rounded-md px-2 py-1 text-xs border-0 border-b-2 border-blue-100 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 shadow-none transition w-36 text-slate-600 focus:outline-none focus:z-50">
                    <SelectValue placeholder={plHolder} />
                </SelectTrigger>
                <SelectContent className="z-50 min-w-[140px] bg-white rounded-md shadow-lg border border-blue-100">
                    <SelectGroup>
                        {sortArr(data, 'nname').map((z, i) => (
                            <SelectItem
                                value={z.id}
                                key={i}
                                className="text-slate-700 text-xs px-4 py-2 hover:bg-blue-50 focus:bg-blue-100 cursor-pointer transition"
                            >
                                {z.nname}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.props.value === nextProps.props.value &&
        prevProps.props.row.index === nextProps.props.row.index;
});

SelectEnt.displayName = 'SelectEnt';

export default SelectEnt;
