"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ValidationActionState } from "./action-state";

const GESTOR_DECISIONS = ["aprovar", "rejeitar", "solicitar_correcao"];
const RH_DECISIONS = ["validar", "rejeitar", "solicitar_correcao"];

/**
 * Decisão do gestor (coordenador dono de manager_person_id, ou
 * administrador/rh) sobre uma registration_submissions — via
 * decide_registration_submission() (migração 0023). Mesmo padrão de
 * decideApproval() em /aprovacoes.
 */
export async function decideRegistrationSubmission(
  submissionId: string,
  _prevState: ValidationActionState,
  formData: FormData,
): Promise<ValidationActionState> {
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const fieldNames = formData.getAll("fieldNames").map(String);

  if (!GESTOR_DECISIONS.includes(decision)) {
    return { status: "error", message: "Decisão inválida." };
  }
  if (decision === "solicitar_correcao" && !reason) {
    return {
      status: "error",
      message: "Informe o motivo da correção solicitada.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_registration_submission", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_reason: reason || null,
    p_field_names: decision === "solicitar_correcao" && fieldNames.length > 0 ? fieldNames : null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a decisão.",
    };
  }

  revalidatePath("/validacoes");
  revalidatePath("/minha-equipe");
  return { status: "success" };
}

/**
 * Decisão do RH (só administrador/rh) sobre uma registration_submissions
 * já aprovada pelo gestor — via decide_rh_validation() (migração 0024).
 */
export async function decideRhValidation(
  submissionId: string,
  _prevState: ValidationActionState,
  formData: FormData,
): Promise<ValidationActionState> {
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const fieldNames = formData.getAll("fieldNames").map(String);

  if (!RH_DECISIONS.includes(decision)) {
    return { status: "error", message: "Decisão inválida." };
  }
  if (decision === "solicitar_correcao" && !reason) {
    return {
      status: "error",
      message: "Informe o motivo da correção solicitada.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_rh_validation", {
    p_submission_id: submissionId,
    p_decision: decision,
    p_reason: reason || null,
    p_field_names: decision === "solicitar_correcao" && fieldNames.length > 0 ? fieldNames : null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a decisão.",
    };
  }

  revalidatePath("/validacoes");
  return { status: "success" };
}
