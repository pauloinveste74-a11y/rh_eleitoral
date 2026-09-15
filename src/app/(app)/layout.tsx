import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { formatCnpj } from "@/lib/validations/cnpj";

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
    .select("full_name, email, campaign_id, is_platform_admin")
    .eq("id", user.id)
    .maybeSingle();

  const userLabel =
    profile?.full_name ?? profile?.email ?? user.email ?? "Usuário";

  // Modo de suporte (Multi-tenant, Etapa 2): se o master "entrou" numa
  // organização (cookie setado por `enterOrganization()`), as telas
  // mostram os dados dela em vez da campanha "casa" do próprio profile.
  const cookieStore = await cookies();
  const activeCampaignId = profile?.is_platform_admin
    ? cookieStore.get("active_campaign_id")?.value
    : undefined;

  let campaignName: string | undefined;
  let supportMode: { organizationName: string; documentNumberFormatted: string | null } | undefined;

  if (activeCampaignId) {
    const { data: activeCampaign } = await supabase
      .from("campaigns")
      .select("name, document_number")
      .eq("id", activeCampaignId)
      .maybeSingle();
    if (activeCampaign) {
      campaignName = activeCampaign.name;
      supportMode = {
        organizationName: activeCampaign.name,
        documentNumberFormatted: activeCampaign.document_number
          ? formatCnpj(activeCampaign.document_number)
          : null,
      };
    }
  } else if (profile?.campaign_id) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name")
      .eq("id", profile.campaign_id)
      .maybeSingle();
    campaignName = campaign?.name;
  }

  const campaignLabel = profile?.is_platform_admin
    ? campaignName
      ? supportMode
        ? campaignName
        : `${campaignName} · Super admin`
      : "Super admin (todas as campanhas)"
    : campaignName;

  return (
    <AppShell
      userLabel={userLabel}
      campaignLabel={campaignLabel}
      isPlatformAdmin={profile?.is_platform_admin ?? false}
      supportMode={supportMode}
    >
      {children}
    </AppShell>
  );
}
