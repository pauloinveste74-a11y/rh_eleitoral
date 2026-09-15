-- =============================================================================
-- Etapa 5 — validação do RH (aprovado_gestor -> validado)
-- =============================================================================
-- Fecha o segundo e último elo da cadeia de validação do autocadastro.
-- Diferente de decide_registration_submission() (0023, Etapa 4), aqui a
-- autorização é só administrador/rh — não existe "gestor pessoa física"
-- nesta etapa, é uma checagem organizacional final. Mesmo idioma de
-- decide_approval()/decide_registration_submission(): SECURITY DEFINER,
-- autoriza e audita ela mesma; sem alterar nenhuma policy de RLS
-- (registration_submissions_select já libera leitura pra administrador/rh
-- de toda a campanha desde a 0016).
--
-- Simplificação deliberada desta etapa: trata 'aprovado_gestor' como o
-- próprio estado "aguardando RH" (a fila que a tela consulta), em vez de
-- introduzir uma transição intermediária pra 'aguardando_rh' sem nenhum
-- processo real entre as duas — o enum já tem esse valor reservado (0013)
-- caso uma etapa futura precise de um passo automático entre gestor e RH
-- (ex.: checagem de documento por OCR), mas nada o usa ainda.
-- =============================================================================

create or replace function public.decide_rh_validation(
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
    values (p_submission_id, auth.uid(), array[]::text[], p_reason);
  end if;

  perform public.log_audit_event(
    p_action => 'cadastro.validacao_rh.' || p_decision,
    p_entity_table => 'registration_submissions',
    p_entity_id => p_submission_id,
    p_before_data => jsonb_build_object('status', 'aprovado_gestor'),
    p_after_data => jsonb_build_object('status', v_new_status),
    p_reason => p_reason
  );
end;
$$;

comment on function public.decide_rh_validation(uuid, text, text) is
  'Etapa 5 — administrador/rh valida (ou rejeita/pede correção) uma registration_submissions já aprovada pelo gestor (aprovado_gestor). Só administrador/rh decide aqui, ao contrário de decide_registration_submission (0023), que também aceita o gestor pessoa física.';

revoke all on function public.decide_rh_validation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_rh_validation(uuid, text, text) to authenticated;
