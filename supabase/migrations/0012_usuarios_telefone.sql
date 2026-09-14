-- =============================================================================
-- Fase 9 (complemento) — Usuários: telefone para envio manual do link por WhatsApp
-- =============================================================================
-- Sem constraint de formato, mesmo padrão de people.phone/people.whatsapp
-- (0001): campo livre, validado só no Zod (src/lib/validations/user.ts).
-- =============================================================================
alter table public.profiles add column phone text;

comment on column public.profiles.phone is
  'Telefone/WhatsApp do usuário (opcional) — usado para compartilhar manualmente o link de acesso/convite fora do e-mail.';
