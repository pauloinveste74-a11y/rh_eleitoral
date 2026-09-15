"use client";

import { startTransition, useActionState, useRef } from "react";

import { uploadSignedContract } from "@/app/(app)/contratos/actions";
import { initialContractActionState } from "@/app/(app)/contratos/action-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function UploadSignedContractForm({
  contractId,
  storagePathPrefix,
}: {
  contractId: string;
  storagePathPrefix: string;
}) {
  const action = uploadSignedContract.bind(null, contractId, storagePathPrefix);
  const [state, dispatch, isPending] = useActionState(action, initialContractActionState);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatch(formData);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="usc-file">PDF assinado (ou foto, até 10 MB)</Label>
        <input
          id="usc-file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="text-sm"
        />
        {state.errors?.file && (
          <p className="text-sm text-red-600" role="alert">
            {state.errors.file[0]}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar assinatura"}
      </Button>
      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          Assinatura enviada — aguardando conferência.
        </p>
      )}
    </form>
  );
}
