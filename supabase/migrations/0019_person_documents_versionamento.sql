-- =============================================================================
-- Etapa 1 — parte 7: versionamento e revisão de documentos pessoais
-- =============================================================================
-- Sem tabelas document_versions/document_reviews separadas — uma "nova
-- versão" é só uma nova linha com replaces_document_id apontando pra
-- anterior, consistente com o resto do projeto (histórico fica em
-- audit_logs, não em tabela de versão própria). Visualização/download
-- viram ações em audit_logs (pessoa.documento.visualizar/.baixar), não uma
-- tabela de log dedicada — decisão de código de app, Etapa 2, sem mudança
-- de schema necessária pra isso.
-- =============================================================================

alter table public.person_documents
  add column file_hash text,
  add column replaces_document_id uuid references public.person_documents(id),
  add column origin text check (origin in ('autocadastro', 'administrativo', 'importacao_excel')),
  add column reviewed_by uuid references auth.users(id),
  add column reviewed_at timestamptz,
  add column review_status text check (review_status in ('pendente', 'aprovado', 'ilegivel', 'divergente')),
  add column rejection_reason text;

create index person_documents_replaces_document_id_idx on public.person_documents (replaces_document_id);

-- document_type: ampliar a lista aceita (aditivo). titulo_eleitor já cobre
-- "título eleitoral" da seção 8.1 — não duplicar.
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.person_documents'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%document_type%';
  if v_constraint_name is not null then
    execute format('alter table public.person_documents drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.person_documents add constraint person_documents_document_type_check check (document_type in (
  'rg',
  'cnh',
  'cpf',
  'comprovante_residencia',
  'titulo_eleitor',
  'carteira_trabalho',
  'comprovante_bancario',
  'contrato',
  'certidao',
  'outro'
));
