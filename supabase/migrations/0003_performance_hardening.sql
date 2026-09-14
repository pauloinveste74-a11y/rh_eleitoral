-- =============================================================================
-- Fase 1A — Endurecimento de performance de RLS (Performance Advisor)
-- =============================================================================
-- Aplicada após validar as migrações 0001/0002 em um projeto Supabase real
-- através do Performance Advisor. Corrige:
--   1. Políticas "for all" duplicavam a permissão de SELECT já coberta
--      pela política "_select" da mesma tabela (multiple_permissive_policies:
--      cada policy permissiva extra é avaliada em toda consulta). Substituídas
--      por políticas separadas de insert/update/delete.
--   2. auth.uid() reavaliado por linha em profiles/profile_roles
--      (auth_rls_initplan) — envolvido em "(select auth.uid())" para ser
--      avaliado uma única vez por consulta em vez de uma vez por linha.
--   3. Índices ausentes em colunas de chave estrangeira (unindexed_foreign_keys).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Políticas de escrita separadas por operação (remove SELECT duplicado)
-- -----------------------------------------------------------------------------
drop policy campaigns_write on public.campaigns;
create policy campaigns_insert on public.campaigns for insert to authenticated with check (public.is_admin());
create policy campaigns_update on public.campaigns for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy campaigns_delete on public.campaigns for delete to authenticated using (public.is_admin());

drop policy roles_write on public.roles;
create policy roles_insert on public.roles for insert to authenticated with check (public.is_admin());
create policy roles_update on public.roles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy roles_delete on public.roles for delete to authenticated using (public.is_admin());

drop policy axes_write on public.axes;
create policy axes_insert on public.axes for insert to authenticated with check (public.is_admin());
create policy axes_update on public.axes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy axes_delete on public.axes for delete to authenticated using (public.is_admin());

drop policy cities_write on public.cities;
create policy cities_insert on public.cities for insert to authenticated with check (public.is_admin());
create policy cities_update on public.cities for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy cities_delete on public.cities for delete to authenticated using (public.is_admin());

drop policy teams_write on public.teams;
create policy teams_insert on public.teams for insert to authenticated with check (public.is_admin());
create policy teams_update on public.teams for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy teams_delete on public.teams for delete to authenticated using (public.is_admin());

drop policy profile_roles_write on public.profile_roles;
create policy profile_roles_insert on public.profile_roles for insert to authenticated with check (public.has_role(array['administrador', 'rh']));
create policy profile_roles_update on public.profile_roles for update to authenticated using (public.has_role(array['administrador', 'rh'])) with check (public.has_role(array['administrador', 'rh']));
create policy profile_roles_delete on public.profile_roles for delete to authenticated using (public.has_role(array['administrador', 'rh']));

-- -----------------------------------------------------------------------------
-- 2. auth.uid() avaliado uma vez por consulta, não por linha
-- -----------------------------------------------------------------------------
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

drop policy profile_roles_select on public.profile_roles;
create policy profile_roles_select on public.profile_roles
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.has_role(array['administrador', 'rh']));

-- -----------------------------------------------------------------------------
-- 3. Índices de cobertura para chaves estrangeiras
-- -----------------------------------------------------------------------------
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);

create index if not exists organizational_assignments_axis_id_idx on public.organizational_assignments (axis_id);
create index if not exists organizational_assignments_campaign_id_idx on public.organizational_assignments (campaign_id);
create index if not exists organizational_assignments_city_id_idx on public.organizational_assignments (city_id);
create index if not exists organizational_assignments_created_by_idx on public.organizational_assignments (created_by);
create index if not exists organizational_assignments_responsible_person_id_idx on public.organizational_assignments (responsible_person_id);
create index if not exists organizational_assignments_role_id_idx on public.organizational_assignments (role_id);
create index if not exists organizational_assignments_team_id_idx on public.organizational_assignments (team_id);

create index if not exists people_created_by_idx on public.people (created_by);
create index if not exists people_updated_by_idx on public.people (updated_by);

create index if not exists profile_roles_axis_id_idx on public.profile_roles (axis_id);
create index if not exists profile_roles_campaign_id_idx on public.profile_roles (campaign_id);
create index if not exists profile_roles_city_id_idx on public.profile_roles (city_id);
create index if not exists profile_roles_delegated_by_idx on public.profile_roles (delegated_by);
create index if not exists profile_roles_role_id_idx on public.profile_roles (role_id);
create index if not exists profile_roles_team_id_idx on public.profile_roles (team_id);

create index if not exists profiles_person_id_idx on public.profiles (person_id);
