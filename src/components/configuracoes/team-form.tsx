"use client";

import { startTransition, useActionState } from "react";

import { createTeam } from "@/app/(app)/configuracoes/actions";
import { initialTerritoryActionState } from "@/app/(app)/configuracoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function TeamForm({
  cities,
}: {
  cities: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createTeam,
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

  if (cities.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Crie uma cidade antes de cadastrar equipes.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="team-city">Cidade</Label>
        <Select id="team-city" name="cityId" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="team-name">Nome da equipe</Label>
        <Input id="team-name" name="name" placeholder="Equipe Alfa" />
        {state.errors?.name && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.name[0]}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Adicionar equipe"}
      </Button>
      {state.status === "error" && state.message && !state.errors && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
