import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-field text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-state-info/28 dark:focus-visible:ring-slate-300",
  {
    variants: {
      // Botão primário/secundário/destrutivo conforme manual de
      // identidade visual seção 7 — uma ação primária por contexto.
      variant: {
        default:
          "bg-brand-navy text-white hover:bg-brand-navy/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90",
        outline:
          "border border-brand-navy bg-white text-brand-navy hover:bg-state-info-soft dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-800",
        ghost: "text-brand-graphite hover:bg-state-neutral-soft dark:text-slate-300 dark:hover:bg-slate-800",
        destructive: "bg-state-danger text-white hover:bg-state-danger/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-field px-3",
        lg: "h-11 rounded-field px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
