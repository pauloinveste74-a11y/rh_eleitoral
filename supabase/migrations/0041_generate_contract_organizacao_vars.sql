-- CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md, seções 8/9/15:
-- o corpo do contrato (qualificação do CONTRATANTE) e o cabeçalho/
-- rodapé devem trazer CNPJ/endereço/e-mail/telefone/representante da
-- entidade contratante. `generate_contract()` (migração 0032) nunca
-- populou nenhuma variável de organização — só dados do contratado
-- (pessoa ou empresa). Esta migração soma um bloco `organizacao_*` ao
-- mesmo `v_vars`/`replace()` já usado pras demais variáveis, pra quem
-- editar o texto do modelo poder escrever
-- "{{organizacao_nome}}, CNPJ {{organizacao_cnpj}}..." na qualificação,
-- exatamente como a seção 15 do caderno sugere (nomeação flat —
-- organizacao_cnpj — em vez do estilo com ponto do caderno,
-- {{organizacao.cnpj}}, que este mecanismo de replace() não suporta).
--
-- Assinatura idêntica — create or replace direto, sem drop.

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
$function$
