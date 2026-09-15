"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { TeamInviteActionState } from "./action-state";

/**
 * Cria um convite de autocadastro para um subordinado direto via
 * create_team_invite() (migração 0022) — exige que o próprio chamador já
 * tenha completado o cadastro (profiles.person_id preenchido); a função
 * herda cidade/eixo do profile_roles do chamador quando ele for
 * coordenador_cidade/coordenador_eixo.
 */
export async function createInvite(
  _prevState: TeamInviteActionState,
  formData: FormData,
): Promise<TeamInviteActionState> {
  const contactName = String(formData.get("contactName") ?? "").trim();
  const contactPhone = String(formData.get("contactPhone") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();

  const supabase = await createClient();
  const { data: invite, error } = await supabase.rpc("create_team_invite", {
    p_contact_name: contactName || null,
    p_contact_phone: contactPhone || null,
    p_contact_email: contactEmail || null,
    p_expires_in_days: 7,
  });

  if (error || !invite) {
    return {
      status: "error",
      message: error?.message || "Não foi possível criar o convite.",
    };
  }

  revalidatePath("/minha-equipe");
  return {
    status: "success",
    invite: {
      token: invite.token,
      contactName: invite.contact_name,
      contactPhone: invite.contact_phone,
    },
  };
}
