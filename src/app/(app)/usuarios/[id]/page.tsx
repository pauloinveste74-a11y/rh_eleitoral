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
import { AssignRoleForm } from "@/components/usuarios/assign-role-form";
import { RemoveRoleButton } from "@/components/usuarios/remove-role-button";
import { ToggleStatusButton } from "@/components/usuarios/toggle-status-button";

export const metadata: Metadata = { title: "Usuário" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  ativo: "success",
  suspenso: "warning",
  inativo: "secondary",
};

export default async function UsuarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });
  if (!canManage) {
    return (
      <>
        <PageHeader title="Usuário" />
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, status")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const [{ data: roleAssignments }, { data: roles }, { data: axes }, { data: cities }, { data: teams }] =
    await Promise.all([
      supabase
        .from("profile_roles")
        .select("id, role_id, axis_id, city_id, team_id, valid_from, valid_until")
        .eq("profile_id", id)
        .order("valid_from", { ascending: false }),
      supabase.from("roles").select("id, code, name").order("name"),
      supabase.from("axes").select("id, name").order("name"),
      supabase.from("cities").select("id, name").order("name"),
      supabase.from("teams").select("id, name").order("name"),
    ]);

  const roleNameById = new Map((roles ?? []).map((r) => [r.id, r.name]));
  const axisNameById = new Map((axes ?? []).map((a) => [a.id, a.name]));
  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));
  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title={profile.full_name} description={profile.email} />

      <Card className="mb-6">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">Status:</span>
            <Badge variant={STATUS_VARIANT[profile.status] ?? "secondary"}>
              {profile.status}
            </Badge>
          </div>
          <ToggleStatusButton profileId={profile.id} status={profile.status} />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Atribuir papel</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignRoleForm
            profileId={profile.id}
            roles={(roles ?? []).map((r) => ({ code: r.code, name: r.name }))}
            axes={axes ?? []}
            cities={cities ?? []}
            teams={teams ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Papéis atuais</CardTitle>
        </CardHeader>
        <CardContent>
          {(roleAssignments ?? []).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhum papel atribuído ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Papel</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Válido de</TableHead>
                  <TableHead>Válido até</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(roleAssignments ?? []).map((ra) => {
                  const isCurrent =
                    ra.valid_from <= today && (!ra.valid_until || ra.valid_until >= today);
                  const scope =
                    [
                      ra.axis_id && axisNameById.get(ra.axis_id),
                      ra.city_id && cityNameById.get(ra.city_id),
                      ra.team_id && teamNameById.get(ra.team_id),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—";
                  return (
                    <TableRow key={ra.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {roleNameById.get(ra.role_id) ?? "—"}
                      </TableCell>
                      <TableCell>{scope}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(ra.valid_from).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {ra.valid_until
                          ? new Date(ra.valid_until).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isCurrent ? "success" : "secondary"}>
                          {isCurrent ? "Vigente" : "Expirado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <RemoveRoleButton profileRoleId={ra.id} profileId={profile.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
