# Contexto do projeto — RH Eleitoral

> Documento de handoff: resume o estado do projeto para quem (pessoa ou
> IA) for continuar o trabalho sem precisar reconstruir o histórico a
> partir do zero. Complementa o `README.md` (que documenta a arquitetura
> e cada módulo em detalhe) — aqui o foco é "onde as coisas estão e o
> que falta fazer".

## O que é

Sistema de gestão de pessoas, aprovações, pagamentos e despesas para uma
campanha eleitoral (multi-tenant — suporta mais de uma campanha isolada
no mesmo banco). Construído incrementalmente, fase por fase, numa única
sessão longa de trabalho com o usuário.

## Onde está publicado

| O quê | Onde |
| --- | --- |
| Repositório | `github.com/pauloinveste74-a11y/rh_eleitoral`, branch `main` |
| Produção | `https://rh-eleitoral.vercel.app` (deploy automático a cada push em `main`) |
| Vercel | Projeto `rh-eleitoral`, conta `pauloinveste74-a11y` |
| Supabase | Projeto `pjjarkxwwzqiajlvpsdx` (Postgres 17 + Auth + Storage) |
| Campanha ativa | "Bia Kicis - Senadora" |
| Super admin de plataforma | `pauloinvest74@gmail.com` (senha: `Mudar123@`) — enxerga todas as campanhas via `profiles.is_platform_admin` |

## Stack

Next.js 16 (App Router, Turbopack) + TypeScript estrito + Tailwind CSS 4
+ componentes Radix copiados (não é dependência de lib) + React Hook
Form/Zod para formulários + Server Actions para mutações + Supabase
(Postgres/Auth/Storage) com RLS como única camada real de autorização.

**Atenção — não é o Next.js que você conhece.** Este projeto está na
versão 16, com breaking changes reais (proxy no lugar de middleware,
etc.). Antes de escrever código, leia `node_modules/next/dist/docs/` a
partir da raiz do projeto — isso já está reforçado em `AGENTS.md`.

## Estado atual: todas as 9 fases entregues

| Módulo | Rota | Fase (numeração real) |
| --- | --- | --- |
| Base técnica (campanhas, papéis, eixos/cidades/equipes, pessoas, vínculos, auditoria) | — | 1A |
| Pessoas (cadastro, documentos) | `/pessoas` | 1B |
| Multi-tenant + super admin de plataforma | — | 1C |
| Aprovações (cidade → eixo) | `/aprovacoes` | 2 |
| Financeiro (pagamentos avulsos e em lote) | `/financeiro` | 3 |
| Despesas (reembolso com comprovante) | `/despesas` | 6 |
| Auditoria (trilha de eventos) | `/auditoria` | 7 |
| Relatórios (financeiro/pessoas/aprovações, filtro + CSV) | `/relatorios` | 8 |
| Usuários (criar acesso, papéis, trocar senha) | `/usuarios`, `/conta` | 9 |

**Ainda placeholder** (nunca implementados): **Ponto** (`/ponto`) e
**Operações** (`/operacoes`) — são os dois únicos itens do menu sem
funcionalidade real por trás.

A numeração de fase no README mistura o esquema original de
placeholders da Fase 1A com a ordem real de entrega — há uma tabela de
mapeamento completa na seção "Próxima fase" do `README.md`.

## Migrações (banco)

`supabase/migrations/0001` a `0012`, aplicadas em ordem via MCP do
Supabase e espelhadas em disco. Resumo rápido (detalhe completo no
README, seção "Modelo de dados"):

- `0001`–`0003`: schema inicial + hardening de segurança/performance.
- `0004`: tabelas satélite de pessoa (endereço, banco, eleitoral,
  documentos) + Storage.
- `0005`: multi-tenant (`campaign_id` em tudo, `current_campaign_id()`,
  `is_platform_admin()`).
- `0006`: fluxo de aprovações (coordenador de cidade/eixo).
- `0007`–`0008`: financeiro (pagamentos avulsos e em lote).
- `0009`: despesas/reembolso.
- `0010`: `auditor` ganha leitura de outros `profiles` (pra tela de
  Auditoria resolver nome do autor).
- `0011`: `rh` ganha leitura/edição de outros `profiles` (pra tela de
  Usuários).
- `0012`: `profiles.phone`.
- `0013`–`0028`: **camada de banco de uma iniciativa nova e separada**
  (spec `docs/IMPLEMENTACAO_CADASTRO_IMPORTACAO_DESPESAS.md` — autocadastro
  por convite, cadeia de coordenação, importação por Excel, despesas com
  autorizador/alçada). Aplicadas e verificadas (advisors + testes
  funcionais/RLS diretos no banco, em transação com `rollback`) — ver
  seção própria "MVP — Cadastro, Convite, Coordenação, Importação e
  Despesas" no `README.md` para o detalhe completo, etapa por etapa.
  `0022` (Etapa 2) resolve o mecanismo de sessão: coordenador com login
  normal (reaproveita `/usuarios`), cabo eleitoral só com link/token,
  nunca loga — preenche o elo `profiles.person_id` que existe desde a
  `0001` e nunca tinha sido usado. `0023` (Etapa 4) fecha o primeiro
  ciclo: gestor aprova/rejeita/pede correção
  (`decide_registration_submission()`) — durante o teste dessa função
  encontrei e corrigi um bug real de autorização (NULL propagando por
  AND/OR deixava `if not v_authorized` não disparar pra um chamador sem
  vínculo nenhum); as outras 4 funções de decisão do projeto já eram
  imunes a esse padrão, conferido depois. `0024` (Etapa 5) fecha o
  segundo: RH valida/rejeita/pede correção sobre o que o gestor já
  aprovou (`decide_rh_validation()`, só `administrador`/`rh`). A Etapa 6
  (importação em lote por Excel, `/importacoes`) **não precisou de
  migração nova** — as tabelas de importação e `people`/satélites já
  tinham policy de escrita direta para `administrador`/`rh` desde a
  Etapa 1/Fase 1C. `0025` (Etapa 7) **estende** `create_expense()` (não
  cria uma v2) com o autorizador de registro — como a lista de
  parâmetros cresceu, precisou de um `drop function` explícito antes do
  `create or replace` (Postgres identifica função por assinatura
  completa; só crescer a lista teria criado uma sobrecarga em vez de
  substituir). Também soma `financeiro` a `profiles_select` (mesmo
  padrão aditivo de `0010`/`0011`). `0026` (Etapa 8) só soma a policy de
  `delete` que faltava em `expense_authorization_rules` (tinha
  select/insert/update desde a `0020`, mas nunca delete) — necessária
  pra `/despesas/alcadas` poder remover uma regra. Etapa 9 (indicador de
  alçada com escopo + alçada por pessoa específica) não precisou de
  migração — só refino de app sobre o que já existia. `0027` (Etapa 10)
  implementa `revert_import_batch()` — durante o teste encontrei e
  corrigi um bug real (não de autorização desta vez): a função apagava
  `people` antes de desvincular `import_staging_records.person_id`,
  violando a FK (que é `RESTRICT`, não `CASCADE`) — corrigido invertendo
  a ordem. `0028` (Etapa 11) fecha duas lacunas juntas: o gestor/RH passa
  a poder apontar QUAIS campos precisam de correção (`p_field_names`), e
  — achado ao investigar isso — o cabo eleitoral (autocadastro público,
  sem login) **nunca conseguia reabrir** o próprio cadastro depois de
  uma correção solicitada (a página só olhava
  `registration_invites.status`, que fica `concluido` pra sempre).
  Corrigido com duas funções novas anon
  (`get_public_registration_status`/`update_public_registration`) e
  removendo um guard que bloqueava reenvio. Achado um segundo gap no
  mesmo teste: `correction_requests_select` só liberava admin/rh — o
  próprio coordenador não lia a própria correção pendente.
- `0029`: **início de uma segunda iniciativa separada**, ainda maior
  (`docs/NOVA_VERSAO_RH_ELEITORAL.md`) — cargos configuráveis
  (`job_functions`) e pessoa jurídica (`legal_entities`). Antes de
  qualquer código, foi levantada uma matriz requisito × estado real
  (`docs/NOVA_VERSAO_MATRIZ.md`) — boa parte da spec nova já estava
  coberta pela iniciativa anterior, e uma parte é schema pronto desde a
  Etapa 1 (`notifications`, `data_conflicts`, `expense_documents`,
  `expense_approvals`, `registration_field_reviews`) nunca usado por
  nenhum código. Checagem de credencial exposta feita antes de mexer em
  qualquer coisa (nada encontrado).
- Etapa 2 da mesma iniciativa (sem migração nova): `/painel` deixou de
  ser o placeholder fictício da Fase 1A — `src/lib/painel/dashboard.ts`
  monta indicadores reais (equipe do coordenador, pendências de
  validação/correção/convites, KPIs de campanha pra admin/RH, despesas/
  pagamentos pendentes pra financeiro/tesouraria) só com consultas sobre
  a RLS que as Etapas 2/11 da iniciativa anterior já tinham estendido —
  nenhuma política nova precisou ser criada.
- Etapa 3 (`0030`): dois bugs de produção achados investigando o schema
  ocioso de `person_documents` — `person_documents_select`/
  `pessoas_documentos_select` (Storage) nunca liberavam leitura pra "a
  própria pessoa"/"o gestor", e `uploadPersonDocument()` chamava
  `log_audit_event()` sem checar papel antes (que dá `raise exception`
  pra quem não é admin/rh) — um coordenador comum recebia erro do
  servidor depois do arquivo já salvo. Corrigidos junto com a função
  nova `record_person_document()` (hash com dedup + versionamento via
  `replaces_document_id` quando reenvia o mesmo tipo após
  ilegível/divergente). Ver `docs/NOVA_VERSAO_MATRIZ.md` pra detalhe.
- Etapa 4 (`0031`): `decide_person_document()` — gestor (coordenador
  direto via `coordination_relationships`) ou administrador/rh
  classificam um documento como aprovado/ilegível/divergente (motivo
  obrigatório pras duas últimas). `/validacoes` ganhou uma linha
  expandida por submissão da fila com os documentos ativos da pessoa e
  os três botões de classificação inline. Fecha o item 10 da spec.
- Etapa 5 (`0032`): módulo de contratos completo (spec seção 12) — a
  peça que a matriz apontava como maior e totalmente ausente. Quatro
  tabelas (`contract_templates`, `template_versions`, `contracts`,
  `contract_documents`) + bucket `contratos-documentos` + seis funções
  (`publish_template_version`, `set_template_legal_approval`,
  `generate_contract`, `mark_contract_downloaded`,
  `submit_signed_contract`, `decide_contract`). `generate_contract()`
  preenche os placeholders com dados reais e grava um snapshot imune a
  edição futura do modelo. Sem lib de PDF: o contrato gerado é servido
  como página imprimível (Ctrl+P), só a assinatura enviada de volta vira
  arquivo em `contract_documents`. `/contratos`, `/contratos/modelos`,
  `/contratos/[id]` novos, item "Contratos" na navegação.
- Etapa 6 (`0033`): resto do schema ocioso. `audit_logs.ip_address`/
  `user_agent` via **trigger** (`request_headers()` lê
  `current_setting('request.headers')`, GUC que o PostgREST expõe com
  os headers HTTP — achado testando ao vivo via `curl`/`rpc` antes de
  codificar) — zero função alterada, zero mudança no app.
  `correction_requests.previous_values`/`new_values` via
  `snapshot_correction_fields()`, chamada de `decide_registration_submission`/
  `decide_rh_validation` (previous) e `submit_registration_for_review`/
  `submit_public_registration_for_review` (new, no mesmo `UPDATE` que já
  resolvia a correção desde a Etapa 11). `expenses.authorized_amount_cents`
  via novo parâmetro opcional em `create_expense()` (drop+recreate, mesmo
  footgun de sempre). Fecha o item 4 da ordem proposta da Nova versão.
- Etapa 7 (`0034`): importação por PDF (spec 9.2), primeira fatia — só
  PDF com texto pesquisável (sem OCR), uma página = uma pessoa, **só
  criação** (nunca atualiza/vincula pessoa já existente, o que evita por
  completo o risco que a spec aponta de PDF/OCR alterar CPF/CNPJ/
  banco/PIX/função/coordenador/remuneração em silêncio). Reaproveita as
  mesmas tabelas de staging da importação por Excel — só ganhou a coluna
  `import_batches.source_type` (`'excel' | 'pdf'`) e o valor
  `people.origin = 'importacao_pdf'`; a validação/dedup
  (`classifyRow()`) é a função idêntica da importação por Excel, sem
  duplicação. Nova lib `pdf-parse` (2.4.5) só pra extrair texto —
  `@napi-rs/canvas` (dependência nativa dela, usada só por métodos que
  este projeto não chama) ainda não teve a instalação verificada no
  build da Vercel, só localmente. `/importacoes` ganhou um segundo
  cartão de upload (PDF) lado a lado com o de Excel.

## Etapas 3 a 11 — páginas de aplicação (autocadastro, validações, importação, despesas, correção)

`/meu-cadastro`, `/minha-equipe`, `/cadastro/[token]` (Etapa 3, com
correção campo a campo desde a Etapa 11), `/validacoes` (Etapa 4 — fila
do gestor; Etapa 5 — segunda seção, fila do RH, só visível a
administrador/rh), `/importacoes` (Etapa 6, com reversão desde a Etapa
10) e `/despesas`/`/despesas/alcadas` (Etapa 7/8/9) — todas
implementadas. Detalhe completo na seção "MVP — Cadastro, Convite,
Coordenação, Importação e Despesas" do `README.md`. Vale saber antes de
mexer:

- `PersonForm` (usado por `/pessoas`) ganhou props opcionais
  (`action`/`submitLabel`/`showSocialName`/`onSuccess`/`editableFields`)
  pra ser reaproveitado em `/meu-cadastro` e `/cadastro/[token]` sem duplicar a
  estrutura do formulário — nenhum uso existente em `/pessoas` mudou de
  comportamento.
- `src/types/database.ts` é mantido à mão (não é gerado automaticamente
  desde o MCP do Supabase) — cresce a cada fase que usa uma tabela/função
  nova. Ficou defasado desde a Etapa 1 (registration_invites,
  coordination_relationships, registration_submissions e os 8 valores
  novos de `PersonStatus` não estavam tipados); a Etapa 3 atualizou tudo
  que ela mesma passou a usar.
- **Dependência `xlsx` instalada fora do npm registry, de propósito**:
  `package.json` aponta pra
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` em vez de
  `"xlsx": "^0.20.3"`. A versão publicada no npm (`0.18.5`) tem 2 CVEs
  de severidade alta relevantes pra este uso exato (processar arquivo
  enviado por usuário) e o autor não publica correção no registry — o
  canal de distribuição oficial pra versão corrigida é o CDN da própria
  SheetJS. Rodar `npm update`/`npm install xlsx@latest` sem essa URL
  reintroduziria as duas vulnerabilidades — não "corrigir" essa entrada
  do `package.json` achando que é um erro de digitação.

## Referência completa de funções e rotas

`docs/FUNCOES_E_ROTAS.md` — lista **todas** as funções `SECURITY
DEFINER` do banco (assinatura, quem pode chamar, o que verifica, o que
faz) e **todas** as rotas do app, levantado direto do banco em produção.
Use esse arquivo pra consulta rápida de "o que existe"; este `CONTEXT.md`
e o `README.md` continuam sendo a referência de arquitetura/histórico.

## Identidade visual

`docs/IDENTIDADE_VISUAL.md` — acompanhamento da aplicação do manual de
marca (`docs/MANUAL_IDENTIDADE_VISUAL_RH_ELEITORAL_FINAL.docx`, Agilize
Tecnologia). Fases 1–4 aplicadas: tokens/tipografia/componentes-base/
navegação/login; ~44 telas com `slate-*` solto; sidebar recolhível +
números tabulares; logo vetorial (`src/components/layout/brand-mark.tsx`
— com variante `negative`, necessária porque a versão padrão desaparece
num fundo azul-marinho igual ao dela) + ícone automático por variante em
todo `Badge`. Pendente, documentado: modo escuro de marca (decisão do
dono da marca, manual pede pra adiar), mascaramento de CPF (achado real,
é feature de segurança, não CSS), gráficos (nada implementado ainda),
relatórios com layout em PDF.

## O que falta para o sistema funcionar de ponta a ponta

**Bloqueio ativo, único item realmente impeditivo:**
`SUPABASE_SERVICE_ROLE_KEY` **não está configurada em nenhum ambiente**
(nem `.env.local`, nem Vercel). Sem ela, `/usuarios` não consegue criar
usuário nem resetar senha (usa `auth.admin.createUser()`/
`updateUserById()`, que exigem essa chave). O restante do sistema
funciona normalmente sem ela.

Como resolver: painel do Supabase → Settings → API → `service_role`
secret → colar em `.env.local` (variável `SUPABASE_SERVICE_ROLE_KEY`) e
nas variáveis de ambiente do projeto no Vercel. **Nunca peça para colar
esse valor no chat** — é uma credencial que ignora RLS por completo.

## Padrões de arquitetura que vale conhecer antes de mexer no código

- **Multi-tenant por `campaign_id`**: toda tabela de domínio tem
  `campaign_id`; toda política de RLS filtra por
  `campaign_id = current_campaign_id()`, com bypass para
  `is_platform_admin()`. `roles` é o único catálogo global sem
  `campaign_id`.
- **RLS é a autorização real**, nunca só a UI. Toda tabela sensível não
  tem política de `INSERT`/`UPDATE` para o cliente — só funções
  `SECURITY DEFINER` (`create_payment()`, `decide_approval()`, etc.)
  escrevem, e cada uma dessas funções já checa o papel de quem chama
  internamente. Padrão de toda função nova:
  `set search_path = public` + `revoke all ... from public, anon,
  authenticated` + `grant execute ... to authenticated`.
- **`audit_logs` não tem política de `INSERT` para nenhum papel** — só
  `log_audit_event()` (chamável por `administrador`/`rh`) ou um insert
  direto dentro de uma função `SECURITY DEFINER` (para papéis que não
  são `administrador`/`rh`, como `decide_approval()`,
  `create_payment()`).
- **Login sempre e-mail + senha**, sem links de convite/magic link (foi
  removido — ver `README.md`, seção Usuários, para o histórico de por
  que essa decisão mudou de rumo três vezes na mesma fase).
- **Dinheiro em centavos** (`amount_cents bigint`), nunca float.
- **Bug conhecido do Next.js 16 e como evitá-lo**: qualquer Server
  Action que toque cookies de sessão do Supabase (`createClient()` de
  `src/lib/supabase/server.ts`) dispara um re-render completo da página
  no servidor, **mesmo sem `revalidatePath`**. Se um componente só é
  renderizado condicionalmente pelo pai, esse re-render pode desmontá-lo
  antes do usuário ver a mensagem de sucesso do próprio
  `useActionState`. Padrão de correção usado em todo o projeto: o
  componente fica **sempre montado** (o pai não condiciona a
  renderização), e o próprio componente decide internamente o que
  mostrar com base em `state.status === "success" || <condição do
  servidor>`. Ver `SendForApprovalCard`, `PaymentDecisionForm`,
  `ExpenseDecisionForm` como referência.
- **CSV, não PDF/Excel** para exportação de relatórios — mais simples de
  gerar num Route Handler, sem biblioteca extra.

## Pendências e riscos conhecidos (não são bugs escondidos — estão todos documentados no README)

- Senha inicial de usuário (`/usuarios`) é fraca por design: últimos 6
  dígitos do telefone, um dado não-secreto. Mitigação existente: página
  `/conta` para trocar a senha — mas nada **força** essa troca.
- Suspender usuário (`/usuarios/[id]`) muda `profiles.status`, mas
  nenhuma política de RLS checa esse campo ainda — não revoga sessão
  ativa de fato.
- Relatório de Aprovações (`/relatorios/aprovacoes`) é ilegível para um
  coordenador de cidade/eixo (herda a política de `audit_logs`, que só
  libera `administrador`/`auditor`).
- Nada nesta sessão foi testado interativamente via Playwright depois da
  Fase 3 — o usuário pediu explicitamente para parar de testar
  ("não vamos testar mais nada"). Toda fase construída depois disso foi
  verificada só por `typecheck`/`lint`/`build` + smoke-test via `curl`
  em produção (confirma que a rota existe e redireciona corretamente
  sem sessão) — nunca com um usuário real de ponta a ponta.
- Isolamento entre campanhas nunca foi testado com um segundo usuário
  não-admin real (só o super admin, que atravessa todo o isolamento).
- Lista completa e atualizada de pendências: `README.md`, seções
  "Riscos e pendências desta fase" e "Próxima fase" (a mais confiável —
  é reescrita a cada entrega).

## Convenções de trabalho desta sessão (uteis para continuar no mesmo estilo)

- Cada fase nova: aplicar migração via MCP do Supabase
  (`project_id: pjjarkxwwzqiajlvpsdx`) → `get_advisors` (security) →
  escrever o `.sql` em `supabase/migrations/` → código → `npm run
  typecheck && npm run lint && npm run build` → commit (mensagem em
  português, trailer `Co-Authored-By: Claude Sonnet 5
  <noreply@anthropic.com>`) → `git push origin main` → aguardar o
  deploy do Vercel ficar `Ready` (`vercel ls rh-eleitoral --prod`) →
  smoke-test das rotas novas via `curl` (espera-se `307` para
  `/login?redirectTo=...` sem sessão) → atualizar `README.md` (banner,
  seção do módulo, RLS, riscos, testes realizados, próxima fase).
- Toda decisão de escopo ambígua foi perguntada ao usuário antes de
  implementar (via pergunta de múltipla escolha) — não assumir
  silenciosamente um comportamento quando há mais de uma interpretação
  razoável e a escolha muda o resultado.
- Pendências e limitações são sempre documentadas no README, nunca
  escondidas — inclusive quando a causa é uma decisão explícita do
  próprio usuário (ex.: senha fraca por design).
