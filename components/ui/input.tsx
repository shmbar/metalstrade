import * as React from "react"

import { cn } from "@lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          /* Matched to the .input spec (TOKENS.md §4): h-7 not h-9, pill not
             a pill not a small radius, ladder type not a fixed size, themed surface not
             bg-transparent. It previously sat 8px taller than every other input
             in the app. */
          "flex h-7 w-full rounded-lg border border-[var(--border-cell)] bg-[var(--surface-pill)] px-3 shadow-sm transition-colors " +
          "responsiveText text-[var(--port-gore)] " +
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
