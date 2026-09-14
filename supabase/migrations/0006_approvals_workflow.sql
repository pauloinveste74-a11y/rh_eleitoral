-- =============================================================================
-- Fase 2 — Aprovações: validação de pessoa por cidade → eixo
-- =============================================================================
-- Pipeline coberto nesta fase: rascunho -> (RH envia) ->
-- pendente_validacao_cidade -> (coordenador de cidade decide) ->
-- pendente_validacao_eixo -> (coordenador de eixo decide) -> aprovado ou
-- rejeitado em qualquer uma das duas etapas. Documentos/OCR e contrato
-- continuam fora de escopo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções de escopo territorial do coordenador (mesmo idioma de
-- has_role()/is_admin(): SECURITY DEFINER, search_path fixo, revoke+grant)
-- -----------------------------------------------------------------------------
create or replace function public.is_city_coordinator_for(p_city_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = auth.uid()
      and r.code = 'coordenador_cidade'
      and pr.city_id = p_city_id
      and pr.valid_from <= current_date
      and (pr.valid_until is null or pr.valid_until >= current_date)
  );
$$;

revoke all on function public.is_city_coordinator_for(uuid) from public, anon, authenticated;
grant execute on function public.is_city_coordinator_for(uuid) to authenticated;

create or replace function public.is_axis_coordinator_for(p_axis_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = auth.uid()
      and r.code = 'coordenador_eixo'
      and pr.axis_id = p_axis_id
      and pr.valid_from <= current_date
      and (pr.valid_until is null or pr.valid_until >= current_date)
  );
$$;

revoke all on function public.is_axis_coordinator_for(uuid) from public, anon, authenticated;
grant execute on function public.is_axis_coordinator_for(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- decide_approval(): transição de status controlada, chamável por
-- coordenadores (que não têm papel administrador/rh, então não podem
-- chamar log_audit_event() diretamente — esta função grava auditoria ela
-- mesma, via insert direto, sendo SECURITY DEFINER).
-- -----------------------------------------------------------------------------
create or replace function public.decide_approval(
  p_person_id uuid,
  p_decision text,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person record;
  v_assignment record;
  v_new_status text;
  v_authorized boolean := false;
begin
  if p_decision not in ('aprovar', 'rejeitar') then
    raise exception 'decisão inválida: %', p_decision;
  end if;

  select * into v_person from public.people where id = p_person_id;
  if not found then
    raise exception 'pessoa não encontrada';
  end if;

  select * into v_assignment from public.organizational_assignments
    where person_id = p_person_id and status = 'vigente'
    order by created_at desc
    limit 1;

  if v_person.status = 'pendente_validacao_cidade' then
    v_authorized := public.is_platform_admin() or public.is_admin()
      or (v_assignment.city_id is not null and public.is_city_coordinator_for(v_assignment.city_id));
    v_new_status := case when p_decision = 'aprovar' then 'pendente_validacao_eixo' else 'rejeitado' end;
  elsif v_person.status = 'pendente_validacao_eixo' then
    v_authorized := public.is_platform_admin() or public.is_admin()
      or (v_assignment.axis_id is not null and public.is_axis_coordinator_for(v_assignment.axis_id));
    v_new_status := case when p_decision = 'aprovar' then 'aprovado' else 'rejeitado' end;
  else
    raise exception 'pessoa não está aguardando aprovação (status atual: %)', v_person.status;
  end if;

  if not v_authorized then
    raise exception 'não autorizado a decidir esta aprovação';
  end if;

  update public.people
    set status = v_new_status, updated_by = auth.uid()
    where id = p_person_id;

  if p_decision = 'rejeitar' and v_assignment.id is not null then
    update public.organizational_assignments
      set status = 'encerrado', valid_until = current_date
      where id = v_assignment.id;
  end if;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, campaign_id
  ) values (
    auth.uid(),
    'pessoa.aprovacao.' || p_decision,
    'people',
    p_person_id,
    jsonb_build_object('status', v_person.status),
    jsonb_build_object('status', v_new_status),
    p_reason,
    v_person.campaign_id
  );
end;
$$;

revoke all on function public.decide_approval(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_approval(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Trigger de integridade: axis_id/city_id/team_id referenciados precisam
-- pertencer à mesma campaign_id da linha. Fecha uma brecha existente desde
-- a 0005 (nada impedia até agora referenciar uma cidade/eixo de outra
-- campanha). Função de uso interno (trigger) — nunca chamável via RPC
-- (revoke completo, mesmo padrão de set_updated_at()/handle_new_user()
-- endurecidas na 0002); revogar não quebra o disparo do trigger.
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
  end if;
  return new;
end;
$$;

revoke all on function public.check_same_campaign() from public, anon, authenticated;

create trigger cities_check_same_campaign
  before insert or update on public.cities
  for each row execute function public.check_same_campaign();

create trigger teams_check_same_campaign
  before insert or update on public.teams
  for each row execute function public.check_same_campaign();

create trigger organizational_assignments_check_same_campaign
  before insert or update on public.organizational_assignments
  for each row execute function public.check_same_campaign();

-- -----------------------------------------------------------------------------
-- Reescrever people_select: coordenador de cidade/eixo vê pessoas na fila
-- da sua etapa, escopadas ao seu território.
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
  );

-- -----------------------------------------------------------------------------
-- Reescrever organizational_assignments_select: mesmo bypass de
-- coordenador (vê os vínculos do próprio território, sem exigir status
-- específico da pessoa).
-- -----------------------------------------------------------------------------
drop policy organizational_assignments_select on public.organizational_assignments;
create policy organizational_assignments_select on public.organizational_assignments for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or (campaign_id = (select public.current_campaign_id()) and city_id is not null and public.is_city_coordinator_for(city_id))
    or (campaign_id = (select public.current_campaign_id()) and axis_id is not null and public.is_axis_coordinator_for(axis_id))
  );
