import type { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type PersonStatus = Database["public"]["Tables"]["people"]["Row"]["status"];

export const PERSON_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  documentos_pendentes: "Documentos pendentes",
  documentos_enviados: "Documentos enviados",
  ocr_processado: "OCR processado",
  cadastro_divergente: "Cadastro divergente",
  pendente_validacao_cidade: "Pendente validação (cidade)",
  pendente_validacao_eixo: "Pendente validação (eixo)",
  aprovado: "Aprovado",
  contrato_pendente: "Contrato pendente",
  contrato_enviado: "Contrato enviado",
  contrato_assinado: "Contrato assinado",
  assinatura_pendente_validacao: "Assinatura pendente de validação",
  ativo: "Ativo",
  suspenso: "Suspenso",
  desligado: "Desligado",
  rejeitado: "Rejeitado",
  arquivado: "Arquivado",
  // Etapa 2 (migração 0013) — fluxo de autocadastro/validação do gestor.
  aguardando_gestor: "Aguardando gestor",
  em_conferencia: "Em conferência",
  correcao_solicitada: "Correção solicitada",
  reenviado: "Reenviado",
  divergente: "Divergente",
  aprovado_gestor: "Aprovado pelo gestor",
  aguardando_rh: "Aguardando RH",
  validado: "Validado",
};

export interface PessoasFilters {
  from?: string;
  to?: string;
  status?: string; // "todos" ou um status específico
}

export interface PersonRow {
  id: string;
  fullName: string;
  socialName: string | null;
  cpf: string;
  status: string;
  createdAt: string;
}

/** Contagem de pessoas por status — respeita período e território, mas não o filtro de status (funil completo). */
export async function fetchPeopleStatusCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: Pick<PessoasFilters, "from" | "to">,
  personIds: string[] | null,
): Promise<Record<string, number>> {
  if (personIds !== null && personIds.length === 0) return {};

  let q = supabase.from("people").select("status");
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`);
  if (personIds !== null) q = q.in("id", personIds);
  const { data } = await q;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}

export async function fetchPeopleRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: PessoasFilters,
  personIds: string[] | null,
  limit: number,
): Promise<PersonRow[]> {
  if (personIds !== null && personIds.length === 0) return [];

  let q = supabase
    .from("people")
    .select("id, full_name, social_name, cpf, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59`);
  if (personIds !== null) q = q.in("id", personIds);
  if (
    filters.status &&
    filters.status !== "todos" &&
    filters.status in PERSON_STATUS_LABEL
  ) {
    q = q.eq("status", filters.status as PersonStatus);
  }

  const { data } = await q;
  return (data ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    socialName: p.social_name,
    cpf: p.cpf,
    status: p.status,
    createdAt: p.created_at,
  }));
}
