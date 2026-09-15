/**
 * Etapa 8/9 — indicador de alçada (informativo, não bloqueia nada).
 * Compara o valor pedido contra o maior teto entre as regras aplicáveis
 * ao autorizador: regra por pessoa específica (bate direto, ignora
 * papel/escopo) OU regra por papel — nesse caso só bate se o autorizador
 * tiver esse papel vigente E (quando a regra tiver escopo de eixo/cidade)
 * o vínculo dele nesse papel for no mesmo eixo/cidade da regra.
 */
export type AlcadaStatus = "dentro" | "fora" | "sem_regra";

export type AlcadaRule = {
  role_id: string | null;
  profile_id: string | null;
  axis_id: string | null;
  city_id: string | null;
  max_amount_cents: number;
};

export type AuthorizerRoleAssignment = {
  role_id: string;
  axis_id: string | null;
  city_id: string | null;
};

export function computeAlcadaStatus(
  requestedAmountCents: number,
  authorizerProfileId: string,
  authorizerAssignments: AuthorizerRoleAssignment[],
  rules: AlcadaRule[],
): AlcadaStatus {
  const applicable = rules.filter((rule) => {
    if (rule.profile_id) return rule.profile_id === authorizerProfileId;
    if (!rule.role_id) return false;
    return authorizerAssignments.some((a) => {
      if (a.role_id !== rule.role_id) return false;
      if (rule.axis_id && rule.axis_id !== a.axis_id) return false;
      if (rule.city_id && rule.city_id !== a.city_id) return false;
      return true;
    });
  });
  if (applicable.length === 0) return "sem_regra";
  const maxAllowed = Math.max(...applicable.map((r) => r.max_amount_cents));
  return requestedAmountCents <= maxAllowed ? "dentro" : "fora";
}
