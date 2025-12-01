import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup
} from "@/components/ui/select"
import { sortArr } from "@utils/utils";
import React, { memo } from "react";

const SelectEnt = memo(({ props, data, handleChangeSelect, month, name, plHolder }) => {

    return (
        <div>
            <Select
                className='h-6'
                value={props.getValue()}
                onValueChange={(e) => handleChangeSelect(e, props.row.index, month, name)}
            >
                <SelectTrigger className="shad-input h-8 text-xs w-36 border-slate-400 text-slate-600 focus:ring-1 focus:ring-offset-0 focus:border-slate-100 focus:ring-slate-400">
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