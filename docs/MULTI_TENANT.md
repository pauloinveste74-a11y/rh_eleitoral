# Multi-tenant — matriz requisito × estado real

> Especificação-fonte: `docs/ESPECIFICACAO_MULTI_TENANT_RH_ELEITORAL_CLAUDE.md`
> (677 linhas). Etapa 1 e Etapa 2 concluídas em 15/09/2026 — ver
> `README.md`/`CONTEXT.md` pro relato completo.

## Achado central, antes de codificar

O banco **já era multi-tenant no nível de schema/RLS** desde a
migração `0005_multi_tenant_campaign_scoping.sql`, da iniciativa
anterior: toda tabela de negócio tem `campaign_id`, toda policy segue
`is_platform_admin() OR (campaign_id = current_campaign_id() AND
<papel>)`. O que faltava era inteiramente de produto/app — identidade
de CNPJ na organização, painel do master, login por CNPJ. Por isso a
Etapa 1 não precisou recriar `tenants`/`tenant_memberships`/
`permissions` do zero como a spec original sugere: reaproveitou
`campaigns`/`profiles`/`profile_roles`/`is_platform_admin()` como já
existiam.

## Matriz por seção da spec

🟢 existente · 🟡 parcial · 🔴 ausente

| # | Requisito | Estado |
|---|---|---|
| 4/5.1 | Master cadastra organizações com CNPJ | 🟢 **Etapa 1** — `/master/organizacoes`, migração `0035` |
| 5.2 | Administrador da organização (escopo só da própria) | 🟢 Já existia via `campaign_id`/RLS (iniciativa anterior) |
| 5.3 | Usuário com múltiplos vínculos (vários tenants) | 🔴 Fora de escopo — `profiles.campaign_id` continua singular, por pedido explícito do usuário ("trabalhar na sua campanha ou empresa") |
| 6 | Jornada do master (cadastrar 1ª organização, convidar admin) | 🟢 **Etapa 1** — `createOrganization()`, com `linkSelfAsAdmin()` resolvendo o bootstrap (master também vira membro da 1ª organização) |
| 6.3 | Modo de suporte (master "entra" temporariamente numa organização) | 🟢 **Etapa 2** — `enterOrganization()`/`exitSupportMode()`, cookie `active_campaign_id` lido em `src/lib/supabase/server.ts`, `current_campaign_id()` (migração `0036`) devolve o override só pra `is_platform_admin()`. Faixa persistente "Você está administrando..." |
| 7 | Cadastro da organização (identificação/contato/representante/config) | 🟡 **Etapa 1** cobre nome/CNPJ/razão social/nome fantasia. Contato, sede, representante, módulos habilitados, limites — não implementados |
| 8 | Convite do primeiro administrador | 🟡 **Etapa 1** — sem token/e-mail de convite; reaproveita o padrão de `usuarios/actions.ts#inviteUser()` (cria direto com senha derivada do telefone, mesmo já usado pra convidar usuários comuns) |
| 9 | Login com seleção de organização | 🟢 **Etapa 1** — CNPJ + e-mail + senha, comparado contra `campaigns.document_number` após autenticar. Desvio deliberado da spec: seção 9.2 descreve CNPJ como atalho opcional; o usuário pediu explicitamente obrigatório pra todo mundo (exceto o master, pelo motivo do bootstrap) |
| 10 | Estrutura de banco (`tenants`, `tenant_memberships`, `permissions`...) | 🔴 Não criada — reaproveitado `campaigns`/`profiles`/`profile_roles`/`roles` já existentes, que já cobrem o mesmo isolamento |
| 11 | RLS e autorização | 🟢 Já existia (iniciativa anterior) — nenhuma policy nova ou alterada nesta etapa (conferido em `pg_policies` antes de codificar) |
| 12 | Storage de documentos por tenant | 🟢 Já usa `campaign_id` como primeiro segmento do path — equivalente ao pedido |
| 13 | Estados da organização (draft/pending/active/suspended/archived) | 🟡 Continua só `ativa/encerrada/arquivada` (já existia) — estados adicionais não implementados |
| 14 | Assistente de implantação (checklist) | 🔴 Ausente |
| 15 | Importação multi-tenant (confirmar org de destino) | 🔴 Ausente — importação (Excel/PDF) continua implícita na campanha do usuário logado |
| 16 | Auditoria (ações do master, criação de organização) | 🟢 **Etapa 1** — `log_audit_event` em `organizacao.criar`/`organizacao.administrador.adicionar`/`organizacao.vincular_self`/`organizacao.status.alterar` |
| 17 | Rotas (`/master/organizacoes`...) | 🟢 **Etapa 1** — `/master/organizacoes`, `/master/organizacoes/[id]` |
| 18 | Catálogo granular de permissões | 🔴 Não criado — continua usando `roles`/`has_role()` como já existia |
| 21 | Migração de dados existentes | 🟢 Não se aplicou — banco tinha 1 profile/1 campaign/0 people no início da Etapa 1, sem dado de terceiro a migrar |

## Fora de escopo (deliberado, documentado)

- Usuário com vínculo em mais de uma organização.
- Catálogo granular de permissões (`permissions`/`role_permissions`).
- Tabela `invitations` com token expirável (usa o padrão de criação
  direta já usado em `/usuarios`).
- Assistente de implantação / checklist de onboarding.
- Estados adicionais de organização além de `ativa/encerrada/arquivada`.
- Importação (Excel/PDF) com confirmação explícita de organização de
  destino — continua implícita na campanha do usuário logado.

## Etapa 2 — modo de suporte + master aterrissa em `/master/organizacoes`

Depois de testar a Etapa 1, o usuário pediu explicitamente pra poder
"entrar" numa organização e trocar entre elas — exatamente o modo de
suporte que a Etapa 1 tinha deixado de fora. Resumo (relato completo
no `README.md`):

- `current_campaign_id()` (migração `0036`) passou a aceitar um
  override via header `x-active-campaign-id`, só pra quem é
  `is_platform_admin()` — reaproveita `request_headers()` (já existia
  desde a `0033`). Nenhuma das ~40 policies que já usam
  `campaign_id = current_campaign_id()` mudou.
- Cookie `active_campaign_id` (`httpOnly`) carrega qual organização o
  master está "vendo" — setado por `enterOrganization()`, limpo por
  `exitSupportMode()` e no logout.
- Faixa persistente (`SupportModeBanner`) avisa qual organização está
  ativa, com botão pra voltar ao painel master.
- Login sem `redirectTo` explícito: `is_platform_admin` cai em
  `/master/organizacoes` em vez de `/painel`.
- Pedido de senha com 4 dígitos (em vez de 6) foi recusado depois de
  explicar a restrição real do Supabase Auth (mínimo 6 caracteres) —
  usuário confirmou manter 6.

## Próxima etapa proposta

Nenhuma decidida ainda — a critério do usuário. Candidato natural:
completar os campos de endereço/contato da organização (spec seção
7.2), ou usuário com vínculo em mais de uma organização.
