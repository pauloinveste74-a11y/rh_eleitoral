"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  documentTypes,
  isSectionEmpty,
} from "@/lib/validations/person";
import type { Json } from "@/types/database";
import type { PersonActionState } from "./action-state";

/** Dados arbitrários já validados/serializáveis, só faltando o cast estrutural para Json. */
function toJson(value: unknown): Json {
  return value as Json;
}

function fieldsOf(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

const PERSON_FIELDS = [
  "fullName",
  "socialName",
  "cpf",
  "birthDate",
  "phone",
  "whatsapp",
  "email",
];
const ADDRESS_FIELDS = [
  "zipCode",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
];
const BANK_FIELDS = [
  "bankCode",
  "bankName",
  "agency",
  "agencyDigit",
  "accountNumber",
  "accountDigit",
  "accountType",
  "pixKeyType",
  "pixKey",
];
const ELECTORAL_FIELDS = [
  "voterId",
  "electoralZone",
  "electoralSection",
  "voterCity",
  "voterState",
];

/**
 * Grava pessoa + satélites preenchidos a partir de um FormData. Usado tanto
 * por createPerson quanto updatePerson — a diferença entre criar e editar é
 * só se já existe um personId de partida (insert vs update em `people`).
 *
 * Sem transação real entre as chamadas (supabase-js faz uma requisição
 * PostgREST por tabela): se `people` gravar e um satélite falhar, a pessoa
 * já existe e o estado retornado carrega uma mensagem específica — o
 * chamador decide se redireciona mesmo assim para a edição completar o que
 * faltou.
 */
async function savePerson(
  existingPersonId: string | null,
  formData: FormData,
): Promise<PersonActionState & { personId?: string }> {
  const errors: Partial<Record<string, string[]>> = {};

  const personParsed = personSchema.safeParse(
    fieldsOf(formData, PERSON_FIELDS),
  );
  if (!personParsed.success) {
    Object.assign(errors, personParsed.error.flatten().fieldErrors);
  }

  const addressRaw = fieldsOf(formData, ADDRESS_FIELDS);
  const addressPresent = !isSectionEmpty(addressRaw);
  const addressParsed = addressPresent
    ? addressSchema.safeParse(addressRaw)
    : null;
  if (addressParsed && !addressParsed.success) {
    Object.assign(errors, addressParsed.error.flatten().fieldErrors);
  }

  const bankRaw = fieldsOf(formData, BANK_FIELDS);
  const bankPresent = !isSectionEmpty(bankRaw);
  const bankParsed = bankPresent ? bankAccountSchema.safeParse(bankRaw) : null;
  if (bankParsed && !bankParsed.success) {
    Object.assign(errors, bankParsed.error.flatten().fieldErrors);
  }

  const electoralRaw = fieldsOf(formData, ELECTORAL_FIELDS);
  const electoralPresent = !isSectionEmpty(electoralRaw);
  const electoralParsed = electoralPresent
    ? electoralDataSchema.safeParse(electoralRaw)
    : null;
  if (electoralParsed && !electoralParsed.success) {
    Object.assign(errors, electoralParsed.error.flatten().fieldErrors);
  }

  if (!personParsed.success || Object.keys(errors).length > 0) {
    return {
      status: "error",
      errors,
      message: "Corrija os campos destacados.",
    };
  }

  const person = personParsed.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const requestId = randomUUID();
  const partialFailures: string[] = [];

  const personRow = {
    full_name: person.fullName,
    social_name: person.socialName || null,
    cpf: person.cpf,
    birth_date: person.birthDate || null,
    phone: person.phone || null,
    whatsapp: person.whatsapp || null,
    email: person.email || null,
    updated_by: user.id,
  };

  let personId = existingPersonId;
  let personBefore: Record<string, unknown> | null = null;

  if (existingPersonId) {
    const { data: before } = await supabase
      .from("people")
      .select("*")
      .eq("id", existingPersonId)
      .maybeSingle();
    personBefore = before;

    const { data: updated, error } = await supabase
      .from("people")
      .update(personRow)
      .eq("id", existingPersonId)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          status: "error",
          errors: { cpf: ["CPF já cadastrado para outra pessoa."] },
        };
      }
      return { status: "error", message: "Não foi possível salvar a pessoa." };
    }
    personId = updated.id;

    await supabase.rpc("log_audit_event", {
      p_action: "pessoa.editar",
      p_entity_table: "people",
      p_entity_id: personId,
      p_before_data: toJson(personBefore),
      p_after_data: toJson({ ...personRow, id: personId }),
      p_related_request_id: requestId,
    });
  } else {
    const { data: inserted, error } = await supabase
      .from("people")
      .insert({ ...personRow, created_by: user.id })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          status: "error",
          errors: { cpf: ["CPF já cadastrado."] },
        };
      }
      return { status: "error", message: "Não foi possível criar a pessoa." };
    }
    personId = inserted.id;

    await supabase.rpc("log_audit_event", {
      p_action: "pessoa.criar",
      p_entity_table: "people",
      p_entity_id: personId,
      p_after_data: toJson({ ...personRow, id: personId }),
      p_related_request_id: requestId,
    });
  }

  if (addressPresent && addressParsed?.success) {
    const a = addressParsed.data;
    const { error } = await supabase.from("person_addresses").upsert(
      {
        person_id: personId,
        zip_code: a.zipCode,
        street: a.street,
        number: a.number || null,
        complement: a.complement || null,
        neighborhood: a.neighborhood,
        city: a.city,
        state: a.state.toUpperCase(),
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("endereço");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.endereco.salvar",
        p_entity_table: "person_addresses",
        p_entity_id: personId,
        p_after_data: toJson(a),
        p_related_request_id: requestId,
      });
    }
  }

  if (bankPresent && bankParsed?.success) {
    const b = bankParsed.data;
    const { error } = await supabase.from("person_bank_accounts").upsert(
      {
        person_id: personId,
        bank_code: b.bankCode,
        bank_name: b.bankName || null,
        agency: b.agency,
        agency_digit: b.agencyDigit || null,
        account_number: b.accountNumber,
        account_digit: b.accountDigit || null,
        account_type: b.accountType,
        pix_key_type: b.pixKeyType || null,
        pix_key: b.pixKey || null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("dados bancários");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.dados_bancarios.salvar",
        p_entity_table: "person_bank_accounts",
        p_entity_id: personId,
        p_after_data: toJson(b),
        p_related_request_id: requestId,
      });
    }
  }

  if (electoralPresent && electoralParsed?.success) {
    const e = electoralParsed.data;
    const { error } = await supabase.from("person_electoral_data").upsert(
      {
        person_id: personId,
        voter_id: e.voterId || null,
        electoral_zone: e.electoralZone || null,
        electoral_section: e.electoralSection || null,
        voter_city: e.voterCity || null,
        voter_state: e.voterState ? e.voterState.toUpperCase() : null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("dados eleitorais");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.dados_eleitorais.salvar",
        p_entity_table: "person_electoral_data",
        p_entity_id: personId,
        p_after_data: toJson(e),
        p_related_request_id: requestId,
      });
    }
  }

  revalidatePath("/pessoas");
  revalidatePath(`/pessoas/${personId}/editar`);

  if (partialFailures.length > 0) {
    await supabase.rpc("log_audit_event", {
      p_action: "pessoa.salvar.falha_parcial",
      p_entity_table: "people",
      p_entity_id: personId,
      p_reason: `Falha ao salvar: ${partialFailures.join(", ")}.`,
      p_result: "falha",
      p_related_request_id: requestId,
    });
    return {
      status: "error",
      personId: personId ?? undefined,
      message: `Pessoa salva, mas houve um erro ao salvar ${partialFailures.join(
        " e ",
      )}. Você pode tentar novamente nesta tela.`,
    };
  }

  return { status: "success", personId: personId ?? undefined };
}

export async function createPerson(
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const result = await savePerson(null, formData);
  if (result.status !== "error" && result.personId) {
    redirect(`/pessoas/${result.personId}/editar`);
  }
  return result;
}

export async function updatePerson(
  personId: string,
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  return savePerson(personId, formData);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function uploadPersonDocument(
  personId: string,
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const documentTypeRaw = String(formData.get("documentType") ?? "");
  const file = formData.get("file");

  if (
    !documentTypes.includes(documentTypeRaw as (typeof documentTypes)[number])
  ) {
    return {
      status: "error",
      errors: { documentType: ["Selecione o tipo de documento."] },
    };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", errors: { file: ["Selecione um arquivo."] } };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: "error", errors: { file: ["Arquivo maior que 10 MB."] } };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      status: "error",
      errors: { file: ["Formato não permitido. Use PDF, JPG ou PNG."] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  const storagePath = `${personId}/${randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("pessoas-documentos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o arquivo." };
  }

  const { data: doc, error: insertError } = await supabase
    .from("person_documents")
    .insert({
      person_id: personId,
      document_type: documentTypeRaw as (typeof documentTypes)[number],
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return {
      status: "error",
      message: "Arquivo enviado, mas não foi possível registrar o documento.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "pessoa.documento.anexar",
    p_entity_table: "person_documents",
    p_entity_id: doc.id,
    p_after_data: toJson({
      person_id: personId,
      document_type: documentTypeRaw,
      file_name: file.name,
    }),
  });

  revalidatePath(`/pessoas/${personId}/editar`);
  return { status: "success" };
}

export async function getPersonDocumentSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("pessoas-documentos")
    .createSignedUrl(storagePath, 60);

  if (error || !data) return null;
  return data.signedUrl;
}
