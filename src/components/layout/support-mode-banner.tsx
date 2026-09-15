"use client";

import { useTransition } from "react";

import { exitSupportMode } from "@/app/(app)/master/organizacoes/actions";
import { Button } from "@/components/ui/button";

/**
 * Faixa persistente durante o "modo de suporte" (Multi-tenant, Etapa 2,
 * spec original seção 6.3) — o master está vendo as telas normais como
 * se fosse a organização abaixo, sem ser membro dela de verdade.
 */
export function SupportModeBanner({
  organizationName,
  documentNumberFormatted,
}: {
  organizationName: string;
  documentNumberFormatted: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-state-warning-soft px-4 py-2 text-sm text-brand-navy dark:bg-amber-950 dark:text-amber-100">
      <span>
        Você está administrando: <strong>{organizationName}</strong>
        {documentNumberFormatted && <> — CNPJ {documentNumberFormatted}</>}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => startTransition(() => exitSupportMode())}
      >
        {isPending ? "Saindo..." : "Voltar ao painel master"}
      </Button>
    </div>
  );
}
