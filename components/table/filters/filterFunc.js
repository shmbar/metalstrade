import React, { useEffect, useState } from "react";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { SearchAdornment } from "../../buttonIcons";

/* Every select-type variant is the same checklist now. The names are kept so no
   page has to change its meta — they used to pick which row field the native
   <select> listed (client / supplier / stock / sType / paid), and the checklist
   reads the column's own value instead, so the distinction is gone. A column
   on one of these variants must set `filterFn: oneOf` (./oneOfFilter): the
   value written is a list, and the default includesString would stringify it. */
const CHECKLIST_VARIANTS = new Set([
    'multi', 'selectClient', 'selectSupplier', 'selectStock', 'selectStockType', 'paidNotPaid', 'paidNotPaidExp',
]);

export const Filter = ({ column, table, filterOn }) => {
    const columnFilterValue = column.getFilterValue();
    const { filterVariant } = column.columnDef.meta || {};

    const inputCls = 'responsiveText font-normal bg-[var(--bg-card)] border border-[var(--line-strong)] rounded-lg px-2 py-0.5 h-6 focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)] text-[var(--chathams-blue)] w-full';

    if (!filterOn) return null;

    if (CHECKLIST_VARIANTS.has(filterVariant)) {
        return <MultiSelectFilter column={column} table={table} />;
    }

    return filterVariant === 'range' ? (
            <div className="flex gap-1">
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue?.[0] ?? '')}
                    onChange={value => column.setFilterValue(old => [value, old?.[1]])}
                    placeholder="Min"
                    inputCls={inputCls}
                />
                <DebouncedInput
                    type="number"
                    value={(columnFilterValue?.[1] ?? '')}
                    onChange={value => column.setFilterValue(old => [old?.[0], value])}
                    placeholder="Max"
                    inputCls={inputCls}
                />
            </div>
        ) : filterVariant === 'dates' ? (
            <div className="flex items-center gap-1">
                <input
                    type="date"
                    value={columnFilterValue?.[0] || ''}
                    onChange={e => column.setFilterValue(old => [e.target.value, old ? old[1] : undefined])}
                    className={inputCls}
                    max={columnFilterValue?.[1] || ''}
                />
                <span className="text-[var(--line-strong)] responsiveTextInput">-</span>
                <input
                    type="date"
                    value={columnFilterValue?.[1] || ''}
                    onChange={e => column.setFilterValue(old => [old ? old[0] : undefined, e.target.value])}
                    min={columnFilterValue?.[0] || ''}
                    className={inputCls}
                />
            </div>
        ) : (
            /* Free text. The magnifier says what the box is for once the placeholder
               is gone, and the clear mark it turns into is the only way to empty a
               24px field without selecting the text first. */
            <div className="relative">
                <DebouncedInput
                    onChange={value => column.setFilterValue(value)}
                    placeholder="Search..."
                    type="text"
                    value={(columnFilterValue ?? '')}
                    inputCls={`${inputCls} pr-6`}
                />
                <SearchAdornment value={columnFilterValue} onClear={() => column.setFilterValue('')} className="!right-1" />
            </div>
        );

}





const DebouncedInput = ({
    value: initialValue,
    onChange,
    debounce = 500,
    type,
    inputCls,
    ...props
}) => {

    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            onChange(value);
        }, debounce);

        return () => clearTimeout(timeout);
    }, [value]);

    return (
        <input {...props} type={type} value={value} onChange={e => setValue(e.target.value)}
            className={inputCls || `responsiveText font-normal bg-[var(--bg-card)] border border-[var(--line-strong)] rounded-lg px-2 py-0.5 h-6 focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)] text-[var(--chathams-blue)] w-full`} />
    );
}
