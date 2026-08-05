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


/* sizeVar: the rung the trigger renders at, as a --fs-* variable. Undefined keeps
   whatever ui/select.tsx sets, which is the form rung and is right for the ~85
   call sites inside modals and forms. It is wrong in a page toolbar, where the
   trigger sits beside .whiteButton pills at the caption rung — there it rendered
   13px against their 10px.

   It is a VARIABLE applied inline rather than a class, because a class cannot win
   here: ui/select.tsx hardcodes responsiveTextInput inside its own cn(), and
   tailwind-merge does not dedupe two custom classes, so both land on the element
   and the one declared later in globals.css takes it. The --fs-* vars exist for
   exactly this — inline sizes that still ride the shared ladder. */
export function Selector({ arr, value, onChange, name, clear, disabled, secondaryName, classes, row,
    sizeVar }) {

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
            <SelectTrigger style={sizeVar ? { fontSize: sizeVar } : undefined}
                className={`group relative border-[var(--border-divider)] hover:border-[var(--rock-blue)] rounded-full h-8 gap-0.5 px-2
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
                        className="absolute right-6 top-1/2 -translate-y-1/2 z-sticky opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="size-4 text-[var(--regent-gray)]" />
                    </div>
                }


            </SelectTrigger>
            <SelectContent style={sizeVar ? { fontSize: sizeVar } : undefined}
                className="z-dropdown rounded-2xl border border-[var(--surface-header)] shadow-md responsiveTextInput text-[var(--chathams-blue)] min-w-[var(--radix-select-trigger-width)] max-h-72 overflow-auto">
                {searchable && (
                    <div className="sticky top-0 z-sticky bg-[var(--surface-card)] p-1.5 border-b border-[var(--selago)]">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder="Search…"
                            /* rounded-full, not rounded-lg: every other search field in the
                               app is a pill, so a 12px radius here read as a rectangle. */
                            className="w-full h-7 px-3 rounded-full border border-[var(--border-cell)] bg-[var(--surface-pill)] text-[var(--chathams-blue)] focus:outline-none focus:border-[var(--endeavour)]"
                        />
                    </div>
                )}
                <SelectGroup>
                    {/* Blank-id options are dropped in `base`: Radix mounts <SelectItem> even while
                        the menu is closed and throws on an empty-string value (white-screens). */}
                    {sortArr(shown, secondaryName || name).map(k => {
                        return (
                            <SelectItem key={k.id} value={k.id}
                                /* Inherit the panel's rung so one sizeVar governs trigger,
                                   search box and options together. It has to be inline:
                                   ui/select.tsx hardcodes responsiveTextInput on the item,
                                   and that class would otherwise win over the panel. */
                                style={{ fontSize: 'inherit' }}
                                className={cn('rounded-2xl', (k.id === 'EditTextDelTime' || k.id === 'allStocks' || k.id === 'EditTextRmrks' || k.id === 'EditTextTermPmnt') ?
                                    'font-semibold italic text-purple-900' : 'text-[var(--chathams-blue)]')} >
                                {secondaryName ? k[secondaryName] : k[name]}
                            </SelectItem>
                        )
                    })}
                    {searchable && shown.length === 0 && (
                        <div className="px-3 py-2 responsiveText text-[var(--regent-gray)]">No matches</div>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
