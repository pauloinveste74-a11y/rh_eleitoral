import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TemplateForm } from "@/components/contratos/template-form";
import { PublishVersionForm } from "@/components/contratos/publish-version-form";
import { LegalApprovalForm } from "@/components/contratos/legal-approval-form";
import { contractTypeLabels } from "@/lib/validations/contract";

export const metadata: Metadata = { title: "Modelos de contrato" };

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  ativo: "Ativo",
  inativo: "Inativo",
};
const STATUS_VARIANT: Record<string, "success" | "secondary" | "destructive"> = {
  rascunho: "secondary",
  ativo: "success",
  inativo: "destructive",
};
const LEGAL_LABEL: Record<string, string> = {
  pendente: "Aprovação jurídica pendente",
  aprovado: "Aprovado juridicamente",
  reprovado: "Reprovado juridicamente",
};
const LEGAL_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  pendente: "warning",
  aprovado: "success",
  reprovado: "destructive",
};

export default async function ContratoModelosPage() {
  const supabase = await createClient();

  const [{ data: canManage }, { data: canApprove }] = await Promise.all([
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
    supabase.rpc("has_role", { role_codes: ["administrador", "juridico"] }),
  ]);

  if (!canManage && !canApprove) {
    return (
      <>
        <PageHeader
          title="Modelos de contrato"
          description="Modelos versionados por tipo de contratado."
        />
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Você não tem permissão para acessar esta área — restrita a
              administrador, RH e jurídico.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  const [{ data: templates }, { data: versions }, { data: jobFunctions }] = await Promise.all([
    supabase
      .from("contract_templates")
      .select("id, name, contract_type, status, legal_approval_status, legal_approval_note")
      .order("name"),
    supabase
      .from("template_versions")
      .select("id, contract_template_id, version_number, status, valid_from, valid_until")
      .order("version_number", { ascending: false }),
    supabase.from("job_functions").select("id, name").eq("status", "ativa").order("name"),
  ]);

  const versionsByTemplate = new Map<string, typeof versions>();
  for (const v of versions ?? []) {
    const list = versionsByTemplate.get(v.contract_template_id) ?? [];
    list.push(v);
    versionsByTemplate.set(v.contract_template_id, list);
  }

  return (
    <>
      <PageHeader
        title="Modelos de contrato"
        description="Modelos versionados por tipo de contratado (spec seção 12.1) — alterações num modelo não afetam contratos já gerados."
      />

      {canManage && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <TemplateForm jobFunctions={jobFunctions ?? []} />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        {(templates ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum modelo cadastrado ainda.
            </CardContent>
          </Card>
        ) : (
          (templates ?? []).map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {t.name}{" "}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    ({contractTypeLabels[t.contract_type]})
                  </span>
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </Badge>
                  <Badge variant={LEGAL_VARIANT[t.legal_approval_status] ?? "secondary"}>
                    {LEGAL_LABEL[t.legal_approval_status] ?? t.legal_approval_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {t.legal_approval_note && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Observação jurídica: {t.legal_approval_note}
                  </p>
                )}

                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Versões
                  </p>
                  {(versionsByTemplate.get(t.id) ?? []).length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Nenhuma versão publicada ainda.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                      {(versionsByTemplate.get(t.id) ?? []).map((v) => (
                        <li key={v.id} className="flex items-center gap-2">
                          <span>v{v.version_number}</span>
                          <Badge variant={v.status === "ativo" ? "success" : "secondary"}>
                            {v.status === "ativo" ? "Ativa" : v.status === "substituido" ? "Substituída" : "Rascunho"}
                          </Badge>
                          <span className="text-slate-500 dark:text-slate-400">
                            vigente desde {new Date(v.valid_from).toLocaleDateString("pt-BR")}
                            {v.valid_until && ` até ${new Date(v.valid_until).toLocaleDateString("pt-BR")}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {canManage && (
                  <PublishVersionForm contractTemplateId={t.id} contractType={t.contract_type} />
                )}
                {canApprove && <LegalApprovalForm contractTemplateId={t.id} />}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
