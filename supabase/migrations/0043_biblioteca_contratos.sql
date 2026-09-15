-- Biblioteca jurídica de contratos — Etapa 1
-- (docs/VALIDACAO_DOCUMENTAL_MATRIZ.md, Caderno A, seções 11/12/15/16).
-- Catálogo global dos 31 tipos de contrato nomeados (14 PF + 17 PJ) +
-- corpo-base de cláusulas prontas (em src/lib/contracts/base-bodies.ts,
-- aplicado via a publish_template_version() já existente — nenhuma
-- função nova pra isso). O template criado a partir do catálogo fica
-- 'rascunho' (não aparece em /contratos pra gerar contrato real — essa
-- tela só lista status='ativo') até alguém revisar o texto sugerido e
-- publicar de propósito, mesmo fluxo humano que já existe hoje pra
-- modelo escrito à mão.

-- -----------------------------------------------------------------------------
-- 1) contract_type_catalog — referência global, mesmo padrão de public.roles
--    (migração 0001: sem campaign_id, leitura liberada, sem policy de
--    escrita porque só migração popula).
-- -----------------------------------------------------------------------------
create table public.contract_type_catalog (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  contract_type text not null check (contract_type in ('pf', 'pj')),
  label text not null,
  display_order integer not null,
  created_at timestamptz not null default now()
);

comment on table public.contract_type_catalog is 'Catálogo fixo dos 31 tipos de contrato nomeados do Caderno Documental Jurídico (seções 11/12) — referência global, não por campanha.';

alter table public.contract_type_catalog enable row level security;

create policy contract_type_catalog_select on public.contract_type_catalog for select to authenticated
  using (true);

insert into public.contract_type_catalog (code, contract_type, label, display_order) values
  ('PF01', 'pf', 'Cabo eleitoral', 1),
  ('PF02', 'pf', 'Coordenador de equipe', 2),
  ('PF03', 'pf', 'Coordenador de cidade ou RA', 3),
  ('PF04', 'pf', 'Coordenador de eixo', 4),
  ('PF05', 'pf', 'Apoio administrativo', 5),
  ('PF06', 'pf', 'Atendimento e recepção', 6),
  ('PF07', 'pf', 'Motorista', 7),
  ('PF08', 'pf', 'Fotógrafo ou videomaker', 8),
  ('PF09', 'pf', 'Designer ou social media', 9),
  ('PF10', 'pf', 'Técnico de informática', 10),
  ('PF11', 'pf', 'Fiscal ou delegado eleitoral', 11),
  ('PF12', 'pf', 'Prestador especializado eventual', 12),
  ('PF13', 'pf', 'Advogado autônomo', 13),
  ('PF14', 'pf', 'Contador autônomo', 14),
  ('PJ01', 'pj', 'Empresa de mobilização eleitoral', 1),
  ('PJ02', 'pj', 'Empresa de apoio administrativo', 2),
  ('PJ03', 'pj', 'Consultoria eleitoral', 3),
  ('PJ04', 'pj', 'Agência de publicidade', 4),
  ('PJ05', 'pj', 'Marketing digital', 5),
  ('PJ06', 'pj', 'Produção audiovisual', 6),
  ('PJ07', 'pj', 'Tecnologia e software', 7),
  ('PJ08', 'pj', 'Call center', 8),
  ('PJ09', 'pj', 'Transporte e logística', 9),
  ('PJ10', 'pj', 'Locação e estrutura', 10),
  ('PJ11', 'pj', 'Segurança privada', 11),
  ('PJ12', 'pj', 'Alimentação e eventos', 12),
  ('PJ13', 'pj', 'Sociedade de advocacia', 13),
  ('PJ14', 'pj', 'Organização contábil', 14),
  ('PJ15', 'pj', 'Pesquisa e análise de dados', 15),
  ('PJ16', 'pj', 'Serviços gráficos', 16),
  ('PJ17', 'pj', 'Prestação especializada', 17);

-- -----------------------------------------------------------------------------
-- 2) contract_templates.source_catalog_code — de qual item do catálogo o
--    modelo nasceu, pra /contratos/modelos saber que texto sugerir no
--    formulário de publicar versão. Nulo pra modelo escrito à mão (fluxo
--    de hoje, sem mudança).
-- -----------------------------------------------------------------------------
alter table public.contract_templates
  add column source_catalog_code text references public.contract_type_catalog(code);

comment on column public.contract_templates.source_catalog_code is 'Item do catálogo (contract_type_catalog.code) que originou este modelo, se veio da biblioteca — usado só pra pré-preencher o texto sugerido, nunca reaplicado depois de criado.';

-- -----------------------------------------------------------------------------
-- 3) generate_contract() — 4 chaves novas em v_vars, dado que já existe
--    (people.phone/email; legal_entities.phone/email/legal_representative_cpf
--    + endereço, presentes desde a 0029). Sem novo parâmetro, sem nova
--    coluna em contracts — só mais chaves no jsonb existente.
-- -----------------------------------------------------------------------------
create or replace function public.generate_contract(p_template_version_id uuid, p_person_id uuid DEFAULT NULL::uuid, p_legal_entity_id uuid DEFAULT NULL::uuid, p_job_function_id uuid DEFAULT NULL::uuid, p_position_override text DEFAULT NULL::text, p_value_cents bigint DEFAULT NULL::bigint, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_version record;
  v_template record;
  v_campaign_id uuid;
  v_campaign record;
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
      'telefone', coalesce(v_person.phone, ''),
      'email', coalesce(v_person.email, ''),
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
      'representante_cpf', coalesce(v_legal_entity.legal_representative_cpf, ''),
      'endereco_completo', case when v_legal_entity.street is null then '' else
        concat_ws(', ', v_legal_entity.street || coalesce(', ' || v_legal_entity.number, ''), v_legal_entity.neighborhood,
          coalesce(v_legal_entity.city, '') || '/' || coalesce(v_legal_entity.state, ''), 'CEP ' || coalesce(v_legal_entity.zip_code, ''))
      end,
      'telefone', coalesce(v_legal_entity.phone, ''),
      'email', coalesce(v_legal_entity.email, ''),
      'funcao', coalesce(v_position, ''),
      'data_inicio', coalesce(p_start_date::text, ''),
      'data_fim', coalesce(p_end_date::text, ''),
      'valor_contratado', v_valor_txt
    );
  end if;

  -- Dados da organização contratante (CADERNO_DOCUMENTAL_JURIDICO_
  -- CONTRATOS_RH_ELEITORAL.md, seções 8/9/15) — nomeação flat
  -- (organizacao_*), mesmo padrão das demais chaves desta função, não
  -- o estilo com ponto ({{organizacao.cnpj}}) sugerido no caderno, que
  -- este mecanismo de replace() não suporta.
  select * into v_campaign from public.campaigns where id = v_campaign_id;
  v_vars := v_vars || jsonb_build_object(
    'organizacao_nome', coalesce(v_campaign.legal_name, v_campaign.name, ''),
    'organizacao_cnpj', coalesce(v_campaign.document_number, ''),
    'organizacao_endereco', case when v_campaign.street is null then '' else
      concat_ws(', ', v_campaign.street || coalesce(', ' || v_campaign.number, ''), v_campaign.neighborhood,
        coalesce(v_campaign.city, '') || '/' || coalesce(v_campaign.state, ''), 'CEP ' || coalesce(v_campaign.zip_code, ''))
    end,
    'organizacao_telefone', coalesce(v_campaign.phone, ''),
    'organizacao_email', coalesce(v_campaign.email, ''),
    'organizacao_representante_nome', coalesce(v_campaign.representative_name, ''),
    'organizacao_representante_cpf', coalesce(v_campaign.representative_cpf, '')
  );

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
$function$;
