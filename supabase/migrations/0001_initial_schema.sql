-- =============================================================================
-- Fase 1A — Fundação do esquema de dados
-- =============================================================================
-- Escopo desta migração (ver seção 22 do briefing do projeto): campanhas,
-- perfis, papéis, atribuições de papéis, eixos, cidades, equipes, pessoas,
-- vínculos organizacionais e auditoria.
--
-- Fora de escopo nesta fase (entram em fases seguintes, conforme o modelo
-- completo de dados): regiões, setores, documentos pessoais, contratos,
-- ponto, financeiro, despesas, combustível, conciliação bancária,
-- desligamento. Essas tabelas serão adicionadas em migrações incrementais
-- para manter o projeto executável ao final de cada fase.
--
-- Princípios aplicados (não alterar sem atualizar este comentário):
--   * UUID como chave primária em todas as tabelas.
--   * Nenhuma exclusão física: todas as tabelas de domínio usam coluna
--     `status` para exclusão lógica / arquivamento.
--   * RLS habilitado em 100% das tabelas, com políticas restritivas por
--     padrão (menor privilégio).
--   * CPF é identificador de unicidade, nunca chave primária.
--   * Histórico organizacional nunca é sobrescrito: mudanças de vigência
--     geram uma nova linha em `organizational_assignments` em vez de
--     atualizar a anterior.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Função utilitária: mantém a coluna updated_at sincronizada
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. campaigns — campanha eleitoral
-- =============================================================================
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'ativa'
    check (status in ('ativa', 'encerrada', 'arquivada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.campaigns is 'Campanha eleitoral. Nível mais alto da hierarquia organizacional.';

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 2. roles — catálogo de perfis de acesso (seção 5)
-- =============================================================================
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.roles is 'Catálogo fixo de perfis de acesso do sistema (administrador, RH, coordenadores, etc.).';

-- =============================================================================
-- 3. axes — eixos da campanha
-- =============================================================================
create table public.axes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  name text not null,
  code text not null,
  status text not null default 'ativo'
    check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, code)
);

comment on table public.axes is 'Eixo: subdivisão direta da campanha na hierarquia territorial.';

create trigger axes_set_updated_at
  before update on public.axes
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 4. cities — cidade ou Região Administrativa (RA)
-- =============================================================================
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  axis_id uuid not null references public.axes(id),
  name text not null,
  state char(2) not null,
  is_administrative_region boolean not null default false,
  status text not null default 'ativo'
    check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (axis_id, name)
);

comment on table public.cities is 'Cidade ou Região Administrativa (RA), vinculada a um eixo.';

create trigger cities_set_updated_at
  before update on public.cities
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 5. teams — equipes de campo
-- =============================================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id),
  name text not null,
  status text not null default 'ativo'
    check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, name)
);

comment on table public.teams is 'Equipe de campo, vinculada a uma cidade/RA.';

create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6. people — cadastro único de pessoa (fonte oficial dos dados)
-- =============================================================================
-- Somente os campos de identidade essenciais entram nesta fase. Documentos,
-- endereço, dados bancários e dados eleitorais completos (seção 6) vivem em
-- tabelas satélite (person_documents, person_addresses, person_bank_accounts,
-- person_electoral_data) a serem criadas na fase do módulo de Cadastro.
create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  social_name text,
  cpf text not null unique
    check (cpf ~ '^[0-9]{11}$'),
  birth_date date,
  phone text,
  whatsapp text,
  email text,
  status text not null default 'rascunho'
    check (status in (
      'rascunho',
      'documentos_pendentes',
      'documentos_enviados',
      'ocr_processado',
      'cadastro_divergente',
      'pendente_validacao_cidade',
      'pendente_validacao_eixo',
      'aprovado',
      'contrato_pendente',
      'contrato_enviado',
      'contrato_assinado',
      'assinatura_pendente_validacao',
      'ativo',
      'suspenso',
      'desligado',
      'rejeitado',
      'arquivado'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.people is 'Cadastro único de pessoa. Fonte oficial dos dados: nunca duplicar em outras tabelas, apenas referenciar people.id.';
comment on column public.people.cpf is 'Somente dígitos (11 caracteres). Identificador de unicidade — NUNCA usado como chave primária.';

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

create index people_cpf_idx on public.people (cpf);
create index people_status_idx on public.people (status);

-- =============================================================================
-- 7. profiles — usuário autenticado (separado da pessoa cadastrada)
-- =============================================================================
-- Nem todo usuário autenticado corresponde a uma "people" (ex.: pode haver
-- contas técnicas), e nem toda "people" possui login no sistema (ex.: um
-- cabo eleitoral de campo pode nunca acessar o app). Por isso o vínculo é
-- opcional e feito por referência, nunca por duplicação de dados.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  person_id uuid references public.people(id),
  full_name text not null,
  email text not null,
  status text not null default 'ativo'
    check (status in ('ativo', 'suspenso', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Usuário autenticado do sistema (1:1 com auth.users). Distinto do cadastro de pessoa (people).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente um profile ao nascer um novo auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 8. profile_roles — atribuição de papéis (com escopo e vigência)
-- =============================================================================
create table public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  campaign_id uuid references public.campaigns(id),
  axis_id uuid references public.axes(id),
  city_id uuid references public.cities(id),
  team_id uuid references public.teams(id),
  valid_from date not null default current_date,
  valid_until date,
  delegated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from)
);

comment on table public.profile_roles is 'Atribuição de um papel a um usuário, com escopo territorial e período de validade (seção 5).';

create index profile_roles_profile_idx on public.profile_roles (profile_id);

-- =============================================================================
-- 9. organizational_assignments — histórico de vínculos organizacionais
-- =============================================================================
-- Mudanças de equipe/cidade/eixo/função NÃO sobrescrevem o histórico: a
-- vigência anterior é encerrada (valid_until preenchido) e uma nova linha é
-- inserida. Nunca fazer UPDATE nos campos de escopo de uma linha já vigente.
create table public.organizational_assignments (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id),
  campaign_id uuid not null references public.campaigns(id),
  axis_id uuid references public.axes(id),
  city_id uuid references public.cities(id),
  team_id uuid references public.teams(id),
  role_id uuid references public.roles(id),
  responsible_person_id uuid references public.people(id),
  valid_from date not null default current_date,
  valid_until date,
  status text not null default 'vigente'
    check (status in ('vigente', 'encerrado')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  check (valid_until is null or valid_until >= valid_from)
);

comment on table public.organizational_assignments is 'Histórico de vigência dos vínculos organizacionais de uma pessoa (equipe, cidade, eixo, função, responsável).';

create index organizational_assignments_person_idx on public.organizational_assignments (person_id);
create index organizational_assignments_current_idx on public.organizational_assignments (person_id) where status = 'vigente';

-- =============================================================================
-- 10. audit_logs — trilha de auditoria imutável
-- =============================================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  related_request_id uuid,
  approval_id uuid,
  result text not null default 'sucesso'
    check (result in ('sucesso', 'falha'))
);

comment on table public.audit_logs is 'Trilha de auditoria imutável. Sem política de UPDATE/DELETE para usuários comuns — ver políticas RLS abaixo.';

create index audit_logs_entity_idx on public.audit_logs (entity_table, entity_id);
create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at desc);

-- =============================================================================
-- Funções auxiliares de autorização (usadas pelas políticas de RLS)
-- =============================================================================
-- SECURITY DEFINER é necessário para evitar recursão de RLS ao consultar
-- profile_roles/roles a partir de políticas de outras tabelas.
create or replace function public.has_role(role_codes text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_roles pr
    join public.roles r on r.id = pr.role_id
    where pr.profile_id = auth.uid()
      and r.code = any(role_codes)
      and pr.valid_from <= current_date
      and (pr.valid_until is null or pr.valid_until >= current_date)
  );
$$;

revoke all on function public.has_role(text[]) from public;
grant execute on function public.has_role(text[]) to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_role(array['administrador']);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- =============================================================================
-- Row Level Security — habilitação e políticas iniciais restritivas
-- =============================================================================
alter table public.campaigns enable row level security;
alter table public.roles enable row level security;
alter table public.axes enable row level security;
alter table public.cities enable row level security;
alter table public.teams enable row level security;
alter table public.people enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_roles enable row level security;
alter table public.organizational_assignments enable row level security;
alter table public.audit_logs enable row level security;

-- campaigns: leitura para qualquer autenticado; escrita só administrador.
create policy campaigns_select on public.campaigns
  for select to authenticated using (true);
create policy campaigns_write on public.campaigns
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- roles: catálogo público de leitura para autenticados; escrita só administrador.
create policy roles_select on public.roles
  for select to authenticated using (true);
create policy roles_write on public.roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- axes / cities / teams: leitura para autenticados (necessário para
-- navegação e filtros); escrita só administrador nesta fase. Escopo de
-- escrita por coordenador de eixo/cidade será refinado quando os módulos
-- de gestão territorial forem implementados.
create policy axes_select on public.axes
  for select to authenticated using (true);
create policy axes_write on public.axes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy cities_select on public.cities
  for select to authenticated using (true);
create policy cities_write on public.cities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy teams_select on public.teams
  for select to authenticated using (true);
create policy teams_write on public.teams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- people: dado sensível (LGPD). Leitura e escrita restritas a
-- administrador, RH e auditor (auditor apenas leitura). Sem política de
-- DELETE: exclusão é sempre lógica via coluna status.
create policy people_select on public.people
  for select to authenticated
  using (public.has_role(array['administrador', 'rh', 'auditor']));
create policy people_insert on public.people
  for insert to authenticated
  with check (public.has_role(array['administrador', 'rh']));
create policy people_update on public.people
  for update to authenticated
  using (public.has_role(array['administrador', 'rh']))
  with check (public.has_role(array['administrador', 'rh']));

-- profiles: cada usuário vê/edita o próprio perfil; administrador vê/edita todos.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- profile_roles: cada usuário vê os próprios papéis; administrador e RH
-- veem e administram todos.
create policy profile_roles_select on public.profile_roles
  for select to authenticated
  using (profile_id = auth.uid() or public.has_role(array['administrador', 'rh']));
create policy profile_roles_write on public.profile_roles
  for all to authenticated
  using (public.has_role(array['administrador', 'rh']))
  with check (public.has_role(array['administrador', 'rh']));

-- organizational_assignments: leitura administrador/RH/auditor nesta fase
-- (visibilidade escopada por coordenador entra no módulo de hierarquia).
-- Sem DELETE: histórico nunca é removido, apenas encerrado (status/valid_until).
create policy organizational_assignments_select on public.organizational_assignments
  for select to authenticated
  using (public.has_role(array['administrador', 'rh', 'auditor']));
create policy organizational_assignments_insert on public.organizational_assignments
  for insert to authenticated
  with check (public.has_role(array['administrador', 'rh']));
create policy organizational_assignments_update on public.organizational_assignments
  for update to authenticated
  using (public.has_role(array['administrador', 'rh']))
  with check (public.has_role(array['administrador', 'rh']));

-- audit_logs: somente leitura, restrita a administrador/auditor. De
-- propósito, não há política de INSERT/UPDATE/DELETE para os papéis
-- authenticated/anon — a gravação de auditoria será feita por uma função
-- SECURITY DEFINER dedicada quando os módulos que geram eventos (Fase 2+)
-- forem implementados, nunca diretamente pelo cliente.
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.has_role(array['administrador', 'auditor']));

-- =============================================================================
-- Seed estrutural (catálogo de papéis — não é dado fictício, é dado de
-- referência necessário para o funcionamento do sistema)
-- =============================================================================
insert into public.roles (code, name, description) values
  ('administrador', 'Administrador', 'Acesso irrestrito à campanha.'),
  ('auditor', 'Auditor', 'Acesso de leitura para fins de auditoria e conformidade.'),
  ('juridico', 'Jurídico', 'Acompanhamento jurídico de contratos e conformidade.'),
  ('rh', 'Recursos Humanos', 'Gestão de pessoas, contratos e desligamentos.'),
  ('financeiro', 'Financeiro', 'Gestão de pagamentos, despesas e conciliação.'),
  ('tesouraria', 'Tesouraria', 'Execução e aprovação de pagamentos.'),
  ('coordenador_eixo', 'Coordenador de Eixo', 'Coordenação de um eixo da campanha.'),
  ('auxiliar_delegado_eixo', 'Auxiliar Delegado do Eixo', 'Delegação de tarefas do coordenador de eixo.'),
  ('coordenador_cidade', 'Coordenador de Cidade/RA', 'Coordenação de uma cidade ou região administrativa.'),
  ('coordenador_equipe', 'Coordenador de Equipe', 'Coordenação de uma equipe de campo.'),
  ('colaborador', 'Colaborador/Cabo Eleitoral', 'Colaborador de campo da campanha.');
