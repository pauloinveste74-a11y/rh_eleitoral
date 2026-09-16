"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { derivePasswordFromPhone } from "@/lib/temp-password";
import {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  vehicleSchema,
  engagementSchema,
  documentTypes,
  isSectionEmpty,
} from "@/lib/validations/person";
import { sendForApprovalSchema } from "@/lib/validations/territory";
import { sha256Hex } from "@/lib/documents/hash";
import type { Json } from "@/types/database";
import type { PersonActionState, SendPersonAccessState } from "./action-state";

/** Dados arbitrários já validados/serializáveis, só faltando o cast estrutural para Json. */
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
  "rg",
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
  "fullAddress",
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
const VEHICLE_FIELDS = ["vehicleBrand", "vehicleModel", "vehiclePlate", "vehicleRenavam"];
const ENGAGEMENT_FIELDS = [
  "leadershipNote",
  "referralName",
  "contractingTypeNote",
];

/**
 * Grava pessoa + satélites preenchidos a partir de um FormData. Usado tanto
 * por createPerson quanto updatePerson — a diferença entre criar e editar é
 * só se já existe um personId de partida (insert vs update em `people`).
 *
 * Sem transação real entre as chamadas (supabase-js faz uma requisição
 * PostgREST por tabela): se `people` gravar e um satélite falhar, a pessoa
 * já existe e o estado retornado carrega uma mensagem específica — o
 * chamador decide se redireciona mesmo assim para a edição completar o que
 * faltou.
 */
async function savePerson(
  existingPersonId: string | null,
  formData: FormData,
): Promise<PersonActionState & { personId?: string }> {
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

  const vehicleFieldsRaw = fieldsOf(formData, VEHICLE_FIELDS);
  const vehicleRaw = {
    brand: vehicleFieldsRaw.vehicleBrand,
    model: vehicleFieldsRaw.vehicleModel,
    plate: vehicleFieldsRaw.vehiclePlate,
    renavam: vehicleFieldsRaw.vehicleRenavam,
  };
  const vehiclePresent = !isSectionEmpty(vehicleFieldsRaw);
  const vehicleParsed = vehiclePresent ? vehicleSchema.safeParse(vehicleRaw) : null;
  if (vehicleParsed && !vehicleParsed.success) {
    Object.assign(errors, vehicleParsed.error.flatten().fieldErrors);
  }

  const engagementRaw = fieldsOf(formData, ENGAGEMENT_FIELDS);
  const engagementPresent = !isSectionEmpty(engagementRaw);
  const engagementParsed = engagementPresent
    ? engagementSchema.safeParse(engagementRaw)
    : null;
  if (engagementParsed && !engagementParsed.success) {
    Object.assign(errors, engagementParsed.error.flatten().fieldErrors);
  }

  const jobFunctionId = String(formData.get("jobFunctionId") ?? "").trim() || null;

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

  const requestId = randomUUID();
  const partialFailures: string[] = [];

  const personRow = {
    full_name: person.fullName,
    social_name: person.socialName || null,
    cpf: person.cpf,
    rg: person.rg || null,
    birth_date: person.birthDate || null,
    phone: person.phone || null,
    whatsapp: person.whatsapp || null,
    email: person.email || null,
    job_function_id: jobFunctionId,
    updated_by: user.id,
  };

  let personId = existingPersonId;
  let personBefore: Record<string, unknown> | null = null;

  if (existingPersonId) {
    const { data: before } = await supabase
      .from("people")
      .select("*")
      .eq("id", existingPersonId)
      .maybeSingle();
    personBefore = before;

    const { data: updated, error } = await supabase
      .from("people")
      .update(personRow)
      .eq("id", existingPersonId)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          status: "error",
          errors: { cpf: ["CPF já cadastrado para outra pessoa."] },
        };
      }
      return { status: "error", message: "Não foi possível salvar a pessoa." };
    }
    personId = updated.id;

    await supabase.rpc("log_audit_event", {
      p_action: "pessoa.editar",
      p_entity_table: "people",
      p_entity_id: personId,
      p_before_data: toJson(personBefore),
      p_after_data: toJson({ ...personRow, id: personId }),
      p_related_request_id: requestId,
    });
  } else {
    const { data: inserted, error } = await supabase
      .from("people")
      .insert({ ...personRow, created_by: user.id })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          status: "error",
          errors: { cpf: ["CPF já cadastrado."] },
        };
      }
      return { status: "error", message: "Não foi possível criar a pessoa." };
    }
    personId = inserted.id;

    await supabase.rpc("log_audit_event", {
      p_action: "pessoa.criar",
      p_entity_table: "people",
      p_entity_id: personId,
      p_after_data: toJson({ ...personRow, id: personId }),
      p_related_request_id: requestId,
    });
  }

  if (addressPresent && addressParsed?.success) {
    const a = addressParsed.data;
    const { error } = await supabase.from("person_addresses").upsert(
      {
        person_id: personId,
        zip_code: a.zipCode,
        street: a.street || null,
        number: a.number || null,
        complement: a.complement || null,
        neighborhood: a.neighborhood || null,
        city: a.city || null,
        state: a.state ? a.state.toUpperCase() : null,
        full_address: a.fullAddress || null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("endereço");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.endereco.salvar",
        p_entity_table: "person_addresses",
        p_entity_id: personId,
        p_after_data: toJson(a),
        p_related_request_id: requestId,
      });
    }
  }

  if (bankPresent && bankParsed?.success) {
    const b = bankParsed.data;
    const { error } = await supabase.from("person_bank_accounts").upsert(
      {
        person_id: personId,
        bank_code: b.bankCode,
        bank_name: b.bankName || null,
        agency: b.agency,
        agency_digit: b.agencyDigit || null,
        account_number: b.accountNumber,
        account_digit: b.accountDigit || null,
        account_type: b.accountType,
        pix_key_type: b.pixKeyType || null,
        pix_key: b.pixKey || null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("dados bancários");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.dados_bancarios.salvar",
        p_entity_table: "person_bank_accounts",
        p_entity_id: personId,
        p_after_data: toJson(b),
        p_related_request_id: requestId,
      });
    }
  }

  if (electoralPresent && electoralParsed?.success) {
    const e = electoralParsed.data;
    const { error } = await supabase.from("person_electoral_data").upsert(
      {
        person_id: personId,
        voter_id: e.voterId || null,
        electoral_zone: e.electoralZone || null,
        electoral_section: e.electoralSection || null,
        voter_city: e.voterCity || null,
        voter_state: e.voterState ? e.voterState.toUpperCase() : null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("dados eleitorais");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.dados_eleitorais.salvar",
        p_entity_table: "person_electoral_data",
        p_entity_id: personId,
        p_after_data: toJson(e),
        p_related_request_id: requestId,
      });
    }
  }

  if (vehiclePresent && vehicleParsed?.success) {
    const v = vehicleParsed.data;
    const { error } = await supabase.from("person_vehicles").upsert(
      {
        person_id: personId,
        brand: v.brand,
        model: v.model,
        plate: v.plate,
        renavam: v.renavam,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("veículo");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.veiculo.salvar",
        p_entity_table: "person_vehicles",
        p_entity_id: personId,
        p_after_data: toJson(v),
        p_related_request_id: requestId,
      });
    }
  }

  if (engagementPresent && engagementParsed?.success) {
    const e = engagementParsed.data;
    const { error } = await supabase.from("person_engagement_data").upsert(
      {
        person_id: personId,
        leadership_note: e.leadershipNote || null,
        referral_name: e.referralName || null,
        contracting_type_note: e.contractingTypeNote || null,
        created_by: user.id,
        updated_by: user.id,
      },
      { onConflict: "person_id" },
    );
    if (error) {
      partialFailures.push("dados de engajamento");
    } else {
      await supabase.rpc("log_audit_event", {
        p_action: "pessoa.engajamento.salvar",
        p_entity_table: "person_engagement_data",
        p_entity_id: personId,
        p_after_data: toJson(e),
        p_related_request_id: requestId,
      });
    }
  }

  revalidatePath("/pessoas");
  revalidatePath(`/pessoas/${personId}/editar`);

  if (partialFailures.length > 0) {
    await supabase.rpc("log_audit_event", {
      p_action: "pessoa.salvar.falha_parcial",
      p_entity_table: "people",
      p_entity_id: personId,
      p_reason: `Falha ao salvar: ${partialFailures.join(", ")}.`,
      p_result: "falha",
      p_related_request_id: requestId,
    });
    return {
      status: "error",
      personId: personId ?? undefined,
      message: `Pessoa salva, mas houve um erro ao salvar ${partialFailures.join(
        " e ",
      )}. Você pode tentar novamente nesta tela.`,
    };
  }

  return { status: "success", personId: personId ?? undefined };
}

export async function createPerson(
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const result = await savePerson(null, formData);
  if (result.status !== "error" && result.personId) {
    redirect(`/pessoas/${result.personId}/editar`);
  }
  return result;
}

export async function updatePerson(
  personId: string,
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  return savePerson(personId, formData);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function uploadPersonDocument(
  personId: string,
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      status: "error",
      message: "Sessão expirada. Faça login novamente.",
    };
  }

  // Deriva o campaign_id do dono do documento (a pessoa), não do usuário
  // que está fazendo o upload: um super admin pode estar editando uma
  // pessoa de uma campanha diferente da sua própria, e o path/registro
  // precisam ficar consistentes com a campanha real da pessoa.
  const { data: person, error: personError } = await supabase
    .from("people")
    .select("campaign_id")
    .eq("id", personId)
    .maybeSingle();
  if (personError || !person) {
    return { status: "error", message: "Pessoa não encontrada." };
  }
  const campaignId = person.campaign_id;

  const storagePath = `${campaignId}/${personId}/${randomUUID()}-${sanitizeFileName(file.name)}`;
  const fileHash = await sha256Hex(file);

  const { error: uploadError } = await supabase.storage
    .from("pessoas-documentos")
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o arquivo." };
  }

  // record_person_document() faz a checagem de autorização, a detecção de
  // duplicata por hash e o versionamento (substitui um documento anterior
  // classificado ilegível/divergente) — ver migração 0030. Se ela falhar,
  // o arquivo já subiu pro Storage; melhor esforço pra não deixar lixo.
  const { error: recordError } = await supabase.rpc("record_person_document", {
    p_person_id: personId,
    p_document_type: documentTypeRaw as (typeof documentTypes)[number],
    p_storage_path: storagePath,
    p_file_name: file.name,
    p_mime_type: file.type,
    p_file_size_bytes: file.size,
    p_file_hash: fileHash,
  });

  if (recordError) {
    await supabase.storage.from("pessoas-documentos").remove([storagePath]);
    return {
      status: "error",
      message: recordError.message.includes("duplicado")
        ? "Este arquivo já foi enviado antes para esta pessoa."
        : "Não foi possível registrar o documento.",
    };
  }

  revalidatePath(`/pessoas/${personId}/editar`);
  revalidatePath("/meu-cadastro");
  return { status: "success" };
}

export async function sendForApproval(
  personId: string,
  _prevState: PersonActionState,
  formData: FormData,
): Promise<PersonActionState> {
  const parsed = sendForApprovalSchema.safeParse({
    cityId: String(formData.get("cityId") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors };
  }

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

  const { data: person, error: personError } = await supabase
    .from("people")
    .select("id, status, campaign_id")
    .eq("id", personId)
    .maybeSingle();
  if (personError || !person) {
    return { status: "error", message: "Pessoa não encontrada." };
  }
  if (person.status !== "rascunho") {
    return {
      status: "error",
      message: "Esta pessoa já foi enviada para aprovação.",
    };
  }

  const { data: city, error: cityError } = await supabase
    .from("cities")
    .select("id, axis_id")
    .eq("id", parsed.data.cityId)
    .maybeSingle();
  if (cityError || !city) {
    return { status: "error", errors: { cityId: ["Cidade inválida."] } };
  }

  const { error: assignmentError } = await supabase
    .from("organizational_assignments")
    .insert({
      person_id: personId,
      campaign_id: person.campaign_id,
      city_id: city.id,
      axis_id: city.axis_id,
      status: "vigente",
      created_by: user.id,
    });
  if (assignmentError) {
    return {
      status: "error",
      message: "Não foi possível vincular a pessoa à cidade.",
    };
  }

  const { error: statusError } = await supabase
    .from("people")
    .update({ status: "pendente_validacao_cidade", updated_by: user.id })
    .eq("id", personId);
  if (statusError) {
    return {
      status: "error",
      message: "Vínculo criado, mas não foi possível atualizar o status.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "pessoa.enviar_aprovacao",
    p_entity_table: "people",
    p_entity_id: personId,
    p_after_data: toJson({
      status: "pendente_validacao_cidade",
      city_id: city.id,
    }),
  });

  revalidatePath(`/pessoas/${personId}/editar`);
  revalidatePath("/pessoas");
  revalidatePath("/aprovacoes");
  return { status: "success" };
}

export async function getPersonDocumentSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("pessoas-documentos")
    .createSignedUrl(storagePath, 60);

  if (error || !data) return null;
  return data.signedUrl;
}

const PERSON_LINK_BASE = "https://rh-eleitoral.vercel.app";

/**
 * Envio manual de link por WhatsApp/e-mail pra própria pessoa completar/
 * corrigir o cadastro dela — mesmo padrão de `sendContractAccess()`
 * (contratos/actions.ts), adaptado: aqui a pessoa já existe em `people`
 * (não é um convite novo), então o alvo é sempre `/meu-cadastro` (login
 * normal), nunca um token de `/cadastro/[token]`. Sem tabela de tracking
 * de entrega (diferente de `contract_deliveries`) — decisão deliberada,
 * é só um link de acesso, não um fluxo de entrega/lembrete como contrato.
 */
export async function sendPersonAccess(personId: string): Promise<SendPersonAccessState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sessão expirada. Faça login novamente." };

  const { data: person } = await supabase
    .from("people")
    .select("id, campaign_id, full_name, email, phone")
    .eq("id", personId)
    .maybeSingle();
  if (!person) return { status: "error", message: "Pessoa não encontrada." };

  const [{ data: isManager }, { data: profile }] = await Promise.all([
    supabase.rpc("has_role", { role_codes: ["administrador", "rh"] }),
    supabase.from("profiles").select("person_id").eq("id", user.id).maybeSingle(),
  ]);

  const ownPersonId = profile?.person_id ?? null;
  let isCoordinatorOfTarget = false;
  if (!isManager && ownPersonId) {
    const { data: rel } = await supabase
      .from("coordination_relationships")
      .select("id")
      .eq("coordinator_person_id", ownPersonId)
      .eq("subordinate_person_id", personId)
      .eq("status", "vigente")
      .maybeSingle();
    isCoordinatorOfTarget = Boolean(rel);
  }

  if (!isManager && !isCoordinatorOfTarget) {
    return { status: "error", message: "Você não tem permissão para enviar este link." };
  }

  const personLink = `${PERSON_LINK_BASE}/meu-cadastro`;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("person_id", personId)
    .maybeSingle();

  if (existingProfile) {
    return {
      status: "success",
      message:
        `Complete ou corrija seu cadastro:\n${personLink}\n\n` +
        `Acesse com seu login já cadastrado.`,
      personLink,
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
      campaign_id: person.campaign_id,
      full_name: person.full_name,
      phone: person.phone,
      person_id: personId,
    })
    .eq("id", created.user.id);

  if (updateError) {
    return {
      status: "error",
      message: "Login criado, mas houve um erro ao associar a pessoa. Avise o suporte.",
    };
  }

  await supabase.rpc("log_audit_event", {
    p_action: "pessoa.acesso.enviar",
    p_entity_table: "people",
    p_entity_id: personId,
    p_after_data: toJson({ email: person.email }),
  });

  return {
    status: "success",
    message:
      `Complete ou corrija seu cadastro:\n${personLink}\n\n` +
      `E-mail: ${person.email}\nSenha: ${password}\n\n` +
      `Assim que entrar, recomendamos trocar a senha em "Minha conta".`,
    personLink,
    recipientEmail: person.email,
    recipientPhone: person.phone,
    tempPassword: password,
    isNewLogin: true,
  };
}
