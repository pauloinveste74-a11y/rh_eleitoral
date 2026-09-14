/**
 * Leitura centralizada das variáveis de ambiente do Supabase.
 *
 * Importante: a leitura só falha quando efetivamente chamada em tempo de
 * execução (runtime), nunca no carregamento do módulo. Isso permite que
 * `next build` complete mesmo sem um projeto Supabase configurado (as
 * páginas desta fase não fazem chamadas ao banco durante o build).
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes. Configure NEXT_PUBLIC_SUPABASE_URL e " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local (veja .env.example).",
    );
  }

  return { url, anonKey };
}
