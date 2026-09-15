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
import { InviteUserForm } from "@/components/usuarios/invite-user-form";

export const metadata: Metadata = { title: "Usuários" };

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary"> = {
  ativo: "success",
  suspenso: "warning",
  inativo: "secondary",
};

export default async function UsuariosPage() {
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Usuários"
          description="Gestão de usuários e papéis de acesso do sistema."
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

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, status")
    .order("full_name");

  const profileIds = (profiles ?? []).map((p) => p.id);
  const { data: profileRoles } =
    profileIds.length > 0
      ? await supabase
          .from("profile_roles")
          .select("profile_id, role_id, valid_from, valid_until")
          .in("profile_id", profileIds)
      : { data: [] as { profile_id: string; role_id: string; valid_from: string; valid_until: string | null }[] };

  const { data: roles } = await supabase.from("roles").select("id, code, name");
  const roleNameById = new Map((roles ?? []).map((r) => [r.id, r.name]));

  const today = new Date().toISOString().slice(0, 10);
  const rolesByProfile = new Map<string, string[]>();
  for (const pr of profileRoles ?? []) {
    const isCurrent = pr.valid_from <= today && (!pr.valid_until || pr.valid_until >= today);
    if (!isCurrent) continue;
    const list = rolesByProfile.get(pr.profile_id) ?? [];
    list.push(roleNameById.get(pr.role_id) ?? "—");
    rolesByProfile.set(pr.profile_id, list);
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Convide pessoas para o sistema e atribua papéis de acesso (RH, financeiro, coordenador de cidade/eixo etc.)."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <InviteUserForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {(profiles ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
              Nenhum usuário cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profiles ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-brand-navy dark:text-slate-50">
                      <Link href={`/usuarios/${p.id}`} className="hover:underline">
                        {p.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      {p.phone || <span className="text-brand-graphite/60">—</span>}
                    </TableCell>
                    <TableCell>
                      {(rolesByProfile.get(p.id) ?? []).length === 0 ? (
                        <span className="text-brand-graphite/60">Sem papel atribuído</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {rolesByProfile.get(p.id)!.map((name, i) => (
                            <Badge key={i} variant="secondary">
                              {name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[p.status] ?? "secondary"}>{p.status}</Badge>
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
