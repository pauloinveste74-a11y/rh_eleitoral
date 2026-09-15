-- =============================================================================
-- Etapa 10 — reversão de importação confirmada
-- =============================================================================
-- import_batches.status já previa 'revertido' desde a Etapa 1 (0017), mas
-- nada implementava a reversão de fato. Só é permitida se NENHUMA pessoa
-- do lote tiver "vínculo posterior" — checagem explícita antes de apagar
-- qualquer coisa: status além de rascunho, pagamento, despesa, vínculo
-- organizacional, cadeia de coordenação, submissão de cadastro, ou (caso
-- extremo) profile ligado à pessoa. Tudo ou nada: se qualquer pessoa do
-- lote estiver bloqueada, a função inteira falha sem apagar nada.
-- =============================================================================

create or replace function public.revert_import_batch(p_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch record;
  v_person_ids uuid[];
  v_blocked_count integer;
begin
  if not (public.is_platform_admin() or public.has_role(array['administrador', 'rh'])) then
    raise exception 'não autorizado a reverter importação';
  end if;

  select * into v_batch from public.import_batches where id = p_batch_id;
  if not found then
    raise exception 'lote não encontrado';
  end if;
  if not public.is_platform_admin() and v_batch.campaign_id <> public.current_campaign_id() then
    raise exception 'lote pertence a outra campanha';
  end if;
  if v_batch.status <> 'confirmado' then
    raise exception 'só é possível reverter um lote confirmado (status atual: %)', v_batch.status;
  end if;

  select array_agg(person_id) into v_person_ids
    from public.import_staging_records
    where batch_id = p_batch_id and result = 'importada' and person_id is not null;

  if v_person_ids is null or array_length(v_person_ids, 1) = 0 then
    raise exception 'nenhuma pessoa importada neste lote para reverter';
  end if;

  select count(*) into v_blocked_count
    from public.people p
    where p.id = any(v_person_ids)
      and (
        p.status <> 'rascunho'
        or exists (select 1 from public.payments pay where pay.person_id = p.id)
        or exists (select 1 from public.expenses e where e.person_id = p.id)
        or exists (select 1 from public.organizational_assignments oa where oa.person_id = p.id)
        or exists (
          select 1 from public.coordination_relationships cr
          where cr.subordinate_person_id = p.id or cr.coordinator_person_id = p.id
        )
        or exists (select 1 from public.registration_submissions rs where rs.person_id = p.id)
        or exists (select 1 from public.profiles pr where pr.person_id = p.id)
      );

  if v_blocked_count > 0 then
    raise exception '% pessoa(s) deste lote já têm vínculo posterior (status alterado, pagamento, despesa, aprovação, cadeia de coordenação ou login) — reversão bloqueada', v_blocked_count;
  end if;

  -- Precisa desvincular import_staging_records.person_id ANTES de apagar
  -- as people — a FK é RESTRICT, não CASCADE (erro real encontrado ao
  -- testar: "update or delete on table people violates foreign key
  -- constraint import_staging_records_person_id_fkey").
  update public.import_staging_records
    set result = 'pronta', person_id = null
    where batch_id = p_batch_id and person_id = any(v_person_ids);

  delete from public.person_documents where person_id = any(v_person_ids);
  delete from public.person_electoral_data where person_id = any(v_person_ids);
  delete from public.person_bank_accounts where person_id = any(v_person_ids);
  delete from public.person_addresses where person_id = any(v_person_ids);
  delete from public.people where id = any(v_person_ids);

  update public.import_batches
    set status = 'revertido', reverted_at = now(), reverted_by = auth.uid(), imported_rows = 0
    where id = p_batch_id;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id, after_data, campaign_id
  ) values (
    auth.uid(), 'importacao.reverter', 'import_batches', p_batch_id,
    jsonb_build_object('pessoas_removidas', array_length(v_person_ids, 1)),
    v_batch.campaign_id
  );
end;
$$;

comment on function public.revert_import_batch(uuid) is
  'Etapa 10 — reverte um lote de importação já confirmado (apaga as people criadas por ele) se nenhuma tiver vínculo posterior. Tudo ou nada.';

revoke all on function public.revert_import_batch(uuid) from public, anon, authenticated;
grant execute on function public.revert_import_batch(uuid) to authenticated;
