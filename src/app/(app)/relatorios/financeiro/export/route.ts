import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { personIdsForTerritory } from "@/lib/reports/territory-scope";
import { fetchFinanceiroRows } from "@/lib/reports/financeiro";
import { toCsv, csvResponse } from "@/lib/csv";

const MAX_EXPORT_ROWS = 5000;

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  pago: "Pago",
  rejeitado: "Rejeitado",
  cancelado: "Cancelado",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const supabase = await createClient();

  const personIds = await personIdsForTerritory(supabase, {
    cityId: params.get("cityId") ?? undefined,
    axisId: params.get("axisId") ?? undefined,
    teamId: params.get("teamId") ?? undefined,
  });

  const rows = await fetchFinanceiroRows(
    supabase,
    {
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      type: params.get("type") ?? undefined,
      status: params.get("status") ?? undefined,
      category: params.get("category") ?? undefined,
    },
    personIds,
    MAX_EXPORT_ROWS,
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

  const csv = toCsv(
    ["Data", "Tipo", "Pessoa", "Descrição", "Status", "Valor (R$)"],
    rows.map((r) => [
      new Date(r.date).toLocaleDateString("pt-BR"),
      r.kind,
      personNameById.get(r.personId) ?? "",
      r.description,
      STATUS_LABEL[r.status] ?? r.status,
      (r.amountCents / 100).toFixed(2).replace(".", ","),
    ]),
  );

  return csvResponse("relatorio-financeiro.csv", csv);
}
