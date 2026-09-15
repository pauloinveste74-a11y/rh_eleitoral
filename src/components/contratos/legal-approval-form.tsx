"use client";

import { startTransition, useActionState } from "react";

import { setTemplateLegalApproval } from "@/app/(app)/contratos/modelos/actions";
import { initialContractTemplateActionState } from "@/app/(app)/contratos/modelos/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Aprovação jurídica do modelo (spec 12.1) — só aparece pra quem tem o
 * papel `juridico`/administrador (checado na página, não aqui).
 */
export function LegalApprovalForm({ contractTemplateId }: { contractTemplateId: string }) {
  const action = setTemplateLegalApproval.bind(null, contractTemplateId);
  const [state, dispatch, isPending] = useActionState(
    action,
    initialContractTemplateActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget);
    if (submitter?.name === "approved") {
      formData.set("approved", submitter.value);
    }
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <Input name="note" placeholder="Observação (opcional)" className="max-w-xs" />
      <Button type="submit" name="approved" value="true" size="sm" disabled={isPending}>
        Aprovar
      </Button>
      <Button
        type="submit"
        name="approved"
        value="false"
        variant="destructive"
        size="sm"
        disabled={isPending}
      >
        Reprovar
      </Button>
      {state.status === "error" && (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
