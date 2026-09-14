"use client";

import { useState, useTransition } from "react";

import { resetUserPassword } from "@/app/(app)/usuarios/actions";
import type { UserActionState } from "@/app/(app)/usuarios/action-state";
import { Button } from "@/components/ui/button";
import { ShareCredentials } from "./share-credentials";

export function ResetPasswordButton({
  profileId,
  email,
  phone,
}: {
  profileId: string;
  email: string;
  phone: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UserActionState | null>(null);

  function handleClick() {
    if (!confirm("Resetar a senha deste usuário para os últimos dígitos do telefone cadastrado?")) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const outcome = await resetUserPassword(profileId, email, phone);
      setResult(outcome);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Resetando..." : "Resetar senha"}
      </Button>
      {result?.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {result.message}
        </p>
      )}
      {result?.status === "success" && result.tempPassword && (
        <ShareCredentials email={email} password={result.tempPassword} phone={phone} />
      )}
    </div>
  );
}
