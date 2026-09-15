# Funções do banco e mapa do app — referência técnica completa

> Documento de referência: lista **todas** as funções `SECURITY DEFINER`
> (e afins) do banco e **todas** as rotas do app, com o que cada uma faz,
> quem pode chamar e o que verifica. Não substitui o `README.md` (que
> documenta a arquitetura, o modelo de dados e o histórico de cada fase
> em prosa) nem o `CONTEXT.md` (handoff rápido) — este aqui é pra
> consulta direta de "o que existe e o que faz", levantado diretamente do
> banco em produção (`pjjarkxwwzqiajlvpsdx`) e do código-fonte.
>
> Gerado depois da Etapa 11 (última etapa da iniciativa de Cadastro/
> Convite/Coordenação/Importação/Despesas — ver
> `docs/IMPLEMENTACAO_CADASTRO_IMPORTACAO_DESPESAS.md`). Se uma fase nova
> adicionar função ou rota, atualize este arquivo também.

## Como ler isto

Cada função lista: **assinatura**, **quem pode chamar** (`anon` e/ou
`authenticated`, conferido via `information_schema.routine_privileges` —
nunca assuma pelo nome), **o que verifica antes de escrever** e **o que
faz**. Todas são `SECURITY DEFINER` (escrevem ignorando RLS, se
autorizando sozinhas por código) a menos que indicado o contrário. Padrão
do projeto: `set search_path = public`, `revoke all from public, anon,
authenticated` + `grant execute` só pra quem precisa.

---

## 1. Funções auxiliares de autorização (sempre `stable`, sem efeito colateral)

| Função | Retorna | O que faz |
| --- | --- | --- |
| `current_campaign_id()` | `uuid` | Campanha do `auth.uid()` atual (via `profiles.campaign_id`). Base de todo filtro multi-tenant. |
| `is_platform_admin()` | `boolean` | `true` se `profiles.is_platform_admin` do chamador — atravessa o isolamento entre campanhas. |
| `is_admin()` | `boolean` | Atalho pra `has_role(['administrador'])` — só o papel `administrador`, não `rh`. |
| `has_role(role_codes text[])` | `boolean` | `true` se o chamador tem algum dos papéis informados, vigente (`profile_roles` dentro de `valid_from`/`valid_until`). A checagem de papel mais usada do projeto. |
| `is_city_coordinator_for(p_city_id uuid)` | `boolean` | `true` se o chamador é coordenador vigente dessa cidade. |
| `is_axis_coordinator_for(p_axis_id uuid)` | `boolean` | `true` se o chamador é coordenador vigente desse eixo. |

## 2. Auditoria

| Função | Quem chama | O que faz |
| --- | --- | --- |
| `log_audit_event(p_action, p_entity_table, p_entity_id, p_before_data?, p_after_data?, p_reason?, p_result?, p_related_request_id?)` | `authenticated` | Só grava se o chamador tiver papel `administrador`/`rh` (checa `has_role` internamente) — é por isso que funções chamadas por outros papéis (coordenador, financeiro, tesouraria...) fazem `insert into audit_logs` direto em vez de chamar esta. |

`audit_logs` não tem policy de `INSERT` pra nenhum papel — só esta
função ou um insert direto dentro de outra função `SECURITY DEFINER`.

## 3. Aprovações (Fase 2)

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `decide_approval(p_person_id, p_decision, p_reason?)` | `authenticated` | `is_platform_admin()` ou `is_admin()` ou (se `people.status = 'pendente_validacao_cidade'`) `is_city_coordinator_for()` da cidade vigente da pessoa, ou (se `'pendente_validacao_eixo'`) `is_axis_coordinator_for()` do eixo | `aprovar` avança o status (`pendente_validacao_cidade` → `pendente_validacao_eixo` → `aprovado`); `rejeitar` encerra o vínculo organizacional e marca `rejeitado`. Audita com insert direto (coordenador não é admin/rh). |

## 4. Financeiro (Fase 3)

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `create_payment(p_person_id, p_amount_cents, p_description)` | `authenticated` | `administrador`/`financeiro`; pessoa `ativo`; valor > 0 | Cria pagamento avulso `pendente`, com snapshot dos dados bancários da pessoa (`bank_snapshot`) no momento da criação. |
| `create_payment_batch(p_reference_period, p_description, p_amount_cents, p_person_ids[])` | `authenticated` | `administrador`/`financeiro` | Cria um `payment_batches` + um `payments` `pendente` (mesmo valor) por pessoa da lista, todos com snapshot bancário. |
| `decide_payment(p_payment_id, p_decision, p_reason?)` | `authenticated` | `cancelar`: `administrador`/`financeiro`. `pagar`/`rejeitar`: `administrador`/`tesouraria` | Muda o status (`pago`/`rejeitado`/`cancelado`), grava `payment_date` se pago. |

## 5. Despesas (Fase 6, autorizador/alçada nas Etapas 1/7/8/9)

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `create_expense(p_person_id, p_category, p_amount_cents, p_description, p_expense_date, p_receipt_storage_path, p_category_id?, p_purpose?, p_vendor_name?, p_vendor_document?, p_payment_method?, p_purchaser_person_id?, p_authorized_by_profile_id?, p_unidentified_authorizer_name?, p_unidentified_authorizer_phone?, p_unidentified_authorizer_reason?, p_authorization_channel?)` | `authenticated` | `administrador`/`financeiro`; pessoa `ativo`; valor > 0; categoria no enum legado válida; autorizador informado por **um** caminho só (pessoa do sistema OU não identificado, nunca os dois) | Cria a despesa `pendente`. Se `p_authorized_by_profile_id` informado, tira snapshot de nome/telefone/papel vigente do autorizador. Gera `protocol` automático (`EXP-AAAAMMDD-XXXXXX`). **11 parâmetros finais opcionais, acrescentados na Etapa 7** — assinatura de 6 parâmetros da Fase 6 foi descontinuada (`drop function`), não existe mais como overload. |
| `decide_expense(p_expense_id, p_decision, p_reason?)` | `authenticated` | `cancelar`: `administrador`/`financeiro`. `pagar`/`rejeitar`: `administrador`/`tesouraria` | Mesmo padrão de `decide_payment` — nunca mudou de assinatura, mesmo com toda a extensão de `create_expense`. |

A alçada (`expense_authorization_rules`) é só **informativa**, calculada
no app (`src/lib/expenses/alcada.ts`), não dentro de nenhuma função —
não bloqueia criação nem decisão.

## 6. Autocadastro, convite e coordenação (Etapas 1–2, 11)

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `redeem_registration_invite(p_token)` | **`anon`** e `authenticated` | Token existe; não está `expirado`/`cancelado`/`concluido`; dentro do prazo; `uses_count < max_uses` | Primeira função do projeto liberada pra `anon` — protegida só pelo token, não por RLS/sessão. Marca `criado` → `acessado` na primeira leitura, `opened_at`. |
| `complete_own_registration(p_full_name, p_cpf, p_birth_date, p_phone, p_whatsapp, p_email, p_address?, p_bank?, p_electoral?)` | `authenticated` | Chamador tem `profiles.campaign_id` | Cria (1ª vez) ou edita a **própria** `people` do chamador — liga `profiles.person_id` na criação. Upsert dos 3 satélites a partir de jsonb. Usada por `/meu-cadastro`. |
| `create_team_invite(p_contact_name?, p_contact_phone?, p_contact_email?, p_expires_in_days default 7)` | `authenticated` | Chamador já tem `profiles.person_id` preenchido | Cria um convite pra um subordinado — herda cidade/eixo do `profile_roles` do chamador se ele for `coordenador_cidade`/`coordenador_eixo`. Usada por `/minha-equipe`. |
| `submit_public_registration(p_token, p_full_name, p_cpf, p_birth_date, p_phone, p_whatsapp, p_email, p_address?, p_bank?, p_electoral?)` | **`anon`** e `authenticated` | Token válido (mesmas regras de `redeem_registration_invite`); convite ainda sem `person_id` (só cria uma vez) | Cria a `people` do cabo eleitoral; liga `registration_invites.person_id`; marca `em_preenchimento`; cria o vínculo em `coordination_relationships` com o coordenador sugerido no convite. |
| `get_public_registration_status(p_token)` *(Etapa 11)* | **`anon`** e `authenticated` | Token existe | **Só leitura** — devolve `invite_status`, `person_status`, os dados atuais da pessoa (pra pré-popular formulário) e a correção pendente (motivo + campos), tudo num `returns table`. Base de `/cadastro/[token]` pra decidir o que mostrar. |
| `update_public_registration(p_token, p_full_name, p_cpf, p_birth_date, p_phone, p_whatsapp, p_email, p_address?, p_bank?, p_electoral?)` *(Etapa 11)* | **`anon`** e `authenticated` | Token existe; convite não `cancelado`; `people.status` em `correcao_solicitada`/`reenviado` | Reedita os dados do cabo eleitoral depois de uma correção solicitada — diferente de `submit_public_registration`, que só cria uma vez. Marca `reenviado`. |
| `submit_registration_for_review(p_person_id)` | `authenticated` | Chamador é `administrador`/`rh`, ou é a própria pessoa (`profiles.person_id = p_person_id`); ≥ 1 documento `ativo` | Cria `registration_submissions` (`aguardando_validacao_gestor`), marca `people.status = 'aguardando_gestor'`, resolve correção pendente anterior (`correction_requests.resolved_at`, Etapa 11). Usada por `/meu-cadastro`. |
| `submit_public_registration_for_review(p_token)` | **`anon`** e `authenticated` | Convite com `person_id` preenchido; ≥ 1 documento `ativo` | Mesmo papel da anterior, variante sem sessão pro cabo eleitoral. **Desde a Etapa 11, não exige mais `invite.status ≠ 'concluido'`** — permite reenvio depois de correção. |
| `record_person_document(p_person_id, p_document_type, p_storage_path, p_file_name, p_mime_type, p_file_size_bytes, p_file_hash?)` *(Nova versão, Etapa 3 — `0030`)* | `authenticated` | Chamador é `administrador`/`rh`, ou é a própria pessoa | Escreve `person_documents` — rejeita duplicata exata (mesmo hash já `ativo`); se reenviar o mesmo `document_type` depois de `ilegivel`/`divergente`, a nova linha vira substituta (`replaces_document_id`) e a antiga é marcada `removido`. Usada por `uploadPersonDocument()` (`/pessoas`, `/meu-cadastro`); o upload anônimo (`/cadastro/[token]`) replica a mesma lógica em TypeScript com o cliente admin, porque não tem `auth.uid()` pra chamar a função. Auditoria condicional (admin/rh via `log_audit_event()`, senão insert direto). Corrigiu de brinde duas policies de leitura (`person_documents_select`, Storage `pessoas_documentos_select`) que nunca liberavam "a própria pessoa"/"o gestor" — só admin/rh/auditor liam antes desta etapa. |

## 7. Fila de validação — gestor e RH (Etapas 4, 5, 11)

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `decide_registration_submission(p_submission_id, p_decision, p_reason?, p_field_names?)` | `authenticated` | `administrador`/`rh`, ou a pessoa cujo `people.id` bate com `manager_person_id` da submissão (gestor pessoa física); submissão em `aguardando_validacao_gestor` | `aprovar` → `aprovado_gestor`; `rejeitar` → `rejeitado`; `solicitar_correcao` → `correcao_solicitada` + cria `correction_requests` com os campos apontados (`p_field_names`, Etapa 11). Audita com insert direto (gestor comum não é admin/rh). |
| `decide_rh_validation(p_submission_id, p_decision, p_reason?, p_field_names?)` | `authenticated` | **Só** `administrador`/`rh` (sem caminho "gestor pessoa física" — diferente da anterior); submissão em `aprovado_gestor` | `validar` → `validado`; `rejeitar` → `rejeitado`; `solicitar_correcao` → `correcao_solicitada` + `correction_requests`. Audita via `log_audit_event()` direto (só admin/rh chama, sempre pode). |
| `decide_person_document(p_document_id, p_review_status, p_rejection_reason?)` *(Nova versão, Etapa 4 — `0031`)* | `authenticated` | Chamador é `administrador`/`rh`, ou é o coordenador direto da pessoa do documento (`coordination_relationships` vigente) | Classifica um documento (`aprovado`/`ilegivel`/`divergente`, motivo obrigatório pras duas últimas) — `reviewed_by`/`reviewed_at`/`rejection_reason`. Usada por `/validacoes` (linha expandida de documentos em cada submissão da fila). |

**Bug de segurança corrigido durante a Etapa 4** (documentado em detalhe
no `README.md`): a primeira versão de `decide_registration_submission`
deixava `NULL` se propagar pelo `AND`/`OR` da checagem de autorização
quando o chamador não tinha `profiles.person_id` — `if not v_authorized`
não disparava pra `NULL`. Corrigido com guard `is not null` +
`coalesce(..., false)`.

## 8. Importação em lote (Etapas 1, 6, 10)

Só **uma** função — o resto do fluxo (criar lote, gravar staging,
confirmar) é feito por inserts/updates diretos do app, porque
`administrador`/`rh` já tinham policy de escrita direta em
`import_batches`/`import_staging_records`/`people`/satélites desde a
Fase 1C/Etapa 1.

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `revert_import_batch(p_batch_id)` | `authenticated` | `administrador`/`rh`; lote `confirmado`; **nenhuma** pessoa do lote pode ter `status` além de `rascunho` ou qualquer vínculo posterior (pagamento, despesa, vínculo organizacional, cadeia de coordenação, submissão de cadastro, login vinculado) | Tudo ou nada: se qualquer pessoa estiver bloqueada, falha sem apagar nada. Senão, desvincula `import_staging_records.person_id` (volta pra `'pronta'`), apaga as `people` do lote (e satélites), marca o lote `revertido`. |

## Contratos (Nova versão, Etapa 5 — migração `0032`)

Módulo completo: `contract_templates` (catálogo, leitura liberada a
qualquer `authenticated` da campanha, escrita administrador/rh),
`template_versions` (conteúdo versionado, só escrito via função),
`contracts` (snapshot gerado, só escrito via função),
`contract_documents` (só o PDF assinado enviado de volta — o contrato
gerado não vira arquivo, é servido como página imprimível a partir de
`contracts.generated_body`).

| Função | Quem chama | Verifica | O que faz |
| --- | --- | --- | --- |
| `publish_template_version(p_contract_template_id, p_body, p_valid_from?, p_valid_until?)` | `authenticated` | `administrador`/`rh` | Publica versão nova (auto-incrementa `version_number`), marca a versão `ativo` anterior como `substituido`, ativa o modelo se ainda `rascunho`. |
| `set_template_legal_approval(p_contract_template_id, p_approved, p_note?)` | `authenticated` | `administrador`/`juridico` | Aprova/reprova o modelo (spec 12.1) — `legal_approval_status`/`legal_approved_by`/`legal_approved_at`. |
| `generate_contract(p_template_version_id, p_person_id?, p_legal_entity_id?, p_job_function_id?, p_position_override?, p_value_cents?, p_start_date?, p_end_date?)` | `authenticated` | Exatamente pessoa OU empresa; tipo do modelo compatível; PF: `administrador`/`rh` ou coordenador direto (`coordination_relationships`); PJ: só `administrador`/`rh` | Preenche os placeholders com dados reais (`people`/`person_addresses`/`organizational_assignments`/`coordination_relationships` ou `legal_entities`) e grava o snapshot (`generated_body`/`variables_used`) — imune a edição futura do modelo. Valor em BRL formatado sem depender de locale da sessão. |
| `mark_contract_downloaded(p_contract_id)` | `authenticated` | `administrador`/`rh`, a própria pessoa, ou o coordenador direto | `gerado`/`disponivel` → `baixado`. Chamada ao abrir `/contratos/[id]`. |
| `submit_signed_contract(p_contract_id, p_storage_path, p_file_name, p_mime_type, p_file_size_bytes)` | `authenticated` | Mesmo conjunto da anterior | Grava `contract_documents` (`kind='assinado'`) e muda o contrato pra `assinado_enviado`. |
| `decide_contract(p_contract_id, p_decision, p_reason?)` | `authenticated` | `administrador`/`rh` ou o coordenador direto; contrato em `assinado_enviado` | `validar` → `assinado_e_validado`; `solicitar_correcao`/`recusar` → `correcao_solicitada`/`recusado` (motivo obrigatório). |

## 9. Gatilhos (`trigger`, nunca chamados direto pelo app)

| Função | Dispara em | O que faz |
| --- | --- | --- |
| `check_same_campaign()` | `before insert/update` de várias tabelas (`cities`, `teams`, `organizational_assignments`, `payments`, `expenses`, `registration_invites`, `coordination_relationships`, `registration_submissions`) | Reescrita cumulativa — um `elsif TG_TABLE_NAME = '...'` por tabela — impede gravar uma referência (eixo/cidade/pessoa/lote) de outra campanha. |
| `check_coordination_cycle()` | `before insert/update` em `coordination_relationships` | CTE recursiva (profundidade ≤ 20) — rejeita um vínculo que criaria um ciclo de coordenação (A coordena B, B coordena A). |
| `set_updated_at()` | `before update` em várias tabelas | `updated_at = now()`. |
| `handle_new_user()` | `after insert` em `auth.users` | Cria a linha em `profiles` automaticamente quando um usuário novo é criado (sem `campaign_id` — completado depois por quem convidou, via `createAdminClient()`). |

---

## 10. Mapa do app — todas as rotas

Convenção: `ƒ` = renderizada no servidor por requisição (`force-dynamic`
ou por natureza); `○` = estática. Todas as rotas dentro do grupo `(app)`
exigem sessão (bloqueio otimista no `proxy.ts` + checagem de novo no
`layout.tsx`); `/login` e `/cadastro/[token]` são as únicas públicas
(`PUBLIC_ROUTES`).

### Públicas (fora do grupo `(app)`)

| Rota | Descrição |
| --- | --- |
| `/` | Redireciona pro painel ou login. |
| `/login` | E-mail + senha. Sem magic link/convite por e-mail (decisão explícita, ver histórico no README). |
| `/cadastro/[token]` | Autocadastro público do cabo eleitoral — sem login, protegido pelo token. Fluxo em 3 passos na mesma página (dados → documento → concluído), com reabertura pra correção desde a Etapa 11. |

### Painel e Pessoas (Fase 1A/1B)

| Rota | Descrição |
| --- | --- |
| `/painel` | Dashboard inicial — indicadores reais por papel (KPIs de campanha para administrador/RH, despesas/pagamentos pendentes para financeiro/tesouraria, "Minha equipe" para quem coordena, lista de cadastros recentes escopada pela RLS). Sem função nova: usa `src/lib/painel/dashboard.ts` sobre a RLS já existente (Nova versão, Etapa 2). |
| `/pessoas` | Lista de pessoas cadastradas (cadastro administrativo). |
| `/pessoas/novo` | Formulário de cadastro manual (`PersonForm`). |
| `/pessoas/[id]/editar` | Edição + upload de documento + enviar para aprovação (cidade/eixo). |
| `/empresas` *(Nova versão, Etapa 1)* | Cadastro-mestre de pessoa jurídica (`legal_entities`) — só administrador/rh; cria e lista, sem edição/documento ainda (contrato de PJ já é possível via `/contratos`, Etapa 5). |

### Contratos (Nova versão, Etapa 5)

| Rota | Descrição |
| --- | --- |
| `/contratos` | Lista (RLS-scoped: admin/rh/auditor vê tudo, self/coordenador vê o próprio/da equipe) + formulário de geração individual (PF ou PJ, modelo, cargo, valor, datas — `generate_contract()`). |
| `/contratos/modelos` | Criar modelo, publicar versão (`publish_template_version()`), aprovação jurídica (`set_template_legal_approval()`) — administrador/rh/jurídico. |
| `/contratos/[id]` | Visualização imprimível do contrato gerado (Ctrl+P, sem lib de PDF), upload da assinatura (`submit_signed_contract()`), conferência do gestor/RH (`decide_contract()`). |

### Autocadastro e equipe (Etapas 2/3/11)

| Rota | Descrição |
| --- | --- |
| `/meu-cadastro` | O próprio usuário logado (normalmente coordenador) completa/edita os próprios dados via `complete_own_registration()`. Mostra aviso e trava campos quando há correção pendente (Etapa 11). |
| `/minha-equipe` | Lista e cria convites (`create_team_invite()`) pra subordinados; link compartilhável por WhatsApp/cópia. |

### Validação (Etapas 4/5/11)

| Rota | Descrição |
| --- | --- |
| `/validacoes` | Duas filas: "Minha equipe" (gestor, `decide_registration_submission()`) e "Validação do RH" (só admin/rh, `decide_rh_validation()`), cada uma com aprovar/solicitar correção (com checklist de campos)/rejeitar. Cada submissão da fila mostra também os documentos ativos da pessoa, com classificação inline (`decide_person_document()`, Nova versão Etapa 4). |

### Importação em lote (Etapas 1/6/10)

| Rota | Descrição |
| --- | --- |
| `/importacoes` | Upload de planilha `.xlsx` + lista de lotes enviados. |
| `/importacoes/[id]` | Prévia linha a linha (nome/CPF/resultado/erro); confirmar, cancelar ou (se já confirmado) reverter o lote. |

### Aprovações e Financeiro (Fases 2/3)

| Rota | Descrição |
| --- | --- |
| `/aprovacoes` | Fila de validação de cidade/eixo sobre `people.status` (`decide_approval()`). |
| `/financeiro` | Lista de pagamentos avulsos/em lote. |
| `/financeiro/novo` | Novo pagamento avulso (`create_payment()`). |
| `/financeiro/lote/novo` | Novo lote de pagamento (`create_payment_batch()`). |

### Despesas (Fase 6, Etapas 1/7/8/9)

| Rota | Descrição |
| --- | --- |
| `/despesas` | Lista de despesas, com protocolo, autorizador e selo de alçada. |
| `/despesas/novo` | Nova despesa — categoria estruturada, fornecedor, forma de pagamento, comprador, autorizador de registro (pessoa do sistema ou não identificado), canal. |
| `/despesas/alcadas` | Só administrador — configura teto de valor por papel ou por pessoa específica, com escopo opcional de eixo/cidade. |

### Auditoria e Relatórios (Fases 7/8)

| Rota | Descrição |
| --- | --- |
| `/auditoria` | Trilha de eventos (`audit_logs`). |
| `/relatorios` | Índice dos relatórios. |
| `/relatorios/pessoas` (+ `/export`) | Relatório de pessoas, filtro + CSV. |
| `/relatorios/aprovacoes` (+ `/export`) | Relatório de aprovações, filtro + CSV. |
| `/relatorios/financeiro` (+ `/export`) | Relatório financeiro, filtro + CSV. |

### Usuários e conta (Fase 9)

| Rota | Descrição |
| --- | --- |
| `/usuarios` | Convida usuário (precisa de `SUPABASE_SERVICE_ROLE_KEY`, bloqueio ativo documentado no `CONTEXT.md`), atribui papel. |
| `/usuarios/[id]` | Detalhe de um usuário — papéis, telefone, suspender/reativar, resetar senha. |
| `/conta` | O próprio usuário troca a própria senha. |

### Placeholders (nunca implementados, fora de escopo desta iniciativa)

| Rota | Descrição |
| --- | --- |
| `/ponto` | Nunca implementado — fora de escopo (spec seção 20: "não ativar Ponto"). |
| `/operacoes` | Nunca implementado — idem. |
| `/configuracoes` | Cadastro de eixos/cidades/equipes (base territorial) + cargos configuráveis (`job_functions`, Nova versão Etapa 1). |

---

## Como manter isto atualizado

Sempre que uma migração nova criar/alterar uma função `SECURITY DEFINER`,
ou uma fase nova adicionar uma rota: some a linha correspondente aqui. Se
a lista de funções divergir do banco real, a fonte de verdade é sempre
o banco — rode a consulta abaixo via MCP do Supabase
(`project_id: pjjarkxwwzqiajlvpsdx`) pra conferir:

```sql
select p.proname, pg_get_function_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' order by p.proname;
```
