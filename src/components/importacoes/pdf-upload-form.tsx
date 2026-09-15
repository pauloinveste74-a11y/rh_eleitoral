"use client";

import { startTransition, useActionState } from "react";

import { uploadPdfImportBatch } from "@/app/(app)/importacoes/actions";
import { initialImportBatchActionState } from "@/app/(app)/importacoes/action-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Nova versão, Etapa 7 (spec 9.2) — só PDF com texto pesquisável nesta
 * etapa (uma página = uma pessoa); sem OCR de imagem digitalizada ainda.
 */
export function PdfUploadForm() {
  const [state, dispatch, isPending] = useActionState(
    uploadPdfImportBatch,
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
          <Label htmlFor="pdf-file">PDF (texto pesquisável, até 15 MB)</Label>
          <input
            id="pdf-file"
            name="file"
            type="file"
            accept=".pdf,application/pdf"
            className="text-sm"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enviando..." : "Enviar PDF"}
        </Button>
      </form>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      <p className="text-xs text-brand-graphite dark:text-slate-400">
        Cada página vira uma pessoa. Precisa ter o CPF e o nome escritos
        (rótulo <strong>&quot;Nome:&quot;</strong> ajuda a achar). Página que
        for imagem digitalizada (sem texto pra selecionar) não é lida
        nesta versão — fica marcada como inválida, cadastre essa pessoa
        manualmente.
      </p>
    </div>
  );
}
