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
import { useState } from "react"


export function Selector({ arr, value, onChange, name, clear, disabled, secondaryName, classes, row }) {

    // Type-to-filter for long lists (client request: every list gets a search box).
    const [query, setQuery] = useState('')

    const clearSelection = (e) => {
        e.stopPropagation()
        e.preventDefault()
        clear(name, row)
    }

    const base = arr.filter(x => !x.deleted && x.id !== '' && x.id != null)
    const labelOf = (k) => String((secondaryName ? k[secondaryName] : k[name]) ?? '')
    const searchable = base.length > 7
    const shown = query ? base.filter(k => labelOf(k).toLowerCase().includes(query.toLowerCase())) : base

    return (
        <Select className='border-slate-400' value={value[name]} onValueChange={onChange}
            defaultValue="df" onOpenChange={(open) => { if (!open) setQuery('') }}>
            <SelectTrigger className={`group relative border-[#b8ddf8] hover:border-[var(--rock-blue)] rounded-full h-8 text-[0.75rem] gap-0.5 px-2
                    text-[var(--chathams-blue)] outline-none focus:ring-0
                    focus:outline-none focus:ring-offset-0 shadow-sm pointer-events-auto
                    w-full max-w-full overflow-hidden [&>span]:truncate [&>span]:pr-4
                    ${classes || ''}`}
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
                        <X className="size-4 text-[var(--regent-gray)]" />
                    </div>
                }


            </SelectTrigger>
            <SelectContent className="z-[9999] rounded-xl border border-[#dbeeff] shadow-md text-[0.75rem] text-[var(--chathams-blue)] min-w-[var(--radix-select-trigger-width)] max-h-72 overflow-auto">
                {searchable && (
                    <div className="sticky top-0 z-10 bg-white p-1.5 border-b border-[#eef5fc]">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="Search…"
                            className="w-full h-7 px-2 rounded-lg border border-[#d8e8f5] bg-[#f8fbff] text-[0.72rem] text-[var(--chathams-blue)] focus:outline-none focus:border-[var(--endeavour)]"
                        />
                    </div>
                )}
                <SelectGroup>
                    {/* Blank-id options are dropped in `base`: Radix mounts <SelectItem> even while
                        the menu is closed and throws on an empty-string value (white-screens). */}
                    {sortArr(shown, secondaryName || name).map(k => {
                        return (
                            <SelectItem key={k.id} value={k.id}
                                className={cn('text-[0.75rem] rounded-xl', (k.id === 'EditTextDelTime' || k.id === 'allStocks' || k.id === 'EditTextRmrks' || k.id === 'EditTextTermPmnt') ?
                                    'font-semibold italic text-purple-900' : 'text-[var(--chathams-blue)]')} >
                                {secondaryName ? k[secondaryName] : k[name]}
                            </SelectItem>
                        )
                    })}
                    {searchable && shown.length === 0 && (
                        <div className="px-3 py-2 text-[0.7rem] text-[var(--regent-gray)]">No matches</div>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
