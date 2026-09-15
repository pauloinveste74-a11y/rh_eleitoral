"use client";

import { useState, useTransition } from "react";

import { confirmImportBatch, cancelImportBatch } from "@/app/(app)/importacoes/actions";
import { Button } from "@/components/ui/button";

export function ConfirmImportBatchButton({ batchId }: { batchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { status: "success"; message?: string } | { status: "error"; message: string } | null
  >(null);

  function handleClick() {
    if (
      !confirm(
        "Confirmar a importação? As linhas prontas viram pessoas de verdade (status rascunho) — não dá pra desfazer por aqui depois.",
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const response = await confirmImportBatch(batchId);
      if (response.status === "error") {
        setResult({ status: "error", message: response.message ?? "Não foi possível confirmar." });
        return;
      }
      setResult({ status: "success", message: response.message });
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={handleClick} disabled={isPending}>
        {isPending ? "Confirmando..." : "Confirmar importação"}
      </Button>
      {result?.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {result.message}
        </p>
      )}
      {result?.status === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          {result.message}
        </p>
      )}
    </div>
  );
}

export function CancelImportBatchButton({ batchId }: { batchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Cancelar esta importação? A planilha enviada não gera nenhum cadastro.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const response = await cancelImportBatch(batchId);
      if (response.status === "error") {
        setError(response.message ?? "Não foi possível cancelar.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Cancelando..." : "Cancelar importação"}
      </Button>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
