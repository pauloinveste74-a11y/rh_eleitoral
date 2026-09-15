"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getPersonDocumentSignedUrl } from "@/app/(app)/pessoas/actions";
import { crossCheckIdentityDocument } from "@/lib/ai/document-cross-check";
import type { Json } from "@/types/database";
import type { DivergenceActionState } from "./action-state";

async function requireManager(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: isManager, error } = await supabase.rpc("has_role", {
    role_codes: ["administrador", "rh"],
  });
  if (error || !isManager) {
    return { ok: false, message: "Você não tem permissão para gerenciar divergências." };
  }
  return { ok: true };
}

/**
 * Busca o RG/CNH mais recente da pessoa e pede pro Claude ler e
 * comparar contra o nome/CPF atualmente cadastrados — sob demanda,
 * só quando o administrador clica (nunca automático), por custo e
 * previsibilidade. Resultado é anexado a `data_conflicts.details`,
 * não muda `status` nem aplica nada sozinho — a decisão final
 * continua com `resolveConflict()`.
 */
export async function checkWithAi(conflictId: string): Promise<DivergenceActionState> {
  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { data: conflict } = await supabase
    .from("data_conflicts")
    .select("id, person_id, details")
    .eq("id", conflictId)
    .maybeSingle();
  if (!conflict || !conflict.person_id) {
    return { status: "error", message: "Divergência não encontrada ou sem pessoa associada." };
  }

  const { data: person } = await supabase
    .from("people")
    .select("full_name, cpf")
    .eq("id", conflict.person_id)
    .maybeSingle();
  if (!person) {
    return { status: "error", message: "Pessoa não encontrada." };
  }

  const { data: document } = await supabase
    .from("person_documents")
    .select("storage_path, mime_type")
    .eq("person_id", conflict.person_id)
    .eq("status", "ativo")
    .in("document_type", ["rg", "cnh"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!document) {
    return {
      status: "error",
      message: "Esta pessoa não tem RG/CNH cadastrado — não dá pra verificar com IA.",
    };
  }

  const signedUrl = await getPersonDocumentSignedUrl(document.storage_path);
  if (!signedUrl) {
    return { status: "error", message: "Não foi possível acessar o documento." };
  }

  let documentBytes: Buffer;
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error("download falhou");
    documentBytes = Buffer.from(await response.arrayBuffer());
  } catch {
    return { status: "error", message: "Não foi possível baixar o documento." };
  }

  let result: Awaited<ReturnType<typeof crossCheckIdentityDocument>>;
  try {
    result = await crossCheckIdentityDocument({
      documentBytes,
      mimeType: document.mime_type,
      candidateName: person.full_name,
      candidateCpf: person.cpf,
    });
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error
          ? err.message
          : "Não foi possível verificar o documento com a IA no momento.",
    };
  }

  const currentDetails = (conflict.details ?? {}) as Record<string, unknown>;
  await supabase
    .from("data_conflicts")
    .update({
      details: {
        ...currentDetails,
        verificacao_ia: {
          verdict: result.verdict,
          extracted_name: result.extractedName,
          extracted_cpf: result.extractedCpf,
          explanation: result.explanation,
        },
      } as Json,
      status: "em_analise",
    })
    .eq("id", conflictId);

  revalidatePath("/divergencias");
  return {
    status: "success",
    aiVerdict: result.verdict,
    aiExtractedName: result.extractedName,
    aiExtractedCpf: result.extractedCpf,
    aiExplanation: result.explanation,
  };
}

export async function resolveConflict(
  conflictId: string,
  resolution: string,
  note: string,
  applyCorrection: boolean,
  correctedName: string | null,
): Promise<DivergenceActionState> {
  const supabase = await createClient();
  const guard = await requireManager(supabase);
  if (!guard.ok) return { status: "error", message: guard.message };

  const { error } = await supabase.rpc("resolve_data_conflict", {
    p_conflict_id: conflictId,
    p_resolution: resolution,
    p_note: note || null,
    p_apply_correction: applyCorrection,
    p_corrected_name: correctedName,
  });

  if (error) {
    return { status: "error", message: error.message || "Não foi possível resolver a divergência." };
  }

  revalidatePath("/divergencias");
  return { status: "success" };
}
