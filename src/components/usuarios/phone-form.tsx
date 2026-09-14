"use client";

import { startTransition, useActionState } from "react";

import { updatePhone } from "@/app/(app)/usuarios/actions";
import { initialUserActionState } from "@/app/(app)/usuarios/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PhoneForm({ profileId, phone }: { profileId: string; phone: string | null }) {
  const action = updatePhone.bind(null, profileId);
  const [state, dispatch, isPending] = useActionState(action, initialUserActionState);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatch(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Telefone/WhatsApp</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="(61) 91234-5678"
          defaultValue={phone ?? ""}
          className="w-48"
        />
        {state.errors?.phone && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.phone[0]}
          </p>
        )}
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
      {state.status === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          Salvo.
        </p>
      )}
    </form>
  );
}
