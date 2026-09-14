import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentList, type PaymentRow } from "@/components/financeiro/payment-list";

export const metadata: Metadata = { title: "Financeiro" };

export default async function FinanceiroPage() {
  const supabase = await createClient();

  const [{ data: isAdmin }, { data: isFinanceiro }, { data: isTesouraria }, { data: payments }] =
    await Promise.all([
      supabase.rpc("is_admin"),
      supabase.rpc("has_role", { role_codes: ["financeiro"] }),
      supabase.rpc("has_role", { role_codes: ["tesouraria"] }),
      supabase
        .from("payments")
        .select(
          "id, person_id, batch_id, amount_cents, description, status, payment_date, created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

  const personIds = Array.from(new Set((payments ?? []).map((p) => p.person_id)));
  const batchIds = Array.from(
    new Set((payments ?? []).map((p) => p.batch_id).filter((id): id is string => Boolean(id))),
  );

  const [{ data: people }, { data: batches }] = await Promise.all([
    personIds.length > 0
      ? supabase.from("people").select("id, full_name, social_name").in("id", personIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; social_name: string | null }[] }),
    batchIds.length > 0
      ? supabase.from("payment_batches").select("id, reference_period").in("id", batchIds)
      : Promise.resolve({ data: [] as { id: string; reference_period: string }[] }),
  ]);

  const personNameById = new Map(
    (people ?? []).map((p) => [p.id, p.social_name || p.full_name]),
  );
  const batchPeriodById = new Map((batches ?? []).map((b) => [b.id, b.reference_period]));

  const rows: PaymentRow[] = (payments ?? []).map((p) => ({
    id: p.id,
    personName: personNameById.get(p.person_id) ?? "—",
    amountCents: p.amount_cents,
    description: p.description,
    status: p.status,
    date: new Date(p.payment_date ?? p.created_at).toLocaleDateString("pt-BR"),
    batchPeriod: p.batch_id ? (batchPeriodById.get(p.batch_id) ?? null) : null,
  }));

  const canCreate = Boolean(isAdmin || isFinanceiro);
  const canDecide = Boolean(isAdmin || isTesouraria);
  const canCancel = Boolean(isAdmin || isFinanceiro);

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Pagamentos avulsos e em lote às pessoas da campanha."
      />
      {canCreate && (
        <div className="mb-4 flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/financeiro/lote/novo">Novo lote</Link>
          </Button>
          <Button asChild>
            <Link href="/financeiro/novo">Novo pagamento</Link>
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="p-6">
          <PaymentList rows={rows} canCancel={canCancel} canDecide={canDecide} />
        </CardContent>
      </Card>
    </>
  );
}
