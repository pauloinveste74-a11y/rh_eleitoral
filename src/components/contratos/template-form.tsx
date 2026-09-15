"use client";

import { startTransition, useActionState } from "react";

import { createContractTemplate } from "@/app/(app)/contratos/modelos/actions";
import { initialContractTemplateActionState } from "@/app/(app)/contratos/modelos/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { contractTypes, contractTypeLabels } from "@/lib/validations/contract";

export function TemplateForm({
  jobFunctions,
}: {
  jobFunctions: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createContractTemplate,
    initialContractTemplateActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    startTransition(() => {
      dispatch(formData);
      form.reset();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-name">Nome do modelo</Label>
        <Input id="ct-name" name="name" placeholder="Contrato de prestação de serviço — Cabo eleitoral" />
        {state.errors?.name && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.name[0]}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-type">Tipo de contratado</Label>
        <Select id="ct-type" name="contractType" defaultValue="pf">
          {contractTypes.map((t) => (
            <option key={t} value={t}>
              {contractTypeLabels[t]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="ct-job">Cargo associado (opcional)</Label>
        <Select id="ct-job" name="jobFunctionId" defaultValue="">
          <option value="">Nenhum</option>
          {jobFunctions.map((jf) => (
            <option key={jf.id} value={jf.id}>
              {jf.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Criar modelo"}
      </Button>
      {state.status === "error" && state.message && (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
