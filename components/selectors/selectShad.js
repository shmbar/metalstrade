import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@components/ui/select"
import { cn } from "@lib/utils"
import { sortArr } from "@utils/utils"
import { X } from "lucide-react"


export function Selector({ arr, value, onChange, name, clear, disabled, secondaryName, classes }) {


    const clearSelection = (e) => {
        e.stopPropagation()
        e.preventDefault()
        clear(name)
    }

    return (
        <Select className='border-slate-400' value={value[name]} onValueChange={onChange}
            defaultValue="df">
            <SelectTrigger className={`relative border-[var(--endeavour)] rounded-2xl h-7 text-[11px] gap-0.5 px-2
                    text-[var(--chathams-blue)] outline-none focus:ring-0
                    focus:outline-none focus:ring-offset-0 shadow-sm pointer-events-auto
                    ${classes}`}
                disabled={disabled}>
                <SelectValue placeholder="Select" />

                {clear &&
                    <div
                        type="button"
                        onClick={clearSelection}
                        onPointerDown={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                        }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="size-4 text-slate-500" />
                    </div>
                }


            </SelectTrigger>
            <SelectContent className="rounded-2xl border border-[var(--endeavour)] shadow-md text-xs text-[var(--chathams-blue)]">
                <SelectGroup>
                    {sortArr(arr.filter(x => !x.deleted), name).map(k => {
                        return (
                            <SelectItem key={k.id} value={k.id}
                                className={cn('text-xs rounded-xl', (k.id === 'EditTextDelTime' || k.id === 'allStocks' || k.id==='EditTextRmrks')?
                                    'font-semibold italic text-purple-900' : 'text-[var(--chathams-blue)]')} >
                                {secondaryName ? k[secondaryName] : k[name]}
                            </SelectItem>
                        )
                    })}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
