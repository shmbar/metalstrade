import { Slot } from "@radix-ui/react-slot"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../components/ui/tooltip"

/* What `first-letter:uppercase` did to a plain-text tooltip: the first letter up-cased when
   it is the first thing after any spaces and punctuation — a tooltip opening with a digit
   is left as written. */
const capFirst = (s) => s.replace(/^([\s\p{P}]*)(\p{L})/u, (m, lead, ch) => lead + ch.toUpperCase())

/* `interactive` is the opt-in for the handful of tooltips whose body you are meant
   to click — the stocks totals panel, which expands its PO groups in place. Every
   other tooltip is a label: it must not become the hit target for whatever it
   happens to be covering, and it must disappear the instant the pointer leaves the
   trigger rather than staying alive because the pointer wandered onto it. */
const Tltip = ({ children, direction, tltpText, show, interactive = false }) => {
    const isString = typeof tltpText === 'string' || typeof tltpText === 'number'

    /* Plain text: drawn by the app's one instant tooltip engine (components/GlobalTooltip.js),
       not a Radix tooltip per trigger. Radix waited for a React render to open, and on the
       busy screens that was 140–440ms (Stocks) and ~160ms (the contract window); the engine
       is on the next frame. The child only carries the text and the side — Slot puts them on
       it the way TooltipTrigger asChild put Radix's handlers there — and the engine keeps
       what Radix did: side + flip, keyboard focus, Escape, aria-describedby. */
    if (isString && !interactive) {
        const text = capFirst(String(tltpText))
        const on = (show == null || show) && text.trim() !== ''
        return (
            <Slot {...(on ? {
                'data-tip': text,
                'data-tip-side': direction || 'top',
                // A sentence-length tooltip was a fixed 26rem wide (see below); kept.
                ...(text.length > 60 ? { 'data-tip-wide': '' } : {}),
            } : {})}>
                {children}
            </Slot>
        )
    }

    /* Rich bodies (tables, lists, a copy button) and interactive ones stay on Radix: they are
       React content, and some are clicked. Radix's popper wrapper carries min-width:
       max-content, which beats the content's max-w — a sentence-length tooltip rendered as
       one 800px+ line off the side of the screen. Giving the inner span an explicit width
       makes max-content resolve TO that width, so the text wraps. */
    const longText = isString && String(tltpText).length > 60
    // Plain text takes the pill as it is (.tooltip-pill, via ui/tooltip.tsx). Complex JSX
    // tooltips (tables/lists) drop its padding so their own markup controls spacing.
    const base = isString
        ? `${show == null || show ? 'flex' : 'hidden'}`
        : (show == null || show ? 'p-0 rounded-2xl overflow-hidden' : 'hidden')
    const contentClass = `${base} ${interactive ? 'pointer-events-auto' : 'pointer-events-none'}`
    return (
        <TooltipProvider delayDuration={0} disableHoverableContent={!interactive} >
            <Tooltip >
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent className={contentClass}
                data-tooltip={interactive ? 'interactive' : 'label'}
                side={direction} >
                    {isString ? (
                        <span className={`text-[var(--tooltip-ink)] responsiveTextTable first-letter:uppercase font-normal ${longText ? 'block w-[26rem] max-w-[80vw] whitespace-normal leading-snug' : ''}`}>{tltpText}</span>
                    ) : (
                        // allow JSX/tooltip content (tables, lists) to render unwrapped
                        tltpText
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export default Tltip
