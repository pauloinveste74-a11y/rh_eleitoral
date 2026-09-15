-- IA (Claude) para checagem de dados — Etapa A: divergência de dado
-- (nome diferente pro mesmo CPF) + checagem de documento sob demanda.
--
-- data_conflicts já existia desde a migração 0018, com conflict_type,
-- details jsonb e fluxo pendente/em_analise/resolvido/descartado —
-- nunca usada por nenhum código até agora (confirmado por grep). O
-- comentário da migração 0034 (importação por PDF) já apontava pra
-- ela como o destino natural da "comparação com cadastro existente".
--
-- Reaproveitada quase como está: só ganha um conflict_type novo
-- ('documento_divergente', pra achados da IA — 'dado_divergente' já
-- cobre o caso determinístico de nome divergente no import) e due_at
-- (prazo de resolução — mesma ideia de correction_requests.due_at,
-- que existe há várias migrações mas nunca foi de fato usada por
-- nenhum código; aqui é usada desde o início, pela Etapa B).

alter table public.data_conflicts drop constraint data_conflicts_conflict_type_check;
alter table public.data_conflicts add constraint data_conflicts_conflict_type_check
  check (conflict_type = any (array[
    'pix_divergente', 'coordenador_nao_identificado', 'cpf_duplicado',
    'titulo_duplicado', 'dado_divergente', 'autorizador_nao_identificado',
    'documento_divergente', 'pagamento_divergente_contrato'
  ]));

alter table public.data_conflicts add column due_at date;
comment on column public.data_conflicts.due_at is 'Prazo pra resolver (opcional) — usado pela conciliação financeira (Etapa B); divergência de cadastro (Etapa A) não define prazo.';

-- Resolve um conflito: aplica (ou não) a correção sugerida em people.full_name.
-- Nunca mexe em CPF/dados bancários por aqui — só nome, e só quando o
-- administrador confirma explicitamente (p_apply_correction), mesma
-- cautela da spec 9.2 sobre nunca sobrescrever campo sensível sem
-- confirmação humana.
create or replace function public.resolve_data_conflict(
  p_conflict_id uuid,
  p_resolution text,
  p_note text default null,
  p_apply_correction boolean default false,
  p_corrected_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict record;
  v_authorized boolean;
begin
  if p_resolution not in ('aceitar_novo', 'manter_existente', 'descartado', 'ajustar_contrato', 'estornar_pagamento') then
    raise exception 'resolução inválida: %', p_resolution;
  end if;

  select * into v_conflict from public.data_conflicts where id = p_conflict_id;
  if v_conflict is null then
    raise exception 'conflito não encontrado';
  end if;
  if v_conflict.status not in ('pendente', 'em_analise') then
    raise exception 'conflito já foi resolvido ou descartado';
  end if;

  v_authorized := public.is_platform_admin() or (
    v_conflict.campaign_id = public.current_campaign_id()
    and public.has_role(array['administrador', 'rh'])
  );
  if not coalesce(v_authorized, false) then
    raise exception 'sem permissão para resolver esta divergência';
  end if;

  if p_apply_correction and p_corrected_name is not null and v_conflict.person_id is not null then
    update public.people set full_name = p_corrected_name where id = v_conflict.person_id;
  end if;

  update public.data_conflicts
  set status = case when p_resolution = 'descartado' then 'descartado' else 'resolvido' end,
      resolved_by = auth.uid(),
      resolved_at = now(),
      resolution_note = p_note
  where id = p_conflict_id;

  perform public.log_audit_event(
    p_action := 'divergencia.resolver',
    p_entity_table := 'data_conflicts',
    p_entity_id := p_conflict_id,
    p_after_data := jsonb_build_object('resolution', p_resolution, 'apply_correction', p_apply_correction)
  );
end;
$$;

revoke all on function public.resolve_data_conflict(uuid, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.resolve_data_conflict(uuid, text, text, boolean, text) to authenticated;
