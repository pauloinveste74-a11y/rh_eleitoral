"use client";

import { startTransition, useActionState } from "react";

import { assignRole } from "@/app/(app)/usuarios/actions";
import { initialUserActionState } from "@/app/(app)/usuarios/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const WIRED_ROLES = new Set([
  "administrador",
  "rh",
  "auditor",
  "financeiro",
  "tesouraria",
  "coordenador_cidade",
  "coordenador_eixo",
]);

export function AssignRoleForm({
  profileId,
  roles,
  axes,
  cities,
  teams,
}: {
  profileId: string;
  roles: { code: string; name: string }[];
  axes: { id: string; name: string }[];
  cities: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}) {
  const action = assignRole.bind(null, profileId);
  const [state, dispatch, isPending] = useActionState(action, initialUserActionState);

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="roleCode">Papel</Label>
          <Select id="roleCode" name="roleCode" defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
                {!WIRED_ROLES.has(r.code) ? " (sem efeito de permissão ainda)" : ""}
              </option>
            ))}
          </Select>
          {state.errors?.roleCode && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.roleCode[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="cityId">Cidade (coordenador de cidade)</Label>
          <Select id="cityId" name="cityId" defaultValue="">
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {state.errors?.cityId && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.cityId[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="axisId">Eixo (coordenador de eixo)</Label>
          <Select id="axisId" name="axisId" defaultValue="">
            <option value="">—</option>
            {axes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          {state.errors?.axisId && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.axisId[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="teamId">Equipe (opcional)</Label>
          <Select id="teamId" name="teamId" defaultValue="">
            <option value="">—</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="validUntil">Válido até (opcional)</Label>
          <Input type="date" id="validUntil" name="validUntil" className="w-48" />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Atribuindo..." : "Atribuir papel"}
        </Button>
        {state.status === "success" && (
          <p className="text-sm text-emerald-600" role="status">
            Papel atribuído.
          </p>
        )}
        {state.status === "error" && state.message && !state.errors && (
          <p className="text-sm text-red-600" role="alert">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
