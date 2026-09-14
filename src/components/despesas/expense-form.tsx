"use client";

import { useActionState } from "react";

import { createExpense } from "@/app/(app)/despesas/actions";
import { initialExpenseActionState } from "@/app/(app)/despesas/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { expenseCategories, expenseCategoryLabels } from "@/lib/validations/expense";

export function ExpenseForm({
  people,
}: {
  people: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createExpense,
    initialExpenseActionState,
  );

  if (people.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nenhuma pessoa com status &quot;ativo&quot; encontrada — só pessoas
        ativas podem receber reembolso.
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
        <Label htmlFor="category">Categoria</Label>
        <Select id="category" name="category" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {expenseCategories.map((category) => (
            <option key={category} value={category}>
              {expenseCategoryLabels[category]}
            </option>
          ))}
        </Select>
        {state.errors?.category && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.category[0]}
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
        <Label htmlFor="expenseDate">Data da despesa</Label>
        <Input id="expenseDate" name="expenseDate" type="date" className="max-w-xs" />
        {state.errors?.expenseDate && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.expenseDate[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" placeholder="Motivo do reembolso" />
        {state.errors?.description && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.description[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="receipt">Comprovante (PDF, JPG ou PNG, até 10 MB)</Label>
        <input id="receipt" name="receipt" type="file" accept="application/pdf,image/jpeg,image/png" className="text-sm" />
        {state.errors?.receipt && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.receipt[0]}
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
          {isPending ? "Registrando..." : "Registrar despesa"}
        </Button>
      </div>
    </form>
  );
}
