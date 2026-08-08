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
 * Controls sit on the shared 28 / 32 / 36px band and match .input, so a button
 * and the field beside it always line up. Type ramps with the ladder instead of
 * sitting at the rogue 0.72rem it used before. Corners are --radius-control
 * (10px) — the redesign has no pill-shaped buttons.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors " +
  "responsiveTextTableTitle " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-soft)] focus-visible:border-[var(--brand)] " +
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)] shadow-card",
        destructive:
          "bg-[var(--bad-text)] text-[var(--on-brand)] hover:opacity-90 shadow-card",
        outline:
          "border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--ink)] hover:bg-[var(--bg-subtle)] shadow-card",
        secondary:
          "bg-[var(--bg-subtle)] text-[var(--ink)] hover:bg-[var(--bg-sunken)]",
        ghost:
          "border border-transparent text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--ink)]",
        link:
          "text-[var(--brand)] underline-offset-4 hover:underline",
        /* Kept for source compatibility — these were only defined in the
           duplicate button.tsx. They are aliases of default/outline. */
        customBlue:
          "bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)] shadow-card px-2",
        customWhite:
          "border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--brand)] hover:bg-[var(--bg-subtle)] shadow-card px-2",
      },
      size: {
        sm: "h-7 px-2.5",
        default: "h-8 px-3",
        lg: "h-9 px-4",
        icon: "h-8 w-8 px-0",
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
