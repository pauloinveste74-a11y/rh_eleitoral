-- =============================================================================
-- Fase 3 — Financeiro: pagamentos avulsos por pessoa (financeiro → tesouraria)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tabela payments
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  person_id uuid not null references public.people(id),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'rejeitado', 'cancelado')),
  bank_snapshot jsonb not null,
  payment_date date,
  requested_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payments is 'Pagamento avulso a uma pessoa. financeiro lança (pendente); tesouraria decide (pago/rejeitado); financeiro pode cancelar enquanto pendente. bank_snapshot congela os dados bancários no momento da criação.';

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index payments_campaign_id_idx on public.payments (campaign_id);
create index payments_person_id_idx on public.payments (person_id);
create index payments_status_idx on public.payments (status);
create index payments_requested_by_idx on public.payments (requested_by);
create index payments_decided_by_idx on public.payments (decided_by);

-- -----------------------------------------------------------------------------
-- RLS de payments — sem policy de INSERT nem UPDATE: toda gravação passa
-- por create_payment()/decide_payment() (SECURITY DEFINER). Sem DELETE:
-- cancelamento é um status.
-- -----------------------------------------------------------------------------
alter table public.payments enable row level security;

create policy payments_select on public.payments for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'financeiro', 'tesouraria', 'auditor']))
  );

-- -----------------------------------------------------------------------------
-- create_payment(): única forma de criar um pagamento. SECURITY DEFINER
-- porque precisa gravar em audit_logs, que não tem política de INSERT
-- para nenhum papel de cliente — só funções SECURITY DEFINER escrevem lá.
-- Também centraliza a checagem de elegibilidade (people.status = 'ativo')
-- e a montagem do bank_snapshot a partir de person_bank_accounts.
-- -----------------------------------------------------------------------------
create or replace function public.create_payment(
  p_person_id uuid,
  p_amount_cents bigint,
  p_description text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person record;
  v_bank record;
  v_snapshot jsonb;
  v_payment_id uuid;
begin
  if not (public.is_platform_admin() or public.has_role(array['administrador', 'financeiro'])) then
    raise exception 'não autorizado a criar pagamentos';
  end if;

  select * into v_person from public.people where id = p_person_id;
  if not found then
    raise exception 'pessoa não encontrada';
  end if;
  if v_person.status <> 'ativo' then
    raise exception 'só pessoas com status ativo podem receber pagamento';
  end if;
  if not public.is_platform_admin() and v_person.campaign_id <> public.current_campaign_id() then
    raise exception 'pessoa pertence a outra campanha';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'valor deve ser maior que zero';
  end if;

  select * into v_bank from public.person_bank_accounts where person_id = p_person_id;
  if found then
    v_snapshot := jsonb_build_object(
      'bank_code', v_bank.bank_code, 'bank_name', v_bank.bank_name,
      'agency', v_bank.agency, 'agency_digit', v_bank.agency_digit,
      'account_number', v_bank.account_number, 'account_digit', v_bank.account_digit,
      'account_type', v_bank.account_type, 'pix_key_type', v_bank.pix_key_type,
      'pix_key', v_bank.pix_key
    );
  else
    v_snapshot := '{}'::jsonb;
  end if;

  insert into public.payments (
    campaign_id, person_id, amount_cents, description, bank_snapshot, requested_by
  ) values (
    v_person.campaign_id, p_person_id, p_amount_cents, p_description, v_snapshot, auth.uid()
  )
  returning id into v_payment_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id, after_data, campaign_id
  ) values (
    auth.uid(), 'pagamento.criar', 'payments', v_payment_id,
    jsonb_build_object('person_id', p_person_id, 'amount_cents', p_amount_cents, 'description', p_description),
    v_person.campaign_id
  );

  return v_payment_id;
end;
$$;

revoke all on function public.create_payment(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.create_payment(uuid, bigint, text) to authenticated;

-- -----------------------------------------------------------------------------
-- decide_payment(): pagar/rejeitar (tesouraria) ou cancelar (financeiro),
-- só a partir de status = 'pendente'. Grava auditoria diretamente (não via
-- log_audit_event(), que exige administrador/rh — financeiro/tesouraria
-- não estão nessa lista), mesmo padrão de decide_approval() (0006).
-- -----------------------------------------------------------------------------
create or replace function public.decide_payment(
  p_payment_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment record;
  v_authorized boolean := false;
  v_new_status text;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'pagamento não encontrado';
  end if;
  if v_payment.status <> 'pendente' then
    raise exception 'pagamento já foi decidido (status atual: %)', v_payment.status;
  end if;

  if p_decision = 'cancelar' then
    v_authorized := public.is_platform_admin()
      or public.has_role(array['administrador', 'financeiro']);
    v_new_status := 'cancelado';
  elsif p_decision in ('pagar', 'rejeitar') then
    v_authorized := public.is_platform_admin()
      or public.has_role(array['administrador', 'tesouraria']);
    v_new_status := case when p_decision = 'pagar' then 'pago' else 'rejeitado' end;
  else
    raise exception 'decisão inválida: %', p_decision;
  end if;

  if not v_authorized then
    raise exception 'não autorizado a decidir este pagamento';
  end if;

  update public.payments set
    status = v_new_status,
    decided_by = auth.uid(),
    decided_at = now(),
    decision_reason = p_reason,
    payment_date = case when p_decision = 'pagar' then current_date else payment_date end
  where id = p_payment_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, campaign_id
  ) values (
    auth.uid(), 'pagamento.' || p_decision, 'payments', p_payment_id,
    jsonb_build_object('status', v_payment.status), jsonb_build_object('status', v_new_status),
    p_reason, v_payment.campaign_id
  );
end;
$$;

revoke all on function public.decide_payment(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_payment(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- check_same_campaign(): estender para payments (person_id precisa
-- pertencer à mesma campanha do pagamento).
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
  end if;
  return new;
end;
$$;

create trigger payments_check_same_campaign
  before insert or update on public.payments
  for each row execute function public.check_same_campaign();

-- -----------------------------------------------------------------------------
-- Extensões de visibilidade: financeiro/tesouraria não tinham NENHUM
-- acesso a people/person_bank_accounts até agora.
-- -----------------------------------------------------------------------------
drop policy people_select on public.people;
create policy people_select on public.people for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or (
      campaign_id = (select public.current_campaign_id())
      and status = 'pendente_validacao_cidade'
      and exists (
        select 1 from public.organizational_assignments oa
        where oa.person_id = people.id and oa.status = 'vigente'
          and public.is_city_coordinator_for(oa.city_id)
      )
    )
    or (
      campaign_id = (select public.current_campaign_id())
      and status = 'pendente_validacao_eixo'
      and exists (
        select 1 from public.organizational_assignments oa
        where oa.person_id = people.id and oa.status = 'vigente'
          and public.is_axis_coordinator_for(oa.axis_id)
      )
    )
    or (
      campaign_id = (select public.current_campaign_id())
      and status = 'ativo'
      and public.has_role(array['financeiro', 'tesouraria'])
    )
  );

drop policy person_bank_accounts_select on public.person_bank_accounts;
create policy person_bank_accounts_select on public.person_bank_accounts for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['financeiro', 'tesouraria']))
  );
