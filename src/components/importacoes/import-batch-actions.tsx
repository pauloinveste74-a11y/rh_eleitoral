"use client";

import { useState, useTransition } from "react";

import {
  confirmImportBatch,
  cancelImportBatch,
  revertImportBatch,
} from "@/app/(app)/importacoes/actions";
import { Button } from "@/components/ui/button";

export function ConfirmImportBatchButton({ batchId }: { batchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { status: "success"; message?: string } | { status: "error"; message: string } | null
  >(null);

  function handleClick() {
    if (
      !confirm(
        "Confirmar a importação? As linhas prontas viram pessoas de verdade (status rascunho). Dá pra reverter depois, mas só enquanto nenhuma delas tiver avançado (aprovação, pagamento, despesa etc.).",
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

export function RevertImportBatchButton({ batchId }: { batchId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { status: "success" } | { status: "error"; message: string } | null
  >(null);

  function handleClick() {
    if (
      !confirm(
        "Reverter esta importação? As pessoas criadas por ela serão apagadas — só funciona se nenhuma delas já tiver avançado (aprovação, pagamento, despesa, login etc.).",
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const response = await revertImportBatch(batchId);
      if (response.status === "error") {
        setResult({
          status: "error",
          message: response.message ?? "Não foi possível reverter.",
        });
        return;
      }
      setResult({ status: "success" });
    });
  }

  // Mesmo padrão "sempre montado" de outros formulários que mudam status —
  // se a reversão der certo, o Server Component pai reflete o novo status
  // no próximo render, mas este componente ainda precisa mostrar a mensagem
  // de sucesso antes disso acontecer.
  if (result?.status === "success") {
    return (
      <p className="text-sm text-emerald-600" role="status">
        Importação revertida — as pessoas criadas por ela foram removidas.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="destructive" onClick={handleClick} disabled={isPending}>
        {isPending ? "Revertendo..." : "Reverter importação"}
      </Button>
      {result?.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
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
