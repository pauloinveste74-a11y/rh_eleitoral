-- =============================================================================
-- Fase 1A — Endurecimento de segurança (Security Advisor)
-- =============================================================================
-- Aplicada após validar a migração 0001 em um projeto Supabase real através
-- do Security Advisor. Corrige:
--   1. search_path mutável em set_updated_at (trigger function).
--   2. Funções SECURITY DEFINER executáveis por anon/authenticated via RPC
--      além do previsto: o Supabase concede EXECUTE por padrão a
--      anon/authenticated na criação da função (default privileges do
--      schema public), e isso não é revogado apenas com
--      "revoke all ... from public". É preciso revogar explicitamente de
--      cada role.
-- =============================================================================

-- 1. search_path fixo e vazio (a função só usa `new`/`now()`, que vêm de
--    pg_catalog, sempre pesquisado independentemente do search_path).
alter function public.set_updated_at() set search_path = '';

-- 2. handle_new_user: só deve rodar via trigger em auth.users, nunca via
--    chamada direta de RPC por nenhum papel do cliente.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- has_role / is_admin: uso interno das políticas de RLS e do código de
-- servidor autenticado. anon nunca deve poder chamá-las via RPC.
-- (authenticated continua podendo chamá-las diretamente — é intencional:
-- permite a um usuário logado checar o próprio papel; a função só enxerga
-- profile_id = auth.uid(), então não há escalonamento de privilégio nem
-- exposição de dado de terceiros.)
revoke all on function public.has_role(text[]) from public, anon, authenticated;
grant execute on function public.has_role(text[]) to authenticated;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;
