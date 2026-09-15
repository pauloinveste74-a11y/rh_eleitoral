"use client";

import { useState, useTransition } from "react";

import { checkWithAi, resolveConflict } from "@/app/(app)/divergencias/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ConflictDetails {
  cpf?: string;
  nome_importado?: string;
  nome_existente?: string;
  verificacao_ia?: {
    verdict: "confere" | "diverge" | "inconclusivo";
    extracted_name: string | null;
    extracted_cpf: string | null;
    explanation: string;
  };
  [key: string]: unknown;
}

const AI_VERDICT_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  confere: "success",
  diverge: "warning",
  inconclusivo: "secondary",
};

const SEVERITY_LABEL: Record<string, string> = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

const SEVERITY_VARIANT: Record<string, "destructive" | "warning" | "info" | "secondary"> = {
  critico: "destructive",
  alto: "warning",
  medio: "info",
  baixo: "secondary",
};

export function ConflictCard({
  conflict,
  typeLabel,
  person,
  hasIdentityDocument,
  currentUserId,
}: {
  conflict: {
    id: string;
    conflict_type: string;
    details: unknown;
    due_at: string | null;
    created_at: string;
    severity: string;
    requires_dual_approval: boolean;
    first_approved_by: string | null;
  };
  typeLabel: string;
  person?: { full_name: string; cpf: string };
  hasIdentityDocument: boolean;
  currentUserId: string | null;
}) {
  const details = (conflict.details ?? {}) as ConflictDetails;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState(details.verificacao_ia ?? null);

  function handleCheckWithAi() {
    setError(null);
    startTransition(async () => {
      const result = await checkWithAi(conflict.id);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível verificar com IA.");
      } else {
        setAiResult({
          verdict: result.aiVerdict!,
          extracted_name: result.aiExtractedName ?? null,
          extracted_cpf: result.aiExtractedCpf ?? null,
          explanation: result.aiExplanation ?? "",
        });
      }
    });
  }

  function handleResolve(resolution: string, applyCorrection: boolean, correctedName: string | null) {
    const confirmMessage =
      resolution === "descartado"
        ? "Descartar esta divergência sem alterar nada?"
        : applyCorrection
          ? `Atualizar o nome cadastrado para "${correctedName}"?`
          : "Manter o dado atual, sem alterar nada?";
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await resolveConflict(conflict.id, resolution, "", applyCorrection, correctedName);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível resolver a divergência.");
      }
    });
  }

  const alreadyApprovedByMe =
    conflict.requires_dual_approval &&
    !!conflict.first_approved_by &&
    !!currentUserId &&
    conflict.first_approved_by === currentUserId;
  const pendingSecondApproval = conflict.requires_dual_approval && !!conflict.first_approved_by;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={SEVERITY_VARIANT[conflict.severity] ?? "secondary"} showIcon={false}>
              {SEVERITY_LABEL[conflict.severity] ?? conflict.severity}
            </Badge>
            <Badge variant="warning">{typeLabel}</Badge>
          </div>
          {conflict.due_at && (
            <span className="text-xs text-brand-graphite dark:text-slate-400">
              Prazo: {new Date(conflict.due_at).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {person && (
          <p className="text-sm font-medium text-brand-navy dark:text-slate-50">{person.full_name}</p>
        )}

        {conflict.conflict_type === "dado_divergente" && (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <div className="text-brand-graphite dark:text-slate-400">Nome já cadastrado</div>
              <div className="font-medium">{details.nome_existente ?? "—"}</div>
            </div>
            <div>
              <div className="text-brand-graphite dark:text-slate-400">Nome importado agora</div>
              <div className="font-medium">{details.nome_importado ?? "—"}</div>
            </div>
            {details.cpf && (
              <div className="sm:col-span-2">
                <span className="text-brand-graphite dark:text-slate-400">CPF: </span>
                <span className="font-medium">{details.cpf}</span>
              </div>
            )}
          </div>
        )}

        {aiResult && (
          <div className="flex flex-col gap-1 rounded-md border border-border-default p-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Verificação por IA:</span>
              <Badge variant={AI_VERDICT_VARIANT[aiResult.verdict] ?? "secondary"} showIcon={false}>
                {aiResult.verdict}
              </Badge>
            </div>
            {aiResult.extracted_name && (
              <p className="text-sm">
                Nome no documento: <strong>{aiResult.extracted_name}</strong>
              </p>
            )}
            {aiResult.extracted_cpf && (
              <p className="text-sm">
                CPF no documento: <strong>{aiResult.extracted_cpf}</strong>
              </p>
            )}
            <p className="text-xs text-brand-graphite dark:text-slate-400">{aiResult.explanation}</p>
          </div>
        )}

        {pendingSecondApproval && (
          <p className="rounded-md border border-border-default bg-state-info-soft p-3 text-sm text-state-info dark:border-slate-800 dark:bg-sky-950 dark:text-sky-200">
            {alreadyApprovedByMe
              ? "Você já deu a 1ª aprovação — precisa de outra pessoa pra confirmar e aplicar."
              : "1ª aprovação já registrada por outra pessoa — sua confirmação aplica e fecha a divergência."}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {hasIdentityDocument && !aiResult && (
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleCheckWithAi}>
              {isPending ? "Verificando..." : "Verificar com IA"}
            </Button>
          )}
          {conflict.conflict_type === "dado_divergente" && !alreadyApprovedByMe && (
            <>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => handleResolve("aceitar_novo", true, details.nome_importado ?? null)}
              >
                Aceitar nome importado
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleResolve("manter_existente", false, null)}
              >
                Manter cadastrado
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => handleResolve("descartado", false, null)}
          >
            Descartar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
