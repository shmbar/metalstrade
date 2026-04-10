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
                <SelectTrigger className="h-8 responsiveText w-36 border border-[var(--endeavour)] text-[var(--endeavour)] focus:ring-1 focus:ring-offset-0 focus:border-[var(--endeavour)] focus:ring-[var(--endeavour)] hover:border-[var(--endeavour)] transition-colors rounded-2xl">
                    <SelectValue placeholder={plHolder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {sortArr(data, 'nname').map((z, i) => (
                            <SelectItem value={z.id} key={i} className='text-[var(--port-gore)] responsiveText'>
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
