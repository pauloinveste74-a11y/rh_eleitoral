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
import { formatCnpj } from "@/lib/validations/cnpj";
import { AddOrganizationAdminForm } from "@/components/master/add-organization-admin-form";
import { EditOrganizationForm } from "@/components/master/edit-organization-form";
import {
  EnterOrganizationButton,
  LinkSelfButton,
  OrganizationStatusActions,
} from "@/components/master/organization-actions";

export const metadata: Metadata = { title: "Organização" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  ativa: "success",
  encerrada: "warning",
  arquivada: "destructive",
};

export default async function OrganizacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: isMaster } = await supabase.rpc("is_platform_admin");
  if (!isMaster) {
    return (
      <>
        <PageHeader title="Organização" description="" />
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

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, name, slug, document_number, legal_name, trade_name, phone, email, status")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = user
    ? await supabase.from("profiles").select("campaign_id").eq("id", user.id).maybeSingle()
    : { data: null };
  const isSelfLinked = myProfile?.campaign_id === campaign.id;

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, status")
    .eq("campaign_id", campaign.id)
    .order("full_name");

  const memberIds = (members ?? []).map((m) => m.id);
  const { data: memberRoles } =
    memberIds.length > 0
      ? await supabase
          .from("profile_roles")
          .select("profile_id, role_id")
          .in("profile_id", memberIds)
          .eq("campaign_id", campaign.id)
      : { data: [] as { profile_id: string; role_id: string }[] };

  const { data: roles } = await supabase.from("roles").select("id, name");
  const roleNameById = new Map((roles ?? []).map((r) => [r.id, r.name]));
  const rolesByMember = new Map<string, string[]>();
  for (const mr of memberRoles ?? []) {
    const list = rolesByMember.get(mr.profile_id) ?? [];
    list.push(roleNameById.get(mr.role_id) ?? "—");
    rolesByMember.set(mr.profile_id, list);
  }

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={
          campaign.document_number
            ? `CNPJ ${formatCnpj(campaign.document_number)}`
            : "Organização sem CNPJ cadastrado"
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da organização</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-brand-graphite dark:text-slate-400">
                Slug: <span className="font-medium">{campaign.slug}</span>
              </span>
              <Badge variant={STATUS_VARIANT[campaign.status] ?? "secondary"}>
                {campaign.status}
              </Badge>
            </div>
            <EditOrganizationForm
              campaignId={campaign.id}
              defaultValues={{
                name: campaign.name,
                documentNumber: campaign.document_number,
                legalName: campaign.legal_name,
                tradeName: campaign.trade_name,
                phone: campaign.phone,
                email: campaign.email,
              }}
            />
            <div className="flex flex-wrap items-start gap-3 border-t border-border-default pt-4 dark:border-slate-800">
              <EnterOrganizationButton campaignId={campaign.id} />
              <OrganizationStatusActions
                campaignId={campaign.id}
                status={campaign.status as "ativa" | "encerrada" | "arquivada"}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Administradores e usuários</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!isSelfLinked && <LinkSelfButton campaignId={campaign.id} />}
            <AddOrganizationAdminForm campaignId={campaign.id} />
            {(members ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-brand-graphite dark:text-slate-400">
                Nenhum usuário nesta organização ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papéis</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(members ?? []).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-brand-navy dark:text-slate-50">
                        {m.full_name}
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>
                        {(rolesByMember.get(m.id) ?? []).length === 0 ? (
                          <span className="text-brand-graphite/60">Sem papel atribuído</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {rolesByMember.get(m.id)!.map((name, i) => (
                              <Badge key={i} variant="secondary">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{m.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
