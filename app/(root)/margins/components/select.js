import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "../../../../components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../../components/ui/tooltip";
import { sortArr } from "../../../../utils/utils";
import { ChevronDown, Check } from "lucide-react";
import React, { memo, useState } from "react";
import { cn } from "../../../../lib/utils";

const getCellValue = (props) =>
    typeof props.getValue === 'function' ? props.getValue() : props.value;

const SelectEnt = memo(({ props, data, handleChangeSelect, month, name, plHolder }) => {
    const cellValue = getCellValue(props);
    const selectedItem = data?.find(z => z.id === cellValue);
    const fullName = selectedItem?.nname || '';
    const [open, setOpen] = useState(false);

    const sorted = sortArr(data, 'nname');

    return (
        <div className="relative w-full">
          <TooltipProvider delayDuration={400}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-full">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={open}
                        className="
                          group w-full flex items-center justify-between
                          bg-transparent rounded-control px-2
                          responsiveTextTable
                          text-[var(--ink)]
                          border border-transparent
                          hover:border-[var(--line-strong)] hover:bg-[var(--bg-card)]
                          focus:border-[var(--brand)] focus:bg-[var(--bg-card)]
                          focus:ring-2 focus:ring-[var(--brand-soft)]
                          focus:outline-none
                          transition-colors
                        "
                        style={{ minHeight: '26px' }}
                      >
                        {/* No `truncate`. A supplier/client name is an identifier,
                            not prose: "Iberi…" and "Iberinox" are different
                            readings of the same cell, and the ellipsis was landing
                            on the one column where the reader has no way to infer
                            the rest. The name now wraps within the cell instead.
                            Dropping overflow:hidden here also stops the trigger
                            clipping descenders — see the leading note in
                            globals.css under the cell line-height floor. */}
                        <span className={cn(
                          "flex-1 text-center",
                          !fullName && "text-[var(--ink-muted)]"
                        )}>
                          {fullName || plHolder}
                        </span>
                        <ChevronDown className="size-3 opacity-0 group-hover:opacity-50 ml-1 shrink-0 transition-opacity" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      sideOffset={4}
                      className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[180px] z-40 bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-pop"
                    >
                      <Command className="bg-transparent">
                        <CommandInput
                          placeholder="Search..."
                          className="responsiveTextInput h-8"
                        />
                        <CommandList style={{ maxHeight: '200px' }}>
                          <CommandEmpty className="py-3 text-center responsiveText text-[var(--ink-muted)]">
                            No match
                          </CommandEmpty>
                          <CommandGroup>
                            {sorted.map((z) => (
                              <CommandItem
                                key={z.id}
                                value={z.nname}
                                onSelect={() => {
                                  handleChangeSelect(z.id, props.row.original.id, month, name);
                                  setOpen(false);
                                }}
                                className="responsiveText px-2 py-1.5 hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--ink)] data-[selected=true]:bg-[var(--brand-soft)] data-[selected=true]:text-[var(--brand)]"
                              >
                                <Check
                                  className={cn(
                                    "mr-1 size-3",
                                    cellValue === z.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {z.nname}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </TooltipTrigger>
              {fullName && !open && (
                <TooltipContent
                  side="top"
                  className="bg-[var(--tooltip-bg)] text-[var(--tooltip-ink)] responsiveTextInput rounded-lg px-2.5 py-1 border border-[var(--tooltip-border)] shadow-pop"
                  style={{ fontFamily: "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif" }}
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
        prevProps.props.row.original.id === nextProps.props.row.original.id &&
        prevProps.data === nextProps.data;
});

SelectEnt.displayName = 'SelectEnt';

export default SelectEnt;
