import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "./page-header";

/**
 * Módulo ainda não implementado nesta fase. Usado pelas rotas de
 * navegação criadas na Fase 1A que serão desenvolvidas nas fases
 * seguintes (Pessoas, Aprovações, Ponto, Operações, Financeiro,
 * Despesas, Auditoria, Relatórios, Configurações).
 */
export function PlaceholderModule({
  title,
  description,
  plannedPhase,
}: {
  title: string;
  description: string;
  plannedPhase: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Construction
            className="h-8 w-8 text-slate-400 dark:text-slate-600"
            aria-hidden="true"
          />
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            Este módulo será implementado em uma fase seguinte do projeto (
            {plannedPhase}). A navegação já está disponível para que a estrutura
            do sistema evolua de forma incremental.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
