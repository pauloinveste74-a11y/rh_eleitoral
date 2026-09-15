"use client";

import { startTransition, useActionState } from "react";

import { createLegalEntity } from "@/app/(app)/empresas/actions";
import { initialLegalEntityActionState } from "@/app/(app)/empresas/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

export function LegalEntityForm() {
  const [state, dispatch, isPending] = useActionState(
    createLegalEntity,
    initialLegalEntityActionState,
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

  function errorFor(field: string): string | undefined {
    return state.errors?.[field]?.[0];
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-companyName">Razão social</Label>
          <Input id="le-companyName" name="companyName" />
          <FieldError message={errorFor("companyName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-tradeName">Nome fantasia (opcional)</Label>
          <Input id="le-tradeName" name="tradeName" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-cnpj">CNPJ</Label>
          <Input id="le-cnpj" name="cnpj" placeholder="00.000.000/0000-00" />
          <FieldError message={errorFor("cnpj")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-serviceDescription">Objeto do serviço (opcional)</Label>
          <Input id="le-serviceDescription" name="serviceDescription" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-stateRegistration">Inscrição estadual (opcional)</Label>
          <Input id="le-stateRegistration" name="stateRegistration" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-municipalRegistration">Inscrição municipal (opcional)</Label>
          <Input id="le-municipalRegistration" name="municipalRegistration" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-legalRepresentativeName">Representante legal</Label>
          <Input id="le-legalRepresentativeName" name="legalRepresentativeName" />
          <FieldError message={errorFor("legalRepresentativeName")} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-legalRepresentativeCpf">CPF do representante</Label>
          <Input id="le-legalRepresentativeCpf" name="legalRepresentativeCpf" placeholder="000.000.000-00" />
          <FieldError message={errorFor("legalRepresentativeCpf")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-phone">Telefone (opcional)</Label>
          <Input id="le-phone" name="phone" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="le-whatsapp">WhatsApp (opcional)</Label>
          <Input id="le-whatsapp" name="whatsapp" />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <Label htmlFor="le-email">E-mail (opcional)</Label>
        <Input id="le-email" name="email" type="email" />
        <FieldError message={errorFor("email")} />
      </div>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Cadastrando..." : "Cadastrar empresa"}
        </Button>
      </div>
    </form>
  );
}
