"use client";

import { useState, useTransition } from "react";

import { submitOwnRegistrationForReview } from "@/app/(app)/meu-cadastro/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PersonStatus } from "@/types/database";

/** Status em que o cadastro ainda pode ser enviado (ou reenviado) para o gestor. */
const EDITABLE_STATUSES: PersonStatus[] = [
  "rascunho",
  "documentos_pendentes",
  "correcao_solicitada",
  "reenviado",
];

export function SubmitOwnRegistrationCard({
  personId,
  status,
}: {
  personId: string;
  status: PersonStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { status: "success" } | { status: "error"; message: string } | null
  >(null);

  // Mesmo padrão de SendForApprovalCard: fica sempre montado, decide o que
  // mostrar com base no status do servidor OU no resultado da própria
  // submissão — nunca é removido da árvore pelo pai (ver AGENTS.md/CONTEXT.md).
  if (result?.status !== "success" && !EDITABLE_STATUSES.includes(status)) {
    return null;
  }

  function handleSubmit() {
    startTransition(async () => {
      const response = await submitOwnRegistrationForReview(personId);
      if (response.status === "error") {
        setResult({
          status: "error",
          message: response.message ?? "Não foi possível enviar para validação.",
        });
        return;
      }
      setResult({ status: "success" });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enviar para validação</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {result?.status === "success" ? (
          <p className="text-sm text-emerald-600" role="status">
            Cadastro enviado — aguarde a validação do seu gestor.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Depois de preencher seus dados e anexar ao menos um documento,
              envie para o seu coordenador validar.
            </p>
            <div>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Enviando..." : "Enviar para validação"}
              </Button>
            </div>
            {result?.status === "error" && (
              <p className="text-sm text-red-600" role="alert">
                {result.message}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
