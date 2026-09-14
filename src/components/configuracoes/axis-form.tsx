"use client";

import { startTransition, useActionState } from "react";

import { createAxis } from "@/app/(app)/configuracoes/actions";
import { initialTerritoryActionState } from "@/app/(app)/configuracoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AxisForm() {
  const [state, dispatch, isPending] = useActionState(
    createAxis,
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="axis-name">Nome do eixo</Label>
        <Input id="axis-name" name="name" placeholder="Eixo Norte" />
        {state.errors?.name && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.name[0]}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="axis-code">Código</Label>
        <Input
          id="axis-code"
          name="code"
          placeholder="NORTE"
          className="w-32"
        />
        {state.errors?.code && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.code[0]}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Adicionar eixo"}
      </Button>
      {state.status === "error" && state.message && !state.errors && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
