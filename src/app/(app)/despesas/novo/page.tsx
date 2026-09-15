import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { ExpenseForm } from "@/components/despesas/expense-form";
import { formatCpf } from "@/lib/validations/cpf";

export const metadata: Metadata = { title: "Nova despesa" };

export default async function NovaDespesaPage() {
  const supabase = await createClient();

  const [{ data: people }, { data: categories }, { data: profiles }] = await Promise.all([
    supabase
      .from("people")
      .select("id, full_name, social_name, cpf")
      .eq("status", "ativo")
      .order("full_name"),
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("status", "ativa")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("status", "ativo")
      .order("full_name"),
  ]);

  const peopleOptions = (people ?? []).map((p) => ({
    id: p.id,
    name: `${p.social_name || p.full_name} — ${formatCpf(p.cpf)}`,
  }));
  const categoryOptions = (categories ?? []).map((c) => ({ id: c.id, name: c.name }));
  const profileOptions = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.full_name || p.email,
  }));

  return (
    <>
      <PageHeader
        title="Nova despesa"
        description="Registre o reembolso de um gasto de uma pessoa ativa, com comprovante e o autorizador de registro."
      />
      <ExpenseForm people={peopleOptions} categories={categoryOptions} profiles={profileOptions} />
    </>
  );
}
