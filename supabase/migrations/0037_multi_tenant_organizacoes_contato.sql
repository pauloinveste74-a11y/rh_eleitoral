-- Multi-tenant, Etapa 3 — dados de contato da organização (spec seção
-- 7.2: "e-mail principal; telefone e WhatsApp") + tela pra editar o que
-- já existe. Achado testando a Etapa 2: a organização "Bia Kicis -
-- Senadora" (criada antes desta iniciativa) não tinha onde receber um
-- CNPJ — /master/organizacoes só tinha formulário de CRIAÇÃO, sem
-- edição do que já existe.

alter table public.campaigns
  add column phone text,
  add column email text;

comment on column public.campaigns.phone is 'Telefone/WhatsApp de contato da organização (spec 7.2) — editável em /master/organizacoes/[id].';
comment on column public.campaigns.email is 'E-mail principal de contato da organização (spec 7.2) — editável em /master/organizacoes/[id].';
