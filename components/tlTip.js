import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../components/ui/tooltip"

/* `interactive` is the opt-in for the handful of tooltips whose body you are meant
   to click — the stocks totals panel, which expands its PO groups in place. Every
   other tooltip is a label: it must not become the hit target for whatever it
   happens to be covering, and it must disappear the instant the pointer leaves the
   trigger rather than staying alive because the pointer wandered onto it. */
const Tltip = ({ children, direction, tltpText, show, interactive = false }) => {
    const isString = typeof tltpText === 'string' || typeof tltpText === 'number'
    /* Radix's popper wrapper carries min-width: max-content, which beats the content's
       max-w — a sentence-length tooltip rendered as one 800px+ line off the side of the
       screen. Giving the inner span an explicit width makes max-content resolve TO that
       width, so the text wraps. Short labels keep hugging their content. */
    const longText = isString && String(tltpText).length > 60
    // For plain text tooltips we'll keep the colored background.
    // For complex JSX tooltips (tables/lists) remove outer padding so internal markup controls spacing.
    const base = isString
        ? `bg-[var(--tooltip-bg)] rounded-lg ${show == null || show ? 'flex' : 'hidden'}`
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
