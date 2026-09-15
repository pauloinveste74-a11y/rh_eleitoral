"use client";

import { startTransition, useActionState } from "react";

import { decideContract } from "@/app/(app)/contratos/actions";
import { initialContractActionState } from "@/app/(app)/contratos/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Conferência do gestor/RH sobre o PDF assinado enviado (spec 12.3). */
export function ContractDecisionForm({ contractId }: { contractId: string }) {
  const action = decideContract.bind(null, contractId);
  const [state, dispatch, isPending] = useActionState(action, initialContractActionState);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      <Input name="reason" placeholder="Motivo (obrigatório para correção/recusa)" />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="validar" size="sm" disabled={isPending}>
          Validar
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
          value="recusar"
          variant="destructive"
          size="sm"
          disabled={isPending}
        >
          Recusar
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
