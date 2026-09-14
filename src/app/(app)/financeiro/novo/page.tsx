import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PaymentForm } from "@/components/financeiro/payment-form";
import { formatCpf } from "@/lib/validations/cpf";

export const metadata: Metadata = { title: "Novo pagamento" };

export default async function NovoPagamentoPage() {
  const supabase = await createClient();
  const { data: people } = await supabase
    .from("people")
    .select("id, full_name, social_name, cpf")
    .eq("status", "ativo")
    .order("full_name");

  const options = (people ?? []).map((p) => ({
    id: p.id,
    name: `${p.social_name || p.full_name} — ${formatCpf(p.cpf)}`,
  }));

  return (
    <>
      <PageHeader
        title="Novo pagamento"
        description="Lance um pagamento avulso para uma pessoa ativa."
      />
      <PaymentForm people={options} />
    </>
  );
}
