import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { PersonForm } from "@/components/pessoas/person-form";

export const metadata: Metadata = { title: "Nova pessoa" };

export default function NovaPessoaPage() {
  return (
    <>
      <PageHeader
        title="Nova pessoa"
        description="Dados pessoais são obrigatórios; endereço, dados bancários e eleitorais podem ser completados depois."
      />
      <PersonForm mode="create" />
    </>
  );
}
