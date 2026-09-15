"use client";

import { useActionState } from "react";

import { createPaymentBatch } from "@/app/(app)/financeiro/actions";
import { initialPaymentActionState } from "@/app/(app)/financeiro/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentBatchForm({
  people,
}: {
  people: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createPaymentBatch,
    initialPaymentActionState,
  );

  if (people.length === 0) {
    return (
      <p className="text-sm text-brand-graphite dark:text-slate-400">
        Nenhuma pessoa com status &quot;ativo&quot; encontrada — só pessoas
        ativas podem receber pagamento.
      </p>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="referencePeriod">Período de referência</Label>
        <Input
          id="referencePeriod"
          name="referencePeriod"
          placeholder="Setembro/2026"
          className="max-w-xs"
        />
        {state.errors?.referencePeriod && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.referencePeriod[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="batchAmountReais">Valor por pessoa (R$)</Label>
        <Input
          id="batchAmountReais"
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
        <Label htmlFor="batchDescription">Descrição</Label>
        <Input
          id="batchDescription"
          name="description"
          placeholder="Motivo do pagamento (aplicado a todas as pessoas do lote)"
        />
        {state.errors?.description && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="personIds">Pessoas (ctrl/cmd + clique para selecionar várias)</Label>
        <select
          id="personIds"
          name="personIds"
          multiple
          size={Math.min(10, Math.max(4, people.length))}
          className="flex w-full max-w-md rounded-md border border-border-default bg-white px-3 py-2 text-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-state-info focus-visible:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-slate-300"
        >
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        {state.errors?.personIds && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.personIds[0]}
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
          {isPending ? "Criando lote..." : "Criar lote de pagamentos"}
        </Button>
      </div>
    </form>
  );
}
