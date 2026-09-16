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
import { SendPersonAccess } from "@/components/pessoas/send-person-access";
import { MasterFieldRecord } from "@/components/pessoas/master-field-record";
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
    { data: vehicle },
    { data: engagement },
    { data: documents },
    { data: cities },
    { data: jobFunctions },
    { data: canViewMasterRecord },
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
      .from("person_vehicles")
      .select("*")
      .eq("person_id", id)
      .maybeSingle(),
    supabase
      .from("person_engagement_data")
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
    supabase.from("job_functions").select("id, name").eq("status", "ativa").order("name"),
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
  ]);

  if (!person) {
    notFound();
  }

  type MasterFieldRow = {
    id: string;
    field_name: string;
    value: string | null;
    status: string;
    source: string;
    validated_by: string | null;
    validated_at: string | null;
    updated_at: string;
  };
  type MasterFieldHistoryRow = {
    id: string;
    master_field_value_id: string;
    previous_value: string | null;
    previous_status: string | null;
    new_value: string | null;
    new_status: string;
    changed_by: string | null;
    change_reason: string | null;
    created_at: string;
  };

  let masterFields: MasterFieldRow[] = [];
  const historyByFieldValueId = new Map<string, MasterFieldHistoryRow[]>();
  let actorNameById = new Map<string, string>();

  if (canViewMasterRecord) {
    const { data: fields } = await supabase
      .from("master_field_values")
      .select("id, field_name, value, status, source, validated_by, validated_at, updated_at")
      .eq("person_id", id);
    masterFields = fields ?? [];

    const fieldValueIds = masterFields.map((f) => f.id);
    const { data: history } =
      fieldValueIds.length > 0
        ? await supabase
            .from("master_field_history")
            .select("id, master_field_value_id, previous_value, previous_status, new_value, new_status, changed_by, change_reason, created_at")
            .in("master_field_value_id", fieldValueIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    for (const h of history ?? []) {
      const list = historyByFieldValueId.get(h.master_field_value_id) ?? [];
      list.push(h);
      historyByFieldValueId.set(h.master_field_value_id, list);
    }

    const actorIds = [
      ...new Set([
        ...masterFields.map((f) => f.validated_by).filter((v): v is string => !!v),
        ...(history ?? []).map((h) => h.changed_by).filter((v): v is string => !!v),
      ]),
    ];
    const { data: actors } =
      actorIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
        : { data: [] as { id: string; full_name: string; email: string }[] };
    actorNameById = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email]));
  }

  const defaultValues: Partial<PersonFormValues> = {
    fullName: person.full_name,
    socialName: person.social_name ?? "",
    cpf: person.cpf,
    rg: person.rg ?? "",
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
    fullAddress: address?.full_address ?? "",
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
    jobFunctionId: person.job_function_id ?? "",
    vehicleBrand: vehicle?.brand ?? "",
    vehicleModel: vehicle?.model ?? "",
    vehiclePlate: vehicle?.plate ?? "",
    vehicleRenavam: vehicle?.renavam ?? "",
    leadershipNote: engagement?.leadership_note ?? "",
    referralName: engagement?.referral_name ?? "",
    contractingTypeNote: engagement?.contracting_type_note ?? "",
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
        <PersonForm
          mode="edit"
          personId={id}
          defaultValues={defaultValues}
          showExtraFields
          jobFunctions={jobFunctions ?? []}
        />

        <SendPersonAccess personId={id} />

        <SendForApprovalCard
          personId={id}
          cities={cities ?? []}
          status={person.status}
        />

        {canViewMasterRecord && (
          <Card>
            <CardHeader>
              <CardTitle>Registro mestre por campo</CardTitle>
            </CardHeader>
            <CardContent>
              <MasterFieldRecord
                fields={masterFields}
                historyByFieldValueId={historyByFieldValueId}
                actorNameById={actorNameById}
              />
            </CardContent>
          </Card>
        )}

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
