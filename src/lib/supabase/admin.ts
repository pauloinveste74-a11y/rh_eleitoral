import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase com a service role key — ignora RLS por completo.
 *
 * Uso estritamente restrito: convite de novo usuário via
 * `auth.admin.inviteUserByEmail()` (Fase 9 — Usuários), sempre a partir de
 * uma Server Action que já verificou o papel do usuário chamador
 * (`has_role(['administrador', 'rh'])`) com o cliente normal ANTES de
 * chegar aqui — este cliente não sabe quem está chamando, então a
 * autorização não pode depender dele.
 *
 * `import "server-only"` garante em build time que este arquivo nunca é
 * incluído num bundle de cliente (navegador). NUNCA importar fora de
 * `src/app/**\/actions.ts` ou de outro código que só roda no servidor.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Defina essa variável de " +
        "ambiente (painel do Supabase > Settings > API > service_role) para " +
        "habilitar o convite de novos usuários. Nunca prefixe com NEXT_PUBLIC_.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
