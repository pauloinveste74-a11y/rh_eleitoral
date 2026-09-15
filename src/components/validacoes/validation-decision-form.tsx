"use client";

import { startTransition, useActionState } from "react";

import { decideRegistrationSubmission } from "@/app/(app)/validacoes/actions";
import { initialValidationActionState } from "@/app/(app)/validacoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Mesmo padrão de ApprovalDecisionForm (/aprovacoes), com um terceiro botão. */
export function ValidationDecisionForm({
  submissionId,
}: {
  submissionId: string;
}) {
  const action = decideRegistrationSubmission.bind(null, submissionId);
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
          value="aprovar"
          size="sm"
          disabled={isPending}
        >
          Aprovar
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
