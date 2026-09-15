"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  documentTypes,
  isSectionEmpty,
} from "@/lib/validations/registration";
import type { Json } from "@/types/database";
import type {
  PublicRegistrationActionState,
  PublicDocumentActionState,
} from "./action-state";

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
 * Autocadastro do cabo eleitoral — sem sessão nenhuma, protegido só pelo
 * token (submit_public_registration é `anon`, mesma proteção de
 * redeem_registration_invite). Chamado uma vez só: a própria função rejeita
 * um convite cujo person_id já foi preenchido.
 */
export async function submitPublicRegistration(
  token: string,
  _prevState: PublicRegistrationActionState,
  formData: FormData,
): Promise<PublicRegistrationActionState> {
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

  const addressJson =
    addressPresent && addressParsed?.success
      ? {
          zip_code: addressParsed.data.zipCode,
          street: addressParsed.data.street,
          number: addressParsed.data.number || null,
          complement: addressParsed.data.complement || null,
          neighborhood: addressParsed.data.neighborhood,
          city: addressParsed.data.city,
          state: addressParsed.data.state,
        }
      : null;

  const bankJson =
    bankPresent && bankParsed?.success
      ? {
          bank_code: bankParsed.data.bankCode,
          bank_name: bankParsed.data.bankName || null,
          agency: bankParsed.data.agency,
          agency_digit: bankParsed.data.agencyDigit || null,
          account_number: bankParsed.data.accountNumber,
          account_digit: bankParsed.data.accountDigit || null,
          account_type: bankParsed.data.accountType,
          pix_key_type: bankParsed.data.pixKeyType || null,
          pix_key: bankParsed.data.pixKey || null,
        }
      : null;

  const electoralJson =
    electoralPresent && electoralParsed?.success
      ? {
          voter_id: electoralParsed.data.voterId || null,
          electoral_zone: electoralParsed.data.electoralZone || null,
          electoral_section: electoralParsed.data.electoralSection || null,
          voter_city: electoralParsed.data.voterCity || null,
          voter_state: electoralParsed.data.voterState || null,
        }
      : null;

  const { error } = await supabase.rpc("submit_public_registration", {
    p_token: token,
    p_full_name: person.fullName,
    p_cpf: person.cpf,
    p_birth_date: person.birthDate || null,
    p_phone: person.phone || null,
    p_whatsapp: person.whatsapp || null,
    p_email: person.email || null,
    p_address: toJson(addressJson),
    p_bank: toJson(bankJson),
    p_electoral: toJson(electoralJson),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { cpf: ["CPF já cadastrado para outra pessoa nesta campanha."] },
      };
    }
    return {
      status: "error",
      message: error.message || "Não foi possível enviar seu cadastro.",
    };
  }

  revalidatePath(`/cadastro/${token}`);
  return { status: "success" };
}

/**
 * Etapa 11 — cabo eleitoral reedita os próprios dados depois de uma
 * correção solicitada (update_public_registration, anon, protegida pelo
 * token). Mesma validação de submitPublicRegistration; a função no banco
 * é que decide se o status atual permite editar.
 */
export async function updatePublicRegistration(
  token: string,
  _prevState: PublicRegistrationActionState,
  formData: FormData,
): Promise<PublicRegistrationActionState> {
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

  const addressJson =
    addressPresent && addressParsed?.success
      ? {
          zip_code: addressParsed.data.zipCode,
          street: addressParsed.data.street,
          number: addressParsed.data.number || null,
          complement: addressParsed.data.complement || null,
          neighborhood: addressParsed.data.neighborhood,
          city: addressParsed.data.city,
          state: addressParsed.data.state,
        }
      : null;

  const bankJson =
    bankPresent && bankParsed?.success
      ? {
          bank_code: bankParsed.data.bankCode,
          bank_name: bankParsed.data.bankName || null,
          agency: bankParsed.data.agency,
          agency_digit: bankParsed.data.agencyDigit || null,
          account_number: bankParsed.data.accountNumber,
          account_digit: bankParsed.data.accountDigit || null,
          account_type: bankParsed.data.accountType,
          pix_key_type: bankParsed.data.pixKeyType || null,
          pix_key: bankParsed.data.pixKey || null,
        }
      : null;

  const electoralJson =
    electoralPresent && electoralParsed?.success
      ? {
          voter_id: electoralParsed.data.voterId || null,
          electoral_zone: electoralParsed.data.electoralZone || null,
          electoral_section: electoralParsed.data.electoralSection || null,
          voter_city: electoralParsed.data.voterCity || null,
          voter_state: electoralParsed.data.voterState || null,
        }
      : null;

  const { error } = await supabase.rpc("update_public_registration", {
    p_token: token,
    p_full_name: person.fullName,
    p_cpf: person.cpf,
    p_birth_date: person.birthDate || null,
    p_phone: person.phone || null,
    p_whatsapp: person.whatsapp || null,
    p_email: person.email || null,
    p_address: toJson(addressJson),
    p_bank: toJson(bankJson),
    p_electoral: toJson(electoralJson),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { cpf: ["CPF já cadastrado para outra pessoa nesta campanha."] },
      };
    }
    return {
      status: "error",
      message: error.message || "Não foi possível salvar a correção.",
    };
  }

  revalidatePath(`/cadastro/${token}`);
  return { status: "success" };
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/**
 * Upload de documento sem sessão nenhuma. RLS normal não se aplica a
 * `anon` — por isso, igual ao padrão já usado em /usuarios (criar/resetar
 * senha), a autorização vem ANTES, com o cliente normal (revalida o token
 * chamando redeem_registration_invite de novo — idempotente), e só depois
 * o cliente com a service role key faz o upload e o insert de fato.
 */
export async function uploadPublicDocument(
  token: string,
  _prevState: PublicDocumentActionState,
  formData: FormData,
): Promise<PublicDocumentActionState> {
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
  const { data: invite, error: inviteError } = await supabase.rpc(
    "redeem_registration_invite",
    { p_token: token },
  );
  if (inviteError || !invite) {
    return {
      status: "error",
      message: inviteError?.message || "Convite inválido ou expirado.",
    };
  }
  if (!invite.person_id) {
    return {
      status: "error",
      message: "Preencha seus dados antes de enviar documentos.",
    };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Envio de documento indisponível no momento.",
    };
  }

  const personId = invite.person_id;
  const campaignId = invite.campaign_id;
  const storagePath = `${campaignId}/${personId}/${randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await admin.storage
    .from("pessoas-documentos")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o arquivo." };
  }

  const { error: insertError } = await admin.from("person_documents").insert({
    person_id: personId,
    campaign_id: campaignId,
    document_type: documentTypeRaw as (typeof documentTypes)[number],
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
  });
  if (insertError) {
    return {
      status: "error",
      message: "Arquivo enviado, mas não foi possível registrar o documento.",
    };
  }

  revalidatePath(`/cadastro/${token}`);
  return { status: "success" };
}

/**
 * Encerra o autocadastro público via submit_public_registration_for_review
 * (também `anon`) — exige ao menos 1 documento ativo, mesma checagem de
 * submit_registration_for_review (área autenticada).
 */
export async function submitPublicRegistrationForReview(
  token: string,
): Promise<PublicDocumentActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_public_registration_for_review", {
    p_token: token,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível enviar para validação.",
    };
  }

  revalidatePath(`/cadastro/${token}`);
  return { status: "success" };
}
