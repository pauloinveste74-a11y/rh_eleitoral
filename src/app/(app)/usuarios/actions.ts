"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site-url";
import {
  inviteUserSchema,
  assignRoleSchema,
  updatePhoneSchema,
} from "@/lib/validations/user";
import type { Json } from "@/types/database";
import type { UserActionState } from "./action-state";

function toJson(value: unknown): Json {
  return value as Json;
}

async function requireManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: isManager, error } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });
  if (error || !isManager) {
    return { ok: false, message: "Você não tem permissão para gerenciar usuários." };
  }
  return { ok: true };
}

export async function inviteUser(
  _prevState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const parsed = inviteUserSchema.safeParse({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { data: campaignId } = await supabase.rpc("current_campaign_id");
  if (!campaignId) {
    return {
      status: "error",
      message: "Sua conta não está associada a uma campanha. Não é possível convidar usuários.",
    };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Convite indisponível no momento.",
    };
  }

  // generateLink() cria o usuário (mesma função do antigo
  // inviteUserByEmail()) e devolve o link de acesso em vez de só enviar
  // por e-mail — assim o admin pode compartilhar também por WhatsApp.
  // Nenhum e-mail é enviado automaticamente por este passo.
  const { data: generated, error: inviteError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: parsed.data.email,
    options: {
      data: { full_name: parsed.data.fullName },
      redirectTo: `${getSiteUrl()}/convite`,
    },
  });

  if (inviteError || !generated?.user) {
    const alreadyExists = inviteError?.message?.toLowerCase().includes("already");
    return {
      status: "error",
      message: alreadyExists
        ? "Já existe um usuário com esse e-mail."
        : inviteError?.message || "Não foi possível gerar o convite.",
    };
  }

  // handle_new_user() já criou a linha em profiles (sem campaign_id — o
  // trigger não sabe a campanha). Completa o cadastro com a campanha do
  // convidante, via cliente admin (a política profiles_update normal não
  // aceita linha com campaign_id nulo).
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      campaign_id: campaignId,
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
    })
    .eq("id", generated.user.id);

  if (updateError) {
    return {
      status: "error",
      message: "Convite gerado, mas houve um erro ao associar a campanha. Avise o suporte.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "usuario.convidar",
    p_entity_table: "profiles",
    p_entity_id: generated.user.id,
    p_after_data: toJson({ email: parsed.data.email, full_name: parsed.data.fullName }),
  });

  revalidatePath("/usuarios");
  return {
    status: "success",
    accessLink: generated.properties.action_link,
    recipientEmail: parsed.data.email,
    recipientPhone: parsed.data.phone || null,
  };
}

/**
 * Gera um novo link de acesso para um usuário que já existe (convidado
 * antes, ou que perdeu o link original) — usa `type: "magiclink"`, que
 * funciona independente de o e-mail já ter sido confirmado, ao contrário
 * de `type: "invite"` (só para usuário novo).
 */
export async function resendAccessLink(
  profileId: string,
  email: string,
): Promise<UserActionState> {
  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Reenvio indisponível no momento.",
    };
  }

  const { data: generated, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${getSiteUrl()}/convite` },
  });

  if (error || !generated) {
    return { status: "error", message: error?.message || "Não foi possível gerar o link." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "usuario.link_acesso.gerar",
    p_entity_table: "profiles",
    p_entity_id: profileId,
  });

  return {
    status: "success",
    accessLink: generated.properties.action_link,
    recipientEmail: email,
  };
}

export async function updatePhone(
  profileId: string,
  _prevState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const parsed = updatePhoneSchema.safeParse({
    phone: String(formData.get("phone") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { error } = await supabase
    .from("profiles")
    .update({ phone: parsed.data.phone || null })
    .eq("id", profileId);

  if (error) {
    return { status: "error", message: "Não foi possível salvar o telefone." };
  }

  revalidatePath(`/usuarios/${profileId}`);
  revalidatePath("/usuarios");
  return { status: "success" };
}

export async function assignRole(
  profileId: string,
  _prevState: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const raw = {
    roleCode: String(formData.get("roleCode") ?? ""),
    axisId: String(formData.get("axisId") ?? "") || undefined,
    cityId: String(formData.get("cityId") ?? "") || undefined,
    teamId: String(formData.get("teamId") ?? "") || undefined,
    validUntil: String(formData.get("validUntil") ?? "") || undefined,
  };
  const parsed = assignRoleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("code", parsed.data.roleCode)
    .maybeSingle();
  if (roleError || !role) {
    return { status: "error", message: "Papel inválido." };
  }

  const { data: campaignId } = await supabase.rpc("current_campaign_id");

  const { error } = await supabase.from("profile_roles").insert({
    profile_id: profileId,
    role_id: role.id,
    campaign_id: campaignId,
    axis_id: parsed.data.axisId || null,
    city_id: parsed.data.cityId || null,
    team_id: parsed.data.teamId || null,
    valid_until: parsed.data.validUntil || null,
  });

  if (error) {
    return { status: "error", message: "Não foi possível atribuir o papel." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "usuario.papel.atribuir",
    p_entity_table: "profile_roles",
    p_entity_id: profileId,
    p_after_data: toJson(parsed.data),
  });

  revalidatePath(`/usuarios/${profileId}`);
  return { status: "success" };
}

export async function removeRole(
  profileRoleId: string,
  profileId: string,
): Promise<UserActionState> {
  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { error } = await supabase.from("profile_roles").delete().eq("id", profileRoleId);
  if (error) {
    return { status: "error", message: "Não foi possível remover o papel." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "usuario.papel.remover",
    p_entity_table: "profile_roles",
    p_entity_id: profileRoleId,
  });

  revalidatePath(`/usuarios/${profileId}`);
  return { status: "success" };
}

const VALID_STATUSES = ["ativo", "suspenso"] as const;

export async function toggleUserStatus(
  profileId: string,
  newStatus: string,
): Promise<UserActionState> {
  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return { status: "error", message: "Status inválido." };
  }

  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { error } = await supabase
    .from("profiles")
    .update({ status: newStatus as "ativo" | "suspenso" })
    .eq("id", profileId);

  if (error) {
    return { status: "error", message: "Não foi possível alterar o status." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: newStatus === "suspenso" ? "usuario.suspender" : "usuario.reativar",
    p_entity_table: "profiles",
    p_entity_id: profileId,
  });

  revalidatePath("/usuarios");
  revalidatePath(`/usuarios/${profileId}`);
  return { status: "success" };
}
