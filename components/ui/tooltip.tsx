"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "../../lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 8, collisionPadding = 8, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={collisionPadding}
      /* Radix wraps this content in its own popper div, and THAT div is what a
         click lands on — making the content alone transparent is not enough.
         globals.css reads this marker off the child to switch the wrapper's
         pointer events off too. Interactive tooltips pass data-tooltip through
         as something other than "label" and keep the wrapper live. */
      data-tooltip="label"
      className={cn(
        /* pointer-events-none is the default on purpose. A tooltip is wider and
           taller than the control it describes, so it routinely lands on the
           neighbouring control — the row above in a wrapped button group, the
           next cell in a table. With pointer events on, THAT is what the click
           hits instead of the button underneath: the "popups block the buttons"
           report. Off, the tooltip is purely visual and vanishes the moment the
           pointer leaves its trigger. The rare tooltip whose body is genuinely
           clickable passes pointer-events-auto back in via className. */
        "pointer-events-none z-tooltip overflow-hidden max-w-[28rem] w-auto min-w-0 max-h-[60vh] rounded-lg border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)] px-3 py-1.5 responsiveTextTable text-[var(--tooltip-ink)] shadow-pop animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
