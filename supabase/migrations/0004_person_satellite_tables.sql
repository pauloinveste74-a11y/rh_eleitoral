-- =============================================================================
-- Fase 1B — Tabelas satélite de pessoa, bucket de documentos e auditoria
-- =============================================================================
-- Escopo: person_addresses, person_bank_accounts, person_electoral_data (1:1
-- mutáveis com people — histórico de mudanças fica em audit_logs, não em
-- versionamento próprio), person_documents (1:N, metadados de arquivos no
-- bucket privado pessoas-documentos), e a função SECURITY DEFINER
-- log_audit_event, primeira gravação real em audit_logs.
--
-- Decisão de modelagem: ao contrário de organizational_assignments (que usa
-- valid_from/valid_until porque representa vigência territorial consultável
-- no tempo), endereço/dados bancários/dados eleitorais são atributos de
-- identidade da pessoa — análogos a people.phone/people.email — mutáveis por
-- natureza. Histórico de alterações fica registrado em audit_logs
-- (before_data/after_data), não em versionamento próprio nesta fase.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- person_addresses (1:1)
-- -----------------------------------------------------------------------------
create table public.person_addresses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people(id),
  zip_code text not null check (zip_code ~ '^[0-9]{8}$'),
  street text not null,
  number text,
  complement text,
  neighborhood text not null,
  city text not null,
  state char(2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.person_addresses is 'Endereço atual da pessoa. 1:1 com people — mutável; histórico de alterações fica em audit_logs, não em versionamento próprio.';

create trigger person_addresses_set_updated_at
  before update on public.person_addresses
  for each row execute function public.set_updated_at();

create index person_addresses_created_by_idx on public.person_addresses (created_by);
create index person_addresses_updated_by_idx on public.person_addresses (updated_by);

-- -----------------------------------------------------------------------------
-- person_bank_accounts (1:1)
-- -----------------------------------------------------------------------------
create table public.person_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people(id),
  bank_code text not null check (bank_code ~ '^[0-9]{3}$'),
  bank_name text,
  agency text not null,
  agency_digit text,
  account_number text not null,
  account_digit text,
  account_type text not null check (account_type in ('corrente', 'poupanca')),
  pix_key_type text check (pix_key_type in ('cpf', 'email', 'telefone', 'aleatoria')),
  pix_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.person_bank_accounts is 'Conta bancária/PIX atual da pessoa, para fins de pagamento. 1:1 com people.';

create trigger person_bank_accounts_set_updated_at
  before update on public.person_bank_accounts
  for each row execute function public.set_updated_at();

create index person_bank_accounts_created_by_idx on public.person_bank_accounts (created_by);
create index person_bank_accounts_updated_by_idx on public.person_bank_accounts (updated_by);

-- -----------------------------------------------------------------------------
-- person_electoral_data (1:1)
-- -----------------------------------------------------------------------------
create table public.person_electoral_data (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null unique references public.people(id),
  voter_id text unique check (voter_id ~ '^[0-9]{12}$'),
  electoral_zone text,
  electoral_section text,
  voter_city text,
  voter_state char(2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

comment on table public.person_electoral_data is 'Dados do título de eleitor da pessoa. 1:1 com people.';

create trigger person_electoral_data_set_updated_at
  before update on public.person_electoral_data
  for each row execute function public.set_updated_at();

create index person_electoral_data_created_by_idx on public.person_electoral_data (created_by);
create index person_electoral_data_updated_by_idx on public.person_electoral_data (updated_by);

-- -----------------------------------------------------------------------------
-- person_documents (1:N)
-- -----------------------------------------------------------------------------
create table public.person_documents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id),
  document_type text not null
    check (document_type in ('rg', 'cpf', 'comprovante_residencia', 'titulo_eleitor', 'carteira_trabalho', 'outro')),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  status text not null default 'ativo' check (status in ('ativo', 'removido')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.person_documents is 'Metadados dos arquivos anexados de uma pessoa. O blob vive no bucket privado pessoas-documentos; sem OCR nesta fase.';

create trigger person_documents_set_updated_at
  before update on public.person_documents
  for each row execute function public.set_updated_at();

create index person_documents_person_idx on public.person_documents (person_id);
create index person_documents_uploaded_by_idx on public.person_documents (uploaded_by);
create index person_documents_status_idx on public.person_documents (status);

-- -----------------------------------------------------------------------------
-- RLS — mesmo padrão de people (administrador/rh escrevem, auditor só lê)
-- -----------------------------------------------------------------------------
alter table public.person_addresses enable row level security;
alter table public.person_bank_accounts enable row level security;
alter table public.person_electoral_data enable row level security;
alter table public.person_documents enable row level security;

create policy person_addresses_select on public.person_addresses for select to authenticated
  using (public.has_role(array['administrador', 'rh', 'auditor']));
create policy person_addresses_insert on public.person_addresses for insert to authenticated
  with check (public.has_role(array['administrador', 'rh']));
create policy person_addresses_update on public.person_addresses for update to authenticated
  using (public.has_role(array['administrador', 'rh'])) with check (public.has_role(array['administrador', 'rh']));

create policy person_bank_accounts_select on public.person_bank_accounts for select to authenticated
  using (public.has_role(array['administrador', 'rh', 'auditor']));
create policy person_bank_accounts_insert on public.person_bank_accounts for insert to authenticated
  with check (public.has_role(array['administrador', 'rh']));
create policy person_bank_accounts_update on public.person_bank_accounts for update to authenticated
  using (public.has_role(array['administrador', 'rh'])) with check (public.has_role(array['administrador', 'rh']));

create policy person_electoral_data_select on public.person_electoral_data for select to authenticated
  using (public.has_role(array['administrador', 'rh', 'auditor']));
create policy person_electoral_data_insert on public.person_electoral_data for insert to authenticated
  with check (public.has_role(array['administrador', 'rh']));
create policy person_electoral_data_update on public.person_electoral_data for update to authenticated
  using (public.has_role(array['administrador', 'rh'])) with check (public.has_role(array['administrador', 'rh']));

create policy person_documents_select on public.person_documents for select to authenticated
  using (public.has_role(array['administrador', 'rh', 'auditor']));
create policy person_documents_insert on public.person_documents for insert to authenticated
  with check (public.has_role(array['administrador', 'rh']));
create policy person_documents_update on public.person_documents for update to authenticated
  using (public.has_role(array['administrador', 'rh'])) with check (public.has_role(array['administrador', 'rh']));

-- Sem política de DELETE em nenhuma das quatro tabelas: exclusão lógica via
-- status (person_documents) ou simplesmente sobrescrita (satélites 1:1),
-- seguindo o mesmo princípio de "nenhuma exclusão física" de people.

-- -----------------------------------------------------------------------------
-- Bucket privado de documentos + políticas de Storage
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pessoas-documentos', 'pessoas-documentos', false, 10485760,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create policy pessoas_documentos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pessoas-documentos' and public.has_role(array['administrador', 'rh']));
create policy pessoas_documentos_select on storage.objects for select to authenticated
  using (bucket_id = 'pessoas-documentos' and public.has_role(array['administrador', 'rh', 'auditor']));

-- -----------------------------------------------------------------------------
-- Função SECURITY DEFINER de auditoria — primeira gravação real em audit_logs
-- -----------------------------------------------------------------------------
-- Chamada explicitamente pela server action após cada gravação bem-sucedida
-- (não via trigger): uma submissão de formulário pode gravar em até 4
-- tabelas (people + 3 satélites); a chamada explícita permite correlacionar
-- todas as linhas de uma mesma operação através de um único
-- related_request_id gerado uma vez por submissão. Storage (upload de
-- documento) também não pode ser auditado por trigger de banco. Segue o
-- mesmo idioma de endurecimento de has_role/is_admin (search_path fixo,
-- revoke explícito de public/anon/authenticated, grant seletivo).
create or replace function public.log_audit_event(
  p_action text,
  p_entity_table text,
  p_entity_id uuid,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_reason text default null,
  p_result text default 'sucesso',
  p_related_request_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_role(array['administrador', 'rh']) then
    raise exception 'not authorized to log audit events';
  end if;

  insert into public.audit_logs (
    actor_user_id, action, entity_table, entity_id,
    before_data, after_data, reason, result, related_request_id
  ) values (
    (select auth.uid()), p_action, p_entity_table, p_entity_id,
    p_before_data, p_after_data, p_reason, p_result, p_related_request_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.log_audit_event(text, text, uuid, jsonb, jsonb, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.log_audit_event(text, text, uuid, jsonb, jsonb, text, text, uuid)
  to authenticated;
