"use client";

import { startTransition, useActionState } from "react";

import { createOrganization } from "@/app/(app)/master/organizacoes/actions";
import { initialOrganizationActionState } from "@/app/(app)/master/organizacoes/action-state";
import { formatCnpj } from "@/lib/validations/cnpj";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShareCredentials } from "@/components/usuarios/share-credentials";

export function CreateOrganizationForm() {
  const [state, dispatch, isPending] = useActionState(
    createOrganization,
    initialOrganizationActionState,
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome da organização</Label>
            <Input id="name" name="name" placeholder="Agilize Tecnologia" />
            {state.errors?.name && (
              <p className="text-sm text-red-600" role="alert">{state.errors.name[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="documentNumber">CNPJ</Label>
            <Input
              id="documentNumber"
              name="documentNumber"
              placeholder="01.596.311/0001-28"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
                e.target.value = digits.length === 14 ? formatCnpj(digits) : digits;
              }}
            />
            {state.errors?.documentNumber && (
              <p className="text-sm text-red-600" role="alert">{state.errors.documentNumber[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="legalName">Razão social (opcional)</Label>
            <Input id="legalName" name="legalName" placeholder="Agilize Tecnologia Ltda." />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tradeName">Nome fantasia (opcional)</Label>
            <Input id="tradeName" name="tradeName" placeholder="Agilize" />
          </div>
        </div>

        <p className="text-sm font-medium text-brand-navy dark:text-slate-50">
          Primeiro administrador desta organização
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="adminFullName">Nome completo</Label>
            <Input id="adminFullName" name="adminFullName" placeholder="Maria Silva" />
            {state.errors?.adminFullName && (
              <p className="text-sm text-red-600" role="alert">{state.errors.adminFullName[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adminEmail">E-mail</Label>
            <Input id="adminEmail" name="adminEmail" type="email" placeholder="maria@agilize.com" />
            {state.errors?.adminEmail && (
              <p className="text-sm text-red-600" role="alert">{state.errors.adminEmail[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adminPhone">Telefone/WhatsApp</Label>
            <Input id="adminPhone" name="adminPhone" type="tel" placeholder="(61) 91234-5678" />
            {state.errors?.adminPhone ? (
              <p className="text-sm text-red-600" role="alert">{state.errors.adminPhone[0]}</p>
            ) : (
              <p className="text-xs text-brand-graphite dark:text-slate-400">
                Vira a senha inicial (últimos 6 dígitos).
              </p>
            )}
          </div>
        </div>

        <div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Criando..." : "Criar organização"}
          </Button>
        </div>
      </form>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      )}
      {state.status === "success" && state.tempPassword && state.recipientEmail && (
        <ShareCredentials
          email={state.recipientEmail}
          password={state.tempPassword}
          phone={state.recipientPhone}
          documentNumber={state.documentNumber ? formatCnpj(state.documentNumber) : undefined}
        />
      )}
    </div>
  );
}
