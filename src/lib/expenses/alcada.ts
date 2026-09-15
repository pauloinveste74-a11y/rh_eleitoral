/**
 * Etapa 8 — indicador de alçada (informativo, não bloqueia nada). Compara
 * o valor pedido contra o maior teto entre as regras que batem com
 * QUALQUER papel vigente do autorizador — sem considerar o escopo de
 * eixo/cidade da regra (simplificação deliberada: a regra pode ser
 * cadastrada com escopo, mas esta checagem olha só o papel).
 */
export type AlcadaStatus = "dentro" | "fora" | "sem_regra";

export function computeAlcadaStatus(
  requestedAmountCents: number,
  authorizerRoleIds: string[],
  rules: { role_id: string | null; max_amount_cents: number }[],
): AlcadaStatus {
  const applicable = rules.filter(
    (r) => r.role_id && authorizerRoleIds.includes(r.role_id),
  );
  if (applicable.length === 0) return "sem_regra";
  const maxAllowed = Math.max(...applicable.map((r) => r.max_amount_cents));
  return requestedAmountCents <= maxAllowed ? "dentro" : "fora";
}
