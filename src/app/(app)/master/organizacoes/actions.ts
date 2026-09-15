"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { derivePasswordFromPhone } from "@/lib/temp-password";
import { slugify } from "@/lib/slug";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  addOrganizationAdminSchema,
} from "@/lib/validations/organization";
import type { Json } from "@/types/database";
import type { OrganizationActionState } from "./action-state";

function toJson(value: unknown): Json {
  return value as Json;
}

async function requirePlatformAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: isMaster, error } = await supabase.rpc("is_platform_admin");
  if (error || !isMaster) {
    return { ok: false, message: "Você não tem permissão para gerenciar organizações." };
  }
  return { ok: true };
}

/**
 * Cria o usuário administrador de uma organização já existente — reaproveita
 * exatamente o padrão de `usuarios/actions.ts#inviteUser()` (cria com senha
 * derivada do telefone, sem link de convite), só que `campaign_id` é
 * explícito (a organização escolhida pelo master) em vez de
 * `current_campaign_id()` (a campanha do próprio chamador).
 */
async function createOrganizationAdmin(
  admin: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
  data: { fullName: string; email: string; phone: string },
): Promise<{ ok: true; password: string } | { ok: false; message: string }> {
  const password = derivePasswordFromPhone(data.phone);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: data.fullName },
  });

  if (createError || !created?.user) {
    const alreadyExists = createError?.message?.toLowerCase().includes("already");
    return {
      ok: false,
      message: alreadyExists
        ? "Já existe um usuário com esse e-mail."
        : createError?.message || "Não foi possível criar o usuário administrador.",
    };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      campaign_id: campaignId,
      full_name: data.fullName,
      phone: data.phone,
    })
    .eq("id", created.user.id);

  if (updateError) {
    return {
      ok: false,
      message: "Usuário criado, mas houve um erro ao associar a organização. Avise o suporte.",
    };
  }

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("code", "administrador")
    .maybeSingle();

  if (role) {
    // profile_roles_insert já permite is_platform_admin() sem exigir que
    // o papel seja concedido dentro da campanha do próprio chamador —
    // por isso o cliente normal (não o admin) resolve aqui.
    await supabase.from("profile_roles").insert({
      profile_id: created.user.id,
      role_id: role.id,
      campaign_id: campaignId,
    });
  }

  return { ok: true, password };
}

export async function createOrganization(
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const parsed = createOrganizationSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    documentNumber: String(formData.get("documentNumber") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    tradeName: String(formData.get("tradeName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    adminFullName: String(formData.get("adminFullName") ?? ""),
    adminEmail: String(formData.get("adminEmail") ?? ""),
    adminPhone: String(formData.get("adminPhone") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const guard = await requirePlatformAdmin(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      name: parsed.data.name,
      slug: slugify(parsed.data.name) || parsed.data.documentNumber,
      document_number: parsed.data.documentNumber,
      legal_name: parsed.data.legalName || null,
      trade_name: parsed.data.tradeName || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    })
    .select("id")
    .single();

  if (campaignError || !campaign) {
    const duplicate = campaignError?.message?.toLowerCase().includes("duplicate");
    return {
      status: "error",
      message: duplicate
        ? "Já existe uma organização com esse CNPJ ou nome."
        : "Não foi possível criar a organização.",
    };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      status: "error",
      organizationId: campaign.id,
      message:
        (err instanceof Error ? err.message : "Criação do administrador indisponível.") +
        " A organização foi criada — adicione o administrador em /master/organizacoes/" +
        campaign.id +
        ".",
    };
  }

  const result = await createOrganizationAdmin(admin, supabase, campaign.id, {
    fullName: parsed.data.adminFullName,
    email: parsed.data.adminEmail,
    phone: parsed.data.adminPhone,
  });

  if (!result.ok) {
    return {
      status: "error",
      organizationId: campaign.id,
      message: `Organização criada, mas: ${result.message} Adicione o administrador em /master/organizacoes/${campaign.id}.`,
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "organizacao.criar",
    p_entity_table: "campaigns",
    p_entity_id: campaign.id,
    p_after_data: toJson({
      name: parsed.data.name,
      document_number: parsed.data.documentNumber,
      admin_email: parsed.data.adminEmail,
    }),
  });

  revalidatePath("/master/organizacoes");
  return {
    status: "success",
    organizationId: campaign.id,
    tempPassword: result.password,
    recipientEmail: parsed.data.adminEmail,
    recipientPhone: parsed.data.adminPhone,
    documentNumber: parsed.data.documentNumber,
  };
}

/**
 * Edita os dados da própria organização (nome, CNPJ, razão social/nome
 * fantasia, telefone, e-mail) — faltava desde a Etapa 1, que só tinha
 * formulário de criação. Sem isso não havia como dar um CNPJ pra uma
 * organização criada antes desta iniciativa (achado testando com a
 * campanha "Bia Kicis - Senadora").
 */
export async function updateOrganization(
  campaignId: string,
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const parsed = updateOrganizationSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    documentNumber: String(formData.get("documentNumber") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    tradeName: String(formData.get("tradeName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const guard = await requirePlatformAdmin(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: parsed.data.name,
      document_number: parsed.data.documentNumber,
      legal_name: parsed.data.legalName || null,
      trade_name: parsed.data.tradeName || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
    })
    .eq("id", campaignId);

  if (error) {
    const duplicate = error.message?.toLowerCase().includes("duplicate");
    return {
      status: "error",
      message: duplicate
        ? "Já existe outra organização com esse CNPJ."
        : "Não foi possível salvar as alterações.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "organizacao.editar",
    p_entity_table: "campaigns",
    p_entity_id: campaignId,
    p_after_data: toJson({
      name: parsed.data.name,
      document_number: parsed.data.documentNumber,
    }),
  });

  revalidatePath(`/master/organizacoes/${campaignId}`);
  revalidatePath("/master/organizacoes");
  return { status: "success" };
}

export async function addOrganizationAdmin(
  campaignId: string,
  _prevState: OrganizationActionState,
  formData: FormData,
): Promise<OrganizationActionState> {
  const parsed = addOrganizationAdminSchema.safeParse({
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
  const guard = await requirePlatformAdmin(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Criação de usuário indisponível no momento.",
    };
  }

  const result = await createOrganizationAdmin(admin, supabase, campaignId, parsed.data);
  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "organizacao.administrador.adicionar",
    p_entity_table: "campaigns",
    p_entity_id: campaignId,
    p_after_data: toJson({ email: parsed.data.email, full_name: parsed.data.fullName }),
  });

  revalidatePath(`/master/organizacoes/${campaignId}`);
  return {
    status: "success",
    tempPassword: result.password,
    recipientEmail: parsed.data.email,
    recipientPhone: parsed.data.phone,
  };
}

/**
 * Vincula o próprio master (platform admin) como administrador de uma
 * organização — resolve o "ovo e a galinha" do bootstrap: depois de
 * criar a primeira organização (Agilize), o master usa esta ação pra
 * passar a fazer parte dela e logar normalmente com o CNPJ dela.
 */
export async function linkSelfAsAdmin(campaignId: string): Promise<OrganizationActionState> {
  const supabase = await createClient();
  const guard = await requirePlatformAdmin(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão inválida." };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ campaign_id: campaignId })
    .eq("id", user.id);
  if (updateError) {
    return { status: "error", message: "Não foi possível vincular seu usuário à organização." };
  }

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("code", "administrador")
    .maybeSingle();

  if (role) {
    const { data: existing } = await supabase
      .from("profile_roles")
      .select("id")
      .eq("profile_id", user.id)
      .eq("role_id", role.id)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profile_roles").insert({
        profile_id: user.id,
        role_id: role.id,
        campaign_id: campaignId,
      });
    }
  }

  await supabase.rpc("log_audit_event", {
    p_action: "organizacao.vincular_self",
    p_entity_table: "campaigns",
    p_entity_id: campaignId,
  });

  revalidatePath(`/master/organizacoes/${campaignId}`);
  revalidatePath("/master/organizacoes");
  return { status: "success" };
}

const VALID_ORG_STATUSES = ["ativa", "encerrada", "arquivada"] as const;

export async function updateOrganizationStatus(
  campaignId: string,
  newStatus: string,
): Promise<OrganizationActionState> {
  if (!VALID_ORG_STATUSES.includes(newStatus as (typeof VALID_ORG_STATUSES)[number])) {
    return { status: "error", message: "Status inválido." };
  }

  const supabase = await createClient();
  const guard = await requirePlatformAdmin(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { error } = await supabase
    .from("campaigns")
    .update({ status: newStatus as "ativa" | "encerrada" | "arquivada" })
    .eq("id", campaignId);

  if (error) {
    return { status: "error", message: "Não foi possível alterar o status." };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "organizacao.status.alterar",
    p_entity_table: "campaigns",
    p_entity_id: campaignId,
    p_after_data: toJson({ status: newStatus }),
  });

  revalidatePath(`/master/organizacoes/${campaignId}`);
  revalidatePath("/master/organizacoes");
  return { status: "success" };
}

const ACTIVE_CAMPAIGN_COOKIE = "active_campaign_id";

/**
 * "Modo de suporte" (spec original, seção 6.3) — o master passa a ver as
 * telas normais (`/painel`, `/pessoas`, etc.) com os dados desta
 * organização, sem alterar `profiles.campaign_id` (reversível, basta
 * `exitSupportMode()`). O cookie é lido em `src/lib/supabase/server.ts`
 * e vira o header que `current_campaign_id()` (migração `0036`) usa pra
 * quem é `is_platform_admin()`.
 */
export async function enterOrganization(campaignId: string) {
  const supabase = await createClient();
  const guard = await requirePlatformAdmin(supabase);
  if (!guard.ok) return { status: "error", message: guard.message } as OrganizationActionState;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_CAMPAIGN_COOKIE, campaignId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  redirect("/painel");
}

export async function exitSupportMode() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_CAMPAIGN_COOKIE);
  redirect("/master/organizacoes");
}
