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
  value={props.value}
  onValueChange={(e) => handleChangeSelect(e, props.row.index, month, name)}
>
  <SelectTrigger
    className="
      h-7
 w-full
      bg-[#fafafa]
      rounded-full
      px-3
      text-[11px]
      text-[var(--endeavour)]
      border border-[#cecece]
      focus:border-blue-400
      focus:ring-1
      focus:ring-blue-400
      shadow-none
      focus:outline-none
    "
  >
    <SelectValue
      placeholder={plHolder}
      className="text-[11px]"
    />
  </SelectTrigger>

  <SelectContent className="z-40  bg-[#fafafa] rounded-xl shadow-lg border border-[#cecece]">
    <SelectGroup>
      {sortArr(data, 'nname').map((z, i) => (
        <SelectItem
          value={z.id}
          key={i}
          className="text-[11px] px-3 py-1.5 hover:bg-blue-50 focus:bg-blue-100 cursor-pointer"
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
