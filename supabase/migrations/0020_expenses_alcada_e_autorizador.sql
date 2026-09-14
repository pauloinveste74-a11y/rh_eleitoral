-- =============================================================================
-- Etapa 1 — parte 8: despesas — autorizador, alçada e categorias configuráveis
-- =============================================================================
-- Tudo aditivo/nullable. create_expense()/decide_expense() NÃO mudam de
-- assinatura nesta etapa — continuam servindo o /despesas já em produção
-- exatamente como hoje. As colunas/tabelas novas ficam prontas e não
-- obrigatórias; funções novas e a migração de fato do fluxo (ex.:
-- create_expense_v2 usando category_id/authorized_by_profile_id) ficam pra
-- Etapa 5, quando o código de app for escrito.
-- =============================================================================

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  -- null = categoria global (disponível em toda campanha); preenchido =
  -- categoria específica de uma campanha.
  campaign_id uuid references public.campaigns(id),
  code text not null,
  name text not null,
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now(),
  unique (campaign_id, code)
);

comment on table public.expense_categories is 'Substitui o check hardcoded de expenses.category por um catálogo configurável. expenses.category (texto) é mantido por compatibilidade com o fluxo já em produção.';

insert into public.expense_categories (campaign_id, code, name) values
  (null, 'combustivel', 'Combustível'),
  (null, 'material', 'Material'),
  (null, 'alimentacao', 'Alimentação'),
  (null, 'transporte', 'Transporte'),
  (null, 'hospedagem', 'Hospedagem'),
  (null, 'outro', 'Outro');

alter table public.expenses
  add column category_id uuid references public.expense_categories(id),
  add column purpose text,
  add column vendor_name text,
  add column vendor_document text,
  add column requested_amount_cents bigint check (requested_amount_cents > 0),
  add column authorized_amount_cents bigint check (authorized_amount_cents > 0),
  add column payment_method text check (payment_method in ('pix', 'transferencia', 'dinheiro', 'cartao', 'boleto', 'outro')),
  add column purchaser_person_id uuid references public.people(id),
  add column authorized_by_profile_id uuid references public.profiles(id),
  add column authorizer_name_snapshot text,
  add column authorizer_phone_snapshot text,
  add column authorization_role_snapshot text,
  add column authorized_at timestamptz,
  add column authorization_channel text check (authorization_channel in ('presencial', 'whatsapp', 'telefone', 'sistema', 'outro')),
  add column protocol text,
  add column unidentified_authorizer boolean not null default false,
  add column unidentified_authorizer_name text,
  add column unidentified_authorizer_phone text,
  add column unidentified_authorizer_reason text,
  add column unidentified_authorizer_evidence text;

update public.expenses e
  set category_id = c.id
  from public.expense_categories c
  where c.campaign_id is null and c.code = e.category;

create table public.expense_authorization_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  role_id uuid references public.roles(id),
  profile_id uuid references public.profiles(id),
  axis_id uuid references public.axes(id),
  city_id uuid references public.cities(id),
  max_amount_cents bigint not null check (max_amount_cents > 0),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (role_id is not null or profile_id is not null)
);

comment on table public.expense_authorization_rules is 'Alçada mínima e extensível: teto de valor por papel ou por pessoa, opcionalmente escopado a eixo/cidade. Sem motor de regras complexo — checagem fica pra Etapa 5.';

create index expense_authorization_rules_campaign_id_idx on public.expense_authorization_rules (campaign_id);

create table public.expense_documents (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id),
  document_type text not null check (document_type in ('nota_fiscal', 'comprovante_pagamento', 'fotografia', 'outro')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  file_hash text,
  status text not null default 'ativo' check (status in ('ativo', 'removido')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table public.expense_documents is 'Modelo novo multi-documento (nota fiscal + comprovante + foto). expenses.receipt_storage_path (um só arquivo) é mantido por compatibilidade com o fluxo já em produção.';

create index expense_documents_expense_id_idx on public.expense_documents (expense_id);

create table public.expense_approvals (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id),
  step text not null check (step in ('autorizacao', 'aprovacao_financeira')),
  decided_by uuid references auth.users(id),
  decision text not null check (decision in ('aprovado', 'rejeitado')),
  reason text,
  decided_at timestamptz not null default now()
);

comment on table public.expense_approvals is 'Log append-only das decisões — complementa (não substitui) expenses.decided_by/decided_at/decision_reason já existentes.';

create index expense_approvals_expense_id_idx on public.expense_approvals (expense_id);

alter table public.expense_categories enable row level security;
alter table public.expense_authorization_rules enable row level security;
alter table public.expense_documents enable row level security;
alter table public.expense_approvals enable row level security;

-- expense_categories: catálogo, leitura livre pra autenticado (igual roles);
-- escrita só administrador. Categoria global (campaign_id null) é visível a
-- todo mundo; a específica de campanha, só à própria campanha.
create policy expense_categories_select on public.expense_categories for select to authenticated
  using (
    campaign_id is null
    or public.is_platform_admin()
    or campaign_id = (select public.current_campaign_id())
  );

create policy expense_categories_insert on public.expense_categories for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

create policy expense_categories_update on public.expense_categories for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

-- expense_authorization_rules: configuração de alçada — só administrador.
create policy expense_authorization_rules_select on public.expense_authorization_rules for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

create policy expense_authorization_rules_insert on public.expense_authorization_rules for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

create policy expense_authorization_rules_update on public.expense_authorization_rules for update to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  )
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.is_admin())
  );

-- expense_documents: mesma leitura de expenses; sem insert/update direto do
-- cliente nesta etapa — só função SECURITY DEFINER futura (Etapa 5).
create policy expense_documents_select on public.expense_documents for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.expenses e
      where e.id = expense_documents.expense_id
        and e.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'financeiro', 'tesouraria', 'auditor'])
    )
  );

-- expense_approvals: só leitura pro cliente — toda escrita via função
-- SECURITY DEFINER futura (mesma lógica de decide_expense() hoje).
create policy expense_approvals_select on public.expense_approvals for select to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from public.expenses e
      where e.id = expense_approvals.expense_id
        and e.campaign_id = (select public.current_campaign_id())
        and public.has_role(array['administrador', 'financeiro', 'tesouraria', 'auditor'])
    )
  );
