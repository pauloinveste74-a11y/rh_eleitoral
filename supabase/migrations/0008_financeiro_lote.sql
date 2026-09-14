-- =============================================================================
-- Fase 3 (complemento) — Folha em lote: gerar pagamentos para várias
-- pessoas ativas de uma vez, com valor uniforme e um período de referência.
-- =============================================================================

create table public.payment_batches (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  reference_period text not null,
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table public.payment_batches is 'Lote de pagamentos gerados de uma vez (ex.: folha de um período) — valor uniforme por pessoa. Cada pessoa do lote vira uma linha em payments com batch_id apontando pra cá.';

create index payment_batches_campaign_id_idx on public.payment_batches (campaign_id);

alter table public.payments add column batch_id uuid references public.payment_batches(id);
create index payments_batch_id_idx on public.payments (batch_id);

alter table public.payment_batches enable row level security;

create policy payment_batches_select on public.payment_batches for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'financeiro', 'tesouraria', 'auditor']))
  );
-- sem policy de INSERT/UPDATE/DELETE: só create_payment_batch() escreve aqui.

-- -----------------------------------------------------------------------------
-- create_payment_batch(): cria o lote + um payments por pessoa, tudo numa
-- transação (a função inteira ou aplica tudo ou nada). Mesma checagem de
-- elegibilidade/snapshot de create_payment(), mas para várias pessoas de
-- uma vez, com valor e descrição uniformes.
-- -----------------------------------------------------------------------------
create or replace function public.create_payment_batch(
  p_reference_period text,
  p_description text,
  p_amount_cents bigint,
  p_person_ids uuid[]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_batch_id uuid;
  v_person record;
  v_bank record;
  v_snapshot jsonb;
  v_person_id uuid;
  v_count int := 0;
begin
  if not (public.is_platform_admin() or public.has_role(array['administrador', 'financeiro'])) then
    raise exception 'não autorizado a criar pagamentos';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'valor deve ser maior que zero';
  end if;
  if p_person_ids is null or array_length(p_person_ids, 1) is null then
    raise exception 'selecione ao menos uma pessoa';
  end if;

  v_campaign_id := public.current_campaign_id();
  if v_campaign_id is null then
    raise exception 'não foi possível identificar sua campanha';
  end if;

  insert into public.payment_batches (campaign_id, reference_period, description, amount_cents, created_by)
  values (v_campaign_id, p_reference_period, p_description, p_amount_cents, auth.uid())
  returning id into v_batch_id;

  foreach v_person_id in array p_person_ids loop
    select * into v_person from public.people where id = v_person_id;
    if not found then
      raise exception 'pessoa não encontrada: %', v_person_id;
    end if;
    if v_person.status <> 'ativo' then
      raise exception 'pessoa % não está ativa', v_person.full_name;
    end if;
    if v_person.campaign_id <> v_campaign_id then
      raise exception 'pessoa % pertence a outra campanha', v_person.full_name;
    end if;

    select * into v_bank from public.person_bank_accounts where person_id = v_person_id;
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
      campaign_id, person_id, batch_id, amount_cents, description, bank_snapshot, requested_by
    ) values (
      v_campaign_id, v_person_id, v_batch_id, p_amount_cents, p_description, v_snapshot, auth.uid()
    );
    v_count := v_count + 1;
  end loop;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id, after_data, campaign_id
  ) values (
    auth.uid(), 'pagamento.lote.criar', 'payment_batches', v_batch_id,
    jsonb_build_object(
      'reference_period', p_reference_period, 'amount_cents', p_amount_cents,
      'person_count', v_count
    ),
    v_campaign_id
  );

  return v_batch_id;
end;
$$;

revoke all on function public.create_payment_batch(text, text, bigint, uuid[]) from public, anon, authenticated;
grant execute on function public.create_payment_batch(text, text, bigint, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- check_same_campaign(): estender payments para também checar batch_id.
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
  end if;
  return new;
end;
$$;
