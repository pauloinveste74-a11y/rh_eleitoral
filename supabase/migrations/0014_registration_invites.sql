-- =============================================================================
-- Etapa 1 — parte 2: convite de autocadastro (registration_invites)
-- =============================================================================
-- O contratado não tem sessão do Supabase Auth neste fluxo — acessa por um
-- link com token aleatório, não por login. Por isso a tabela em si só é
-- legível/gravável por administrador/rh (quem gera o convite); o acesso do
-- contratado ao próprio convite passa por redeem_registration_invite(), uma
-- função SECURITY DEFINER sem checagem de papel (protegida pelo token, não
-- por RLS) — única função do projeto liberada também para o papel `anon`.
-- =============================================================================

create table public.registration_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  -- hex de 24 bytes aleatórios (pgcrypto, já habilitado desde a 0001) — 48
  -- caracteres, sem +/=/ que precisariam de escape na URL (base64 teria).
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  contact_name text,
  contact_phone text,
  contact_email text,
  expires_at timestamptz not null,
  status text not null default 'criado'
    check (status in ('criado', 'enviado', 'acessado', 'em_preenchimento', 'concluido', 'expirado', 'cancelado')),
  max_uses integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  suggested_axis_id uuid references public.axes(id),
  suggested_city_id uuid references public.cities(id),
  suggested_team_id uuid references public.teams(id),
  suggested_coordinator_person_id uuid references public.people(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  submitted_at timestamptz,
  cancelled_at timestamptz,
  person_id uuid references public.people(id)
);

comment on table public.registration_invites is 'Convite de autocadastro (seção 4 da spec) — token aleatório na URL, nunca CPF/e-mail/telefone.';

create index registration_invites_campaign_id_idx on public.registration_invites (campaign_id);
create index registration_invites_status_idx on public.registration_invites (status);
create index registration_invites_person_id_idx on public.registration_invites (person_id);

alter table public.registration_invites enable row level security;

create policy registration_invites_select on public.registration_invites for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy registration_invites_insert on public.registration_invites for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy registration_invites_update on public.registration_invites for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

-- -----------------------------------------------------------------------------
-- check_same_campaign(): estender para registration_invites (reescrita
-- cumulativa, mesmo padrão desde a 0006 — corpo inteiro reescrito a cada vez).
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
  end if;
  return new;
end;
$$;

create trigger registration_invites_check_same_campaign
  before insert or update on public.registration_invites
  for each row execute function public.check_same_campaign();

-- -----------------------------------------------------------------------------
-- redeem_registration_invite(): a única forma de um convidado (sem sessão de
-- usuário) enxergar o próprio convite. Não checa papel — o token já é a
-- proteção; por isso é a única função do projeto com grant para `anon`.
-- -----------------------------------------------------------------------------
create or replace function public.redeem_registration_invite(p_token text)
returns public.registration_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.registration_invites;
begin
  select * into v_invite from public.registration_invites where token = p_token;

  if not found then
    raise exception 'convite não encontrado';
  end if;
  if v_invite.status in ('expirado', 'cancelado', 'concluido') then
    raise exception 'convite não está mais disponível';
  end if;
  if v_invite.expires_at < now() then
    update public.registration_invites set status = 'expirado' where id = v_invite.id;
    raise exception 'convite expirado';
  end if;
  if v_invite.uses_count >= v_invite.max_uses then
    raise exception 'convite já foi utilizado';
  end if;

  update public.registration_invites
    set status = case when status = 'criado' then 'acessado' else status end,
        opened_at = coalesce(opened_at, now())
    where id = v_invite.id
    returning * into v_invite;

  return v_invite;
end;
$$;

comment on function public.redeem_registration_invite(text) is 'Exceção deliberada: única função do projeto chamável por anon. Protegida pelo token aleatório (24 bytes), não por RLS/sessão — o contratado nunca tem login tradicional neste fluxo.';

revoke all on function public.redeem_registration_invite(text) from public, anon, authenticated;
grant execute on function public.redeem_registration_invite(text) to anon, authenticated;
