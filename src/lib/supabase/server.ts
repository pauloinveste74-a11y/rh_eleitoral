import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers. Lê/escreve a sessão através dos cookies da requisição.
 *
 * Usa somente a chave anon: a autorização real é garantida pelo RLS do
 * Postgres, não por esta camada. Nunca use a service role key aqui.
 */
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` chamado a partir de um Server Component: pode ser
          // ignorado com segurança porque o proxy (src/proxy.ts) já
          // renova a sessão a cada requisição.
        }
      },
    },
  });
}
