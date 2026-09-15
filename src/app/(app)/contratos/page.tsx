import type { Metadata } from "next";
import Link from "next/link";

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
import {
  GenerateContractForm,
  type ActiveTemplateVersion,
} from "@/components/contratos/generate-contract-form";
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_VARIANT } from "@/lib/validations/contract";

export const metadata: Metadata = { title: "Contratos" };

export default async function ContratosPage() {
  const supabase = await createClient();
  const { data: canPj } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });

  const [
    { data: contracts },
    { data: activeVersionRows },
    { data: activeTemplates },
    { data: people },
    { data: legalEntities },
    { data: jobFunctions },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, person_id, legal_entity_id, status, generated_at, value_cents")
      .order("generated_at", { ascending: false }),
    supabase.from("template_versions").select("id, contract_template_id").eq("status", "ativo"),
    supabase.from("contract_templates").select("id, name, contract_type").eq("status", "ativo"),
    supabase.from("people").select("id, full_name").eq("status", "ativo").order("full_name"),
    canPj
      ? supabase.from("legal_entities").select("id, company_name").eq("status", "ativo").order("company_name")
      : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
    supabase.from("job_functions").select("id, name").eq("status", "ativa").order("name"),
  ]);

  // Junção feita em JS (mesmo padrão de /validacoes e /painel) em vez de
  // embed do PostgREST — evita depender de metadata de FK na tipagem.
  const templatesById = new Map((activeTemplates ?? []).map((t) => [t.id, t]));

  const personIds = (contracts ?? []).map((c) => c.person_id).filter((id): id is string => Boolean(id));
  const legalEntityIds = (contracts ?? [])
    .map((c) => c.legal_entity_id)
    .filter((id): id is string => Boolean(id));

  const [{ data: contractPeople }, { data: contractLegalEntities }] = await Promise.all([
    personIds.length > 0
      ? supabase.from("people").select("id, full_name").in("id", personIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    legalEntityIds.length > 0
      ? supabase.from("legal_entities").select("id, company_name").in("id", legalEntityIds)
      : Promise.resolve({ data: [] as { id: string; company_name: string }[] }),
  ]);

  const peopleById = new Map((contractPeople ?? []).map((p) => [p.id, p.full_name]));
  const legalEntitiesById = new Map((contractLegalEntities ?? []).map((e) => [e.id, e.company_name]));

  const versionsForForm: ActiveTemplateVersion[] = (activeVersionRows ?? [])
    .map((v) => {
      const template = templatesById.get(v.contract_template_id);
      if (!template) return null;
      return {
        id: v.id,
        templateName: template.name,
        contractType: template.contract_type,
      };
    })
    .filter((v): v is ActiveTemplateVersion => v !== null);

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Geração individual a partir de modelos versionados (spec seção 12)."
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
            Gerar contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateContractForm
            activeVersions={versionsForForm}
            people={(people ?? []).map((p) => ({ id: p.id, fullName: p.full_name }))}
            legalEntities={(legalEntities ?? []).map((e) => ({ id: e.id, companyName: e.company_name }))}
            jobFunctions={jobFunctions ?? []}
          />
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Não achou o modelo que precisa?{" "}
            <Link href="/contratos/modelos" className="underline underline-offset-4">
              Gerencie os modelos aqui
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {(contracts ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhum contrato gerado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contratado</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(contracts ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-50">
                      <Link href={`/contratos/${c.id}`} className="hover:underline">
                        {c.person_id
                          ? peopleById.get(c.person_id) ?? "—"
                          : legalEntitiesById.get(c.legal_entity_id ?? "") ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {new Date(c.generated_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={CONTRACT_STATUS_VARIANT[c.status] ?? "secondary"}>
                        {CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                      </Badge>
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
