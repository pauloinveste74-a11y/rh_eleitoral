"use client";

import { startTransition, useActionState, useState } from "react";

import { generateContract } from "@/app/(app)/contratos/actions";
import { initialContractActionState } from "@/app/(app)/contratos/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface ActiveTemplateVersion {
  id: string;
  templateName: string;
  contractType: "pf" | "pj";
}

/**
 * Geração individual de contrato (spec 12.2). O tipo de contratado
 * (PF/PJ) filtra tanto a lista de modelos quanto a de alvos — evita
 * escolher um modelo PF pra gerar contrato de empresa (a função já
 * rejeitaria, isso só poupa o erro).
 */
export function GenerateContractForm({
  activeVersions,
  people,
  legalEntities,
  jobFunctions,
}: {
  activeVersions: ActiveTemplateVersion[];
  people: { id: string; fullName: string }[];
  legalEntities: { id: string; companyName: string }[];
  jobFunctions: { id: string; name: string }[];
}) {
  const [state, dispatch, isPending] = useActionState(
    generateContract,
    initialContractActionState,
  );
  const [targetType, setTargetType] = useState<"pf" | "pj">("pf");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("targetType", targetType);
    startTransition(() => {
      dispatch(formData);
    });
  }

  const versionsForType = activeVersions.filter((v) => v.contractType === targetType);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="targetTypeRadio"
            checked={targetType === "pf"}
            onChange={() => setTargetType("pf")}
          />
          Pessoa física
        </label>
        {legalEntities.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="targetTypeRadio"
              checked={targetType === "pj"}
              onChange={() => setTargetType("pj")}
            />
            Pessoa jurídica
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {targetType === "pf" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="gc-person">Pessoa</Label>
            <Select id="gc-person" name="personId" defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="gc-legalEntity">Empresa</Label>
            <Select id="gc-legalEntity" name="legalEntityId" defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {legalEntities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.companyName}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="gc-version">Modelo</Label>
          <Select id="gc-version" name="templateVersionId" defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {versionsForType.map((v) => (
              <option key={v.id} value={v.id}>
                {v.templateName}
              </option>
            ))}
          </Select>
          {versionsForType.length === 0 && (
            <p className="text-xs text-brand-graphite dark:text-slate-400">
              Nenhum modelo {targetType === "pf" ? "de PF" : "de PJ"} com versão publicada ainda.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gc-job">Cargo/função (opcional)</Label>
          <Select id="gc-job" name="jobFunctionId" defaultValue="">
            <option value="">Nenhum</option>
            {jobFunctions.map((jf) => (
              <option key={jf.id} value={jf.id}>
                {jf.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gc-position">Ou descreva o cargo (texto livre)</Label>
          <Input id="gc-position" name="positionOverride" placeholder="Ex.: Apoio de campanha" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="gc-value">Valor contratado (R$, opcional)</Label>
          <Input id="gc-value" name="valueReais" type="number" step="0.01" min="0" />
          {state.errors?.valueReais && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.valueReais[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gc-start">Data de início (opcional)</Label>
          <Input id="gc-start" name="startDate" type="date" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gc-end">Data de fim (opcional)</Label>
          <Input id="gc-end" name="endDate" type="date" />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Gerando..." : "Gerar contrato"}
        </Button>
      </div>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
