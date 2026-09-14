"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { paymentSchema } from "@/lib/validations/payment";
import type { PaymentActionState } from "./action-state";

export async function createPayment(
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const parsed = paymentSchema.safeParse({
    personId: String(formData.get("personId") ?? ""),
    amountReais: String(formData.get("amountReais") ?? ""),
    description: String(formData.get("description") ?? ""),
  });
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const { data: paymentId, error } = await supabase.rpc("create_payment", {
    p_person_id: parsed.data.personId,
    p_amount_cents: parsed.data.amountReais,
    p_description: parsed.data.description,
  });

  if (error || !paymentId) {
    return {
      status: "error",
      message: error?.message || "Não foi possível criar o pagamento.",
    };
  }

  revalidatePath("/financeiro");
  redirect("/financeiro");
}

const VALID_DECISIONS = ["pagar", "rejeitar", "cancelar"] as const;

export async function decidePayment(
  paymentId: string,
  _prevState: PaymentActionState,
  formData: FormData,
): Promise<PaymentActionState> {
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!VALID_DECISIONS.includes(decision as (typeof VALID_DECISIONS)[number])) {
    return { status: "error", message: "Decisão inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_payment", {
    p_payment_id: paymentId,
    p_decision: decision,
    p_reason: reason || null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a decisão.",
    };
  }

  revalidatePath("/financeiro");
  return { status: "success" };
}
