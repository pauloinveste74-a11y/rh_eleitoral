import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  ValidationQueue,
  type ValidationQueueRow,
} from "@/components/validacoes/validation-queue";

export const metadata: Metadata = { title: "Validações" };

export default async function ValidacoesPage() {
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
  const ownPersonId = profile?.person_id ?? null;

  // RLS (registration_submissions_select) já restringe o que volta aqui a
  // administrador/rh (toda a campanha), à própria pessoa (person_id) e ao
  // gestor dela (manager_person_id) — filtra fora só a própria submissão:
  // esta tela é pra decidir sobre a equipe, não sobre o próprio cadastro
  // (isso é /meu-cadastro).
  const { data: submissions } = await supabase
    .from("registration_submissions")
    .select("id, person_id, origin, submitted_at")
    .eq("status", "aguardando_validacao_gestor")
    .order("submitted_at", { ascending: true });

  const pending = (submissions ?? []).filter(
    (s) => !ownPersonId || s.person_id !== ownPersonId,
  );

  const personIds = pending.map((s) => s.person_id);
  const { data: people } =
    personIds.length > 0
      ? await supabase
          .from("people")
          .select("id, full_name, cpf")
          .in("id", personIds)
      : { data: [] as { id: string; full_name: string; cpf: string }[] };
  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  const rows: ValidationQueueRow[] = pending.map((s) => ({
    id: s.id,
    fullName: personById.get(s.person_id)?.full_name ?? "—",
    cpf: personById.get(s.person_id)?.cpf ?? "",
    origin: s.origin,
    submittedAt: s.submitted_at,
  }));

  return (
    <>
      <PageHeader
        title="Validações"
        description="Cadastros enviados pela sua equipe, aguardando sua decisão — aprove, rejeite ou solicite correção."
      />
      <Card>
        <CardContent className="p-6">
          <ValidationQueue rows={rows} />
        </CardContent>
      </Card>
    </>
  );
}
