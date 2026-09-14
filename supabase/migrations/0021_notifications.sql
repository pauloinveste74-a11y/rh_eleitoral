-- =============================================================================
-- Etapa 1 — parte 9: notificações internas (registro, sem envio nesta etapa)
-- =============================================================================
-- Só a tabela de registro — integração de envio (WhatsApp/e-mail) e os
-- eventos que disparam notificação ficam pra Etapa 2+ (seção 17 da spec:
-- "não acoplar a regra de negócio diretamente a um único provedor").
-- =============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  recipient_profile_id uuid not null references public.profiles(id),
  type text not null,
  title text not null,
  body text,
  related_entity_table text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_profile_id_idx on public.notifications (recipient_profile_id);
create index notifications_unread_idx on public.notifications (recipient_profile_id) where read_at is null;

alter table public.notifications enable row level security;

-- Só o próprio destinatário lê/marca como lida. Sem policy de insert pro
-- cliente — só função SECURITY DEFINER futura (Etapa 2+, quando os eventos
-- que disparam notificação existirem). Sem delete.
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_profile_id = (select auth.uid()));

create policy notifications_update on public.notifications for update to authenticated
  using (recipient_profile_id = (select auth.uid()))
  with check (recipient_profile_id = (select auth.uid()));
