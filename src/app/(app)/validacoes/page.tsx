import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPersonDocumentSignedUrl } from "@/app/(app)/pessoas/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ValidationQueue,
  type ValidationQueueRow,
} from "@/components/validacoes/validation-queue";
import type { ReviewableDocument } from "@/components/validacoes/document-review-list";
import {
  decideRegistrationSubmission,
  decideRhValidation,
  decidePersonDocument,
} from "./actions";
import type { RegistrationSubmissionStatus } from "@/types/database";

export const metadata: Metadata = { title: "Validações" };

type SubmissionRow = {
  id: string;
  person_id: string;
  origin: "autocadastro" | "administrativo" | "importacao_excel";
  submitted_at: string | null;
  validated_at: string | null;
};

async function loadQueue(
  supabase: Awaited<ReturnType<typeof createClient>>,
  status: RegistrationSubmissionStatus,
  excludePersonId: string | null,
): Promise<ValidationQueueRow[]> {
  const { data: submissions } = await supabase
    .from("registration_submissions")
    .select("id, person_id, origin, submitted_at, validated_at")
    .eq("status", status)
    .order("submitted_at", { ascending: true });

  const pending = ((submissions ?? []) as SubmissionRow[]).filter(
    (s) => !excludePersonId || s.person_id !== excludePersonId,
  );

  const personIds = pending.map((s) => s.person_id);
  const [{ data: people }, { data: documents }] =
    personIds.length > 0
      ? await Promise.all([
          supabase.from("people").select("id, full_name, cpf").in("id", personIds),
          supabase
            .from("person_documents")
            .select("id, person_id, document_type, file_name, storage_path, review_status")
            .in("person_id", personIds)
            .eq("status", "ativo")
            .order("created_at", { ascending: true }),
        ])
      : [
          { data: [] as { id: string; full_name: string; cpf: string }[] },
          { data: [] as Array<{
              id: string;
              person_id: string;
              document_type: string;
              file_name: string;
              storage_path: string;
              review_status: string | null;
            }> },
        ];
  const personById = new Map((people ?? []).map((p) => [p.id, p]));

  // URLs assinadas (60s, mesma expiração de getPersonDocumentSignedUrl) —
  // geradas em paralelo, uma por documento visível na fila.
  const documentsByPerson = new Map<string, ReviewableDocument[]>();
  await Promise.all(
    (documents ?? []).map(async (doc) => {
      const signedUrl = await getPersonDocumentSignedUrl(doc.storage_path);
      const list = documentsByPerson.get(doc.person_id) ?? [];
      list.push({
        id: doc.id,
        documentType: doc.document_type as ReviewableDocument["documentType"],
        fileName: doc.file_name,
        reviewStatus: (doc.review_status ?? "pendente") as ReviewableDocument["reviewStatus"],
        signedUrl,
      });
      documentsByPerson.set(doc.person_id, list);
    }),
  );

  return pending.map((s) => ({
    id: s.id,
    fullName: personById.get(s.person_id)?.full_name ?? "—",
    cpf: personById.get(s.person_id)?.cpf ?? "",
    origin: s.origin,
    date: status === "aprovado_gestor" ? s.validated_at : s.submitted_at,
    documents: documentsByPerson.get(s.person_id) ?? [],
  }));
}

export default async function ValidacoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: isManager }] = await Promise.all([
    supabase.from("profiles").select("person_id").eq("id", user.id).maybeSingle(),
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
  ]);
  const ownPersonId = profile?.person_id ?? null;

  // RLS (registration_submissions_select) já restringe o que volta aqui —
  // administrador/rh vê toda a campanha, coordenador só o que é
  // manager_person_id dele. Exclui a própria submissão da lista: esta tela
  // é pra decidir sobre a equipe/organização, não sobre o próprio cadastro
  // (isso é /meu-cadastro).
  const gestorRows = await loadQueue(
    supabase,
    "aguardando_validacao_gestor",
    ownPersonId,
  );

  // Fila do RH só é consultada (e só aparece) pra quem tem o papel — evita
  // uma query e uma seção vazias pro coordenador comum.
  const rhRows = isManager
    ? await loadQueue(supabase, "aprovado_gestor", ownPersonId)
    : [];

  return (
    <>
      <PageHeader
        title="Validações"
        description="Cadastros enviados pela sua equipe ou já aprovados pelo gestor, aguardando decisão."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Minha equipe</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ValidationQueue
              rows={gestorRows}
              emptyMessage="Nenhum cadastro da sua equipe aguardando validação."
              dateLabel="Enviado em"
              decisionAction={(id) => decideRegistrationSubmission.bind(null, id)}
              primaryLabel="Aprovar"
              primaryValue="aprovar"
              documentDecisionAction={(id) => decidePersonDocument.bind(null, id)}
            />
          </CardContent>
        </Card>

        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle>Validação do RH</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ValidationQueue
                rows={rhRows}
                emptyMessage="Nenhum cadastro aguardando validação do RH."
                dateLabel="Aprovado pelo gestor em"
                decisionAction={(id) => decideRhValidation.bind(null, id)}
                primaryLabel="Validar"
                primaryValue="validar"
                documentDecisionAction={(id) => decidePersonDocument.bind(null, id)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
