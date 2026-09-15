"use client";

import { startTransition, useActionState } from "react";

import { createJobFunction } from "@/app/(app)/configuracoes/actions";
import { initialTerritoryActionState } from "@/app/(app)/configuracoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { contractTypes, contractTypeLabels } from "@/lib/validations/job-function";

export function JobFunctionForm() {
  const [state, dispatch, isPending] = useActionState(
    createJobFunction,
    initialTerritoryActionState,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="jf-name">Nome do cargo</Label>
          <Input id="jf-name" name="name" placeholder="Coordenador de equipe" />
          {state.errors?.name && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.name[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jf-category">Categoria (opcional)</Label>
          <Input id="jf-category" name="category" placeholder="Coordenação" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="jf-contractType">Tipo de contratação</Label>
          <Select id="jf-contractType" name="contractType" defaultValue="pf">
            {contractTypes.map((t) => (
              <option key={t} value={t}>
                {contractTypeLabels[t]}
              </option>
            ))}
          </Select>
          {state.errors?.contractType && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.contractType[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jf-workload">Jornada de referência (opcional)</Label>
          <Input id="jf-workload" name="workloadReference" placeholder="Ex.: 6h/dia, seg a sáb" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="jf-min">Faixa de remuneração — mínimo (R$, opcional)</Label>
          <Input id="jf-min" name="salaryRangeMinReais" type="number" step="0.01" min="0" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="jf-max">Faixa de remuneração — máximo (R$, opcional)</Label>
          <Input id="jf-max" name="salaryRangeMaxReais" type="number" step="0.01" min="0" />
          {state.errors?.salaryRangeMaxReais && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.salaryRangeMaxReais[0]}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="jf-description">Descrição (opcional)</Label>
        <Input id="jf-description" name="description" />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requiresCoordinator" value="true" defaultChecked />
        Precisa de coordenador
      </label>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Adicionar cargo"}
        </Button>
      </div>
      {state.status === "error" && state.message && !state.errors && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
