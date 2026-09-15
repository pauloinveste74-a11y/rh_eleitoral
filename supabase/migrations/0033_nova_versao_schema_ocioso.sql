-- =============================================================================
-- Nova versão (docs/NOVA_VERSAO_RH_ELEITORAL.md) — Etapa 6: resto do schema
-- já pronto e ocioso (item 4 da ordem proposta) — o que a Etapa 3 tinha
-- deixado de fora (correção previous/new, despesa autorizada, IP/user-agent
-- da auditoria).
--
-- 1) audit_logs.ip_address/user_agent — a princípio pareceria exigir tocar
--    a assinatura de ~22 funções (todo mundo que grava audit_logs) e cada
--    Server Action que as chama. Achado melhor: o PostgREST expõe os
--    headers da requisição HTTP numa GUC de sessão
--    (`current_setting('request.headers', true)`, testado ao vivo via
--    /rest/v1/rpc antes desta migração) — então em vez de mexer em 22
--    funções, um TRIGGER BEFORE INSERT em audit_logs preenche
--    ip_address/user_agent sozinho, sem tocar em nenhuma função existente
--    nem no app. Cobre também qualquer função futura, de graça.
--
-- 2) correction_requests.previous_values/new_values — nova função auxiliar
--    snapshot_correction_fields() tira uma foto dos campos apontados numa
--    correção (a partir de people + satélites). previous_values é gravado
--    quando o gestor/RH pede a correção (decide_registration_submission/
--    decide_rh_validation); new_values quando a pessoa reenvia
--    (submit_registration_for_review/submit_public_registration_for_review,
--    que já resolvem o correction_requests desde a Etapa 11 — só ganharam
--    o novo campo no mesmo UPDATE).
--
-- 3) expenses.authorized_amount_cents — create_expense() ganha
--    p_authorized_amount_cents (opcional, default = mesmo valor pedido,
--    comportamento idêntico ao atual pra quem não usar o campo novo) —
--    permite registrar que o autorizador aprovou um valor diferente do
--    solicitado (spec 13.1).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) IP/user-agent da auditoria via trigger (sem tocar em função nenhuma)
-- -----------------------------------------------------------------------------
create or replace function public.request_headers() returns jsonb
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('request.headers', true), '')::jsonb;
$$;

create or replace function public.request_ip_address() returns inet
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers jsonb;
  v_raw text;
begin
  v_headers := public.request_headers();
  if v_headers is null then
    return null;
  end if;
  -- cf-connecting-ip (Cloudflare, na frente do Supabase) é mais confiável
  -- que x-forwarded-for quando presente; x-forwarded-for pode ter uma
  -- cadeia "ip1, ip2, ..." — o primeiro é o cliente original.
  v_raw := coalesce(v_headers ->> 'cf-connecting-ip', split_part(v_headers ->> 'x-forwarded-for', ',', 1));
  if v_raw is null or btrim(v_raw) = '' then
    return null;
  end if;
  return btrim(v_raw)::inet;
exception when others then
  -- nunca deixa um header malformado quebrar a escrita de auditoria.
  return null;
end;
$$;

create or replace function public.request_user_agent() returns text
language sql
stable
set search_path = public
as $$
  select public.request_headers() ->> 'user-agent';
$$;

revoke all on function public.request_headers() from public, anon, authenticated;
revoke all on function public.request_ip_address() from public, anon, authenticated;
revoke all on function public.request_user_agent() from public, anon, authenticated;

create or replace function public.audit_logs_set_request_metadata() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.ip_address is null then
    new.ip_address := public.request_ip_address();
  end if;
  if new.user_agent is null then
    new.user_agent := public.request_user_agent();
  end if;
  return new;
end;
$$;

drop trigger if exists audit_logs_request_metadata on public.audit_logs;
create trigger audit_logs_request_metadata
  before insert on public.audit_logs
  for each row execute function public.audit_logs_set_request_metadata();

-- -----------------------------------------------------------------------------
-- 2) correction_requests.previous_values/new_values
-- -----------------------------------------------------------------------------
create or replace function public.snapshot_correction_fields(p_person_id uuid, p_field_names text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_all jsonb;
  v_result jsonb;
begin
  select jsonb_build_object(
    'fullName', p.full_name,
    'cpf', p.cpf,
    'birthDate', p.birth_date::text,
    'phone', p.phone,
    'whatsapp', p.whatsapp,
    'email', p.email,
    'zipCode', a.zip_code,
    'street', a.street,
    'number', a.number,
    'complement', a.complement,
    'neighborhood', a.neighborhood,
    'city', a.city,
    'state', a.state,
    'bankCode', b.bank_code,
    'bankName', b.bank_name,
    'agency', b.agency,
    'agencyDigit', b.agency_digit,
    'accountNumber', b.account_number,
    'accountDigit', b.account_digit,
    'accountType', b.account_type,
    'pixKeyType', b.pix_key_type,
    'pixKey', b.pix_key,
    'voterId', e.voter_id,
    'electoralZone', e.electoral_zone,
    'electoralSection', e.electoral_section,
    'voterCity', e.voter_city,
    'voterState', e.voter_state
  ) into v_all
  from public.people p
  left join public.person_addresses a on a.person_id = p.id
  left join public.person_bank_accounts b on b.person_id = p.id
  left join public.person_electoral_data e on e.person_id = p.id
  where p.id = p_person_id;

  if v_all is null or p_field_names is null or array_length(p_field_names, 1) is null then
    return '{}'::jsonb;
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_result
  from jsonb_each(v_all)
  where key = any(p_field_names);

  return v_result;
end;
$$;

revoke all on function public.snapshot_correction_fields(uuid, text[]) from public, anon, authenticated;

create or replace function public.decide_registration_submission(
  p_submission_id uuid,
  p_decision text,
  p_reason text default null,
  p_field_names text[] default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_manager_person_id uuid;
  v_new_status text;
  v_authorized boolean := false;
begin
  if p_decision not in ('aprovar', 'rejeitar', 'solicitar_correcao') then
    raise exception 'decisão inválida: %', p_decision;
  end if;

  select * into v_submission from public.registration_submissions where id = p_submission_id;
  if not found then
    raise exception 'submissão não encontrada';
  end if;

  if v_submission.status <> 'aguardando_validacao_gestor' then
    raise exception 'esta submissão não está aguardando decisão (status atual: %)', v_submission.status;
  end if;

  if p_decision = 'solicitar_correcao' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'informe o motivo da correção solicitada';
  end if;

  select person_id into v_manager_person_id from public.profiles where id = auth.uid();

  v_authorized := public.is_platform_admin()
    or (v_submission.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_manager_person_id is not null and v_submission.manager_person_id = v_manager_person_id);
  v_authorized := coalesce(v_authorized, false);

  if not v_authorized then
    raise exception 'não autorizado a decidir esta submissão';
  end if;

  v_new_status := case p_decision
    when 'aprovar' then 'aprovado_gestor'
    when 'rejeitar' then 'rejeitado'
    else 'correcao_solicitada'
  end;

  update public.registration_submissions
    set status = v_new_status,
        validated_by = auth.uid(),
        validated_at = now(),
        rejection_reason = case when p_decision = 'rejeitar' then p_reason else rejection_reason end
    where id = p_submission_id;

  update public.people
    set status = v_new_status, updated_by = auth.uid()
    where id = v_submission.person_id;

  if p_decision = 'solicitar_correcao' then
    insert into public.correction_requests (submission_id, requested_by, field_names, reason, previous_values)
    values (
      p_submission_id, auth.uid(), coalesce(p_field_names, array[]::text[]), p_reason,
      public.snapshot_correction_fields(v_submission.person_id, coalesce(p_field_names, array[]::text[]))
    );
  end if;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, campaign_id
  ) values (
    auth.uid(),
    'cadastro.validacao_gestor.' || p_decision,
    'registration_submissions',
    p_submission_id,
    jsonb_build_object('status', 'aguardando_validacao_gestor'),
    jsonb_build_object('status', v_new_status, 'field_names', p_field_names),
    p_reason,
    v_submission.campaign_id
  );
end;
$$;

create or replace function public.decide_rh_validation(
  p_submission_id uuid,
  p_decision text,
  p_reason text default null,
  p_field_names text[] default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_new_status text;
  v_authorized boolean := false;
begin
  if p_decision not in ('validar', 'rejeitar', 'solicitar_correcao') then
    raise exception 'decisão inválida: %', p_decision;
  end if;

  select * into v_submission from public.registration_submissions where id = p_submission_id;
  if not found then
    raise exception 'submissão não encontrada';
  end if;

  if v_submission.status <> 'aprovado_gestor' then
    raise exception 'esta submissão não está aguardando validação do RH (status atual: %)', v_submission.status;
  end if;

  if p_decision = 'solicitar_correcao' and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'informe o motivo da correção solicitada';
  end if;

  v_authorized := public.is_platform_admin()
    or (v_submission.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']));
  v_authorized := coalesce(v_authorized, false);

  if not v_authorized then
    raise exception 'não autorizado a decidir esta validação — restrito a administrador/rh';
  end if;

  v_new_status := case p_decision
    when 'validar' then 'validado'
    when 'rejeitar' then 'rejeitado'
    else 'correcao_solicitada'
  end;

  update public.registration_submissions
    set status = v_new_status,
        validated_by = auth.uid(),
        validated_at = now(),
        rejection_reason = case when p_decision = 'rejeitar' then p_reason else rejection_reason end
    where id = p_submission_id;

  update public.people
    set status = v_new_status, updated_by = auth.uid()
    where id = v_submission.person_id;

  if p_decision = 'solicitar_correcao' then
    insert into public.correction_requests (submission_id, requested_by, field_names, reason, previous_values)
    values (
      p_submission_id, auth.uid(), coalesce(p_field_names, array[]::text[]), p_reason,
      public.snapshot_correction_fields(v_submission.person_id, coalesce(p_field_names, array[]::text[]))
    );
  end if;

  perform public.log_audit_event(
    p_action => 'cadastro.validacao_rh.' || p_decision,
    p_entity_table => 'registration_submissions',
    p_entity_id => p_submission_id,
    p_before_data => jsonb_build_object('status', 'aprovado_gestor'),
    p_after_data => jsonb_build_object('status', v_new_status, 'field_names', p_field_names),
    p_reason => p_reason
  );
end;
$$;

create or replace function public.submit_registration_for_review(p_person_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person record;
  v_profile record;
  v_manager_person_id uuid;
  v_doc_count integer;
  v_submission_id uuid;
  v_authorized boolean;
begin
  select * into v_person from public.people where id = p_person_id;
  if not found then
    raise exception 'pessoa não encontrada';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();

  v_authorized := public.is_platform_admin()
    or (v_person.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_profile.person_id is not null and v_profile.person_id = p_person_id);

  if not v_authorized then
    raise exception 'não autorizado a enviar este cadastro para validação';
  end if;

  select count(*) into v_doc_count from public.person_documents
    where person_id = p_person_id and status = 'ativo';
  if v_doc_count = 0 then
    raise exception 'anexe ao menos um documento antes de enviar para validação';
  end if;

  select coordinator_person_id into v_manager_person_id
    from public.coordination_relationships
    where subordinate_person_id = p_person_id and status = 'vigente'
    order by created_at desc
    limit 1;

  insert into public.registration_submissions (
    campaign_id, person_id, origin, status, submitted_at, manager_person_id, created_by
  ) values (
    v_person.campaign_id, p_person_id, 'autocadastro', 'aguardando_validacao_gestor', now(),
    v_manager_person_id, auth.uid()
  )
  returning id into v_submission_id;

  update public.people set status = 'aguardando_gestor', updated_by = auth.uid()
    where id = p_person_id;

  update public.correction_requests cr
    set resolved_at = now(),
        new_values = public.snapshot_correction_fields(p_person_id, cr.field_names)
    where cr.resolved_at is null
      and cr.submission_id in (
        select id from public.registration_submissions where person_id = p_person_id
      );

  if public.has_role(array['administrador', 'rh']) then
    perform public.log_audit_event(
      p_action => 'pessoa.enviar_validacao',
      p_entity_table => 'people',
      p_entity_id => p_person_id
    );
  else
    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, campaign_id)
    values (auth.uid(), 'pessoa.enviar_validacao', 'people', p_person_id, v_person.campaign_id);
  end if;

  return v_submission_id;
end;
$$;

create or replace function public.submit_public_registration_for_review(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.registration_invites;
  v_doc_count integer;
  v_submission_id uuid;
begin
  select * into v_invite from public.registration_invites where token = p_token;
  if not found then
    raise exception 'convite não encontrado';
  end if;
  if v_invite.person_id is null then
    raise exception 'cadastro ainda não foi preenchido';
  end if;

  select count(*) into v_doc_count from public.person_documents
    where person_id = v_invite.person_id and status = 'ativo';
  if v_doc_count = 0 then
    raise exception 'anexe ao menos um documento antes de enviar';
  end if;

  insert into public.registration_submissions (
    campaign_id, person_id, invite_id, origin, status, submitted_at, manager_person_id
  ) values (
    v_invite.campaign_id, v_invite.person_id, v_invite.id, 'autocadastro',
    'aguardando_validacao_gestor', now(), v_invite.suggested_coordinator_person_id
  )
  returning id into v_submission_id;

  update public.people set status = 'aguardando_gestor' where id = v_invite.person_id;

  update public.registration_invites
    set status = 'concluido', submitted_at = now()
    where id = v_invite.id;

  update public.correction_requests cr
    set resolved_at = now(),
        new_values = public.snapshot_correction_fields(v_invite.person_id, cr.field_names)
    where cr.resolved_at is null
      and cr.submission_id in (
        select id from public.registration_submissions where person_id = v_invite.person_id
      );

  insert into public.audit_logs (action, entity_table, entity_id, campaign_id)
  values ('pessoa.autocadastro.publico.enviar_validacao', 'people', v_invite.person_id, v_invite.campaign_id);

  return v_submission_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) expenses.authorized_amount_cents — create_expense() ganha um parâmetro
--    opcional novo no fim (drop explícito da assinatura antiga primeiro —
--    create or replace não troca função quando o número de parâmetros
--    muda, mesmo padrão já documentado nas Etapas 7/11).
-- -----------------------------------------------------------------------------
drop function if exists public.create_expense(
  uuid, text, bigint, text, date, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text
);

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
  p_authorization_channel text default null,
  p_authorized_amount_cents bigint default null
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
  if p_authorized_amount_cents is not null and p_authorized_amount_cents < 0 then
    raise exception 'valor autorizado não pode ser negativo';
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
    category_id, purpose, vendor_name, vendor_document, requested_amount_cents, authorized_amount_cents, payment_method,
    purchaser_person_id, authorized_by_profile_id, authorizer_name_snapshot, authorizer_phone_snapshot,
    authorization_role_snapshot, authorized_at, authorization_channel, protocol,
    unidentified_authorizer, unidentified_authorizer_name, unidentified_authorizer_phone, unidentified_authorizer_reason
  ) values (
    v_person.campaign_id, p_person_id, p_category, p_amount_cents,
    coalesce(nullif(p_purpose, ''), p_description), p_expense_date, p_receipt_storage_path, auth.uid(),
    p_category_id, p_purpose, p_vendor_name, p_vendor_document, p_amount_cents,
    coalesce(p_authorized_amount_cents, p_amount_cents), p_payment_method,
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
      'authorized_amount_cents', coalesce(p_authorized_amount_cents, p_amount_cents),
      'protocol', v_protocol,
      'authorized_by_profile_id', p_authorized_by_profile_id,
      'unidentified_authorizer', p_unidentified_authorizer_name is not null
    ),
    v_person.campaign_id
  );

  return v_expense_id;
end;
$$;

revoke all on function public.create_expense(uuid, text, bigint, text, date, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text, bigint) from public, anon;
grant execute on function public.create_expense(uuid, text, bigint, text, date, text, uuid, text, text, text, text, uuid, uuid, text, text, text, text, bigint) to authenticated;
