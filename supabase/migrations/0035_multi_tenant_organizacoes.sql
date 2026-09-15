-- Multi-tenant, Etapa 1 — identidade da organização (CNPJ).
--
-- O schema já era multi-tenant desde a 0005 (campaign_id em toda
-- tabela de negócio, is_platform_admin() já usado em todas as
-- policies de campaigns/profiles/profile_roles) — falta só dar
-- identidade de empresa/CNPJ a cada campanha, pra virar "organização"
-- de verdade no sentido da
-- ESPECIFICACAO_MULTI_TENANT_RH_ELEITORAL_CLAUDE.md (docs/).
--
-- document_number fica nullable de propósito: a campanha existente
-- ("Bia Kicis - Senadora") não ganha CNPJ nesta etapa (ninguém pediu),
-- e continua sem conseguir logar por CNPJ até alguém preencher — sem
-- problema, não tem usuário vinculado a ela além do platform admin.
--
-- Nenhuma policy nova ou alterada: campaigns_insert/campaigns_update,
-- profiles_update e profile_roles_insert já permitem is_platform_admin()
-- sem restrição adicional (conferido ao vivo em pg_policies antes desta
-- migração) — dá pra construir o painel do master em cima do que já
-- existe.

alter table public.campaigns
  add column document_number text,
  add column legal_name text,
  add column trade_name text;

comment on column public.campaigns.document_number is 'CNPJ da organização, só dígitos. Usado como campo de login (junto com e-mail/senha) — ver src/app/login/login-form.tsx.';
comment on column public.campaigns.legal_name is 'Razão social, opcional — exibição no painel do master.';
comment on column public.campaigns.trade_name is 'Nome fantasia, opcional — exibição no painel do master.';

create unique index campaigns_document_number_key
  on public.campaigns (document_number)
  where document_number is not null;
