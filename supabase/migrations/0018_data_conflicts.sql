-- =============================================================================
-- Etapa 1 — parte 6: central de pendências (data_conflicts)
-- =============================================================================
-- Materializa "coordenador não identificado" (seção 5.6) e divergência de
-- PIX (seção 5.5), entre outras — nenhuma das duas precisa de coluna extra
-- em people/person_bank_accounts, ficam só como registro aqui.
-- =============================================================================

create table public.data_conflicts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  person_id uuid references public.people(id),
  submission_id uuid references public.registration_submissions(id),
  staging_record_id uuid references public.import_staging_records(id),
  conflict_type text not null check (conflict_type in (
    'pix_divergente', 'coordenador_nao_identificado', 'cpf_duplicado',
    'titulo_duplicado', 'dado_divergente', 'autorizador_nao_identificado'
  )),
  details jsonb not null,
  status text not null default 'pendente' check (status in ('pendente', 'em_analise', 'resolvido', 'descartado')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

comment on table public.data_conflicts is 'Central de pendências (seção 16 da spec) — PIX divergente, coordenador não identificado, autorizador não identificado, etc.';

create index data_conflicts_campaign_id_idx on public.data_conflicts (campaign_id);
create index data_conflicts_status_idx on public.data_conflicts (status);
create index data_conflicts_conflict_type_idx on public.data_conflicts (conflict_type);
create index data_conflicts_person_id_idx on public.data_conflicts (person_id);

alter table public.data_conflicts enable row level security;

create policy data_conflicts_select on public.data_conflicts for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy data_conflicts_insert on public.data_conflicts for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy data_conflicts_update on public.data_conflicts for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );
