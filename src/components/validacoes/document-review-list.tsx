"use client";

import { startTransition, useActionState } from "react";

import { initialValidationActionState } from "@/app/(app)/validacoes/action-state";
import type { ValidationActionState } from "@/app/(app)/validacoes/action-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { documentTypeLabels } from "@/lib/validations/person";

export type ReviewableDocument = {
  id: string;
  documentType: keyof typeof documentTypeLabels;
  fileName: string;
  reviewStatus: "pendente" | "aprovado" | "ilegivel" | "divergente" | null;
  signedUrl: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente de revisão",
  aprovado: "Aprovado",
  ilegivel: "Ilegível",
  divergente: "Divergente",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  pendente: "secondary",
  aprovado: "success",
  ilegivel: "destructive",
  divergente: "destructive",
};

function DocumentRow({
  doc,
  decideAction,
}: {
  doc: ReviewableDocument;
  decideAction: (
    prevState: ValidationActionState,
    formData: FormData,
  ) => Promise<ValidationActionState>;
}) {
  const [state, dispatch, isPending] = useActionState(
    decideAction,
    initialValidationActionState,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const formData = new FormData(event.currentTarget);
    if (submitter?.name === "reviewStatus") {
      formData.set("reviewStatus", submitter.value);
    }
    startTransition(() => {
      dispatch(formData);
    });
  }

  const status = doc.reviewStatus ?? "pendente";

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border-default px-3 py-2 text-sm dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          {documentTypeLabels[doc.documentType] ?? doc.documentType} —{" "}
          {doc.fileName}
        </span>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
          {doc.signedUrl ? (
            <a
              href={doc.signedUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-navy underline-offset-4 hover:underline dark:text-slate-50"
            >
              Ver documento
            </a>
          ) : (
            <span className="text-brand-graphite/60">Indisponível</span>
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
        <Input
          name="rejectionReason"
          placeholder="Motivo (obrigatório para ilegível/divergente)"
          className="max-w-xs"
        />
        <Button
          type="submit"
          name="reviewStatus"
          value="aprovado"
          size="sm"
          disabled={isPending}
        >
          Aprovar
        </Button>
        <Button
          type="submit"
          name="reviewStatus"
          value="ilegivel"
          variant="outline"
          size="sm"
          disabled={isPending}
        >
          Ilegível
        </Button>
        <Button
          type="submit"
          name="reviewStatus"
          value="divergente"
          variant="destructive"
          size="sm"
          disabled={isPending}
        >
          Divergente
        </Button>
      </form>
      {state.status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
    </li>
  );
}

/**
 * Lista os documentos ativos da pessoa da linha, com classificação inline
 * (aprovar/ilegível/divergente — decide_person_document(), migração 0031).
 * Usada dentro de ValidationQueue, uma instância por submissão da fila.
 */
export function DocumentReviewList({
  documents,
  decideAction,
}: {
  documents: ReviewableDocument[];
  decideAction: (
    documentId: string,
  ) => (
    prevState: ValidationActionState,
    formData: FormData,
  ) => Promise<ValidationActionState>;
}) {
  if (documents.length === 0) {
    return (
      <p className="text-xs text-brand-graphite dark:text-slate-400">
        Nenhum documento enviado ainda.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} decideAction={decideAction(doc.id)} />
      ))}
    </ul>
  );
}
