"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Limpa o modo de suporte (Multi-tenant, Etapa 2) — não deixar uma
  // organização "ativa" vazando pra uma sessão de login futura.
  const cookieStore = await cookies();
  cookieStore.delete("active_campaign_id");

  redirect("/login");
}
