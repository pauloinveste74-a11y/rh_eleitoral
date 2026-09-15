import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPersonDocumentSignedUrl } from "@/app/(app)/pessoas/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContractPrintView } from "@/components/contratos/contract-print-view";
import { UploadSignedContractForm } from "@/components/contratos/upload-signed-contract-form";
import { ContractDecisionForm } from "@/components/contratos/contract-decision-form";
import { SendContractAccess } from "@/components/contratos/send-contract-access";
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_VARIANT } from "@/lib/validations/contract";

export const metadata: Metadata = { title: "Contrato" };

export default async function ContratoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!contract) {
    notFound();
  }

  const [{ data: profile }, { data: isManager }, { data: signedDocs }] = await Promise.all([
    supabase.from("profiles").select("person_id").eq("id", user.id).maybeSingle(),
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
    supabase
      .from("contract_documents")
      .select("id, file_name, storage_path, created_at")
      .eq("contract_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const ownPersonId = profile?.person_id ?? null;
  const isOwnContract = contract.person_id !== null && contract.person_id === ownPersonId;

  let isCoordinatorOfTarget = false;
  if (!isOwnContract && ownPersonId && contract.person_id) {
    const { data: rel } = await supabase
      .from("coordination_relationships")
      .select("id")
      .eq("coordinator_person_id", ownPersonId)
      .eq("subordinate_person_id", contract.person_id)
      .eq("status", "vigente")
      .maybeSingle();
    isCoordinatorOfTarget = Boolean(rel);
  }

  let targetName = "—";
  if (contract.person_id) {
    const { data: person } = await supabase
      .from("people")
      .select("full_name")
      .eq("id", contract.person_id)
      .maybeSingle();
    targetName = person?.full_name ?? "—";
  } else if (contract.legal_entity_id) {
    const { data: entity } = await supabase
      .from("legal_entities")
      .select("company_name")
      .eq("id", contract.legal_entity_id)
      .maybeSingle();
    targetName = entity?.company_name ?? "—";
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select(
      "name, legal_name, document_number, email, phone, representative_name, representative_cpf, zip_code, street, number, complement, neighborhood, city, state",
    )
    .eq("id", contract.campaign_id)
    .maybeSingle();

  const docsWithUrl = await Promise.all(
    (signedDocs ?? []).map(async (d) => ({
      ...d,
      signedUrl: await getPersonDocumentSignedUrl(d.storage_path),
    })),
  );

  // Convenção de path — igual à RLS de contratos-documentos (migração
  // 0032): campaign_id/person_id/... pra PF (self/gestor); pra PJ, como só
  // administrador/rh acessa mesmo, o segundo segmento não precisa
  // corresponder a nada específico.
  const storagePathPrefix = contract.person_id
    ? `${contract.campaign_id}/${contract.person_id}`
    : `${contract.campaign_id}/pj`;

  // Quem pode enviar a assinatura: administrador/rh, a própria pessoa, ou o
  // coordenador direto dela — mesmo conjunto de submit_signed_contract().
  // Um auditor consegue VER a página (contracts_select inclui auditor) mas
  // não deve ver o formulário, já que a função rejeitaria a chamada dele.
  const canUploadSigned = isManager || isOwnContract || isCoordinatorOfTarget;
  const canDecide =
    (isManager || isCoordinatorOfTarget) && contract.status === "assinado_enviado";

  return (
    <>
      <PageHeader
        title={`Contrato — ${targetName}`}
        description="Geração, download, envio de assinatura e conferência (spec seção 12)."
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold text-brand-navy dark:text-slate-50">
            Documento gerado
          </CardTitle>
          <Badge variant={CONTRACT_STATUS_VARIANT[contract.status] ?? "secondary"}>
            {CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ContractPrintView
            contractId={contract.id}
            body={contract.generated_body}
            organization={
              campaign
                ? {
                    name: campaign.name,
                    legalName: campaign.legal_name,
                    documentNumber: campaign.document_number,
                    email: campaign.email,
                    phone: campaign.phone,
                    representativeName: campaign.representative_name,
                    representativeCpf: campaign.representative_cpf,
                    zipCode: campaign.zip_code,
                    street: campaign.street,
                    number: campaign.number,
                    complement: campaign.complement,
                    neighborhood: campaign.neighborhood,
                    city: campaign.city,
                    state: campaign.state,
                  }
                : null
            }
          />
          {(isManager || isCoordinatorOfTarget) && <SendContractAccess contractId={contract.id} />}
        </CardContent>
      </Card>

      {canUploadSigned && contract.status !== "assinado_e_validado" && contract.status !== "recusado" && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-brand-navy dark:text-slate-50">
              Enviar assinatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-brand-graphite dark:text-slate-400">
              Depois de assinar fora do sistema, envie o PDF (ou foto) de volta aqui.
            </p>
            <UploadSignedContractForm contractId={contract.id} storagePathPrefix={storagePathPrefix} />
          </CardContent>
        </Card>
      )}

      {docsWithUrl.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-brand-navy dark:text-slate-50">
              Assinaturas enviadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {docsWithUrl.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span>
                    {d.file_name} —{" "}
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  {d.signedUrl ? (
                    <a
                      href={d.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-navy underline-offset-4 hover:underline dark:text-slate-50"
                    >
                      Ver arquivo
                    </a>
                  ) : (
                    <span className="text-brand-graphite/60">Indisponível</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {contract.rejection_reason && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <p className="text-sm text-red-600">
              Motivo da última decisão: {contract.rejection_reason}
            </p>
          </CardContent>
        </Card>
      )}

      {canDecide && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-brand-navy dark:text-slate-50">
              Conferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ContractDecisionForm contractId={contract.id} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
