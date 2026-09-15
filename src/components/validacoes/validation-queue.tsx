import { Fragment } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCpf } from "@/lib/validations/cpf";
import type { ValidationActionState } from "@/app/(app)/validacoes/action-state";
import { ValidationDecisionForm } from "./validation-decision-form";
import { DocumentReviewList, type ReviewableDocument } from "./document-review-list";

export type ValidationQueueRow = {
  id: string;
  fullName: string;
  cpf: string;
  origin: "autocadastro" | "administrativo" | "importacao_excel";
  /** Data de referência da linha (enviado em / aprovado pelo gestor em, conforme `dateLabel`). */
  date: string | null;
  /** Documentos ativos da pessoa — classificação inline (Nova versão, Etapa 4). */
  documents: ReviewableDocument[];
};

const ORIGIN_LABEL: Record<ValidationQueueRow["origin"], string> = {
  autocadastro: "Autocadastro",
  administrativo: "Cadastro administrativo",
  importacao_excel: "Importação em lote",
};

export function ValidationQueue({
  rows,
  emptyMessage,
  dateLabel,
  decisionAction,
  primaryLabel,
  primaryValue,
  documentDecisionAction,
}: {
  rows: ValidationQueueRow[];
  emptyMessage: string;
  dateLabel: string;
  decisionAction: (
    submissionId: string,
  ) => (
    prevState: ValidationActionState,
    formData: FormData,
  ) => Promise<ValidationActionState>;
  primaryLabel: string;
  primaryValue: string;
  documentDecisionAction: (
    documentId: string,
  ) => (
    prevState: ValidationActionState,
    formData: FormData,
  ) => Promise<ValidationActionState>;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>CPF</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>{dateLabel}</TableHead>
          <TableHead>Decisão</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <Fragment key={row.id}>
            <TableRow>
              <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                {row.fullName}
              </TableCell>
              <TableCell>{row.cpf ? formatCpf(row.cpf) : "—"}</TableCell>
              <TableCell>{ORIGIN_LABEL[row.origin]}</TableCell>
              <TableCell>
                {row.date ? new Date(row.date).toLocaleDateString("pt-BR") : "—"}
              </TableCell>
              <TableCell>
                <ValidationDecisionForm
                  action={decisionAction(row.id)}
                  primaryLabel={primaryLabel}
                  primaryValue={primaryValue}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={5} className="bg-slate-50/60 dark:bg-slate-900/40">
                <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Documentos
                </p>
                <DocumentReviewList
                  documents={row.documents}
                  decideAction={documentDecisionAction}
                />
              </TableCell>
            </TableRow>
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
