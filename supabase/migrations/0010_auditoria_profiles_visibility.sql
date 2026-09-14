-- =============================================================================
-- Fase 7 — Auditoria: auditor precisa conseguir resolver "quem fez o quê"
-- =============================================================================
-- profiles_select hoje só libera ver o perfil de outras pessoas pra
-- administrador (via is_admin()). Sem isso, um usuário com só o papel
-- auditor não consegue mostrar o nome/e-mail do autor de uma linha de
-- audit_logs que não seja ele mesmo — só o próprio perfil (id = auth.uid()).
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and (public.is_admin() or public.has_role(array['auditor'])))
  );
