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
import { TeamInviteForm } from "@/components/minha-equipe/team-invite-form";
import type { RegistrationInviteStatus } from "@/types/database";

export const metadata: Metadata = { title: "Minha equipe" };

const STATUS_LABEL: Record<RegistrationInviteStatus, string> = {
  criado: "Aguardando abertura",
  enviado: "Enviado",
  acessado: "Link aberto",
  em_preenchimento: "Preenchendo cadastro",
  concluido: "Cadastro enviado",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<
  RegistrationInviteStatus,
  "success" | "warning" | "secondary" | "destructive"
> = {
  criado: "secondary",
  enviado: "secondary",
  acessado: "warning",
  em_preenchimento: "warning",
  concluido: "success",
  expirado: "destructive",
  cancelado: "destructive",
};

export default async function MinhaEquipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("person_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.person_id) {
    return (
      <>
        <PageHeader
          title="Minha equipe"
          description="Convide os cabos eleitorais da sua equipe para o autocadastro."
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete{" "}
              <Link href="/meu-cadastro" className="underline underline-offset-4">
                o seu próprio cadastro
              </Link>{" "}
              antes de convidar sua equipe.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const { data: invites } = await supabase
    .from("registration_invites")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  const personIds = (invites ?? [])
    .map((i) => i.person_id)
    .filter((id): id is string => Boolean(id));

  const { data: people } =
    personIds.length > 0
      ? await supabase
          .from("people")
          .select("id, full_name, status")
          .in("id", personIds)
      : { data: [] as { id: string; full_name: string; status: string }[] };

  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  return (
    <>
      <PageHeader
        title="Minha equipe"
        description="Convide os cabos eleitorais da sua equipe para o autocadastro — cada um recebe um link próprio, sem precisar de login."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <TeamInviteForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {(invites ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum convite criado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Pessoa cadastrada</TableHead>
                  <TableHead>Status do convite</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invites ?? []).map((invite) => {
                  const person = invite.person_id
                    ? personById.get(invite.person_id)
                    : undefined;
                  return (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                        {invite.contact_name || (
                          <span className="text-slate-400">Sem nome</span>
                        )}
                        {invite.contact_phone && (
                          <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                            {invite.contact_phone}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {person?.full_name ?? (
                          <span className="text-slate-400">
                            Ainda não preenchido
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[invite.status]}>
                          {STATUS_LABEL[invite.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(invite.created_at).toLocaleDateString("pt-BR")}
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
