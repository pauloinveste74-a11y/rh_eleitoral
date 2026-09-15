# Nova versão — matriz requisito × estado real

> Levantada em 15/09/2026, antes de qualquer código desta iniciativa,
> exatamente como pedido pela seção 23 do
> `docs/NOVA_VERSAO_RH_ELEITORAL.md` (item 6: "produza uma matriz:
> existente, parcial, ausente ou conflitante"). Fonte: banco em produção
> (`pjjarkxwwzqiajlvpsdx`, `information_schema`/`pg_proc`) + código-fonte.
> Atualizar esta matriz conforme cada etapa da nova versão avança.

## Segurança (item 1 da ordem de implementação, conferido antes do resto)

Busca em todo o histórico do git por credencial exposta (JWT,
`sb_secret_`, `.env*` versionado) — **nada encontrado**, só menções ao
*nome* da variável `SUPABASE_SERVICE_ROLE_KEY`, nunca ao valor.
`.gitignore` cobre `.env*` corretamente. Advisors do Supabase sem achado
novo além do padrão já conhecido e aceito.

## Bugs de produção achados durante a Etapa 3 (não eram feature nova)

Investigando o schema ocioso de documento (item 4 da ordem abaixo), dois
bugs reais foram achados e corrigidos na mesma migração (`0030`), nenhum
deles reportado pelo usuário — só nunca tinham sido testados com uma
conta que não fosse o platform_admin (que bypassa toda RLS):

1. `person_documents_select` e a policy de Storage
   `pessoas_documentos_select` nunca tinham sido estendidas pra "a
   própria pessoa" ou "o gestor da pessoa" — só administrador/rh/auditor
   liam. Resultado: o coordenador que sobe o próprio documento em
   `/meu-cadastro` nunca conseguia ver nem baixar o que tinha acabado de
   subir.
2. `uploadPersonDocument()` chamava `log_audit_event()` sem checar o
   papel do chamador — e essa função faz `raise exception` pra quem não
   é administrador/rh. Um coordenador comum que subisse o próprio
   documento recebia erro do servidor **depois** do arquivo já ter sido
   gravado.

## Matriz por seção da spec

🟢 existente · 🟡 parcial (schema pronto, sem app) · 🔴 ausente · ⚠️ conflitante com decisão já tomada

| # | Requisito | Estado |
|---|---|---|
| 3 | Cadeia de coordenação, vínculos com vigência/histórico, anticiclo | 🟢 `coordination_relationships` (Etapa 1 da iniciativa anterior) |
| 4.1 | Cargos configuráveis por campanha (`job_functions`) | 🟢 **Implementado nesta etapa** (`0029`) |
| 4.2 | Perfis de acesso | 🟢 `roles` já cobre administrador/rh/coordenador_eixo/cidade/equipe/financeiro/tesouraria/juridico/auditor. Faltam `supervisor`; ⚠️ "contratado" como perfil de acesso conflita com a decisão de que o cabo eleitoral nunca loga (Etapa 2) |
| 5.1 PF | Identificação/contato/endereço/eleitoral/bancário/função/documentos | 🟢 Fase 1B + Etapa 1 |
| 5.1 PJ | Pessoa jurídica (CNPJ, razão social, representante) | 🟢 **Implementado nesta etapa** (`legal_entities`) — endereço/banco embutidos, sem satélite; sem documento/contrato ainda |
| 6 | Autocadastro por convite, formulário por etapas, documentos | 🟢 Etapas 2/11 |
| 6 | Aceite de veracidade/consentimento LGPD versionado | 🔴 Ausente |
| 6.2 | Status de convite | 🟢 Bate exatamente com `registration_invites.status` |
| 6.3 | Status cadastral | 🟢 Bate exatamente com `people.status` (migração `0013`) |
| 6.4 | Correção com campo apontado | 🟢 Etapa 11 (`correction_requests.field_names`) |
| 6.4 | Correção preserva valor anterior/novo | 🟡 `correction_requests.previous_values`/`new_values` existem, nunca gravados |
| 7 | Dados cadastrais PF (identificação, filiação, naturalidade...) | 🟢 migração `0013` |
| 8 | Documento: hash, detecção de repetição | 🟢 **Implementado na Etapa 3** — `record_person_document()` (migração `0030`) rejeita duplicata exata |
| 8 | Documento: versionamento (substituição) | 🟢 **Implementado na Etapa 3** — reenvio do mesmo tipo após ilegível/divergente vira substituto automático, o anterior é marcado `removido` |
| 8 | Documento: classificação válido/ilegível/divergente | 🟢 **Implementado na Etapa 4** — `decide_person_document()` (migração `0031`), tela em `/validacoes` |
| 9.1 | Importação Excel com staging/prévia/conflitos | 🟢 Etapas 6/10 |
| 9.1 | Importação CSV | 🔴 Ausente (só `.xlsx`) |
| 9.2 | Importação por PDF (OCR, 1 ou várias pessoas) | 🔴 Ausente — `data_conflicts` existe desde `0018`, nunca usada |
| 10 | Gestor: documento válido/ilegível/divergente, documento substituto | 🟢 **Implementado na Etapa 4** — classificação inline em `/validacoes` (por documento, dentro de cada submissão da fila); substituto automático no reenvio já era da Etapa 3 |
| 11 | Painel do coordenador com indicadores por escopo territorial | 🟢 **Implementado na Etapa 2** — sem migração nova, só consultas com a RLS já existente |
| 12 | Contratos (modelos, versionamento, geração PF/PJ, upload assinado) | 🟢 **Implementado na Etapa 5** (migração `0032`) — geração em lote/grupo e assinatura digital integrada ficam fora, documentado no cabeçalho da migração |
| 13 | Despesas com autorizador/alçada | 🟢 Etapas 1/7/8/9 |
| 13 | Valor autorizado ≠ valor pedido | 🟡 `expenses.authorized_amount_cents` existe, nunca difere de `requested_amount_cents` |
| 14 | Pagamentos: contratado/calculado/autorizado/pago/conciliado, PIX/TED, conciliação | 🟡 Modelo atual (`payments`) é bem mais simples; sem `reconciliation_matches` |
| 15 | Auditoria com IP/dispositivo | 🟡 `audit_logs.ip_address`/`user_agent` existem, nunca populados |
| 16 | Central de pendências consolidada | 🔴 Ausente como visão única (peças espalhadas em `/validacoes`, `/importacoes`, `/despesas`) |
| 17 | Relatórios (despesas/pagamentos/contratos/pendências) | 🟡 Só pessoas/aprovações/financeiro hoje |
| 18 | RLS, buckets privados, sem segredo no client | 🟢 Padrão do projeto inteiro |
| 19 | Ponto/operações/geolocalização fora de escopo | 🟢 Consistente — nunca implementados |

### Tabelas do modelo de referência (spec seção 20)

**Existem, mas nunca usadas por nenhum código de app** (schema morto até
esta spec dar propósito): `notifications`, `data_conflicts`,
`expense_documents`, `expense_approvals`, `registration_field_reviews`.

**Ausentes por completo antes da iniciativa**: `job_functions` ✅ Etapa 1,
`legal_entities` ✅ Etapa 1, `contract_templates`/`template_versions`/
`contracts`/`contract_documents` ✅ Etapa 5, `contacts` (arquitetura atual
guarda telefone/e-mail direto em `people`, divergência de design, não
necessariamente errada), `document_versions` (usa `replaces_document_id`
em vez disso), `reconciliation_matches` (segue ausente — spec seção 14).

## Ordem proposta (adaptando a seção 22 da spec ao que já existe)

1. ~~Segurança~~ — feito, limpo.
2. ✅ **Cargos configuráveis + pessoa jurídica** — Etapa 1.
3. ✅ **Painel do coordenador com indicadores por escopo** — Etapa 2.
4. 🟡 Uso do schema já pronto e ocioso — **documento fechado nas Etapas
   3+4** (hash, versionamento, classificação pelo gestor, e dois bugs de
   RLS/auditoria corrigidos de brinde). Falta ainda:
   `correction_requests.previous_values`/`new_values`,
   `expenses.authorized_amount_cents`, `audit_logs.ip_address`/`user_agent`.
5. ✅ **Contratos (modelos, versionamento, geração PF/PJ, upload
   assinado, conferência)** — Etapa 5, a peça que era a maior.
6. Importação por PDF com OCR e revisão humana.
7. Pagamentos com modelo rico (conciliação, PIX/TED).
8. Central de pendências consolidada + relatórios novos.
9. LGPD: aceite de veracidade/consentimento versionado.
