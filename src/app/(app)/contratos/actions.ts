"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { generateContractSchema } from "@/lib/validations/contract";
import type { ContractActionState } from "./action-state";

function fieldsOf(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

/**
 * Geração individual de contrato — via generate_contract() (migração 0032).
 * "Exatamente pessoa OU empresa" é checado aqui (cross-field), não no zod.
 */
export async function generateContract(
  _prevState: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const targetType = String(formData.get("targetType") ?? "");
  const parsed = generateContractSchema.safeParse(
    fieldsOf(formData, [
      "templateVersionId",
      "personId",
      "legalEntityId",
      "jobFunctionId",
      "positionOverride",
      "valueReais",
      "startDate",
      "endDate",
    ]),
  );
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const personId = targetType === "pf" ? parsed.data.personId : "";
  const legalEntityId = targetType === "pj" ? parsed.data.legalEntityId : "";
  if (!personId && !legalEntityId) {
    return {
      status: "error",
      message: targetType === "pj" ? "Selecione a empresa." : "Selecione a pessoa.",
    };
  }

  const supabase = await createClient();
  const { data: contractId, error } = await supabase.rpc("generate_contract", {
    p_template_version_id: parsed.data.templateVersionId,
    p_person_id: personId || null,
    p_legal_entity_id: legalEntityId || null,
    p_job_function_id: parsed.data.jobFunctionId || null,
    p_position_override: parsed.data.positionOverride || null,
    p_value_cents: parsed.data.valueReais ? Math.round(Number(parsed.data.valueReais) * 100) : null,
    p_start_date: parsed.data.startDate || null,
    p_end_date: parsed.data.endDate || null,
  });

  if (error || !contractId) {
    return {
      status: "error",
      message: error?.message || "Não foi possível gerar o contrato.",
    };
  }

  revalidatePath("/contratos");
  redirect(`/contratos/${contractId}`);
}

/** Marca o contrato como baixado — chamado ao abrir a visualização imprimível. */
export async function markContractDownloaded(contractId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("mark_contract_downloaded", { p_contract_id: contractId });
}

/**
 * Upload do PDF assinado (spec 12.3) — via submit_signed_contract().
 * Mesma validação de tamanho/tipo de uploadPersonDocument().
 */
export async function uploadSignedContract(
  contractId: string,
  storagePathPrefix: string,
  _prevState: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", errors: { file: ["Selecione um arquivo."] } };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: "error", errors: { file: ["Arquivo maior que 10 MB."] } };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { status: "error", errors: { file: ["Formato não permitido. Use PDF, JPG ou PNG."] } };
  }

  const supabase = await createClient();
  const storagePath = `${storagePathPrefix}/${randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("contratos-documentos")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o arquivo." };
  }

  const { error } = await supabase.rpc("submit_signed_contract", {
    p_contract_id: contractId,
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
  });

  if (error) {
    await supabase.storage.from("contratos-documentos").remove([storagePath]);
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a assinatura enviada.",
    };
  }

  revalidatePath(`/contratos/${contractId}`);
  return { status: "success" };
}

/** Conferência do gestor/RH sobre a assinatura enviada — via decide_contract(). */
export async function decideContract(
  contractId: string,
  _prevState: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!["validar", "solicitar_correcao", "recusar"].includes(decision)) {
    return { status: "error", message: "Decisão inválida." };
  }
  if (decision !== "validar" && !reason) {
    return { status: "error", message: "Informe o motivo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_contract", {
    p_contract_id: contractId,
    p_decision: decision,
    p_reason: reason || null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a decisão.",
    };
  }

  revalidatePath(`/contratos/${contractId}`);
  return { status: "success" };
}
