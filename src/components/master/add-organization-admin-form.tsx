"use client";

import { startTransition, useActionState } from "react";

import { addOrganizationAdmin } from "@/app/(app)/master/organizacoes/actions";
import { initialOrganizationActionState } from "@/app/(app)/master/organizacoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareCredentials } from "@/components/usuarios/share-credentials";

export function AddOrganizationAdminForm({ campaignId }: { campaignId: string }) {
  const action = addOrganizationAdmin.bind(null, campaignId);
  const [state, dispatch, isPending] = useActionState(action, initialOrganizationActionState);

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
          <Input id="fullName" name="fullName" placeholder="João Souza" />
          {state.errors?.fullName && (
            <p className="text-sm text-red-600" role="alert">{state.errors.fullName[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" placeholder="joao@empresa.com" />
          {state.errors?.email && (
            <p className="text-sm text-red-600" role="alert">{state.errors.email[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefone/WhatsApp</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(61) 91234-5678" />
          {state.errors?.phone ? (
            <p className="text-sm text-red-600" role="alert">{state.errors.phone[0]}</p>
          ) : (
            <p className="text-xs text-brand-graphite dark:text-slate-400">
              Vira a senha inicial (últimos 6 dígitos).
            </p>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Adicionar administrador"}
        </Button>
      </form>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      )}
      {state.status === "success" && state.tempPassword && state.recipientEmail && (
        <ShareCredentials
          email={state.recipientEmail}
          password={state.tempPassword}
          phone={state.recipientPhone}
        />
      )}
    </div>
  );
}
