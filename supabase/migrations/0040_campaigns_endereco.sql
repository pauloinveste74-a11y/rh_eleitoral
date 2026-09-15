-- Cabeçalho/rodapé do contrato impresso (pedido do usuário; refinado
-- pelo CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md, seções
-- 8-10-15: cabeçalho e rodapé obrigatórios com CNPJ/e-mail/telefone/
-- endereço da entidade contratante, e a qualificação do contrato
-- exige o representante legal — nome e CPF, mesmo padrão já usado em
-- legal_entities.legal_representative_name/cpf).
--
-- CNPJ/e-mail/telefone já existiam desde a Multi-tenant Etapa 1/3
-- (migrações 0035/0037) — faltava endereço do escritório e
-- representante. Mesma convenção de nome de coluna já usada em
-- legal_entities (zip_code/street/number/complement/neighborhood/
-- city/state), pra manter consistência entre os dois lugares que
-- guardam endereço no schema.

alter table public.campaigns
  add column zip_code text,
  add column street text,
  add column number text,
  add column complement text,
  add column neighborhood text,
  add column city text,
  add column state text,
  add column representative_name text,
  add column representative_cpf text;

comment on column public.campaigns.zip_code is 'Endereço do escritório/sede — cabeçalho/rodapé do contrato impresso.';
comment on column public.campaigns.representative_name is 'Representante legal da entidade contratante — qualificação do contrato (caderno jurídico, seção 10/15).';
