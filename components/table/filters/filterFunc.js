import React, { useEffect, useState } from "react";


export const Filter = ({ column, table, filterOn }) => {
    const columnFilterValue = column.getFilterValue();
    const { filterVariant } = column.columnDef.meta || {};

    const inputCls = 'text-xs bg-[#f4f9ff] border border-[#b8ddf8] rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)] text-[var(--chathams-blue)] placeholder-[#9fb8d4] w-full';
    const selectCls = 'text-xs bg-[#f4f9ff] border border-[#b8ddf8] rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)] text-[var(--chathams-blue)] w-full appearance-none cursor-pointer';

    return filterOn &&
        (filterVariant === 'range' ? (
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
        ) : filterVariant === 'selectClient' ? (
            <select onChange={e => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()} className={selectCls}>
                <option value="">All</option>
                {[...new Set(table.options.data.map(x => x.client).filter(z => z !== ''))].map(q => <option value={q} key={q}>{q}</option>)}
            </select>
        ) : filterVariant === 'selectSupplier' ? (
            <select onChange={e => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()} className={selectCls}>
                <option value="">All</option>
                {(() => {
                    const options = column.columnDef.meta?.options;
                    if (options?.length) {
                        const usedIds = [...new Set(table.options.data.map(x => x.supplier).filter(Boolean))];
                        return options.filter(o => usedIds.includes(o.value)).map(o => <option value={o.value} key={o.value}>{o.label}</option>);
                    }
                    return [...new Set(table.options.data.map(x => x.supplier).filter(z => z !== ''))].map(q => <option value={q} key={q}>{q}</option>);
                })()}
            </select>
        ) : filterVariant === 'selectStock' ? (
            <select onChange={e => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()} className={selectCls}>
                <option value="">All</option>
                {[...new Set(table.options.data.map(x => x.stock).filter(z => z !== ''))].map(q => <option value={q} key={q}>{q}</option>)}
            </select>
        ) : filterVariant === 'selectStockType' ? (
            <select onChange={e => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()} className={selectCls}>
                <option value="">All</option>
                {[...new Set(table.options.data.map(x => x.sType).filter(z => z !== ''))].map(q => <option value={q} key={q}>{q}</option>)}
            </select>
        ) : filterVariant === 'paidNotPaidExp' ? (
            <select onChange={e => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()} className={selectCls}>
                <option value="">All</option>
                {(() => {
                    const options = column.columnDef.meta?.options;
                    if (options?.length) {
                        const usedIds = [...new Set(table.options.data.map(x => x.paid).filter(Boolean))];
                        return options.filter(o => usedIds.includes(o.value)).map(o => <option value={o.value} key={o.value}>{o.label}</option>);
                    }
                    return [...new Set(table.options.data.map(x => x.paid).filter(z => z !== ''))].map(q => <option value={q} key={q}>{q}</option>);
                })()}
            </select>
        ) : filterVariant === 'paidNotPaid' ? (
            <select onChange={e => column.setFilterValue(e.target.value)} value={columnFilterValue?.toString()} className={selectCls}>
                <option value="">All</option>
                {[...new Set(table.options.data.map(x => x.paidNotPaid).filter(z => z !== ''))].map(q => <option value={q} key={q}>{q}</option>)}
            </select>
        ) : filterVariant === 'dates' ? (
            <div className="flex items-center gap-1">
                <input
                    type="date"
                    value={columnFilterValue?.[0] || ''}
                    onChange={e => column.setFilterValue(old => [e.target.value, old ? old[1] : undefined])}
                    className={inputCls}
                    max={columnFilterValue?.[1] || ''}
                />
                <span className="text-[#9fb8d4] text-xs">-</span>
                <input
                    type="date"
                    value={columnFilterValue?.[1] || ''}
                    onChange={e => column.setFilterValue(old => [old ? old[0] : undefined, e.target.value])}
                    min={columnFilterValue?.[0] || ''}
                    className={inputCls}
                />
            </div>
        ) : (
            <DebouncedInput
                onChange={value => column.setFilterValue(value)}
                placeholder="Search..."
                type="text"
                value={(columnFilterValue ?? '')}
                inputCls={inputCls}
            />
        ));

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
            className={inputCls || `text-xs bg-[#f4f9ff] border border-[#b8ddf8] rounded-full px-3 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)] text-[var(--chathams-blue)] placeholder-[#9fb8d4] w-full`} />
    );
}
