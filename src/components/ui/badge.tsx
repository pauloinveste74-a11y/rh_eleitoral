import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      // Paleta funcional do manual de identidade visual, seção 4: fundo
      // suave + texto sólido na cor de estado (nunca só um ponto colorido).
      variant: {
        default: "border-transparent bg-brand-navy text-white dark:bg-slate-50 dark:text-slate-900",
        secondary: "border-transparent bg-state-neutral-soft text-state-neutral dark:bg-slate-800 dark:text-slate-50",
        info: "border-transparent bg-state-info-soft text-state-info dark:bg-sky-950 dark:text-sky-200",
        success: "border-transparent bg-state-success-soft text-state-success dark:bg-emerald-900 dark:text-emerald-200",
        warning: "border-transparent bg-state-warning-soft text-state-warning dark:bg-amber-900 dark:text-amber-200",
        destructive: "border-transparent bg-state-danger-soft text-state-danger dark:bg-red-900 dark:text-red-200",
        outline: "text-brand-navy dark:text-slate-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
