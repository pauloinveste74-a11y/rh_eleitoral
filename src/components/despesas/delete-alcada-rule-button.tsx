"use client";

import { useState, useTransition } from "react";

import { deleteAlcadaRule } from "@/app/(app)/despesas/alcadas/actions";
import { Button } from "@/components/ui/button";

export function DeleteAlcadaRuleButton({ ruleId }: { ruleId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm("Remover esta regra de alçada?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAlcadaRule(ruleId);
      if (result.status === "error") {
        setError(result.message ?? "Não foi possível remover.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="destructive" size="sm" onClick={handleClick} disabled={isPending}>
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
