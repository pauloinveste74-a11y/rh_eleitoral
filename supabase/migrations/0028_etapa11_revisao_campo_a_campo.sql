-- =============================================================================
-- Etapa 11 — revisão campo a campo da correção + reabertura do cabo eleitoral
-- =============================================================================
-- Duas lacunas fechadas juntas, porque são a mesma funcionalidade:
--
-- 1) "Solicitar correção" (Etapas 4/5) gravava correction_requests com
--    field_names SEMPRE vazio (array[]::text[]) — o gestor/RH não tinha
--    como apontar quais campos estavam errados, só o motivo em texto
--    livre. Agora decide_registration_submission()/decide_rh_validation()
--    aceitam p_field_names.
--
-- 2) Achado ao investigar o item 1: o cabo eleitoral (autocadastro
--    público, /cadastro/[token]) NUNCA conseguia reabrir o próprio
--    cadastro depois de uma correção solicitada — a página pública só
--    olhava registration_invites.status (que fica 'concluido' pra sempre
--    depois do primeiro envio), nunca people.status. Era um bug
--    funcional real, não só falta de granularidade: pra esse público
--    (sem login), "correção solicitada" simplesmente não tinha como
--    acontecer na prática. Corrigido com:
--    - get_public_registration_status(): nova função anon, devolve os
--      dados da pessoa (pra pré-popular o formulário) + a correção
--      pendente (motivo + campos), protegida só pelo token.
--    - update_public_registration(): nova função anon, permite reeditar
--      quando people.status está em correção — diferente de
--      submit_public_registration(), que só cria uma vez.
--    - submit_public_registration_for_review() perde a checagem de
--      invite.status = 'concluido' (impedia reenviar); passa a resolver
--      a correction_requests pendente ao reenviar.
--    - submit_registration_for_review() (coordenador) ganha a mesma
--      resolução de correction_requests pendente, por consistência.
--
-- Achado ao testar o fluxo completo: correction_requests_select (0016) só
-- liberava leitura pra administrador/rh — o próprio coordenador não
-- conseguia ler a PRÓPRIA correção pendente em /meu-cadastro. Estendida
-- pra também liberar a própria pessoa e o gestor dela (mesmo padrão das
-- extensões da Etapa 2 em registration_submissions_select).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- decide_registration_submission(): +p_field_names (Etapa 4).
-- -----------------------------------------------------------------------------
drop function if exists public.decide_registration_submission(uuid, text, text);

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
    insert into public.correction_requests (submission_id, requested_by, field_names, reason)
    values (p_submission_id, auth.uid(), coalesce(p_field_names, array[]::text[]), p_reason);
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

revoke all on function public.decide_registration_submission(uuid, text, text, text[]) from public, anon, authenticated;
grant execute on function public.decide_registration_submission(uuid, text, text, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- decide_rh_validation(): +p_field_names (Etapa 5).
-- -----------------------------------------------------------------------------
drop function if exists public.decide_rh_validation(uuid, text, text);

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
    insert into public.correction_requests (submission_id, requested_by, field_names, reason)
    values (p_submission_id, auth.uid(), coalesce(p_field_names, array[]::text[]), p_reason);
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

revoke all on function public.decide_rh_validation(uuid, text, text, text[]) from public, anon, authenticated;
grant execute on function public.decide_rh_validation(uuid, text, text, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- submit_registration_for_review() (coordenador/admin/rh, autenticado):
-- resolve a correction_requests pendente ao reenviar, pra não ficar
-- "pendente" pra sempre depois de corrigida. Resto da função não muda.
-- -----------------------------------------------------------------------------
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
    set resolved_at = now()
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

-- -----------------------------------------------------------------------------
-- submit_public_registration_for_review() (cabo eleitoral, anon): perde a
-- checagem de invite.status = 'concluido' (impedia reenviar depois de uma
-- correção — era o bug real descrito no cabeçalho) e também resolve
-- correction_requests pendente ao reenviar.
-- -----------------------------------------------------------------------------
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
    set resolved_at = now()
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
-- get_public_registration_status(): nova função anon — devolve os dados da
-- pessoa (pra pré-popular o formulário de correção) + a correção pendente
-- (motivo + campos), protegida só pelo token. Não muda nada, só lê.
-- -----------------------------------------------------------------------------
create or replace function public.get_public_registration_status(p_token text)
returns table (
  invite_status text,
  person_id uuid,
  person_status text,
  full_name text,
  cpf text,
  birth_date date,
  phone text,
  whatsapp text,
  email text,
  address jsonb,
  bank jsonb,
  electoral jsonb,
  correction_reason text,
  correction_fields text[]
)
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

  if v_invite.person_id is null then
    return query select v_invite.status, null::uuid, null::text,
      null::text, null::text, null::date, null::text, null::text, null::text,
      null::jsonb, null::jsonb, null::jsonb, null::text, null::text[];
    return;
  end if;

  return query
    select
      v_invite.status,
      p.id,
      p.status,
      p.full_name,
      p.cpf,
      p.birth_date,
      p.phone,
      p.whatsapp,
      p.email,
      case when a.person_id is null then null else jsonb_build_object(
        'zip_code', a.zip_code, 'street', a.street, 'number', a.number,
        'complement', a.complement, 'neighborhood', a.neighborhood,
        'city', a.city, 'state', a.state
      ) end,
      case when b.person_id is null then null else jsonb_build_object(
        'bank_code', b.bank_code, 'bank_name', b.bank_name, 'agency', b.agency,
        'agency_digit', b.agency_digit, 'account_number', b.account_number,
        'account_digit', b.account_digit, 'account_type', b.account_type,
        'pix_key_type', b.pix_key_type, 'pix_key', b.pix_key
      ) end,
      case when el.person_id is null then null else jsonb_build_object(
        'voter_id', el.voter_id, 'electoral_zone', el.electoral_zone,
        'electoral_section', el.electoral_section, 'voter_city', el.voter_city,
        'voter_state', el.voter_state
      ) end,
      cr.reason,
      cr.field_names
    from public.people p
    left join public.person_addresses a on a.person_id = p.id
    left join public.person_bank_accounts b on b.person_id = p.id
    left join public.person_electoral_data el on el.person_id = p.id
    left join public.registration_submissions rs on rs.person_id = p.id
    left join public.correction_requests cr on cr.submission_id = rs.id and cr.resolved_at is null
    where p.id = v_invite.person_id
    order by cr.requested_at desc
    limit 1;
end;
$$;

comment on function public.get_public_registration_status(text) is
  'Etapa 11 — leitura pro cabo eleitoral (anon) saber o próprio status e, se houver correção pendente, o motivo/campos e os dados atuais pra pré-popular o formulário. Protegida só pelo token.';

revoke all on function public.get_public_registration_status(text) from public, anon, authenticated;
grant execute on function public.get_public_registration_status(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- update_public_registration(): cabo eleitoral reedita os próprios dados
-- depois de uma correção solicitada — diferente de submit_public_registration
-- (que só cria, uma vez). Só funciona se people.status indicar que uma
-- correção está em aberto.
-- -----------------------------------------------------------------------------
create or replace function public.update_public_registration(
  p_token text,
  p_full_name text,
  p_cpf text,
  p_birth_date date,
  p_phone text,
  p_whatsapp text,
  p_email text,
  p_address jsonb default null,
  p_bank jsonb default null,
  p_electoral jsonb default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.registration_invites;
  v_person record;
begin
  select * into v_invite from public.registration_invites where token = p_token;
  if not found then
    raise exception 'convite não encontrado';
  end if;
  if v_invite.person_id is null then
    raise exception 'cadastro ainda não foi preenchido';
  end if;

  if v_invite.status = 'cancelado' then
    raise exception 'este convite foi cancelado';
  end if;

  select * into v_person from public.people where id = v_invite.person_id;
  if v_person.status not in ('correcao_solicitada', 'reenviado') then
    raise exception 'este cadastro não está com correção em aberto (status atual: %)', v_person.status;
  end if;

  update public.people
    set full_name = p_full_name, cpf = p_cpf, birth_date = p_birth_date,
        phone = p_phone, whatsapp = p_whatsapp, email = p_email,
        status = 'reenviado'
    where id = v_invite.person_id;

  if p_address is not null then
    insert into public.person_addresses (person_id, zip_code, street, number, complement, neighborhood, city, state, campaign_id)
    values (
      v_invite.person_id, p_address->>'zip_code', p_address->>'street', p_address->>'number',
      p_address->>'complement', p_address->>'neighborhood', p_address->>'city',
      upper(p_address->>'state'), v_invite.campaign_id
    )
    on conflict (person_id) do update set
      zip_code = excluded.zip_code, street = excluded.street, number = excluded.number,
      complement = excluded.complement, neighborhood = excluded.neighborhood,
      city = excluded.city, state = excluded.state;
  end if;

  if p_bank is not null then
    insert into public.person_bank_accounts (person_id, bank_code, bank_name, agency, agency_digit, account_number, account_digit, account_type, pix_key_type, pix_key, campaign_id)
    values (
      v_invite.person_id, p_bank->>'bank_code', p_bank->>'bank_name', p_bank->>'agency',
      p_bank->>'agency_digit', p_bank->>'account_number', p_bank->>'account_digit',
      p_bank->>'account_type', nullif(p_bank->>'pix_key_type', ''), nullif(p_bank->>'pix_key', ''),
      v_invite.campaign_id
    )
    on conflict (person_id) do update set
      bank_code = excluded.bank_code, bank_name = excluded.bank_name, agency = excluded.agency,
      agency_digit = excluded.agency_digit, account_number = excluded.account_number,
      account_digit = excluded.account_digit, account_type = excluded.account_type,
      pix_key_type = excluded.pix_key_type, pix_key = excluded.pix_key;
  end if;

  if p_electoral is not null then
    insert into public.person_electoral_data (person_id, voter_id, electoral_zone, electoral_section, voter_city, voter_state, campaign_id)
    values (
      v_invite.person_id, nullif(p_electoral->>'voter_id', ''), p_electoral->>'electoral_zone',
      p_electoral->>'electoral_section', p_electoral->>'voter_city',
      upper(nullif(p_electoral->>'voter_state', '')), v_invite.campaign_id
    )
    on conflict (person_id) do update set
      voter_id = excluded.voter_id, electoral_zone = excluded.electoral_zone,
      electoral_section = excluded.electoral_section, voter_city = excluded.voter_city,
      voter_state = excluded.voter_state;
  end if;

  insert into public.audit_logs (action, entity_table, entity_id, campaign_id)
  values ('pessoa.autocadastro.publico.corrigir', 'people', v_invite.person_id, v_invite.campaign_id);

  return v_invite.person_id;
end;
$$;

comment on function public.update_public_registration(text, text, text, date, text, text, text, jsonb, jsonb, jsonb) is
  'Etapa 11 — cabo eleitoral reedita os próprios dados após correção solicitada. Só funciona com people.status em correcao_solicitada/reenviado.';

revoke all on function public.update_public_registration(text, text, text, date, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.update_public_registration(text, text, text, date, text, text, text, jsonb, jsonb, jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- correction_requests_select: soma a própria pessoa e o gestor dela —
-- antes só administrador/rh liam, e o coordenador não conseguia ver a
-- própria correção pendente em /meu-cadastro.
-- -----------------------------------------------------------------------------
drop policy correction_requests_select on public.correction_requests;
create policy correction_requests_select on public.correction_requests for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = correction_requests.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = correction_requests.submission_id
        and (
          rs.person_id = (select person_id from public.profiles where id = (select auth.uid()))
          or rs.manager_person_id = (select person_id from public.profiles where id = (select auth.uid()))
        )
    )
  );
