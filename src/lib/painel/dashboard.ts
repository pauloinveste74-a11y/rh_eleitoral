import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Indicadores do painel — todas as consultas aqui usam o cliente comum
 * (RLS já aplicada, mesmo padrão de /relatorios e /validacoes). Não existe
 * função SECURITY DEFINER nova para este módulo: cada RLS necessária já
 * tinha sido estendida pelas Etapas 2/11 da iniciativa anterior
 * (people_select, registration_submissions_select, correction_requests_select,
 * registration_invites_select) — este arquivo só soma os contadores.
 *
 * `count: "exact", head: true` evita trazer linhas — só o total.
 */

export interface CoordinatorSummary {
  /** Subordinados vigentes (coordination_relationships), ligados a este coordenador. */
  teamCount: number;
  /** Cadastros da equipe aguardando a decisão deste coordenador (fila "Minha equipe" de /validacoes). */
  pendingDecisions: number;
  /** Correções pendentes de resposta pelos liderados (correction_requests não resolvidas). */
  pendingCorrections: number;
  /** Convites criados por este coordenador que ainda não resultaram em cadastro concluído. */
  pendingInvitesSent: number;
}

export async function fetchCoordinatorSummary(
  supabase: SupabaseClient,
  ownProfileId: string,
  ownPersonId: string,
): Promise<CoordinatorSummary> {
  const [
    { count: teamCount },
    { count: pendingDecisions },
    { data: teamSubmissions },
    { data: ownInvites },
  ] = await Promise.all([
    supabase
      .from("coordination_relationships")
      .select("id", { count: "exact", head: true })
      .eq("coordinator_person_id", ownPersonId)
      .eq("status", "vigente"),
    supabase
      .from("registration_submissions")
      .select("id", { count: "exact", head: true })
      .eq("manager_person_id", ownPersonId)
      .eq("status", "aguardando_validacao_gestor"),
    supabase.from("registration_submissions").select("id").eq("manager_person_id", ownPersonId),
    // Filtra convites concluídos/cancelados/expirados em memória (mesmo
    // padrão de /minha-equipe, que já busca todos os convites do coordenador
    // e resolve o resto em JS) em vez de um operador "not in" do PostgREST.
    supabase.from("registration_invites").select("status").eq("created_by", ownProfileId),
  ]);

  const pendingInvitesSent = (ownInvites ?? []).filter(
    (i) => !["concluido", "cancelado", "expirado"].includes(i.status),
  ).length;

  const submissionIds = (teamSubmissions ?? []).map((s) => s.id);
  let pendingCorrections = 0;
  if (submissionIds.length > 0) {
    const { count } = await supabase
      .from("correction_requests")
      .select("id", { count: "exact", head: true })
      .in("submission_id", submissionIds)
      .is("resolved_at", null);
    pendingCorrections = count ?? 0;
  }

  return {
    teamCount: teamCount ?? 0,
    pendingDecisions: pendingDecisions ?? 0,
    pendingCorrections,
    pendingInvitesSent,
  };
}

export interface OrgSummary {
  activePeople: number;
  pendingGestor: number;
  pendingRh: number;
  pendingCorrections: number;
}

/** Visão de campanha inteira — só retorna números diferentes de zero para quem a RLS de fato deixa ver (administrador/rh/auditor). */
export async function fetchOrgSummary(supabase: SupabaseClient): Promise<OrgSummary> {
  const [
    { count: activePeople },
    { count: pendingGestor },
    { count: pendingRh },
    { count: pendingCorrections },
  ] = await Promise.all([
    supabase.from("people").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    supabase
      .from("registration_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_validacao_gestor"),
    supabase
      .from("registration_submissions")
      .select("id", { count: "exact", head: true })
      .eq("status", "aguardando_rh"),
    supabase
      .from("correction_requests")
      .select("id", { count: "exact", head: true })
      .is("resolved_at", null),
  ]);
  return {
    activePeople: activePeople ?? 0,
    pendingGestor: pendingGestor ?? 0,
    pendingRh: pendingRh ?? 0,
    pendingCorrections: pendingCorrections ?? 0,
  };
}

export interface FinanceSummary {
  pendingExpenses: number;
  pendingPayments: number;
}

/** Só relevante pra quem a RLS de expenses/payments deixa ver (administrador/financeiro/tesouraria/auditor). */
export async function fetchFinanceSummary(supabase: SupabaseClient): Promise<FinanceSummary> {
  const [{ count: pendingExpenses }, { count: pendingPayments }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente"),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente"),
  ]);
  return { pendingExpenses: pendingExpenses ?? 0, pendingPayments: pendingPayments ?? 0 };
}

export interface RecentPersonRow {
  id: string;
  fullName: string;
  status: string;
  createdAt: string;
}

/**
 * Últimas pessoas visíveis para o chamador, na ordem de criação — a RLS de
 * `people_select` já resolve o escopo certo pra cada papel (equipe do
 * coordenador, campanha inteira pro admin/rh/auditor, ativos pro
 * financeiro/tesouraria, só a própria pessoa pra quem não tem nenhum papel
 * de gestão).
 */
export async function fetchRecentPeople(
  supabase: SupabaseClient,
  limit: number,
): Promise<RecentPersonRow[]> {
  const { data } = await supabase
    .from("people")
    .select("id, full_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    status: p.status,
    createdAt: p.created_at,
  }));
}
