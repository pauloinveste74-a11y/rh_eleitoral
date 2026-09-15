"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { legalEntitySchema } from "@/lib/validations/legal-entity";
import type { LegalEntityActionState } from "./action-state";

function fieldsOf(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

const FIELDS = [
  "companyName",
  "tradeName",
  "cnpj",
  "stateRegistration",
  "municipalRegistration",
  "legalRepresentativeName",
  "legalRepresentativeCpf",
  "phone",
  "whatsapp",
  "email",
  "serviceDescription",
];

/**
 * Cadastro-mestre de pessoa jurídica (Nova versão, spec seção 5.1-PJ).
 * legal_entities já tem policy de INSERT direta pra administrador/rh —
 * sem função SECURITY DEFINER nova, mesmo espírito de /importacoes
 * (Etapa 6 da iniciativa anterior).
 */
export async function createLegalEntity(
  _prevState: LegalEntityActionState,
  formData: FormData,
): Promise<LegalEntityActionState> {
  const parsed = legalEntitySchema.safeParse(fieldsOf(formData, FIELDS));
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase.from("legal_entities").insert({
    company_name: parsed.data.companyName,
    trade_name: parsed.data.tradeName || null,
    cnpj: parsed.data.cnpj,
    state_registration: parsed.data.stateRegistration || null,
    municipal_registration: parsed.data.municipalRegistration || null,
    legal_representative_name: parsed.data.legalRepresentativeName,
    legal_representative_cpf: parsed.data.legalRepresentativeCpf,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    email: parsed.data.email || null,
    service_description: parsed.data.serviceDescription || null,
    created_by: user.id,
    updated_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { cnpj: ["Já existe uma empresa ativa com esse CNPJ nesta campanha."] },
      };
    }
    return { status: "error", message: "Não foi possível cadastrar a empresa." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "empresa.criar",
    p_entity_table: "legal_entities",
    p_entity_id: null,
    p_after_data: { cnpj: parsed.data.cnpj, company_name: parsed.data.companyName },
  });

  revalidatePath("/empresas");
  return { status: "success" };
}
