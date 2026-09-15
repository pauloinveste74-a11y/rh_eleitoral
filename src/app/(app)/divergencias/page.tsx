import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ConflictCard } from "@/components/divergencias/conflict-card";

export const metadata: Metadata = { title: "Divergências" };

const CONFLICT_TYPE_LABEL: Record<string, string> = {
  pix_divergente: "PIX divergente",
  coordenador_nao_identificado: "Coordenador não identificado",
  cpf_duplicado: "CPF duplicado",
  titulo_duplicado: "Título de eleitor duplicado",
  dado_divergente: "Dado divergente (nome × CPF)",
  autorizador_nao_identificado: "Autorizador não identificado",
  documento_divergente: "Documento divergente (IA)",
  pagamento_divergente_contrato: "Pagamento divergente do contrato",
};

const SEVERITY_RANK: Record<string, number> = {
  critico: 0,
  alto: 1,
  medio: 2,
  baixo: 3,
};

export default async function DivergenciasPage() {
  const supabase = await createClient();

  const { data: canManage } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });

  if (!canManage) {
    return (
      <>
        <PageHeader
          title="Divergências"
          description="Dados que precisam de conferência antes de virar cadastro definitivo."
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conflictsRaw } = await supabase
    .from("data_conflicts")
    .select(
      "id, person_id, conflict_type, details, status, severity, requires_dual_approval, first_approved_by, due_at, created_at",
    )
    .in("status", ["pendente", "em_analise"])
    .order("created_at", { ascending: false });

  const conflicts = [...(conflictsRaw ?? [])].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9),
  );

  const personIds = [...new Set(conflicts.map((c) => c.person_id).filter((id): id is string => !!id))];
  const { data: people } =
    personIds.length > 0
      ? await supabase.from("people").select("id, full_name, cpf").in("id", personIds)
      : { data: [] as { id: string; full_name: string; cpf: string }[] };
  const peopleById = new Map((people ?? []).map((p) => [p.id, p]));

  const { data: documents } =
    personIds.length > 0
      ? await supabase
          .from("person_documents")
          .select("person_id, document_type")
          .in("person_id", personIds)
          .eq("status", "ativo")
          .in("document_type", ["rg", "cnh"])
      : { data: [] as { person_id: string; document_type: string }[] };
  const personIdsWithDocument = new Set((documents ?? []).map((d) => d.person_id));

  return (
    <>
      <PageHeader
        title="Divergências"
        description="Dados que precisam de conferência antes de virar cadastro definitivo — nome × CPF divergente na importação, e (em breve) pagamento fora do previsto no contrato."
      />

      {conflicts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
            Nenhuma divergência pendente.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {conflicts.map((conflict) => (
            <ConflictCard
              key={conflict.id}
              conflict={conflict}
              typeLabel={CONFLICT_TYPE_LABEL[conflict.conflict_type] ?? conflict.conflict_type}
              person={conflict.person_id ? peopleById.get(conflict.person_id) : undefined}
              hasIdentityDocument={!!conflict.person_id && personIdsWithDocument.has(conflict.person_id)}
              currentUserId={user?.id ?? null}
            />
          ))}
        </div>
      )}
    </>
  );
}
