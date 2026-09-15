import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Circle,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
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

// Ícone padrão por variante — seção 13 do manual ("status tem rótulo,
// ícone e cor acessível... nunca apenas ponto colorido"). Nomeado 1:1
// com as 5 categorias da paleta funcional (seção 4): Informação, Sucesso,
// Atenção, Erro, Neutro. Como toda tela já reduz seu status pra uma
// dessas variantes de Badge, ganhar o ícone aqui cobre o sistema inteiro
// de uma vez, sem precisar mapear cada string de status individualmente.
const DEFAULT_VARIANT_ICON: Partial<Record<string, LucideIcon>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertCircle,
  destructive: XCircle,
  secondary: Circle,
};

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Passe `false` pra suprimir o ícone padrão (ex.: badge muito compacto). */
  showIcon?: boolean;
  /** Troca o ícone padrão da variante por um específico. */
  icon?: LucideIcon;
}

function Badge({
  className,
  variant,
  showIcon = true,
  icon,
  children,
  ...props
}: BadgeProps) {
  const Icon = icon ?? (showIcon ? DEFAULT_VARIANT_ICON[variant ?? "default"] : undefined);
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
