-- =============================================================================
-- Nova versão (docs/NOVA_VERSAO_RH_ELEITORAL.md) — Etapa 1: cargos
-- configuráveis (job_functions) e pessoa jurídica (legal_entities)
-- =============================================================================
-- Escopo desta etapa (seções 4.1 e 5.1-PJ da spec): só o catálogo de
-- cargos por campanha e o cadastro-mestre de PJ, com RLS e tela de
-- configuração/listagem. NÃO inclui nesta etapa (fica pra depois,
-- documentado como pendência):
-- - ligar job_functions ao autocadastro (/meu-cadastro, /cadastro/[token])
--   ou ao cadastro administrativo de pessoa (/pessoas) — a spec pede
--   isso, mas é uma mudança maior, em várias telas já em produção;
-- - upload de documento societário/contrato pra legal_entities — reaproveita
--   o padrão de person_documents quando essa etapa vier;
-- - modelo de contrato padrão por cargo (job_functions.default_contract_template_id) —
--   contract_templates não existe ainda (seção 12 da spec), a coluna
--   entra só quando essa tabela existir, evitando uma FK apontando pro
--   nada;
-- - unificar PJ com o fluxo de aprovações/pagamentos/despesas de `people`.
--
-- Endereço e dados bancários de legal_entities ficam embutidos na própria
-- tabela (não em satélites como person_addresses/person_bank_accounts) —
-- simplificação deliberada: sem autocadastro de PJ ainda, um só registro
-- por CNPJ não pede a mesma normalização.
-- =============================================================================

create table public.job_functions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  name text not null,
  description text,
  category text,
  contract_type text not null default 'pf' check (contract_type in ('pf', 'pj')),
  workload_reference text,
  salary_range_min_cents bigint check (salary_range_min_cents > 0),
  salary_range_max_cents bigint check (salary_range_max_cents > 0),
  required_document_types text[] not null default array[]::text[],
  requires_coordinator boolean not null default true,
  suggested_role_codes text[] not null default array[]::text[],
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  display_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_range_max_cents is null or salary_range_min_cents is null or salary_range_max_cents >= salary_range_min_cents),
  unique (campaign_id, name)
);

comment on table public.job_functions is 'Cargo/função de trabalho configurável por campanha (spec seção 4.1) — distinto de roles (perfil de acesso). Alterar um cargo não muda vínculos/contratos já existentes (nada referencia esta tabela por FK ainda).';

create index job_functions_campaign_id_idx on public.job_functions (campaign_id);

create trigger job_functions_set_updated_at
  before update on public.job_functions
  for each row execute function public.set_updated_at();

alter table public.job_functions enable row level security;

-- Leitura liberada a qualquer authenticated da campanha — é um catálogo de
-- referência (mesmo espírito de `roles`/`expense_categories`), vai
-- precisar aparecer em seletor de formulário de autocadastro numa etapa
-- futura.
create policy job_functions_select on public.job_functions for select to authenticated
  using (
    public.is_platform_admin()
    or campaign_id = (select public.current_campaign_id())
  );

-- Escrita só administrador — mesmo padrão de axes/cities/teams (0005).
create policy job_functions_insert on public.job_functions for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

create policy job_functions_update on public.job_functions for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

create policy job_functions_delete on public.job_functions for delete to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

-- -----------------------------------------------------------------------------
-- legal_entities (pessoa jurídica) — cadastro-mestre de PJ, seção 5.1 da spec.
-- Mesmo padrão de unicidade escopada de people.cpf (Etapa 1 da iniciativa
-- anterior): CNPJ único por campanha só entre registros não arquivados.
-- -----------------------------------------------------------------------------
create table public.legal_entities (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  company_name text not null,
  trade_name text,
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  state_registration text,
  municipal_registration text,
  legal_representative_name text not null,
  legal_representative_cpf text not null check (legal_representative_cpf ~ '^[0-9]{11}$'),
  phone text,
  whatsapp text,
  email text,
  zip_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  bank_code text,
  bank_name text,
  agency text,
  agency_digit text,
  account_number text,
  account_digit text,
  account_type text check (account_type in ('corrente', 'poupanca')),
  pix_key_type text check (pix_key_type in ('cnpj', 'email', 'telefone', 'aleatoria')),
  pix_key text,
  service_description text,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativo', 'suspenso', 'arquivado')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.legal_entities is 'Cadastro-mestre de pessoa jurídica (spec seção 5.1-PJ) — endereço/banco embutidos (sem satélite), sem autocadastro/documentos/contrato ainda; ver cabeçalho da migração pra escopo completo desta etapa.';

create unique index legal_entities_cnpj_active_unique on public.legal_entities (campaign_id, cnpj)
  where status <> 'arquivado';

create index legal_entities_campaign_id_idx on public.legal_entities (campaign_id);

create trigger legal_entities_set_updated_at
  before update on public.legal_entities
  for each row execute function public.set_updated_at();

alter table public.legal_entities enable row level security;

-- Mesmo padrão de people_select/people_insert/people_update (0005) — dados
-- de PJ são tão sensíveis quanto os de people (CNPJ, dados bancários,
-- CPF do representante legal).
create policy legal_entities_select on public.legal_entities for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
  );

create policy legal_entities_insert on public.legal_entities for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );

create policy legal_entities_update on public.legal_entities for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
  );
