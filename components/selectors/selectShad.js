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
import { useEffect, useRef, useState } from "react"
import { BtnIcon } from "@components/buttonIcons"
import { matchesAllWords } from '@utils/search';


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
/* hint: optional (item) => { note, text, tone } rendered as a muted suffix on each
   OPTION only — never on the closed trigger, so the cell stays clean once a choice is
   made. `note` identifies the option (always muted), `text` is the figure and tone
   'danger' colours it as a warning. First use: the sales-invoice material dropdown,
   which names the PO each line belongs to — two POs can carry the same material name —
   and the stock behind it, so a line with nothing behind it is obvious at the moment of
   choosing rather than weeks later in cashflow. */
/* onCreate: optional (typedText) => void. When the search text matches no option
   exactly, the list offers "<createLabel> “text”" at the top, and Enter on an empty
   result does the same. For lists the user grows while using them — a grade that does
   not exist yet is typed straight into the dropdown instead of a detour to Settings.
   The open state is held here so the list can close itself after creating. */
/* clearLabel: optional. With `clear`, a set value can also be emptied from INSIDE the
   open list — "<clearLabel>" at its top — not only by the × on the closed trigger, which
   shows on hover alone and so is easy to never find. First use: the PO line's Grade
   ("No grade"), where a mistaken pick had no visible way back. */
export function Selector({ arr, value, onChange, name, clear, disabled, secondaryName, classes, row,
    sizeVar, hint, onCreate, createLabel = 'Create', clearLabel }) {

    // Type-to-filter for long lists (client request: every list gets a search box).
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const searchRef = useRef(null)

    const clearSelection = (e) => {
        e.stopPropagation()
        e.preventDefault()
        clear(name, row)
    }

    const base = arr.filter(x => !x.deleted && x.id !== '' && x.id != null)
    const labelOf = (k) => String((secondaryName ? k[secondaryName] : k[name]) ?? '')
    /* Was > 7, which is roughly "only once the panel scrolls". But the cost of
       hunting starts well before the list overflows — the Materials Breakdown has
       a Stock column filled row after row, and five names still means reading five
       names every time. Five is the line: below that the box is more chrome than
       help. A creatable list always searches: typing is how a new entry is made. */
    const searchable = base.length > 4 || !!onCreate
    const shown = query ? base.filter(k => matchesAllWords(labelOf(k), query)) : base
    /* The option currently SELECTED is never unmounted by the filter, only hidden.
       Radix keys its "focus the selected item" effect on that item's mount state: the
       moment a keystroke filtered it out, the effect re-ran and moved the caret from
       the search box to the list — the second character typed then went to Radix's
       own first-letter typeahead instead. Keeping it mounted also keeps the trigger's
       label, which is portalled out of that very item. */
    const selectedId = value?.[name]
    const parked = query && selectedId != null && selectedId !== '' && !shown.some(k => k.id === selectedId)
        ? base.find(k => k.id === selectedId) : null
    // Same keyed array whether shown or parked: a move to a different sibling slot
    // would still be an unmount and a remount to React, and to Radix.
    const listed = sortArr(parked ? [...shown, parked] : shown, secondaryName || name)

    const typed = query.trim()
    const canCreate = !!onCreate && typed !== '' &&
        !base.some(k => labelOf(k).trim().toLowerCase() === typed.toLowerCase())
    const create = () => {
        setOpen(false)
        setQuery('')
        onCreate(typed)
    }
    const canClearInList = !!clear && !!clearLabel && selectedId != null && selectedId !== '' && typed === ''
    const clearFromList = () => {
        setOpen(false)
        setQuery('')
        clear(name, row)
    }
    // Enter in the box with something typed takes the first match — type, Enter, done.
    const pickFirst = () => {
        const first = sortArr(shown, secondaryName || name)[0]
        if (!first) return
        setOpen(false)
        setQuery('')
        onChange(first.id)
    }

    /* Put the caret in the search box the moment the menu opens, so the list is
       filtered by typing rather than by scrolling. Without this the box was there but
       unfocused: open, aim at it, click, and only then type — "scroll the whole list"
       by another route.

       It is an effect rather than an onOpenAutoFocus prop because Radix Select has no
       such prop (Popover and Dialog do): it swallows mount autofocus itself, then
       focuses the selected item in its own effect once the panel is positioned. So we
       wait for THAT focus to land inside the list and only then move it to the box —
       claiming it a frame earlier just gets overwritten. A few frames of polling
       cover the positioning delay; if the list never focuses (nothing to focus), the
       box is taken once it is in the document. */
    useEffect(() => {
        if (!open || !searchable) return
        let tries = 0, raf = 0
        const claim = () => {
            const box = searchRef.current
            if (box && box.isConnected) {
                const list = box.closest('[role="listbox"]')
                const active = document.activeElement
                if (active === box) return
                if ((list && list.contains(active)) || tries >= 6) { box.focus(); return }
            }
            if (++tries < 30) raf = requestAnimationFrame(claim)
        }
        raf = requestAnimationFrame(claim)
        return () => cancelAnimationFrame(raf)
    }, [open, searchable])

    return (
        <Select value={value[name]} onValueChange={onChange}
            defaultValue="df" open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery('') }}>
            {/* Only what this wrapper actually needs: the layout, the truncation, and
                the room on the right for the clear button. Everything else — radius,
                border, text colour, focus ring — comes from ui/select.tsx, which is
                already on the design system.

                This used to restate all of it in pre-redesign values (rounded-full,
                --border-divider, --rock-blue, --chathams-blue, shadow-sm, and a
                focus:ring-0 that removed the focus ring outright), and tailwind-merge
                let every one of them beat the base. That is why the ~85 dropdowns
                built on this wrapper stayed pills with a drop shadow while the
                handful using SelectTrigger directly, and every .input beside them,
                were 10px rectangles with a brand focus border.

                h-8 stays: the base trigger is h-7 (24px) but .input is h-8 (28px), and
                a select has to match the field next to it, not the other way round. */}
            <SelectTrigger style={sizeVar ? { fontSize: sizeVar } : undefined}
                className={`group relative h-8 gap-0.5 px-2 pointer-events-auto
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
                className="z-dropdown responsiveTextInput min-w-[var(--radix-select-trigger-width)] max-h-72 overflow-auto">
                {/* -top-1 is the list viewport's own p-1: stuck at top-0 the header stopped
                    4px short of the edge, and options scrolling by showed through that strip
                    above the search box whenever the list opened scrolled. */}
                {(searchable || canClearInList) && (
                    <div className="sticky -top-1 z-sticky bg-[var(--surface-card)] p-1.5 border-b border-[var(--selago)]">
                        {searchable && <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            /* Character keys are swallowed so Radix's own first-letter
                               typeahead doesn't fight what is being typed here — but the
                               navigation keys have to reach it, or the only way out of
                               the box is the mouse. Type, ArrowDown, Enter. */
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && typed !== '') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if (shown.length > 0) pickFirst()
                                    else if (canCreate) create()
                                    return
                                }
                                if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(e.key)) e.stopPropagation()
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            placeholder={onCreate ? 'Search or type a new name…' : 'Search…'}
                            className="w-full h-7 px-2 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-subtle)] responsiveTextInput text-[var(--chathams-blue)] focus:outline-none focus:border-[var(--endeavour)]"
                        />}
                        {/* Pinned with the search box, not first in the list: the list opens
                            scrolled to the selected option, and on a long list the top of
                            it — where this used to sit — was scrolled out of sight. */}
                        {canClearInList && (
                            <button type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={clearFromList}
                                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] focus:bg-[var(--bg-subtle)] outline-none${searchable ? ' mt-1' : ''}`}
                                style={{ fontSize: 'inherit' }}>
                                <BtnIcon action="close" />
                                <span className="truncate">{clearLabel}</span>
                            </button>
                        )}
                    </div>
                )}
                {canCreate && (
                    <button type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={create}
                        className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left font-medium text-[var(--brand-strong)] hover:bg-[var(--bg-subtle)] focus:bg-[var(--bg-subtle)] outline-none"
                        style={{ fontSize: 'inherit' }}>
                        <BtnIcon action="add" />
                        <span className="truncate">{createLabel} “{typed}”</span>
                    </button>
                )}
                <SelectGroup>
                    {/* Blank-id options are dropped in `base`: Radix mounts <SelectItem> even while
                        the menu is closed and throws on an empty-string value (white-screens). */}
                    {listed.map(k => {
                        return (
                            <SelectItem key={k.id} value={k.id}
                                /* Inherit the panel's rung so one sizeVar governs trigger,
                                   search box and options together. It has to be inline:
                                   ui/select.tsx hardcodes responsiveTextInput on the item,
                                   and that class would otherwise win over the panel. */
                                style={{ fontSize: 'inherit', display: k === parked ? 'none' : undefined }}
                                aria-hidden={k === parked || undefined}
                                /* The EditText and allStocks ids are actions, not values, so
                                   they stay marked out — but in the brand token, not
                                   Tailwind's purple-900, which was the one raw colour left in
                                   here and the one thing in the menu that never followed the
                                   theme. Plain options take their colour from the panel. */
                                className={cn((k.id === 'EditTextDelTime' || k.id === 'allStocks' || k.id === 'EditTextRmrks' || k.id === 'EditTextTermPmnt') &&
                                    'font-semibold italic text-[var(--brand-strong)]')}
                                /* The hint goes in `suffix`, outside ItemText, so it stays in
                                   the list and never reaches the closed cell (ui/select.tsx). */
                                suffix={(() => {
                                    const h = hint ? hint(k) : null;
                                    if (!h?.text && !h?.note) return null;
                                    return (
                                        <>
                                            {/* `note` says WHICH record the option is (the PO a material
                                                line belongs to); it stays muted whatever the tone, because
                                                only the figure after it can be a warning. */}
                                            {h.note && (
                                                <span className="ml-2 whitespace-nowrap text-[var(--ink-muted)]">{h.note}</span>
                                            )}
                                            {h.text && (
                                                <span className={cn('ml-2 whitespace-nowrap tabular-nums',
                                                    h.tone === 'danger' ? 'text-[var(--danger-text)]' : 'text-[var(--ink-muted)]')}>
                                                    {h.text}
                                                </span>
                                            )}
                                        </>
                                    );
                                })()} >
                                {secondaryName ? k[secondaryName] : k[name]}
                            </SelectItem>
                        )
                    })}
                    {searchable && shown.length === 0 && !canCreate && (
                        <div className="px-3 py-2 responsiveTextInput text-[var(--regent-gray)]">No matches</div>
                    )}
                </SelectGroup>
            </SelectContent>
        </Select>
    )
}
