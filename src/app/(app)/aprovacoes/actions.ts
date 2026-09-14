"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ApprovalActionState } from "./action-state";

export async function decideApproval(
  personId: string,
  _prevState: ApprovalActionState,
  formData: FormData,
): Promise<ApprovalActionState> {
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (decision !== "aprovar" && decision !== "rejeitar") {
    return { status: "error", message: "Decisão inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_approval", {
    p_person_id: personId,
    p_decision: decision,
    p_reason: reason || null,
  });

  if (error) {
    return {
      status: "error",
      message: error.message || "Não foi possível registrar a decisão.",
    };
  }

  revalidatePath("/aprovacoes");
  revalidatePath(`/pessoas/${personId}/editar`);
  return { status: "success" };
}
