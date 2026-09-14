import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { personIdsForTerritory } from "@/lib/reports/territory-scope";
import { fetchPeopleRows, PERSON_STATUS_LABEL } from "@/lib/reports/pessoas";
import { formatCpf } from "@/lib/validations/cpf";
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

  const rows = await fetchPeopleRows(
    supabase,
    {
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      status: params.get("status") ?? undefined,
    },
    personIds,
    MAX_EXPORT_ROWS,
  );

  const csv = toCsv(
    ["Nome", "CPF", "Status", "Cadastrado em"],
    rows.map((p) => [
      p.socialName || p.fullName,
      formatCpf(p.cpf),
      PERSON_STATUS_LABEL[p.status] ?? p.status,
      new Date(p.createdAt).toLocaleDateString("pt-BR"),
    ]),
  );

  return csvResponse("relatorio-pessoas.csv", csv);
}
