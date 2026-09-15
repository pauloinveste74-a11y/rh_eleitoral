"use client";

import { startTransition, useActionState } from "react";

import { uploadImportBatch } from "@/app/(app)/importacoes/actions";
import { initialImportBatchActionState } from "@/app/(app)/importacoes/action-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IMPORT_COLUMNS } from "@/lib/imports/columns";

export function ImportUploadForm() {
  const [state, dispatch, isPending] = useActionState(
    uploadImportBatch,
    initialImportBatchActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:items-end"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="file">Planilha (.xlsx, até 15 MB)</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="text-sm"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar planilha"}
        </Button>
      </form>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <details className="text-sm text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer select-none">
          Ver cabeçalhos aceitos na primeira linha da planilha
        </summary>
        <p className="mt-2">
          Só <strong>Nome completo</strong> e <strong>CPF</strong> são
          obrigatórios — o resto fica em branco se não tiver o dado. A ordem
          das colunas não importa, mas o texto do cabeçalho precisa bater
          (sem acento tudo bem, maiúscula/minúscula não importa):
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {IMPORT_COLUMNS.map((c) => (
            <li key={c.key} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs dark:bg-slate-900">
              {c.header}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
