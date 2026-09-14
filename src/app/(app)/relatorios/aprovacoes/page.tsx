import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { personIdsForTerritory } from "@/lib/reports/territory-scope";
import { fetchApprovalRows } from "@/lib/reports/aprovacoes";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SummaryStats } from "@/components/relatorios/summary-stats";
import { DateRangeFields } from "@/components/relatorios/date-range-fields";
import { TerritoryFields } from "@/components/relatorios/territory-fields";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Relatório de aprovações" };

const MAX_ROWS = 500;

interface SearchParams {
  from?: string;
  to?: string;
  decision?: string;
  axisId?: string;
  cityId?: string;
  teamId?: string;
}

export default async function RelatorioAprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const decision = params.decision || "todos";

  const supabase = await createClient();

  const [{ data: axes }, { data: cities }, { data: teams }] = await Promise.all([
    supabase.from("axes").select("id, name").order("name"),
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("teams").select("id, name").order("name"),
  ]);

  const personIds = await personIdsForTerritory(supabase, {
    cityId: params.cityId,
    axisId: params.axisId,
    teamId: params.teamId,
  });

  const rows = await fetchApprovalRows(
    supabase,
    { from: params.from, to: params.to, decision },
    personIds,
    MAX_ROWS,
  );

  const rowPersonIds = Array.from(
    new Set(rows.map((r) => r.personId).filter((id): id is string => Boolean(id))),
  );
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actorUserId).filter((id): id is string => Boolean(id))),
  );
  const [{ data: people }, { data: actors }] = await Promise.all([
    rowPersonIds.length > 0
      ? supabase.from("people").select("id, full_name, social_name").in("id", rowPersonIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; social_name: string | null }[] }),
    actorIds.length > 0
      ? supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
  ]);
  const personNameById = new Map(
    (people ?? []).map((p) => [p.id, p.social_name || p.full_name]),
  );
  const actorNameById = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email]));

  const totalAprovados = rows.filter((r) => r.decision === "aprovar").length;
  const totalRejeitados = rows.filter((r) => r.decision === "rejeitar").length;

  const exportQs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="Relatório de aprovações"
        description="Histórico de decisões de aprovação/rejeição, extraído da auditoria. Filtro de território reflete o vínculo atual da pessoa, não o vínculo no momento da decisão."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <DateRangeFields from={params.from} to={params.to} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="decision">Decisão</Label>
              <Select id="decision" name="decision" defaultValue={decision}>
                <option value="todos">Todas</option>
                <option value="aprovar">Aprovado</option>
                <option value="rejeitar">Rejeitado</option>
              </Select>
            </div>
            <TerritoryFields
              axes={axes ?? []}
              cities={cities ?? []}
              teams={teams ?? []}
              axisId={params.axisId}
              cityId={params.cityId}
              teamId={params.teamId}
            />
            <div className="flex gap-2">
              <Button type="submit">Filtrar</Button>
              <Button type="button" variant="outline" asChild>
                <a href="/relatorios/aprovacoes">Limpar</a>
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={`/relatorios/aprovacoes/export?${exportQs}`}>
                  Exportar CSV
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="mb-6">
        <SummaryStats
          stats={[
            { label: "Aprovados", value: String(totalAprovados) },
            { label: "Rejeitados", value: String(totalRejeitados) },
            { label: "Total de decisões", value: String(rows.length) },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Nenhuma decisão encontrada para os filtros selecionados.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/hora</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Decisão</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.occurredAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {r.personId ? (personNameById.get(r.personId) ?? "—") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.decision === "aprovar" ? "success" : "destructive"}>
                          {r.decision === "aprovar" ? "Aprovado" : "Rejeitado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                        {r.beforeStatus ?? "—"}
                      </TableCell>
                      <TableCell>
                        {r.actorUserId ? (actorNameById.get(r.actorUserId) ?? "—") : "—"}
                      </TableCell>
                      <TableCell>{r.reason ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length === MAX_ROWS && (
                <p className="pt-4 text-xs text-slate-500 dark:text-slate-400">
                  Mostrando as {MAX_ROWS} decisões mais recentes. Use
                  &quot;Exportar CSV&quot; para obter todos os resultados.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
