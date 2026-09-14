import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationControls } from "@/components/pessoas/pagination-controls";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Auditoria" };

const PAGE_SIZE = 20;

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, actor_user_id, action, entity_table, entity_id, reason, result, related_request_id, before_data, after_data",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  const trimmedQuery = q?.trim();
  if (trimmedQuery) {
    const safe = trimmedQuery.replace(/[%,()]/g, "");
    query = query.or(`action.ilike.%${safe}%,entity_table.ilike.%${safe}%`);
  }

  const { data: logs, count, error } = await query;

  const actorIds = Array.from(
    new Set((logs ?? []).map((l) => l.actor_user_id).filter((id): id is string => Boolean(id))),
  );
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
      : { data: [] as { id: string; full_name: string; email: string }[] };
  const actorNameById = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email]));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Trilha de auditoria imutável — quem fez o quê, quando."
      />
      <div className="mb-4">
        <form method="get" className="flex gap-2">
          <Input
            type="search"
            name="q"
            placeholder="Buscar por ação ou entidade..."
            defaultValue={q}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>
      <Card>
        <CardContent className="p-0 sm:p-0">
          {error ? (
            <p className="p-6 text-sm text-red-600" role="alert">
              Não foi possível carregar a auditoria.
            </p>
          ) : (
            <div className="p-6">
              {(logs ?? []).length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nenhum evento de auditoria encontrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/hora</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs ?? []).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(log.occurred_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {log.actor_user_id
                            ? (actorNameById.get(log.actor_user_id) ?? "—")
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.action}</TableCell>
                        <TableCell>
                          {log.entity_table}
                          {log.entity_id && (
                            <span className="block font-mono text-xs text-slate-400">
                              {log.entity_id}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.result === "sucesso" ? "success" : "destructive"}>
                            {log.result}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.before_data || log.after_data || log.reason ? (
                            <details>
                              <summary className="cursor-pointer text-sm text-slate-500 hover:underline dark:text-slate-400">
                                Ver
                              </summary>
                              <div className="mt-2 flex max-w-xs flex-col gap-1 text-xs">
                                {log.reason && (
                                  <p>
                                    <span className="font-medium">Motivo:</span> {log.reason}
                                  </p>
                                )}
                                {log.before_data && (
                                  <pre className="overflow-x-auto rounded bg-slate-100 p-2 dark:bg-slate-900">
                                    {JSON.stringify(log.before_data, null, 2)}
                                  </pre>
                                )}
                                {log.after_data && (
                                  <pre className="overflow-x-auto rounded bg-slate-100 p-2 dark:bg-slate-900">
                                    {JSON.stringify(log.after_data, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </details>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <PaginationControls
                basePath="/auditoria"
                q={q}
                page={page}
                totalPages={totalPages}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
