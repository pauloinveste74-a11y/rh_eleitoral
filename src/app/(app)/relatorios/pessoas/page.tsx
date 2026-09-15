import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { personIdsForTerritory } from "@/lib/reports/territory-scope";
import {
  fetchPeopleStatusCounts,
  fetchPeopleRows,
  PERSON_STATUS_LABEL,
} from "@/lib/reports/pessoas";
import { formatCpf } from "@/lib/validations/cpf";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

export const metadata: Metadata = { title: "Relatório de pessoas" };

const MAX_ROWS = 500;

interface SearchParams {
  from?: string;
  to?: string;
  status?: string;
  axisId?: string;
  cityId?: string;
  teamId?: string;
}

export default async function RelatorioPessoasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = params.status || "todos";

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

  const [counts, rows] = await Promise.all([
    fetchPeopleStatusCounts(supabase, { from: params.from, to: params.to }, personIds),
    fetchPeopleRows(supabase, { from: params.from, to: params.to, status }, personIds, MAX_ROWS),
  ]);

  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const exportQs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="Relatório de pessoas"
        description="Funil por status do cadastro, filtrado por período e território. Data considerada: criação do cadastro."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <DateRangeFields from={params.from} to={params.to} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="todos">Todos</option>
                {Object.entries(PERSON_STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
                <a href="/relatorios/pessoas">Limpar</a>
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={`/relatorios/pessoas/export?${exportQs}`}>Exportar CSV</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="mb-3 text-sm font-medium text-brand-navy dark:text-slate-50">
            Funil por status ({total} pessoa{total === 1 ? "" : "s"})
          </p>
          {total === 0 ? (
            <p className="text-sm text-brand-graphite dark:text-slate-400">
              Nenhuma pessoa encontrada para o período/território selecionado.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(counts)
                .sort(([, a], [, b]) => b - a)
                .map(([statusKey, count]) => (
                  <div key={statusKey} className="flex items-center gap-3">
                    <span className="w-56 shrink-0 text-sm text-brand-graphite dark:text-slate-300">
                      {PERSON_STATUS_LABEL[statusKey] ?? statusKey}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-state-neutral-soft dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-navy dark:bg-slate-50"
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-sm font-medium text-brand-navy dark:text-slate-50">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
              Nenhuma pessoa encontrada para os filtros selecionados.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-brand-navy dark:text-slate-50">
                        {p.socialName || p.fullName}
                      </TableCell>
                      <TableCell>{formatCpf(p.cpf)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PERSON_STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length === MAX_ROWS && (
                <p className="pt-4 text-xs text-brand-graphite dark:text-slate-400">
                  Mostrando as {MAX_ROWS} pessoas mais recentes. Use
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
