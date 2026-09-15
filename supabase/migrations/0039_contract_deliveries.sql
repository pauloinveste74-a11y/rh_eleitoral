-- Envio de contrato por WhatsApp/e-mail (manual por ora, pronta pra
-- automatizar depois — ver docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md,
-- seções 14/25 do caderno técnico). Sem provedor pago contratado
-- ainda (decisão futura do usuário) — hoje só registra quem mandou o
-- quê quando, via link de WhatsApp/e-mail aberto manualmente pelo
-- administrador/coordenador. Quando a automação vier, é só mais um
-- escritor nesta mesma tabela — sem precisar de nova migração pra
-- isso funcionar.

create table public.contract_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null default public.current_campaign_id() references public.campaigns(id),
  contract_id uuid not null references public.contracts(id),
  channel text not null check (channel in ('whatsapp', 'email')),
  recipient text not null,
  sent_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index contract_deliveries_contract_id_idx on public.contract_deliveries (contract_id);
create index contract_deliveries_campaign_id_idx on public.contract_deliveries (campaign_id);

alter table public.contract_deliveries enable row level security;

-- Mesma autorização já usada em contracts_select (admin/rh da campanha
-- ou coordenador direto do alvo) — sem o caminho "é o próprio
-- contrato", que não faz sentido aqui (a pessoa não registra o
-- próprio envio).
create policy contract_deliveries_select on public.contract_deliveries for select to authenticated
  using (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh', 'auditor']))
    or contract_id in (
      select c.id from public.contracts c
      where c.person_id is not null
        and c.person_id in (
          select cr.subordinate_person_id from public.coordination_relationships cr
          where cr.coordinator_person_id = (select p.person_id from public.profiles p where p.id = (select auth.uid()))
            and cr.status = 'vigente'
        )
    )
  );

create policy contract_deliveries_insert on public.contract_deliveries for insert to authenticated
  with check (
    public.is_platform_admin()
    or (campaign_id = (select public.current_campaign_id()) and public.has_role(array['administrador', 'rh']))
    or contract_id in (
      select c.id from public.contracts c
      where c.person_id is not null
        and c.person_id in (
          select cr.subordinate_person_id from public.coordination_relationships cr
          where cr.coordinator_person_id = (select p.person_id from public.profiles p where p.id = (select auth.uid()))
            and cr.status = 'vigente'
        )
    )
  );
