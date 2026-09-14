"use client";

import { useState, useTransition } from "react";

import { removeRole } from "@/app/(app)/usuarios/actions";
import { Button } from "@/components/ui/button";

export function RemoveRoleButton({
  profileRoleId,
  profileId,
}: {
  profileRoleId: string;
  profileId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Remover este papel do usuário?")) return;
    setError(null);
    startTransition(async () => {
      const result = await removeRole(profileRoleId, profileId);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível remover.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "Removendo..." : "Remover"}
      </Button>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
