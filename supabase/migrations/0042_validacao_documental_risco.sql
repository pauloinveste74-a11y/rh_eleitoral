-- Validação documental/OCR/base mestra — Etapa 1 (docs/VALIDACAO_
-- DOCUMENTAL_MATRIZ.md): fecha os três pontos que o próprio caderno
-- chama de mais críticos (seção 24.1) — risco não classificado,
-- nenhuma dupla aprovação pra CPF, duplicidade de documento só
-- checada dentro da mesma pessoa — construindo em cima do que já
-- existe (data_conflicts, record_person_document(),
-- resolve_data_conflict(), todos da iniciativa "IA para checagem de
-- dados").

alter table public.data_conflicts
  add column severity text not null default 'medio' check (severity in ('critico', 'alto', 'medio', 'baixo')),
  add column requires_dual_approval boolean not null default false,
  add column first_approved_by uuid references auth.users(id);

comment on column public.data_conflicts.severity is 'Risco (caderno de validação documental, seção 24) — usado pra ordenar /divergencias.';
comment on column public.data_conflicts.requires_dual_approval is 'Exige duas pessoas diferentes pra aprovar (seção 25 — CPF/banco/PIX/mesclagem) — resolve_data_conflict() aplica.';

create index data_conflicts_severity_idx on public.data_conflicts (severity);

-- Duplicidade de documento ENTRE pessoas diferentes (seção 29) — o
-- hash duplicado na MESMA pessoa já era rejeitado desde a 0030; isto
-- é o caso novo: mesmo arquivo em pessoas distintas, sinal de reuso
-- indevido. Não bloqueia o upload (seção 30: "nunca classificar
-- automaticamente como fraude") — só registra e abre uma divergência.
create table public.duplicate_document_matches (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  file_hash text not null,
  person_document_id uuid not null references public.person_documents(id),
  matched_person_document_id uuid not null references public.person_documents(id),
  created_at timestamptz not null default now()
);

create index duplicate_document_matches_campaign_id_idx on public.duplicate_document_matches (campaign_id);
create index duplicate_document_matches_file_hash_idx on public.duplicate_document_matches (file_hash);

alter table public.duplicate_document_matches enable row level security;

create policy duplicate_document_matches_select on public.duplicate_document_matches for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

-- Sem policy de insert direta — só record_person_document() (SECURITY
-- DEFINER) escreve aqui, mesmo padrão de data_conflicts na Etapa A.

-- record_person_document(): soma a checagem de duplicidade entre
-- pessoas diferentes, depois de gravar o documento novo.
create or replace function public.record_person_document(p_person_id uuid, p_document_type text, p_storage_path text, p_file_name text, p_mime_type text, p_file_size_bytes bigint, p_file_hash text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_own_person_id uuid;
  v_campaign_id uuid;
  v_authorized boolean;
  v_origin text;
  v_existing_id uuid;
  v_superseded_id uuid;
  v_id uuid;
  v_other_doc record;
begin
  select person_id into v_own_person_id from public.profiles where id = (select auth.uid());

  select campaign_id into v_campaign_id from public.people where id = p_person_id;
  if v_campaign_id is null then
    raise exception 'pessoa não encontrada';
  end if;

  v_authorized := public.is_platform_admin()
    or (v_campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']))
    or (v_own_person_id is not null and v_own_person_id = p_person_id);
  v_authorized := coalesce(v_authorized, false);
  if not v_authorized then
    raise exception 'não autorizado a anexar documento para esta pessoa';
  end if;

  v_origin := case when v_own_person_id is not null and v_own_person_id = p_person_id then 'autocadastro' else 'administrativo' end;

  -- Duplicata exata: mesmo arquivo (mesmo hash) já ativo pra essa pessoa.
  if p_file_hash is not null then
    select id into v_existing_id
      from public.person_documents
      where person_id = p_person_id and file_hash = p_file_hash and status = 'ativo'
      limit 1;
    if v_existing_id is not null then
      raise exception 'este arquivo já foi enviado (documento duplicado)';
    end if;
  end if;

  -- Versionamento: reenvio do mesmo tipo de documento depois de classificação
  -- 'ilegivel'/'divergente' vira substituto; o antigo é superado.
  select id into v_superseded_id
    from public.person_documents
    where person_id = p_person_id
      and document_type = p_document_type
      and status = 'ativo'
      and review_status in ('ilegivel', 'divergente')
    order by created_at desc
    limit 1;

  insert into public.person_documents (
    person_id, campaign_id, document_type, storage_path, file_name, mime_type,
    file_size_bytes, uploaded_by, file_hash, origin, review_status, replaces_document_id
  ) values (
    p_person_id, v_campaign_id, p_document_type, p_storage_path, p_file_name, p_mime_type,
    p_file_size_bytes, auth.uid(), p_file_hash, v_origin, 'pendente', v_superseded_id
  )
  returning id into v_id;

  if v_superseded_id is not null then
    update public.person_documents set status = 'removido', updated_at = now() where id = v_superseded_id;
  end if;

  -- Duplicidade ENTRE pessoas diferentes (validação documental, seção
  -- 29/30) — mesmo hash já ativo em outra pessoa da campanha. Não
  -- bloqueia o upload, só registra e abre uma divergência crítica pra
  -- alguém olhar.
  if p_file_hash is not null then
    for v_other_doc in
      select id, person_id from public.person_documents
      where file_hash = p_file_hash and status = 'ativo' and person_id <> p_person_id and campaign_id = v_campaign_id
    loop
      insert into public.duplicate_document_matches (campaign_id, file_hash, person_document_id, matched_person_document_id)
      values (v_campaign_id, p_file_hash, v_id, v_other_doc.id);

      insert into public.data_conflicts (campaign_id, person_id, conflict_type, severity, details)
      values (
        v_campaign_id, p_person_id, 'documento_divergente', 'critico',
        jsonb_build_object(
          'motivo', 'mesmo_arquivo_pessoas_diferentes',
          'person_id_novo', p_person_id,
          'person_id_existente', v_other_doc.person_id,
          'document_id_novo', v_id,
          'document_id_existente', v_other_doc.id
        )
      );
    end loop;
  end if;

  if public.has_role(array['administrador', 'rh']) then
    perform public.log_audit_event(
      'pessoa.documento.anexar', 'person_documents', v_id,
      null, jsonb_build_object('person_id', p_person_id, 'document_type', p_document_type, 'file_name', p_file_name)
    );
  else
    insert into public.audit_logs (actor_user_id, action, entity_table, entity_id, after_data, campaign_id)
    values ((select auth.uid()), 'pessoa.documento.anexar', 'person_documents', v_id,
      jsonb_build_object('person_id', p_person_id, 'document_type', p_document_type, 'file_name', p_file_name), v_campaign_id);
  end if;

  return v_id;
end;
$function$;

-- resolve_data_conflict(): dupla aprovação pra CPF/nome divergente
-- (seção 25) — primeira chamada só registra first_approved_by, sem
-- aplicar nem fechar; segunda chamada precisa ser de outra pessoa.
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
  v_needs_dual boolean;
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

  v_needs_dual := v_conflict.requires_dual_approval
    or v_conflict.conflict_type in ('cpf_duplicado', 'dado_divergente');

  if v_needs_dual and p_resolution in ('aceitar_novo', 'ajustar_contrato', 'estornar_pagamento') then
    if v_conflict.first_approved_by is null then
      update public.data_conflicts
      set first_approved_by = auth.uid(),
          requires_dual_approval = true,
          status = 'em_analise'
      where id = p_conflict_id;

      perform public.log_audit_event(
        p_action := 'divergencia.primeira_aprovacao',
        p_entity_table := 'data_conflicts',
        p_entity_id := p_conflict_id,
        p_after_data := jsonb_build_object('resolution', p_resolution)
      );
      return;
    end if;

    if v_conflict.first_approved_by = auth.uid() then
      raise exception 'a segunda aprovação precisa ser de uma pessoa diferente da primeira';
    end if;
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
