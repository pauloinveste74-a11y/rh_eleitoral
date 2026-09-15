-- =============================================================================
-- Importação multi-planilha + campos novos de pessoa (RG, veículo, função)
-- =============================================================================
-- Contexto: usuário importou uma planilha real com várias abas (dados
-- pessoais, endereço, liderança, eixos...) ligadas por CPF — a importação
-- hoje só lê a primeira aba e ignora o resto. Além disso, RG (já existe em
-- people.rg desde a 0013, mas nunca coletado por nenhum formulário/import),
-- veículo (marca/modelo/placa/renavam, nunca existiu) e função (job_functions
-- existe desde a 0029, mas nunca foi ligada a people — a própria migração
-- documentou isso como pendência) precisam ganhar onde gravar.
--
-- Eixo e coordenador NÃO precisam de tabela nova: organizational_assignments
-- (axis_id já nullable/independente de city_id/team_id) e
-- coordination_relationships (source já aceita 'importacao_excel' desde a
-- 0015 — o schema já antecipava isso) cobrem o caso; só passam a ser escritas
-- pelo import nesta etapa.
-- =============================================================================

alter table public.people
  add column job_function_id uuid references public.job_functions(id);

comment on column public.people.job_function_id is 'Cargo/função da pessoa (catálogo job_functions, migração 0029) — finalmente ligado ao cadastro, depois de ter ficado pendente desde então.';

-- -----------------------------------------------------------------------------
-- person_vehicles (1:1) — mesmo molde de person_electoral_data, já no formato
-- pós-multi-tenant (campaign_id direto na tabela + RLS com
-- is_platform_admin()/current_campaign_id(), não o formato original da 0004
-- que só ganhou campaign_id depois, na 0005).
-- -----------------------------------------------------------------------------
create table public.person_vehicles (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people(id),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  brand text,
  model text,
  plate text,
  renavam text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.person_vehicles is 'Dados de veículo próprio usado no trabalho de campanha (marca/modelo/placa/renavam). 1:1 com people, mesmo padrão de person_electoral_data.';

create trigger person_vehicles_set_updated_at
  before update on public.person_vehicles
  for each row execute function public.set_updated_at();

create index person_vehicles_campaign_id_idx on public.person_vehicles (campaign_id);
create index person_vehicles_created_by_idx on public.person_vehicles (created_by);
create index person_vehicles_updated_by_idx on public.person_vehicles (updated_by);

alter table public.person_vehicles enable row level security;

create policy person_vehicles_select on public.person_vehicles for select to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor'])));
create policy person_vehicles_insert on public.person_vehicles for insert to authenticated
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));
create policy person_vehicles_update on public.person_vehicles for update to authenticated
  using (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])))
  with check (public.is_platform_admin() or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh'])));

-- Sem policy de delete, mesmo princípio das demais satélites (exclusão lógica).
