-- =============================================================================
-- Fase 1C — Multi-tenant: isolamento por campaign_id + super admin de plataforma
-- =============================================================================
-- Cada linha de `campaigns` passa a ser um tenant isolado. Toda tabela de
-- domínio ganha uma coluna `campaign_id` própria (denormalizada, seguindo o
-- princípio de performance já estabelecido em 0002/0003 — evitar joins por
-- linha em política de RLS), e toda política passa a exigir
-- `campaign_id = current_campaign_id()` além dos checks de papel já
-- existentes. `roles` continua sem `campaign_id` — é catálogo global.
--
-- `profiles.campaign_id` e `audit_logs.campaign_id` ficam nullable
-- (justificativa: o trigger handle_new_user() não sabe a campanha no
-- momento do cadastro; o bootstrap de um usuário novo passa a incluir um
-- UPDATE manual — ver README). Um usuário sem campanha e sem
-- is_platform_admin não enxerga nada, por padrão de segurança.
--
-- `pauloinvest74@gmail.com` é o super administrador de plataforma
-- (`profiles.is_platform_admin`): atravessa o isolamento normal, mas
-- continua também sendo administrador da 1ª campanha real (papel duplo).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- (a) Colunas novas (nullable por enquanto — defaults/not null vêm depois de
--     as funções existirem e o backfill rodar)
-- -----------------------------------------------------------------------------
alter table public.cities add column campaign_id uuid references public.campaigns(id);
alter table public.teams add column campaign_id uuid references public.campaigns(id);
alter table public.people add column campaign_id uuid references public.campaigns(id);
alter table public.profiles add column campaign_id uuid references public.campaigns(id);
alter table public.profiles add column is_platform_admin boolean not null default false;
alter table public.person_addresses add column campaign_id uuid references public.campaigns(id);
alter table public.person_bank_accounts add column campaign_id uuid references public.campaigns(id);
alter table public.person_electoral_data add column campaign_id uuid references public.campaigns(id);
alter table public.person_documents add column campaign_id uuid references public.campaigns(id);
alter table public.audit_logs add column campaign_id uuid references public.campaigns(id);

-- -----------------------------------------------------------------------------
-- (b) Primeira campanha real
-- -----------------------------------------------------------------------------
insert into public.campaigns (name, slug, status)
values ('Bia Kicis - Senadora', 'bia-kicis-senadora', 'ativa');

-- -----------------------------------------------------------------------------
-- (c) Funções current_campaign_id() / is_platform_admin() (mesmo idioma de
--     has_role()/is_admin(): SECURITY DEFINER, search_path fixo, revoke+grant)
-- -----------------------------------------------------------------------------
create or replace function public.current_campaign_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select campaign_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_campaign_id() from public, anon, authenticated;
grant execute on function public.current_campaign_id() to authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_platform_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_platform_admin() from public, anon, authenticated;
grant execute on function public.is_platform_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- (d) Backfill dos dados existentes para a campanha recém-criada
-- -----------------------------------------------------------------------------
do $$
declare
  v_campaign_id uuid;
begin
  select id into v_campaign_id from public.campaigns where slug = 'bia-kicis-senadora';

  update public.profiles
    set campaign_id = v_campaign_id,
        is_platform_admin = (email = 'pauloinvest74@gmail.com')
    where campaign_id is null;

  update public.people set campaign_id = v_campaign_id where campaign_id is null;
  update public.person_addresses set campaign_id = v_campaign_id where campaign_id is null;
  update public.person_bank_accounts set campaign_id = v_campaign_id where campaign_id is null;
  update public.person_electoral_data set campaign_id = v_campaign_id where campaign_id is null;
  update public.person_documents set campaign_id = v_campaign_id where campaign_id is null;
  update public.audit_logs set campaign_id = v_campaign_id where campaign_id is null;
  -- cities/teams/axes/organizational_assignments: sem linhas hoje, nada a fazer.
end $$;

-- -----------------------------------------------------------------------------
-- (e) NOT NULL + default (exceto profiles/audit_logs, que ficam nullable —
--     ver justificativa no cabeçalho: bootstrap de usuário novo precisa
--     poder existir antes de ter campanha atribuída)
-- -----------------------------------------------------------------------------
alter table public.cities
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();
alter table public.teams
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();
alter table public.people
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();
alter table public.person_addresses
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();
alter table public.person_bank_accounts
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();
alter table public.person_electoral_data
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();
alter table public.person_documents
  alter column campaign_id set not null,
  alter column campaign_id set default public.current_campaign_id();

create index cities_campaign_id_idx on public.cities (campaign_id);
create index teams_campaign_id_idx on public.teams (campaign_id);
create index people_campaign_id_idx on public.people (campaign_id);
create index profiles_campaign_id_idx on public.profiles (campaign_id);
create index person_addresses_campaign_id_idx on public.person_addresses (campaign_id);
create index person_bank_accounts_campaign_id_idx on public.person_bank_accounts (campaign_id);
create index person_electoral_data_campaign_id_idx on public.person_electoral_data (campaign_id);
create index person_documents_campaign_id_idx on public.person_documents (campaign_id);
create index audit_logs_campaign_id_idx on public.audit_logs (campaign_id);

-- -----------------------------------------------------------------------------
-- (f) Reescrever políticas de RLS: is_platform_admin() sempre como bypass,
--     campaign_id = current_campaign_id() sempre que a política checar
--     has_role()/is_admin() ou hoje usava "using (true)".
-- -----------------------------------------------------------------------------

-- campaigns
drop policy campaigns_select on public.campaigns;
create policy campaigns_select on public.campaigns for select to authenticated
  using (public.is_platform_admin() or id = (select public.current_campaign_id()));

drop policy campaigns_insert on public.campaigns;
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (public.is_platform_admin());

drop policy campaigns_update on public.campaigns;
create policy campaigns_update on public.campaigns for update to authenticated
  using (public.is_platform_admin() or (id = (select public.current_campaign_id()) and public.is_admin()))
  with check (public.is_platform_admin() or (id = (select public.current_campaign_id()) and public.is_admin()));

drop policy campaigns_delete on public.campaigns;
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (public.is_platform_admin() or (id = (select public.current_campaign_id()) and public.is_admin()));

-- axes
drop policy axes_select on public.axes;
create policy axes_select on public.axes for select to authenticated
  using (public.is_platform_admin() or campaign_id = (select public.current_campaign_id()));

drop policy axes_insert on public.axes;
create policy axes_insert on public.axes for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy axes_update on public.axes;
create policy axes_update on public.axes for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy axes_delete on public.axes;
create policy axes_delete on public.axes for delete to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

-- cities
drop policy cities_select on public.cities;
create policy cities_select on public.cities for select to authenticated
  using (public.is_platform_admin() or campaign_id = (select public.current_campaign_id()));

drop policy cities_insert on public.cities;
create policy cities_insert on public.cities for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy cities_update on public.cities;
create policy cities_update on public.cities for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy cities_delete on public.cities;
create policy cities_delete on public.cities for delete to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

-- teams
drop policy teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.is_platform_admin() or campaign_id = (select public.current_campaign_id()));

drop policy teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

-- people
drop policy people_select on public.people;
create policy people_select on public.people for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));

drop policy people_insert on public.people;
create policy people_insert on public.people for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

drop policy people_update on public.people;
create policy people_update on public.people for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- person_addresses
drop policy person_addresses_select on public.person_addresses;
create policy person_addresses_select on public.person_addresses for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));

drop policy person_addresses_insert on public.person_addresses;
create policy person_addresses_insert on public.person_addresses for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

drop policy person_addresses_update on public.person_addresses;
create policy person_addresses_update on public.person_addresses for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- person_bank_accounts
drop policy person_bank_accounts_select on public.person_bank_accounts;
create policy person_bank_accounts_select on public.person_bank_accounts for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));

drop policy person_bank_accounts_insert on public.person_bank_accounts;
create policy person_bank_accounts_insert on public.person_bank_accounts for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

drop policy person_bank_accounts_update on public.person_bank_accounts;
create policy person_bank_accounts_update on public.person_bank_accounts for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- person_electoral_data
drop policy person_electoral_data_select on public.person_electoral_data;
create policy person_electoral_data_select on public.person_electoral_data for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));

drop policy person_electoral_data_insert on public.person_electoral_data;
create policy person_electoral_data_insert on public.person_electoral_data for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

drop policy person_electoral_data_update on public.person_electoral_data;
create policy person_electoral_data_update on public.person_electoral_data for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- person_documents
drop policy person_documents_select on public.person_documents;
create policy person_documents_select on public.person_documents for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));

drop policy person_documents_insert on public.person_documents;
create policy person_documents_insert on public.person_documents for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

drop policy person_documents_update on public.person_documents;
create policy person_documents_update on public.person_documents for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- profiles
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

drop policy profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()))
  with check (id = (select auth.uid()) or public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.is_admin()));

-- profile_roles (usa join em profiles, já que profile_roles.campaign_id
-- fica sem uso para autorização — ver cabeçalho)
drop policy profile_roles_select on public.profile_roles;
create policy profile_roles_select on public.profile_roles for select to authenticated
  using (
    profile_id = (select auth.uid())
    or public.is_platform_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_roles.profile_id
        and p.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

drop policy profile_roles_insert on public.profile_roles;
create policy profile_roles_insert on public.profile_roles for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_roles.profile_id
        and p.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

drop policy profile_roles_update on public.profile_roles;
create policy profile_roles_update on public.profile_roles for update to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_roles.profile_id
        and p.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_roles.profile_id
        and p.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

drop policy profile_roles_delete on public.profile_roles;
create policy profile_roles_delete on public.profile_roles for delete to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = profile_roles.profile_id
        and p.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

-- organizational_assignments
drop policy organizational_assignments_select on public.organizational_assignments;
create policy organizational_assignments_select on public.organizational_assignments for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));

drop policy organizational_assignments_insert on public.organizational_assignments;
create policy organizational_assignments_insert on public.organizational_assignments for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

drop policy organizational_assignments_update on public.organizational_assignments;
create policy organizational_assignments_update on public.organizational_assignments for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- audit_logs
drop policy audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'auditor'])));

-- -----------------------------------------------------------------------------
-- (g) log_audit_event(): passa a gravar campaign_id automaticamente
-- -----------------------------------------------------------------------------
create or replace function public.log_audit_event(
  p_action text,
  p_entity_table text,
  p_entity_id uuid,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_reason text default null,
  p_result text default 'sucesso',
  p_related_request_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_role(array['administrador', 'rh']) then
    raise exception 'not authorized to log audit events';
  end if;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, result, related_request_id, campaign_id
  ) values (
    (select auth.uid()), p_action, p_entity_table, p_entity_id,
    p_before_data, p_after_data, p_reason, p_result, p_related_request_id,
    (select public.current_campaign_id())
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- (h) Storage — bucket pessoas-documentos: path passa a ser
--     {campaignId}/{personId}/{uuid}-{filename}; políticas checam o
--     primeiro segmento do path.
-- -----------------------------------------------------------------------------
drop policy pessoas_documentos_insert on storage.objects;
create policy pessoas_documentos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pessoas-documentos'
    and (
      public.is_platform_admin()
      or (
        split_part(name, '/', 1) = (select public.current_campaign_id())::text
        and public.has_role(array['administrador', 'rh'])
      )
    )
  );

drop policy pessoas_documentos_select on storage.objects;
create policy pessoas_documentos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'pessoas-documentos'
    and (
      public.is_platform_admin()
      or (
        split_part(name, '/', 1) = (select public.current_campaign_id())::text
        and public.has_role(array['administrador', 'rh', 'auditor'])
      )
    )
  );
