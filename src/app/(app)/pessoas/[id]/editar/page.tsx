import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPersonDocumentSignedUrl } from "../../actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PersonForm,
  type PersonFormValues,
} from "@/components/pessoas/person-form";
import { PersonDocumentUpload } from "@/components/pessoas/person-document-upload";
import { SendForApprovalCard } from "@/components/pessoas/send-for-approval-card";
import { documentTypeLabels } from "@/lib/validations/person";

export const metadata: Metadata = { title: "Editar pessoa" };

export default async function EditarPessoaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: person },
    { data: address },
    { data: bank },
    { data: electoral },
    { data: documents },
    { data: cities },
  ] = await Promise.all([
    supabase.from("people").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("person_addresses")
      .select("*")
      .eq("person_id", id)
      .maybeSingle(),
    supabase
      .from("person_bank_accounts")
      .select("*")
      .eq("person_id", id)
      .maybeSingle(),
    supabase
      .from("person_electoral_data")
      .select("*")
      .eq("person_id", id)
      .maybeSingle(),
    supabase
      .from("person_documents")
      .select("*")
      .eq("person_id", id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false }),
    supabase.from("cities").select("id, name").order("name"),
  ]);

  if (!person) {
    notFound();
  }

  const defaultValues: Partial<PersonFormValues> = {
    fullName: person.full_name,
    socialName: person.social_name ?? "",
    cpf: person.cpf,
    birthDate: person.birth_date ?? "",
    phone: person.phone ?? "",
    whatsapp: person.whatsapp ?? "",
    email: person.email ?? "",
    zipCode: address?.zip_code ?? "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    neighborhood: address?.neighborhood ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    bankCode: bank?.bank_code ?? "",
    bankName: bank?.bank_name ?? "",
    agency: bank?.agency ?? "",
    agencyDigit: bank?.agency_digit ?? "",
    accountNumber: bank?.account_number ?? "",
    accountDigit: bank?.account_digit ?? "",
    accountType: bank?.account_type ?? "",
    pixKeyType: bank?.pix_key_type ?? "",
    pixKey: bank?.pix_key ?? "",
    voterId: electoral?.voter_id ?? "",
    electoralZone: electoral?.electoral_zone ?? "",
    electoralSection: electoral?.electoral_section ?? "",
    voterCity: electoral?.voter_city ?? "",
    voterState: electoral?.voter_state ?? "",
  };

  const documentsWithUrl = await Promise.all(
    (documents ?? []).map(async (doc) => ({
      ...doc,
      signedUrl: await getPersonDocumentSignedUrl(doc.storage_path),
    })),
  );

  return (
    <>
      <PageHeader
        title={person.social_name || person.full_name}
        description="Edite os dados da pessoa e anexe documentos."
      />
      <div className="flex flex-col gap-6">
        <PersonForm mode="edit" personId={id} defaultValues={defaultValues} />

        <SendForApprovalCard
          personId={id}
          cities={cities ?? []}
          status={person.status}
        />

        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PersonDocumentUpload personId={id} />
            {documentsWithUrl.length === 0 ? (
              <p className="text-sm text-brand-graphite dark:text-slate-400">
                Nenhum documento anexado.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {documentsWithUrl.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm dark:border-slate-800"
                  >
                    <span>
                      {documentTypeLabels[doc.document_type]} — {doc.file_name}
                    </span>
                    {doc.signedUrl ? (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-brand-navy underline-offset-4 hover:underline dark:text-slate-50"
                      >
                        Ver documento
                      </a>
                    ) : (
                      <span className="text-brand-graphite/60">Indisponível</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
