-- =============================================================================
-- Etapa 8 — configuração de alçada pela UI (/despesas/alcadas)
-- =============================================================================
-- expense_authorization_rules (0020) tinha select/insert/update pra
-- administrador, mas nenhuma policy de DELETE — sem ela, RLS bloqueia por
-- padrão e a tela de configuração não conseguiria remover uma regra criada
-- por engano. Único ajuste de banco desta etapa; toda a leitura/gravação
-- de regra já usava o cliente normal (mesmo espírito de /importacoes,
-- Etapa 6 — sem função SECURITY DEFINER nova).
-- =============================================================================

create policy expense_authorization_rules_delete on public.expense_authorization_rules for delete to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );
