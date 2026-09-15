-- =============================================================================
-- Etapa 4 — fila de validação do gestor (aprovar / rejeitar / solicitar correção)
-- =============================================================================
-- Fecha o primeiro ciclo do autocadastro: coordenador/RH decide sobre uma
-- registration_submissions em 'aguardando_validacao_gestor'. Mesmo idioma de
-- decide_approval() (0006) — função SECURITY DEFINER que se autoriza sozinha
-- e audita ela mesma via insert direto (o gestor aqui é tipicamente um
-- coordenador sem papel administrador/rh, que não pode chamar
-- log_audit_event()). Nenhuma policy de RLS muda: a Etapa 2 já liberou
-- leitura da própria fila (registration_submissions_select,
-- manager_person_id = auth.uid()); toda escrita continua só por função.
--
-- Escopo desta etapa: aprovar/rejeitar/solicitar correção a partir de
-- 'aguardando_validacao_gestor'. O reenvio após correção já funciona com o
-- que a Etapa 2/3 construíram (people.status = 'correcao_solicitada' cai nos
-- EDITABLE_STATUSES de /meu-cadastro, que já permite editar e reenviar). A
-- revisão campo a campo (registration_field_reviews) e a etapa de validação
-- do RH (aprovado_gestor -> aguardando_rh -> validado) ficam para a etapa
-- seguinte.
-- =============================================================================

create or replace function public.decide_registration_submission(
  p_submission_id uuid,
  p_decision text,
  p_reason text default null
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

  -- Cuidado com NULL propagando pelo AND/OR: se o chamador não tem profile
  -- (ou profiles.person_id nulo), v_manager_person_id fica NULL, e
  -- "manager_person_id = NULL" avalia pra NULL (não false) — sem o guard
  -- "v_manager_person_id is not null" na frente, `v_authorized` vira NULL em
  -- vez de false, e "if not v_authorized" NUNCA dispara em PL/pgSQL (uma
  -- condição NULL é tratada como false pelo IF, não como "verdadeira o
  -- bastante pra barrar"). coalesce(...) no fim é defesa em profundidade.
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
    values (p_submission_id, auth.uid(), array[]::text[], p_reason);
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
    jsonb_build_object('status', v_new_status),
    p_reason,
    v_submission.campaign_id
  );
end;
$$;

comment on function public.decide_registration_submission(uuid, text, text) is
  'Etapa 4 — gestor (coordenador dono de manager_person_id, ou administrador/rh) decide uma registration_submissions em aguardando_validacao_gestor. Mesmo idioma de decide_approval() (0006): SECURITY DEFINER, autoriza e audita a si mesma.';

revoke all on function public.decide_registration_submission(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_registration_submission(uuid, text, text) to authenticated;
