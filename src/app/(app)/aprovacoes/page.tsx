import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApprovalQueue,
  type ApprovalQueueRow,
} from "@/components/aprovacoes/approval-queue";

export const metadata: Metadata = { title: "Aprovações" };

export default async function AprovacoesPage() {
  const supabase = await createClient();

  const [
    { data: people },
    { data: assignments },
    { data: cities },
    { data: axes },
  ] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, cpf, status")
      .in("status", ["pendente_validacao_cidade", "pendente_validacao_eixo"])
      .order("full_name"),
    supabase
      .from("organizational_assignments")
      .select("person_id, city_id, axis_id")
      .eq("status", "vigente"),
    supabase.from("cities").select("id, name"),
    supabase.from("axes").select("id, name"),
  ]);

  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));
  const axisNameById = new Map((axes ?? []).map((a) => [a.id, a.name]));
  const assignmentByPerson = new Map(
    (assignments ?? []).map((a) => [a.person_id, a]),
  );

  const cityQueue: ApprovalQueueRow[] = [];
  const axisQueue: ApprovalQueueRow[] = [];

  for (const person of people ?? []) {
    const assignment = assignmentByPerson.get(person.id);
    if (person.status === "pendente_validacao_cidade") {
      cityQueue.push({
        id: person.id,
        fullName: person.full_name,
        cpf: person.cpf,
        locationLabel: assignment?.city_id
          ? (cityNameById.get(assignment.city_id) ?? "—")
          : "—",
      });
    } else if (person.status === "pendente_validacao_eixo") {
      axisQueue.push({
        id: person.id,
        fullName: person.full_name,
        cpf: person.cpf,
        locationLabel: assignment?.axis_id
          ? (axisNameById.get(assignment.axis_id) ?? "—")
          : "—",
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Aprovações"
        description="Validação de cadastro de pessoa por cidade e por eixo."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pendente de validação — cidade</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="p-6">
              <ApprovalQueue
                rows={cityQueue}
                emptyMessage="Nenhuma pessoa pendente de validação de cidade."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pendente de validação — eixo</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="p-6">
              <ApprovalQueue
                rows={axisQueue}
                emptyMessage="Nenhuma pessoa pendente de validação de eixo."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
