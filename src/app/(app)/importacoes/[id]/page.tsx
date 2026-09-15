import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ConfirmImportBatchButton,
  CancelImportBatchButton,
  RevertImportBatchButton,
} from "@/components/importacoes/import-batch-actions";
import { formatCpf } from "@/lib/validations/cpf";

export const metadata: Metadata = { title: "Prévia da importação" };

const RESULT_LABEL: Record<string, string> = {
  pronta: "Pronta para importar",
  importada: "Importada",
  invalida: "Inválida",
  duplicada_arquivo: "Duplicada no arquivo",
  ja_existente: "CPF já existe",
};

const RESULT_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  pronta: "secondary",
  importada: "success",
  invalida: "destructive",
  duplicada_arquivo: "warning",
  ja_existente: "warning",
};

export default async function ImportacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: batch }, { data: rows }] = await Promise.all([
    supabase.from("import_batches").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("import_staging_records")
      .select("id, row_number, raw_data, result, person_id")
      .eq("batch_id", id)
      .order("row_number"),
  ]);

  if (!batch) {
    notFound();
  }

  const stagingIds = (rows ?? []).map((r) => r.id);
  const { data: rowErrors } =
    stagingIds.length > 0
      ? await supabase
          .from("import_row_errors")
          .select("staging_record_id, field_name, error_message")
          .in("staging_record_id", stagingIds)
      : { data: [] as { staging_record_id: string; field_name: string | null; error_message: string }[] };

  const errorsByStaging = new Map<string, string[]>();
  for (const e of rowErrors ?? []) {
    const list = errorsByStaging.get(e.staging_record_id) ?? [];
    list.push(e.field_name ? `${e.field_name}: ${e.error_message}` : e.error_message);
    errorsByStaging.set(e.staging_record_id, list);
  }

  return (
    <>
      <PageHeader
        title={batch.original_file_name}
        description="Prévia da importação — revise as linhas antes de confirmar."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
              <div>
                <div className="text-brand-graphite dark:text-slate-400">Total</div>
                <div className="text-lg font-semibold">{batch.total_rows}</div>
              </div>
              <div>
                <div className="text-brand-graphite dark:text-slate-400">Prontas</div>
                <div className="text-lg font-semibold">{batch.valid_rows}</div>
              </div>
              <div>
                <div className="text-brand-graphite dark:text-slate-400">Duplicadas</div>
                <div className="text-lg font-semibold">{batch.duplicate_rows}</div>
              </div>
              <div>
                <div className="text-brand-graphite dark:text-slate-400">Inválidas</div>
                <div className="text-lg font-semibold">{batch.rejected_rows}</div>
              </div>
              <div>
                <div className="text-brand-graphite dark:text-slate-400">Importadas</div>
                <div className="text-lg font-semibold">{batch.imported_rows}</div>
              </div>
            </div>
            {batch.status === "preview" && (
              <div className="flex flex-wrap gap-3">
                <ConfirmImportBatchButton batchId={batch.id} />
                <CancelImportBatchButton batchId={batch.id} />
              </div>
            )}
            {batch.status === "confirmado" && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-emerald-600" role="status">
                  Importação confirmada em{" "}
                  {batch.confirmed_at
                    ? new Date(batch.confirmed_at).toLocaleString("pt-BR")
                    : "—"}
                  . As pessoas importadas entram como rascunho — complete o
                  cadastro em{" "}
                  <a href="/pessoas" className="underline underline-offset-4">
                    Pessoas
                  </a>
                  .
                </p>
                <RevertImportBatchButton batchId={batch.id} />
              </div>
            )}
            {batch.status === "cancelado" && (
              <p className="text-sm text-brand-graphite dark:text-slate-400">
                Esta importação foi cancelada — nenhuma pessoa foi criada.
              </p>
            )}
            {batch.status === "revertido" && (
              <p className="text-sm text-brand-graphite dark:text-slate-400">
                Esta importação foi revertida em{" "}
                {batch.reverted_at
                  ? new Date(batch.reverted_at).toLocaleString("pt-BR")
                  : "—"}{" "}
                — as pessoas criadas por ela foram removidas.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linhas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rows ?? []).map((row) => {
                    const raw = row.raw_data as Record<string, string> | null;
                    const errors = errorsByStaging.get(row.id) ?? [];
                    return (
                      <TableRow key={row.id}>
                        <TableCell>{row.row_number}</TableCell>
                        <TableCell className="font-medium text-brand-navy dark:text-slate-50">
                          {raw?.fullName || "—"}
                        </TableCell>
                        <TableCell>
                          {raw?.cpf ? formatCpf(raw.cpf.replace(/\D/g, "")) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={RESULT_VARIANT[row.result] ?? "secondary"}>
                            {RESULT_LABEL[row.result] ?? row.result}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-brand-graphite dark:text-slate-400">
                          {errors.length > 0 ? errors.join("; ") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
