"use client";

import { startTransition, useActionState, useState } from "react";

import { createAlcadaRule } from "@/app/(app)/despesas/alcadas/actions";
import { initialAlcadaActionState } from "@/app/(app)/despesas/alcadas/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function AlcadaRuleForm({
  roles,
  profiles,
  axes,
  cities,
}: {
  roles: { id: string; name: string }[];
  profiles: { id: string; name: string }[];
  axes: { id: string; name: string }[];
  cities: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    createAlcadaRule,
    initialAlcadaActionState,
  );
  const [scopeType, setScopeType] = useState<"papel" | "pessoa">("papel");

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
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scopeType"
            value="papel"
            checked={scopeType === "papel"}
            onChange={() => setScopeType("papel")}
          />
          Por papel
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="scopeType"
            value="pessoa"
            checked={scopeType === "pessoa"}
            onChange={() => setScopeType("pessoa")}
          />
          Por pessoa específica
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {scopeType === "papel" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="roleId">Papel</Label>
            <Select id="roleId" name="roleId" defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
            {state.errors?.roleId && (
              <p className="text-sm text-red-600" role="alert">
                {state.errors.roleId[0]}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="profileId">Pessoa</Label>
            <Select id="profileId" name="profileId" defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            {state.errors?.profileId && (
              <p className="text-sm text-red-600" role="alert">
                {state.errors.profileId[0]}
              </p>
            )}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxAmountReais">Teto de valor (R$)</Label>
          <Input
            id="maxAmountReais"
            name="maxAmountReais"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0,00"
          />
          {state.errors?.maxAmountReais && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.maxAmountReais[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="axisId">Restringir a um eixo (opcional)</Label>
          <Select id="axisId" name="axisId" defaultValue="">
            <option value="">Toda a campanha</option>
            {axes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cityId">Restringir a uma cidade (opcional)</Label>
          <Select id="cityId" name="cityId" defaultValue="">
            <option value="">Toda a campanha</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar regra de alçada"}
        </Button>
      </div>
    </form>
  );
}
