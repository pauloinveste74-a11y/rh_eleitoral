"use client";

import { startTransition, useActionState, useRef } from "react";

import { uploadPersonDocument } from "@/app/(app)/pessoas/actions";
import {
  initialPersonActionState,
  type PersonActionState,
} from "@/app/(app)/pessoas/action-state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { documentTypeLabels, documentTypes } from "@/lib/validations/person";

export function PersonDocumentUpload({ personId }: { personId: string }) {
  const action = uploadPersonDocument.bind(null, personId);
  const [state, dispatch, isPending] = useActionState<
    PersonActionState,
    FormData
  >(action, initialPersonActionState);
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 sm:flex-row sm:items-end"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="documentType">Tipo de documento</Label>
        <Select id="documentType" name="documentType" defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {documentTypeLabels[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">Arquivo (PDF, JPG ou PNG, até 10 MB)</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          className="text-sm"
        />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enviando..." : "Anexar documento"}
      </Button>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message ??
            state.errors?.file?.[0] ??
            state.errors?.documentType?.[0]}
        </p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          Documento anexado.
        </p>
      )}
    </form>
  );
}
