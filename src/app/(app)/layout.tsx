import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

// Todo o painel autenticado depende da sessão do usuário na requisição
// (cookies) e nunca deve ser pré-renderizado estaticamente ou cacheado
// entre usuários diferentes.
export const dynamic = "force-dynamic";

/**
 * Layout do painel autenticado. O proxy (src/proxy.ts) já bloqueia o
 * acesso não autenticado de forma otimista; esta checagem no servidor é a
 * segunda camada de defesa (nunca confiar só no proxy — ver seção 19).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const userLabel =
    profile?.full_name ?? profile?.email ?? user.email ?? "Usuário";

  return <AppShell userLabel={userLabel}>{children}</AppShell>;
}
