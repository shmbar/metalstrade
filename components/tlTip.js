import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../components/ui/tooltip"

const Tltip = ({ children, direction, tltpText, show }) => {
    const isString = typeof tltpText === 'string' || typeof tltpText === 'number'
    /* Radix's popper wrapper carries min-width: max-content, which beats the content's
       max-w — a sentence-length tooltip rendered as one 800px+ line off the side of the
       screen. Giving the inner span an explicit width makes max-content resolve TO that
       width, so the text wraps. Short labels keep hugging their content. */
    const longText = isString && String(tltpText).length > 60
    // For plain text tooltips we'll keep the colored background.
    // For complex JSX tooltips (tables/lists) remove outer padding so internal markup controls spacing.
    const contentClass = isString
        ? `bg-[var(--tooltip-bg)] rounded-lg ${show == null || show ? 'flex' : 'hidden'}`
        : (show == null || show ? 'p-0 rounded-2xl overflow-hidden' : 'hidden')
    return (
        <TooltipProvider delayDuration='0' >
            <Tooltip >
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent className={contentClass} 
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
