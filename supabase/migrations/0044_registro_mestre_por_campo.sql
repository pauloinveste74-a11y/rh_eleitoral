-- Registro mestre por campo — Etapa 1
-- (docs/VALIDACAO_DOCUMENTAL_MATRIZ.md, Caderno B, seção 14). Peça
-- central do caderno de validação documental/OCR/base mestra,
-- deixada por último de propósito nas duas matrizes anteriores por
-- ser a mais cara. Constrói só o núcleo (uma linha por campo por
-- pessoa, com situação/fonte/validador/histórico) pra 6 campos
-- (nome/cpf/data_nascimento/telefone/email/endereco) — não as outras
-- 18 tabelas da seção 39, já cobertas na prática por peças existentes
-- (checagem por IA, data_conflicts com severidade/dupla aprovação) ou
-- fora de escopo, como documentado nas duas matrizes anteriores.
--
-- Escrita: só backfill (todo mundo que já existe, status='informado')
-- + resolve_data_conflict() (o único write-path que já é "uma
-- correção decidida por humano"). savePerson()/importação continuam
-- gravando só people/satélites direto nesta etapa — ver "fora de
-- escopo" no plano.

-- -----------------------------------------------------------------------------
-- 1) master_field_values — linha "atual" por campo por pessoa.
-- -----------------------------------------------------------------------------
create table public.master_field_values (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  person_id uuid not null references public.people(id),
  field_name text not null check (field_name in ('nome', 'cpf', 'data_nascimento', 'telefone', 'email', 'endereco')),
  value text,
  status text not null default 'informado' check (status in (
    'nao_informado', 'informado', 'importado', 'extraido', 'compativel',
    'complementar', 'divergente', 'pendente', 'validado', 'rejeitado',
    'desatualizado', 'bloqueado'
  )),
  source text not null default 'cadastro' check (source in (
    'cadastro', 'autocadastro', 'administrativo', 'importacao_excel', 'importacao_pdf', 'documento_ocr'
  )),
  source_document_id uuid references public.person_documents(id),
  informed_by uuid references auth.users(id),
  validated_by uuid references auth.users(id),
  validated_at timestamptz,
  valid_until date,
  open_conflict_id uuid references public.data_conflicts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, field_name)
);

comment on table public.master_field_values is 'Registro mestre por campo (caderno de validação documental, seção 14) — valor + situação + fonte + validação, independente da coluna simples em people/person_addresses. Só set_master_field_value() escreve.';

create index master_field_values_campaign_id_idx on public.master_field_values (campaign_id);
create index master_field_values_person_id_idx on public.master_field_values (person_id);

alter table public.master_field_values enable row level security;

create policy master_field_values_select on public.master_field_values for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

-- -----------------------------------------------------------------------------
-- 2) master_field_history — cada mudança de valor/situação, append-only.
-- -----------------------------------------------------------------------------
create table public.master_field_history (
  id uuid primary key default gen_random_uuid(),
  master_field_value_id uuid not null references public.master_field_values(id),
  campaign_id uuid not null,
  person_id uuid not null references public.people(id),
  field_name text not null,
  previous_value text,
  previous_status text,
  new_value text,
  new_status text not null,
  changed_by uuid references auth.users(id),
  change_reason text,
  created_at timestamptz not null default now()
);

comment on table public.master_field_history is 'Histórico append-only de master_field_values — uma linha por chamada de set_master_field_value().';

create index master_field_history_master_field_value_id_idx on public.master_field_history (master_field_value_id);
create index master_field_history_person_id_idx on public.master_field_history (person_id);

alter table public.master_field_history enable row level security;

create policy master_field_history_select on public.master_field_history for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

-- -----------------------------------------------------------------------------
-- 3) set_master_field_value() — único ponto de escrita (upsert + histórico).
-- -----------------------------------------------------------------------------
create or replace function public.set_master_field_value(
  p_person_id uuid,
  p_field_name text,
  p_value text,
  p_status text,
  p_source text,
  p_validated boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_authorized boolean;
  v_existing record;
  v_id uuid;
begin
  select campaign_id into v_campaign_id from public.people where id = p_person_id;
  if v_campaign_id is null then
    raise exception 'pessoa não encontrada';
  end if;

  v_authorized := public.is_platform_admin()
    or (v_campaign_id = public.current_campaign_id() and public.has_role(array['administrador', 'rh']));
  if not coalesce(v_authorized, false) then
    raise exception 'não autorizado a atualizar o registro mestre desta pessoa';
  end if;

  select * into v_existing from public.master_field_values
    where person_id = p_person_id and field_name = p_field_name;

  insert into public.master_field_values (
    campaign_id, person_id, field_name, value, status, source,
    informed_by, validated_by, validated_at
  ) values (
    v_campaign_id, p_person_id, p_field_name, p_value, p_status, p_source,
    (select auth.uid()),
    case when p_validated then (select auth.uid()) else null end,
    case when p_validated then now() else null end
  )
  on conflict (person_id, field_name) do update
    set value = excluded.value,
        status = excluded.status,
        source = excluded.source,
        validated_by = case when p_validated then (select auth.uid()) else v_existing.validated_by end,
        validated_at = case when p_validated then now() else v_existing.validated_at end,
        updated_at = now()
  returning id into v_id;

  insert into public.master_field_history (
    master_field_value_id, campaign_id, person_id, field_name,
    previous_value, previous_status, new_value, new_status, changed_by, change_reason
  ) values (
    v_id, v_campaign_id, p_person_id, p_field_name,
    v_existing.value, v_existing.status, p_value, p_status, (select auth.uid()),
    case when p_validated then 'validacao_manual' else 'atualizacao' end
  );

  return v_id;
end;
$$;

revoke all on function public.set_master_field_value(uuid, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.set_master_field_value(uuid, text, text, text, text, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 4) Backfill — toda people existente, status='informado', fonte='cadastro'.
-- -----------------------------------------------------------------------------
insert into public.master_field_values (campaign_id, person_id, field_name, value, status, source)
select campaign_id, id, 'nome', full_name, 'informado', 'cadastro' from public.people where full_name is not null
union all
select campaign_id, id, 'cpf', cpf, 'informado', 'cadastro' from public.people where cpf is not null
union all
select campaign_id, id, 'data_nascimento', birth_date::text, 'informado', 'cadastro' from public.people where birth_date is not null
union all
select campaign_id, id, 'telefone', phone, 'informado', 'cadastro' from public.people where phone is not null
union all
select campaign_id, id, 'email', email, 'informado', 'cadastro' from public.people where email is not null
union all
select p.campaign_id, p.id, 'endereco',
  concat_ws(', ', pa.street || coalesce(', ' || pa.number, ''), pa.neighborhood, pa.city || '/' || pa.state, 'CEP ' || pa.zip_code),
  'informado', 'cadastro'
from public.people p
join public.person_addresses pa on pa.person_id = p.id
on conflict (person_id, field_name) do nothing;

-- -----------------------------------------------------------------------------
-- 5) resolve_data_conflict() — a correção de nome que já aplica em people
--    passa a também alimentar o registro mestre (field_name='nome').
-- -----------------------------------------------------------------------------
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

    perform public.set_master_field_value(
      p_person_id := v_conflict.person_id,
      p_field_name := 'nome',
      p_value := p_corrected_name,
      p_status := 'validado',
      p_source := 'cadastro',
      p_validated := true
    );
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
