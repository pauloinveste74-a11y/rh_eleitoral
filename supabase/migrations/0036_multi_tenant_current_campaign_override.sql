-- Multi-tenant, Etapa 2 — "modo de suporte": o master consegue "entrar"
-- numa organização específica (spec original, seção 6.3), pedido depois
-- de testar a Etapa 1.
--
-- Reaproveita request_headers() (já existe desde a 0033, mesma técnica
-- já validada em produção pro IP/user-agent da auditoria via
-- current_setting('request.headers')). Quando o chamador é
-- is_platform_admin() E o header x-active-campaign-id vier preenchido
-- com um UUID válido, current_campaign_id() passa a devolver esse
-- valor; senão cai no comportamento de sempre (profiles.campaign_id).
--
-- Zero mudança em qualquer policy — as ~40 policies que já usam
-- campaign_id = current_campaign_id() continuam exatamente iguais; só
-- o que essa função devolve muda, e só pra quem é platform admin. Pra
-- um usuário comum, current_campaign_id() se comporta exatamente como
-- antes (o "if" nem entra).
--
-- O regex antes do ::uuid evita erro se alguém adulterar o cookie
-- (httpOnly, mas ainda editável via devtools) — sem isso um valor
-- malformado quebraria toda query que dependesse desta função.

create or replace function public.current_campaign_id()
returns uuid
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_override text;
begin
  if coalesce((select is_platform_admin from public.profiles where id = auth.uid()), false) then
    v_override := public.request_headers() ->> 'x-active-campaign-id';
    if v_override ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      return v_override::uuid;
    end if;
  end if;
  return (select campaign_id from public.profiles where id = auth.uid());
end;
$$;

revoke all on function public.current_campaign_id() from public, anon, authenticated;
grant execute on function public.current_campaign_id() to authenticated;
