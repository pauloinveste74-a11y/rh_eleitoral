import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { PersonForm } from "@/components/pessoas/person-form";

export const metadata: Metadata = { title: "Nova pessoa" };

export default async function NovaPessoaPage() {
  const supabase = await createClient();
  const { data: jobFunctions } = await supabase
    .from("job_functions")
    .select("id, name")
    .eq("status", "ativa")
    .order("name");

  return (
    <>
      <PageHeader
        title="Nova pessoa"
        description="Dados pessoais são obrigatórios; endereço, dados bancários e eleitorais podem ser completados depois."
      />
      <PersonForm mode="create" showExtraFields jobFunctions={jobFunctions ?? []} />
    </>
  );
}
