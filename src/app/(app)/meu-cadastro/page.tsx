import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { getPersonDocumentSignedUrl } from "@/app/(app)/pessoas/actions";
import { saveOwnRegistration } from "./actions";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PersonForm,
  type PersonFormValues,
} from "@/components/pessoas/person-form";
import { PersonDocumentUpload } from "@/components/pessoas/person-document-upload";
import { SubmitOwnRegistrationCard } from "@/components/pessoas/submit-own-registration-card";
import { documentTypeLabels } from "@/lib/validations/registration";

export const metadata: Metadata = { title: "Meu cadastro" };

export default async function MeuCadastroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O proxy e o layout do grupo (app) já garantem sessão — chegar aqui sem
  // usuário não deveria acontecer, mas o Server Component confere de novo
  // (segunda camada de defesa, nunca só o proxy).
  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("person_id")
    .eq("id", user.id)
    .maybeSingle();

  const personId = profile?.person_id ?? null;

  const [
    { data: person },
    { data: address },
    { data: bank },
    { data: electoral },
    { data: documents },
    { data: submissions },
  ] = personId
    ? await Promise.all([
        supabase.from("people").select("*").eq("id", personId).maybeSingle(),
        supabase
          .from("person_addresses")
          .select("*")
          .eq("person_id", personId)
          .maybeSingle(),
        supabase
          .from("person_bank_accounts")
          .select("*")
          .eq("person_id", personId)
          .maybeSingle(),
        supabase
          .from("person_electoral_data")
          .select("*")
          .eq("person_id", personId)
          .maybeSingle(),
        supabase
          .from("person_documents")
          .select("*")
          .eq("person_id", personId)
          .eq("status", "ativo")
          .order("created_at", { ascending: false }),
        supabase.from("registration_submissions").select("id").eq("person_id", personId),
      ])
    : [
        { data: null },
        { data: null },
        { data: null },
        { data: null },
        { data: null },
        { data: null },
      ];

  // Etapa 11 — correção pendente (se houver), pra travar no formulário só
  // os campos que o gestor/RH apontou. registration_submissions/
  // correction_requests não têm FK direta pra profiles; join feito em JS.
  const submissionIds = (submissions ?? []).map((s) => s.id);
  const { data: correction } =
    submissionIds.length > 0
      ? await supabase
          .from("correction_requests")
          .select("reason, field_names, requested_at")
          .in("submission_id", submissionIds)
          .is("resolved_at", null)
          .order("requested_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

  const editableFields =
    correction?.field_names && correction.field_names.length > 0
      ? correction.field_names
      : null;

  const defaultValues: Partial<PersonFormValues> | undefined = person
    ? {
        fullName: person.full_name,
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
      }
    : undefined;

  const documentsWithUrl = await Promise.all(
    (documents ?? []).map(async (doc) => ({
      ...doc,
      signedUrl: await getPersonDocumentSignedUrl(doc.storage_path),
    })),
  );

  return (
    <>
      <PageHeader
        title="Meu cadastro"
        description="Preencha seus dados pessoais e anexe seus documentos. Endereço, dados bancários e eleitorais podem ser completados depois."
      />
      <div className="flex flex-col gap-6">
        {correction && (
          <Card className="border-amber-300 dark:border-amber-700">
            <CardHeader>
              <CardTitle>Seu gestor pediu uma correção</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {correction.reason}
              </p>
              {editableFields && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Só os campos apontados estão liberados para edição abaixo —
                  o resto ficou travado.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <PersonForm
          mode={person ? "edit" : "create"}
          defaultValues={defaultValues}
          action={saveOwnRegistration}
          submitLabel="Salvar meus dados"
          showSocialName={false}
          editableFields={editableFields}
        />

        {personId && person && (
          <>
            <SubmitOwnRegistrationCard personId={personId} status={person.status} />

            <Card>
              <CardHeader>
                <CardTitle>Documentos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <PersonDocumentUpload personId={personId} />
                {documentsWithUrl.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nenhum documento anexado.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {documentsWithUrl.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                      >
                        <span>
                          {documentTypeLabels[doc.document_type]} — {doc.file_name}
                        </span>
                        {doc.signedUrl ? (
                          <a
                            href={doc.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-50"
                          >
                            Ver documento
                          </a>
                        ) : (
                          <span className="text-slate-400">Indisponível</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!personId && (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Salve seus dados pessoais acima para liberar o envio de
            documentos e a validação do seu gestor.
          </p>
        )}
      </div>
    </>
  );
}
