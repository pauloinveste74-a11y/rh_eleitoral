"use client";

import { useState } from "react";
import { useActionState } from "react";

import { createExpense } from "@/app/(app)/despesas/actions";
import { initialExpenseActionState } from "@/app/(app)/despesas/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  paymentMethods,
  paymentMethodLabels,
  authorizationChannels,
  authorizationChannelLabels,
} from "@/lib/validations/expense";

export function ExpenseForm({
  people,
  categories,
  profiles,
}: {
  people: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  profiles: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createExpense,
    initialExpenseActionState,
  );
  const [authorizerType, setAuthorizerType] = useState<"sistema" | "nao_identificado">(
    "sistema",
  );

  if (people.length === 0) {
    return (
      <p className="text-sm text-brand-graphite dark:text-slate-400">
        Nenhuma pessoa com status &quot;ativo&quot; encontrada — só pessoas
        ativas podem receber reembolso.
      </p>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="personId">Pessoa (reembolsada)</Label>
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
        <Label htmlFor="categoryId">Categoria</Label>
        <Select id="categoryId" name="categoryId" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {state.errors?.categoryId && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.categoryId[0]}
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
        <Label htmlFor="purpose">Motivo do gasto</Label>
        <Input id="purpose" name="purpose" placeholder="Ex.: combustível para evento em..." />
        {state.errors?.purpose && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.purpose[0]}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="vendorName">Fornecedor (opcional)</Label>
          <Input id="vendorName" name="vendorName" placeholder="Nome do estabelecimento" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vendorDocument">CNPJ/CPF do fornecedor (opcional)</Label>
          <Input id="vendorDocument" name="vendorDocument" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="paymentMethod">Forma de pagamento</Label>
          <Select id="paymentMethod" name="paymentMethod" defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {paymentMethods.map((m) => (
              <option key={m} value={m}>
                {paymentMethodLabels[m]}
              </option>
            ))}
          </Select>
          {state.errors?.paymentMethod && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.paymentMethod[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="purchaserPersonId">Quem comprou (opcional)</Label>
          <Select id="purchaserPersonId" name="purchaserPersonId" defaultValue="">
            <option value="">Mesma pessoa reembolsada</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border border-border-default p-4 dark:border-slate-800">
        <legend className="px-1 text-sm font-medium text-brand-navy dark:text-slate-50">
          Quem autorizou este gasto
        </legend>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="authorizerType"
              value="sistema"
              checked={authorizerType === "sistema"}
              onChange={() => setAuthorizerType("sistema")}
            />
            Pessoa do sistema
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="authorizerType"
              value="nao_identificado"
              checked={authorizerType === "nao_identificado"}
              onChange={() => setAuthorizerType("nao_identificado")}
            />
            Não está no sistema
          </label>
        </div>

        {authorizerType === "sistema" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="authorizedByProfileId">Autorizador</Label>
            <Select id="authorizedByProfileId" name="authorizedByProfileId" defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {state.errors?.authorizedByProfileId && (
              <p className="text-sm text-red-600" role="alert">
                {state.errors.authorizedByProfileId[0]}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="unidentifiedAuthorizerName">Nome</Label>
                <Input id="unidentifiedAuthorizerName" name="unidentifiedAuthorizerName" />
                {state.errors?.unidentifiedAuthorizerName && (
                  <p className="text-sm text-red-600" role="alert">
                    {state.errors.unidentifiedAuthorizerName[0]}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="unidentifiedAuthorizerPhone">Telefone (opcional)</Label>
                <Input id="unidentifiedAuthorizerPhone" name="unidentifiedAuthorizerPhone" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="unidentifiedAuthorizerReason">
                Por que essa pessoa não está no sistema
              </Label>
              <Input
                id="unidentifiedAuthorizerReason"
                name="unidentifiedAuthorizerReason"
                placeholder="Ex.: coordenador de rua, sem acesso ao sistema"
              />
              {state.errors?.unidentifiedAuthorizerReason && (
                <p className="text-sm text-red-600" role="alert">
                  {state.errors.unidentifiedAuthorizerReason[0]}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="authorizationChannel">Canal da autorização</Label>
          <Select id="authorizationChannel" name="authorizationChannel" defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {authorizationChannels.map((c) => (
              <option key={c} value={c}>
                {authorizationChannelLabels[c]}
              </option>
            ))}
          </Select>
          {state.errors?.authorizationChannel && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.authorizationChannel[0]}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="authorizedAmountReais">
            Valor autorizado (R$, opcional — se diferente do pedido)
          </Label>
          <Input
            id="authorizedAmountReais"
            name="authorizedAmountReais"
            type="number"
            step="0.01"
            min="0"
            placeholder="Deixe em branco se igual ao valor pedido"
          />
          {state.errors?.authorizedAmountReais && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.authorizedAmountReais[0]}
            </p>
          )}
        </div>
      </fieldset>

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
