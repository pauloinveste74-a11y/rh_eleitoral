import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getExpenseReceiptSignedUrl } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseList, type ExpenseRow } from "@/components/despesas/expense-list";
import { computeAlcadaStatus } from "@/lib/expenses/alcada";

export const metadata: Metadata = { title: "Despesas" };

export default async function DespesasPage() {
  const supabase = await createClient();

  const [{ data: isAdmin }, { data: isFinanceiro }, { data: isTesouraria }, { data: expenses }] =
    await Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("has_role", { role_codes: ["financeiro"] }),
      supabase.rpc("has_role", { role_codes: ["tesouraria"] }),
      supabase
        .from("expenses")
        .select(
          "id, person_id, category, amount_cents, requested_amount_cents, authorized_amount_cents, expense_date, receipt_storage_path, status, protocol, authorizer_name_snapshot, unidentified_authorizer, unidentified_authorizer_name, authorized_by_profile_id",
        )
        .order("expense_date", { ascending: false }),
    ]);

  const personIds = Array.from(new Set((expenses ?? []).map((e) => e.person_id)));
  const { data: people } =
    personIds.length > 0
      ? await supabase.from("people").select("id, full_name, social_name").in("id", personIds)
      : { data: [] as { id: string; full_name: string; social_name: string | null }[] };

  const personNameById = new Map(
    (people ?? []).map((p) => [p.id, p.social_name || p.full_name]),
  );

  // Indicador de alçada (Etapa 8/9, só informativo): vínculos de papel
  // vigentes de cada autorizador (com o escopo de eixo/cidade de cada
  // vínculo) + regras da campanha (por papel+escopo ou por pessoa
  // específica), pra comparar contra o valor pedido — ver
  // src/lib/expenses/alcada.ts.
  const authorizerIds = Array.from(
    new Set(
      (expenses ?? [])
        .map((e) => e.authorized_by_profile_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const [{ data: authorizerRoles }, { data: rules }] = await Promise.all([
    authorizerIds.length > 0
      ? supabase
          .from("profile_roles")
          .select("profile_id, role_id, axis_id, city_id")
          .in("profile_id", authorizerIds)
      : Promise.resolve({
          data: [] as {
            profile_id: string;
            role_id: string;
            axis_id: string | null;
            city_id: string | null;
          }[],
        }),
    supabase
      .from("expense_authorization_rules")
      .select("role_id, profile_id, axis_id, city_id, max_amount_cents"),
  ]);
  const assignmentsByProfile = new Map<
    string,
    { role_id: string; axis_id: string | null; city_id: string | null }[]
  >();
  for (const pr of authorizerRoles ?? []) {
    const list = assignmentsByProfile.get(pr.profile_id) ?? [];
    list.push({ role_id: pr.role_id, axis_id: pr.axis_id, city_id: pr.city_id });
    assignmentsByProfile.set(pr.profile_id, list);
  }

  const rows: ExpenseRow[] = await Promise.all(
    (expenses ?? []).map(async (e) => ({
      id: e.id,
      personName: personNameById.get(e.person_id) ?? "—",
      category: e.category,
      amountCents: e.amount_cents,
      authorizedAmountCents: e.authorized_amount_cents,
      expenseDate: e.expense_date,
      status: e.status,
      receiptUrl: await getExpenseReceiptSignedUrl(e.receipt_storage_path),
      protocol: e.protocol,
      authorizerName: e.authorizer_name_snapshot ?? e.unidentified_authorizer_name,
      unidentifiedAuthorizer: e.unidentified_authorizer,
      alcadaStatus: e.authorized_by_profile_id
        ? computeAlcadaStatus(
            e.requested_amount_cents ?? e.amount_cents,
            e.authorized_by_profile_id,
            assignmentsByProfile.get(e.authorized_by_profile_id) ?? [],
            rules ?? [],
          )
        : null,
    })),
  );

  const canCreate = Boolean(isAdmin || isFinanceiro);
  const canDecide = Boolean(isAdmin || isTesouraria);
  const canCancel = Boolean(isAdmin || isFinanceiro);

  return (
    <>
      <PageHeader
        title="Despesas"
        description="Reembolso de gastos de pessoas da equipe, com comprovante e autorizador de registro."
      />
      <div className="mb-4 flex justify-end gap-2">
        {isAdmin && (
          <Button variant="outline" asChild>
            <Link href="/despesas/alcadas">Configurar alçadas</Link>
          </Button>
        )}
        {canCreate && (
          <Button asChild>
            <Link href="/despesas/novo">Nova despesa</Link>
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-6">
          <ExpenseList rows={rows} canCancel={canCancel} canDecide={canDecide} />
        </CardContent>
      </Card>
    </>
  );
}
