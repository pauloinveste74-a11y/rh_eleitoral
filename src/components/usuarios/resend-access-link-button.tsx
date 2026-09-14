"use client";

import { useState, useTransition } from "react";

import { resendAccessLink } from "@/app/(app)/usuarios/actions";
import type { UserActionState } from "@/app/(app)/usuarios/action-state";
import { Button } from "@/components/ui/button";
import { ShareAccessLink } from "./share-access-link";

export function ResendAccessLinkButton({
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
    setResult(null);
    startTransition(async () => {
      const outcome = await resendAccessLink(profileId, email);
      setResult(outcome);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Gerando..." : "Gerar novo link de acesso"}
      </Button>
      {result?.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {result.message}
        </p>
      )}
      {result?.status === "success" && result.accessLink && (
        <ShareAccessLink link={result.accessLink} email={email} phone={phone} />
      )}
    </div>
  );
}
