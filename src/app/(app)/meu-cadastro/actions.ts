"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  isSectionEmpty,
} from "@/lib/validations/registration";
import type { Json } from "@/types/database";
import type { OwnRegistrationActionState } from "./action-state";

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
 * Grava os PRÓPRIOS dados do usuário logado via complete_own_registration()
 * (migração 0022) — nunca grava direto em `people`; a função decide sozinha,
 * a partir de auth.uid(), se cria ou atualiza. socialName não é enviado: a
 * função não tem esse parâmetro (ver PersonForm showSocialName={false}).
 */
export async function saveOwnRegistration(
  _prevState: OwnRegistrationActionState,
  formData: FormData,
): Promise<OwnRegistrationActionState> {
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

  const { error } = await supabase.rpc("complete_own_registration", {
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
      message: error.message || "Não foi possível salvar seus dados.",
    };
  }

  revalidatePath("/meu-cadastro");
  return { status: "success" };
}

/**
 * Envia o PRÓPRIO cadastro para validação do gestor via
 * submit_registration_for_review() — exige ao menos 1 documento ativo
 * (a função rejeita antes de qualquer gravação, se não houver).
 */
export async function submitOwnRegistrationForReview(
  personId: string,
): Promise<OwnRegistrationActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_registration_for_review", {
    p_person_id: personId,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível enviar para validação.",
    };
  }

  revalidatePath("/meu-cadastro");
  return { status: "success" };
}
