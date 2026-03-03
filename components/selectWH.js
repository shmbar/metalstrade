import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup
} from "../components/ui/select"
import { sortArr } from "../utils/utils";
import React from "react";

const SelectHW = ({ data, value, setValue, idx, name }) => {

    return (
        <div>
            <Select
                className='h-6'
                value={value?.id ?? ''}
                onValueChange={(e) => setValue(e, idx)}
            >
                <SelectTrigger className="h-8 text-xs border border-[#005b9f] text-[#005b9f] focus:ring-1 focus:ring-offset-0 focus:border-[#005b9f] focus:ring-[#005b9f] hover:border-[#005b9f] transition-colors">
                    <SelectValue placeholder="Select stock" />
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
};

function areEqual(prevProps, nextProps) {
    return (
        prevProps.value?.id === nextProps.value?.id &&
        prevProps.data === nextProps.data && // compare by ref — memoize outside!
        prevProps.idx === nextProps.idx &&
        prevProps.name === nextProps.name
    );
}

export default React.memo(SelectHW, areEqual);
