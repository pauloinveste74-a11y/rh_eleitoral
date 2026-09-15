"use client";

import { startTransition, useActionState, useState } from "react";

import { publishTemplateVersion } from "@/app/(app)/contratos/modelos/actions";
import { initialContractTemplateActionState } from "@/app/(app)/contratos/modelos/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContractTemplateInput } from "@/lib/validations/contract";
import { CONTRACT_PLACEHOLDERS_PF, CONTRACT_PLACEHOLDERS_PJ } from "@/lib/validations/contract";

/**
 * Publica uma nova versão do modelo — o textarea já vem com os
 * placeholders sugeridos (spec 12.1) pro usuário só preencher o texto ao
 * redor. Publicar supera a versão ativa anterior (publish_template_version()).
 */
export function PublishVersionForm({
  contractTemplateId,
  contractType,
}: {
  contractTemplateId: string;
  contractType: ContractTemplateInput["contractType"];
}) {
  const action = publishTemplateVersion.bind(null, contractTemplateId);
  const [state, dispatch, isPending] = useActionState(
    action,
    initialContractTemplateActionState,
  );
  const placeholders = contractType === "pf" ? CONTRACT_PLACEHOLDERS_PF : CONTRACT_PLACEHOLDERS_PJ;
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatch(formData);
    });
  }

  if (!showForm) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
        Publicar nova versão
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Placeholders disponíveis: {placeholders.map((p) => `{{${p}}}`).join(", ")}
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="pv-body">Conteúdo do modelo</Label>
        <textarea
          id="pv-body"
          name="body"
          rows={10}
          className="rounded-md border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"
          placeholder={`Pelo presente instrumento, {{nome_contratado}}...`}
        />
        {state.errors?.body && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.body[0]}
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pv-validFrom">Válido a partir de</Label>
          <Input id="pv-validFrom" name="validFrom" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          {state.errors?.validFrom && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.validFrom[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pv-validUntil">Válido até (opcional)</Label>
          <Input id="pv-validUntil" name="validUntil" type="date" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Publicando..." : "Publicar versão"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
      </div>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          Versão publicada.
        </p>
      )}
    </form>
  );
}
