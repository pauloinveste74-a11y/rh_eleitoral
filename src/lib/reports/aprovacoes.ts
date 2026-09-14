import type { createClient } from "@/lib/supabase/server";

export interface AprovacoesFilters {
  from?: string;
  to?: string;
  decision?: string; // todos | aprovar | rejeitar
}

export interface ApprovalRow {
  id: string;
  occurredAt: string;
  decision: "aprovar" | "rejeitar";
  personId: string | null;
  actorUserId: string | null;
  reason: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
}

/**
 * Histórico de decisões de aprovação/rejeição, extraído de audit_logs
 * (ações `pessoa.aprovacao.aprovar`/`pessoa.aprovacao.rejeitar`, gravadas
 * por decide_approval() — ver migração 0006). Não existe uma tabela
 * dedicada de aprovações: audit_logs é a única fonte dessa história.
 *
 * Herda a mesma restrição de leitura de audit_logs (administrador/auditor
 * da campanha, bypass do super admin) — um coordenador de cidade/eixo, que
 * decide aprovações mas não é administrador/auditor, não consegue ver este
 * relatório (ver README, "Riscos e pendências").
 */
export async function fetchApprovalRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: AprovacoesFilters,
  personIds: string[] | null,
  limit: number,
): Promise<ApprovalRow[]> {
  if (personIds !== null && personIds.length === 0) return [];

  let q = supabase
    .from("audit_logs")
    .select("id, occurred_at, action, entity_id, actor_user_id, reason, before_data, after_data")
    .eq("entity_table", "people")
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (filters.from) q = q.gte("occurred_at", filters.from);
  if (filters.to) q = q.lte("occurred_at", `${filters.to}T23:59:59`);
  if (filters.decision === "aprovar") {
    q = q.eq("action", "pessoa.aprovacao.aprovar");
  } else if (filters.decision === "rejeitar") {
    q = q.eq("action", "pessoa.aprovacao.rejeitar");
  } else {
    q = q.in("action", ["pessoa.aprovacao.aprovar", "pessoa.aprovacao.rejeitar"]);
  }
  if (personIds !== null) q = q.in("entity_id", personIds);

  const { data } = await q;
  return (data ?? []).map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    decision: row.action.endsWith("aprovar") ? "aprovar" : "rejeitar",
    personId: row.entity_id,
    actorUserId: row.actor_user_id,
    reason: row.reason,
    beforeStatus:
      row.before_data && typeof row.before_data === "object" && "status" in row.before_data
        ? String((row.before_data as Record<string, unknown>).status)
        : null,
    afterStatus:
      row.after_data && typeof row.after_data === "object" && "status" in row.after_data
        ? String((row.after_data as Record<string, unknown>).status)
        : null,
  }));
}
