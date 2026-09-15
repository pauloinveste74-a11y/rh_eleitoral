-- =============================================================================
-- Etapa 7 — despesas com autorizador de registro e alçada (app layer)
-- =============================================================================
-- A migração 0020 (Etapa 1) já criou as colunas/tabelas novas de despesas
-- (category_id, purchaser_person_id, authorized_by_profile_id,
-- unidentified_authorizer_*, expense_authorization_rules, ...) sem mexer em
-- create_expense()/decide_expense(), pra não quebrar o /despesas já em
-- produção. Esta migração estende create_expense() (mesma função, não uma
-- v2 — só parâmetros novos opcionais no final, chamada antiga continuaria
-- funcionando se algo mais chamasse) pra gravar o autorizador e o resto do
-- modelo novo. decide_expense() não muda: continua decidindo por
-- status/valor, que nenhuma dessas colunas novas afeta.
--
-- Alçada (expense_authorization_rules) é só INFORMATIVA nesta etapa: o app
-- mostra se o valor pedido está dentro do teto do autorizador, mas não
-- bloqueia a criação nem a decisão — não existe fluxo de "escalar" pra uma
-- alçada maior ainda. Documentado como pendência no README.
-- =============================================================================

-- Postgres identifica uma função pela lista de parâmetros — como estamos
-- ACRESCENTANDO parâmetros (não só trocando o corpo), `create or replace`
-- sozinho criaria uma SEGUNDA função sobrecarregada em vez de substituir a
-- de 6 parâmetros da Fase 6, arriscando ambiguidade no PostgREST. Precisa
-- derrubar a assinatura antiga explicitamente primeiro.
drop function if exists public.create_expense(uuid, text, bigint, text, date, text);

create or replace function public.create_expense(
  p_person_id uuid,
  p_category text,
  p_amount_cents bigint,
  p_description text,
  p_expense_date date,
  p_receipt_storage_path text,
  p_category_id uuid default null,
  p_purpose text default null,
  p_vendor_name text default null,
  p_vendor_document text default null,
  p_payment_method text default null,
  p_purchaser_person_id uuid default null,
  p_authorized_by_profile_id uuid default null,
  p_unidentified_authorizer_name text default null,
  p_unidentified_authorizer_phone text default null,
  p_unidentified_authorizer_reason text default null,
  p_authorization_channel text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person record;
  v_expense_id uuid;
  v_authorizer_name text;
  v_authorizer_phone text;
  v_authorizer_role text;
  v_protocol text;
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
  if p_payment_method is not null and p_payment_method not in ('pix', 'transferencia', 'dinheiro', 'cartao', 'boleto', 'outro') then
    raise exception 'forma de pagamento inválida: %', p_payment_method;
  end if;
  if p_authorization_channel is not null and p_authorization_channel not in ('presencial', 'whatsapp', 'telefone', 'sistema', 'outro') then
    raise exception 'canal de autorização inválido: %', p_authorization_channel;
  end if;
  if p_authorized_by_profile_id is not null and p_unidentified_authorizer_name is not null then
    raise exception 'informe o autorizador de um jeito só: pessoa do sistema OU não identificado';
  end if;

  if p_authorized_by_profile_id is not null then
    select pr.full_name, pr.phone into v_authorizer_name, v_authorizer_phone
      from public.profiles pr where pr.id = p_authorized_by_profile_id;
    if not found then
      raise exception 'autorizador (usuário do sistema) não encontrado';
    end if;

    select r.name into v_authorizer_role
      from public.profile_roles prr
      join public.roles r on r.id = prr.role_id
      where prr.profile_id = p_authorized_by_profile_id
        and prr.valid_from <= current_date
        and (prr.valid_until is null or prr.valid_until >= current_date)
      order by prr.valid_from desc
      limit 1;
  end if;

  v_protocol := 'EXP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6));

  insert into public.expenses (
    campaign_id, person_id, category, amount_cents, description, expense_date, receipt_storage_path, requested_by,
    category_id, purpose, vendor_name, vendor_document, requested_amount_cents, payment_method,
    purchaser_person_id, authorized_by_profile_id, authorizer_name_snapshot, authorizer_phone_snapshot,
    authorization_role_snapshot, authorized_at, authorization_channel, protocol,
    unidentified_authorizer, unidentified_authorizer_name, unidentified_authorizer_phone, unidentified_authorizer_reason
  ) values (
    v_person.campaign_id, p_person_id, p_category, p_amount_cents,
    coalesce(nullif(p_purpose, ''), p_description), p_expense_date, p_receipt_storage_path, auth.uid(),
    p_category_id, p_purpose, p_vendor_name, p_vendor_document, p_amount_cents, p_payment_method,
    coalesce(p_purchaser_person_id, p_person_id), p_authorized_by_profile_id, v_authorizer_name, v_authorizer_phone,
    v_authorizer_role,
    case when p_authorized_by_profile_id is not null or p_unidentified_authorizer_name is not null then now() else null end,
    p_authorization_channel, v_protocol,
    p_unidentified_authorizer_name is not null, p_unidentified_authorizer_name, p_unidentified_authorizer_phone, p_unidentified_authorizer_reason
  )
  returning id into v_expense_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id, after_data, campaign_id
  ) values (
    auth.uid(), 'despesa.criar', 'expenses', v_expense_id,
    jsonb_build_object(
      'person_id', p_person_id, 'category', p_category, 'amount_cents', p_amount_cents,
      'protocol', v_protocol,
      'authorized_by_profile_id', p_authorized_by_profile_id,
      'unidentified_authorizer', p_unidentified_authorizer_name is not null
    ),
    v_person.campaign_id
  );

  return v_expense_id;
end;
$$;

comment on function public.create_expense(uuid, text, bigint, text, date, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text) is
  'Etapa 7 — mesma create_expense() da Fase 6 (0009), com parâmetros novos opcionais no final: categoria estruturada, fornecedor, forma de pagamento, comprador e autorizador de registro (pessoa do sistema, com snapshot de nome/telefone/papel, OU não identificado, com nome/telefone/motivo em texto livre). Gera protocol automaticamente.';

revoke all on function public.create_expense(uuid, text, bigint, text, date, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_expense(uuid, text, bigint, text, date, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- profiles_select: soma `financeiro` à lista de papéis que enxergam outros
-- profiles — mesmo padrão aditivo de 0010 (auditor) e 0011 (rh). Necessário
-- pra quem cria a despesa poder escolher "autorizador = pessoa do sistema"
-- num select; sem isso, RLS devolveria a lista vazia pra esse papel.
-- -----------------------------------------------------------------------------
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin()
    or (
      campaign_id = (select public.current_campaign_id())
      and public.has_role(array['administrador', 'rh', 'auditor', 'financeiro'])
    )
  );
