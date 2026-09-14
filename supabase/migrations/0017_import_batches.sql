-- =============================================================================
-- Etapa 1 — parte 5: importação em lote por Excel (import_batches)
-- =============================================================================
-- Nada é gravado em people a partir daqui NESTA etapa — staging existe pra
-- suportar prévia/correção antes de confirmar (seção 10.2 da spec). A função
-- que promove staging → people fica pra Etapa 4 (app layer da importação).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pessoas-importacoes', 'pessoas-importacoes', false, 15728640,
  array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do nothing;

create policy pessoas_importacoes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pessoas-importacoes'
    and (
      public.is_platform_admin()
      or (
        split_part(name, '/', 1) = (select public.current_campaign_id())::text
        and public.has_role(array['administrador', 'rh'])
      )
    )
  );

create policy pessoas_importacoes_select on storage.objects for select to authenticated
  using (
    bucket_id = 'pessoas-importacoes'
    and (
      public.is_platform_admin()
      or (
        split_part(name, '/', 1) = (select public.current_campaign_id())::text
        and public.has_role(array['administrador', 'rh'])
      )
    )
  );

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  template_version text not null,
  original_file_name text not null,
  storage_path text not null unique,
  file_hash text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  imported_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  rejected_rows integer not null default 0,
  pending_rows integer not null default 0,
  error_rows integer not null default 0,
  status text not null default 'staging' check (status in ('staging', 'preview', 'confirmado', 'revertido', 'cancelado')),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id),
  reverted_at timestamptz,
  reverted_by uuid references auth.users(id)
);

comment on table public.import_batches is 'Lote de importação de pessoas por Excel (seção 10 da spec). Reversão só é permitida se nenhum registro do lote já tiver vínculo posterior (checagem em Etapa 4, na função de reversão).';

create index import_batches_campaign_id_idx on public.import_batches (campaign_id);
create index import_batches_status_idx on public.import_batches (status);

create table public.import_staging_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id),
  row_number integer not null,
  raw_data jsonb not null,
  normalized_data jsonb,
  result text not null default 'pendente_decisao' check (result in (
    'pronta', 'importada', 'incompleta', 'invalida', 'duplicada_arquivo',
    'ja_existente', 'possivel_duplicidade', 'conflitante', 'pendente_decisao', 'rejeitada'
  )),
  person_id uuid references public.people(id),
  created_at timestamptz not null default now()
);

comment on table public.import_staging_records is 'Uma linha da planilha, antes de virar people — nada aqui é fonte oficial de dado (seção 2 da spec: "o aplicativo é a fonte única").';

create index import_staging_records_batch_id_idx on public.import_staging_records (batch_id);
create index import_staging_records_result_idx on public.import_staging_records (result);

create table public.import_row_errors (
  id uuid primary key default gen_random_uuid(),
  staging_record_id uuid not null references public.import_staging_records(id),
  field_name text,
  error_code text not null,
  error_message text not null
);

create index import_row_errors_staging_record_id_idx on public.import_row_errors (staging_record_id);

-- Completa a FK deixada solta em registration_submissions (0016) — precisava
-- que import_batches existisse primeiro.
alter table public.registration_submissions
  add constraint registration_submissions_import_batch_id_fkey
  foreign key (import_batch_id) references public.import_batches(id);

alter table public.import_batches enable row level security;
alter table public.import_staging_records enable row level security;
alter table public.import_row_errors enable row level security;

create policy import_batches_select on public.import_batches for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy import_batches_insert on public.import_batches for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy import_batches_update on public.import_batches for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy import_staging_records_select on public.import_staging_records for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.import_batches b
      where b.id = import_staging_records.batch_id
        and b.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy import_staging_records_insert on public.import_staging_records for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.import_batches b
      where b.id = import_staging_records.batch_id
        and b.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy import_staging_records_update on public.import_staging_records for update to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.import_batches b
      where b.id = import_staging_records.batch_id
        and b.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.import_batches b
      where b.id = import_staging_records.batch_id
        and b.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy import_row_errors_select on public.import_row_errors for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.import_staging_records r
      join public.import_batches b on b.id = r.batch_id
      where r.id = import_row_errors.staging_record_id
        and b.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy import_row_errors_insert on public.import_row_errors for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.import_staging_records r
      join public.import_batches b on b.id = r.batch_id
      where r.id = import_row_errors.staging_record_id
        and b.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );
