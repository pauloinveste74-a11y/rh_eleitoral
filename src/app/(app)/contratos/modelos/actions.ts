"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  contractTemplateSchema,
  publishVersionSchema,
  legalApprovalSchema,
} from "@/lib/validations/contract";
import type { ContractTemplateActionState } from "./action-state";

function fieldsOf(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

/**
 * Cria o modelo (catálogo) — sem versão ainda, `status = 'rascunho'` até a
 * primeira publish_template_version(). RLS de contract_templates já
 * restringe insert a administrador/rh, sem necessidade de função nova.
 */
export async function createContractTemplate(
  _prevState: ContractTemplateActionState,
  formData: FormData,
): Promise<ContractTemplateActionState> {
  const parsed = contractTemplateSchema.safeParse(
    fieldsOf(formData, ["name", "contractType", "jobFunctionId"]),
  );
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const { error } = await supabase.from("contract_templates").insert({
    name: parsed.data.name,
    contract_type: parsed.data.contractType,
    job_function_id: parsed.data.jobFunctionId || null,
    responsible_profile_id: user.id,
    created_by: user.id,
  });

  if (error) {
    return { status: "error", message: "Não foi possível criar o modelo." };
  }

  revalidatePath("/contratos/modelos");
  return { status: "success" };
}

/**
 * Publica uma nova versão do modelo — via publish_template_version()
 * (migração 0032): supera a versão ativa anterior automaticamente.
 */
export async function publishTemplateVersion(
  contractTemplateId: string,
  _prevState: ContractTemplateActionState,
  formData: FormData,
): Promise<ContractTemplateActionState> {
  const parsed = publishVersionSchema.safeParse(
    fieldsOf(formData, ["body", "validFrom", "validUntil"]),
  );
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_template_version", {
    p_contract_template_id: contractTemplateId,
    p_body: parsed.data.body,
    p_valid_from: parsed.data.validFrom,
    p_valid_until: parsed.data.validUntil || null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível publicar a versão.",
    };
  }

  revalidatePath("/contratos/modelos");
  return { status: "success" };
}

/**
 * Aprovação jurídica do modelo (spec 12.1) — via set_template_legal_approval()
 * (jurídico ou administrador).
 */
export async function setTemplateLegalApproval(
  contractTemplateId: string,
  _prevState: ContractTemplateActionState,
  formData: FormData,
): Promise<ContractTemplateActionState> {
  const parsed = legalApprovalSchema.safeParse(fieldsOf(formData, ["approved", "note"]));
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_template_legal_approval", {
    p_contract_template_id: contractTemplateId,
    p_approved: parsed.data.approved === "true",
    p_note: parsed.data.note || null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a aprovação.",
    };
  }

  revalidatePath("/contratos/modelos");
  return { status: "success" };
}
