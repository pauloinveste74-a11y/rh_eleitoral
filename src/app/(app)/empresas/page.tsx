import type { Metadata } from "next";

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
import { LegalEntityForm } from "@/components/empresas/legal-entity-form";
import { formatCnpj } from "@/lib/validations/cnpj";

export const metadata: Metadata = { title: "Empresas (PJ)" };

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "destructive"> = {
  rascunho: "secondary",
  ativo: "success",
  suspenso: "warning",
  arquivado: "destructive",
};

export default async function EmpresasPage() {
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Empresas (PJ)"
          description="Cadastro-mestre de prestadores de serviço pessoa jurídica."
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-brand-graphite dark:text-slate-400">
              Você não tem permissão para acessar esta área — restrita a
              administrador e RH.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const { data: entities } = await supabase
    .from("legal_entities")
    .select("id, company_name, trade_name, cnpj, legal_representative_name, status")
    .order("company_name");

  return (
    <>
      <PageHeader
        title="Empresas (PJ)"
        description="Cadastro-mestre de prestadores de serviço pessoa jurídica — endereço, dados bancários e documentos societários ficam para uma etapa futura."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <LegalEntityForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {(entities ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
              Nenhuma empresa cadastrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão social</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Representante legal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entities ?? []).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium text-brand-navy dark:text-slate-50">
                      {e.trade_name || e.company_name}
                      {e.trade_name && (
                        <span className="block text-xs font-normal text-brand-graphite/60">
                          {e.company_name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatCnpj(e.cnpj)}</TableCell>
                    <TableCell>{e.legal_representative_name}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[e.status] ?? "secondary"}>
                        {STATUS_LABEL[e.status] ?? e.status}
                      </Badge>
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
