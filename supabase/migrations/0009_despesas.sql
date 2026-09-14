-- =============================================================================
-- Fase 6 — Despesas: reembolso de gasto a pessoa da equipe (financeiro → tesouraria)
-- =============================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  person_id uuid not null references public.people(id),
  category text not null check (category in ('combustivel', 'material', 'alimentacao', 'transporte', 'hospedagem', 'outro')),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null,
  expense_date date not null,
  receipt_storage_path text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'pago', 'rejeitado', 'cancelado')),
  payment_date date,
  requested_by uuid references auth.users(id),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.expenses is 'Reembolso de gasto a uma pessoa da equipe (não pagamento direto a fornecedor). financeiro lança (pendente); tesouraria decide (pago/rejeitado); financeiro pode cancelar enquanto pendente. receipt_storage_path aponta pro comprovante no bucket despesas-comprovantes.';

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create index expenses_campaign_id_idx on public.expenses (campaign_id);
create index expenses_person_id_idx on public.expenses (person_id);
create index expenses_status_idx on public.expenses (status);
create index expenses_requested_by_idx on public.expenses (requested_by);
create index expenses_decided_by_idx on public.expenses (decided_by);

alter table public.expenses enable row level security;

create policy expenses_select on public.expenses for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'financeiro', 'tesouraria', 'auditor']))
  );
-- sem policy de INSERT/UPDATE/DELETE: só create_expense()/decide_expense() escrevem aqui.

-- -----------------------------------------------------------------------------
-- create_expense(): mesmo padrão de create_payment() (0007), sem bank_snapshot.
-- O upload do comprovante já aconteceu antes (via Storage API + RLS do
-- bucket); aqui só se grava a referência ao path.
-- -----------------------------------------------------------------------------
create or replace function public.create_expense(
  p_person_id uuid,
  p_category text,
  p_amount_cents bigint,
  p_description text,
  p_expense_date date,
  p_receipt_storage_path text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person record;
  v_expense_id uuid;
begin
  if not (public.is_platform_admin() or public.has_role(array['administrador', 'financeiro'])) then
    raise exception 'não autorizado a criar despesas';
  end if;

  select * into v_person from public.people where id = p_person_id;
  if not found then
    raise exception 'pessoa não encontrada';
  end if;
  if v_person.status <> 'ativo' then
    raise exception 'só pessoas com status ativo podem receber reembolso';
  end if;
  if not public.is_platform_admin() and v_person.campaign_id <> public.current_campaign_id() then
    raise exception 'pessoa pertence a outra campanha';
  end if;
  if p_amount_cents <= 0 then
    raise exception 'valor deve ser maior que zero';
  end if;
  if p_category not in ('combustivel', 'material', 'alimentacao', 'transporte', 'hospedagem', 'outro') then
    raise exception 'categoria inválida: %', p_category;
  end if;

  insert into public.expenses (
    campaign_id, person_id, category, amount_cents, description, expense_date, receipt_storage_path, requested_by
  ) values (
    v_person.campaign_id, p_person_id, p_category, p_amount_cents, p_description, p_expense_date, p_receipt_storage_path, auth.uid()
  )
  returning id into v_expense_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id, after_data, campaign_id
  ) values (
    auth.uid(), 'despesa.criar', 'expenses', v_expense_id,
    jsonb_build_object('person_id', p_person_id, 'category', p_category, 'amount_cents', p_amount_cents),
    v_person.campaign_id
  );

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense(uuid, text, bigint, text, date, text) from public, anon, authenticated;
grant execute on function public.create_expense(uuid, text, bigint, text, date, text) to authenticated;

-- -----------------------------------------------------------------------------
-- decide_expense(): idêntica a decide_payment() (0007).
-- -----------------------------------------------------------------------------
create or replace function public.decide_expense(
  p_expense_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense record;
  v_authorized boolean := false;
  v_new_status text;
begin
  select * into v_expense from public.expenses where id = p_expense_id;
  if not found then
    raise exception 'despesa não encontrada';
  end if;
  if v_expense.status <> 'pendente' then
    raise exception 'despesa já foi decidida (status atual: %)', v_expense.status;
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
    raise exception 'não autorizado a decidir esta despesa';
  end if;

  update public.expenses set
    status = v_new_status,
    decided_by = auth.uid(),
    decided_at = now(),
    decision_reason = p_reason,
    payment_date = case when p_decision = 'pagar' then current_date else payment_date end
  where id = p_expense_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, campaign_id
  ) values (
    auth.uid(), 'despesa.' || p_decision, 'expenses', p_expense_id,
    jsonb_build_object('status', v_expense.status), jsonb_build_object('status', v_new_status),
    p_reason, v_expense.campaign_id
  );
end;
$$;

revoke all on function public.decide_expense(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_expense(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- check_same_campaign(): estender para expenses.
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
  end if;
  return new;
end;
$$;

create trigger expenses_check_same_campaign
  before insert or update on public.expenses
  for each row execute function public.check_same_campaign();

-- -----------------------------------------------------------------------------
-- Bucket despesas-comprovantes + políticas de Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('despesas-comprovantes', 'despesas-comprovantes', false, 10485760,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy despesas_comprovantes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'despesas-comprovantes'
    and (
      public.is_platform_admin()
      or (
        split_part(name, '/', 1) = (select public.current_campaign_id())::text
        and public.has_role(array['administrador', 'financeiro'])
      )
    )
  );

create policy despesas_comprovantes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'despesas-comprovantes'
    and (
      public.is_platform_admin()
      or (
        split_part(name, '/', 1) = (select public.current_campaign_id())::text
        and public.has_role(array['administrador', 'financeiro', 'tesouraria', 'auditor'])
      )
    )
  );
