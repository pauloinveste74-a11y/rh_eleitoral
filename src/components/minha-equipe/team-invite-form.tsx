"use client";

import { startTransition, useActionState } from "react";

import { createInvite } from "@/app/(app)/minha-equipe/actions";
import { initialTeamInviteActionState } from "@/app/(app)/minha-equipe/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareInviteLink } from "./share-invite-link";

export function TeamInviteForm() {
  const [state, dispatch, isPending] = useActionState(
    createInvite,
    initialTeamInviteActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;
    startTransition(() => {
      dispatch(formData);
      form.reset();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="contactName">Nome (opcional)</Label>
          <Input id="contactName" name="contactName" placeholder="João Cabo" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contactPhone">Telefone/WhatsApp (opcional)</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            placeholder="(61) 91234-5678"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="contactEmail">E-mail (opcional)</Label>
          <Input id="contactEmail" name="contactEmail" type="email" />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Gerando..." : "Gerar link de convite"}
        </Button>
      </form>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.invite && (
        <ShareInviteLink
          token={state.invite.token}
          contactName={state.invite.contactName}
          contactPhone={state.invite.contactPhone}
        />
      )}
    </div>
  );
}
