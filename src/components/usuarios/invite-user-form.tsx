"use client";

import { startTransition, useActionState } from "react";

import { inviteUser } from "@/app/(app)/usuarios/actions";
import { initialUserActionState } from "@/app/(app)/usuarios/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareAccessLink } from "./share-access-link";

export function InviteUserForm() {
  const [state, dispatch, isPending] = useActionState(inviteUser, initialUserActionState);

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
          <Label htmlFor="fullName">Nome completo</Label>
          <Input id="fullName" name="fullName" placeholder="Maria Silva" />
          {state.errors?.fullName && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.fullName[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="maria@campanha.com" />
          {state.errors?.email && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.email[0]}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefone/WhatsApp (opcional)</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(61) 91234-5678" />
          {state.errors?.phone && (
            <p className="text-sm text-red-600" role="alert">
              {state.errors.phone[0]}
            </p>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Gerando..." : "Convidar usuário"}
        </Button>
      </form>
      {state.status === "error" && state.message && !state.errors && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.accessLink && state.recipientEmail && (
        <ShareAccessLink
          link={state.accessLink}
          email={state.recipientEmail}
          phone={state.recipientPhone}
        />
      )}
    </div>
  );
}
