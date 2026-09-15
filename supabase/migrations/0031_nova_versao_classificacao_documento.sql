-- =============================================================================
-- Nova versão (docs/NOVA_VERSAO_RH_ELEITORAL.md) — Etapa 4: classificação de
-- documento pelo gestor (spec seção 10), fecha o que a Etapa 3 (migração
-- 0030) deixou pendente — o gestor já consegue VER o documento da equipe
-- desde a 0030, agora ganha a função pra decidir sobre ele.
--
-- decide_person_document(): mesmo padrão de decide_registration_submission()
-- (migração 0016/0023) — autoriza administrador/rh OU o coordenador direto
-- da pessoa (via coordination_relationships vigente), grava a decisão e
-- audita com insert direto em audit_logs (não usa log_audit_event(), que
-- rejeitaria o coordenador comum — mesma razão de decide_registration_submission
-- nunca ter usado log_audit_event() também).
-- =============================================================================

create or replace function public.decide_person_document(
  p_document_id uuid,
  p_review_status text,
  p_rejection_reason text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document record;
  v_manager_person_id uuid;
  v_authorized boolean;
begin
  if p_review_status not in ('aprovado', 'ilegivel', 'divergente') then
    raise exception 'classificação inválida: %', p_review_status;
  end if;

  select * into v_document from public.person_documents where id = p_document_id;
  if not found then
    raise exception 'documento não encontrado';
  end if;

  if v_document.status <> 'ativo' then
    raise exception 'este documento não está mais ativo';
  end if;

  if p_review_status in ('ilegivel', 'divergente') and (p_rejection_reason is null or btrim(p_rejection_reason) = '') then
    raise exception 'informe o motivo da classificação';
  end if;

  select person_id into v_manager_person_id from public.profiles where id = (select auth.uid());

  v_authorized := public.is_platform_admin()
    or (v_document.campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_manager_person_id is not null and exists (
      select 1 from public.coordination_relationships
      where coordinator_person_id = v_manager_person_id
        and subordinate_person_id = v_document.person_id
        and status = 'vigente'
    ));
  v_authorized := coalesce(v_authorized, false);
  if not v_authorized then
    raise exception 'não autorizado a classificar este documento';
  end if;

  update public.person_documents
    set review_status = p_review_status,
        reviewed_by = (select auth.uid()),
        reviewed_at = now(),
        rejection_reason = case when p_review_status = 'aprovado' then null else p_rejection_reason end
    where id = p_document_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, campaign_id
  ) values (
    (select auth.uid()),
    'pessoa.documento.classificar.' || p_review_status,
    'person_documents',
    p_document_id,
    jsonb_build_object('review_status', v_document.review_status),
    jsonb_build_object('review_status', p_review_status),
    p_rejection_reason,
    v_document.campaign_id
  );
end;
$$;

revoke all on function public.decide_person_document(uuid, text, text) from public, anon;
grant execute on function public.decide_person_document(uuid, text, text) to authenticated;
