-- =============================================================================
-- Nova versão (docs/NOVA_VERSAO_RH_ELEITORAL.md) — Etapa 5: gestão de
-- contratos (spec seção 12) — a peça que a matriz apontou como maior e
-- totalmente ausente (nenhuma tabela existia).
--
-- Escopo desta etapa (fundação completa do módulo, documentado com detalhe
-- porque é grande):
--   - contract_templates + template_versions: modelo versionado por
--     campanha/tipo de contratado, com responsável, vigência, status e
--     aprovação jurídica (12.1).
--   - contracts: geração individual a partir de uma versão de modelo,
--     preenchendo os placeholders com dados reais da pessoa (PF) ou pessoa
--     jurídica (PJ) — snapshot completo (`generated_body`/`variables_used`),
--     imutável a alterações futuras do modelo (12.2, "alterações
--     posteriores no modelo não modificam contratos já gerados").
--   - contract_documents: só o PDF assinado enviado de volta (12.3) — o
--     contrato GERADO não vira arquivo nesta versão (sem lib de PDF no
--     projeto); é servido como página imprimível a partir de
--     `generated_body` (Ctrl+P / salvar como PDF do próprio navegador,
--     suficiente pro fluxo "contratado faz download, assina fora do
--     sistema, envia o PDF assinado" — assinatura digital integrada é
--     explicitamente uma versão futura, spec 12.3).
--
-- Fora de escopo desta etapa (documentado, fica pra depois):
--   - geração em lote/grupo (só individual por enquanto — o botão "gerar
--     pra equipe toda" fica pra próxima iteração do módulo);
--   - os 4 status de 12.4 que pressupõem uma etapa de aprovação prévia à
--     geração (`aguardando_geracao`, `disponivel`, `aguardando_assinatura`,
--     `em_conferencia`) ficam no CHECK (pra não exigir migração nova
--     quando forem usados) mas o fluxo desta etapa não os produz — vai
--     direto gerado → baixado → assinado_enviado → decisão do gestor/RH;
--   - {{funcao}} não tem coluna estrutural em `people` ainda (ligar
--     job_functions a people ficou fora da Etapa 1 de propósito); o cargo
--     impresso no contrato é escolhido no momento da geração
--     (`p_job_function_id` do catálogo, ou texto livre).
--
-- Padrão de autorização: idêntico ao resto do projeto — cada função
-- SECURITY DEFINER se autoriza sozinha via auth.uid(), audita com insert
-- direto em audit_logs (mesma razão de decide_registration_submission()
-- nunca usar log_audit_event() — o coordenador comum não tem admin/rh).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) contract_templates + template_versions
-- -----------------------------------------------------------------------------
create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  name text not null,
  contract_type text not null check (contract_type in ('pf', 'pj')),
  job_function_id uuid references public.job_functions(id),
  responsible_profile_id uuid references public.profiles(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'inativo')),
  legal_approval_status text not null default 'pendente' check (legal_approval_status in ('pendente', 'aprovado', 'reprovado')),
  legal_approved_by uuid references public.profiles(id),
  legal_approved_at timestamptz,
  legal_approval_note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.contract_templates is 'Modelo de contrato por campanha/tipo (spec 12.1) — o conteúdo versionado vive em template_versions.';

create index contract_templates_campaign_id_idx on public.contract_templates (campaign_id);

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),
  contract_template_id uuid not null references public.contract_templates(id),
  version_number integer not null,
  body text not null,
  valid_from date not null default current_date,
  valid_until date,
  status text not null default 'ativo' check (status in ('rascunho', 'ativo', 'substituido')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (contract_template_id, version_number)
);

comment on table public.template_versions is 'Conteúdo versionado do modelo (com {{placeholders}}) — contracts.template_version_id trava a versão usada, imune a edição posterior.';

create index template_versions_template_id_idx on public.template_versions (contract_template_id);

alter table public.contract_templates enable row level security;
alter table public.template_versions enable row level security;

-- Leitura liberada a qualquer authenticated da campanha (catálogo, mesmo
-- espírito de job_functions/roles) — um coordenador precisa ver os modelos
-- disponíveis pra escolher um na hora de gerar um contrato da equipe.
create policy contract_templates_select on public.contract_templates for select to authenticated
  using (public.is_platform_admin() or campaign_id = (select public.current_campaign_id()));

create policy contract_templates_insert on public.contract_templates for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

create policy contract_templates_update on public.contract_templates for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'juridico'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'juridico'])));

create policy template_versions_select on public.template_versions for select to authenticated
  using (exists (
    select 1 from public.contract_templates ct
    where ct.id = template_versions.contract_template_id
      and (public.is_platform_admin() or ct.campaign_id = (select public.current_campaign_id()))
  ));
-- sem policy de insert/update pra template_versions: só publish_template_version() escreve (versionamento com efeitos colaterais — marcar a anterior como substituída — não pode ser um insert solto).

-- -----------------------------------------------------------------------------
-- 2) contracts + contract_documents
-- -----------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  template_version_id uuid not null references public.template_versions(id),
  person_id uuid references public.people(id),
  legal_entity_id uuid references public.legal_entities(id),
  job_function_id uuid references public.job_functions(id),
  position_override text,
  value_cents bigint check (value_cents is null or value_cents >= 0),
  start_date date,
  end_date date,
  generated_body text not null,
  variables_used jsonb not null default '{}'::jsonb,
  status text not null default 'gerado' check (status in (
    'aguardando_geracao', 'gerado', 'disponivel', 'baixado', 'aguardando_assinatura',
    'assinado_enviado', 'em_conferencia', 'correcao_solicitada', 'assinado_e_validado',
    'recusado', 'substituido', 'encerrado'
  )),
  replaces_contract_id uuid references public.contracts(id),
  generated_by uuid references public.profiles(id),
  generated_at timestamptz not null default now(),
  downloaded_at timestamptz,
  signed_submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_exactly_one_target check (
    (person_id is not null and legal_entity_id is null) or (person_id is null and legal_entity_id is not null)
  )
);

comment on table public.contracts is 'Contrato individual gerado a partir de uma template_versions — snapshot completo (generated_body/variables_used), spec 12.2/12.4.';

create index contracts_campaign_id_idx on public.contracts (campaign_id);
create index contracts_person_id_idx on public.contracts (person_id);
create index contracts_legal_entity_id_idx on public.contracts (legal_entity_id);
create index contracts_status_idx on public.contracts (status);

create table public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id),
  document_kind text not null check (document_kind in ('assinado')),
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.contract_documents is 'Só o PDF assinado enviado de volta (spec 12.3) — o contrato gerado é servido como página imprimível a partir de contracts.generated_body, não vira arquivo nesta versão.';

create index contract_documents_contract_id_idx on public.contract_documents (contract_id);

alter table public.contracts enable row level security;
alter table public.contract_documents enable row level security;

-- Mesmo padrão de people_select/registration_submissions_select: admin/rh/
-- auditor vê tudo da campanha; a própria pessoa vê o próprio contrato; o
-- coordenador direto vê o da equipe. Contrato de PJ (sem person_id) só
-- admin/rh/auditor — não há autosserviço de PJ ainda.
create policy contracts_select on public.contracts for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or (person_id is not null and person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid())))
    or (person_id is not null and person_id in (
      select coordination_relationships.subordinate_person_id
      from public.coordination_relationships
      where coordination_relationships.coordinator_person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid()))
        and coordination_relationships.status = 'vigente'
    ))
  );
-- sem policy de insert/update/delete: só generate_contract()/mark_contract_downloaded()/submit_signed_contract()/decide_contract() escrevem.

create policy contract_documents_select on public.contract_documents for select to authenticated
  using (exists (
    select 1 from public.contracts c
    where c.id = contract_documents.contract_id
      and (
        public.is_platform_admin()
        or (c.campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
        or (c.person_id is not null and c.person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid())))
        or (c.person_id is not null and c.person_id in (
          select coordination_relationships.subordinate_person_id
          from public.coordination_relationships
          where coordination_relationships.coordinator_person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid()))
            and coordination_relationships.status = 'vigente'
        ))
      )
  ));
-- sem policy de insert: só submit_signed_contract() escreve.

-- -----------------------------------------------------------------------------
-- 3) Bucket contratos-documentos + políticas de Storage (só o PDF assinado)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contratos-documentos', 'contratos-documentos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Path: campaign_id/person_id/uuid-arquivo (PF) — mesma convenção de
-- pessoas-documentos, reaproveita a mesma cláusula de self/gestor. Contrato
-- de PJ não tem upload de autosserviço (só admin/rh, cobertos pelo primeiro ramo).
create policy contratos_documentos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contratos-documentos'
    and (
      public.is_platform_admin()
      or (split_part(name, '/', 1) = (select public.current_campaign_id())::text and public.has_role(array['administrador', 'rh']))
      or (split_part(name, '/', 2) = (select profiles.person_id::text from public.profiles where profiles.id = (select auth.uid())))
      or (split_part(name, '/', 2) in (
        select coordination_relationships.subordinate_person_id::text
        from public.coordination_relationships
        where coordination_relationships.coordinator_person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid()))
          and coordination_relationships.status = 'vigente'
      ))
    )
  );

create policy contratos_documentos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'contratos-documentos'
    and (
      public.is_platform_admin()
      or (split_part(name, '/', 1) = (select public.current_campaign_id())::text and public.has_role(array['administrador', 'rh', 'auditor']))
      or (split_part(name, '/', 2) = (select profiles.person_id::text from public.profiles where profiles.id = (select auth.uid())))
      or (split_part(name, '/', 2) in (
        select coordination_relationships.subordinate_person_id::text
        from public.coordination_relationships
        where coordination_relationships.coordinator_person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid()))
          and coordination_relationships.status = 'vigente'
      ))
    )
  );

-- -----------------------------------------------------------------------------
-- 4) publish_template_version(): cria uma nova versão ativa, superando a
--    anterior — mesma lógica de versionamento de record_person_document()
--    (Etapa 3), aqui aplicada a modelo em vez de documento de pessoa.
-- -----------------------------------------------------------------------------
create or replace function public.publish_template_version(
  p_contract_template_id uuid,
  p_body text,
  p_valid_from date default current_date,
  p_valid_until date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
  v_next_version integer;
  v_id uuid;
begin
  select * into v_template from public.contract_templates where id = p_contract_template_id;
  if not found then
    raise exception 'modelo não encontrado';
  end if;

  if not (public.is_platform_admin() or (v_template.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))) then
    raise exception 'não autorizado a publicar versão deste modelo';
  end if;

  if p_body is null or btrim(p_body) = '' then
    raise exception 'informe o conteúdo do modelo';
  end if;

  select coalesce(max(version_number), 0) + 1 into v_next_version
    from public.template_versions where contract_template_id = p_contract_template_id;

  update public.template_versions
    set status = 'substituido'
    where contract_template_id = p_contract_template_id and status = 'ativo';

  insert into public.template_versions (contract_template_id, version_number, body, valid_from, valid_until, status, created_by)
  values (p_contract_template_id, v_next_version, p_body, p_valid_from, p_valid_until, 'ativo', (select auth.uid()))
  returning id into v_id;

  update public.contract_templates
    set status = 'ativo', updated_at = now()
    where id = p_contract_template_id and status = 'rascunho';

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, after_data, campaign_id)
  values ((select auth.uid()), 'contrato.modelo.publicar_versao', 'template_versions', v_id,
    jsonb_build_object('contract_template_id', p_contract_template_id, 'version_number', v_next_version), v_template.campaign_id);

  return v_id;
end;
$$;

revoke all on function public.publish_template_version(uuid, text, date, date) from public, anon;
grant execute on function public.publish_template_version(uuid, text, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 5) set_template_legal_approval(): jurídico (ou admin) aprova/reprova o
--    modelo (spec 12.1, "cada modelo terá... aprovação jurídica").
-- -----------------------------------------------------------------------------
create or replace function public.set_template_legal_approval(
  p_contract_template_id uuid,
  p_approved boolean,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_template record;
begin
  select * into v_template from public.contract_templates where id = p_contract_template_id;
  if not found then
    raise exception 'modelo não encontrado';
  end if;

  if not (public.is_platform_admin() or (v_template.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'juridico']))) then
    raise exception 'não autorizado a aprovar este modelo';
  end if;

  update public.contract_templates
    set legal_approval_status = case when p_approved then 'aprovado' else 'reprovado' end,
        legal_approved_by = (select auth.uid()),
        legal_approved_at = now(),
        legal_approval_note = p_note,
        updated_at = now()
    where id = p_contract_template_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, after_data, reason, campaign_id)
  values ((select auth.uid()), 'contrato.modelo.aprovacao_juridica', 'contract_templates', p_contract_template_id,
    jsonb_build_object('approved', p_approved), p_note, v_template.campaign_id);
end;
$$;

revoke all on function public.set_template_legal_approval(uuid, boolean, text) from public, anon;
grant execute on function public.set_template_legal_approval(uuid, boolean, text) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) generate_contract(): preenche os placeholders com dados reais e grava
--    o snapshot — spec 12.2. PF (p_person_id) autoriza admin/rh ou o
--    coordenador direto; PJ (p_legal_entity_id) só admin/rh.
-- -----------------------------------------------------------------------------
create or replace function public.generate_contract(
  p_template_version_id uuid,
  p_person_id uuid default null,
  p_legal_entity_id uuid default null,
  p_job_function_id uuid default null,
  p_position_override text default null,
  p_value_cents bigint default null,
  p_start_date date default null,
  p_end_date date default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version record;
  v_template record;
  v_campaign_id uuid;
  v_own_person_id uuid;
  v_authorized boolean;
  v_body text;
  v_vars jsonb := '{}'::jsonb;
  v_person record;
  v_address record;
  v_axis_id uuid;
  v_city_id uuid;
  v_axis_name text;
  v_city_name text;
  v_coordinator_name text;
  v_position text;
  v_legal_entity record;
  v_valor_txt text;
  v_id uuid;
begin
  if (p_person_id is null) = (p_legal_entity_id is null) then
    raise exception 'informe exatamente uma pessoa (PF) ou uma empresa (PJ)';
  end if;

  select * into v_version from public.template_versions where id = p_template_version_id;
  if not found then
    raise exception 'versão de modelo não encontrada';
  end if;
  select * into v_template from public.contract_templates where id = v_version.contract_template_id;
  v_campaign_id := v_template.campaign_id;

  if (p_person_id is not null and v_template.contract_type <> 'pf') or (p_legal_entity_id is not null and v_template.contract_type <> 'pj') then
    raise exception 'este modelo não é compatível com o tipo de contratado informado';
  end if;

  select person_id into v_own_person_id from public.profiles where id = (select auth.uid());

  if p_person_id is not null then
    v_authorized := public.is_platform_admin()
      or (v_campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
      or (v_own_person_id is not null and exists (
        select 1 from public.coordination_relationships
        where coordinator_person_id = v_own_person_id and subordinate_person_id = p_person_id and status = 'vigente'
      ));
  else
    v_authorized := public.is_platform_admin()
      or (v_campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']));
  end if;
  v_authorized := coalesce(v_authorized, false);
  if not v_authorized then
    raise exception 'não autorizado a gerar este contrato';
  end if;

  if p_job_function_id is not null then
    select name into v_position from public.job_functions where id = p_job_function_id;
  else
    v_position := p_position_override;
  end if;

  -- Formatação de valor em BRL sem depender do locale da sessão (G/D do
  -- to_char variam com lc_numeric) — monta "R$ 1.234,56" na mão via regex
  -- de agrupamento de milhar, sempre igual independente do ambiente.
  if p_value_cents is null then
    v_valor_txt := '';
  else
    v_valor_txt := 'R$ ' || reverse(regexp_replace(reverse((p_value_cents / 100)::text), '(\d{3})(?=\d)', '\1.', 'g'))
      || ',' || lpad((p_value_cents % 100)::text, 2, '0');
  end if;

  v_body := v_version.body;

  if p_person_id is not null then
    select * into v_person from public.people where id = p_person_id;
    if not found then
      raise exception 'pessoa não encontrada';
    end if;
    select * into v_address from public.person_addresses where person_id = p_person_id;

    select oa.axis_id, oa.city_id into v_axis_id, v_city_id
      from public.organizational_assignments oa where oa.person_id = p_person_id and oa.status = 'vigente' limit 1;
    if v_axis_id is null and v_city_id is null then
      select cr.axis_id, cr.city_id into v_axis_id, v_city_id
        from public.coordination_relationships cr where cr.subordinate_person_id = p_person_id and cr.status = 'vigente' limit 1;
    end if;
    select name into v_axis_name from public.axes where id = v_axis_id;
    select name into v_city_name from public.cities where id = v_city_id;

    select p2.full_name into v_coordinator_name
      from public.coordination_relationships cr
      join public.people p2 on p2.id = cr.coordinator_person_id
      where cr.subordinate_person_id = p_person_id and cr.status = 'vigente'
      limit 1;

    v_vars := jsonb_build_object(
      'nome_contratado', v_person.full_name,
      'cpf', v_person.cpf,
      'rg', coalesce(v_person.rg, ''),
      'endereco_completo', case when v_address.id is null then '' else
        concat_ws(', ', v_address.street || coalesce(', ' || v_address.number, ''), v_address.neighborhood, v_address.city || '/' || v_address.state, 'CEP ' || v_address.zip_code)
      end,
      'funcao', coalesce(v_position, ''),
      'cidade', coalesce(v_city_name, ''),
      'eixo', coalesce(v_axis_name, ''),
      'coordenador', coalesce(v_coordinator_name, ''),
      'data_inicio', coalesce(p_start_date::text, ''),
      'data_fim', coalesce(p_end_date::text, ''),
      'valor_contratado', v_valor_txt
    );
  else
    select * into v_legal_entity from public.legal_entities where id = p_legal_entity_id;
    if not found then
      raise exception 'empresa não encontrada';
    end if;

    v_vars := jsonb_build_object(
      'razao_social', v_legal_entity.company_name,
      'cnpj', v_legal_entity.cnpj,
      'representante_legal', v_legal_entity.legal_representative_name,
      'funcao', coalesce(v_position, ''),
      'data_inicio', coalesce(p_start_date::text, ''),
      'data_fim', coalesce(p_end_date::text, ''),
      'valor_contratado', v_valor_txt
    );
  end if;

  declare
    v_key text;
    v_val text;
  begin
    for v_key, v_val in select * from jsonb_each_text(v_vars) loop
      v_body := replace(v_body, '{{' || v_key || '}}', coalesce(v_val, ''));
    end loop;
  end;

  insert into public.contracts (
    campaign_id, template_version_id, person_id, legal_entity_id, job_function_id, position_override,
    value_cents, start_date, end_date, generated_body, variables_used, status, generated_by
  ) values (
    v_campaign_id, p_template_version_id, p_person_id, p_legal_entity_id, p_job_function_id, p_position_override,
    p_value_cents, p_start_date, p_end_date, v_body, v_vars, 'gerado', (select auth.uid())
  )
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, after_data, campaign_id)
  values ((select auth.uid()), 'contrato.gerar', 'contracts', v_id,
    jsonb_build_object('person_id', p_person_id, 'legal_entity_id', p_legal_entity_id, 'template_version_id', p_template_version_id), v_campaign_id);

  return v_id;
end;
$$;

revoke all on function public.generate_contract(uuid, uuid, uuid, uuid, text, bigint, date, date) from public, anon;
grant execute on function public.generate_contract(uuid, uuid, uuid, uuid, text, bigint, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- 7) mark_contract_downloaded() / submit_signed_contract() / decide_contract()
-- -----------------------------------------------------------------------------
create or replace function public.mark_contract_downloaded(p_contract_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract record;
  v_own_person_id uuid;
  v_authorized boolean;
begin
  select * into v_contract from public.contracts where id = p_contract_id;
  if not found then
    raise exception 'contrato não encontrado';
  end if;

  select person_id into v_own_person_id from public.profiles where id = (select auth.uid());

  v_authorized := public.is_platform_admin()
    or (v_contract.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_contract.person_id is not null and v_own_person_id is not null and v_contract.person_id = v_own_person_id)
    or (v_contract.person_id is not null and v_own_person_id is not null and exists (
      select 1 from public.coordination_relationships
      where coordinator_person_id = v_own_person_id and subordinate_person_id = v_contract.person_id and status = 'vigente'
    ));
  v_authorized := coalesce(v_authorized, false);
  if not v_authorized then
    raise exception 'não autorizado a baixar este contrato';
  end if;

  if v_contract.status in ('gerado', 'disponivel') then
    update public.contracts set status = 'baixado', downloaded_at = coalesce(downloaded_at, now()), updated_at = now() where id = p_contract_id;
  end if;
end;
$$;

revoke all on function public.mark_contract_downloaded(uuid) from public, anon;
grant execute on function public.mark_contract_downloaded(uuid) to authenticated;

create or replace function public.submit_signed_contract(
  p_contract_id uuid,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract record;
  v_own_person_id uuid;
  v_authorized boolean;
  v_doc_id uuid;
begin
  select * into v_contract from public.contracts where id = p_contract_id;
  if not found then
    raise exception 'contrato não encontrado';
  end if;

  select person_id into v_own_person_id from public.profiles where id = (select auth.uid());

  v_authorized := public.is_platform_admin()
    or (v_contract.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_contract.person_id is not null and v_own_person_id is not null and v_contract.person_id = v_own_person_id)
    or (v_contract.person_id is not null and v_own_person_id is not null and exists (
      select 1 from public.coordination_relationships
      where coordinator_person_id = v_own_person_id and subordinate_person_id = v_contract.person_id and status = 'vigente'
    ));
  v_authorized := coalesce(v_authorized, false);
  if not v_authorized then
    raise exception 'não autorizado a enviar assinatura deste contrato';
  end if;

  if v_contract.status = 'assinado_e_validado' then
    raise exception 'este contrato já está assinado e validado';
  end if;

  insert into public.contract_documents (contract_id, document_kind, storage_path, file_name, mime_type, file_size_bytes, uploaded_by)
  values (p_contract_id, 'assinado', p_storage_path, p_file_name, p_mime_type, p_file_size_bytes, (select auth.uid()))
  returning id into v_doc_id;

  update public.contracts
    set status = 'assinado_enviado', signed_submitted_at = now(), updated_at = now()
    where id = p_contract_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, after_data, campaign_id)
  values ((select auth.uid()), 'contrato.assinatura.enviar', 'contract_documents', v_doc_id,
    jsonb_build_object('contract_id', p_contract_id, 'file_name', p_file_name), v_contract.campaign_id);

  return v_doc_id;
end;
$$;

revoke all on function public.submit_signed_contract(uuid, text, text, text, bigint) from public, anon;
grant execute on function public.submit_signed_contract(uuid, text, text, text, bigint) to authenticated;

create or replace function public.decide_contract(
  p_contract_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract record;
  v_own_person_id uuid;
  v_authorized boolean;
  v_new_status text;
begin
  if p_decision not in ('validar', 'solicitar_correcao', 'recusar') then
    raise exception 'decisão inválida: %', p_decision;
  end if;

  select * into v_contract from public.contracts where id = p_contract_id;
  if not found then
    raise exception 'contrato não encontrado';
  end if;

  if v_contract.status <> 'assinado_enviado' then
    raise exception 'este contrato não está aguardando conferência (status atual: %)', v_contract.status;
  end if;

  if p_decision in ('solicitar_correcao', 'recusar') and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'informe o motivo';
  end if;

  select person_id into v_own_person_id from public.profiles where id = (select auth.uid());

  v_authorized := public.is_platform_admin()
    or (v_contract.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_contract.person_id is not null and v_own_person_id is not null and exists (
      select 1 from public.coordination_relationships
      where coordinator_person_id = v_own_person_id and subordinate_person_id = v_contract.person_id and status = 'vigente'
    ));
  v_authorized := coalesce(v_authorized, false);
  if not v_authorized then
    raise exception 'não autorizado a decidir sobre este contrato';
  end if;

  v_new_status := case p_decision
    when 'validar' then 'assinado_e_validado'
    when 'recusar' then 'recusado'
    else 'correcao_solicitada'
  end;

  update public.contracts
    set status = v_new_status,
        reviewed_by = (select auth.uid()),
        reviewed_at = now(),
        rejection_reason = case when p_decision <> 'validar' then p_reason else null end,
        updated_at = now()
    where id = p_contract_id;

  insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, after_data, reason, campaign_id)
  values ((select auth.uid()), 'contrato.conferencia.' || p_decision, 'contracts', p_contract_id,
    jsonb_build_object('status', v_new_status), p_reason, v_contract.campaign_id);
end;
$$;

revoke all on function public.decide_contract(uuid, text, text) from public, anon;
grant execute on function public.decide_contract(uuid, text, text) to authenticated;
