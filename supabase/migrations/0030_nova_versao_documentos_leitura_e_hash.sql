-- =============================================================================
-- Nova versão (docs/NOVA_VERSAO_RH_ELEITORAL.md) — Etapa 3: dois problemas
-- achados ao investigar o schema ocioso de documento (seções 8 e 10 da spec).
--
-- 1) BUG DE PRODUÇÃO (não é feature nova, é correção): `person_documents_select`
--    e a policy de Storage `pessoas_documentos_select` nunca tinham sido
--    estendidas pra "a própria pessoa" ou "o gestor da pessoa" — só
--    administrador/rh/auditor liam. Isso significa que, hoje, o coordenador
--    que sobe o próprio documento em /meu-cadastro (a policy de INSERT já
--    permitia isso desde a Etapa 2) NUNCA CONSEGUE VER NEM BAIXAR o que
--    acabou de subir — a lista em /meu-cadastro sempre voltava vazia e
--    `getPersonDocumentSignedUrl()` sempre falhava pra esse usuário. Passou
--    despercebido porque todo teste desta sessão usou a conta
--    platform_admin (bypassa toda RLS). Mesmo padrão de extensão já usado
--    em people_select/registration_submissions_select/correction_requests_select
--    (Etapas 2/11 da iniciativa anterior).
--
-- 2) BUG DE PRODUÇÃO (idem): `uploadPersonDocument()` chama
--    `log_audit_event()` sem checar o papel do chamador antes — e
--    `log_audit_event()` faz `raise exception` pra quem não é
--    administrador/rh. Um coordenador comum (só `coordenador_cidade`/
--    `coordenador_eixo`/`coordenador_equipe`, sem admin/rh) que sobe o
--    próprio documento em /meu-cadastro hoje recebe erro do servidor DEPOIS
--    do arquivo já ter sido gravado (o insert em person_documents já tinha
--    sido commitado antes da chamada de auditoria falhar) — mesma classe de
--    bug do padrão "checar has_role antes de log_audit_event()" já usado em
--    complete_own_registration()/create_team_invite() etc., só que aqui
--    ninguém tinha aplicado o padrão porque o upload nunca passou por uma
--    função SECURITY DEFINER própria.
--
-- Correção: nova função record_person_document() unifica a escrita (insert
-- em person_documents), aplica o mesmo padrão de auditoria condicional das
-- outras funções desta iniciativa, e de brinde resolve dois itens da spec
-- que já tinham coluna pronta desde a migração 0019, nunca usada por
-- nenhum código:
--   - hash do arquivo (spec seção 8) — detecta e rejeita duplicata exata
--     (mesmo person_id + mesmo file_hash + status 'ativo').
--   - versionamento (spec seção 8) — se a pessoa reenvia um documento do
--     MESMO tipo que tinha sido classificado 'ilegivel'/'divergente' pelo
--     gestor, a nova linha vira substituta (`replaces_document_id`) e a
--     antiga é marcada 'removido' (superada), preservando o histórico.
--
-- A classificação em si pelo gestor (aprovar/ilegível/divergente — spec
-- seção 10) e a tela que a usa ficam para a próxima etapa (documentado no
-- README) — aqui só a leitura+hash+versionamento, que já são pré-requisito
-- dela (o gestor não pode classificar o que não consegue ver).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) RLS de leitura — tabela e Storage.
-- -----------------------------------------------------------------------------
drop policy if exists person_documents_select on public.person_documents;
create policy person_documents_select on public.person_documents for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or (person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid())))
    or (person_id in (
      select coordination_relationships.subordinate_person_id
      from public.coordination_relationships
      where coordination_relationships.coordinator_person_id = (select profiles.person_id from public.profiles where profiles.id = (select auth.uid()))
        and coordination_relationships.status = 'vigente'
    ))
  );

drop policy if exists pessoas_documentos_select on storage.objects;
create policy pessoas_documentos_select on storage.objects for select to authenticated
  using (
    bucket_id = 'pessoas-documentos'
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
-- 2) record_person_document(): grava o documento (hash + dedup + versionamento
--    + auditoria condicional) para quem já tem permissão de INSERT hoje
--    (mesma checagem de person_documents_insert — administrador/rh, ou a
--    própria pessoa). O upload do arquivo em si continua acontecendo antes,
--    via Storage API + RLS do bucket (mesmo padrão de create_expense()).
-- -----------------------------------------------------------------------------
create or replace function public.record_person_document(
  p_person_id uuid,
  p_document_type text,
  p_storage_path text,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint,
  p_file_hash text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_own_person_id uuid;
  v_campaign_id uuid;
  v_authorized boolean;
  v_origin text;
  v_existing_id uuid;
  v_superseded_id uuid;
  v_id uuid;
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
$$;

revoke all on function public.record_person_document(uuid, text, text, text, text, bigint, text) from public, anon;
grant execute on function public.record_person_document(uuid, text, text, text, text, bigint, text) to authenticated;
