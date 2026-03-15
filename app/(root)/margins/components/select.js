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

const getCellValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

const SelectEnt = memo(({ props, data, handleChangeSelect, month, name, plHolder }) => {
    const cellValue = getCellValue(props);
    return (
        <div className="relative w-full">
           <Select
  value={cellValue}
  onValueChange={(e) => handleChangeSelect(e, props.row.index, month, name)}
>
  <SelectTrigger
    className="
      h-7
 w-full
      bg-[#fafafa]
      rounded-full
      px-2
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

  <SelectContent className="z-40 bg-[#fafafa] rounded-xl shadow-lg border border-[#cecece]" style={{ maxHeight: '180px' }}>
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
    return getCellValue(prevProps.props) === getCellValue(nextProps.props) &&
        prevProps.props.row.index === nextProps.props.row.index;
});

SelectEnt.displayName = 'SelectEnt';

export default SelectEnt;
