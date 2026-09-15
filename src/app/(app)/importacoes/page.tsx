import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportUploadForm } from "@/components/importacoes/import-upload-form";

export const metadata: Metadata = { title: "Importação de pessoas" };

const STATUS_LABEL: Record<string, string> = {
  staging: "Processando",
  preview: "Aguardando confirmação",
  confirmado: "Confirmado",
  revertido: "Revertido",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  staging: "secondary",
  preview: "warning",
  confirmado: "success",
  revertido: "destructive",
  cancelado: "destructive",
};

export default async function ImportacoesPage() {
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Importação de pessoas"
          description="Importação em lote por planilha Excel."
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Você não tem permissão para acessar esta área — restrita a
              administrador e RH.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const { data: batches } = await supabase
    .from("import_batches")
    .select("id, original_file_name, status, total_rows, valid_rows, duplicate_rows, rejected_rows, imported_rows, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Importação de pessoas"
        description="Cadastre várias pessoas de uma vez a partir de uma planilha Excel — nada vira cadastro oficial antes de você revisar e confirmar a prévia."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <ImportUploadForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {(batches ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma importação feita ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linhas</TableHead>
                  <TableHead>Enviado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(batches ?? []).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                      <Link href={`/importacoes/${b.id}`} className="hover:underline">
                        {b.original_file_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[b.status] ?? "secondary"}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.total_rows} total
                      {b.status === "confirmado"
                        ? ` · ${b.imported_rows} importada(s)`
                        : ` · ${b.valid_rows} pronta(s) · ${b.duplicate_rows} duplicada(s) · ${b.rejected_rows} inválida(s)`}
                    </TableCell>
                    <TableCell>
                      {new Date(b.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
