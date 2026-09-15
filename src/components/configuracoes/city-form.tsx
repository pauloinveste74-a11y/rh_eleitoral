"use client";

import { startTransition, useActionState } from "react";

import { createCity } from "@/app/(app)/configuracoes/actions";
import { initialTerritoryActionState } from "@/app/(app)/configuracoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function CityForm({ axes }: { axes: { id: string; name: string }[] }) {
  const [state, dispatch, isPending] = useActionState(
    createCity,
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

  if (axes.length === 0) {
    return (
      <p className="text-sm text-brand-graphite dark:text-slate-400">
        Crie um eixo antes de cadastrar cidades.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="city-axis">Eixo</Label>
        <Select id="city-axis" name="axisId" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {axes.map((axis) => (
            <option key={axis.id} value={axis.id}>
              {axis.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="city-name">Nome da cidade</Label>
        <Input id="city-name" name="name" placeholder="Plano Piloto" />
        {state.errors?.name && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.name[0]}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="city-state">UF</Label>
        <Input
          id="city-state"
          name="state"
          maxLength={2}
          placeholder="DF"
          className="w-20"
        />
        {state.errors?.state && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.state[0]}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input
          id="city-ra"
          name="isAdministrativeRegion"
          type="checkbox"
          value="true"
        />
        <Label htmlFor="city-ra">É Região Administrativa</Label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Adicionar cidade"}
      </Button>
      {state.status === "error" && state.message && !state.errors && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
