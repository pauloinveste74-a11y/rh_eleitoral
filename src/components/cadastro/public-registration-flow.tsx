"use client";

import { useState } from "react";

import { submitPublicRegistration } from "@/app/cadastro/[token]/actions";
import { PersonForm } from "@/components/pessoas/person-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicDocumentUpload } from "./public-document-upload";

type Step = "form" | "upload" | "done";

/**
 * Fluxo do autocadastro público (seção 4 da spec), em 3 etapas dentro da
 * mesma página, sem reload: dados pessoais -> documento(s) -> concluído.
 * `initialStep` reflete o estado real do convite no banco (se o usuário sair
 * e voltar pelo mesmo link, retoma de onde parou em vez de tentar reenviar
 * os dados, que submit_public_registration rejeitaria).
 */
export function PublicRegistrationFlow({
  token,
  initialStep,
}: {
  token: string;
  initialStep: Step;
}) {
  const [step, setStep] = useState<Step>(initialStep);

  if (step === "form") {
    return (
      <PersonForm
        mode="create"
        action={submitPublicRegistration.bind(null, token)}
        submitLabel="Enviar meus dados"
        showSocialName={false}
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
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Recebemos seu cadastro e seus documentos. Seu coordenador vai
          validar as informações em breve — não é necessário fazer mais nada
          por aqui.
        </p>
      </CardContent>
    </Card>
  );
}
