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
import { formatCnpj } from "@/lib/validations/cnpj";
import { CreateOrganizationForm } from "@/components/master/create-organization-form";

export const metadata: Metadata = { title: "Organizações" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  ativa: "success",
  encerrada: "warning",
  arquivada: "destructive",
};

export default async function OrganizacoesPage() {
  const supabase = await createClient();

  const { data: isMaster } = await supabase.rpc("is_platform_admin");

  if (!isMaster) {
    return (
      <>
        <PageHeader
          title="Organizações"
          description="Cadastro e administração de organizações (multi-tenant)."
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-brand-graphite dark:text-slate-400">
              Você não tem permissão para acessar esta área — restrita ao
              administrador master da plataforma.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, document_number, status, created_at")
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase.from("profiles").select("campaign_id");
  const countByCampaign = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (!p.campaign_id) continue;
    countByCampaign.set(p.campaign_id, (countByCampaign.get(p.campaign_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Organizações"
        description="Cadastre novas organizações (CNPJ) e o primeiro administrador de cada uma. Cada organização enxerga só a própria campanha — o login exige CNPJ + e-mail + senha."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <CreateOrganizationForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {(campaigns ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
              Nenhuma organização cadastrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(campaigns ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-brand-navy dark:text-slate-50">
                      <Link href={`/master/organizacoes/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {c.document_number ? (
                        formatCnpj(c.document_number)
                      ) : (
                        <span className="text-brand-graphite/60">Sem CNPJ</span>
                      )}
                    </TableCell>
                    <TableCell>{countByCampaign.get(c.id) ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>{c.status}</Badge>
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
