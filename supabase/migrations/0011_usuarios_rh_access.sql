-- =============================================================================
-- Fase 9 — Usuários: rh também gerencia usuários (convite + papéis)
-- =============================================================================
-- profiles_select/profiles_update hoje só liberam ver/editar outros
-- perfis pra administrador (via is_admin()). A tela de Usuários (Fase 9)
-- decidiu que administrador E rh gerenciam usuários — profile_roles já
-- permite isso desde a 0001 (profile_roles_insert/update/delete checam
-- has_role(['administrador','rh'])), mas profiles (listar usuários da
-- campanha, suspender/reativar) ainda não.
-- =============================================================================
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or (
      campaign_id = (select public.current_campaign_id())
      and public.has_role(array['administrador', 'rh', 'auditor'])
    )
  );

drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or (
      campaign_id = (select public.current_campaign_id())
      and public.has_role(array['administrador', 'rh'])
    )
  )
  with check (
    id = (select auth.uid())
    or public.is_platform_admin()
    or (
      campaign_id = (select public.current_campaign_id())
      and public.has_role(array['administrador', 'rh'])
    )
  );
