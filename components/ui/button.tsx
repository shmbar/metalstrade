import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control responsiveTextInput font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--brand-soft)] focus-visible:border-[var(--brand)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
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
        link: "text-[var(--brand)] underline-offset-4 hover:underline",
        // Legacy variant names — mapped onto the new system (retire in Phase 3)
        customBlue:
          "bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)] shadow-card",
        customWhite:
          "border border-[var(--line-strong)] bg-[var(--bg-card)] text-[var(--brand)] hover:bg-[var(--bg-subtle)] shadow-card",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2.5",
        lg: "h-9 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
