"use client";

import { startTransition, useActionState, useRef } from "react";

import { decideApproval } from "@/app/(app)/aprovacoes/actions";
import { initialApprovalActionState } from "@/app/(app)/aprovacoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApprovalDecisionForm({ personId }: { personId: string }) {
  const action = decideApproval.bind(null, personId);
  const [state, dispatch, isPending] = useActionState(
    action,
    initialApprovalActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // FormData(form) não inclui automaticamente qual botão de submit foi
    // clicado em todos os navegadores — captura explicitamente via
    // SubmitEvent.submitter.
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <Input
        name="reason"
        placeholder="Motivo (opcional)"
        className="sm:max-w-xs"
      />
      <div className="flex gap-2">
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
