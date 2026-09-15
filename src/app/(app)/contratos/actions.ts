"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { derivePasswordFromPhone } from "@/lib/temp-password";
import { generateContractSchema } from "@/lib/validations/contract";
import type { Json } from "@/types/database";
import type { ContractActionState, SendContractAccessState } from "./action-state";

function toJson(value: unknown): Json {
  return value as Json;
}

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

const CONTRACT_LINK_BASE = "https://rh-eleitoral.vercel.app";

/**
 * Envio manual de contrato (caderno "Central de Inteligência de RH",
 * seções 14/25) — monta a mensagem/link pra copiar ou mandar por
 * WhatsApp/e-mail. Pra pessoa física sem login ainda, cria um (mesmo
 * padrão de `usuarios/actions.ts#inviteUser()`, só que ligando ao
 * `person_id` já existente do contrato em vez de criar uma pessoa
 * nova) — decisão do usuário: quem for assinar precisa de login de
 * verdade, não um link de token avulso. Pessoa jurídica não tem
 * conceito de login — só o link do contrato mesmo.
 *
 * Não registra o envio em `contract_deliveries` aqui — só quando o
 * administrador de fato clica em WhatsApp/e-mail
 * (`logContractDelivery()`), pra não contar como "enviado" um clique
 * só de abrir o painel.
 */
export async function sendContractAccess(contractId: string): Promise<SendContractAccessState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Faça login novamente." };

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, campaign_id, person_id, legal_entity_id")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract) return { status: "error", message: "Contrato não encontrado." };

  const [{ data: isManager }, { data: profile }] = await Promise.all([
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
    supabase.from("profiles").select("person_id").eq("id", user.id).maybeSingle(),
  ]);

  const ownPersonId = profile?.person_id ?? null;
  let isCoordinatorOfTarget = false;
  if (!isManager && ownPersonId && contract.person_id) {
    const { data: rel } = await supabase
      .from("coordination_relationships")
      .select("id")
      .eq("coordinator_person_id", ownPersonId)
      .eq("subordinate_person_id", contract.person_id)
      .eq("status", "vigente")
      .maybeSingle();
    isCoordinatorOfTarget = Boolean(rel);
  }

  if (!isManager && !isCoordinatorOfTarget) {
    return { status: "error", message: "Você não tem permissão para enviar este contrato." };
  }

  const contractLink = `${CONTRACT_LINK_BASE}/contratos/${contractId}`;

  if (contract.legal_entity_id) {
    const { data: entity } = await supabase
      .from("legal_entities")
      .select("email, phone")
      .eq("id", contract.legal_entity_id)
      .maybeSingle();
    return {
      status: "success",
      message: `Segue o link do contrato:\n${contractLink}`,
      contractLink,
      recipientEmail: entity?.email ?? null,
      recipientPhone: entity?.phone ?? null,
      isNewLogin: false,
    };
  }

  if (!contract.person_id) {
    return { status: "error", message: "Contrato sem pessoa ou empresa associada." };
  }

  const { data: person } = await supabase
    .from("people")
    .select("full_name, email, phone")
    .eq("id", contract.person_id)
    .maybeSingle();
  if (!person) return { status: "error", message: "Pessoa não encontrada." };

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("person_id", contract.person_id)
    .maybeSingle();

  if (existingProfile) {
    return {
      status: "success",
      message:
        `Seu contrato está disponível:\n${contractLink}\n\n` +
        `Acesse com seu login já cadastrado.`,
      contractLink,
      recipientEmail: person.email,
      recipientPhone: person.phone,
      isNewLogin: false,
    };
  }

  if (!person.email) {
    return {
      status: "error",
      message: "Esta pessoa não tem e-mail cadastrado — não é possível criar o login.",
    };
  }
  if (!person.phone) {
    return {
      status: "error",
      message: "Esta pessoa não tem telefone cadastrado — não é possível gerar a senha inicial.",
    };
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Criação de login indisponível no momento.",
    };
  }

  const password = derivePasswordFromPhone(person.phone);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: person.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: person.full_name },
  });

  if (createError || !created?.user) {
    const alreadyExists = createError?.message?.toLowerCase().includes("already");
    return {
      status: "error",
      message: alreadyExists
        ? "Já existe um usuário com esse e-mail."
        : createError?.message || "Não foi possível criar o login.",
    };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      campaign_id: contract.campaign_id,
      full_name: person.full_name,
      phone: person.phone,
      person_id: contract.person_id,
    })
    .eq("id", created.user.id);

  if (updateError) {
    return {
      status: "error",
      message: "Login criado, mas houve um erro ao associar a pessoa. Avise o suporte.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "contrato.acesso.criar_login",
    p_entity_table: "contracts",
    p_entity_id: contractId,
    p_after_data: toJson({ person_id: contract.person_id, email: person.email }),
  });

  return {
    status: "success",
    message:
      `Seu contrato está disponível:\n${contractLink}\n\n` +
      `E-mail: ${person.email}\nSenha: ${password}\n\n` +
      `Assim que entrar, recomendamos trocar a senha em "Minha conta".`,
    contractLink,
    recipientEmail: person.email,
    recipientPhone: person.phone,
    tempPassword: password,
    isNewLogin: true,
  };
}

/** Registra que o link foi de fato aberto num canal — chamado no clique do botão, não bloqueia a navegação. */
export async function logContractDelivery(
  contractId: string,
  channel: "whatsapp" | "email",
  recipient: string,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("contract_deliveries").insert({
    contract_id: contractId,
    channel,
    recipient,
    sent_by: user?.id ?? null,
  });
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
