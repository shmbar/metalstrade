import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../components/ui/tooltip"

const Tltip = ({ children, direction, tltpText, show }) => {
    const isString = typeof tltpText === 'string' || typeof tltpText === 'number'
    // For plain text tooltips we'll keep the colored background.
    // For complex JSX tooltips (tables/lists) remove outer padding so internal markup controls spacing.
    const contentClass = isString
        ? `bg-[var(--endeavour)] rounded-full ${show == null || show ? 'flex' : 'hidden'}`
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
                        <span className="text-white text-xs capitalize font-normal">{tltpText}</span>
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
