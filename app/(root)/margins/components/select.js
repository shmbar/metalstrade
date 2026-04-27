import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup
} from "../../../../components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip"
import { sortArr } from "../../../../utils/utils";
import React, { memo } from "react";

const getCellValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

const SelectEnt = memo(({ props, data, handleChangeSelect, month, name, plHolder }) => {
    const cellValue = getCellValue(props);
    const selectedItem = data?.find(z => z.id === cellValue);
    const fullName = selectedItem?.nname || '';
    return (
        <div className="relative w-full">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
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
      text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem]
      text-[var(--port-gore)]
      border border-[#d8e8f5]
      focus:border-[var(--endeavour)]
      focus:ring-1
      focus:ring-[var(--endeavour)]
      shadow-none
      focus:outline-none
      [&>span]:flex-1
      [&>span]:text-center
    "
    style={{ minHeight: '26px', fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
  >
    <SelectValue
      placeholder={plHolder}
      className="text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem]"
    />
  </SelectTrigger>

  <SelectContent className="z-40 bg-[#f8fbff] rounded-xl shadow-lg border border-[#d8e8f5]" style={{ maxHeight: '180px' }}>
    <SelectGroup>
      {sortArr(data, 'nname').map((z, i) => (
        <SelectItem
          value={z.id}
          key={i}
          className="text-[0.68rem] xl:text-[0.72rem] 2xl:text-[0.75rem] 3xl:text-[0.8125rem] px-3 py-1.5 hover:bg-blue-50 focus:bg-blue-100 cursor-pointer"
        >
          {z.nname}
        </SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
                </div>
              </TooltipTrigger>
              {fullName && (
                <TooltipContent
                  side="top"
                  className="bg-[var(--chathams-blue)] text-white text-[0.72rem] rounded-lg px-2.5 py-1 border-0 shadow-md"
                  style={{ fontFamily: "var(--font-poppins), 'Poppins', sans-serif" }}
                >
                  {fullName}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
    );
}, (prevProps, nextProps) => {
    return getCellValue(prevProps.props) === getCellValue(nextProps.props) &&
        prevProps.props.row.index === nextProps.props.row.index;
});

SelectEnt.displayName = 'SelectEnt';

export default SelectEnt;
