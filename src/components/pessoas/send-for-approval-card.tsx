"use client";

import { startTransition, useActionState } from "react";

import { sendForApproval } from "@/app/(app)/pessoas/actions";
import { initialPersonActionState } from "@/app/(app)/pessoas/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function SendForApprovalCard({
  personId,
  cities,
}: {
  personId: string;
  cities: { id: string; name: string }[];
}) {
  const action = sendForApproval.bind(null, personId);
  const [state, dispatch, isPending] = useActionState(
    action,
    initialPersonActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar para aprovação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Vincule esta pessoa a uma cidade para iniciar o fluxo de validação
          (coordenador de cidade, depois coordenador de eixo).
        </p>
        {cities.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nenhuma cidade cadastrada ainda — crie uma em Configurações antes de
            enviar para aprovação.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="send-approval-city">Cidade</Label>
              <Select id="send-approval-city" name="cityId" defaultValue="">
                <option value="" disabled>
                  Selecione
                </option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </Select>
              {state.errors?.cityId && (
                <p className="text-sm text-red-600" role="alert">
                  {state.errors.cityId[0]}
                </p>
              )}
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar para aprovação"}
            </Button>
          </form>
        )}
        {state.status === "error" && state.message && (
          <p className="text-sm text-red-600" role="alert">
            {state.message}
          </p>
        )}
        {state.status === "success" && (
          <p className="text-sm text-emerald-600" role="status">
            Enviado para validação da cidade.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
