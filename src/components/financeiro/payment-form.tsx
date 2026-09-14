"use client";

import { useActionState } from "react";

import { createPayment } from "@/app/(app)/financeiro/actions";
import { initialPaymentActionState } from "@/app/(app)/financeiro/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function PaymentForm({
  people,
}: {
  people: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createPayment,
    initialPaymentActionState,
  );

  if (people.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nenhuma pessoa com status &quot;ativo&quot; encontrada — só pessoas
        ativas podem receber pagamento.
      </p>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="personId">Pessoa</Label>
        <Select id="personId" name="personId" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
        {state.errors?.personId && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.personId[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="amountReais">Valor (R$)</Label>
        <Input
          id="amountReais"
          name="amountReais"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0,00"
          className="max-w-xs"
        />
        {state.errors?.amountReais && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.amountReais[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" placeholder="Motivo do pagamento" />
        {state.errors?.description && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar pagamento"}
        </Button>
      </div>
    </form>
  );
}
