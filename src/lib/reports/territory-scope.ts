import type { createClient } from "@/lib/supabase/server";

export interface TerritoryFilter {
  cityId?: string;
  axisId?: string;
  teamId?: string;
}

/**
 * Resolve o conjunto de pessoas cujo vínculo organizacional VIGENTE bate
 * com os filtros de território informados (usado pelos relatórios da Fase
 * 8 para filtrar por eixo/cidade/equipe tabelas — payments, expenses,
 * audit_logs — que não têm essas colunas diretamente).
 *
 * Retorna `null` quando nenhum filtro de território foi passado (sinal de
 * "não restringir por território"), e um array (possivelmente vazio,
 * quando o filtro não bate com ninguém) caso contrário.
 *
 * Limitação conhecida: reflete o vínculo VIGENTE hoje, não o vínculo no
 * momento de um evento passado (um pagamento ou uma decisão de aprovação
 * antiga pode ter sido feita quando a pessoa estava em outra cidade/eixo).
 */
export async function personIdsForTerritory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filter: TerritoryFilter,
): Promise<string[] | null> {
  if (!filter.cityId && !filter.axisId && !filter.teamId) return null;

  let query = supabase
    .from("organizational_assignments")
    .select("person_id")
    .eq("status", "vigente");
  if (filter.cityId) query = query.eq("city_id", filter.cityId);
  if (filter.axisId) query = query.eq("axis_id", filter.axisId);
  if (filter.teamId) query = query.eq("team_id", filter.teamId);

  const { data } = await query;
  return Array.from(new Set((data ?? []).map((r) => r.person_id)));
}
