"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { alcadaRuleSchema } from "@/lib/validations/expense";
import type { AlcadaActionState } from "./action-state";

/**
 * expense_authorization_rules já tem policy de INSERT/DELETE direta pra
 * `administrador` (is_admin(), desde a 0020) — sem função SECURITY
 * DEFINER nova, mesmo espírito de /importacoes (Etapa 6).
 */
export async function createAlcadaRule(
  _prevState: AlcadaActionState,
  formData: FormData,
): Promise<AlcadaActionState> {
  const parsed = alcadaRuleSchema.safeParse({
    roleId: String(formData.get("roleId") ?? ""),
    maxAmountReais: String(formData.get("maxAmountReais") ?? ""),
    axisId: String(formData.get("axisId") ?? ""),
    cityId: String(formData.get("cityId") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return {
      status: "error",
      message: "Você não tem permissão para configurar alçadas — restrito a administrador.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const { data: campaignId } = await supabase.rpc("current_campaign_id");
  if (!campaignId) {
    return {
      status: "error",
      message: "Sua conta não está associada a uma campanha.",
    };
  }

  const { error } = await supabase.from("expense_authorization_rules").insert({
    campaign_id: campaignId,
    role_id: parsed.data.roleId,
    axis_id: parsed.data.axisId || null,
    city_id: parsed.data.cityId || null,
    max_amount_cents: parsed.data.maxAmountReais,
    created_by: user.id,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível criar a regra de alçada.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "despesa.alcada.criar",
    p_entity_table: "expense_authorization_rules",
    p_entity_id: null,
    p_after_data: {
      role_id: parsed.data.roleId,
      max_amount_cents: parsed.data.maxAmountReais,
    },
  });

  revalidatePath("/despesas/alcadas");
  return { status: "success" };
}

export async function deleteAlcadaRule(ruleId: string): Promise<AlcadaActionState> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    return {
      status: "error",
      message: "Você não tem permissão para configurar alçadas — restrito a administrador.",
    };
  }

  const { error } = await supabase
    .from("expense_authorization_rules")
    .delete()
    .eq("id", ruleId);
  if (error) {
    return { status: "error", message: "Não foi possível remover a regra." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "despesa.alcada.remover",
    p_entity_table: "expense_authorization_rules",
    p_entity_id: ruleId,
  });

  revalidatePath("/despesas/alcadas");
  return { status: "success" };
}
