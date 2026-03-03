import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup
} from "../../../components/ui/select"
import { sortArr } from "../../../utils/utils";
import React, { memo } from "react";

const SelectEnt = memo(({ props, data, handleChangeSelect, month, name, plHolder }) => {

    return (
        <div>
            <Select
                className='h-6'
                value={props.getValue()}
                onValueChange={(e) => handleChangeSelect(e, props.row.index, month, name)}
            >
                <SelectTrigger className="h-8 text-xs w-36 border border-[#005b9f] text-[#005b9f] focus:ring-1 focus:ring-offset-0 focus:border-[#005b9f] focus:ring-[#005b9f] hover:border-[#005b9f] transition-colors rounded-2xl">
                    <SelectValue placeholder={plHolder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {sortArr(data, 'nname').map((z, i) => (
                            <SelectItem value={z.id} key={i} className='text-slate-600 text-xs'>
                                {z.nname}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if `props.getValue()` or `props.row.index` change
    return prevProps.props.getValue() === nextProps.props.getValue() &&
        prevProps.props.row.index === nextProps.props.row.index;
});

// Assign a display name to the memoized component
SelectEnt.displayName = 'SelectEnt';

export default SelectEnt;
