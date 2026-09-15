-- =============================================================================
-- Etapa 2 — coordenador completa o próprio cadastro e convida o cabo eleitoral
-- =============================================================================
-- Preenche o elo profiles.person_id (existe desde a 0001, nunca usado até
-- aqui). Toda escrita nova passa por função SECURITY DEFINER que se
-- autoriza sozinha via auth.uid() — RLS de people/coordination_relationships/
-- registration_submissions/registration_invites continua exatamente como
-- estava (só administrador/rh escrevem direto); as únicas extensões de RLS
-- desta migração são de LEITURA (ver a própria pessoa/equipe) e uma de
-- escrita bem estreita (upload do próprio documento).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- complete_own_registration(): qualquer authenticated preenche/edita a
-- PRÓPRIA people (cria na primeira vez, liga profiles.person_id; atualiza
-- depois). Usado pelo coordenador em /meu-cadastro.
-- -----------------------------------------------------------------------------
create or replace function public.complete_own_registration(
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
  v_profile record;
  v_person_id uuid;
  v_is_new boolean := false;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found then
    raise exception 'perfil não encontrado';
  end if;
  if v_profile.campaign_id is null then
    raise exception 'sua conta não está associada a uma campanha';
  end if;

  if v_profile.person_id is not null then
    v_person_id := v_profile.person_id;
    update public.people
      set full_name = p_full_name, cpf = p_cpf, birth_date = p_birth_date,
          phone = p_phone, whatsapp = p_whatsapp, email = p_email,
          updated_by = auth.uid()
      where id = v_person_id;
  else
    v_is_new := true;
    insert into public.people (
      full_name, cpf, birth_date, phone, whatsapp, email,
      campaign_id, origin, status, created_by
    ) values (
      p_full_name, p_cpf, p_birth_date, p_phone, p_whatsapp, p_email,
      v_profile.campaign_id, 'autocadastro', 'documentos_pendentes', auth.uid()
    )
    returning id into v_person_id;

    update public.profiles set person_id = v_person_id where id = auth.uid();
  end if;

  if p_address is not null then
    insert into public.person_addresses (
      person_id, zip_code, street, number, complement, neighborhood, city, state,
      campaign_id, created_by, updated_by
    ) values (
      v_person_id, p_address->>'zip_code', p_address->>'street', p_address->>'number',
      p_address->>'complement', p_address->>'neighborhood', p_address->>'city',
      upper(p_address->>'state'), v_profile.campaign_id, auth.uid(), auth.uid()
    )
    on conflict (person_id) do update set
      zip_code = excluded.zip_code, street = excluded.street, number = excluded.number,
      complement = excluded.complement, neighborhood = excluded.neighborhood,
      city = excluded.city, state = excluded.state, updated_by = auth.uid();
  end if;

  if p_bank is not null then
    insert into public.person_bank_accounts (
      person_id, bank_code, bank_name, agency, agency_digit, account_number,
      account_digit, account_type, pix_key_type, pix_key,
      campaign_id, created_by, updated_by
    ) values (
      v_person_id, p_bank->>'bank_code', p_bank->>'bank_name', p_bank->>'agency',
      p_bank->>'agency_digit', p_bank->>'account_number', p_bank->>'account_digit',
      p_bank->>'account_type', nullif(p_bank->>'pix_key_type', ''), nullif(p_bank->>'pix_key', ''),
      v_profile.campaign_id, auth.uid(), auth.uid()
    )
    on conflict (person_id) do update set
      bank_code = excluded.bank_code, bank_name = excluded.bank_name, agency = excluded.agency,
      agency_digit = excluded.agency_digit, account_number = excluded.account_number,
      account_digit = excluded.account_digit, account_type = excluded.account_type,
      pix_key_type = excluded.pix_key_type, pix_key = excluded.pix_key, updated_by = auth.uid();
  end if;

  if p_electoral is not null then
    insert into public.person_electoral_data (
      person_id, voter_id, electoral_zone, electoral_section, voter_city, voter_state,
      campaign_id, created_by, updated_by
    ) values (
      v_person_id, nullif(p_electoral->>'voter_id', ''), p_electoral->>'electoral_zone',
      p_electoral->>'electoral_section', p_electoral->>'voter_city',
      upper(nullif(p_electoral->>'voter_state', '')),
      v_profile.campaign_id, auth.uid(), auth.uid()
    )
    on conflict (person_id) do update set
      voter_id = excluded.voter_id, electoral_zone = excluded.electoral_zone,
      electoral_section = excluded.electoral_section, voter_city = excluded.voter_city,
      voter_state = excluded.voter_state, updated_by = auth.uid();
  end if;

  if public.has_role(array['administrador', 'rh']) then
    perform public.log_audit_event(
      p_action => case when v_is_new then 'pessoa.autocadastro.criar' else 'pessoa.autocadastro.editar' end,
      p_entity_table => 'people',
      p_entity_id => v_person_id
    );
  else
    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, campaign_id)
    values (
      auth.uid(),
      case when v_is_new then 'pessoa.autocadastro.criar' else 'pessoa.autocadastro.editar' end,
      'people', v_person_id, v_profile.campaign_id
    );
  end if;

  return v_person_id;
end;
$$;

comment on function public.complete_own_registration(text, text, date, text, text, text, jsonb, jsonb, jsonb) is
  'Qualquer authenticated preenche/edita a própria people (Etapa 2 — coordenador completa o próprio cadastro em /meu-cadastro). Liga profiles.person_id na primeira chamada.';

revoke all on function public.complete_own_registration(text, text, date, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.complete_own_registration(text, text, date, text, text, text, jsonb, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- create_team_invite(): qualquer authenticated que já completou o próprio
-- cadastro (profiles.person_id preenchido) cria um convite pra alguém da
-- própria equipe. Escopo territorial herdado do profile_roles do chamador
-- quando ele for coordenador_cidade/coordenador_eixo — sem exigir esses
-- papéis especificamente: o pior caso de uso indevido é criar um convite
-- "solto" sem escopo, que ainda depende de validação humana depois.
-- -----------------------------------------------------------------------------
create or replace function public.create_team_invite(
  p_contact_name text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_expires_in_days integer default 7
) returns public.registration_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_axis_id uuid;
  v_city_id uuid;
  v_invite public.registration_invites;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.person_id is null then
    raise exception 'complete o seu próprio cadastro antes de convidar sua equipe';
  end if;
  if v_profile.campaign_id is null then
    raise exception 'sua conta não está associada a uma campanha';
  end if;
  if p_expires_in_days is null or p_expires_in_days <= 0 or p_expires_in_days > 90 then
    raise exception 'prazo de validade inválido';
  end if;

  select pr.city_id, pr.axis_id into v_city_id, v_axis_id
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = auth.uid()
      and r.code in ('coordenador_cidade', 'coordenador_eixo')
      and pr.valid_from <= current_date
      and (pr.valid_until is null or pr.valid_until >= current_date)
    order by pr.valid_from desc
    limit 1;

  insert into public.registration_invites (
    campaign_id, contact_name, contact_phone, contact_email, expires_at,
    suggested_city_id, suggested_axis_id, suggested_coordinator_person_id, created_by
  ) values (
    v_profile.campaign_id, nullif(p_contact_name, ''), nullif(p_contact_phone, ''), nullif(p_contact_email, ''),
    now() + (p_expires_in_days || ' days')::interval,
    v_city_id, v_axis_id, v_profile.person_id, auth.uid()
  )
  returning * into v_invite;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, campaign_id)
  values (auth.uid(), 'convite.criar', 'registration_invites', v_invite.id, v_profile.campaign_id);

  return v_invite;
end;
$$;

comment on function public.create_team_invite(text, text, text, integer) is
  'Etapa 2 — cria convite de autocadastro pra um subordinado direto. Escopo territorial herdado do profile_roles do chamador quando ele for coordenador_cidade/coordenador_eixo.';

revoke all on function public.create_team_invite(text, text, text, integer) from public, anon, authenticated;
grant execute on function public.create_team_invite(text, text, text, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- submit_public_registration(): anon (e authenticated, por uniformidade)
-- envia o autocadastro do cabo eleitoral, validado só pelo token — mesma
-- proteção de redeem_registration_invite(). Cria people + satélites +
-- coordination_relationships (subordinado do coordenador sugerido no
-- convite). Não sobrescreve um convite já usado (person_id já preenchido).
-- -----------------------------------------------------------------------------
create or replace function public.submit_public_registration(
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
  v_person_id uuid;
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
  if v_invite.person_id is not null then
    raise exception 'este convite já foi usado para um cadastro';
  end if;

  insert into public.people (
    full_name, cpf, birth_date, phone, whatsapp, email, campaign_id, origin, status
  ) values (
    p_full_name, p_cpf, p_birth_date, p_phone, p_whatsapp, p_email,
    v_invite.campaign_id, 'autocadastro', 'documentos_pendentes'
  )
  returning id into v_person_id;

  if p_address is not null then
    insert into public.person_addresses (person_id, zip_code, street, number, complement, neighborhood, city, state, campaign_id)
    values (
      v_person_id, p_address->>'zip_code', p_address->>'street', p_address->>'number',
      p_address->>'complement', p_address->>'neighborhood', p_address->>'city',
      upper(p_address->>'state'), v_invite.campaign_id
    );
  end if;

  if p_bank is not null then
    insert into public.person_bank_accounts (person_id, bank_code, bank_name, agency, agency_digit, account_number, account_digit, account_type, pix_key_type, pix_key, campaign_id)
    values (
      v_person_id, p_bank->>'bank_code', p_bank->>'bank_name', p_bank->>'agency',
      p_bank->>'agency_digit', p_bank->>'account_number', p_bank->>'account_digit',
      p_bank->>'account_type', nullif(p_bank->>'pix_key_type', ''), nullif(p_bank->>'pix_key', ''),
      v_invite.campaign_id
    );
  end if;

  if p_electoral is not null then
    insert into public.person_electoral_data (person_id, voter_id, electoral_zone, electoral_section, voter_city, voter_state, campaign_id)
    values (
      v_person_id, nullif(p_electoral->>'voter_id', ''), p_electoral->>'electoral_zone',
      p_electoral->>'electoral_section', p_electoral->>'voter_city',
      upper(nullif(p_electoral->>'voter_state', '')), v_invite.campaign_id
    );
  end if;

  update public.registration_invites
    set person_id = v_person_id, status = 'em_preenchimento'
    where id = v_invite.id;

  if v_invite.suggested_coordinator_person_id is not null then
    insert into public.coordination_relationships (
      campaign_id, subordinate_person_id, coordinator_person_id, relationship_type,
      axis_id, city_id, team_id, source
    ) values (
      v_invite.campaign_id, v_person_id, v_invite.suggested_coordinator_person_id,
      'contratado_para_coordenador', v_invite.suggested_axis_id, v_invite.suggested_city_id,
      v_invite.suggested_team_id, 'autocadastro'
    );
  end if;

  insert into public.audit_logs (action, entity_table, entity_id, campaign_id)
  values ('pessoa.autocadastro.publico.criar', 'people', v_person_id, v_invite.campaign_id);

  return v_person_id;
end;
$$;

comment on function public.submit_public_registration(text, text, text, date, text, text, text, jsonb, jsonb, jsonb) is
  'Etapa 2 — segunda função do projeto liberada para anon (a primeira é redeem_registration_invite, mesma proteção por token). Cria a people do cabo eleitoral a partir do autocadastro público.';

revoke all on function public.submit_public_registration(text, text, text, date, text, text, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.submit_public_registration(text, text, text, date, text, text, text, jsonb, jsonb, jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- submit_registration_for_review(): o próprio coordenador (ou admin/rh)
-- envia a PRÓPRIA people pra validação do gestor — usado em /meu-cadastro.
-- Exige ao menos 1 documento ativo. Variante pública (token) logo abaixo,
-- pro cabo eleitoral, que não tem auth.uid() nenhum.
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

revoke all on function public.submit_registration_for_review(uuid) from public, anon, authenticated;
grant execute on function public.submit_registration_for_review(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- submit_public_registration_for_review(): variante pro cabo eleitoral
-- (anon, via token) — mesmo papel que submit_registration_for_review, sem
-- auth.uid() nenhum.
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
  if v_invite.status = 'concluido' then
    raise exception 'cadastro já foi enviado';
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

  insert into public.audit_logs (action, entity_table, entity_id, campaign_id)
  values ('pessoa.autocadastro.publico.enviar_validacao', 'people', v_invite.person_id, v_invite.campaign_id);

  return v_submission_id;
end;
$$;

revoke all on function public.submit_public_registration_for_review(text) from public, anon, authenticated;
grant execute on function public.submit_public_registration_for_review(text) to anon, authenticated;

-- =============================================================================
-- RLS — extensões pontuais, todas restritas ao próprio registro (leitura) ou
-- ao próprio person_id (upload de documento). Nenhuma policy de INSERT/UPDATE
-- de people/coordination_relationships/registration_submissions/
-- registration_invites muda — essas escritas continuam só via função acima
-- ou administrador/rh direto, como já era desde a Etapa 1.
-- =============================================================================

drop policy person_documents_insert on public.person_documents;
create policy person_documents_insert on public.person_documents for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
    or person_id = (select person_id from public.profiles where id = (select auth.uid()))
  );

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
      or split_part(name, '/', 2) = (select person_id::text from public.profiles where id = (select auth.uid()))
    )
  );

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
    or id = (select person_id from public.profiles where id = (select auth.uid()))
    or id in (
      select subordinate_person_id from public.coordination_relationships
      where coordinator_person_id = (select person_id from public.profiles where id = (select auth.uid()))
        and status = 'vigente'
    )
  );

drop policy registration_submissions_select on public.registration_submissions;
create policy registration_submissions_select on public.registration_submissions for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
    or person_id = (select person_id from public.profiles where id = (select auth.uid()))
    or manager_person_id = (select person_id from public.profiles where id = (select auth.uid()))
  );

drop policy coordination_relationships_select on public.coordination_relationships;
create policy coordination_relationships_select on public.coordination_relationships for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or subordinate_person_id = (select person_id from public.profiles where id = (select auth.uid()))
    or coordinator_person_id = (select person_id from public.profiles where id = (select auth.uid()))
  );

drop policy registration_invites_select on public.registration_invites;
create policy registration_invites_select on public.registration_invites for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
    or created_by = (select auth.uid())
  );
