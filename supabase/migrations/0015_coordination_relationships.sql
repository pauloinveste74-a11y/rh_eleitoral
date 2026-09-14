-- =============================================================================
-- Etapa 1 — parte 3: cadeia de coordenação (coordination_relationships)
-- =============================================================================
-- Vínculo pessoa → pessoa (quem coordena quem), distinto de
-- organizational_assignments (pessoa → eixo/cidade/equipe/função). O campo
-- organizational_assignments.responsible_person_id já existe desde a 0001 mas
-- nunca foi usado por nenhum código — não é reaproveitável aqui porque não
-- tem relationship_type nem proteção contra ciclo (seção 6/13 da spec).
-- =============================================================================

create table public.coordination_relationships (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  subordinate_person_id uuid not null references public.people(id),
  -- nulo = o topo da cadeia responde a RH/administrador, não a outra pessoa
  -- (ex.: coordenador de eixo, validado por RH — seção 6.2 da spec).
  coordinator_person_id uuid references public.people(id),
  relationship_type text not null
    check (relationship_type in ('eixo_para_rh', 'cidade_para_eixo', 'equipe_para_cidade', 'contratado_para_coordenador')),
  axis_id uuid references public.axes(id),
  city_id uuid references public.cities(id),
  team_id uuid references public.teams(id),
  valid_from date not null default current_date,
  valid_until date,
  status text not null default 'vigente' check (status in ('vigente', 'encerrado')),
  source text check (source in ('autocadastro', 'administrativo', 'importacao_excel')),
  created_by uuid references auth.users(id),
  validated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  check (coordinator_person_id is null or coordinator_person_id <> subordinate_person_id),
  check (valid_until is null or valid_until >= valid_from)
);

comment on table public.coordination_relationships is 'Cadeia de coordenação pessoa → pessoa (seção 6 da spec). Histórico preservado via valid_from/valid_until — uma mudança de coordenador encerra o vínculo anterior e insere um novo, nunca sobrescreve.';

create index coordination_relationships_campaign_id_idx on public.coordination_relationships (campaign_id);
create index coordination_relationships_subordinate_idx on public.coordination_relationships (subordinate_person_id);
create index coordination_relationships_coordinator_idx on public.coordination_relationships (coordinator_person_id);
create index coordination_relationships_current_idx on public.coordination_relationships (subordinate_person_id) where status = 'vigente';

create trigger coordination_relationships_set_updated_at
  before update on public.coordination_relationships
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Proteção contra ciclo: além do check direto (coordenador ≠ subordinado),
-- percorre a cadeia ACIMA do novo coordenador (CTE recursiva, profundidade
-- limitada a 20 — suficiente para qualquer hierarquia real desta spec, que
-- tem só 4 níveis) e rejeita se o subordinado aparecer nela (ciclo indireto).
-- -----------------------------------------------------------------------------
create or replace function public.check_coordination_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  if new.coordinator_person_id is null then
    return new;
  end if;

  with recursive chain as (
    select coordinator_person_id, subordinate_person_id, 1 as depth
    from public.coordination_relationships
    where subordinate_person_id = new.coordinator_person_id
      and status = 'vigente'
      and (new.id is null or id <> new.id)
    union all
    select cr.coordinator_person_id, cr.subordinate_person_id, chain.depth + 1
    from public.coordination_relationships cr
    join chain on cr.subordinate_person_id = chain.coordinator_person_id
    where cr.status = 'vigente'
      and chain.depth < 20
      and (new.id is null or cr.id <> new.id)
  )
  select exists (select 1 from chain where coordinator_person_id = new.subordinate_person_id) into v_found;

  if v_found then
    raise exception 'vínculo criaria um ciclo de coordenação (pessoa coordenaria, direta ou indiretamente, quem já a coordena)';
  end if;

  return new;
end;
$$;

revoke all on function public.check_coordination_cycle() from public, anon, authenticated;

create trigger coordination_relationships_check_cycle
  before insert or update on public.coordination_relationships
  for each row execute function public.check_coordination_cycle();

-- -----------------------------------------------------------------------------
-- check_same_campaign(): estender para coordination_relationships.
-- -----------------------------------------------------------------------------
create or replace function public.check_same_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'cities' then
    if new.axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.axis_id) then
      raise exception 'axis_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'teams' then
    if new.city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.city_id) then
      raise exception 'city_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'organizational_assignments' then
    if new.axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.axis_id) then
      raise exception 'axis_id pertence a outra campanha';
    end if;
    if new.city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.city_id) then
      raise exception 'city_id pertence a outra campanha';
    end if;
    if new.team_id is not null and new.campaign_id <> (select campaign_id from public.teams where id = new.team_id) then
      raise exception 'team_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'payments' then
    if new.person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.person_id) then
      raise exception 'person_id pertence a outra campanha';
    end if;
    if new.batch_id is not null and new.campaign_id <> (select campaign_id from public.payment_batches where id = new.batch_id) then
      raise exception 'batch_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'expenses' then
    if new.person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.person_id) then
      raise exception 'person_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'registration_invites' then
    if new.suggested_axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.suggested_axis_id) then
      raise exception 'suggested_axis_id pertence a outra campanha';
    end if;
    if new.suggested_city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.suggested_city_id) then
      raise exception 'suggested_city_id pertence a outra campanha';
    end if;
    if new.suggested_team_id is not null and new.campaign_id <> (select campaign_id from public.teams where id = new.suggested_team_id) then
      raise exception 'suggested_team_id pertence a outra campanha';
    end if;
    if new.suggested_coordinator_person_id is not null
       and new.campaign_id <> (select campaign_id from public.people where id = new.suggested_coordinator_person_id) then
      raise exception 'suggested_coordinator_person_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'coordination_relationships' then
    if new.subordinate_person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.subordinate_person_id) then
      raise exception 'subordinate_person_id pertence a outra campanha';
    end if;
    if new.coordinator_person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.coordinator_person_id) then
      raise exception 'coordinator_person_id pertence a outra campanha';
    end if;
    if new.axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.axis_id) then
      raise exception 'axis_id pertence a outra campanha';
    end if;
    if new.city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.city_id) then
      raise exception 'city_id pertence a outra campanha';
    end if;
    if new.team_id is not null and new.campaign_id <> (select campaign_id from public.teams where id = new.team_id) then
      raise exception 'team_id pertence a outra campanha';
    end if;
  end if;
  return new;
end;
$$;

create trigger coordination_relationships_check_same_campaign
  before insert or update on public.coordination_relationships
  for each row execute function public.check_same_campaign();

alter table public.coordination_relationships enable row level security;

-- select/insert/update restritos a administrador/rh nesta etapa. O acesso do
-- próprio contratado/coordenador (ver a própria posição na cadeia) depende de
-- como o autocadastro autentica — decisão da Etapa 2 (spec não usa Supabase
-- Auth tradicional pro contratado). Revisar esta policy quando isso existir.
create policy coordination_relationships_select on public.coordination_relationships for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
  );

create policy coordination_relationships_insert on public.coordination_relationships for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy coordination_relationships_update on public.coordination_relationships for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );
