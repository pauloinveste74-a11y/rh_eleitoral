"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase para uso em Client Components (navegador).
 * Usa apenas a chave pública (anon). Nunca importe a service role key aqui.
 */
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
