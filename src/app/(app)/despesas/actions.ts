"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/lib/validations/expense";
import type { ExpenseActionState } from "./action-state";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function createExpense(
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = expenseSchema.safeParse({
    personId: String(formData.get("personId") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    amountReais: String(formData.get("amountReais") ?? ""),
    purpose: String(formData.get("purpose") ?? ""),
    expenseDate: String(formData.get("expenseDate") ?? ""),
    vendorName: String(formData.get("vendorName") ?? ""),
    vendorDocument: String(formData.get("vendorDocument") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    purchaserPersonId: String(formData.get("purchaserPersonId") ?? ""),
    authorizerType: String(formData.get("authorizerType") ?? ""),
    authorizedByProfileId: String(formData.get("authorizedByProfileId") ?? ""),
    unidentifiedAuthorizerName: String(formData.get("unidentifiedAuthorizerName") ?? ""),
    unidentifiedAuthorizerPhone: String(formData.get("unidentifiedAuthorizerPhone") ?? ""),
    unidentifiedAuthorizerReason: String(formData.get("unidentifiedAuthorizerReason") ?? ""),
    authorizationChannel: String(formData.get("authorizationChannel") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    return { status: "error", errors: { receipt: ["Anexe o comprovante."] } };
  }
  if (receipt.size > MAX_FILE_SIZE_BYTES) {
    return { status: "error", errors: { receipt: ["Arquivo maior que 10 MB."] } };
  }
  if (!ALLOWED_MIME_TYPES.includes(receipt.type)) {
    return {
      status: "error",
      errors: { receipt: ["Formato não permitido. Use PDF, JPG ou PNG."] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const { data: person, error: personError } = await supabase
    .from("people")
    .select("id, campaign_id")
    .eq("id", parsed.data.personId)
    .maybeSingle();
  if (personError || !person) {
    return { status: "error", errors: { personId: ["Pessoa não encontrada."] } };
  }

  // O texto legado de `expenses.category` (checagem fixa em 6 valores) vem
  // do `code` da categoria estruturada escolhida — a tela só mostra a lista
  // de expense_categories, nunca o enum antigo diretamente.
  const { data: category, error: categoryError } = await supabase
    .from("expense_categories")
    .select("code")
    .eq("id", parsed.data.categoryId)
    .maybeSingle();
  if (categoryError || !category) {
    return { status: "error", errors: { categoryId: ["Categoria não encontrada."] } };
  }

  const storagePath = `${person.campaign_id}/${person.id}/${randomUUID()}-${sanitizeFileName(receipt.name)}`;

  const { error: uploadError } = await supabase.storage
    .from("despesas-comprovantes")
    .upload(storagePath, receipt, { contentType: receipt.type });
  if (uploadError) {
    return { status: "error", message: "Não foi possível enviar o comprovante." };
  }

  const { data: expenseId, error } = await supabase.rpc("create_expense", {
    p_person_id: parsed.data.personId,
    p_category: category.code,
    p_amount_cents: parsed.data.amountReais,
    p_description: parsed.data.purpose,
    p_expense_date: parsed.data.expenseDate,
    p_receipt_storage_path: storagePath,
    p_category_id: parsed.data.categoryId,
    p_purpose: parsed.data.purpose,
    p_vendor_name: parsed.data.vendorName || null,
    p_vendor_document: parsed.data.vendorDocument || null,
    p_payment_method: parsed.data.paymentMethod,
    p_purchaser_person_id: parsed.data.purchaserPersonId || null,
    p_authorized_by_profile_id:
      parsed.data.authorizerType === "sistema" ? parsed.data.authorizedByProfileId || null : null,
    p_unidentified_authorizer_name:
      parsed.data.authorizerType === "nao_identificado"
        ? parsed.data.unidentifiedAuthorizerName || null
        : null,
    p_unidentified_authorizer_phone:
      parsed.data.authorizerType === "nao_identificado"
        ? parsed.data.unidentifiedAuthorizerPhone || null
        : null,
    p_unidentified_authorizer_reason:
      parsed.data.authorizerType === "nao_identificado"
        ? parsed.data.unidentifiedAuthorizerReason || null
        : null,
    p_authorization_channel: parsed.data.authorizationChannel,
  });

  if (error || !expenseId) {
    return {
      status: "error",
      message: error?.message || "Não foi possível registrar a despesa.",
    };
  }

  revalidatePath("/despesas");
  redirect("/despesas");
}

const VALID_DECISIONS = ["pagar", "rejeitar", "cancelar"] as const;

export async function decideExpense(
  expenseId: string,
  _prevState: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!VALID_DECISIONS.includes(decision as (typeof VALID_DECISIONS)[number])) {
    return { status: "error", message: "Decisão inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_expense", {
    p_expense_id: expenseId,
    p_decision: decision,
    p_reason: reason || null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a decisão.",
    };
  }

  revalidatePath("/despesas");
  return { status: "success" };
}

export async function getExpenseReceiptSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("despesas-comprovantes")
    .createSignedUrl(storagePath, 60);

  if (error || !data) return null;
  return data.signedUrl;
}
