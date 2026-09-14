import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { personIdsForTerritory } from "@/lib/reports/territory-scope";
import { fetchApprovalRows } from "@/lib/reports/aprovacoes";
import { toCsv, csvResponse } from "@/lib/csv";

const MAX_EXPORT_ROWS = 5000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = await createClient();

  const personIds = await personIdsForTerritory(supabase, {
    cityId: params.get("cityId") ?? undefined,
    axisId: params.get("axisId") ?? undefined,
    teamId: params.get("teamId") ?? undefined,
  });

  const rows = await fetchApprovalRows(
    supabase,
    {
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      decision: params.get("decision") ?? undefined,
    },
    personIds,
    MAX_EXPORT_ROWS,
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

  const csv = toCsv(
    ["Data/hora", "Pessoa", "Decisão", "Etapa anterior", "Autor", "Motivo"],
    rows.map((r) => [
      new Date(r.occurredAt).toLocaleString("pt-BR"),
      r.personId ? (personNameById.get(r.personId) ?? "") : "",
      r.decision === "aprovar" ? "Aprovado" : "Rejeitado",
      r.beforeStatus ?? "",
      r.actorUserId ? (actorNameById.get(r.actorUserId) ?? "") : "",
      r.reason ?? "",
    ]),
  );

  return csvResponse("relatorio-aprovacoes.csv", csv);
}
