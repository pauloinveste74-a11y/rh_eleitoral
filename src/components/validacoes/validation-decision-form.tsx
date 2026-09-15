"use client";

import { startTransition, useActionState } from "react";

import { initialValidationActionState } from "@/app/(app)/validacoes/action-state";
import type { ValidationActionState } from "@/app/(app)/validacoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Formulário de decisão genérico — usado tanto pela fila do gestor
 * (decide_registration_submission, "Aprovar") quanto pela fila do RH
 * (decide_rh_validation, "Validar"). `action` já vem vinculada ao id da
 * submissão pelo chamador (`.bind(null, submissionId)`), mesmo padrão de
 * ApprovalDecisionForm (/aprovacoes).
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
