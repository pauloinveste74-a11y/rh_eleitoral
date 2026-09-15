"use client";

import { startTransition, useActionState, useRef, useState, useTransition } from "react";

import {
  uploadPublicDocument,
  submitPublicRegistrationForReview,
} from "@/app/cadastro/[token]/actions";
import { initialPublicDocumentActionState } from "@/app/cadastro/[token]/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { documentTypeLabels, documentTypes } from "@/lib/validations/registration";

export function PublicDocumentUpload({
  token,
  onSubmitted,
}: {
  token: string;
  onSubmitted: () => void;
}) {
  const uploadAction = uploadPublicDocument.bind(null, token);
  const [uploadState, dispatchUpload, isUploading] = useActionState(
    uploadAction,
    initialPublicDocumentActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [isSubmitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      dispatchUpload(formData);
      formRef.current?.reset();
    });
  }

  function handleFinalSubmit() {
    setSubmitError(null);
    startSubmit(async () => {
      // A própria função no banco exige ao menos 1 documento ativo e
      // rejeita com uma mensagem amigável se não houver — não precisa ser
      // pré-checado aqui no client.
      const result = await submitPublicRegistrationForReview(token);
      if (result.status === "error") {
        setSubmitError(
          result.message ?? "Não foi possível enviar para validação.",
        );
        return;
      }
      onSubmitted();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Anexe pelo menos um documento com foto (RG, CPF ou título de
          eleitor) antes de concluir. Você pode anexar mais de um.
        </p>
        <form
          ref={formRef}
          onSubmit={handleUpload}
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
          <Button type="submit" disabled={isUploading}>
            {isUploading ? "Enviando..." : "Anexar documento"}
          </Button>
        </form>
        {uploadState.status === "error" && (
          <p className="text-sm text-red-600" role="alert">
            {uploadState.message ??
              uploadState.errors?.file?.[0] ??
              uploadState.errors?.documentType?.[0]}
          </p>
        )}
        {uploadState.status === "success" && (
          <p className="text-sm text-emerald-600" role="status">
            Documento anexado.
          </p>
        )}

        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button type="button" onClick={handleFinalSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Concluir e enviar para validação"}
          </Button>
          {submitError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
