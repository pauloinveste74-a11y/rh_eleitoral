"use client";

import { startTransition, useActionState } from "react";

import { updateOrganization } from "@/app/(app)/master/organizacoes/actions";
import { initialOrganizationActionState } from "@/app/(app)/master/organizacoes/action-state";
import { formatCnpj } from "@/lib/validations/cnpj";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EditOrganizationForm({
  campaignId,
  defaultValues,
}: {
  campaignId: string;
  defaultValues: {
    name: string;
    documentNumber: string | null;
    legalName: string | null;
    tradeName: string | null;
    phone: string | null;
    email: string | null;
  };
}) {
  const action = updateOrganization.bind(null, campaignId);
  const [state, dispatch, isPending] = useActionState(action, initialOrganizationActionState);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome da organização</Label>
          <Input id="name" name="name" defaultValue={defaultValues.name} />
          {state.errors?.name && (
            <p className="text-sm text-red-600" role="alert">{state.errors.name[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="documentNumber">CNPJ</Label>
          <Input
            id="documentNumber"
            name="documentNumber"
            placeholder="00.000.000/0000-00"
            defaultValue={
              defaultValues.documentNumber ? formatCnpj(defaultValues.documentNumber) : ""
            }
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
          <Input id="legalName" name="legalName" defaultValue={defaultValues.legalName ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tradeName">Nome fantasia (opcional)</Label>
          <Input id="tradeName" name="tradeName" defaultValue={defaultValues.tradeName ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefone/WhatsApp (opcional)</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={defaultValues.phone ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues.email ?? ""} />
          {state.errors?.email && (
            <p className="text-sm text-red-600" role="alert">{state.errors.email[0]}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar alterações"}
        </Button>
        {state.status === "success" && (
          <span className="text-sm text-emerald-600" role="status">
            Salvo.
          </span>
        )}
      </div>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">{state.message}</p>
      )}
    </form>
  );
}
