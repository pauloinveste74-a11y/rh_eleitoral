"use client";

import { useState, useTransition } from "react";

import { toggleUserStatus } from "@/app/(app)/usuarios/actions";
import { Button } from "@/components/ui/button";

export function ToggleStatusButton({
  profileId,
  status,
}: {
  profileId: string;
  status: "ativo" | "suspenso" | "inativo";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "inativo") return null;

  const nextStatus = status === "ativo" ? "suspenso" : "ativo";
  const label = status === "ativo" ? "Suspender" : "Reativar";
  const confirmMessage =
    status === "ativo"
      ? "Suspender este usuário? Ele perde o acesso ao sistema imediatamente."
      : "Reativar o acesso deste usuário?";

  function handleClick() {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleUserStatus(profileId, nextStatus);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível alterar o status.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={status === "ativo" ? "destructive" : "outline"}
        size="sm"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "Aguarde..." : label}
      </Button>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
