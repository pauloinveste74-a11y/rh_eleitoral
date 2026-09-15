"use server";

import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { parseWorkbook, classifyRow, type ImportRowResult } from "@/lib/imports/person-import";
import { namesDiverge } from "@/lib/imports/name-match";
import type { Json } from "@/types/database";
import type { ImportBatchActionState } from "./action-state";

function toJson(value: unknown): Json {
  return value as Json;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function requireManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: isManager, error } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });
  if (error || !isManager) {
    return {
      ok: false,
      message: "Você não tem permissão para importar pessoas — restrito a administrador e RH.",
    };
  }
  return { ok: true };
}

/**
 * Sobe a planilha, faz o parsing + classificação de cada linha
 * (src/lib/imports/person-import.ts) e grava tudo em staging — nada vira
 * `people` ainda (isso só acontece em confirmImportBatch, depois da
 * prévia). Mesmo espírito de "nada é fonte oficial de dado antes de
 * confirmar" da spec original (seção 2/10).
 */
export async function uploadImportBatch(
  _prevState: ImportBatchActionState,
  formData: FormData,
): Promise<ImportBatchActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo .xlsx." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: "error", message: "Arquivo maior que 15 MB." };
  }
  if (file.type !== XLSX_MIME && !file.name.toLowerCase().endsWith(".xlsx")) {
    return { status: "error", message: "Envie um arquivo .xlsx (Excel)." };
  }

  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

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
      message: "Sua conta não está associada a uma campanha. Não é possível importar.",
    };
  }

  const buffer = await file.arrayBuffer();

  let rows: Record<string, string>[];
  try {
    rows = parseWorkbook(buffer);
  } catch {
    return {
      status: "error",
      message: "Não foi possível ler o arquivo. Confirme que é um .xlsx válido.",
    };
  }
  if (rows.length === 0) {
    return {
      status: "error",
      message:
        "Nenhuma linha de dados encontrada. Confira se a primeira linha é o cabeçalho e se os nomes das colunas batem com o modelo.",
    };
  }

  const fileHash = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  const storagePath = `${campaignId}/${randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("pessoas-importacoes")
    .upload(storagePath, file, { contentType: XLSX_MIME });
  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o arquivo." };
  }

  const { data: existingPeople } = await supabase
    .from("people")
    .select("id, cpf, full_name, status")
    .eq("campaign_id", campaignId);
  const activeExistingPeople = (existingPeople ?? []).filter(
    (p) => p.status !== "arquivado" && p.status !== "rejeitado",
  );
  const cpfsExisting = new Set(activeExistingPeople.map((p) => p.cpf));
  const existingByCpf = new Map(activeExistingPeople.map((p) => [p.cpf, p]));

  const cpfsSeenInFile = new Set<string>();
  const classified = rows.map((row, i) =>
    classifyRow(i + 2, row, cpfsSeenInFile, cpfsExisting),
  );

  const counts: Record<ImportRowResult, number> = {
    pronta: 0,
    invalida: 0,
    duplicada_arquivo: 0,
    ja_existente: 0,
  };
  for (const row of classified) counts[row.result]++;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      campaign_id: campaignId,
      template_version: "v1",
      original_file_name: file.name,
      storage_path: storagePath,
      file_hash: fileHash,
      created_by: user.id,
      total_rows: rows.length,
      valid_rows: counts.pronta,
      duplicate_rows: counts.duplicada_arquivo + counts.ja_existente,
      rejected_rows: counts.invalida,
      error_rows: counts.invalida,
      status: "preview",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { status: "error", message: "Não foi possível registrar o lote de importação." };
  }

  const { data: insertedStaging, error: stagingError } = await supabase
    .from("import_staging_records")
    .insert(
      classified.map((row) => ({
        batch_id: batch.id,
        row_number: row.rowNumber,
        raw_data: toJson(row.rawData),
        normalized_data: row.normalizedData ? toJson(row.normalizedData) : null,
        result: row.result,
      })),
    )
    .select("id, row_number");

  if (stagingError || !insertedStaging) {
    return {
      status: "error",
      message: "Lote criado, mas não foi possível gravar as linhas — tente novamente.",
    };
  }

  const stagingIdByRow = new Map(insertedStaging.map((s) => [s.row_number, s.id]));
  const errorRows = classified
    .filter((row) => row.errors.length > 0)
    .flatMap((row) =>
      row.errors.map((err) => ({
        staging_record_id: stagingIdByRow.get(row.rowNumber)!,
        field_name: err.field,
        error_code: row.result,
        error_message: err.message,
      })),
    )
    .filter((e) => e.staging_record_id);

  if (errorRows.length > 0) {
    await supabase.from("import_row_errors").insert(errorRows);
  }

  // IA (Claude) para checagem de dados, Etapa A — detecção determinística
  // (sem IA, é grátis): CPF já existente na campanha, mas nome divergente
  // do já cadastrado (ex.: "Jose" importado vs. "Josue" já cadastrado) —
  // provável erro de digitação numa das duas fontes. Fica em
  // data_conflicts (existia desde a 0018, nunca usada) pro administrador
  // resolver em /divergencias, com checagem opcional por IA contra o
  // documento de identidade da pessoa.
  const nameMismatchConflicts = classified
    .filter((row) => row.result === "ja_existente" && row.cpf && row.fullName)
    .map((row) => {
      const existing = existingByCpf.get(row.cpf!);
      if (!existing || !namesDiverge(existing.full_name, row.fullName!)) return null;
      return {
        campaign_id: campaignId,
        person_id: existing.id,
        staging_record_id: stagingIdByRow.get(row.rowNumber) ?? null,
        conflict_type: "dado_divergente" as const,
        details: toJson({
          cpf: row.cpf,
          nome_importado: row.fullName,
          nome_existente: existing.full_name,
        }),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (nameMismatchConflicts.length > 0) {
    await supabase.from("data_conflicts").insert(nameMismatchConflicts);
  }

  await supabase.rpc("log_audit_event", {
    p_action: "importacao.enviar",
    p_entity_table: "import_batches",
    p_entity_id: batch.id,
    p_after_data: toJson({ total_rows: rows.length, ...counts }),
  });

  revalidatePath("/importacoes");
  redirect(`/importacoes/${batch.id}`);
}

const PDF_MIME = "application/pdf";

/**
 * Nova versão, Etapa 7 (spec 9.2) — sobe um PDF, extrai o texto de cada
 * página (uma página = uma pessoa, ver `pdf-import.ts`) e grava tudo em
 * staging, na MESMA tabela e no mesmo formato do Excel — `confirmImportBatch()`
 * abaixo não precisou de nenhuma mudança pra servir os dois. Página sem
 * texto extraível (provável imagem digitalizada) entra como linha
 * inválida, com mensagem clara — não tenta OCR nesta etapa.
 */
export async function uploadPdfImportBatch(
  _prevState: ImportBatchActionState,
  formData: FormData,
): Promise<ImportBatchActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecione um arquivo .pdf." };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { status: "error", message: "Arquivo maior que 15 MB." };
  }
  if (file.type !== PDF_MIME && !file.name.toLowerCase().endsWith(".pdf")) {
    return { status: "error", message: "Envie um arquivo .pdf." };
  }

  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

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
      message: "Sua conta não está associada a uma campanha. Não é possível importar.",
    };
  }

  const buffer = await file.arrayBuffer();

  const { data: existingPeople } = await supabase
    .from("people")
    .select("id, cpf, full_name, status")
    .eq("campaign_id", campaignId);
  const activeExistingPeople = (existingPeople ?? []).filter(
    (p) => p.status !== "arquivado" && p.status !== "rejeitado",
  );
  const cpfsExisting = new Set(activeExistingPeople.map((p) => p.cpf));
  const existingByCpf = new Map(activeExistingPeople.map((p) => [p.cpf, p]));

  // Import dinâmico, de propósito: pdf-parse/pdfjs-dist tenta
  // polyfillar DOMMatrix/ImageData/Path2D pra suprir o
  // @napi-rs/canvas que não instala no runtime serverless da Vercel
  // (dependência nativa) — e essa tentativa falha com
  // "ReferenceError: DOMMatrix is not defined" assim que o módulo é
  // avaliado, não só quando chamado. Com import estático no topo do
  // arquivo, isso derrubava TODAS as Server Actions deste arquivo
  // (inclusive a importação por Excel, sem relação nenhuma com PDF) —
  // achado ao vivo em produção. Import dinâmico isola a falha: só
  // quebra quem realmente tenta importar por PDF.
  let classified: Awaited<ReturnType<typeof import("@/lib/imports/pdf-import").classifyPdfBatch>>;
  try {
    const { classifyPdfBatch } = await import("@/lib/imports/pdf-import");
    classified = await classifyPdfBatch(buffer, cpfsExisting);
  } catch {
    return {
      status: "error",
      message:
        "Importação por PDF indisponível no momento neste ambiente. Use a planilha Excel ou tente novamente mais tarde.",
    };
  }
  if (classified.length === 0) {
    return { status: "error", message: "O PDF não tem nenhuma página." };
  }

  const fileHash = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  const storagePath = `${campaignId}/${randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("pessoas-importacoes")
    .upload(storagePath, file, { contentType: PDF_MIME });
  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o arquivo." };
  }

  const counts: Record<ImportRowResult, number> = {
    pronta: 0,
    invalida: 0,
    duplicada_arquivo: 0,
    ja_existente: 0,
  };
  for (const row of classified) counts[row.result]++;

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      campaign_id: campaignId,
      source_type: "pdf",
      template_version: "pdf-v1",
      original_file_name: file.name,
      storage_path: storagePath,
      file_hash: fileHash,
      created_by: user.id,
      total_rows: classified.length,
      valid_rows: counts.pronta,
      duplicate_rows: counts.duplicada_arquivo + counts.ja_existente,
      rejected_rows: counts.invalida,
      error_rows: counts.invalida,
      status: "preview",
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { status: "error", message: "Não foi possível registrar o lote de importação." };
  }

  const { data: insertedStaging, error: stagingError } = await supabase
    .from("import_staging_records")
    .insert(
      classified.map((row) => ({
        batch_id: batch.id,
        row_number: row.rowNumber,
        raw_data: toJson(row.rawData),
        normalized_data: row.normalizedData ? toJson(row.normalizedData) : null,
        result: row.result,
      })),
    )
    .select("id, row_number");

  if (stagingError || !insertedStaging) {
    return {
      status: "error",
      message: "Lote criado, mas não foi possível gravar as páginas — tente novamente.",
    };
  }

  const stagingIdByRow = new Map(insertedStaging.map((s) => [s.row_number, s.id]));
  const errorRows = classified
    .filter((row) => row.errors.length > 0)
    .flatMap((row) =>
      row.errors.map((err) => ({
        staging_record_id: stagingIdByRow.get(row.rowNumber)!,
        field_name: err.field,
        error_code: row.requiresOcr ? "requer_ocr" : row.result,
        error_message: err.message,
      })),
    )
    .filter((e) => e.staging_record_id);

  if (errorRows.length > 0) {
    await supabase.from("import_row_errors").insert(errorRows);
  }

  // IA (Claude) para checagem de dados, Etapa A — mesma detecção
  // determinística do caminho Excel (ver comentário lá): CPF já
  // existente, nome divergente do já cadastrado.
  const nameMismatchConflicts = classified
    .filter((row) => row.result === "ja_existente" && row.cpf && row.fullName)
    .map((row) => {
      const existing = existingByCpf.get(row.cpf!);
      if (!existing || !namesDiverge(existing.full_name, row.fullName!)) return null;
      return {
        campaign_id: campaignId,
        person_id: existing.id,
        staging_record_id: stagingIdByRow.get(row.rowNumber) ?? null,
        conflict_type: "dado_divergente" as const,
        details: toJson({
          cpf: row.cpf,
          nome_importado: row.fullName,
          nome_existente: existing.full_name,
        }),
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (nameMismatchConflicts.length > 0) {
    await supabase.from("data_conflicts").insert(nameMismatchConflicts);
  }

  await supabase.rpc("log_audit_event", {
    p_action: "importacao.pdf.enviar",
    p_entity_table: "import_batches",
    p_entity_id: batch.id,
    p_after_data: toJson({ total_pages: classified.length, ...counts }),
  });

  revalidatePath("/importacoes");
  redirect(`/importacoes/${batch.id}`);
}

/**
 * Promove as linhas com result='pronta' de staging para `people` de fato —
 * a única escrita real desta etapa. Mesmo formato de gravação de
 * savePerson() (/pessoas), só que em lote: insere people + satélites
 * opcionais, direto (administrador/rh já tem policy de INSERT nessas
 * tabelas — sem função SECURITY DEFINER nova nesta etapa). Corrida rara
 * (CPF que virou duplicado entre a prévia e a confirmação) é tratada por
 * linha, não aborta o lote inteiro.
 */
export async function confirmImportBatch(
  batchId: string,
): Promise<ImportBatchActionState> {
  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const { data: batchRow, error: batchFetchError } = await supabase
    .from("import_batches")
    .select("id, status, source_type")
    .eq("id", batchId)
    .maybeSingle();
  if (batchFetchError || !batchRow) {
    return { status: "error", message: "Lote não encontrado." };
  }
  if (batchRow.status !== "preview") {
    return {
      status: "error",
      message: `Este lote já foi processado (status atual: ${batchRow.status}).`,
    };
  }
  const origin = batchRow.source_type === "pdf" ? "importacao_pdf" : "importacao_excel";

  const { data: readyRows, error: readyError } = await supabase
    .from("import_staging_records")
    .select("id, normalized_data")
    .eq("batch_id", batchId)
    .eq("result", "pronta");
  if (readyError) {
    return { status: "error", message: "Não foi possível ler as linhas prontas do lote." };
  }

  let imported = 0;
  let failed = 0;

  for (const staging of readyRows ?? []) {
    const data = staging.normalized_data as {
      person?: Record<string, string>;
      address?: Record<string, string>;
      bank?: Record<string, string>;
      electoral?: Record<string, string>;
    } | null;
    const person = data?.person;
    if (!person) {
      failed++;
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("people")
      .insert({
        full_name: person.fullName,
        cpf: person.cpf,
        birth_date: person.birthDate || null,
        phone: person.phone || null,
        whatsapp: person.whatsapp || null,
        email: person.email || null,
        origin,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      failed++;
      await supabase
        .from("import_staging_records")
        .update({ result: "ja_existente" })
        .eq("id", staging.id);
      await supabase.from("import_row_errors").insert({
        staging_record_id: staging.id,
        field_name: "cpf",
        error_code: "conflito_na_confirmacao",
        error_message:
          insertError?.code === "23505"
            ? "CPF passou a existir entre a prévia e a confirmação."
            : "Não foi possível criar esta pessoa.",
      });
      continue;
    }

    const personId = inserted.id;

    if (data?.address) {
      const a = data.address;
      await supabase.from("person_addresses").insert({
        person_id: personId,
        zip_code: a.zipCode,
        street: a.street,
        number: a.number || null,
        complement: a.complement || null,
        neighborhood: a.neighborhood,
        city: a.city,
        state: a.state?.toUpperCase(),
        created_by: user.id,
        updated_by: user.id,
      });
    }
    if (data?.bank) {
      const b = data.bank;
      await supabase.from("person_bank_accounts").insert({
        person_id: personId,
        bank_code: b.bankCode,
        bank_name: b.bankName || null,
        agency: b.agency,
        agency_digit: b.agencyDigit || null,
        account_number: b.accountNumber,
        account_digit: b.accountDigit || null,
        account_type: b.accountType as "corrente" | "poupanca",
        pix_key_type:
          (b.pixKeyType as "cpf" | "email" | "telefone" | "aleatoria" | undefined) || null,
        pix_key: b.pixKey || null,
        created_by: user.id,
        updated_by: user.id,
      });
    }
    if (data?.electoral) {
      const e = data.electoral;
      await supabase.from("person_electoral_data").insert({
        person_id: personId,
        voter_id: e.voterId || null,
        electoral_zone: e.electoralZone || null,
        electoral_section: e.electoralSection || null,
        voter_city: e.voterCity || null,
        voter_state: e.voterState ? e.voterState.toUpperCase() : null,
        created_by: user.id,
        updated_by: user.id,
      });
    }

    await supabase
      .from("import_staging_records")
      .update({ result: "importada", person_id: personId })
      .eq("id", staging.id);
    imported++;
  }

  await supabase
    .from("import_batches")
    .update({
      status: "confirmado",
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
      imported_rows: imported,
      duplicate_rows: failed,
    })
    .eq("id", batchId);

  await supabase.rpc("log_audit_event", {
    p_action: "importacao.confirmar",
    p_entity_table: "import_batches",
    p_entity_id: batchId,
    p_after_data: toJson({ imported, failed }),
  });

  revalidatePath(`/importacoes/${batchId}`);
  revalidatePath("/importacoes");
  revalidatePath("/pessoas");

  if (failed > 0) {
    return {
      status: "error",
      message: `${imported} pessoa(s) importada(s). ${failed} linha(s) falharam na confirmação (CPF passou a existir nesse meio-tempo) — veja o detalhe na tabela abaixo.`,
    };
  }
  return { status: "success", message: `${imported} pessoa(s) importada(s) com sucesso.` };
}

/** Cancela um lote que ainda não foi confirmado — não desfaz nada, porque nada foi gravado em `people` ainda. */
export async function cancelImportBatch(
  batchId: string,
): Promise<ImportBatchActionState> {
  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { data: batchRow } = await supabase
    .from("import_batches")
    .select("status")
    .eq("id", batchId)
    .maybeSingle();
  if (!batchRow || !["staging", "preview"].includes(batchRow.status)) {
    return { status: "error", message: "Este lote não pode mais ser cancelado." };
  }

  const { error } = await supabase
    .from("import_batches")
    .update({ status: "cancelado" })
    .eq("id", batchId);
  if (error) {
    return { status: "error", message: "Não foi possível cancelar o lote." };
  }

  revalidatePath(`/importacoes/${batchId}`);
  revalidatePath("/importacoes");
  return { status: "success" };
}

/**
 * Etapa 10 — reverte um lote já confirmado via revert_import_batch()
 * (migração 0027): só funciona se nenhuma pessoa do lote tiver vínculo
 * posterior (a própria função checa e rejeita, tudo ou nada).
 */
export async function revertImportBatch(
  batchId: string,
): Promise<ImportBatchActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revert_import_batch", {
    p_batch_id: batchId,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível reverter a importação.",
    };
  }

  revalidatePath(`/importacoes/${batchId}`);
  revalidatePath("/importacoes");
  revalidatePath("/pessoas");
  return { status: "success" };
}
