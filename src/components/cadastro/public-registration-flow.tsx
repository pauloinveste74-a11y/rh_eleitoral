"use client";

import { useState } from "react";

import {
  submitPublicRegistration,
  updatePublicRegistration,
} from "@/app/cadastro/[token]/actions";
import { PersonForm, type PersonFormValues } from "@/components/pessoas/person-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicDocumentUpload } from "./public-document-upload";

type Step = "form" | "upload" | "done";

/**
 * Fluxo do autocadastro público (seção 4 da spec), em 3 etapas dentro da
 * mesma página, sem reload: dados pessoais -> documento(s) -> concluído.
 * `initialStep` reflete o estado real do convite/pessoa no banco (se o
 * usuário sair e voltar pelo mesmo link, retoma de onde parou).
 *
 * Etapa 11 — `isCorrection` indica uma reabertura por correção solicitada:
 * usa `updatePublicRegistration` (reedita) em vez de `submitPublicRegistration`
 * (só cria), com os dados atuais pré-preenchidos e só os campos apontados
 * pelo gestor/RH editáveis (`editableFields`).
 */
export function PublicRegistrationFlow({
  token,
  initialStep,
  isCorrection = false,
  defaultValues,
  editableFields,
}: {
  token: string;
  initialStep: Step;
  isCorrection?: boolean;
  defaultValues?: Partial<PersonFormValues>;
  editableFields?: string[] | null;
}) {
  const [step, setStep] = useState<Step>(initialStep);

  if (step === "form") {
    return (
      <PersonForm
        mode={isCorrection ? "edit" : "create"}
        defaultValues={defaultValues}
        action={
          isCorrection
            ? updatePublicRegistration.bind(null, token)
            : submitPublicRegistration.bind(null, token)
        }
        submitLabel={isCorrection ? "Salvar correção" : "Enviar meus dados"}
        showSocialName={false}
        editableFields={editableFields}
        onSuccess={() => setStep("upload")}
      />
    );
  }

  if (step === "upload") {
    return (
      <PublicDocumentUpload token={token} onSubmitted={() => setStep("done")} />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastro enviado</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-brand-graphite dark:text-slate-300">
          Recebemos seu cadastro e seus documentos. Seu coordenador vai
          validar as informações em breve — não é necessário fazer mais nada
          por aqui.
        </p>
      </CardContent>
    </Card>
  );
}
