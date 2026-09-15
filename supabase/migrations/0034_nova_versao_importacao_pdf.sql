-- =============================================================================
-- Nova versão (docs/NOVA_VERSAO_RH_ELEITORAL.md) — Etapa 7: importação por
-- PDF, primeira etapa (spec seção 9.2). Reaproveita quase toda a
-- infraestrutura de staging já construída pra Excel (Etapas 1/6/10 da
-- iniciativa anterior) — `import_batches`, `import_staging_records`,
-- `import_row_errors` servem os dois tipos de arquivo sem mudança de
-- forma, só ganham uma coluna pra distinguir a origem.
--
-- Escopo desta etapa (documentado com detalhe por ser um corte
-- deliberado do que a spec 9.2 pede por completo):
--   - PDF com texto pesquisável (extração direta) — PDF de imagem
--     digitalizada (que exigiria OCR de verdade) é detectado e a
--     página correspondente entra como linha inválida com mensagem
--     clara ("requer OCR, não suportado nesta versão"), em vez de
--     tentar OCR sem um provedor definido (custo/credencial — decisão
--     do usuário, não masso implementar sozinho).
--   - Separação de pessoas por PÁGINA (heurística simples: 1 página =
--     1 pessoa) — não há análise de layout/IA pra separar várias
--     pessoas dentro da mesma página.
--   - Extração de campos por regex (CPF, telefone, e-mail, nome perto
--     de rótulo "Nome:") — sem confiança por campo nem comparação com
--     cadastro existente ainda (isso é a próxima etapa, usando
--     `data_conflicts`, que já existe desde a migração 0018 e segue
--     ociosa até lá).
--   - Só CRIA cadastro novo (mesmo escopo do Excel) — "complementar",
--     "atualizar" e "vincular" pessoa existente (spec 9.2, passo 8)
--     ficam pra depois; isso também evita de vez o risco da spec 9.2
--     ("PDF e OCR nunca atualizam diretamente CPF, CNPJ, banco, PIX,
--     função, coordenador ou remuneração") nesta etapa, porque nenhum
--     registro existente é tocado.
-- =============================================================================

alter table public.import_batches
  add column source_type text not null default 'excel' check (source_type in ('excel', 'pdf'));

comment on column public.import_batches.source_type is 'Origem do lote — excel (Etapas 1/6) ou pdf (Etapa 7, Nova versão). Mesma tabela de staging serve os dois.';

-- people.origin também precisa saber distinguir uma pessoa criada a
-- partir de PDF — confirmImportBatch() (app) é o mesmo código pra Excel
-- e PDF, só muda o valor de origin que ele grava.
alter table public.people drop constraint people_origin_check;
alter table public.people add constraint people_origin_check
  check (origin = any (array['autocadastro', 'administrativo', 'importacao_excel', 'importacao_pdf']));
