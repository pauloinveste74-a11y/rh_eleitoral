-- =============================================================================
-- Etapa 1 (cadastro completo/convite/coordenação/importação/despesas) — parte 1
-- =============================================================================
-- people ganha os campos de identificação/contato pedidos pelo autocadastro
-- completo, e o CPF/título de eleitor deixam de ser únicos GLOBALMENTE para
-- serem únicos por campanha entre os cadastros ativos — a mesma pessoa real
-- pode trabalhar para duas campanhas diferentes (dois tenants isolados), e um
-- cadastro rejeitado/arquivado não deve travar um novo cadastro com o mesmo
-- CPF na mesma campanha. Tudo aditivo: nenhuma coluna/linha é removida.
-- =============================================================================

alter table public.people
  add column rg text,
  add column cnh text,
  add column documento_orgao_expedidor text,
  add column documento_uf_expedicao char(2),
  add column documento_data_expedicao date,
  add column nome_mae text,
  add column nome_pai text,
  add column nacionalidade text,
  add column naturalidade text,
  add column pais_nascimento text not null default 'Brasil',
  add column phone_alternate text,
  add column origin text not null default 'administrativo'
    check (origin in ('autocadastro', 'administrativo', 'importacao_excel'));

comment on column public.people.origin is 'Origem do cadastro (seção 3 da spec de Cadastro/Convite/Importação/Despesas) — não confundir com o status do fluxo de validação.';

-- -----------------------------------------------------------------------------
-- CPF: de unique global para unique por campanha, só entre cadastros ativos.
-- Localiza o nome real da constraint em vez de supor — mais seguro que
-- "drop constraint people_cpf_key" às cegas.
-- -----------------------------------------------------------------------------
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.people'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (cpf)';
  if v_constraint_name is not null then
    execute format('alter table public.people drop constraint %I', v_constraint_name);
  end if;
end $$;

create unique index people_cpf_active_unique on public.people (campaign_id, cpf)
  where status not in ('arquivado', 'rejeitado');

comment on index public.people_cpf_active_unique is 'Um CPF só pode ter um cadastro ativo por campanha — cadastros arquivados/rejeitados não bloqueiam um novo cadastro com o mesmo CPF. A mesma pessoa real pode ter cadastro em campanhas diferentes.';

-- -----------------------------------------------------------------------------
-- person_electoral_data.voter_id: mesmo tratamento, mesma justificativa.
-- -----------------------------------------------------------------------------
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.person_electoral_data'::regclass
    and contype = 'u'
    and pg_get_constraintdef(oid) = 'UNIQUE (voter_id)';
  if v_constraint_name is not null then
    execute format('alter table public.person_electoral_data drop constraint %I', v_constraint_name);
  end if;
end $$;

create unique index person_electoral_data_voter_id_active_unique
  on public.person_electoral_data (campaign_id, voter_id)
  where voter_id is not null;

-- -----------------------------------------------------------------------------
-- people.status: ampliar a lista aceita (aditivo — nenhum valor existente é
-- removido) com os estados de conferência/validação da spec nova. Localiza a
-- constraint pelo mesmo método seguro acima.
-- -----------------------------------------------------------------------------
do $$
declare
  v_constraint_name text;
begin
  select conname into v_constraint_name
  from pg_constraint
  where conrelid = 'public.people'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if v_constraint_name is not null then
    execute format('alter table public.people drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.people add constraint people_status_check check (status in (
  -- valores já existentes desde a 0001/0006 — preservados
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
  'arquivado',
  -- novos, para o fluxo de conferência do gestor (seção 7.1 da spec)
  'aguardando_gestor',
  'em_conferencia',
  'correcao_solicitada',
  'reenviado',
  'divergente',
  'aprovado_gestor',
  'aguardando_rh',
  'validado'
));
