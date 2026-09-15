"use client";

import { startTransition, useActionState } from "react";

import { initialValidationActionState } from "@/app/(app)/validacoes/action-state";
import type { ValidationActionState } from "@/app/(app)/validacoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CORRECTION_FIELDS } from "@/lib/validations/correction-fields";

/**
 * Formulário de decisão genérico — usado tanto pela fila do gestor
 * (decide_registration_submission, "Aprovar") quanto pela fila do RH
 * (decide_rh_validation, "Validar"). `action` já vem vinculada ao id da
 * submissão pelo chamador (`.bind(null, submissionId)`), mesmo padrão de
 * ApprovalDecisionForm (/aprovacoes).
 *
 * Etapa 11: o checklist de campos (`fieldNames`, sempre presente no
 * formulário, sem condicionar à visibilidade de "Solicitar correção") só
 * importa quando essa é a decisão escolhida — a Server Action ignora
 * `fieldNames` nas outras duas.
 */
export function ValidationDecisionForm({
  action,
  primaryLabel = "Aprovar",
  primaryValue = "aprovar",
}: {
  action: (
    prevState: ValidationActionState,
    formData: FormData,
  ) => Promise<ValidationActionState>;
  primaryLabel?: string;
  primaryValue?: string;
}) {
  const [state, dispatch, isPending] = useActionState(
    action,
    initialValidationActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // FormData(form) não inclui automaticamente qual botão de submit foi
    // clicado em todos os navegadores — captura explicitamente via
    // SubmitEvent.submitter (mesmo padrão de ApprovalDecisionForm).
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget);
    if (submitter?.name === "decision") {
      formData.set("decision", submitter.value);
    }
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input
        name="reason"
        placeholder="Motivo (obrigatório para solicitar correção)"
      />
      <details className="text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer select-none">
          Campos a corrigir (só usado se a decisão for &quot;Solicitar correção&quot;)
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
          {CORRECTION_FIELDS.map((f) => (
            <label key={f.key} className="flex items-center gap-1.5">
              <input type="checkbox" name="fieldNames" value={f.key} />
              {f.label}
            </label>
          ))}
        </div>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          name="decision"
          value={primaryValue}
          size="sm"
          disabled={isPending}
        >
          {primaryLabel}
        </Button>
        <Button
          type="submit"
          name="decision"
          value="solicitar_correcao"
          variant="outline"
          size="sm"
          disabled={isPending}
        >
          Solicitar correção
        </Button>
        <Button
          type="submit"
          name="decision"
          value="rejeitar"
          variant="destructive"
          size="sm"
          disabled={isPending}
        >
          Rejeitar
        </Button>
      </div>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
