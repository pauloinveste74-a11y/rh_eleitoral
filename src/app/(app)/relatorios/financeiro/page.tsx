import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { personIdsForTerritory } from "@/lib/reports/territory-scope";
import {
  fetchFinanceiroRows,
  EXPENSE_CATEGORY_LABEL,
} from "@/lib/reports/financeiro";
import { formatCentsAsBRL } from "@/lib/validations/payment";
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

export const metadata: Metadata = { title: "Relatório financeiro" };

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  rejeitado: "Rejeitado",
  cancelado: "Cancelado",
};
const CATEGORY_LABEL = EXPENSE_CATEGORY_LABEL;
const MAX_ROWS = 500;

interface SearchParams {
  from?: string;
  to?: string;
  type?: string; // todos | pagamento | despesa
  status?: string; // todos | pendente | pago | rejeitado | cancelado
  category?: string; // todas | combustivel | ...
  axisId?: string;
  cityId?: string;
  teamId?: string;
}

export default async function RelatorioFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const type = params.type || "todos";
  const status = params.status || "todos";
  const category = params.category || "todas";

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

  const rows = await fetchFinanceiroRows(
    supabase,
    { from: params.from, to: params.to, type, status, category },
    personIds,
    MAX_ROWS,
  );

  const personIdsInRows = Array.from(new Set(rows.map((r) => r.personId)));
  const { data: people } =
    personIdsInRows.length > 0
      ? await supabase
          .from("people")
          .select("id, full_name, social_name")
          .in("id", personIdsInRows)
      : { data: [] as { id: string; full_name: string; social_name: string | null }[] };
  const personNameById = new Map(
    (people ?? []).map((p) => [p.id, p.social_name || p.full_name]),
  );

  const totalPago = rows
    .filter((r) => r.status === "pago")
    .reduce((sum, r) => sum + r.amountCents, 0);
  const totalPendente = rows
    .filter((r) => r.status === "pendente")
    .reduce((sum, r) => sum + r.amountCents, 0);
  const totalRejeitadoCancelado = rows
    .filter((r) => r.status === "rejeitado" || r.status === "cancelado")
    .reduce((sum, r) => sum + r.amountCents, 0);

  const exportQs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => Boolean(v)) as [string, string][],
  ).toString();

  return (
    <>
      <PageHeader
        title="Relatório financeiro"
        description="Pagamentos e despesas, filtrados por período, status, categoria e território. Data considerada: lançamento (created_at)."
      />

      <Card className="mb-6">
        <CardContent className="p-6">
          <form method="get" className="flex flex-wrap items-end gap-4">
            <DateRangeFields from={params.from} to={params.to} />
            <div className="flex flex-col gap-1">
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" name="type" defaultValue={type}>
                <option value="todos">Todos</option>
                <option value="pagamento">Pagamento</option>
                <option value="despesa">Despesa</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="rejeitado">Rejeitado</option>
                <option value="cancelado">Cancelado</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="category">Categoria (despesas)</Label>
              <Select id="category" name="category" defaultValue={category}>
                <option value="todas">Todas</option>
                {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
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
                <a href="/relatorios/financeiro">Limpar</a>
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={`/relatorios/financeiro/export?${exportQs}`}>
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
            { label: "Total pago", value: formatCentsAsBRL(totalPago) },
            { label: "Total pendente", value: formatCentsAsBRL(totalPendente) },
            {
              label: "Rejeitado/cancelado",
              value: formatCentsAsBRL(totalRejeitadoCancelado),
            },
            { label: "Lançamentos", value: String(rows.length) },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-6">
          {rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-brand-graphite dark:text-slate-400">
              Nenhum lançamento encontrado para os filtros selecionados.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={`${r.kind}-${r.id}`}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{r.kind}</TableCell>
                      <TableCell>{personNameById.get(r.personId) ?? "—"}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === "pago"
                              ? "success"
                              : r.status === "pendente"
                                ? "warning"
                                : "destructive"
                          }
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCentsAsBRL(r.amountCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length === MAX_ROWS && (
                <p className="pt-4 text-xs text-brand-graphite dark:text-slate-400">
                  Mostrando os {MAX_ROWS} lançamentos mais recentes. Use
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
