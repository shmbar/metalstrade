import * as React from "react"

import { cn } from "@lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* Matched to the .input spec (TOKENS.md §4): h-7 not h-9, pill not
             rounded-md, ladder type not text-base / text-sm, themed surface not
             bg-transparent. It previously sat 8px taller than every other input
             in the app. */
          "flex h-7 w-full rounded-full border border-[var(--border-cell)] bg-[var(--surface-pill)] px-3 shadow-sm transition-colors " +
          "text-[0.6875rem] xl:text-[0.75rem] 2xl:text-[0.8125rem] 3xl:text-[0.875rem] text-[var(--port-gore)] " +
          "file:border-0 file:bg-transparent file:font-medium file:text-[var(--chathams-blue)] placeholder:text-[var(--regent-gray)] " +
          "focus-visible:outline-none focus-visible:border-[var(--endeavour)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
