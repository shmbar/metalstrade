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
      w-full
      bg-[#f8fbff]
      rounded-lg
      px-2
      text-[11px]
      text-[#1F2937]
      border border-[#d8e8f5]
      focus:border-[var(--endeavour)]
      focus:ring-1
      focus:ring-[var(--endeavour)]
      shadow-none
      focus:outline-none
      [&>span]:flex-1
      [&>span]:text-center
    "
    style={{ minHeight: '26px', fontFamily: "var(--font-poppins), 'Plus Jakarta Sans', sans-serif" }}
  >
    <SelectValue
      placeholder={plHolder}
      className="text-[11px]"
    />
  </SelectTrigger>

  <SelectContent className="z-40 bg-[#f8fbff] rounded-xl shadow-lg border border-[#d8e8f5]" style={{ maxHeight: '180px' }}>
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
