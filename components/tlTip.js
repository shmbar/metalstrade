import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

const Tltip = ({ children, direction, tltpText, show }) => {
    return (
        <TooltipProvider delayDuration='0' >
            <Tooltip >
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent className={`bg-slate-500 ${show == null || show ? 'flex' : 'hidden'}`} 
                side={direction} >
                    <span className="text-white text-xs capitalize font-normal">{tltpText}</span>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export default Tltip