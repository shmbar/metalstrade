import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@lib/utils"

/* Design-audit note (design-audit/TOKENS.md §1.5, §4):
 *
 * Every `dark:` variant was removed from this file on purpose. This app does NOT
 * theme with Tailwind's `dark:` variants — it swaps CSS-variable *values* on
 * <html> (utils/themes.js -> applyTheme). The `dark:` classes that used to live
 * here were actively harmful: `dark:bg-slate-50 dark:text-slate-900` resolved to
 * a DARK background (slate-50 is remapped to --surface-base in tailwind.config)
 * with NEAR-BLACK text (slate-900 is NOT remapped), i.e. invisible button labels
 * in dark mode across 16 files.
 *
 * Sizes are the three from the spec (24 / 28 / 32px) and match .input, so a
 * button and the field beside it always line up. Type ramps with the ladder
 * instead of sitting at the rogue 0.72rem it used before.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors " +
  "text-[0.5625rem] xl:text-[0.625rem] 2xl:text-[0.6875rem] 3xl:text-[0.75rem] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--endeavour)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-card)] " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--endeavour)] text-white hover:opacity-90 shadow-md",
        destructive:
          "bg-[var(--danger-text)] text-white hover:opacity-90 shadow-md",
        outline:
          "border border-[var(--border-divider)] bg-[var(--surface-card)] text-[var(--endeavour)] hover:bg-[var(--selago)] shadow-sm",
        secondary:
          "bg-[var(--surface-header)] text-[var(--chathams-blue)] hover:bg-[var(--selago)] shadow-sm",
        ghost:
          "text-[var(--chathams-blue)] hover:bg-[var(--surface-header)]",
        link:
          "text-[var(--endeavour)] underline-offset-4 hover:underline",
        /* Kept for source compatibility — these were only defined in the
           duplicate button.tsx. They are aliases of default/outline. */
        customBlue:
          "bg-[var(--endeavour)] text-white hover:opacity-90 shadow-md px-2",
        customWhite:
          "border border-[var(--border-divider)] bg-[var(--surface-card)] text-[var(--endeavour)] hover:bg-[var(--selago)] shadow-sm px-2",
      },
      size: {
        sm: "h-6 px-2.5",
        default: "h-7 px-3",
        lg: "h-8 px-4",
        icon: "h-7 w-7 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
