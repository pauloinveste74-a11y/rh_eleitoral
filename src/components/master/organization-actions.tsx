"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { linkSelfAsAdmin, updateOrganizationStatus } from "@/app/(app)/master/organizacoes/actions";
import { Button } from "@/components/ui/button";

export function LinkSelfButton({ campaignId }: { campaignId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    if (
      !confirm(
        "Vincular seu usuário a esta organização? Você passará a fazer parte dela como administrador e poderá entrar usando o CNPJ dela.",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const result = await linkSelfAsAdmin(campaignId);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível vincular seu usuário.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Aguarde..." : "Vincular meu usuário a esta organização"}
      </Button>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  encerrada: "Encerrada",
  arquivada: "Arquivada",
};

export function OrganizationStatusActions({
  campaignId,
  status,
}: {
  campaignId: string;
  status: "ativa" | "encerrada" | "arquivada";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const options = (["ativa", "encerrada", "arquivada"] as const).filter((s) => s !== status);

  function handleChange(next: string) {
    if (!confirm(`Alterar o status da organização para "${STATUS_LABEL[next]}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await updateOrganizationStatus(campaignId, next);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível alterar o status.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Button
            key={opt}
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => handleChange(opt)}
          >
            Marcar como {STATUS_LABEL[opt]}
          </Button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
