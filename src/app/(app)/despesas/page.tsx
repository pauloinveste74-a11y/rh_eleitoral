import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { getExpenseReceiptSignedUrl } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpenseList, type ExpenseRow } from "@/components/despesas/expense-list";

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
          "id, person_id, category, amount_cents, expense_date, receipt_storage_path, status, protocol, authorizer_name_snapshot, unidentified_authorizer, unidentified_authorizer_name",
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

  const rows: ExpenseRow[] = await Promise.all(
    (expenses ?? []).map(async (e) => ({
      id: e.id,
      personName: personNameById.get(e.person_id) ?? "—",
      category: e.category,
      amountCents: e.amount_cents,
      expenseDate: e.expense_date,
      status: e.status,
      receiptUrl: await getExpenseReceiptSignedUrl(e.receipt_storage_path),
      protocol: e.protocol,
      authorizerName: e.authorizer_name_snapshot ?? e.unidentified_authorizer_name,
      unidentifiedAuthorizer: e.unidentified_authorizer,
    })),
  );

  const canCreate = Boolean(isAdmin || isFinanceiro);
  const canDecide = Boolean(isAdmin || isTesouraria);
  const canCancel = Boolean(isAdmin || isFinanceiro);

  return (
    <>
      <PageHeader
        title="Despesas"
        description="Reembolso de gastos de pessoas da equipe, com comprovante."
      />
      {canCreate && (
        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link href="/despesas/novo">Nova despesa</Link>
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="p-6">
          <ExpenseList rows={rows} canCancel={canCancel} canDecide={canDecide} />
        </CardContent>
      </Card>
    </>
  );
}
