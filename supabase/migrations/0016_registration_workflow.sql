-- =============================================================================
-- Etapa 1 — parte 4: fluxo de conferência/validação (registration_submissions)
-- =============================================================================
-- people.status (estendido na 0013) guarda o estado RESUMIDO do cadastro.
-- Aqui fica o detalhe do fluxo: cada submissão, quais campos foram reabertos
-- para correção e por quê, e o pedido de correção em si (seção 7 da spec).
-- import_batch_id fica solto (sem FK) até a 0017 criar import_batches — a FK
-- é completada lá, pra manter a ordem de dependência das migrações.
-- =============================================================================

create table public.registration_submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  person_id uuid not null references public.people(id),
  invite_id uuid references public.registration_invites(id),
  import_batch_id uuid,
  origin text not null check (origin in ('autocadastro', 'administrativo', 'importacao_excel')),
  status text not null default 'rascunho' check (status in (
    'rascunho', 'em_preenchimento', 'documentos_pendentes', 'enviado',
    'aguardando_validacao_gestor', 'em_conferencia', 'correcao_solicitada',
    'reenviado', 'divergente', 'aprovado_gestor', 'aguardando_rh', 'validado',
    'rejeitado', 'suspenso', 'arquivado'
  )),
  submitted_at timestamptz,
  manager_person_id uuid references public.people(id),
  validated_at timestamptz,
  validated_by uuid references auth.users(id),
  rejection_reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.registration_submissions is 'Histórico de submissão/conferência de um cadastro (seção 3/7 da spec) — detalha o fluxo que people.status só resume.';

create index registration_submissions_campaign_id_idx on public.registration_submissions (campaign_id);
create index registration_submissions_person_id_idx on public.registration_submissions (person_id);
create index registration_submissions_status_idx on public.registration_submissions (status);

create trigger registration_submissions_set_updated_at
  before update on public.registration_submissions
  for each row execute function public.set_updated_at();

create table public.registration_field_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.registration_submissions(id),
  field_name text not null,
  status text not null check (status in ('ok', 'reaberto', 'pendente')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  note text
);

comment on table public.registration_field_reviews is 'Estado de revisão campo a campo de uma submissão — só os campos reabertos ficam editáveis pro contratado (seção 4.3/7.3 da spec).';

create index registration_field_reviews_submission_id_idx on public.registration_field_reviews (submission_id);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.registration_submissions(id),
  requested_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  field_names text[] not null,
  reason text not null,
  due_at date,
  resolved_at timestamptz,
  previous_values jsonb,
  new_values jsonb
);

comment on table public.correction_requests is 'Pedido de correção (seção 7.3 da spec) — preserva valor anterior/novo, não sobrescreve.';

create index correction_requests_submission_id_idx on public.correction_requests (submission_id);

-- -----------------------------------------------------------------------------
-- check_same_campaign(): estender para registration_submissions.
-- -----------------------------------------------------------------------------
create or replace function public.check_same_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_TABLE_NAME = 'cities' then
    if new.axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.axis_id) then
      raise exception 'axis_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'teams' then
    if new.city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.city_id) then
      raise exception 'city_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'organizational_assignments' then
    if new.axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.axis_id) then
      raise exception 'axis_id pertence a outra campanha';
    end if;
    if new.city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.city_id) then
      raise exception 'city_id pertence a outra campanha';
    end if;
    if new.team_id is not null and new.campaign_id <> (select campaign_id from public.teams where id = new.team_id) then
      raise exception 'team_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'payments' then
    if new.person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.person_id) then
      raise exception 'person_id pertence a outra campanha';
    end if;
    if new.batch_id is not null and new.campaign_id <> (select campaign_id from public.payment_batches where id = new.batch_id) then
      raise exception 'batch_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'expenses' then
    if new.person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.person_id) then
      raise exception 'person_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'registration_invites' then
    if new.suggested_axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.suggested_axis_id) then
      raise exception 'suggested_axis_id pertence a outra campanha';
    end if;
    if new.suggested_city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.suggested_city_id) then
      raise exception 'suggested_city_id pertence a outra campanha';
    end if;
    if new.suggested_team_id is not null and new.campaign_id <> (select campaign_id from public.teams where id = new.suggested_team_id) then
      raise exception 'suggested_team_id pertence a outra campanha';
    end if;
    if new.suggested_coordinator_person_id is not null
       and new.campaign_id <> (select campaign_id from public.people where id = new.suggested_coordinator_person_id) then
      raise exception 'suggested_coordinator_person_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'coordination_relationships' then
    if new.subordinate_person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.subordinate_person_id) then
      raise exception 'subordinate_person_id pertence a outra campanha';
    end if;
    if new.coordinator_person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.coordinator_person_id) then
      raise exception 'coordinator_person_id pertence a outra campanha';
    end if;
    if new.axis_id is not null and new.campaign_id <> (select campaign_id from public.axes where id = new.axis_id) then
      raise exception 'axis_id pertence a outra campanha';
    end if;
    if new.city_id is not null and new.campaign_id <> (select campaign_id from public.cities where id = new.city_id) then
      raise exception 'city_id pertence a outra campanha';
    end if;
    if new.team_id is not null and new.campaign_id <> (select campaign_id from public.teams where id = new.team_id) then
      raise exception 'team_id pertence a outra campanha';
    end if;
  elsif TG_TABLE_NAME = 'registration_submissions' then
    if new.person_id is not null and new.campaign_id <> (select campaign_id from public.people where id = new.person_id) then
      raise exception 'person_id pertence a outra campanha';
    end if;
  end if;
  return new;
end;
$$;

create trigger registration_submissions_check_same_campaign
  before insert or update on public.registration_submissions
  for each row execute function public.check_same_campaign();

alter table public.registration_submissions enable row level security;
alter table public.registration_field_reviews enable row level security;
alter table public.correction_requests enable row level security;

-- Mesma ressalva das 0014/0015: acesso do contratado/coordenador fica pra
-- quando o mecanismo de autenticação deles existir (Etapa 2/3).
create policy registration_submissions_select on public.registration_submissions for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy registration_submissions_insert on public.registration_submissions for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy registration_submissions_update on public.registration_submissions for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy registration_field_reviews_select on public.registration_field_reviews for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = registration_field_reviews.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy registration_field_reviews_insert on public.registration_field_reviews for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = registration_field_reviews.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy registration_field_reviews_update on public.registration_field_reviews for update to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = registration_field_reviews.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = registration_field_reviews.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy correction_requests_select on public.correction_requests for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = correction_requests.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy correction_requests_insert on public.correction_requests for insert to authenticated
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = correction_requests.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );

create policy correction_requests_update on public.correction_requests for update to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = correction_requests.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.registration_submissions rs
      where rs.id = correction_requests.submission_id
        and rs.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'rh'])
    )
  );
