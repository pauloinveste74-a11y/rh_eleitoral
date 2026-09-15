-- =============================================================================
-- Planilha real do usuário: endereço em campo único, equipe/sub-equipe,
-- liderança/indicação/tipo de contratação
-- =============================================================================
-- Contexto: ao ver os cabeçalhos reais da planilha (import multi-aba), vários
-- não tinham onde gravar ou exigiam uma estrutura que a planilha não usa.
-- Decisões confirmadas com o usuário:
--   - Endereço vem como texto único ("Endereço Completo"), não dividido em
--     rua/bairro/cidade/UF — a regra atual (todos obrigatórios se a seção
--     estiver presente) vira "rua+bairro+cidade+UF OU endereço completo".
--   - Liderança/indicação/tipo de contratação: mesmo nível de acesso das
--     demais tabelas satélite (administrador/rh escrevem, auditor lê) — sem
--     camada extra de restrição, decisão explícita do usuário.
--   - Equipe: tabela `teams` já existe (Fase 1A) e nunca tinha sido ligada a
--     `organizational_assignments` via import.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) person_addresses: aceitar endereço em texto único, sem exigir os campos
--    separados. street/neighborhood/city/state deixam de ser NOT NULL — a
--    obrigatoriedade de "um conjunto completo ou o outro" passa a ser
--    responsabilidade do schema Zod (addressSchema), não mais do banco.
-- -----------------------------------------------------------------------------
alter table public.person_addresses
  alter column street drop not null,
  alter column neighborhood drop not null,
  alter column city drop not null,
  alter column state drop not null,
  add column full_address text;

comment on column public.person_addresses.full_address is 'Endereço em texto único, quando a fonte (ex.: planilha de importação) não separa rua/bairro/cidade/UF. Convive com os campos separados — nunca os dois vazios ao mesmo tempo (garantido pelo schema Zod, não pelo banco).';

-- -----------------------------------------------------------------------------
-- 2) person_engagement_data (1:1) — liderança/indicação/tipo de contratação.
--    Mesmo padrão de RLS das demais satélites (administrador/rh escrevem,
--    auditor só lê) — decisão explícita do usuário, sem camada extra.
-- -----------------------------------------------------------------------------
create table public.person_engagement_data (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people(id),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  leadership_note text,
  referral_name text,
  contracting_type_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.person_engagement_data is 'Liderança comunitária, indicação/referência e tipo de contratação — campos vindos da planilha real de importação, sem tabela própria até então. Mesmo nível de acesso das demais satélites de pessoa.';

create trigger person_engagement_data_set_updated_at
  before update on public.person_engagement_data
  for each row execute function public.set_updated_at();

create index person_engagement_data_campaign_id_idx on public.person_engagement_data (campaign_id);
create index person_engagement_data_created_by_idx on public.person_engagement_data (created_by);
create index person_engagement_data_updated_by_idx on public.person_engagement_data (updated_by);

alter table public.person_engagement_data enable row level security;

create policy person_engagement_data_select on public.person_engagement_data for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));
create policy person_engagement_data_insert on public.person_engagement_data for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));
create policy person_engagement_data_update on public.person_engagement_data for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- Sem policy de delete, mesmo princípio das demais satélites (exclusão lógica).
